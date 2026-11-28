import type {
  ChatMessage,
  MessageInsight,
  MessageInsightCue,
  MessageInsightEmotion,
  MessageInsightIntent,
} from "../types";

export const MESSAGE_EMOTIONS = [
  "开心",
  "期待",
  "平静",
  "关心",
  "亲昵",
  "低落",
  "焦虑",
  "失望",
  "生气",
  "强硬",
  "困惑",
] as const satisfies readonly MessageInsightEmotion[];

export const MESSAGE_INTENTS = [
  "分享",
  "了解",
  "邀约",
  "确认计划",
  "改期",
  "拒绝",
  "婉拒",
  "答应",
  "安慰",
  "解释",
  "修复",
  "表达不满",
  "表达边界",
  "寻求确认",
  "控制要求",
  "表达想念",
  "调情",
  "回应",
  "结束话题",
] as const satisfies readonly MessageInsightIntent[];

export const MESSAGE_CUES = [
  "靠近",
  "稳定",
  "试探",
  "收缩",
  "冲突",
  "修复",
  "边界",
  "风险",
  "中性",
] as const satisfies readonly MessageInsightCue[];

export interface ExtractedMessageInsight {
  messageId: string;
  quote: string;
  emotion: MessageInsightEmotion;
  intent: MessageInsightIntent;
  cue: MessageInsightCue;
  confidence: "低" | "中" | "较高";
  explanation: string;
}

function compact(text: string, max = 140) {
  return text.replace(/\s+/gu, " ").trim().slice(0, max);
}

function labelMessage(
  message: ChatMessage,
  previous: ChatMessage[],
  next: ChatMessage[],
): ExtractedMessageInsight {
  const text = message.text.trim();
  const context = previous.map((item) => item.text).join(" ");
  const following = next.map((item) => item.text).join(" ");
  const base = {
    messageId: message.id,
    quote: compact(text),
    confidence: "低" as const,
  };

  if (/查手机|定位|报备|不许|必须|只能|删掉|别和.{0,8}联系/u.test(text)) {
    return {
      ...base,
      emotion: "强硬",
      intent: "控制要求",
      cue: "风险",
      confidence: "中",
      explanation: "这是对隐私、社交或行动自由的要求，优先按边界风险理解。",
    };
  }
  if (/抱歉|对不起|是我没|我应该|以后.{0,12}(?:提前|告诉|说清)|我会注意|不是故意/u.test(text)) {
    return {
      ...base,
      emotion: "关心",
      intent: "修复",
      cue: "修复",
      confidence: "中",
      explanation: "出现了道歉、解释或后续调整线索，重点看之后是否真的改变。",
    };
  }
  if (/你是不是不喜欢|你还在吗|怎么不回|别不理我|是不是我哪里|确认一下/u.test(text)) {
    return {
      ...base,
      emotion: "焦虑",
      intent: "寻求确认",
      cue: "试探",
      confidence: "低",
      explanation: "更像在寻求关系确认；单条消息不足以判断依恋模式。",
    };
  }
  if (/有点累|很累|疲惫|困了|低电量|没力气/u.test(text)) {
    return {
      ...base,
      emotion: "低落",
      intent: "分享",
      cue: "稳定",
      confidence: "中",
      explanation: "这条消息在表达当前疲惫状态，更适合先承接感受而不是急着推进关系。",
    };
  }
  if (
    /需要空间|需要.{0,4}边界|别催|慢慢来|不方便|我做不到|这不行|不太舒服|不能接受|不合适/u.test(
      text,
    )
  ) {
    return {
      ...base,
      emotion: "平静",
      intent: "表达边界",
      cue: "边界",
      confidence: "中",
      explanation: "这条消息在说明可接受的节奏或边界，重点是对方之后是否尊重。",
    };
  }
  if (
    /失望|生气|不开心|委屈|你.*没提前|你总是|你从不|为什么这样/u.test(
      text,
    )
  ) {
    return {
      ...base,
      emotion: /生气|什么叫|凭什么/u.test(text) ? "生气" : "失望",
      intent: "表达不满",
      cue: "冲突",
      confidence: "中",
      explanation: "这条消息在表达不满或关系受伤，接下来要看对方是否解释和修复。",
    };
  }
  if (/改天|取消|不行|没空|下次吧|不去了/u.test(text)) {
    return {
      ...base,
      emotion: /抱歉|不好意思/u.test(text) ? "关心" : "平静",
      intent: /抱歉|不好意思|临时/u.test(text) ? "婉拒" : "拒绝",
      cue: "收缩",
      confidence: "中",
      explanation: "这是一次计划拒绝或改期表达，继续看是否解释、补偿和重新约定。",
    };
  }
  if (/想你|想见你|喜欢你|抱抱|亲亲|宝贝|爱你|主要想见你/u.test(text)) {
    return {
      ...base,
      emotion: "亲昵",
      intent: /约|见面|出来/u.test(text) ? "调情" : "表达想念",
      cue: "靠近",
      confidence: /想你|想见你/u.test(text) ? "中" : "低",
      explanation: "出现了靠近或浪漫表达，但是否双向仍要看对方如何接住。",
    };
  }
  if (
    message.kind === "plan" ||
    (/周[一二三四五六日天]|明天|今天|周末|几点|门口/u.test(text) &&
      /见面|可以|[0-9一二三四五六七八九十两]+点|门口|安排/u.test(text))
  ) {
    return {
      ...base,
      emotion: "期待",
      intent: /好|可以|成交|定了|确认/u.test(text) ? "确认计划" : "邀约",
      cue: "稳定",
      confidence: "中",
      explanation: "出现了具体时间、地点或行动，计划正在从表达走向落实。",
    };
  }
  if (/辛苦|抱抱|陪你|听你|先休息|别硬撑|没关系|理解你/u.test(text)) {
    return {
      ...base,
      emotion: "关心",
      intent: "安慰",
      cue: "稳定",
      confidence: "中",
      explanation: "这条消息在承接情绪或提供支持，是回应质量的积极线索。",
    };
  }
  if (/为什么|怎么|你呢|你呢|在哪|什么时候|要不要|有空吗|[?？]/u.test(text)) {
    return {
      ...base,
      emotion: "平静",
      intent: "了解",
      cue: "靠近",
      confidence: "低",
      explanation: "这条消息在追问或了解信息，是否投入还要看对方是否接住。",
    };
  }
  if (message.short) {
    const lowEnergy = /低电量|累|困|忙|加班/u.test(context);
    return {
      ...base,
      emotion: lowEnergy ? "低落" : "平静",
      intent: following ? "回应" : "结束话题",
      cue: lowEnergy ? "收缩" : "中性",
      confidence: "低",
      explanation: lowEnergy
        ? "前后文有低能量线索，短回复先按当前状态理解。"
        : "短回复可能只是确认或收尾，需要结合个人基线判断。",
    };
  }
  if (message.kind === "support") {
    return {
      ...base,
      emotion: "关心",
      intent: "安慰",
      cue: "稳定",
      confidence: "中",
      explanation: "出现了承接对方感受或提供支持的表达。",
    };
  }
  if (/[！!]|哈哈|😂|😊|期待|开心/u.test(text)) {
    return {
      ...base,
      emotion: /期待|开心/u.test(text) ? "开心" : "平静",
      intent: "分享",
      cue: "靠近",
      confidence: "低",
      explanation: "语气更外显，愿意分享当前状态或感受。",
    };
  }
  if (message.kind === "self_disclosure" || /我觉得|我最近|我喜欢|我希望/u.test(text)) {
    return {
      ...base,
      emotion: "平静",
      intent: "分享",
      cue: "稳定",
      confidence: "低",
      explanation: "这是一条自我披露或状态分享，可作为后续了解入口。",
    };
  }
  return {
    ...base,
    emotion: "平静",
    intent: "回应",
    cue: "中性",
    explanation: "当前只表现出基本回应，单条消息不足以推断更多。",
  };
}

