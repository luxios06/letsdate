import { DEMO_REPORT, DEMO_SAMPLE, SAMPLE_HISTORY } from "./demo";
import type {
  AnalysisInput,
  AnalysisReport,
  Confidence,
  Decision,
  EvidenceItem,
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

const confidenceFromScore = (score: number, materialLength: number): Confidence => {
  if (score >= 76 && materialLength > 420) return "较高";
  if (score >= 52 && materialLength > 180) return "中";
  return "低";
};

const decisionFromScore = (score: number): Decision => {
  if (score >= 78) return "继续推进";
  if (score >= 62) return "适度推进";
  if (score >= 45) return "先观察";
  return "暂缓推进";
};

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
    text.match(/嗯嗯|好的|行吧|再说|看情况|忙|下次吧|不太方便|算了|随便/g) ?? []
  ).length;

const buildMbti = (
  text: string,
  seed: number,
  prefix: string,
  introvertHint: boolean,
): AnalysisReport["person"]["mbti"] => {
  const eBoost = includesAny(text, ["一起", "主动", "朋友", "聚会", "见面", "哈哈"]) ? 9 : -3;
  const nBoost = includesAny(text, ["感觉", "可能", "未来", "意义", "探索", "喜欢"]) ? 8 : 0;
  const fBoost = includesAny(text, ["感受", "理解", "喜欢", "温暖", "陪伴"]) ? 8 : -2;
  const jBoost = includesAny(text, ["计划", "安排", "确定", "周末", "时间"]) ? 7 : -4;
  const dimensions: MbtiDimension[] = ([
    {
      key: "EI",
      left: "I",
      right: "E",
      score: clamp((introvertHint ? 35 : 56) + eBoost + (seed % 9) - 4),
      leaning: "",
      note: "依据主动表达、自我披露与社交能量的文本线索估计。",
    },
    {
      key: "SN",
      left: "S",
      right: "N",
      score: clamp(50 + nBoost + (seed % 11) - 5),
      leaning: "",
      note: "依据具体经验与抽象探索语言的相对占比估计。",
    },
    {
      key: "TF",
      left: "T",
      right: "F",
      score: clamp(51 + fBoost + ((seed >> 3) % 9) - 4),
      leaning: "",
      note: "依据情绪表达、价值判断与问题解决语言估计。",
    },
    {
      key: "JP",
      left: "J",
      right: "P",
      score: clamp(49 + jBoost + ((seed >> 5) % 11) - 5),
      leaning: "",
      note: "依据计划性、开放安排与临时调整线索估计。",
    },
  ] satisfies MbtiDimension[]).map((dimension) => ({
    ...dimension,
    leaning: `${dimension.score >= 50 ? dimension.right : dimension.left} 倾向`,
  }));

  const candidate = dimensions
    .map((dimension) => (dimension.score >= 50 ? dimension.right : dimension.left))
    .join("");
  const alternatives = [
    candidate.replace("E", "I"),
    candidate.replace("N", "S"),
    candidate.replace("F", "T"),
  ].filter((item, index, list) => item !== candidate && list.indexOf(item) === index);

  return {
    candidate: prefix || candidate,
    alternatives,
    confidence: materialLength(text) > 420 ? "中" : "低",
    dimensions,
  };
};

const materialLength = (text: string) => text.replace(/\s/g, "").length;

