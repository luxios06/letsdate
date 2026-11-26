import type {
  AnalysisInput,
  AttachmentAssessment,
  AttachmentCue,
  ChatMessage,
  Confidence,
  ConversationSession,
  MessageKind,
  PlanState,
  ShortReplyClass,
  ShortReplyInsight,
} from "../types";

const SHORT_REPLY =
  /^(?:嗯+|哦+|噢+|好+|行+|可以|收到|ok|OK|没事|哈哈+|嗯嗯|好呀|……|\.{3,})$/u;
const CONFLICT =
  /失望|生气|不开心|不舒服|委屈|吵|冷淡|敷衍|忽略|为什么这样|你总是|你从不/u;
const REPAIR =
  /抱歉|对不起|理解|解释|说清楚|直接说|沟通|修复|谢谢理解|以后会|我会注意|可以接受/u;
const PLAN_DAY = /周[一二三四五六日天]|明天|今天|周末/u;
const PLAN_ACTION =
  /见面|有空|时间|几点|[0-9一二三四五六七八九十两]点|门口|约|安排|改天|取消|下次|可以|见/u;
const PLAN_CANCEL = /改天|取消|不去了|不约了|下次吧|没空/u;
const looksLikePlan = (text: string) =>
  (PLAN_DAY.test(text) && PLAN_ACTION.test(text)) || PLAN_CANCEL.test(text);
const SUPPORT =
  /辛苦|理解|抱抱|安慰|陪你|听你|没关系|慢慢来|先休息|先吃饭|别急|低电量/u;
const SELF_DISCLOSURE =
  /我觉得|我喜欢|我不喜欢|我最近|其实我|我会|我需要|我比较|我希望|我有点|我也/u;
const ANXIOUS =
  /你还在吗|你是不是不想|怎么不回|你是不是不喜欢|确认一下|你会不会|别不理我|需要你|是不是我哪里/u;
const WITHDRAWAL =
  /不想说|想安静|别问了|晚点再说|算了|随便|没事|低电量/u;

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function classifyMessage(text: string): MessageKind {
  const trimmed = text.trim();
  if (SHORT_REPLY.test(trimmed)) return "short";
  if (CONFLICT.test(trimmed)) return "conflict";
  if (REPAIR.test(trimmed)) return "repair";
  if (looksLikePlan(trimmed)) return "plan";
  if (SUPPORT.test(trimmed)) return "support";
  if (SELF_DISCLOSURE.test(trimmed)) return "self_disclosure";
  if (/[?？]/u.test(trimmed)) return "question";
  return "statement";
}

