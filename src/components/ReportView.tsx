import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Download,
  Fingerprint,
  HeartHandshake,
  MessageCircleMore,
  MessageSquareText,
  Quote,
  ScanSearch,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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

type ReportTab = "overview" | "messages" | "evidence" | "action";
type MessageFilter = "all" | "other" | "risk" | "repair";

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

const shortReplyText = {
  acknowledgment: "收到或确认",
  low_energy: "低能量或忙碌",
  topic_closed: "结束当前话题",
  possible_withdrawal: "可能有收缩线索",
  uncertain: "信息不足",
} as const;

const afterEffectText = {
  recovered: "随后恢复有效交流",
  no_recovery: "暂未看到恢复",
  unknown: "后续信息不足",
} as const;

function formatLag(value: number | null) {
  if (value === null) return "回复间隔未知";
  const minutes = Math.round(value / 60000);
  if (minutes < 60) return `回复间隔 ${minutes} 分钟`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  if (hours < 24) return `回复间隔 ${hours} 小时`;
  return `回复间隔 ${Math.round((hours / 24) * 10) / 10} 天`;
}

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
    <motion.div
      className="score-ring"
      style={{
        background: `conic-gradient(var(--coral) ${score * 3.6}deg, rgba(23, 63, 57, 0.12) 0deg)`,
      }}
      initial={{ opacity: 0, scale: 0.88, rotate: -8 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 170, damping: 18 }}
      whileHover={{ scale: 1.025 }}
    >
      <div>
        <strong>{score}</strong>
        <span>{label}</span>
      </div>
    </motion.div>
  );
}

function copyText(value: string) {
  return navigator.clipboard.writeText(value);
}