const buildBigFive = (text: string, seed: number): TraitScore[] => {
  const openness = includesAny(text, ["展", "艺术", "探索", "旅行", "音乐", "新"]) ? 14 : 2;
  const conscientiousness = includesAny(text, ["计划", "安排", "时间", "工作", "确定"]) ? 12 : 0;
  const extraversion = includesAny(text, ["一起", "朋友", "聚会", "主动", "哈哈"]) ? 10 : -4;
  const agreeableness = countQuestions(text) * 2 + (includesAny(text, ["谢谢", "理解", "可以", "没关系"]) ? 10 : 0);
  const neuroticism = includesAny(text, ["焦虑", "担心", "害怕", "忽冷忽热", "内耗"]) ? 12 : -3;
  return [
    {
      key: "openness",
      label: "开放性",
      score: clamp(57 + openness + (seed % 9)),
      summary: openness > 5 ? "对新体验与多元表达有较高兴趣。" : "更偏向熟悉、可预测的体验。",
    },
    {
      key: "conscientiousness",
      label: "尽责性",
      score: clamp(56 + conscientiousness + ((seed >> 2) % 8)),
      summary:
        conscientiousness > 5 ? "表达中能看到计划意识和行动推进。" : "更看重临场感，计划细度暂不明显。",
    },
    {
      key: "extraversion",
      label: "外向性",
      score: clamp(54 + extraversion + ((seed >> 4) % 8)),
      summary:
        extraversion > 4 ? "愿意主动建立话题，也能承接社交能量。" : "更偏慢热或小范围交流。",
    },
    {
      key: "agreeableness",
      label: "宜人性",
      score: clamp(58 + agreeableness + ((seed >> 6) % 7)),
      summary:
        agreeableness > 5 ? "表达中体现出照顾对方感受与协作倾向。" : "材料尚不足以稳定判断合作风格。",
    },
    {
      key: "neuroticism",
      label: "情绪敏感度",
      score: clamp(47 + neuroticism + ((seed >> 8) % 7)),
      summary:
        neuroticism > 5 ? "可能对关系信号较敏感，需要更稳定的反馈。" : "当前没有明显的高敏感或波动线索。",
    },
  ];
};

