import { DEMO_REPORT, DEMO_SAMPLE, SAMPLE_HISTORY } from "./demo";
import {
  buildMessageOptions,
  buildSafetyMessageOptions,
  calibrateScore,
  confidenceForStats,
  conversationStats,
  decisionFromScore,
  scoreCalibration,
} from "./calibration";
import {
  assessAttachment,
  parseConversation,
  type ParsedConversation,
} from "./conversation";
import { analyzeEmotionFallback } from "./emotion-analysis";
import { emptyKnowledge } from "./knowledge";
import { buildLocalMessageInsights } from "./message-insights";
import type {
  AnalysisInput,
  AnalysisReport,
  EmotionAnalysis,
  EvidenceItem,
  KnowledgeMatch,
  MbtiDimension,
  PersonProfile,
  ProviderId,
  TraitScore,
} from "../types";

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Math.round(value)));

const includesAny = (text: string, words: string[]) =>
  words.some((word) => text.toLowerCase().includes(word.toLowerCase()));

const createId = () =>
  globalThis.crypto?.randomUUID?.() ?? `analysis-${Date.now().toString(36)}`;

const countQuestions = (text: string) => (text.match(/[?？]/g) ?? []).length;

const countWarmSignals = (text: string) =>
  (
    text.match(
      /哈哈哈|哈哈|😂|😊|喜欢你|一起|周末|有空|见面|约|期待|晚安|早安|怎么样|你呢|你也/g,
    ) ?? []
  ).length;

const countColdSignals = (text: string) =>
  (
    text.match(
      /下次吧|不太方便|算了|随便|不想聊|没空|拒绝|别催|不想说/g,
    ) ?? []
  ).length;

const evidenceLineCount = (lines: string[], words: string[]) =>
  lines.filter((line) => includesAny(line, words)).length;

const shortClassLabel: Record<string, string> = {
  acknowledgment: "收到或确认",
  low_energy: "低能量或忙碌",
  topic_closed: "结束当前话题",
  possible_withdrawal: "可能有收缩线索",
  uncertain: "信息不足",
};

interface AxisRule {
  pattern: RegExp;
  weight: number;
  label: string;
}

interface ScoredAxis extends MbtiDimension {
  signalCount: number;
  margin: number;
}

function scoreAxis(lines: string[], rules: AxisRule[]) {
  let score = 0;
  const hits: string[] = [];
  for (const line of lines) {
    for (const rule of rules) {
      if (!rule.pattern.test(line)) continue;
      score += rule.weight;
      hits.push(rule.label);
    }
  }
  return { score, hits };
}