function downloadReport(report: AnalysisReport) {
  const lines = [
    `# letsdate 关系解读`,
    "",
    `生成时间：${fmtDate(report.createdAt)}`,
    `关系备注：${report.relationshipLabel}`,
    `关系阶段：${report.stage}`,
    `结论：${report.decision} / ${report.compatibilityScore}`,
    `分数校准：${report.calibration.evidenceMessages} 条对方消息，可靠性 ${Math.round(report.calibration.reliability * 100)}%，上限 ${report.calibration.scoreCap}`,
    "",
    `## ${report.overallTitle}`,
    report.overallSummary,
    "",
    `## 先把话说轻一点`,
    `能确认：${report.humanRead.canConfirm}`,
    `更可能：${report.humanRead.likely}`,
    `另一种解释：${report.humanRead.alternatives}`,
    `接下来观察：${report.humanRead.observeNext}`,
    report.humanRead.supportNote,
    "",
    "## 情绪与靠近的方式",
    report.emotion.quickRead.headline,
    report.emotion.quickRead.observation,
    `建议：${report.emotion.quickRead.suggestion}`,
    ...report.emotion.intimacySignals.map(
      (signal) => `- ${signal.label}：${signal.score}，${signal.hits.join("、")}`,
    ),
    "",
    "## 一句话一句话",
    ...report.messageInsights.map(
      (item) =>
        `- ${item.sender === "self" ? "我" : "对方"}：“${item.quote}”\n  情绪：${item.emotion}；意图：${item.intent}；线索：${item.cue}（${item.confidence}置信度）\n  ${item.explanation}`,
    ),
    "",
    ...(report.knowledge.relatedCases.length > 0
      ? [
          "## 别处也发生过的相似片段",
          `案例库共 ${report.knowledge.caseCount} 条匿名派生或虚构案例；以下匹配只用于提示可能的情境模式，不是当前对象的证据。`,
          ...report.knowledge.relatedCases.map(
            (item) =>
              `- ${item.title}（${item.pattern}，相似度 ${item.similarity}%）\n  情境：${item.situation}\n  可参考：${item.takeaway}\n  来源：${item.source} / ${item.license}`,
          ),
          "",
        ]
      : []),
    `## Ta 更像怎样的人`,
    `MBTI 倾向：${report.person.mbti.candidate}（${report.person.mbti.confidence}置信度）`,
    `判断依据：${report.person.mbti.summary}`,
    `替代倾向：${report.person.mbti.alternatives.join("、") || "暂无"}`,
    ...report.person.bigFive.map((trait) => `- ${trait.label}: ${trait.score}/100，${trait.summary}`),
    "",
    `## 亲近与退后的节奏`,
    report.person.attachmentAssessment.summary,
    ...report.person.attachmentAssessment.cues.map(
      (cue) => `- ${cue.label}（${evidenceStatusText[cue.status]}）：${cue.summary}`,
    ),
    "",
    `## 你们之间的回声`,
    report.compatibility.summary,
    ...report.compatibility.dimensions.map(
      (dimension) => `- ${dimension.label}: ${dimension.score}/100，${dimension.summary}`,
    ),
    "",
    `## 下一步怎么走`,
    report.action.nextMessage,
    "",
    ...report.action.messageOptions.map((option) => `- ${option.tone}：${option.text}`),
    "",
    `## 每一句原话，都有来路`,
    ...report.evidence.map(
      (item) =>
        `- [${item.source}] “${item.quote}”\n  观察：${item.observation}\n  推断：${item.inference}\n  反证：${item.caution}`,
    ),
    "",
    `## 仍然留白的地方`,
    ...report.uncertainties.map((item) => `- ${item}`),
    "",
    `## 想更靠近答案，还缺这些`,
    ...report.contextGaps.map((gap) => `- ${gap.question} ${gap.why}`),
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
  const [messageFilter, setMessageFilter] =
    useState<MessageFilter>("all");
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
  const messageFilters = useMemo(
    () =>
      [
        {
          key: "all" as const,
          label: "全部",
          count: report.messageInsights.length,
        },
        {
          key: "other" as const,
          label: "对方",
          count: report.messageInsights.filter(
            (item) => item.sender === "other",
          ).length,
        },
        {
          key: "risk" as const,
          label: "风险",
          count: report.messageInsights.filter((item) => item.cue === "风险")
            .length,
        },
        {
          key: "repair" as const,
          label: "修复",
          count: report.messageInsights.filter((item) => item.cue === "修复")
            .length,
        },
      ] satisfies Array<{
        key: MessageFilter;
        label: string;
        count: number;
      }>,
    [report.messageInsights],
  );
  const filteredMessageInsights = useMemo(
    () =>
      report.messageInsights.filter((item) => {
        if (messageFilter === "all") return true;
        if (messageFilter === "other") return item.sender === "other";
        return item.cue === (messageFilter === "risk" ? "风险" : "修复");
      }),
    [messageFilter, report.messageInsights],
  );

  useEffect(() => {
    setActiveMessage(0);
    setCopied(false);
    setMessageFilter("all");
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
          回到书写
        </button>
        <div className="report__meta">
          <span className="report__relationship">{report.relationshipLabel}</span>
          <span className="report__dot" />
          <span>{fmtDate(report.createdAt)}</span>
          <span className="report__dot" />
          <span>{PROVIDER_LABELS[report.provider]}</span>
          <span className="report__dot" />
          <span>
            {report.pipeline.messageCount} 条消息 · {report.pipeline.sessionCount} 个会话
          </span>
          <span className="report__dot" />
          <span>
            {report.pipeline.timestampCoverage > 0
              ? `时间戳 ${Math.round(report.pipeline.timestampCoverage * 100)}%`
              : "无时间戳"}
          </span>
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
          <span className="index-label">02 / 这段关系此刻的样子</span>
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
              来自 {report.calibration.evidenceMessages} 条消息 · 可信度{" "}
              {Math.round(report.calibration.reliability * 100)}%
            </span>
            <span>分数停在 {report.calibration.scoreCap} 以内</span>
            <span>{report.calibration.method}</span>
          </div>
        </div>
        <div className="verdict__score">
          <ScoreRing score={report.compatibilityScore} label="互动信号" />
          <div>
            <span>兴趣信号</span>
            <strong>{report.interest.score}</strong>
            <small>{report.interest.confidence}置信度</small>
          </div>
          <div>
            <span>人格倾向</span>
            <strong>{report.person.mbti.candidate}</strong>
            <small>{report.person.mbti.confidence}置信度</small>
          </div>
          {report.pipeline.localRuleMode && (
            <p className="local-mode-note">
              当前为规则演示，不用于正式心理或依恋判断。
            </p>
          )}
        </div>
      </section>

      <nav className="report-tabs" aria-label="报告导航">
        <button
          type="button"
          className={tab === "overview" ? "is-active" : ""}
          onClick={() => setTab("overview")}
        >
          {tab === "overview" && (
            <motion.span
              className="report-tab-indicator"
              layoutId="report-tab-indicator"
            />
          )}
          <Fingerprint size={16} />
          两个人的样子
        </button>
        <button
          type="button"
          className={tab === "messages" ? "is-active" : ""}
          onClick={() => setTab("messages")}
        >
          {tab === "messages" && (
            <motion.span
              className="report-tab-indicator"
              layoutId="report-tab-indicator"
            />
          )}
          <MessageSquareText size={16} />
          一句话一句话
        </button>
        <button
          type="button"
          className={tab === "evidence" ? "is-active" : ""}
          onClick={() => setTab("evidence")}
        >
          {tab === "evidence" && (
            <motion.span
              className="report-tab-indicator"
              layoutId="report-tab-indicator"
            />
          )}
          <ScanSearch size={16} />
          原话与依据
        </button>
        <button
          type="button"
          className={tab === "action" ? "is-active" : ""}
          onClick={() => setTab("action")}
        >
          {tab === "action" && (
            <motion.span
              className="report-tab-indicator"
              layoutId="report-tab-indicator"
            />
          )}
          <ArrowRight size={16} />
          下一步怎么走
        </button>
      </nav>

      {tab === "messages" && (
        <div className="report-section-stack">
          <section className="report-section message-insights-section">
            <div className="section-heading">
              <div>
                <span className="section-index">M</span>
                <div>
                  <h3>一句话，一层心情</h3>
                  <p>
                    只是听听这句话怎么落在当下，不替任何人猜测藏起来的心事。
                  </p>
                </div>
              </div>
              <span className="confidence-chip">
                {report.messageInsights.length} 条标签
              </span>
            </div>
            {report.messageInsights.length > 0 ? (
              <>
                <div
                  className="message-filter-row"
                  role="group"
                  aria-label="筛选消息标签"
                >
                  {messageFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      className={
                        messageFilter === filter.key ? "is-active" : ""
                      }
                      onClick={() => setMessageFilter(filter.key)}
                    >
                      {filter.label}
                      <span>{filter.count}</span>
                    </button>
                  ))}
                </div>
                <motion.div className="message-insight-list" layout>
                  <AnimatePresence initial={false} mode="popLayout">
                    {filteredMessageInsights.map((item) => (
                      <motion.article
                        layout
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                        className={`message-insight-item message-insight-item--${item.cue}`}
                        key={item.messageId}
                      >
                        <div className="message-insight-item__meta">
                          <span>{item.sender === "self" ? "我" : "对方"}</span>
                          <em>
                            {item.source === "local-rules"
                              ? "本地规则"
                              : item.source === "local-llm"
                                ? "Ollama 本地模型"
                                : item.source === "browser-local"
                                  ? "浏览器本地模型"
                                  : "模型增强"}
                          </em>
                        </div>
                        <blockquote>“{item.quote}”</blockquote>
                        <div className="message-insight-item__labels">
                          <span>{item.emotion}</span>
                          <span>{item.intent}</span>
                          <em>{item.cue}</em>
                        </div>
                        <p>{item.explanation}</p>
                        <small>{item.confidence}置信度</small>
                      </motion.article>
                    ))}
                  </AnimatePresence>
                </motion.div>
                {filteredMessageInsights.length === 0 && (
                  <div className="empty-state empty-state--compact">
                    <p>这个筛选下没有消息标签。</p>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state empty-state--compact">
                <p>这段材料还没有可用的逐消息标签。</p>
              </div>
            )}
            <p className="message-insights-note">
              没有模型时，本地规则会先读一遍；接入本机模型后，还可以再听深一层。
            </p>
          </section>
        </div>
      )}

      {tab === "overview" && (
        <div className="report-section-stack">
          <section className="report-section human-read-section">
            <div className="section-heading">
              <div>
                <span className="section-index">H</span>
                <div>
                  <h3>先把话说轻一点</h3>
                  <p>把已经看见的、可能成立的，和暂时还说不准的，轻轻分开。</p>
                </div>
              </div>
              <span className="confidence-chip">
                {report.pipeline.exactQuoteVerification
                  ? "原话已核对"
                  : "原话待核对"}
              </span>
            </div>
            <div className="human-read-grid">
              <div>
                <span>已经看见</span>
                <p>{report.humanRead.canConfirm}</p>
              </div>
              <div>
                <span>更像如此</span>
                <p>{report.humanRead.likely}</p>
              </div>
              <div>
                <span>另一种可能</span>
                <p>{report.humanRead.alternatives}</p>
              </div>
              <div>
                <span>接下来看</span>
                <p>{report.humanRead.observeNext}</p>
              </div>
            </div>
            <div className="emotion-read-panel">
              <div className="emotion-read-panel__main">
                <div>
                  <span className="eyebrow">情绪与靠近的方式</span>
                  <h4>{report.emotion.quickRead.headline}</h4>
                  <p>{report.emotion.quickRead.observation}</p>
                </div>
                <span className="confidence-chip">
                  {report.emotion.quickRead.confidence}置信度
                </span>
              </div>
              <div className="emotion-read-panel__advice">
                <MessageCircleMore size={16} />
                <p>{report.emotion.quickRead.suggestion}</p>
              </div>
              <div className="emotion-chip-row">
                {report.emotion.categories
                  .filter(
                    (category) => category.count > 0 && category.score >= 20,
                  )
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 4)
                  .map((category) => (
                    <span key={category.key}>
                      {category.label} {category.score}%
                    </span>
                  ))}
                {report.emotion.intimacySignals.slice(0, 4).map((signal) => (
                  <span key={signal.key} className="emotion-chip-row__signal">
                    {signal.label}
                    {signal.sender === "both"
                      ? " · 双方"
                      : signal.sender === "self"
                        ? " · 你"
                        : " · 对方"}
                  </span>
                ))}
              </div>
              {report.emotion.quickRead.missingInformation.length > 0 && (
                <p className="emotion-read-panel__missing">
                  如果还想更确定，可以补：{report.emotion.quickRead.missingInformation.join("；")}
                </p>
              )}
              <small>
                情绪线索来自 cnsenti / DUTIR。它只描述这些文字里的情绪，不替任何人下定义。
              </small>
            </div>
            {report.knowledge.relatedCases.length > 0 && (
              <div className="knowledge-reference">
                <div className="knowledge-reference__head">
                  <BookOpen size={17} />
                  <div>
                    <span>别处也发生过的相似片段</span>
                    <p>
                      从 {report.knowledge.caseCount} 条匿名片段里找到一些回声。
                      它们只用来多开一扇窗，不是关于对方的证据。
                    </p>
                  </div>
                </div>
                <div className="knowledge-reference__grid">
                  {report.knowledge.relatedCases.map((item) => (
                    <article key={item.id}>
                      <div>
                        <span>{item.pattern}</span>
                        <em>{item.similarity}% 相似</em>
                      </div>
                      <strong>{item.title}</strong>
                      <p>{item.situation}</p>
                      <blockquote>{item.takeaway}</blockquote>
                      <small>
                        {item.synthetic ? "虚构测试案例" : "公开匿名派生"} ·{" "}
                        {item.license}
                      </small>
                    </article>
                  ))}
                </div>
              </div>
            )}
            <div className="human-read-support">
              <ShieldAlert size={15} />
              {report.humanRead.supportNote}
            </div>
          </section>

          <section className="report-section personality-section">
            <div className="section-heading">
              <div>
                <span className="section-index">A</span>
                <div>
                  <h3>Ta 更像怎样的人</h3>
                  <p>把目前的线索放在一起，得到一个方向，也给别的可能留一点位置。</p>
                </div>
              </div>
              <span className={`confidence-chip confidence-chip--${report.person.mbti.confidence}`}>
                {report.person.mbti.confidence}置信度
              </span>
            </div>

            <div className="personality-grid">
              <div className="mbti-panel">
                <div className="mbti-panel__title">
                    <span>把这些细节放在一起</span>
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
                  <p className="mbti-panel__summary">
                    {report.person.mbti.summary}
                  </p>
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
                    <span>更稳定的性格轮廓</span>
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
                ["靠近的节奏", report.person.interaction.pace],
                ["能量从哪里来", report.person.interaction.energy],
                ["玩笑落在哪里", report.person.interaction.humor],
                ["遇到分歧时", report.person.interaction.conflict],
                ["亲近与退后", report.person.interaction.attachment],
              ].map(([label, value], index) => (
                <div className="interaction-item" key={label}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{label}</strong>
                  <p>{value}</p>
                </div>
              ))}
            </div>

            <div className="attachment-cue-section">
              <div className="attachment-cue-section__head">
                <div>
                  <span>亲近与退后的节奏</span>
                  <p>{report.person.attachmentAssessment.summary}</p>
                </div>
                <ShieldAlert size={19} />
              </div>
              <div className="attachment-cue-grid">
                {report.person.attachmentAssessment.cues.map((cue) => (
                  <article
                    className={`attachment-cue attachment-cue--${cue.status}`}
                    key={cue.key}
                  >
                    <div>
                      <strong>{cue.label}</strong>
                      <em>{evidenceStatusText[cue.status]}</em>
                    </div>
                    <p>{cue.summary}</p>
                    {cue.status !== "insufficient" && (
                      <span>线索强度 {cue.score}</span>
                    )}
                  </article>
                ))}
              </div>
              <p className="attachment-scope">
                {report.person.attachmentAssessment.scope}
              </p>
            </div>
          </section>

          {report.shortReplies.length > 0 && (
            <section className="report-section short-reply-section">
              <div className="section-heading">
                <div>
                  <span className="section-index">S</span>
                  <div>
                    <h3>一句“嗯”，未必就是退后</h3>
                    <p>先看 Ta 平时怎么说话，再看前后语境和后来有没有回来，而不是只盯着这两个字。</p>
                  </div>
                </div>
                <span className="confidence-chip">
                  {report.shortReplies.length} 条短回复
                </span>
              </div>
              <div className="short-reply-grid">
                {report.shortReplies.map((item) => (
                  <article key={item.messageId}>
                    <blockquote>“{item.quote}”</blockquote>
                    <div>
                      <strong>{shortReplyText[item.classification]}</strong>
                      <em>{item.confidence}置信度</em>
                    </div>
                    <p>{item.explanation}</p>
                    <span>
                      较个人基线 {item.sessionShift >= 0 ? "+" : ""}
                      {item.sessionShift} 字 · {formatLag(item.replyLagMs)}
                      {item.baselineReplyLagMs !== null
                        ? `（基线 ${formatLag(item.baselineReplyLagMs).replace("回复间隔 ", "")}）`
                        : ""}
                      {" · "}
                      {afterEffectText[item.afterEffect]}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="report-section compatibility-section">
            <div className="section-heading">
              <div>
                <span className="section-index">B</span>
                <div>
                  <h3>你们之间的回声</h3>
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
                  <span>想靠近的证据</span>
                  <strong>{report.interest.score}</strong>
                </div>
                <p>{report.interest.verdict}</p>
                <div className="interest-columns">
                  <div>
                    <span>让人安心的部分</span>
                    {report.interest.signals.map((signal) => (
                      <p key={signal}>
                        <Check size={13} />
                        {signal}
                      </p>
                    ))}
                  </div>
                  <div>
                    <span>还想确认的事</span>
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
                  <h3>你在这段关系里的位置</h3>
                  <p>{report.self.summary}</p>
                </div>
              </div>
              <span className="confidence-chip">{report.self.mbti.candidate} 倾向</span>
            </div>
            <div className="self-grid">
              <div>
                <span>你在意什么</span>
                {report.self.needs.map((item) => (
                  <p key={item}>
                    <HeartHandshake size={14} />
                    {item}
                  </p>
                ))}
              </div>
              <div>
                <span>你已经在做的</span>
                {report.self.greenFlags.map((item) => (
                  <p key={item}>
                    <Sparkles size={14} />
                    {item}
                  </p>
                ))}
              </div>
              <div>
                <span>别忽略的自己</span>
                {report.self.watchouts.map((item) => (
                  <p key={item}>
                    <AlertTriangle size={14} />
                    {item}
                  </p>
                ))}
              </div>
            </div>
            <div className="attachment-cue-section">
              <div className="attachment-cue-section__head">
                <div>
                  <span>你亲近与退后的方式</span>
                  <p>{report.self.attachmentAssessment.summary}</p>
                </div>
                <ShieldAlert size={19} />
              </div>
              <div className="attachment-cue-grid">
                {report.self.attachmentAssessment.cues.map((cue) => (
                  <article
                    className={`attachment-cue attachment-cue--${cue.status}`}
                    key={cue.key}
                  >
                    <div>
                      <strong>{cue.label}</strong>
                      <em>{evidenceStatusText[cue.status]}</em>
                    </div>
                    <p>{cue.summary}</p>
                  </article>
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
                  <h3>每一句原话，都有来路</h3>
                  <p>所有判断都应该能沿着线，慢慢走回它最初出现的地方。</p>
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
                        <span>也许意味着</span>
                        <p>{item.inference}</p>
                      </div>
                    </div>
                    <p className="evidence-item__caution">
                      <CircleHelp size={14} />
                      也别忘了：{item.caution}
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
                  <h3>仍然留白的地方</h3>
                  <p>留白不是失败。它提醒我们，关系还在继续，人也不止一面。</p>
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

          {report.contextGaps.length > 0 && (
            <section className="report-section context-gap-section">
              <div className="section-heading">
                <div>
                  <span className="section-index">E2</span>
                  <div>
                    <h3>想更靠近答案，还缺这些</h3>
                    <p>补上它们，很多原本模糊的语气会更容易找到位置。</p>
                  </div>
                </div>
              </div>
              <div className="context-gap-list">
                {report.contextGaps.map((gap, index) => (
                  <div key={gap.question}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{gap.question}</strong>
                      <p>{gap.why}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="report-section safety-section">
            <div className="section-heading">
              <div>
                <span className="section-index">F</span>
                <div>
                  <h3>解读到此为止的边界</h3>
                  <p>它帮助你更清醒地靠近，而不是替你决定别人是谁。</p>
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
                <span className="eyebrow">这一次，可以这样靠近</span>
                <h3>{report.action.decision}</h3>
                <p>{report.action.rationale}</p>
              </div>
            </div>
            <div className="draft-message">
              <div className="draft-message__head">
                <div>
                  <MessageCircleMore size={18} />
                  <span>一句不冒犯的开口</span>
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
                  <span className="mini-label mini-label--warm">如果 Ta 向你走来</span>
                </span>
                <p>{report.action.ifWarm}</p>
              </div>
              <div>
                <span>
                  <span className="mini-label mini-label--cold">如果 Ta 暂时退后</span>
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
                  <h3>接下来，留意这些细节</h3>
                  <p>别只听语气。看看 Ta 有没有向你走来，也看看你有没有在这段关系里失去自己。</p>
                </div>
              </div>
            </div>
            <div className="moves-layout">
              <div className="moves-list">
                <span>可以试着做的</span>
                {report.action.conversationMoves.map((item, index) => (
                  <div key={item}>
                    <em>{String(index + 1).padStart(2, "0")}</em>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
              <div className="stop-list">
                <span>该把手收回来的时刻</span>
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
              <h3>这段关系，让你更像自己，还是更常怀疑自己？</h3>
              <p>
                值得靠近的关系，不只会让你心动，也会让你更能表达需要、守住边界，并安稳地做自己。
              </p>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => downloadReport(report)}
            >
              <Download size={17} />
              把这份解读带走
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