const buildPerson = (
  profile: string,
  chat: string,
  seed: number,
  kind: "self" | "other",
): PersonProfile => {
  const text = `${profile}\n${chat}`;
  const introvertHint = includesAny(profile, ["慢热", "安静", "独处", "小范围"]);
  return {
    summary:
      kind === "other"
        ? "材料显示 Ta 愿意分享、追问，并会主动把兴趣落到共同活动。整体更像在熟悉后逐步打开的体验型沟通者。"
        : "你的表达相对稳定，会给出具体回应，也重视关系里的确定感和舒适度。",
    mbti: buildMbti(text, seed, "", introvertHint),
    bigFive: buildBigFive(text, seed),
    interaction: {
      attachment:
        "短期文本不足以判断依恋类型。仅可观察到回应稳定性和边界表达，不能当作心理学诊断。",
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
  };
};

const buildEvidence = (chat: string, otherProfile: string): EvidenceItem[] => {
  const lines = chat
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const otherLines = lines.filter((line) => /^对方[:：]/.test(line));
  const selected = otherLines.slice(0, 4);
  const evidence: EvidenceItem[] = selected.map((line, index) => ({
    id: `evidence-${index + 1}`,
    source: "聊天",
    quote: line.replace(/^对方[:：]\s*/, ""),
    observation:
      /[?？]/.test(line) || /你呢|你也|喜欢吗/.test(line)
        ? "对方主动把话题递回给你，并继续了解你的兴趣。"
        : "对方提供了具体信息或行动线索，而非只作礼貌回应。",
    inference:
      /一起|周末|见面|有空|时间/.test(line)
        ? "存在把互动推进到现实场景的意愿。"
        : "当前有继续交流的兴趣，但投入程度仍需观察。",
    confidence: "中",
    caution: "单条消息可能受上下文、情绪和沟通习惯影响，不能单独作为结论。",
  }));

  if (otherProfile.trim()) {
    evidence.push({
      id: "profile-evidence",
      source: "主页",
      quote: otherProfile.trim().slice(0, 72),
      observation: "主页呈现了 Ta 主动选择的自我描述与兴趣方向。",
      inference: "可以作为破冰和互相了解的线索，但不等同于稳定人格。",
      confidence: "低",
      caution: "主页是经过编辑的自我呈现，适合用来找话题，不适合单独下判断。",
    });
  }
  return evidence.slice(0, 5);
};

export function buildLocalAnalysis(
  input: AnalysisInput,
  provider: ProviderId = "demo",
): AnalysisReport {
  const isDemo = input.chat.trim() === DEMO_SAMPLE.chat.trim() && input.otherProfile.trim() === DEMO_SAMPLE.otherProfile.trim();
  if (isDemo) {
    return {
      ...DEMO_REPORT,
      id: createId(),
      createdAt: new Date().toISOString(),
      provider,
      stage: input.relationshipStage,
    };
  }

  const text = `${input.selfProfile}\n${input.otherProfile}\n${input.chat}`;
  const seed = hash(text);
  const questions = countQuestions(input.chat);
  const warm = countWarmSignals(input.chat);
  const cold = countColdSignals(input.chat);
  const initiative = (input.chat.match(/^我[:：]/gm) ?? []).length;
  const otherTurns = (input.chat.match(/^对方[:：]/gm) ?? []).length;
  const material = materialLength(text);
  const evidence = buildEvidence(input.chat, input.otherProfile);
  const compatibilityScore = clamp(52 + questions * 3 + warm * 4 - cold * 5 + Math.min(otherTurns, 5) * 2);
  const interestScore = clamp(44 + questions * 5 + warm * 6 - cold * 7 + Math.min(otherTurns, 6) * 3);
  const overallScore = clamp(compatibilityScore * 0.58 + interestScore * 0.42);
  const confidence = confidenceFromScore(overallScore, material);
  const decision = decisionFromScore(overallScore);
  const person = buildPerson(input.otherProfile, input.chat, seed, "other");
  const self = buildPerson(input.selfProfile, input.chat, seed + 13, "self");
  const coldRisk = cold > warm;
  const nextMessage =
    interestScore >= 65
      ? "你之前提到的那个活动听起来还蛮有意思。等你这周节奏定下来，我们可以挑个下午一起去；如果时间不合适，也完全没关系，下次再找机会。"
      : "这次聊天挺有意思，我先不急着往后推。等你方便的时候再接着聊，也想知道你最近有没有什么新发现。";

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
    person,
    self,
    compatibility: {
      score: compatibilityScore,
      label:
        compatibilityScore >= 75
          ? "互动顺畅，可继续验证"
          : compatibilityScore >= 60
            ? "有连接点，需要对齐节奏"
            : "差异较明显，先观察",
      summary:
        "匹配度来自双方表达、主动性和话题承接质量的组合估计，不代表关系结果预测。最能说明问题的，仍是双方在真实安排中的一致性。",
      dimensions: [
        {
          key: "communication",
          label: "沟通承接",
          score: clamp(55 + questions * 4 + warm * 3),
          summary: questions > 2 ? "双方有较多追问与回应。" : "目前更多是单线叙述，追问还可以增加。",
        },
        {
          key: "pace",
          label: "推进节奏",
          score: clamp(58 + warm * 2 - cold * 4),
          summary: cold > 2 ? "推进节奏存在拉扯，需要减少连续加码。" : "当前节奏没有明显压迫感。",
        },
        {
          key: "expression",
          label: "表达方式",
          score: clamp(60 + (includesAny(text, ["哈哈", "😂", "喜欢", "感觉"]) ? 10 : 0)),
          summary: "你们都在用较具体的方式表达兴趣，但强度不完全一致。",
        },
        {
          key: "boundaries",
          label: "边界尊重",
          score: clamp(70 + (includesAny(text, ["空间", "时间", "方便", "安排"]) ? 8 : -5)),
          summary: "材料里能看到对时间和个人安排的提及，是积极信号。",
        },
        {
          key: "values",
          label: "价值线索",
          score: clamp(55 + (includesAny(text, ["艺术", "运动", "旅行", "生活"]) ? 12 : 0)),
          summary: "共同兴趣可以提供入口，长期匹配仍需要更多场景验证。",
        },
      ],
    },
    interest: {
      score: interestScore,
      confidence: confidenceFromScore(interestScore, material),
      verdict:
        interestScore >= 70
          ? "有值得验证的积极兴趣信号。"
          : interestScore >= 50
            ? "兴趣存在，但投入稳定性尚未确认。"
            : "当前兴趣信号偏弱，不建议继续加码。",
      signals:
        evidence
          .filter((item) => /主动|推进|回应/.test(item.inference + item.observation))
          .slice(0, 3)
          .map((item) => item.observation) || ["对方有基本回应"],
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
      input.chat.length < 160 ? "聊天样本较短，兴趣和互动判断可能明显偏差。" : "缺少语音、表情、回复时延与线下互动信息。",
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