const buildMbti = (
  profile: string,
  chat: string,
  targetMessageCount: number,
): AnalysisReport["person"]["mbti"] => {
  const material = `${profile}\n${chat}`;
  const lines = material
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const averageLength =
    chat.replace(/\s/gu, "").length / Math.max(targetMessageCount, 1);
  const axis = (
    key: MbtiDimension["key"],
    left: string,
    right: string,
    leftRules: AxisRule[],
    rightRules: AxisRule[],
    noteBase: string,
    fallbackRight: boolean,
  ): ScoredAxis => {
    const leftResult = scoreAxis(lines, leftRules);
    const rightResult = scoreAxis(lines, rightRules);
    const total = leftResult.score + rightResult.score;
    const status =
      total >= 4 ? "supported" : total > 0 ? "tentative" : "insufficient";
    const directional =
      total > 0
        ? (rightResult.score - leftResult.score) / Math.max(total, 1)
        : 0;
    const confidenceStrength = Math.min(1, Math.max(0.45, total / 6));
    const score = clamp(
      total > 0
        ? 50 + directional * 34 * confidenceStrength
        : fallbackRight
          ? 56
          : 44,
      18,
      82,
    );
    const selectedLetter = score >= 50 ? right : left;
    const selectedRules = score >= 50 ? rightRules : leftRules;
    const alternativeRules = score >= 50 ? leftRules : rightRules;
    return {
      key,
      left: key === "EI" ? "I" : key === "SN" ? "S" : key === "TF" ? "T" : "J",
      right: key === "EI" ? "E" : key === "SN" ? "N" : key === "TF" ? "F" : "P",
      score,
      leaning:
        total === 0
          ? `暂偏 ${fallbackRight ? right : left}`
          : `${score >= 58 || score <= 42 ? "" : "轻微偏 "}${selectedLetter}`,
      note:
        total === 0
          ? `${noteBase} 没有强线索，暂按当前互动方式给出第一方向。`
          : `${noteBase} 捕捉到 ${selectedRules.length} 组${selectedLetter}线索，另有 ${alternativeRules.length} 组反向线索。`,
      status,
      evidenceIds: [],
      signalCount: Math.round(total),
      margin: Math.abs(score - 50),
    };
  };

  const dimensions = [
    axis(
      "EI",
      "I",
      "E",
      [
        { pattern: /慢热|安静|独处|小范围|深聊|个人空间|需要空间/u, weight: 2, label: "独处或小范围偏好" },
        { pattern: /自己待|不太喜欢.*(?:热闹|连续追问)|人一多|独立/u, weight: 1.5, label: "低刺激偏好" },
        { pattern: /我(?:觉得|想|需要|比较)|内心|反思/u, weight: 0.75, label: "内在反思" },
      ],
      [
        { pattern: /一起|见面|朋友|聚会|热闹|主动|出去玩|大家|我们/u, weight: 2, label: "共同活动" },
        { pattern: /分享|聊聊|认识.*人|叫我|约/u, weight: 1.5, label: "主动互动" },
        { pattern: /哈哈|😂|！|!|期待|兴奋/u, weight: 1, label: "外显情绪" },
      ],
      "依据互动充电与独处偏好的行为线索。",
      averageLength < 38 || targetMessageCount <= 2,
    ),
    axis(
      "SN",
      "S",
      "N",
      [
        { pattern: /具体|安排|时间|地点|几点|周末|当天|工作|店|门口|照片/u, weight: 2, label: "具体细节" },
        { pattern: /上次|以前|经验|事实|步骤|实际|落地/u, weight: 1.25, label: "经验与事实" },
      ],
      [
        { pattern: /感觉|可能|未来|意义|探索|想法|同频|氛围|如果/u, weight: 2, label: "可能性与意义" },
        { pattern: /像|想象|底层|为什么|本质|模式|连接|方向/u, weight: 1.25, label: "抽象联系" },
      ],
      "依据具体经验与概念探索偏好。",
      !/[周一二三四五六日天]|\d{1,2}点|门口|安排|见面/u.test(material),
    ),
    axis(
      "TF",
      "T",
      "F",
      [
        { pattern: /逻辑|效率|方案|原则|确认|因为|所以|数据|成本|规则/u, weight: 2, label: "逻辑与规则" },
        { pattern: /如果.*就|边界|取舍|利弊|解决/u, weight: 1.25, label: "问题解决" },
      ],
      [
        { pattern: /感受|理解|温暖|陪伴|尊重|担心|抱歉|在乎/u, weight: 2, label: "感受与关系影响" },
        { pattern: /失望|难过|谢谢|重要|照顾|舒服/u, weight: 1.25, label: "情绪照顾" },
      ],
      "依据决策时更重视原则还是关系影响。",
      /感受|理解|温暖|陪伴|尊重|担心|抱歉|在乎|谢谢/u.test(
        material,
      ),
    ),
    axis(
      "JP",
      "J",
      "P",
      [
        { pattern: /安排|确定|确认|计划|提前|订了|时间|周[一二三四五六日天]|几点|准时|决定/u, weight: 2, label: "计划与收束" },
        { pattern: /到时候|行程|具体|门口|见面/u, weight: 1, label: "明确安排" },
      ],
      [
        { pattern: /看情况|临时|随缘|再说|不一定|灵活|可能|探索|突然|改天/u, weight: 2, label: "保留选择" },
        { pattern: /到时候|再说|看看|有空再/u, weight: 1, label: "弹性安排" },
      ],
      "依据计划收束与保持开放的自主选择。",
      !/[周一二三四五六日天].{0,16}(?:见|点|门口|可以)|订了|确定|安排/u.test(
        material,
      ),
    ),
  ];
  const totalSignals = dimensions.reduce(
    (sum, dimension) => sum + dimension.signalCount,
    0,
  );
  const candidate =
    totalSignals > 0
      ? dimensions
          .map((dimension) =>
            dimension.score >= 50 ? dimension.right : dimension.left,
          )
          .join("")
      : "待观察";
  const supportedCount = dimensions.filter(
    (dimension) => dimension.status === "supported",
  ).length;
  const confidence =
    totalSignals >= 10 &&
    supportedCount >= 3 &&
    materialLength(material) >= 350
      ? "较高"
      : totalSignals >= 5 || materialLength(material) >= 180
        ? "中"
        : "低";
  const interactionTips: Record<string, string> = {
    E: "通过互动和共同活动建立连接",
    I: "先给空间和思考时间",
    S: "用具体计划和事实沟通",
    N: "先对齐意义和大方向",
    T: "把逻辑、边界和取舍说清楚",
    F: "先回应感受与被重视感",
    J: "尽早明确时间和安排",
    P: "保留选择与临场弹性",
  };
  const alternatives =
    candidate === "待观察"
      ? []
      : dimensions
      .map((dimension, index) => ({
        alternative:
          candidate.slice(0, index) +
          (dimension.score >= 50 ? dimension.left : dimension.right) +
          candidate.slice(index + 1),
        margin: dimension.margin,
      }))
      .sort((a, b) => a.margin - b.margin)
      .map((item) => item.alternative)
      .filter((item, index, list) => list.indexOf(item) === index)
      .slice(0, 3);

  return {
    candidate,
    alternatives,
    confidence,
    summary:
      candidate === "待观察"
        ? "当前材料只有寒暄，没有足够的人格行为线索。补充对方主动发起的话题、冲突反应或具体安排后再判断。"
        : `当前最像 ${candidate} 倾向。${totalSignals >= 5 ? "多个沟通维度有一致方向。" : "样本还不多，但可以先用这个方向理解对方。"}` +
          `互动时优先${candidate
            .split("")
            .map((letter) => interactionTips[letter])
            .filter(Boolean)
            .slice(0, 3)
            .join("；")}。`,
    dimensions: dimensions.map(({ signalCount: _signals, margin: _margin, ...dimension }) => dimension),
  };
};

