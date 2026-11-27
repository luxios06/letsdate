import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  FileText,
  ImagePlus,
  Images,
  LoaderCircle,
  MessageCircleMore,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import type {
  AnalyzeProgress,
  AnalysisInput,
  ProviderSettings,
  ScreenshotImportJob,
  SourceKey,
} from "../types";
import { GOALS, STAGES } from "../lib/demo";
import { PROVIDER_LABELS } from "../lib/providers";

interface AnalyzeWorkspaceProps {
  input: AnalysisInput;
  settings: ProviderSettings;
  busy: boolean;
  progress: AnalyzeProgress;
  screenshotJob: ScreenshotImportJob | null;
  error: string;
  onChange: (next: AnalysisInput) => void;
  onAnalyze: () => void;
  onLoadSample: () => void;
  onImportScreenshots: (source: SourceKey, files: File[]) => void;
  onDismissScreenshotJob: () => void;
  onOpenSettings: () => void;
}

const PROGRESS_STEPS = [
  "解析消息与会话",
  "提取并核对事实证据",
  "分析短回复与依恋线索",
  "生成人话报告与行动建议",
];

function ScreenshotButton({
  onFiles,
  label,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  label: string;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) onFiles(files);
          event.currentTarget.value = "";
        }}
      />
      <button
        type="button"
        className="text-button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        title={`${label}，可一次选择多张，按选择顺序合并`}
      >
        <ImagePlus size={16} />
        {label}
      </button>
    </>
  );
}

