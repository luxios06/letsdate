import { DEMO_REPORT, DEMO_SAMPLE, SAMPLE_HISTORY } from "./demo";
import {
  buildMessageOptions,
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

const hash = (text: string) =>
  [...text].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 2166136261);

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

const buildMbti = (
  profile: string,
  chat: string,
  seed: number,
): AnalysisReport["person"]["mbti"] => {
  const lines = `${profile}\n${chat}`
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const axis = (
    key: MbtiDimension["key"],
    left: string,
    right: string,
    leftWords: string[],
    rightWords: string[],
    noteBase: string,
  ): MbtiDimension => {
    const leftCount = evidenceLineCount(lines, leftWords);
    const rightCount = evidenceLineCount(lines, rightWords);
    const total = leftCount + rightCount;
    const status =
      total >= 4 ? "supported" : total >= 2 ? "tentative" : "insufficient";
    const jitter = ((seed >> key.length) % 5) - 2;
    const score =
      status === "insufficient"
        ? 50
        : clamp(50 + (rightCount - leftCount) * 11 + jitter, 24, 76);
    return {
      key,
      left,
      right,
      score,
      leaning:
        status === "insufficient"
          ? "证据不足"
          : `${score >= 50 ? right : left} 倾向`,
      note:
        status === "insufficient"
          ? `${noteBase} 当前不足两条独立线索。`
          : `${noteBase} 当前有 ${total} 条相关文本线索，仍需真实场景验证。`,
      status,
      evidenceIds: [],
    };
  };

  const dimensions = [
    axis(
      "EI",
      "I",
      "E",
      ["独处", "安静", "慢热", "小范围", "不太喜欢连续追问"],
      ["一起", "主动", "朋友", "聚会", "见面", "有空"],
      "依据互动充电与独处偏好的行为线索。",
    ),
    axis(
      "SN",
      "S",
      "N",
      ["具体", "安排", "事实", "小店", "工作", "当天"],
      ["感觉", "可能", "未来", "意义", "探索", "同频", "想法"],
      "依据具体经验与概念探索偏好。",
    ),
    axis(
      "TF",
      "T",
      "F",
      ["逻辑", "效率", "方案", "确认", "原则"],
      ["感受", "理解", "喜欢", "温暖", "陪伴", "尊重"],
      "依据决策时更重视原则还是关系影响。",
    ),
    axis(
      "JP",
      "J",
      "P",
      ["安排", "确定", "确认", "时间", "周四", "周末"],
      ["看心情", "临时", "随缘", "再说", "不一定", "探索"],
      "依据计划收束与保持开放的自主选择。",
    ),
  ];
  const usable = dimensions.filter(
    (dimension) => dimension.status !== "insufficient",
  );
  const supported = dimensions.filter(
    (dimension) => dimension.status === "supported",
  );
  const otherTurns = (chat.match(/^对方[:：]/gm) ?? []).length;
  const enoughForCandidate =
    (otherTurns >= 10 && usable.length >= 3) ||
    (otherTurns >= 6 && usable.length === 4 && supported.length >= 2);
  const candidate =
    enoughForCandidate
      ? dimensions
          .map((dimension) =>
            dimension.status === "insufficient"
              ? ""
              : dimension.score >= 50
                ? dimension.right
                : dimension.left,
          )
          .join("")
      : "待观察";
  const alternatives =
    candidate === "待观察"
      ? []
      : [
          candidate.replace("E", "I"),
          candidate.replace("N", "S"),
          candidate.replace("F", "T"),
          candidate.replace("J", "P"),
        ].filter(
          (item, index, list) =>
            item !== candidate && list.indexOf(item) === index,
        );

  return {
    candidate,
    alternatives,
    confidence:
      enoughForCandidate && materialLength(`${profile}\n${chat}`) > 420
        ? "中"
        : "低",
    dimensions,
  };
};

const materialLength = (text: string) => text.replace(/\s/g, "").length;