const materialLength = (text: string) => text.replace(/\s/g, "").length;

const buildBigFive = (text: string): TraitScore[] => {
  const lines = text.split(/\n+/).filter(Boolean);
  const trait = (
    key: string,
    label: string,
    positive: string[],
    negative: string[],
    summaries: [string, string, string],
  ): TraitScore => {
    const positiveCount = evidenceLineCount(lines, positive);
    const negativeCount = evidenceLineCount(lines, negative);
    const signalCount = positiveCount + negativeCount;
    const status =
      signalCount >= 5 ? "supported" : signalCount > 0 ? "tentative" : "insufficient";
    const directionalStrength = Math.min(14, 5 + signalCount * 2);
    const score =
      status === "insufficient"
        ? 50
        : clamp(
            50 + (positiveCount - negativeCount) * directionalStrength,
            28,
            72,
          );
    return {
      key,
      label,
      score,
      status,
      evidenceIds: [],
      summary:
        status === "insufficient"
          ? "这条线索较少，当前先按中性显示。"
          : score >= 58
            ? summaries[0]
            : score <= 42
              ? summaries[1]
              : summaries[2],
    };
  };
  return [
    trait(
      "openness",
      "开放性",
      ["摄影", "胶片", "艺术", "看展", "爵士", "音乐", "旅行", "探索", "新体验", "爬山"],
      ["熟悉", "稳定", "习惯", "保守", "传统"],
      [
        "材料里多次出现艺术、探索或新体验线索。",
        "目前更偏向熟悉、可预测的活动和节奏。",
        "对新体验有兴趣，但探索强度尚不稳定。",
      ],
    ),
    trait(
      "conscientiousness",
      "尽责性",
      ["计划", "安排", "时间", "工作", "确认", "周四", "周末"],
      ["临时", "随缘", "看心情", "再说", "拖延"],
      [
        "表达中能看到计划、确认和行动推进。",
        "更偏临场安排，计划细节尚不明显。",
        "有一定计划意识，同时保留灵活空间。",
      ],
    ),
    trait(
      "extraversion",
      "外向性",
      ["一起", "朋友", "聚会", "主动", "哈哈", "见面", "有空"],
      ["慢热", "安静", "独处", "小范围", "不想聊"],
      [
        "愿意主动追问，也能承接社交能量。",
        "更偏慢热或小范围交流。",
        "愿意互动，但社交能量更偏中等或情境化。",
      ],
    ),
    trait(
      "agreeableness",
      "宜人性",
      ["谢谢", "理解", "尊重", "没关系", "你呢", "不妨", "可以"],
      ["贬低", "嘲讽", "命令", "必须", "不耐烦"],
      [
        "会照顾对方感受，并给互动留下空间。",
        "材料中协作与照顾线索较少，需要更多样本。",
        "表达有基本协作感，但边界与冲突场景仍未知。",
      ],
    ),
    trait(
      "neuroticism",
      "情绪敏感度",
      ["焦虑", "担心", "害怕", "忽冷忽热", "内耗", "不安"],
      ["稳定", "松弛", "不着急", "没关系", "放心"],
      [
        "材料中出现较多担心、内耗或关系不安线索。",
        "当前情绪表达较稳定，没有明显波动线索。",
        "存在一些敏感线索，但不足以判断稳定倾向。",
      ],
    ),
  ];
};