export function buildLocalMessageInsights(
  messages: ChatMessage[],
): MessageInsight[] {
  return messages.slice(0, 120).map((message, index) => ({
    ...labelMessage(
      message,
      messages.slice(Math.max(0, index - 3), index),
      messages.slice(index + 1, index + 4),
    ),
    sender: message.sender,
    timestamp: message.timestamp,
    source: "local-rules",
  }));
}

export function mergeMessageInsights(
  local: MessageInsight[],
  extracted: ExtractedMessageInsight[],
  source: "local-llm" | "browser-local" | "provider",
  messages: ChatMessage[],
): MessageInsight[] {
  const byId = new Map(
    messages.map((message) => [message.id, message] as const),
  );
  const modelById = new Map(
    extracted.map((item) => [item.messageId, item] as const),
  );
  return local.map((fallback) => {
    const model = modelById.get(fallback.messageId);
    const message = byId.get(fallback.messageId);
    if (!model || !message || model.quote !== message.text.trim()) {
      return fallback;
    }
    if (fallback.cue === "风险") {
      return fallback;
    }
    const localIntentIsAuthoritative = [
      "确认计划",
      "邀请",
      "邀约",
      "拒绝",
      "婉拒",
      "分享",
      "安慰",
      "修复",
      "表达不满",
      "表达边界",
      "控制要求",
      "表达想念",
      "调情",
    ].includes(fallback.intent);
    const localCueIsAuthoritative = [
      "靠近",
      "稳定",
      "冲突",
      "修复",
      "边界",
      "风险",
    ].includes(fallback.cue);
    return {
      ...model,
      messageId: message.id,
      quote: compact(message.text),
      sender: message.sender,
      timestamp: message.timestamp,
      source,
      intent: localIntentIsAuthoritative ? fallback.intent : model.intent,
      cue: localCueIsAuthoritative ? fallback.cue : model.cue,
    };
  });
}
