import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type {
  AnalysisInput,
  AnalysisReport,
  AnalyzeProgress,
  HistoryRecord,
  ProviderSettings,
  ScreenshotImportJob,
  ScreenshotImportItem,
  SourceKey,
  View,
} from "./types";
import { DEMO_SAMPLE } from "./lib/demo";
import { analyzeWithProvider } from "./lib/providers";
import {
  mergeScreenshotTexts,
  recognizeScreenshot,
  validateScreenshotFiles,
} from "./lib/ocr";
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
  relationshipLabel: "",
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
  const [screenshotJob, setScreenshotJob] =
    useState<ScreenshotImportJob | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const progressTimer = useRef<number | null>(null);
  const ocrBusy = screenshotJob?.active ?? false;

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
    if (ocrBusy) {
      setError("请等待当前这批截图识别完成后再分析。");
      return;
    }
    if (!input.consent) {
      setError("请先替这些材料隐去身份信息，再勾选下方的授权说明。");
      return;
    }
    if (input.chat.trim().length < 12 && input.otherProfile.trim().length < 20) {
      setError("再多放一点材料吧：一段对话，或一页更完整的公开主页。");
      return;
    }
    setBusy(true);
    setProgress({ percent: 6, label: "让细节有处安放" });
    progressTimer.current = window.setInterval(() => {
      setProgress((current) => {
        if (current.percent >= 88) {
          return {
            ...current,
            label: "把不同的解释放在一起看",
          };
        }
        const next = Math.min(88, current.percent + Math.max(1, Math.ceil((90 - current.percent) / 8)));
        const label =
          next < 24
            ? "听见话里的靠近与停顿"
            : next < 48
              ? "把性格与互动慢慢对齐"
              : next < 70
                ? "也看看另一种可能"
                : "为下一步留一盏灯";
        return { percent: next, label };
      });
    }, 280);

    try {
      const nextReport = await analyzeWithProvider(
        input,
        settings,
        ({ status, percent }) => {
          if (progressTimer.current) {
            window.clearInterval(progressTimer.current);
            progressTimer.current = null;
          }
          setProgress({ percent, label: status });
        },
      );
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
    setToast({ kind: "success", message: "一段示例已经放好，随时可以开始。" });
  };

  const handleImportScreenshots = async (
    source: SourceKey,
    files: File[],
  ) => {
    if (ocrBusy) {
      setToast({ kind: "error", message: "上一批图片还在慢慢读，请稍等一下。" });
      return;
    }
    const checked = validateScreenshotFiles(files);
    if (!checked.length) return;
    const jobId =
      globalThis.crypto?.randomUUID?.() ?? `ocr-${Date.now().toString(36)}`;
    const initialErrors = checked.filter((item) => item.reason).length;
    const items: ScreenshotImportItem[] = checked.map(({ file, reason }, index) => ({
      id: `${jobId}-${index}`,
      name: file.name,
      status: reason ? "error" : "queued",
      progress: reason ? 100 : 0,
      message: reason ?? "等待识别",
    }));
    const accepted = checked.flatMap((item, index) =>
      item.reason ? [] : [{ file: item.file, itemId: items[index].id }],
    );
    setScreenshotJob({
      id: jobId,
      source,
      active: true,
      completed: initialErrors,
      total: checked.length,
      items,
    });
    setToast({
      kind: "success",
      message: `把 ${accepted.length} 张图片轻轻放好了，正在按顺序读它们。`,
    });

    const patchItem = (
      itemId: string,
      patch: Partial<ScreenshotImportItem>,
      completedDelta = 0,
    ) => {
      setScreenshotJob((current) => {
        if (!current || current.id !== jobId) return current;
        return {
          ...current,
          completed: Math.min(
            current.total,
            current.completed + completedDelta,
          ),
          items: current.items.map((item) =>
            item.id === itemId ? { ...item, ...patch } : item,
          ),
        };
      });
    };

    const recognized: string[] = [];
    let successCount = 0;
    let failedCount = initialErrors;
    let confidenceTotal = 0;
    for (let index = 0; index < accepted.length; index += 1) {
      const { file, itemId } = accepted[index];
      patchItem(itemId, {
        status: "recognizing",
        progress: 2,
        message: `第 ${index + 1}/${accepted.length} 张，准备识别`,
      });
      try {
        const result = await recognizeScreenshot(
          file,
          ({ status, progress }) => {
            patchItem(itemId, {
              status: "recognizing",
              progress: Math.max(2, progress),
              message: status,
            });
          },
          source === "chat" ? "chat" : "text",
        );
        if (!result.text.trim()) throw new Error("没有识别到可用文字");
        recognized.push(result.text);
        successCount += 1;
        confidenceTotal += result.confidence;
        patchItem(
          itemId,
          {
            status: "done",
            progress: 100,
            message: `识别完成 · ${Math.round(result.confidence * 100)}%`,
            engine: result.engine,
            confidence: result.confidence,
            durationMs: result.durationMs,
          },
          1,
        );
      } catch (ocrError) {
        failedCount += 1;
        patchItem(
          itemId,
          {
            status: "error",
            progress: 100,
            message:
              ocrError instanceof Error ? ocrError.message : "截图识别失败",
          },
          1,
        );
      }
    }

    const mergedText = mergeScreenshotTexts(recognized);
    if (mergedText) {
      setInput((current) => {
        if (source === "chat") {
          return {
            ...current,
            chat: mergeScreenshotTexts([current.chat, mergedText]),
          };
        }
        if (source === "self") {
          return {
            ...current,
            selfProfile: [current.selfProfile, mergedText]
              .filter(Boolean)
              .join("\n\n"),
          };
        }
        return {
          ...current,
          otherProfile: [current.otherProfile, mergedText]
            .filter(Boolean)
            .join("\n\n"),
        };
      });
    }
    setScreenshotJob((current) =>
      current?.id === jobId ? { ...current, active: false } : current,
    );

    if (successCount > 0) {
      setToast({
        kind: "success",
        message: `${successCount}/${checked.length} 张已经读完，平均把握 ${Math.round((confidenceTotal / successCount) * 100)}%${failedCount ? `，还有 ${failedCount} 张没读出来` : ""}。顺序和说话人，还是想请你再看一眼。`,
      });
    } else {
      setToast({
        kind: "error",
        message: "这批图片里没有读出可用的话。可以换一张清晰些的，或直接粘贴文字。",
      });
    }
  };

  const handleSaveSettings = (nextSettings: ProviderSettings) => {
    saveSettings(nextSettings);
    setSettings(nextSettings);
    setToast({ kind: "success", message: "设置已经收好。" });
  };

  const handleClearData = () => {
    clearAllLocalData();
    setHistory([]);
    setSettings(loadSettings());
    setInput(EMPTY_INPUT);
    setReport(null);
    setToast({ kind: "success", message: "本机的故事与设置已轻轻收起。" });
  };

  const handleHistorySelect = (record: HistoryRecord) => {
    setReport(record.report);
    setView("analyze");
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
    setToast({ kind: "success", message: "这些关系札记已经清空。" });
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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className="view-stage"
            key={report ? "report" : view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {view === "analyze" && (
              <>
                <Topbar
                  eyebrow={report ? "Report" : "Workspace"}
                  title={report ? "这段关系的解读" : "写下这段关系"}
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
                    screenshotJob={screenshotJob}
                    onImportScreenshots={handleImportScreenshots}
                    onDismissScreenshotJob={() => setScreenshotJob(null)}
                    onOpenSettings={() => setShowSettings(true)}
                  />
                )}
              </>
            )}

            {view === "history" && (
              <>
                <Topbar
                  eyebrow="Archive"
                  title="关系札记"
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
          </motion.div>
        </AnimatePresence>
      </main>

      <SettingsModal
        open={showSettings}
        settings={settings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
        onClearData={handleClearData}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast toast--${toast.kind}`}
            role="status"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            {toast.kind === "success" ? (
              <Check size={16} />
            ) : (
              <CircleAlert size={16} />
            )}
            <span>{toast.message}</span>
            <button type="button" onClick={() => setToast(null)} title="关闭提示">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