const buildPerson = (
  profile: string,
  kind: "self" | "other",
  parsed: ParsedConversation,
): PersonProfile => {
  const ownMessages = parsed.messages.filter(
    (message) => message.sender === kind,
  );
  const ownChat = ownMessages.map((message) => message.text).join("\n");
  const text = `${profile}\n${ownChat}`;
  const mbti = buildMbti(profile, ownChat, ownMessages.length);
  const bigFive = buildBigFive(text);
  const strongestTrait = [...bigFive].sort(
    (a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50),
  )[0];
  const introvertHint = includesAny(profile, ["慢热", "安静", "独处", "小范围"]);
  const attachmentAssessment = assessAttachment(
    parsed.messages,
    parsed.shortReplies,
    kind,
  );
  return {
    summary: `${mbti.candidate} 倾向下，这类沟通者更可能${
      mbti.candidate.includes("I") ? "先观察再靠近" : "通过互动建立连接"
    }，${mbti.candidate.includes("J") ? "偏好明确安排" : "需要保留一定弹性"}。${
      strongestTrait && Math.abs(strongestTrait.score - 50) >= 6
        ? `大五中最明显的是${strongestTrait.label}（${strongestTrait.score}）：${strongestTrait.summary}`
        : "大五维度目前更接近中间区间。"
    }`,
    mbti,
    bigFive,
    interaction: {
      attachment: attachmentAssessment.summary,
      conflict: includesAny(text, ["解释", "沟通", "冷静", "理解"])
        ? "更可能在冲突时先解释与修复，但仍需真实压力场景验证。"
        : "冲突处理方式没有足够证据，建议观察对方遇到分歧时是否仍尊重边界。",
      pace: includesAny(text, ["周末", "时间", "安排", "确定"])
        ? "表达里有一定计划意识，也保留了确认空间。"
        : "节奏更偏随性，具体投入程度需要用行动验证。",
      energy: introvertHint ? "更偏低刺激、小范围、有内容的互动。" : "愿意互动，也能从共同活动中获得连接感。",
      humor: includesAny(text, ["哈哈", "😂", "丑", "梗", "笑"])
        ? "会用轻盈或自嘲式幽默降低互动压力。"
        : "表达较直接，幽默线索暂不明显。",
    },
    values: [
      ...(includesAny(text, ["一起", "共同", "陪"]) ? ["共同体验"] : []),
      ...(includesAny(text, ["空间", "边界", "自己"]) ? ["自主空间"] : []),
      ...(includesAny(text, ["认真", "稳定", "长期"]) ? ["稳定投入"] : []),
      "真实表达",
    ].slice(0, 4),
    needs: ["被认真回应", "可验证的行动", "不被催促的节奏"],
    boundaries: ["需要自己的时间安排", "不喜欢高压式追问"],
    greenFlags: [
      ...(countQuestions(text) >= 2 ? ["会主动追问"] : []),
      ...(includesAny(text, ["一起", "见面", "周末"]) ? ["能把话题推进到行动"] : []),
      ...(includesAny(text, ["看情况", "安排", "确认"]) ? ["会说明自己的边界"] : []),
      "表达具体",
    ].slice(0, 4),
    watchouts: ["目前样本有限", "友善和浪漫兴趣需要分开验证"],
    attachmentAssessment,
  };
};

const buildEvidence = (
  parsed: ParsedConversation,
  otherProfile: string,
): EvidenceItem[] => {
  const otherMessages = parsed.messages.filter(
    (message) => message.sender === "other",
  );
  const priority = (message: (typeof otherMessages)[number]) => {
    if (message.kind === "conflict" || message.kind === "repair") return 6;
    if (message.kind === "plan") return 5;
    if (message.kind === "question") return 4;
    if (message.kind === "support") return 3;
    if (message.short) return 1;
    return 2;
  };
  const selectedIds = new Set<string>();
  for (const session of parsed.sessions) {
    const candidates = otherMessages.filter(
      (message) => message.sessionId === session.id,
    );
    const best = [...candidates].sort((a, b) => priority(b) - priority(a))[0];
    if (best) selectedIds.add(best.id);
  }
  const fractions = [0, 0.2, 0.4, 0.6, 0.8, 1];
  for (const fraction of fractions) {
    if (selectedIds.size >= 7) break;
    const index = Math.round((otherMessages.length - 1) * fraction);
    const message = otherMessages[index];
    if (message) selectedIds.add(message.id);
  }
  const selected = otherMessages.filter((message) => selectedIds.has(message.id)).slice(0, 7);
  const evidence: EvidenceItem[] = selected.map((message) => {
    const line = message.text;
    const shortInsight = parsed.shortReplies.find(
      (item) => item.messageId === message.id,
    );
    const conflict = /失望|抱歉|没说清|憋着|怕猜|不舒服|不开心/.test(line);
    const boundary =
      /提前|回慢|低电量|不想细说|安静|不催|空间|需要/.test(line);
    const interest =
      /想见你|成交|见面|有空|周末|周日|验收/.test(line);
    const question = /[?？]/.test(line) || /你呢|你也|喜欢吗/.test(line);
    return {
      id: message.id,
      source: "聊天",
      quote: line,
      observation: shortInsight
        ? `这条短回复在前后语境中更接近“${shortClassLabel[shortInsight.classification] ?? shortInsight.classification}”，并${shortInsight.afterEffect === "recovered" ? "随后恢复了有效交流" : shortInsight.afterEffect === "no_recovery" ? "暂未看到恢复" : "缺少后续信息"}。`
        : conflict
        ? "对方直接回应了失望或误解，并解释了自己的表达问题。"
        : boundary
          ? "对方说明了回应节奏或空间需求，并给出可执行约定。"
          : interest
            ? "对方把互动推进到具体时间、见面或共同活动。"
            : question
              ? "对方主动把话题递回给你，并继续了解你的兴趣。"
              : "对方提供了具体信息或行动线索，而非只作礼貌回应。",
      inference: shortInsight
        ? shortInsight.explanation
        : conflict
        ? "双方具备澄清和修复互动的意愿，而非回避冲突。"
        : boundary
          ? "存在协商边界的意愿，关系可持续性线索较强。"
          : interest
            ? "存在继续投入并落到行动的意愿。"
            : "当前有继续交流的兴趣，但投入程度仍需观察。",
      confidence: shortInsight
        ? shortInsight.confidence
        : conflict || boundary
          ? "较高"
          : "中",
      caution: shortInsight
        ? "短回复必须结合个人基线、时间间隔和后续恢复，不能单独证明冷淡或依恋模式。"
        : conflict
        ? "单次修复不能保证以后一致，仍需观察同类场景。"
        : boundary
          ? "边界是否稳定执行，要看后续是否言行一致。"
          : "单条消息可能受上下文、情绪和沟通习惯影响，不能单独作为结论。",
      status: "confirmed",
      evidenceIds: [message.id],
    };
  });

  if (otherProfile.trim()) {
    evidence.push({
      id: "profile-evidence",
      source: "主页",
      quote: otherProfile.trim(),
      observation: "主页呈现了 Ta 主动选择的自我描述与兴趣方向。",
      inference: "可以作为破冰和互相了解的线索，但不等同于稳定人格。",
      confidence: "低",
      caution: "主页是经过编辑的自我呈现，适合用来找话题，不适合单独下判断。",
      status: "tentative",
      evidenceIds: ["profile-evidence"],
    });
  }
  return evidence.slice(0, 8);
};