function ScreenshotImportQueue({
  job,
  onDismiss,
}: {
  job: ScreenshotImportJob;
  onDismiss: () => void;
}) {
  const finished = job.items.filter(
    (item) => item.status === "done" || item.status === "error",
  ).length;
  const progress = job.total
    ? Math.round(
        job.items.reduce(
          (sum, item) =>
            sum +
            (item.status === "done" || item.status === "error"
              ? 100
              : item.progress),
          0,
        ) / job.total,
      )
    : 0;
  return (
    <div className="screenshot-queue" aria-live="polite">
      <div className="screenshot-queue__head">
        <Images size={16} />
        <div>
          <strong>{job.active ? "正在批量识别" : "本批识别结果"}</strong>
          <span>
            {finished}/{job.total} 张已处理
          </span>
        </div>
        {!job.active && (
          <button type="button" onClick={onDismiss} title="清除本批识别记录">
            <X size={14} />
          </button>
        )}
      </div>
      <div className="screenshot-queue__track">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="screenshot-queue__list">
        {job.items.map((item, index) => (
          <div
            className={`screenshot-queue__item is-${item.status}`}
            key={item.id}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong title={item.name}>{item.name}</strong>
              <small>{item.message}</small>
            </div>
            <em>
              {item.status === "done" ? (
                <Check size={14} />
              ) : item.status === "error" ? (
                <CircleAlert size={14} />
              ) : item.status === "recognizing" ? (
                <LoaderCircle className="spin" size={14} />
              ) : (
                `${item.progress}%`
              )}
            </em>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyzeWorkspace({
  input,
  settings,
  busy,
  progress,
  screenshotJob,
  error,
  onChange,
  onAnalyze,
  onLoadSample,
  onImportScreenshots,
  onDismissScreenshotJob,
  onOpenSettings,
}: AnalyzeWorkspaceProps) {
  const [stageOpen, setStageOpen] = useState(false);
  const importing = screenshotJob?.active ?? false;
  const update = <K extends keyof AnalysisInput>(key: K, value: AnalysisInput[K]) =>
    onChange({ ...input, [key]: value });

  return (
    <div className="workspace">
      <div className="workspace__intro">
        <span className="index-label">01 / 输入材料</span>
        <h2>把关系里的模糊感，拆成能验证的信号。</h2>
        <p>
          分析主页、双方表达和对话推进。输出是带证据的假设，不是对一个人的定论。
        </p>
        <button type="button" className="subtle-action" onClick={onLoadSample}>
          <RotateCcw size={15} />
          载入示例
        </button>
      </div>

      <div className="input-board">
        <section className="source-block source-block--self">
          <div className="source-block__head">
            <div>
              <span className="source-kicker">你</span>
              <h3>你的表达方式</h3>
            </div>
            <ScreenshotButton
              label="导入多张"
              disabled={importing}
              onFiles={(files) => onImportScreenshots("self", files)}
            />
          </div>
          <label className="field-label" htmlFor="self-profile">
            主页、简介或自我描述
          </label>
          <textarea
            id="self-profile"
            className="source-textarea source-textarea--compact"
            value={input.selfProfile}
            onChange={(event) => update("selfProfile", event.target.value)}
            placeholder="例如：慢热但会认真回应，喜欢运动和看展。"
          />
          {screenshotJob?.source === "self" && (
            <ScreenshotImportQueue
              job={screenshotJob}
              onDismiss={onDismissScreenshotJob}
            />
          )}
        </section>

        <section className="source-block source-block--other">
          <div className="source-block__head">
            <div>
              <span className="source-kicker">Ta</span>
              <h3>对方主页</h3>
            </div>
            <ScreenshotButton
              label="导入多张"
              disabled={importing}
              onFiles={(files) => onImportScreenshots("other", files)}
            />
          </div>
          <label className="field-label" htmlFor="other-profile">
            简介、帖子内容、兴趣标签
          </label>
          <textarea
            id="other-profile"
            className="source-textarea source-textarea--compact"
            value={input.otherProfile}
            onChange={(event) => update("otherProfile", event.target.value)}
            placeholder="粘贴对方愿意公开的文字信息，建议先去除姓名和账号。"
          />
          {screenshotJob?.source === "other" && (
            <ScreenshotImportQueue
              job={screenshotJob}
              onDismiss={onDismissScreenshotJob}
            />
          )}
        </section>

        <section className="source-block source-block--chat">
          <div className="source-block__head">
            <div>
              <span className="source-kicker">Dialogue</span>
              <h3>聊天记录</h3>
            </div>
            <div className="source-block__actions">
              <span className="format-hint">
                <MessageCircleMore size={14} />
                我 / 对方逐条标注
              </span>
              <ScreenshotButton
                label="批量识别截图"
                disabled={importing}
                onFiles={(files) => onImportScreenshots("chat", files)}
              />
            </div>
          </div>
          <textarea
            id="chat-transcript"
            className="source-textarea source-textarea--chat"
            value={input.chat}
            onChange={(event) => update("chat", event.target.value)}
            placeholder={`我：最近在听什么歌？\n对方：最近循环一支后摇乐队，你呢？\n\n尽量保留上下文，不要只截取单句。`}
          />
          {screenshotJob?.source === "chat" && (
            <ScreenshotImportQueue
              job={screenshotJob}
              onDismiss={onDismissScreenshotJob}
            />
          )}
          <div className="source-block__footer">
            <span>
              <FileText size={14} />
              {input.chat.replace(/\s/g, "").length} 字
            </span>
            <span>
              <ShieldCheck size={14} />
              PaddleOCR 批量中文截图识别
            </span>
          </div>
        </section>

        <section className="analysis-config">
          <div className="analysis-config__controls">
            <div className="control-group">
              <span className="field-label">关系阶段</span>
              <div className={`custom-select ${stageOpen ? "is-open" : ""}`}>
                <button
                  type="button"
                  onClick={() => setStageOpen((current) => !current)}
                  title="选择关系阶段"
                >
                  {input.relationshipStage}
                  <ChevronDown size={16} />
                </button>
                {stageOpen && (
                  <div className="custom-select__menu">
                    {STAGES.map((stage) => (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => {
                          update("relationshipStage", stage);
                          setStageOpen(false);
                        }}
                      >
                        {stage}
                        {input.relationshipStage === stage && <Check size={15} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="control-group control-group--goal">
              <span className="field-label">这次最想判断</span>
              <div className="choice-row">
                {GOALS.slice(0, 3).map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    className={input.goal === goal ? "is-selected" : ""}
                    onClick={() => update("goal", goal)}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="analysis-config__action">
            <div className="model-readout">
              <span>
                <Sparkles size={15} />
                {PROVIDER_LABELS[settings.provider]}
              </span>
              <button type="button" onClick={onOpenSettings}>
                切换
              </button>
            </div>
            <label className="consent-check">
              <input
                type="checkbox"
                checked={input.consent}
                onChange={(event) => update("consent", event.target.checked)}
              />
              <span>
                我确认材料已脱敏，并有权用这些内容进行分析。
              </span>
            </label>
            {error && <div className="inline-error">{error}</div>}
            <button
              type="button"
              className="primary-button primary-button--large"
              onClick={onAnalyze}
              disabled={busy || importing}
            >
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={18} />
                  正在分析
                </>
              ) : importing ? (
                <>
                  <LoaderCircle className="spin" size={18} />
                  正在识别截图
                </>
              ) : (
                <>
                  生成关系画像
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </section>
      </div>

      {busy && (
        <div className="analysis-loading" role="status" aria-live="polite">
          <div className="analysis-loading__top">
            <div className="analysis-orbit">
              <span />
              <span />
              <span />
              <Upload size={20} />
            </div>
            <div>
              <strong>{progress.label}</strong>
              <p>先找证据，再形成判断。</p>
            </div>
            <em>{progress.percent}%</em>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          <div className="progress-steps">
            {PROGRESS_STEPS.map((step, index) => (
              <span
                key={step}
                className={
                  progress.percent > (index + 1) * 20 ? "is-complete" : ""
                }
              >
                {progress.percent > (index + 1) * 20 ? (
                  <Check size={13} />
                ) : (
                  String(index + 1).padStart(2, "0")
                )}
                {step}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