function parseTimestamp(raw: string | undefined, currentDate = ""): {
  timestamp: string | null;
  timestampMs: number | null;
} {
  if (!raw) return { timestamp: null, timestampMs: null };
  const parsed = Date.parse(raw.replace(/\//gu, "-"));
  if (Number.isFinite(parsed)) {
    return { timestamp: raw, timestampMs: parsed };
  }
  const time = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/u);
  if (time) {
    const combined = currentDate
      ? Date.parse(`${currentDate} ${raw}`)
      : Number.NaN;
    if (Number.isFinite(combined)) {
      return { timestamp: raw, timestampMs: combined };
    }
    const fallback = new Date();
    fallback.setHours(Number(time[1]), Number(time[2]), 0, 0);
    return { timestamp: raw, timestampMs: fallback.getTime() };
  }
  return { timestamp: null, timestampMs: null };
}

function dateKey(timestampMs: number | null) {
  if (timestampMs === null) return "";
  const date = new Date(timestampMs);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export interface ParsedConversation {
  messages: ChatMessage[];
  sessions: ConversationSession[];
  planState: PlanState;
  timestampCoverage: number;
  shortReplies: ShortReplyInsight[];
}

export function parseConversation(chat: string): ParsedConversation {
  const messages: ChatMessage[] = [];
  const sessions: ConversationSession[] = [];
  let sessionIndex = 0;
  let sessionLabel = "会话 1";
  let currentDate = "";
  let lastTimestampMs: number | null = null;
  let previousSender: "self" | "other" | null = null;

  const startSession = (label: string) => {
    if (
      sessions.length &&
      sessions.at(-1)!.messageIds.length === 0
    ) {
      sessions.at(-1)!.label = label;
      sessionLabel = label;
      return;
    }
    sessionIndex += 1;
    sessionLabel = label;
    sessions.push({
      id: `session-${sessionIndex}`,
      label,
      messageIds: [],
    });
  };
  startSession(sessionLabel);

  for (const rawLine of chat.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) continue;
    const marker = line.match(
      /^[（(]?\s*(?:第\s*)?(\d+)\s*天\s*[）)]?$/u,
    );
    if (marker) {
      startSession(`第 ${marker[1]} 天`);
      currentDate = "";
      lastTimestampMs = null;
      continue;
    }

    let timestampRaw = "";
    let speaker = "";
    let text = "";
    const bracket = line.match(
      /^\[([^\]]+)\]\s*(我|对方|SELF|OTHER)\s*[:：]\s*(.*)$/u,
    );
    const fullTimestamp = line.match(
      /^(\d{4}[-/]\d{1,2}[-/]\d{1,2}\s+\d{1,2}:\d{2})\s*(我|对方|SELF|OTHER)\s*[:：]\s*(.*)$/u,
    );
    const ordinary = line.match(
      /^(我|对方|SELF|OTHER)\s*[:：]\s*(.*)$/u,
    );
    if (bracket) {
      [, timestampRaw, speaker, text] = bracket;
    } else if (fullTimestamp) {
      [, timestampRaw, speaker, text] = fullTimestamp;
    } else if (ordinary) {
      [, speaker, text] = ordinary;
    } else {
      continue;
    }

    const parsedTime = parseTimestamp(timestampRaw, currentDate);
    const replyLagMs =
      parsedTime.timestampMs !== null && lastTimestampMs !== null
        ? Math.max(0, parsedTime.timestampMs - lastTimestampMs)
        : null;
    const nextDate = dateKey(parsedTime.timestampMs);
    const longGap =
      parsedTime.timestampMs !== null &&
      lastTimestampMs !== null &&
      parsedTime.timestampMs - lastTimestampMs > 6 * 60 * 60 * 1000;
    if ((nextDate && currentDate && nextDate !== currentDate) || longGap) {
      startSession(`会话 ${sessionIndex + 1}`);
    }
    if (nextDate) currentDate = nextDate;
    if (parsedTime.timestampMs !== null) lastTimestampMs = parsedTime.timestampMs;

    const normalizedSpeaker =
      speaker === "我" || speaker === "SELF" ? "self" : "other";
    const id = `msg-${messages.length + 1}`;
    const kind = classifyMessage(text);
    const message: ChatMessage = {
      id,
      sender: normalizedSpeaker,
      text: text.trim(),
      sessionId: sessions.at(-1)!.id,
      timestamp: parsedTime.timestamp,
      timestampMs: parsedTime.timestampMs,
      replyLagMs,
      kind,
      short: kind === "short",
      replyToId:
        previousSender && previousSender !== normalizedSpeaker
          ? messages.at(-1)?.id ?? null
          : null,
    };
    messages.push(message);
    sessions.at(-1)!.messageIds.push(id);
    previousSender = normalizedSpeaker;
  }

  const timestampCoverage = messages.length
    ? messages.filter((message) => message.timestampMs !== null).length /
      messages.length
    : 0;
  return {
    messages,
    sessions,
    planState: derivePlanState(messages),
    timestampCoverage,
    shortReplies: analyzeShortReplies(messages, sessions),
  };
}

function derivePlanState(messages: ChatMessage[]): PlanState {
  const recent = messages.slice(-16);
  const planMessages = recent.filter(
    (message) => message.kind === "plan" || looksLikePlan(message.text),
  );
  const last = planMessages.at(-1);
  if (!last) {
    return {
      status: "none",
      day: "",
      time: "",
      venue: "",
      evidenceIds: [],
      summary: "当前材料里没有明确计划。",
    };
  }
  const joined = planMessages.map((message) => message.text).join("\n");
  const day = [...joined.matchAll(/(?:周[一二三四五六日天]|明天|今天)/gu)].at(-1)?.[0] ?? "";
  const time =
    [...joined.matchAll(/(?:[0-9]{1,2}|[一二三四五六七八九十两])点/gu)].at(-1)?.[0] ??
    "";
  const venue =
    joined.match(/(展馆门口|展馆|咖啡店|餐厅|电影院|小馆|小店|门口)/u)?.[1] ??
    "";
  const lastText = planMessages
    .slice(-4)
    .map((message) => message.text)
    .join(" ");
  const cancelled =
    /取消|不去了|改天|没空|不行|不约|下次吧/u.test(lastText) &&
    !/不取消/u.test(lastText);
  const uncertain = /可能|看情况|再确认|还不确定|如果|到时候再说/u.test(lastText);
  const confirmed =
    !cancelled &&
    !uncertain &&
    /(周[一二三四五六日天]|明天|今天).{0,24}(?:见|可以|点|门口|成交)|(?:好|可以|成交)[，,]?\s*(?:周[一二三四五六日天]|明天|今天)/u.test(
      lastText,
    );
  const status = cancelled
    ? "cancelled"
    : confirmed
      ? "confirmed"
      : uncertain
        ? "ambiguous"
        : "proposed";
  const summary =
    status === "confirmed"
      ? `计划已确认：${day}${time}${venue ? `，${venue}` : ""}。`
      : status === "cancelled"
        ? "最近的计划包含取消或改期表达，不能当成已确认。"
        : status === "ambiguous"
          ? "计划仍在协商，尚不能当成已确认。"
          : "存在计划提议，但还没有明确确认。";
  return {
    status,
    day,
    time,
    venue,
    evidenceIds: planMessages.slice(-4).map((message) => message.id),
    summary,
  };
}