function buildContextGaps(
  parsed: ParsedConversation,
  person: PersonProfile,
  emotion: EmotionAnalysis,
): AnalysisReport["contextGaps"] {
  const gaps: AnalysisReport["contextGaps"] = [];
  if (parsed.timestampCoverage < 0.2) {
    gaps.push({
      question: "对方平时的回复间隔大概是多少？出现短回复时，间隔是否明显变化？",
      why: "时间变化比单条短回复更能说明收缩、忙碌还是普通习惯。",
      priority: 1,
    });
  }
  if (parsed.shortReplies.length > 0) {
    gaps.push({
      question: "对方平时也常用“嗯、哦、好”吗？这些短回复之后通常会重新开启话题吗？",
      why: "需要个人基线，才能区分表达习惯与关系变化。",
      priority: 2,
    });
  }
  if (
    !parsed.messages.some((message) => message.kind === "conflict") ||
    !parsed.messages.some((message) => message.kind === "repair")
  ) {
    gaps.push({
      question: "你们出现分歧或拒绝后，对方通常会解释、修复，还是直接拉开距离？",
      why: "依恋相关互动线索必须依赖冲突和修复场景，不能只靠轻松聊天。",
      priority: 3,
    });
  }
  if (parsed.sessions.length < 2) {
    gaps.push({
      question: "这段互动在不同日期或不同状态下是否保持一致？",
      why: "单一会话无法区分稳定模式和短期状态。",
      priority: 4,
    });
  }
  for (const cue of person.attachmentAssessment.cues) {
    if (cue.status === "insufficient" && gaps.length < 5) {
      const missing = cue.missingInformation[0] ?? "更多不同情境的互动";
      gaps.push({
        question: missing.includes("基线")
          ? "对方平时回复的长度和间隔大概是什么样？"
          : missing.includes("时间间隔")
            ? "出现短回复或慢回复前后，间隔了多长时间？"
            : missing.includes("冲突")
              ? "你们出现分歧后，对方通常会解释、修复还是拉开距离？"
              : `还需要补充哪些“${missing}”的具体例子？`,
        why: cue.summary,
        priority: 5,
      });
    }
  }
  for (const missing of emotion.quickRead.missingInformation) {
    const question = missing.includes("时间")
      ? "这段对话中间隔了多久？短回复或慢回复前后，时间间隔有没有明显变化？"
      : missing.includes("关系阶段") || missing.includes("前后")
        ? "你们目前是什么关系阶段？这段对话之前发生过什么？"
        : missing.includes("分歧") || missing.includes("拒绝")
          ? "你们出现分歧或拒绝时，对方通常会解释、修复还是直接拉开距离？"
          : missing.includes("玩笑") || missing.includes("暧昧")
            ? "这些亲密表达是玩笑、暧昧，还是你们已经明确过的关系语言？"
            : `能否补充“${missing}”的相关例子？`;
    gaps.push({
      question,
      why: "这类信息会直接改变情感与亲密关系信号的解释。",
      priority: 2,
    });
  }
  const seen = new Set<string>();
  const gapCategory = (question: string) =>
    question.includes("回复")
      ? "reply-baseline"
      : question.includes("冲突") || question.includes("分歧")
        ? "conflict-repair"
        : question.includes("日期") || question.includes("时间")
          ? "time-context"
          : question;
  return gaps
    .sort((a, b) => a.priority - b.priority)
    .filter((gap) => {
      const category = gapCategory(gap.question);
      if (seen.has(category)) return false;
      seen.add(category);
      return true;
    })
    .slice(0, 5);
}

