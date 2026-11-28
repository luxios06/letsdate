import {
  AlertTriangle,
  Check,
  KeyRound,
  LockKeyhole,
  RotateCcw,
  ServerCog,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ProviderId, ProviderSettings } from "../types";
import {
  getProviderDefaults,
  PROVIDER_LABELS,
} from "../lib/providers";
import { DEFAULT_SETTINGS } from "../lib/storage";

interface SettingsModalProps {
  open: boolean;
  settings: ProviderSettings;
  onClose: () => void;
  onSave: (settings: ProviderSettings) => void;
  onClearData: () => void;
}

const PROVIDERS: ProviderId[] = [
  "demo",
  "deepseek",
  "openai",
  "anthropic",
  "gemini",
  "ollama",
  "browser",
  "custom",
];

export function SettingsModal({
  open,
  settings,
  onClose,
  onSave,
  onClearData,
}: SettingsModalProps) {
  const [draft, setDraft] = useState(settings);
  const [showKey, setShowKey] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [localModelStatus, setLocalModelStatus] = useState<{
    kind: "idle" | "testing" | "success" | "error";
    message: string;
  }>({ kind: "idle", message: "" });
  const [browserModelStatus, setBrowserModelStatus] = useState<{
    kind: "idle" | "loading" | "ready" | "error";
    message: string;
    percent?: number;
  }>({ kind: "idle", message: "" });

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setShowKey(false);
      setConfirmClear(false);
      setLocalModelStatus({ kind: "idle", message: "" });
      import("../lib/browser-local-model").then(
        ({ isBrowserLocalModelReady }) => {
          const ready = isBrowserLocalModelReady();
          setBrowserModelStatus(
            ready
              ? { kind: "ready", message: "模型已缓存，可直接使用。" }
              : {
                  kind: "idle",
                  message: "首次使用需下载约 610MB，仅下载一次。",
                },
          );
        },
      );
    }
  }, [open, settings]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const selectProvider = (provider: ProviderId) => {
    const defaults = getProviderDefaults(provider);
    setDraft((current) => ({
      ...current,
      provider,
      baseUrl: defaults.baseUrl,
      model: defaults.model,
      ...(provider === "browser"
        ? { apiKey: "", rememberKey: false }
        : {}),
    }));
    setLocalModelStatus({ kind: "idle", message: "" });
  };

  const testLocalModel = async () => {
    setLocalModelStatus({ kind: "testing", message: "正在连接本机 Ollama…" });
    try {
      const baseUrl = draft.baseUrl.replace(/\/+$/u, "");
      const response = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as {
        models?: Array<{ name?: string }>;
      };
      const names = (data.models ?? [])
        .map((item) => item.name)
        .filter(Boolean);
      if (!names.includes(draft.model)) {
        setLocalModelStatus({
          kind: "error",
          message: `服务已连接，但没有找到 ${draft.model}。`,
        });
        return;
      }
      setLocalModelStatus({
        kind: "success",
        message: `已连接，${draft.model} 可用。`,
      });
    } catch (error) {
      setLocalModelStatus({
        kind: "error",
        message:
          error instanceof Error
            ? `连接失败：${error.message}`
            : "连接本机模型失败。",
      });
    }
  };

  const setupBrowserModel = async () => {
    setBrowserModelStatus({
      kind: "loading",
      message: "正在准备浏览器本地模型…",
      percent: 0,
    });
    try {
      const { loadBrowserLocalModel } = await import(
        "../lib/browser-local-model"
      );
      await loadBrowserLocalModel(({ status, percent }) => {
        setBrowserModelStatus({
          kind: "loading",
          message: status,
          percent,
        });
      });
      setBrowserModelStatus({
        kind: "ready",
        message: "本地模型已加载，可以开始分析。",
        percent: 100,
      });
    } catch (error) {
      setBrowserModelStatus({
        kind: "error",
        message:
          error instanceof Error
            ? `加载失败：${error.message}`
            : "本地模型加载失败。",
      });
    }
  };

  const removeBrowserModel = async () => {
    setBrowserModelStatus({
      kind: "loading",
      message: "正在删除本机模型缓存…",
    });
    try {
      const { clearBrowserLocalModel } = await import(
        "../lib/browser-local-model"
      );
      await clearBrowserLocalModel();
      setBrowserModelStatus({
        kind: "idle",
        message: "模型缓存已删除。",
      });
    } catch (error) {
      setBrowserModelStatus({
        kind: "error",
        message:
          error instanceof Error ? error.message : "删除模型缓存失败。",
      });
    }
  };

  const usesEndpoint = !["demo", "browser"].includes(draft.provider);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="settings-modal__header">
          <div>
            <span className="eyebrow">模型与隐私</span>
            <h2 id="settings-title">选择你信任的推理方式</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="关闭设置">
            <X size={19} />
          </button>
        </header>

        <div className="settings-modal__body">
          <section className="settings-section">
            <div className="settings-section__title">
              <Sparkles size={17} />
              <div>
                <h3>推理模型</h3>
                <p>
                  分析会分两次调用模型：先提取事实，再综合报告；费用按两次请求计算。
                </p>
              </div>
            </div>
            <div className="provider-grid">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider}
                  type="button"
                  className={draft.provider === provider ? "is-selected" : ""}
                  onClick={() => selectProvider(provider)}
                >
                  {PROVIDER_LABELS[provider]}
                  {draft.provider === provider && <Check size={15} />}
                </button>
              ))}
            </div>

            {usesEndpoint && (
              <div className="settings-fields">
                <label>
                  <span>Base URL</span>
                  <div className="input-with-icon">
                    <ServerCog size={16} />
                    <input
                      value={draft.baseUrl}
                      onChange={(event) =>
                        setDraft({ ...draft, baseUrl: event.target.value })
                      }
                      placeholder="https://api.example.com/v1"
                    />
                  </div>
                </label>
                <label>
                  <span>模型名称</span>
                  <input
                    value={draft.model}
                    onChange={(event) =>
                      setDraft({ ...draft, model: event.target.value })
                    }
                    placeholder="模型 ID"
                  />
                </label>
                {draft.provider !== "ollama" && (
                  <label className="settings-fields__full">
                    <span>API Key</span>
                    <div className="input-with-icon">
                      <KeyRound size={16} />
                      <input
                        type={showKey ? "text" : "password"}
                        value={draft.apiKey ?? ""}
                        onChange={(event) =>
                          setDraft({ ...draft, apiKey: event.target.value })
                        }
                        placeholder="只保存在当前设备"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((current) => !current)}
                      >
                        {showKey ? "隐藏" : "显示"}
                      </button>
                    </div>
                  </label>
                )}
                <label className="remember-key settings-fields__full">
                  <input
                    type="checkbox"
                    checked={draft.rememberKey}
                    onChange={(event) =>
                      setDraft({ ...draft, rememberKey: event.target.checked })
                    }
                  />
                  <span>
                    在本机浏览器记住 API Key
                    <small>默认只保存在当前会话，关闭标签页后清除。</small>
                  </span>
                </label>
              </div>
            )}

            {draft.provider === "demo" && (
              <div className="demo-note">
                <Sparkles size={17} />
                <p>使用内置规则引擎跑通完整报告，不会产生模型请求，也不会消耗 API。</p>
              </div>
            )}
            {draft.provider === "ollama" && (
              <div className="demo-note">
                <ServerCog size={17} />
                <div>
                  <p>
                    模型在本机运行，并可增强逐消息情绪与意图标签。国内网络可使用
                    ModelScope 的 Qwen3-0.6B。
                  </p>
                  <div className="local-model-actions">
                    <button
                      type="button"
                      onClick={testLocalModel}
                      disabled={localModelStatus.kind === "testing"}
                    >
                      {localModelStatus.kind === "testing"
                        ? "正在测试"
                        : "测试本机模型"}
                    </button>
                    <a
                      href="https://github.com/luxios06/letsdate/tree/main/local-model"
                      target="_blank"
                      rel="noreferrer"
                    >
                      安装说明
                    </a>
                  </div>
                  {localModelStatus.kind !== "idle" && (
                    <small
                      className={`local-model-status local-model-status--${localModelStatus.kind}`}
                    >
                      {localModelStatus.message}
                    </small>
                  )}
                </div>
              </div>
            )}
            {draft.provider === "browser" && (
              <div className="demo-note">
                <Sparkles size={17} />
                <div>
                  <p>
                    在浏览器内运行 Qwen3-0.6B，模型从 ModelScope
                    下载并缓存到本机，不会上传聊天内容。
                  </p>
                  <div className="local-model-actions">
                    <button
                      type="button"
                      onClick={setupBrowserModel}
                      disabled={browserModelStatus.kind === "loading"}
                    >
                      {browserModelStatus.kind === "loading"
                        ? `准备中 ${browserModelStatus.percent ?? 0}%`
                        : browserModelStatus.kind === "ready"
                          ? "重新加载模型"
                          : "下载并启用"}
                    </button>
                    {browserModelStatus.kind !== "idle" && (
                      <button type="button" onClick={removeBrowserModel}>
                        删除缓存
                      </button>
                    )}
                  </div>
                  {browserModelStatus.message && (
                    <small
                      className={`local-model-status local-model-status--${
                        browserModelStatus.kind === "error"
                          ? "error"
                          : browserModelStatus.kind === "ready"
                            ? "success"
                            : ""
                      }`}
                    >
                      {browserModelStatus.message}
                    </small>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="settings-section settings-section--privacy">
            <div className="settings-section__title">
              <LockKeyhole size={17} />
              <div>
                <h3>数据边界</h3>
                <p>历史记录保存在浏览器本地；API Key 默认不写入持久存储。</p>
              </div>
            </div>
            <div className="privacy-notes">
              <span>
                <Check size={14} />
                不在服务器保存聊天内容
              </span>
              <span>
                <Check size={14} />
                支持随时清除本机历史
              </span>
              <span>
                <AlertTriangle size={14} />
                模型供应商仍可能按其政策处理请求
              </span>
            </div>
            <button
              type="button"
              className={`danger-button ${confirmClear ? "is-confirming" : ""}`}
              onClick={() => {
                if (confirmClear) {
                  onClearData();
                  setDraft(DEFAULT_SETTINGS);
                  setConfirmClear(false);
                } else {
                  setConfirmClear(true);
                }
              }}
            >
              {confirmClear ? <Trash2 size={16} /> : <RotateCcw size={16} />}
              {confirmClear ? "再次点击确认清除" : "清除本机历史与配置"}
            </button>
          </section>
        </div>

        <footer className="settings-modal__footer">
          <span>
            <LockKeyhole size={14} />
            配置不会同步到 letsdate 服务器
          </span>
          <div>
            <button type="button" className="secondary-button" onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                onSave(draft);
                onClose();
              }}
            >
              保存设置
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