function analyzeShortReplies(
  messages: ChatMessage[],
  sessions: ConversationSession[],
): ShortReplyInsight[] {
  const otherSubstantive = messages.filter(
    (message) => message.sender === "other" && !message.short,
  );
  const baselineCharacters = median(
    otherSubstantive.map((message) => [...message.text].length),
  );
  const baselineReplyLagMs = median(
    messages
      .filter(
        (message) =>
          message.sender === "other" && message.replyLagMs !== null,
      )
      .map((message) => message.replyLagMs!),
  ) || null;
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const otherCount = messages.filter((message) => message.sender === "other").length;
  const shortCount = messages.filter(
    (message) => message.sender === "other" && message.short,
  ).length;
  const shortRate = otherCount ? shortCount / otherCount : 0;
  const insights: ShortReplyInsight[] = [];

  messages.forEach((message, index) => {
    if (message.sender !== "other" || !message.short) return;
    const session = sessionById.get(message.sessionId);
    const sessionMessages = session
      ? session.messageIds
          .map((id) => messages.find((item) => item.id === id))
          .filter((item): item is ChatMessage => Boolean(item))
      : [];
    const sessionOther = sessionMessages.filter(
      (item) => item.sender === "other" && !item.short,
    );
    const sessionBaseline = median(
      sessionOther.map((item) => [...item.text].length),
    );
    const baseline = sessionBaseline || baselineCharacters;
    const nextOther = messages
      .slice(index + 1, index + 7)
      .filter((item) => item.sender === "other");
    const recovered = nextOther.some(
      (item) =>
        !item.short ||
        item.kind === "question" ||
        item.kind === "plan" ||
        item.kind === "repair" ||
        item.kind === "support",
    );
    const noRecovery = nextOther.length >= 2 && !recovered;
    const previousContext = messages
      .slice(Math.max(0, index - 3), index)
      .map((item) => item.text)
      .join(" ");
    let classification: ShortReplyClass = "uncertain";
    if (/低电量|累|困|忙|加班/u.test(previousContext)) {
      classification = "low_energy";
    } else if (noRecovery && shortRate >= 0.35) {
      classification = "possible_withdrawal";
    } else if (recovered && /嗯|好|可以|收到|ok/iu.test(message.text)) {
      classification = "acknowledgment";
    } else if (nextOther.length === 0) {
      classification = "topic_closed";
    }
    const explanation =
      classification === "acknowledgment"
        ? "更像收到或确认，随后对方仍继续提供了有效内容。"
        : classification === "low_energy"
          ? "前后文出现忙碌、疲惫或低电量线索，短回复更像当前状态。"
          : classification === "possible_withdrawal"
            ? "短回复连续出现且没有恢复性内容，存在收缩线索，但缺少时间间隔和平时基线。"
            : classification === "topic_closed"
              ? "短回复发生在话题结尾，可能只是结束当前话题。"
              : "当前信息不足，不能把这条短回复解释成冷淡或依恋模式。";
    insights.push({
      messageId: message.id,
      quote: message.text,
      sessionId: message.sessionId,
      classification,
      explanation,
      baselineCharacters: Math.round(baseline),
      sessionShift: Math.round([...message.text].length - baseline),
      replyLagMs: message.replyLagMs,
      baselineReplyLagMs,
      replyLagShiftMs:
        message.replyLagMs !== null && baselineReplyLagMs !== null
          ? Math.round(message.replyLagMs - baselineReplyLagMs)
          : null,
      afterEffect: recovered ? "recovered" : noRecovery ? "no_recovery" : "unknown",
      evidenceIds: [message.id],
      confidence:
        classification === "possible_withdrawal" && shortRate >= 0.55
          ? "中"
          : "低",
    });
  });
  return insights.slice(0, 8);
}