function buildHumanRead(
  parsed: ParsedConversation,
  person: PersonProfile,
  interestScore: number,
  emotion: EmotionAnalysis,
  knowledge: KnowledgeMatch,
): AnalysisReport["humanRead"] {
  const withdrawal = emotion.intimacySignals.some(
    (signal) => signal.key === "withdrawal",
  );
  const recovery = parsed.shortReplies.some(
    (item) => item.afterEffect === "recovered",
  );
  const canConfirm =
    parsed.planState.status === "confirmed"
      ? parsed.planState.summary
      : parsed.planState.status === "cancelled"
        ? "能确认最近的计划被取消或改期，不能把之前的热情当成当前确认。"
        : "能确认双方有过真实互动，但目前没有足够材料证明稳定人格或依恋模式。";
  const likely = `${emotion.quickRead.headline} ${emotion.quickRead.observation}`;
  const baseAlternatives =
    withdrawal && recovery
      ? "短回复更像当时的低能量或忙碌状态；随后恢复交流，不能直接解释成冷淡或回避。"
      : person.attachmentAssessment.summary;
  const reference = knowledge.relatedCases[0];
  const alternatives = reference
    ? `${baseAlternatives} 相似情境里常见的模式是“${reference.pattern}”，但这只能用于扩展解释，不能当作对方的证据。`
    : baseAlternatives;
  const observeNext = reference
    ? `${emotion.quickRead.suggestion} 同时验证：${reference.takeaway}`
    : emotion.quickRead.suggestion;
  return {
    canConfirm,
    likely,
    alternatives,
    observeNext,
    supportNote:
      reference
        ? "相似案例只用于提示可能的情境模式，不会替代这段关系里的原话和后续行动。"
        : interestScore < 50
          ? "即使材料不足，也不要只靠猜。先使用低压力回应，并补充最能改变判断的上下文。"
          : "这份分析不替你判断关系值不值得，只帮助你把猜测变成可观察、可验证的信号。",
  };
}