const buildBigFive = (text: string, seed: number): TraitScore[] => {
  const lines = text.split(/\n+/).filter(Boolean);
  const trait = (
    key: string,
    label: string,
    positive: string[],
    negative: string[],
    summaries: [string, string, string],
    shift: number,
  ): TraitScore => {
    const positiveCount = evidenceLineCount(lines, positive);
    const negativeCount = evidenceLineCount(lines, negative);
    const signalCount = positiveCount + negativeCount;
    const status =
      signalCount >= 4 ? "supported" : signalCount >= 2 ? "tentative" : "insufficient";
    const score =
      status === "insufficient"
        ? 50
        : clamp(
            50 + (positiveCount - negativeCount) * 8 + ((seed >> shift) % 7) - 3,
            24,
            84,
          );
    return {
      key,
      label,
      score,
      status,
      evidenceIds: [],
      summary:
        status === "insufficient"
          ? "材料不足以稳定判断，当前只保留为待验证假设。"
          : score >= 64
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
      1,
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
      3,
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
      5,
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
      7,
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
      9,
    ),
  ];
};

const buildPerson = (
  profile: string,
  chat: string,
  seed: number,
  kind: "self" | "other",
  parsed: ParsedConversation,
): PersonProfile => {
  const text = `${profile}\n${chat}`;
  const introvertHint = includesAny(profile, ["慢热", "安静", "独处", "小范围"]);
  const attachmentAssessment = assessAttachment(
    parsed.messages,
    parsed.shortReplies,
    kind,
  );
  return {
    summary:
      kind === "other"
        ? "材料显示 Ta 愿意分享、追问，并会主动把兴趣落到共同活动。整体更像在熟悉后逐步打开的体验型沟通者。"
        : "你的表达相对稳定，会给出具体回应，也重视关系里的确定感和舒适度。",
    mbti: buildMbti(profile, chat, seed),
    bigFive: buildBigFive(text, seed),
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
  const isDemo = input.chat.trim() === DEMO_SAMPLE.chat.trim() && input.otherProfile.trim() === DEMO_SAMPLE.otherProfile.trim();
  if (isDemo) {
    return {
      ...DEMO_REPORT,
      id: createId(),
      createdAt: new Date().toISOString(),
      provider,
      stage: input.relationshipStage,
      emotion,
      knowledge: knowledgeOverride ?? DEMO_REPORT.knowledge,
    };
  }

  const parsed = parseConversation(input.chat);
  const text = `${input.selfProfile}\n${input.otherProfile}\n${input.chat}`;
  const seed = hash(text);
  const questions = countQuestions(input.chat);
  const warm = countWarmSignals(input.chat);
  const cold = countColdSignals(input.chat);
  const initiative = (input.chat.match(/^我[:：]/gm) ?? []).length;
  const otherTurns = (input.chat.match(/^对方[:：]/gm) ?? []).length;
  const evidence = buildEvidence(parsed, input.otherProfile);
  const stats = conversationStats(input);
  const confidence = confidenceForStats(stats);
  const calibration = scoreCalibration(input, confidence);
  const rawCompatibility = clamp(
    48 + questions * 3 + warm * 4 - cold * 6 + Math.min(otherTurns, 5) * 2,
  );
  const rawInterest = clamp(
    42 + questions * 5 + warm * 6 - cold * 8 + Math.min(otherTurns, 6) * 3,
  );
  const compatibilitySubscore = calibrateScore(rawCompatibility, calibration);
  const interestScore = calibrateScore(rawInterest, calibration);
  const overallScore = calibrateScore(
    compatibilitySubscore * 0.58 + interestScore * 0.42,
    calibration,
  );
  const decision = decisionFromScore(overallScore);
  const person = buildPerson(
    input.otherProfile,
    input.chat,
    seed,
    "other",
    parsed,
  );
  const self = buildPerson(
    input.selfProfile,
    input.chat,
    seed + 13,
    "self",
    parsed,
  );
  const coldRisk = cold > warm;
  const messageOptions = buildMessageOptions(input, interestScore);
  const nextMessage = messageOptions[0].text;
  const humanRead = buildHumanRead(
    parsed,
    person,
    interestScore,
    emotion,
    knowledge,
  );
  const contextGaps = buildContextGaps(parsed, person, emotion);

  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    provider,
    stage: input.relationshipStage,
    decision,
    overallTitle:
      decision === "继续推进"
        ? "兴趣与互动质量都支持继续推进"
        : decision === "适度推进"
          ? "可以用一次小行动验证关系温度"
          : decision === "先观察"
            ? "信号还不够稳定，先保留判断"
            : "当前不建议增加投入",
    overallSummary: coldRisk
      ? "聊天里出现了更多收缩性表达，兴趣信号并不稳定。此时继续加码容易放大试探和消耗，更适合先降低频率，观察对方是否主动补位。"
      : initiative > 0 && otherTurns > 0
        ? "双方都参与了话题推进，但对方是否有稳定投入仍需要行动验证。建议把判断标准从语气转向对方是否愿意共同确定一次具体安排。"
        : "当前材料能提供一些沟通偏好线索，但不足以形成稳定人格判断。更适合先用轻松话题收集更多样本，而不是过早给关系定性。",
    confidence,
    compatibilityScore: overallScore,
    calibration,
    emotion,
    knowledge,
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
      label:
        overallScore >= 75
          ? "互动顺畅，可继续验证"
          : overallScore >= 60
            ? "有连接点，需要对齐节奏"
            : "差异较明显，先观察",
      summary:
        "匹配度来自双方表达、主动性和话题承接质量的组合估计，不代表关系结果预测。最能说明问题的，仍是双方在真实安排中的一致性。",
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
          score: calibrateScore(
            clamp(
              58 +
                (includesAny(text, ["空间", "时间", "方便", "安排"]) ? 8 : -5) +
                stats.boundarySignals * 2 +
                stats.repairSignals * 2,
            ),
            calibration,
          ),
          summary:
            stats.boundarySignals >= 2
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
        interestScore >= 70
          ? "有值得验证的积极兴趣信号。"
          : interestScore >= 50
            ? "兴趣存在，但投入稳定性尚未确认。"
            : "当前兴趣信号偏弱，不建议继续加码。",
      signals: (() => {
        const unique = [
          ...new Set(
            evidence
              .filter((item) =>
                /主动|推进|回应/.test(item.inference + item.observation),
              )
              .map((item) => item.observation),
          ),
        ].slice(0, 3);
        return unique.length ? unique : ["对方有基本回应"];
      })(),
      ambiguities: [
        "友好回应不等于浪漫兴趣。",
        "真正的投入程度要看对方是否愿意共同确定下一次互动。",
      ],
    },
    action: {
      decision,
      rationale:
        decision === "暂缓推进"
          ? "当前投入与回应不对等，继续增加主动可能强化消耗。"
          : "用一次低压力、可撤回的具体行动验证关系温度，比反复解读语气更有效。",
      nextMessage,
      messageOptions,
      ifWarm:
        "对方给出具体时间或主动提出替代安排时，直接确认地点、时长和交通，不需要继续试探。",
      ifCold:
        "如果对方继续模糊、超过约定时间不回应或只给礼貌短句，停止追加邀约，把主动权交还给对方。",
      conversationMoves: [
        "把兴趣从抽象好感转成一个双方都容易完成的小活动。",
        "每推进一次，只观察对方是否同等地向前一步。",
        "保留退出空间，避免用自我暴露换取对方回应。",
      ],
      stopSigns: [
        "长期只在你主动时回复。",
        "持续制造忽冷忽热却不解释。",
        "贬低你的兴趣、边界或感受。",
      ],
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
      "如果关系持续带来自我怀疑、恐惧或边界侵蚀，请优先寻求现实支持。",
    ],
  };
}

export function getDemoHistory() {
  return SAMPLE_HISTORY;
}