export function assessAttachment(
  messages: ChatMessage[],
  shortReplies: ShortReplyInsight[],
  sender: "self" | "other",
): AttachmentAssessment {
  const own = messages.filter((message) => message.sender === sender);
  const repairCount = own.filter((message) => message.kind === "repair").length;
  const conflictCount = own.filter((message) => message.kind === "conflict").length;
  const boundaryCount = own.filter((message) =>
    /空间|需要|提前|不方便|安静|不催|可以接受/u.test(message.text),
  ).length;
  const anxiousCount = own.filter((message) => ANXIOUS.test(message.text)).length;
  const withdrawalCount = own.filter((message) =>
    WITHDRAWAL.test(message.text),
  ).length;
  const relevantShorts = shortReplies.filter((insight) => {
    const message = messages.find((item) => item.id === insight.messageId);
    return (
      message?.sender === sender &&
      insight.classification === "possible_withdrawal" &&
      insight.afterEffect === "no_recovery"
    );
  });
  const missing = [
    "对方的日常回复基线",
    "出现短回复后的时间间隔",
  ];
  if (!conflictCount) missing.push("一次真实冲突或拒绝后的反应");
  if (!repairCount) missing.push("误解后是否主动修复");

  const safeStatus =
    repairCount >= 2 && boundaryCount >= 2
      ? "supported"
      : repairCount >= 1 || boundaryCount >= 1
        ? "tentative"
        : "insufficient";
  const anxiousStatus =
    anxiousCount >= 3 ? "supported" : anxiousCount >= 2 ? "tentative" : "insufficient";
  const avoidantStatus =
    relevantShorts.length >= 3 && repairCount === 0
      ? "supported"
      : relevantShorts.length >= 2 ||
          (withdrawalCount >= 2 && repairCount === 0)
        ? "tentative"
        : "insufficient";
  const cue = (
    key: AttachmentCue["key"],
    label: string,
    status: AttachmentCue["status"],
    score: number,
    summary: string,
    evidenceIds: string[],
    counterEvidenceIds: string[],
  ): AttachmentCue => ({
    key,
    label,
    status,
    score,
    confidence: status === "supported" ? "中" : "低",
    summary,
    evidenceIds,
    counterEvidenceIds,
    missingInformation: missing,
  });
  const safeEvidence = own
    .filter((message) => message.kind === "repair" || /空间|需要|提前/u.test(message.text))
    .map((message) => message.id);
  const anxiousEvidence = own
    .filter((message) => ANXIOUS.test(message.text))
    .map((message) => message.id);
  const avoidantEvidence = relevantShorts.flatMap((insight) => insight.evidenceIds);
  const cues = [
    cue(
      "safe",
      "安全互动线索",
      safeStatus,
      safeStatus === "supported" ? 78 : safeStatus === "tentative" ? 61 : 50,
      safeStatus === "insufficient"
        ? "缺少冲突后的解释、修复和边界协商，当前无法判断安全互动模式。"
        : "材料里出现了解释、修复或边界协商，可以作为安全互动线索。",
      safeEvidence,
      avoidantEvidence,
    ),
    cue(
      "anxious",
      "焦虑互动线索",
      anxiousStatus,
      anxiousStatus === "supported" ? 70 : anxiousStatus === "tentative" ? 58 : 50,
      anxiousStatus === "insufficient"
        ? "没有看到持续确认、害怕被抛下或反复追问的明确证据。"
        : "出现了寻求确认或担心关系变化的语言，但需要结合更多情境。",
      anxiousEvidence,
      safeEvidence,
    ),
    cue(
      "avoidant",
      "回避互动线索",
      avoidantStatus,
      avoidantStatus === "supported" ? 66 : avoidantStatus === "tentative" ? 55 : 50,
      avoidantStatus === "insufficient"
        ? "短回复不足，或随后有恢复性互动，不能判断回避模式。"
        : "连续短回复或拉开距离后缺少恢复，存在回避样互动线索。",
      avoidantEvidence,
      safeEvidence,
    ),
  ];
  const supported = cues.filter((item) => item.status === "supported");
  const tentative = cues.filter((item) => item.status === "tentative");
  const summary =
    supported.length > 1
      ? "材料同时出现多种依恋相关互动线索，更接近混合或情境性模式，不能贴单一类型。"
      : supported[0]?.summary ??
        tentative[0]?.summary ??
        "当前材料不足以判断依恋模式，只能看到有限互动状态。";
  return {
    summary,
    cues,
    scope:
      "依恋线索只描述这段材料中的互动行为，不是临床诊断，也不能代表对方在所有关系中的人格。",
  };
}

function normalizeForQuote(value: string) {
  return value
    .replace(/\s+/gu, "")
    .replace(/[“”"'‘’]/gu, "")
    .trim();
}

export function sourceContainsQuote(input: AnalysisInput, quote: string) {
  const needle = normalizeForQuote(quote);
  if (!needle) return false;
  const parsed = parseConversation(input.chat);
  return [input.selfProfile, input.otherProfile, ...parsed.messages.map((message) => message.text)]
    .some((source) => normalizeForQuote(source).includes(needle));
}

export function exactQuoteStatus(
  input: AnalysisInput,
  evidence: { id: string; quote: string }[],
) {
  return evidence.map((item) => ({
    id: item.id,
    exact: sourceContainsQuote(input, item.quote),
  }));
}