export function buildLocalAnalysis(
  input: AnalysisInput,
  provider: ProviderId = "demo",
  emotionOverride?: EmotionAnalysis,
  knowledgeOverride?: KnowledgeMatch,
): AnalysisReport {
  const emotion = emotionOverride ?? analyzeEmotionFallback(input);
  const knowledge = knowledgeOverride ?? emptyKnowledge();
  const relationshipLabel =
    input.relationshipLabel.trim().slice(0, 40) || "未命名关系";
  const parsed = parseConversation(input.chat);
  const messageInsights = buildLocalMessageInsights(parsed.messages);
  const isDemo = input.chat.trim() === DEMO_SAMPLE.chat.trim() && input.otherProfile.trim() === DEMO_SAMPLE.otherProfile.trim();
  if (isDemo) {
    return {
      ...DEMO_REPORT,
      id: createId(),
      createdAt: new Date().toISOString(),
      relationshipLabel,
      provider,
      stage: input.relationshipStage,
      emotion,
      knowledge: knowledgeOverride ?? DEMO_REPORT.knowledge,
      messageInsights,
    };
  }

  const text = `${input.selfProfile}\n${input.otherProfile}\n${input.chat}`;
  const questions = countQuestions(input.chat);
  const warm = countWarmSignals(input.chat);
  const cold = countColdSignals(input.chat);
  const initiative = (input.chat.match(/^我[:：]/gm) ?? []).length;
  const otherTurns = (input.chat.match(/^对方[:：]/gm) ?? []).length;
  const evidence = buildEvidence(parsed, input.otherProfile);
  const stats = conversationStats(input);
  const confidence = confidenceForStats(stats);
  const calibration = scoreCalibration(input, confidence);
  const controlRisk = emotion.intimacySignals.some(
    (signal) => signal.key === "control",
  );
  const hasCloseness = emotion.intimacySignals.some(
    (signal) => signal.key === "closeness" || signal.key === "flirtation",
  );
  const hasRepair = emotion.intimacySignals.some(
    (signal) => signal.key === "repair",
  );
  const confirmedPlan =
    parsed.planState.status === "confirmed" && otherTurns >= 2;
  const planBonus = confirmedPlan
    ? 10
    : parsed.planState.status === "proposed"
      ? 3
      : 0;
  const repairBonus = hasRepair ? Math.min(8, stats.repairSignals * 3) : 0;
  const closenessBonus = hasCloseness ? 5 : 0;
  const rawCompatibility = clamp(
    48 +
      questions * 3 +
      warm * 4 -
      cold * 6 +
      Math.min(otherTurns, 5) * 2 +
      planBonus +
      repairBonus +
      closenessBonus,
  );
  const rawInterest = clamp(
    42 +
      questions * 5 +
      warm * 6 -
      cold * 8 +
      Math.min(otherTurns, 6) * 3 +
      planBonus +
      repairBonus +
      closenessBonus,
  );
  const compatibilitySubscore = calibrateScore(rawCompatibility, calibration);
  const rawInterestScore = calibrateScore(rawInterest, calibration);
  const rawOverallScore = calibrateScore(
    compatibilitySubscore * 0.58 + rawInterestScore * 0.42,
    calibration,
  );
  const interestScore = controlRisk
    ? Math.min(rawInterestScore, 28)
    : rawInterestScore;
  const overallScore = controlRisk
    ? Math.min(rawOverallScore, 32)
    : rawOverallScore;
  const decision = controlRisk ? "暂缓推进" : decisionFromScore(overallScore);
  const person = buildPerson(
    input.otherProfile,
    "other",
    parsed,
  );
  const self = buildPerson(
    input.selfProfile,
    "self",
    parsed,
  );
  const coldRisk = cold > warm;
  const messageOptions = controlRisk
    ? buildSafetyMessageOptions()
    : buildMessageOptions(input, interestScore);
  const nextMessage = messageOptions[0].text;
  const humanRead = buildHumanRead(
    parsed,
    person,
    interestScore,
    emotion,
    knowledge,
  );
  const contextGaps = buildContextGaps(parsed, person, emotion);
  const conversationMoves = controlRisk
    ? [
        "先暂停推进，不用继续证明信任或服从。",
        "直接说明你不能接受的隐私和社交限制。",
        "观察对方在你拒绝后，是尊重边界还是升级施压。",
      ]
    : [
        "把兴趣从抽象好感转成一个双方都容易完成的小活动。",
        "每推进一次，只观察对方是否同等地向前一步。",
        "保留退出空间，避免用自我暴露换取对方回应。",
      ];
  const stopSigns = controlRisk
    ? [
        "用爱、吃醋或安全感要求你交出隐私。",
        "在你拒绝后继续施压、羞辱或惩罚你。",
        "限制你与朋友家人的正常联系。",
      ]
    : [
        "长期只在你主动时回复。",
        "持续制造忽冷忽热却不解释。",
        "贬低你的兴趣、边界或感受。",
      ];

  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    relationshipLabel,
    provider,
    stage: input.relationshipStage,
    decision,
    overallTitle: controlRisk
      ? "先处理控制与边界风险，不建议继续加码"
      : decision === "继续推进"
        ? "兴趣与互动质量都支持继续推进"
        : decision === "适度推进"
          ? "可以用一次小行动验证关系温度"
          : decision === "先观察"
            ? "信号还不够稳定，先保留判断"
            : "当前不建议增加投入",
    overallSummary: controlRisk
      ? "聊天里出现了隐私限制、查手机或切断社交等控制性要求。当前最重要的不是判断好感度，而是确认你的拒绝能否被尊重；在此之前不建议增加投入。"
      : coldRisk
      ? "聊天里出现了更多收缩性表达，兴趣信号并不稳定。此时继续加码容易放大试探和消耗，更适合先降低频率，观察对方是否主动补位。"
      : initiative > 0 && otherTurns > 0
        ? "双方都参与了话题推进，但对方是否有稳定投入仍需要行动验证。建议把判断标准从语气转向对方是否愿意共同确定一次具体安排。"
        : "当前材料能提供一些沟通偏好线索，但不足以形成稳定人格判断。更适合先用轻松话题收集更多样本，而不是过早给关系定性。",
    confidence,
    compatibilityScore: overallScore,
    calibration,
    emotion,
    knowledge,
    messageInsights,
    humanRead,
    contextGaps,
    shortReplies: parsed.shortReplies,
    pipeline: {
      version: "letsdate-pipeline-v2",
      stages: [
        "解析消息与会话",
        "建立事实证据账本",
        "识别计划状态",
        "分析短回复与后续恢复",
        "评估依恋相关互动线索",
        ...(knowledge.caseCount > 0 ? ["检索匿名情境参考"] : []),
        "生成关系判断与行动建议",
      ],
      messageCount: parsed.messages.length,
      sessionCount: parsed.sessions.length,
      timestampCoverage: Number(parsed.timestampCoverage.toFixed(2)),
      localRuleMode: provider === "demo",
      exactQuoteVerification: true,
    },
    person,
    self,
    compatibility: {
      score: overallScore,
      label: controlRisk
        ? "安全边界优先"
        : overallScore >= 75
          ? "互动顺畅，可继续验证"
          : overallScore >= 60
            ? "有连接点，需要对齐节奏"
            : "差异较明显，先观察",
      summary: controlRisk
        ? "当前最关键的匹配维度不是兴趣，而是对方能否尊重隐私、社交自由和明确拒绝。控制性要求会显著降低安全互动质量。"
        : "匹配度来自双方表达、主动性和话题承接质量的组合估计，不代表关系结果预测。最能说明问题的，仍是双方在真实安排中的一致性。",
      dimensions: [
        {
          key: "communication",
          label: "沟通承接",
          score: calibrateScore(clamp(52 + questions * 4 + warm * 3), calibration),
          summary: questions > 2 ? "双方有较多追问与回应。" : "目前更多是单线叙述，追问还可以增加。",
        },
        {
          key: "pace",
          label: "推进节奏",
          score: calibrateScore(
            clamp(
              54 +
                warm * 2 +
                stats.repairSignals * 3 +
                stats.boundarySignals * 2 -
                cold * 7,
            ),
            calibration,
          ),
          summary:
            cold > 2
              ? "推进节奏存在拉扯，需要减少连续加码。"
              : stats.repairSignals >= 2
                ? "双方能说明节奏并修复误解，当前推进压力较低。"
                : "当前节奏没有明显压迫感。",
        },
        {
          key: "expression",
          label: "表达方式",
          score: calibrateScore(
            clamp(54 + (includesAny(text, ["哈哈", "😂", "喜欢", "感觉"]) ? 12 : 0)),
            calibration,
          ),
          summary: "你们都在用较具体的方式表达兴趣，但强度不完全一致。",
        },
        {
          key: "boundaries",
          label: "边界尊重",
          score: controlRisk
            ? 18
            : calibrateScore(
                clamp(
                  58 +
                    (includesAny(text, ["空间", "时间", "方便", "安排"])
                      ? 8
                      : -5) +
                    stats.boundarySignals * 2 +
                    stats.repairSignals * 2,
                ),
                calibration,
              ),
          summary: controlRisk
            ? "出现了查手机、定位或限制社交的要求，边界尊重不足。"
            : stats.boundarySignals >= 2
              ? "双方能提前说明时间、空间与回应节奏，边界协商较清晰。"
              : "材料里能看到对时间和个人安排的提及，是积极信号。",
        },
        {
          key: "values",
          label: "价值线索",
          score: calibrateScore(
            clamp(52 + (includesAny(text, ["艺术", "运动", "旅行", "生活", "摄影", "做饭"]) ? 12 : 0)),
            calibration,
          ),
          summary: "共同兴趣可以提供入口，长期匹配仍需要更多场景验证。",
        },
      ],
    },
    interest: {
      score: interestScore,
      confidence: confidenceForStats(stats),
      verdict:
        controlRisk
          ? "目前不应把兴趣信号放在安全边界之前。"
          : interestScore >= 70
          ? "有值得验证的积极兴趣信号。"
          : interestScore >= 50
            ? "兴趣存在，但投入稳定性尚未确认。"
            : "当前兴趣信号偏弱，不建议继续加码。",
      signals: controlRisk
        ? ["出现了控制、定位或限制社交的要求"]
        : (() => {
            const unique = [
              ...new Set(
                evidence
                  .filter((item) =>
                    /主动|推进|回应/.test(
                      item.inference + item.observation,
                    ),
                  )
                  .map((item) => item.observation),
              ),
            ].slice(0, 3);
            return unique.length ? unique : ["对方有基本回应"];
          })(),
      ambiguities: [
        controlRisk
          ? "对方是否会尊重明确拒绝，比任何浪漫表达都更关键。"
          : "友好回应不等于浪漫兴趣。",
        controlRisk
          ? "若拒绝后遭遇威胁、羞辱或持续施压，应优先拉开距离并寻求现实支持。"
          : "真正的投入程度要看对方是否愿意共同确定下一次互动。",
      ],
    },
    action: {
      decision,
      rationale: controlRisk
        ? "控制性要求不能被解释成关心或爱的证明。先用一句清楚的话确认边界，再观察对方能否尊重拒绝。"
        : decision === "暂缓推进"
          ? "当前投入与回应不对等，继续增加主动可能强化消耗。"
          : "用一次低压力、可撤回的具体行动验证关系温度，比反复解读语气更有效。",
      nextMessage,
      messageOptions,
      ifWarm: controlRisk
        ? "如果对方能收回要求、道歉并停止施压，可以继续观察，但仍需看到稳定行动，而不是只听保证。"
        : "对方给出具体时间或主动提出替代安排时，直接确认地点、时长和交通，不需要继续试探。",
      ifCold: controlRisk
        ? "如果对方用冷暴力、羞辱或“你不爱我就……”回应你的拒绝，停止解释和自证，优先拉开距离。"
        : "如果对方继续模糊、超过约定时间不回应或只给礼貌短句，停止追加邀约，把主动权交还给对方。",
      conversationMoves,
      stopSigns,
    },
    evidence,
    uncertainties: [
      "当前人格判断来自有限文本，置信度应随材料增加而更新。",
      "MBTI 不是临床诊断，也不能替代真实相处。",
      input.chat.length < 160
        ? "聊天样本较短，兴趣和互动判断可能明显偏差。"
        : parsed.timestampCoverage > 0
          ? "已使用现有时间戳估计回复间隔，但仍缺少语音、语气和线下互动信息。"
          : "缺少回复时间间隔、语音和线下互动信息。",
    ],
    safetyNotes: [
      "不要把推断当作事实，更不要用画像结果操控或试探对方。",
      "上传前请删除真实姓名、电话、住址、账号等可识别信息。",
      ...(controlRisk
        ? ["查手机、持续定位、强制报备和切断社交属于高风险控制信号，不应被浪漫化。"]
        : []),
      "如果关系持续带来自我怀疑、恐惧或边界侵蚀，请优先寻求现实支持。",
    ],
  };
}

export function getDemoHistory() {
  return SAMPLE_HISTORY;
}
