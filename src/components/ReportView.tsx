import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Download,
  Fingerprint,
  HeartHandshake,
  MessageCircleMore,
  Quote,
  ScanSearch,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  AnalysisReport,
  Confidence,
  EvidenceStatus,
  TraitScore,
} from "../types";
import { PROVIDER_LABELS } from "../lib/providers";

interface ReportViewProps {
  report: AnalysisReport;
  onBack: () => void;
}

type ReportTab = "overview" | "evidence" | "action";

const fmtDate = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const confidenceText: Record<Confidence, string> = {
  低: "证据较少",
  中: "证据中等",
  较高: "证据较充分",
};

const evidenceStatusText: Record<EvidenceStatus, string> = {
  insufficient: "证据不足",
  tentative: "暂定线索",
  supported: "多条支持",
};

function BigFiveRow({ trait }: { trait: TraitScore }) {
  return (
    <div className={`trait-row ${trait.status === "insufficient" ? "is-uncertain" : ""}`}>
      <div className="trait-row__label">
        <span>
          {trait.label}
          <em>{evidenceStatusText[trait.status]}</em>
        </span>
        <strong>{trait.score}</strong>
      </div>
      <div className="trait-row__track">
        <span style={{ width: `${trait.score}%` }} />
        <i style={{ left: `${trait.score}%` }} />
      </div>
      <p>{trait.summary}</p>
    </div>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  return (
    <div
      className="score-ring"
      style={{
        background: `conic-gradient(var(--coral) ${score * 3.6}deg, rgba(23, 63, 57, 0.12) 0deg)`,
      }}
    >
      <div>
        <strong>{score}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function copyText(value: string) {
  return navigator.clipboard.writeText(value);
}

function downloadReport(report: AnalysisReport) {
  const lines = [
    `# letsdate 关系画像`,
    "",
    `生成时间：${fmtDate(report.createdAt)}`,
    `关系阶段：${report.stage}`,
    `结论：${report.decision} / ${report.compatibilityScore}`,
    `分数校准：${report.calibration.evidenceMessages} 条对方消息，可靠性 ${Math.round(report.calibration.reliability * 100)}%，上限 ${report.calibration.scoreCap}`,
    "",
    `## ${report.overallTitle}`,
    report.overallSummary,
    "",
    `## 对方人格透镜`,
    `MBTI 候选：${report.person.mbti.candidate}（${report.person.mbti.confidence}置信度）`,
    ...report.person.bigFive.map((trait) => `- ${trait.label}: ${trait.score}/100，${trait.summary}`),
    "",
    `## 互动匹配`,
    report.compatibility.summary,
    ...report.compatibility.dimensions.map(
      (dimension) => `- ${dimension.label}: ${dimension.score}/100，${dimension.summary}`,
    ),
    "",
    `## 下一步`,
    report.action.nextMessage,
    "",
    ...report.action.messageOptions.map((option) => `- ${option.tone}：${option.text}`),
    "",
    `## 证据`,
    ...report.evidence.map(
      (item) =>
        `- [${item.source}] “${item.quote}”\n  观察：${item.observation}\n  推断：${item.inference}\n  反证：${item.caution}`,
    ),
    "",
    `## 不确定性`,
    ...report.uncertainties.map((item) => `- ${item}`),
    "",
    `> ${report.safetyNotes.join(" ")}`,
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `letsdate-report-${report.id.slice(0, 8)}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReportView({ report, onBack }: ReportViewProps) {
  const [tab, setTab] = useState<ReportTab>("overview");
  const [copied, setCopied] = useState(false);
  const [activeMessage, setActiveMessage] = useState(0);
  const topSignals = useMemo(
    () => report.interest.signals.slice(0, 3),
    [report.interest.signals],
  );
  const selectedMessage =
    report.action.messageOptions[activeMessage] ??
    report.action.messageOptions[0] ?? {
      tone: "建议",
      text: report.action.nextMessage,
    };

  useEffect(() => {
    setActiveMessage(0);
    setCopied(false);
  }, [report.id]);

  const handleCopy = async () => {
    await copyText(selectedMessage.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="report">
      <div className="report__toolbar">
        <button type="button" className="back-button" onClick={onBack}>
          <ArrowLeft size={16} />
          新分析
        </button>
        <div className="report__meta">
          <span>{fmtDate(report.createdAt)}</span>
          <span className="report__dot" />
          <span>{PROVIDER_LABELS[report.provider]}</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => downloadReport(report)}
            title="下载报告"
          >
            <Download size={17} />
          </button>
        </div>
      </div>

      <section className="verdict">
        <div className="verdict__copy">
          <span className="index-label">02 / 关系判断</span>
          <div className="verdict__decision">
            <span>{report.decision}</span>
            <em>{confidenceText[report.confidence]}</em>
          </div>
          <h2>{report.overallTitle}</h2>
          <p>{report.overallSummary}</p>
          <div className="verdict__signals">
            {topSignals.map((signal) => (
              <span key={signal}>
                <Check size={14} />
                {signal}
              </span>
            ))}
          </div>
          <div className="calibration-note">
            <span>
              样本 {report.calibration.evidenceMessages} 条 · 可靠性{" "}
              {Math.round(report.calibration.reliability * 100)}%
            </span>
            <span>分数上限 {report.calibration.scoreCap}</span>
            <span>{report.calibration.method}</span>
          </div>
        </div>
        <div className="verdict__score">
          <ScoreRing score={report.compatibilityScore} label="关系适配" />
          <div>
            <span>兴趣信号</span>
            <strong>{report.interest.score}</strong>
            <small>{report.interest.confidence}置信度</small>
          </div>
          <div>
            <span>人格判断</span>
            <strong>{report.person.mbti.candidate}</strong>
            <small>{report.person.mbti.confidence}置信度</small>
          </div>
        </div>
      </section>

      <nav className="report-tabs" aria-label="报告导航">
        <button
          type="button"
          className={tab === "overview" ? "is-active" : ""}
          onClick={() => setTab("overview")}
        >
          <Fingerprint size={16} />
          画像与匹配
        </button>
        <button
          type="button"
          className={tab === "evidence" ? "is-active" : ""}
          onClick={() => setTab("evidence")}
        >
          <ScanSearch size={16} />
          证据链
        </button>
        <button
          type="button"
          className={tab === "action" ? "is-active" : ""}
          onClick={() => setTab("action")}
        >
          <ArrowRight size={16} />
          下一步
        </button>
      </nav>

      {tab === "overview" && (
        <div className="report-section-stack">
          <section className="report-section personality-section">
            <div className="section-heading">
              <div>
                <span className="section-index">A</span>
                <div>
                  <h3>对方人格透镜</h3>
                  <p>把表达线索收束成假设，同时保留替代解释。</p>
                </div>
              </div>
              <span className={`confidence-chip confidence-chip--${report.person.mbti.confidence}`}>
                {report.person.mbti.confidence}置信度
              </span>
            </div>

            <div className="personality-grid">
              <div className="mbti-panel">
                <div className="mbti-panel__title">
                  <span>MBTI 候选</span>
                  <strong
                    className={
                      report.person.mbti.candidate === "待观察"
                        ? "mbti-panel__candidate--unknown"
                        : ""
                    }
                  >
                    {report.person.mbti.candidate}
                  </strong>
                  <div>
                    {report.person.mbti.alternatives.map((item) => (
                      <em key={item}>{item}</em>
                    ))}
                  </div>
                </div>
                <div className="mbti-dimensions">
                  {report.person.mbti.dimensions.map((dimension) => (
                    <div className="mbti-row" key={dimension.key}>
                      <span>{dimension.left}</span>
                      <div>
                        <div className="mbti-row__labels">
                          <strong>{dimension.leaning}</strong>
                          <em>
                            {evidenceStatusText[dimension.status]} ·{" "}
                            {dimension.score}%
                          </em>
                        </div>
                        <div className="mbti-track">
                          <i style={{ left: `${dimension.score}%` }} />
                        </div>
                        <p>{dimension.note}</p>
                      </div>
                      <span>{dimension.right}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="traits-panel">
                <div className="traits-panel__head">
                  <div>
                    <span>大五人格倾向</span>
                    <p>{report.person.summary}</p>
                  </div>
                  <UsersRound size={20} />
                </div>
                <div className="trait-list">
                  {report.person.bigFive.map((trait) => (
                    <BigFiveRow key={trait.key} trait={trait} />
                  ))}
                </div>
              </div>
            </div>

            <div className="interaction-grid">
              {[
                ["互动节奏", report.person.interaction.pace],
                ["能量来源", report.person.interaction.energy],
                ["幽默表达", report.person.interaction.humor],
                ["冲突线索", report.person.interaction.conflict],
                ["安全模式", report.person.interaction.attachment],
              ].map(([label, value], index) => (
                <div className="interaction-item" key={label}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{label}</strong>
                  <p>{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="report-section compatibility-section">
            <div className="section-heading">
              <div>
                <span className="section-index">B</span>
                <div>
                  <h3>双方互动匹配</h3>
                  <p>{report.compatibility.summary}</p>
                </div>
              </div>
              <div className="compatibility-score">
                <strong>{report.compatibility.score}</strong>
                <span>{report.compatibility.label}</span>
              </div>
            </div>
            <div className="compatibility-layout">
              <div className="compatibility-bars">
                {report.compatibility.dimensions.map((dimension) => (
                  <div className="compatibility-row" key={dimension.key}>
                    <div>
                      <span>{dimension.label}</span>
                      <strong>{dimension.score}</strong>
                    </div>
                    <div className="compat-track">
                      <span style={{ width: `${dimension.score}%` }} />
                    </div>
                    <p>{dimension.summary}</p>
                  </div>
                ))}
              </div>
              <div className="interest-card">
                <div className="interest-card__head">
                  <TrendingUp size={18} />
                  <span>兴趣信号</span>
                  <strong>{report.interest.score}</strong>
                </div>
                <p>{report.interest.verdict}</p>
                <div className="interest-columns">
                  <div>
                    <span>支持信号</span>
                    {report.interest.signals.map((signal) => (
                      <p key={signal}>
                        <Check size={13} />
                        {signal}
                      </p>
                    ))}
                  </div>
                  <div>
                    <span>仍需验证</span>
                    {report.interest.ambiguities.map((item) => (
                      <p key={item}>
                        <CircleHelp size={13} />
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="report-section self-section">
            <div className="section-heading">
              <div>
                <span className="section-index">C</span>
                <div>
                  <h3>你在互动里的位置</h3>
                  <p>{report.self.summary}</p>
                </div>
              </div>
              <span className="confidence-chip">{report.self.mbti.candidate} 候选</span>
            </div>
            <div className="self-grid">
              <div>
                <span>你的需要</span>
                {report.self.needs.map((item) => (
                  <p key={item}>
                    <HeartHandshake size={14} />
                    {item}
                  </p>
                ))}
              </div>
              <div>
                <span>你的优势</span>
                {report.self.greenFlags.map((item) => (
                  <p key={item}>
                    <Sparkles size={14} />
                    {item}
                  </p>
                ))}
              </div>
              <div>
                <span>需要留意</span>
                {report.self.watchouts.map((item) => (
                  <p key={item}>
                    <AlertTriangle size={14} />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "evidence" && (
        <div className="report-section-stack">
          <section className="report-section evidence-section">
            <div className="section-heading">
              <div>
                <span className="section-index">D</span>
                <div>
                  <h3>从原话走到判断</h3>
                  <p>每一条画像结论，都应该能回到具体材料。</p>
                </div>
              </div>
              <span className="confidence-chip">{report.evidence.length} 条证据</span>
            </div>
            <div className="evidence-list">
              {report.evidence.map((item, index) => (
                <article className="evidence-item" key={item.id}>
                  <div className="evidence-item__index">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <i />
                  </div>
                  <div className="evidence-item__body">
                    <div className="evidence-item__meta">
                      <span>{item.source}</span>
                      <em>{item.confidence}置信度</em>
                      <em>{item.status === "confirmed" ? "原文可核实" : item.status === "tentative" ? "暂定解释" : "证据不足"}</em>
                    </div>
                    <blockquote>
                      <Quote size={16} />
                      {item.quote}
                    </blockquote>
                    <div className="evidence-item__reading">
                      <div>
                        <span>观察</span>
                        <p>{item.observation}</p>
                      </div>
                      <ChevronRight size={18} />
                      <div>
                        <span>可能意味着</span>
                        <p>{item.inference}</p>
                      </div>
                    </div>
                    <p className="evidence-item__caution">
                      <CircleHelp size={14} />
                      反证与限制：{item.caution}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="report-section uncertainty-section">
            <div className="section-heading">
              <div>
                <span className="section-index">E</span>
                <div>
                  <h3>还不知道的事</h3>
                  <p>把不确定性说清楚，比给出一个漂亮但虚假的答案更重要。</p>
                </div>
              </div>
              <ShieldAlert size={20} />
            </div>
            <div className="uncertainty-grid">
              {report.uncertainties.map((item, index) => (
                <div key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="report-section safety-section">
            <div className="section-heading">
              <div>
                <span className="section-index">F</span>
                <div>
                  <h3>使用边界</h3>
                  <p>画像用于理解互动，不用于控制、试探或替别人做决定。</p>
                </div>
              </div>
            </div>
            <div className="safety-copy">
              {report.safetyNotes.map((item) => (
                <p key={item}>
                  <ShieldAlert size={15} />
                  {item}
                </p>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "action" && (
        <div className="report-section-stack">
          <section className="report-section next-move">
            <div className="next-move__intro">
              <span className="section-index">G</span>
              <div>
                <span className="eyebrow">推荐动作</span>
                <h3>{report.action.decision}</h3>
                <p>{report.action.rationale}</p>
              </div>
            </div>
            <div className="draft-message">
              <div className="draft-message__head">
                <div>
                  <MessageCircleMore size={18} />
                  <span>可以这样发</span>
                </div>
                <button
                  type="button"
                  className="copy-button"
                  onClick={handleCopy}
                  title="复制建议消息"
                >
                  {copied ? <Check size={15} /> : <Clipboard size={15} />}
                  {copied ? "已复制" : "复制"}
                </button>
              </div>
              <div className="message-tone-tabs" aria-label="回复语气">
                {report.action.messageOptions.map((option, index) => (
                  <button
                    type="button"
                    key={`${option.tone}-${index}`}
                    className={activeMessage === index ? "is-active" : ""}
                    onClick={() => {
                      setActiveMessage(index);
                      setCopied(false);
                    }}
                  >
                    {option.tone}
                  </button>
                ))}
              </div>
              <p>{selectedMessage.text}</p>
            </div>
            <div className="branch-actions">
              <div>
                <span>
                  <span className="mini-label mini-label--warm">如果对方积极</span>
                </span>
                <p>{report.action.ifWarm}</p>
              </div>
              <div>
                <span>
                  <span className="mini-label mini-label--cold">如果对方转冷</span>
                </span>
                <p>{report.action.ifCold}</p>
              </div>
            </div>
          </section>

          <section className="report-section moves-section">
            <div className="section-heading">
              <div>
                <span className="section-index">H</span>
                <div>
                  <h3>继续观察什么</h3>
                  <p>不要只解读语气，把注意力放在双向行动和边界上。</p>
                </div>
              </div>
            </div>
            <div className="moves-layout">
              <div className="moves-list">
                <span>可推进的动作</span>
                {report.action.conversationMoves.map((item, index) => (
                  <div key={item}>
                    <em>{String(index + 1).padStart(2, "0")}</em>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
              <div className="stop-list">
                <span>停止加码的信号</span>
                {report.action.stopSigns.map((item) => (
                  <p key={item}>
                    <ShieldAlert size={14} />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </section>

          <section className="report-section reflection-section">
            <div>
              <Fingerprint size={22} />
              <span className="eyebrow">留给你自己的问题</span>
              <h3>这段互动让你更稳定，还是更常怀疑自己？</h3>
              <p>
                关系判断不只看对方是否有趣，也要看你在这段关系里能否保持边界、表达真实需求，并感到被尊重。
              </p>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => downloadReport(report)}
            >
              <Download size={17} />
              下载完整报告
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
