import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, X } from "lucide-react";
import type {
  AnalysisInput,
  AnalysisReport,
  AnalyzeProgress,
  HistoryRecord,
  ProviderSettings,
  SourceKey,
  View,
} from "./types";
import { DEMO_SAMPLE } from "./lib/demo";
import { analyzeWithProvider } from "./lib/providers";
import { recognizeScreenshot } from "./lib/ocr";
import {
  clearAllLocalData,
  clearHistory,
  loadHistory,
  loadSettings,
  saveReport,
  saveSettings,
} from "./lib/storage";
import { Sidebar } from "./components/Sidebar";
import { MobileHeader } from "./components/MobileHeader";
import { Topbar } from "./components/Topbar";
import { AnalyzeWorkspace } from "./components/AnalyzeWorkspace";
import { ReportView } from "./components/ReportView";
import { SettingsModal } from "./components/SettingsModal";
import { HistoryView } from "./components/HistoryView";
import { MethodView } from "./components/MethodView";

const EMPTY_INPUT: AnalysisInput = {
  selfProfile: "",
  otherProfile: "",
  chat: "",
  relationshipStage: "刚匹配，聊了 1 至 3 天",
  goal: "判断是否值得继续投入",
  consent: false,
};

interface Toast {
  kind: "success" | "error";
  message: string;
}

