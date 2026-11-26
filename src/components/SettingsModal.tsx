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

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setShowKey(false);
      setConfirmClear(false);
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
    }));
  };

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
                <p>Web 端通过对应供应商的公开 API 直接发送请求。</p>
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

            {draft.provider !== "demo" && (
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