function App() {
  const [view, setView] = useState<View>("analyze");
  const [input, setInput] = useState<AnalysisInput>(EMPTY_INPUT);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>(loadHistory);
  const [settings, setSettings] = useState<ProviderSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<AnalyzeProgress>({
    percent: 0,
    label: "准备分析",
  });
  const [error, setError] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const progressTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (progressTimer.current) window.clearInterval(progressTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const goTo = (nextView: View) => {
    setView(nextView);
    if (nextView !== "analyze") setReport(null);
  };

  const handleAnalyze = async () => {
    setError("");
    if (!input.consent) {
      setError("请先确认材料已脱敏，并勾选授权说明。");
      return;
    }
    if (input.chat.trim().length < 12 && input.otherProfile.trim().length < 20) {
      setError("至少补充一段聊天记录或较完整的对方主页信息。");
      return;
    }
    setBusy(true);
    setProgress({ percent: 6, label: "读取材料结构" });
    progressTimer.current = window.setInterval(() => {
      setProgress((current) => {
        if (current.percent >= 88) {
          return {
            ...current,
            label: "正在整合证据与反证",
          };
        }
        const next = Math.min(88, current.percent + Math.max(1, Math.ceil((90 - current.percent) / 8)));
        const label =
          next < 24
            ? "提取可验证的表达信号"
            : next < 48
              ? "对齐人格与互动维度"
              : next < 70
                ? "寻找反证和替代解释"
                : "生成关系判断与行动建议";
        return { percent: next, label };
      });
    }, 280);

    try {
      const nextReport = await analyzeWithProvider(input, settings);
      setProgress({ percent: 100, label: "报告已生成" });
      window.setTimeout(() => {
        setReport(nextReport);
        setHistory(saveReport(nextReport));
        setBusy(false);
        setProgress({ percent: 0, label: "准备分析" });
      }, 380);
    } catch (analysisError) {
      setBusy(false);
      setProgress({ percent: 0, label: "准备分析" });
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "分析失败，请检查模型配置后重试。",
      );
    } finally {
      if (progressTimer.current) {
        window.clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
    }
  };

  const handleLoadSample = () => {
    setInput(DEMO_SAMPLE);
    setError("");
    setToast({ kind: "success", message: "示例材料已载入，可以直接生成报告。" });
  };

  const handleImportScreenshot = async (source: SourceKey, file: File) => {
    if (ocrBusy) {
      setToast({ kind: "error", message: "上一张截图仍在识别中。" });
      return;
    }
    setOcrBusy(true);
    setToast({ kind: "success", message: "正在识别截图，首次加载语言包可能需要一点时间。" });
    try {
      const text = await recognizeScreenshot(file, ({ progress: value }) => {
        if (value > 0) {
          setToast({ kind: "success", message: `截图识别中 ${value}%` });
        }
      });
      if (!text) throw new Error("没有识别到可用文字。");
      setInput((current) => {
        if (source === "self") {
          return {
            ...current,
            selfProfile: [current.selfProfile, text].filter(Boolean).join("\n\n"),
          };
        }
        const looksLikeChat = /我[:：]|对方[:：]|你[:：]|Ta[:：]/i.test(text);
        return looksLikeChat
          ? { ...current, chat: [current.chat, text].filter(Boolean).join("\n\n") }
          : {
              ...current,
              otherProfile: [current.otherProfile, text].filter(Boolean).join("\n\n"),
            };
      });
      setToast({ kind: "success", message: "截图文字已提取，请检查并补充标点或说话人。" });
    } catch (ocrError) {
      setToast({
        kind: "error",
        message:
          ocrError instanceof Error
            ? ocrError.message
            : "截图识别失败，可以改用文字粘贴。",
      });
    } finally {
      setOcrBusy(false);
    }
  };

  const handleSaveSettings = (nextSettings: ProviderSettings) => {
    saveSettings(nextSettings);
    setSettings(nextSettings);
    setToast({ kind: "success", message: "模型设置已保存。" });
  };

  const handleClearData = () => {
    clearAllLocalData();
    setHistory([]);
    setSettings(loadSettings());
    setInput(EMPTY_INPUT);
    setReport(null);
    setToast({ kind: "success", message: "本机历史与配置已清除。" });
  };

  const handleHistorySelect = (record: HistoryRecord) => {
    setReport(record.report);
    setView("analyze");
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
    setToast({ kind: "success", message: "历史记录已清除。" });
  };

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        onViewChange={goTo}
        onSettings={() => setShowSettings(true)}
        settings={settings}
        historyCount={history.length}
      />
      <MobileHeader
        view={view}
        onViewChange={goTo}
        onSettings={() => setShowSettings(true)}
      />

      <main className="main-content">
        {view === "analyze" && (
          <>
            <Topbar
              eyebrow={report ? "Report" : "Workspace"}
              title={report ? "关系画像报告" : "新建关系分析"}
              settings={settings}
              onSettings={() => setShowSettings(true)}
            />
            {report ? (
              <ReportView
                report={report}
                onBack={() => {
                  setReport(null);
                  setError("");
                }}
              />
            ) : (
              <AnalyzeWorkspace
                input={input}
                settings={settings}
                busy={busy}
                progress={progress}
                error={error}
                onChange={setInput}
                onAnalyze={handleAnalyze}
                onLoadSample={handleLoadSample}
                onImportScreenshot={handleImportScreenshot}
                onOpenSettings={() => setShowSettings(true)}
              />
            )}
          </>
        )}

        {view === "history" && (
          <>
            <Topbar
              eyebrow="Archive"
              title="历史记录"
              settings={settings}
              onSettings={() => setShowSettings(true)}
            />
            <HistoryView
              history={history}
              onSelect={handleHistorySelect}
              onClear={handleClearHistory}
              onNew={() => {
                setInput(EMPTY_INPUT);
                setReport(null);
                setView("analyze");
              }}
            />
          </>
        )}

        {view === "method" && (
          <>
            <Topbar
              eyebrow="Protocol"
              title="分析框架"
              settings={settings}
              onSettings={() => setShowSettings(true)}
            />
            <MethodView />
          </>
        )}
      </main>

      <SettingsModal
        open={showSettings}
        settings={settings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
        onClearData={handleClearData}
      />

      {toast && (
        <div className={`toast toast--${toast.kind}`} role="status">
          {toast.kind === "success" ? <Check size={16} /> : <CircleAlert size={16} />}
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} title="关闭提示">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
