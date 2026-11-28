import type {
  AnalysisInput,
  EmotionAnalysis,
  EmotionCategoryKey,
  EmotionCategoryScore,
  IntimacySignal,
  QuickEmotionRead,
} from "../types";
import { parseConversation } from "./conversation";

interface EmotionLexicon {
  source: {
    project: string;
    license: string;
    dictionary: string;
    url: string;
  };
  categories: Record<EmotionCategoryKey, string[]>;
  modifiers: {
    deny: string[];
    extreme: string[];
    very: string[];
    more: string[];
    ish: string[];
  };
}

const CATEGORY_LABELS: Record<EmotionCategoryKey, string> = {
  good: "好",
  joy: "乐",
  sadness: "哀",
  anger: "怒",
  fear: "惧",
  disgust: "恶",
  surprise: "惊",
};
const POSITIVE: EmotionCategoryKey[] = ["good", "joy"];
const NEGATIVE: EmotionCategoryKey[] = [
  "sadness",
  "anger",
  "fear",
  "disgust",
];
const FALLBACK_CATEGORIES: Record<EmotionCategoryKey, string[]> = {
  good: ["喜欢", "开心", "高兴", "舒服", "安心", "温暖", "谢谢", "理解", "尊重", "想见"],
  joy: ["开心", "快乐", "兴奋", "期待", "哈哈", "笑", "心动"],
  sadness: ["难过", "失落", "失望", "委屈", "伤心", "哭", "低落", "孤独"],
  anger: ["生气", "愤怒", "烦", "不爽", "火大", "讨厌"],
  fear: ["害怕", "焦虑", "担心", "不安", "紧张", "恐惧"],
  disgust: ["恶心", "反感", "厌恶", "排斥"],
  surprise: ["惊讶", "意外", "震惊", "没想到"],
};

interface IntimacyPattern {
  key: IntimacySignal["key"];
  label: string;
  weight: number;
  expressions: RegExp[];
}

const INTIMACY_PATTERNS: IntimacyPattern[] = [
  {
    key: "closeness",
    label: "亲密靠近",
    weight: 22,
    expressions: [
      /想你/u,
      /想见你/u,
      /喜欢你/u,
      /爱你/u,
      /抱抱/u,
      /亲亲/u,
      /宝贝|宝宝/u,
      /到家.{0,6}(?:说|告诉)/u,
      /注意安全/u,
      /担心你/u,
      /陪你/u,
      /照顾你/u,
    ],
  },
  {
    key: "flirtation",
    label: "暧昧调情",
    weight: 20,
    expressions: [/心动/u, /暧昧/u, /牵手/u, /亲一下/u, /主要想见你/u, /想约会/u],
  },
  {
    key: "reassurance",
    label: "寻求确认",
    weight: 24,
    expressions: [
      /你还在吗/u,
      /你是不是不喜欢/u,
      /怎么不回/u,
      /是不是我哪里/u,
      /会不会离开/u,
      /别不理我/u,
      /你还喜欢我吗/u,
      /确认一下/u,
    ],
  },
  {
    key: "withdrawal",
    label: "退缩或低能量",
    weight: 16,
    expressions: [
      /低电量/u,
      /不想聊/u,
      /想安静/u,
      /算了/u,
      /随便/u,
      /没事/u,
      /晚点再说/u,
      /不想说/u,
    ],
  },
  {
    key: "control",
    label: "控制风险",
    weight: 32,
    expressions: [
      /查手机/u,
      /删掉/u,
      /只能/u,
      /必须/u,
      /不许/u,
      /定位/u,
      /报备/u,
      /别和.{0,8}联系/u,
    ],
  },
  {
    key: "repair",
    label: "澄清修复",
    weight: 20,
    expressions: [
      /抱歉/u,
      /对不起/u,
      /理解/u,
      /说清楚/u,
      /以后会/u,
      /以后.{0,12}(?:提前|告诉|讲|说清楚)/u,
      /应该.{0,8}(?:提前|告诉|解释)/u,
      /我会注意/u,
      /不是故意/u,
    ],
  },
  {
    key: "boundary",
    label: "边界协商",
    weight: 16,
    expressions: [
      /需要空间/u,
      /会提前/u,
      /提前告诉/u,
      /提前讲/u,
      /有变化.{0,8}(?:说|告诉)/u,
      /需要.{0,4}边界/u,
      /不方便/u,
      /别催/u,
      /慢慢来/u,
      /可以接受/u,
    ],
  },
  {
    key: "future",
    label: "未来承诺",
    weight: 14,
    expressions: [/以后/u, /未来/u, /长期/u, /认真/u, /确定关系/u, /见家长/u],
  },
];

let lexiconPromise: Promise<EmotionLexicon> | null = null;

function loadLexicon() {
  if (!lexiconPromise) {
    lexiconPromise = fetch(
      `${import.meta.env.BASE_URL}emotion/cnsenti-lexicon.json`,
      { cache: "force-cache" },
    ).then((response) => {
      if (!response.ok) throw new Error("情感词典加载失败。");
      return response.json() as Promise<EmotionLexicon>;
    });
  }
  return lexiconPromise;
}

function segments(text: string) {
  const Segmenter = (
    Intl as typeof Intl & {
      Segmenter?: new (
        locale: string,
        options: { granularity: "word" },
      ) => {
        segment: (value: string) => Iterable<{ segment: string }>;
      };
    }
  ).Segmenter;
  if (Segmenter) {
    return [
      ...new Segmenter("zh", { granularity: "word" }).segment(text),
    ].map((item) => item.segment);
  }
  return text
    .split(/[\s，。！？、；：,.!?;:（）()【】\[\]]+/u)
    .filter(Boolean);
}

function buildCategoryScores(
  text: string,
  categories: Record<EmotionCategoryKey, string[]>,
  modifiers: EmotionLexicon["modifiers"],
) {
  const words = segments(text);
  const sets = Object.fromEntries(
    Object.entries(categories).map(([key, values]) => [key, new Set(values)]),
  ) as Record<EmotionCategoryKey, Set<string>>;
  const deny = new Set(modifiers.deny);
  const extreme = new Set(modifiers.extreme);
  const very = new Set(modifiers.very);
  const more = new Set(modifiers.more);
  const ish = new Set(modifiers.ish);
  const weighted = Object.fromEntries(
    (Object.keys(CATEGORY_LABELS) as EmotionCategoryKey[]).map((key) => [key, 0]),
  ) as Record<EmotionCategoryKey, number>;
  const counts = { ...weighted };

  words.forEach((word, index) => {
    const category = (Object.keys(sets) as EmotionCategoryKey[]).find((key) =>
      sets[key].has(word),
    );
    if (!category) return;
    const previous = words.slice(Math.max(0, index - 2), index).join("");
    const negated = [...deny].some((item) => previous.includes(item));
    const multiplier = [...extreme].some((item) => previous.includes(item))
      ? 1.8
      : [...very].some((item) => previous.includes(item))
        ? 1.5
        : [...more].some((item) => previous.includes(item))
          ? 1.25
          : [...ish].some((item) => previous.includes(item))
            ? 0.6
            : 1;
    if (negated && POSITIVE.includes(category)) {
      weighted.sadness += multiplier * 0.7;
      counts.sadness += 0.7;
      return;
    }
    if (negated && NEGATIVE.includes(category)) {
      weighted.good += multiplier * 0.6;
      counts.good += 0.6;
      return;
    }
    weighted[category] += multiplier;
    counts[category] += multiplier;
  });

  const total = Object.values(weighted).reduce((sum, value) => sum + value, 0);
  const categoriesResult: EmotionCategoryScore[] = (
    Object.keys(CATEGORY_LABELS) as EmotionCategoryKey[]
  ).map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    count: Math.round(counts[key]),
    score: total ? Math.round((weighted[key] / total) * 100) : 0,
  }));
  const positive = POSITIVE.reduce((sum, key) => sum + weighted[key], 0);
  const negative = NEGATIVE.reduce((sum, key) => sum + weighted[key], 0);
  return {
    categories: categoriesResult,
    valence: total ? Math.max(-1, Math.min(1, (positive - negative) / total)) : 0,
    intensity: Math.max(0, Math.min(1, total / Math.max(4, words.length / 3))),
  };
}

function intimacySignals(input: AnalysisInput) {
  const parsed = parseConversation(input.chat);
  const messages = parsed.messages;
  return INTIMACY_PATTERNS.map((pattern) => {
    const hits: string[] = [];
    let selfHits = 0;
    let otherHits = 0;
    for (const message of messages) {
      for (const expression of pattern.expressions) {
        const match = message.text.match(expression);
        if (!match) continue;
        hits.push(match[0]);
        if (message.sender === "self") selfHits += 1;
        else otherHits += 1;
      }
    }
    return {
      key: pattern.key,
      label: pattern.label,
      score: Math.min(100, hits.length * pattern.weight),
      hits: [...new Set(hits)].slice(0, 6),
      sender:
        selfHits > 0 && otherHits > 0
          ? ("both" as const)
          : otherHits > 0
            ? ("other" as const)
            : selfHits > 0
              ? ("self" as const)
              : ("both" as const),
    } satisfies IntimacySignal;
  }).filter((signal) => signal.score > 0);
}

function buildQuickRead(
  input: AnalysisInput,
  signals: IntimacySignal[],
  categories: EmotionCategoryScore[],
): QuickEmotionRead {
  const parsed = parseConversation(input.chat);
  const short =
    parsed.messages.length < 10 ||
    input.chat.replace(/\s/gu, "").length < 180;
  const sorted = [...signals].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const hasControl = signals.some((signal) => signal.key === "control");
  const hasRepair = signals.some((signal) => signal.key === "repair");
  const hasBoundary = signals.some((signal) => signal.key === "boundary");
  const missing = [
    ...(parsed.timestampCoverage < 0.2 ? ["回复间隔和消息出现的时间顺序"] : []),
    ...(short ? ["你们目前的关系阶段，以及这段对话前后发生了什么"] : []),
    ...(parsed.messages.some((message) => message.kind === "conflict")
      ? []
      : ["出现分歧或拒绝时，对方通常会怎样回应"]),
    ...(signals.some((signal) => signal.key === "closeness" || signal.key === "flirtation")
      ? ["这些亲密表达是玩笑、暧昧，还是双方已经明确过的关系语言"]
      : []),
  ].slice(0, 3);

  if (hasControl) {
    return {
      headline: "有些“关心”，已经变成了控制",
      observation:
        "这些话里出现了限制、查手机、报备或排他性的要求。它们听起来像在意，却不该被浪漫化。",
      suggestion:
        "先别顺着话术往前走。把边界说清楚，再看对方能不能尊重这句拒绝。",
      confidence: "中",
      missingInformation: missing,
    };
  }
  if (hasRepair) {
    return {
      headline: "Ta 在试着修复这段关系",
      observation: "这里有道歉、解释，也有“以后想做得更好”的意思。",
      suggestion:
        "可以先接住这份修复的意愿，再一起约定下次具体怎么做。真正的修复，最后都要落回后续行动。",
      confidence: "中",
      missingInformation: missing,
    };
  }
  if (top?.key === "closeness" || top?.key === "flirtation") {
    return {
      headline: "这段话里，已经有一点亲密的靠近",
      observation: `最清楚的一处是“${top.label}”，比如：${top.hits.slice(0, 2).join("、")}。`,
      suggestion:
        "可以先回应这份温度，再轻轻问一个具体的问题。比如告诉 Ta 你也愿意见面，再把时间交给两个人一起定。",
      confidence: short ? "低" : "中",
      missingInformation: missing,
    };
  }
  if (top?.key === "reassurance") {
    return {
      headline: "Ta 在反复确认：这段关系还在不在",
      observation: "这些话里有一点担心被忽略，也有一点害怕关系突然变淡。",
      suggestion:
        "可以先诚实说出你现在的投入程度。清楚比含糊更能让人安心，但也别承诺自己还没想好的事。",
      confidence: short ? "低" : "中",
      missingInformation: missing,
    };
  }
  if (top?.key === "withdrawal") {
    return {
      headline: "Ta 现在，可能只是没有力气再解释",
      observation: "短回复前后出现了低电量、想安静，或者“晚点再说”的痕迹。",
      suggestion:
        "回一句不催促的话，给 Ta 留一条容易回来的路。比如“你先休息，等方便时再回我就好”。",
      confidence: "低",
      missingInformation: missing,
    };
  }
  if (top?.key === "boundary" || hasBoundary) {
    return {
      headline: "Ta 在说：请按这个节奏靠近",
      observation: "这里提到了空间、提前沟通、不方便，或什么样的方式更舒服。",
      suggestion:
        "先说清你也能接受的节奏，再看对方会不会真的配合。愿意尊重边界，比一句好听的话更重要。",
      confidence: short ? "低" : "中",
      missingInformation: missing,
    };
  }
  const mood = [...categories].sort((a, b) => b.score - a.score)[0];
  return {
    headline: short
      ? "话还很少，但可以先轻轻接住"
      : "有情绪在流动，只是关系的意思还没站稳",
    observation:
      mood && mood.count > 0
        ? `眼下最明显的是“${mood.label}”，但它还不足以说明一段稳定的关系。`
        : "现在还没有足够清楚的靠近、退后、修复或边界信号。",
    suggestion: short
      ? "不用急着问“你到底怎么想”。先回应 Ta 刚说的话，再问一个具体、容易回答的小问题，看看对方愿不愿意把话题继续下去。"
      : "先用一个轻一点、具体一点的问题，看对方愿不愿意一起往前走。别从这么少的文字里，硬替一个人定性格。",
    confidence: "低",
    missingInformation:
      missing.length > 0
        ? missing
        : ["对方平时的表达习惯，以及类似场景中的稳定反应"],
  };
}

function analyzeWithLexicon(
  input: AnalysisInput,
  lexicon: EmotionLexicon | null,
): EmotionAnalysis {
  const text = `${input.selfProfile}\n${input.otherProfile}\n${input.chat}`;
  const categories = lexicon?.categories ?? FALLBACK_CATEGORIES;
  const modifiers =
    lexicon?.modifiers ??
    ({
      deny: ["不", "没", "别", "无", "不是"],
      extreme: ["极其", "非常", "特别"],
      very: ["很", "太", "超"],
      more: ["更", "比较", "有点"],
      ish: ["略", "稍微", "有一点"],
    } satisfies EmotionLexicon["modifiers"]);
  const emotion = buildCategoryScores(text, categories, modifiers);
  const signals = intimacySignals(input);
  const totalEmotionHits = emotion.categories.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const shortMaterial =
    input.chat.replace(/\s/gu, "").length < 80 ||
    parseConversation(input.chat).messages.length <= 6;
  const hasStrongEmotionWord =
    /开心|高兴|难过|失望|生气|害怕|焦虑|喜欢|讨厌|恶心|惊讶|震惊|委屈|不安|温暖|安心/u.test(
      input.chat,
    );
  if (
    shortMaterial &&
    signals.length === 0 &&
    (!hasStrongEmotionWord || totalEmotionHits <= 1)
  ) {
    emotion.categories = emotion.categories.map((item) => ({
      ...item,
      count: 0,
      score: 0,
    }));
    emotion.valence = 0;
    emotion.intensity = 0;
  }
  const affectionDominant = signals.some(
    (signal) => signal.key === "closeness" || signal.key === "flirtation",
  );
  const explicitNegative =
    /难过|伤心|失望|哭|生气|愤怒|害怕|焦虑|不安|厌烦|恶心|委屈/u.test(text);
  if (affectionDominant && !explicitNegative) {
    emotion.categories = emotion.categories.map((item) => {
      if (NEGATIVE.includes(item.key)) {
        return {
          ...item,
          count: Math.round(item.count * 0.25),
          score: Math.round(item.score * 0.25),
        };
      }
      if (item.key === "good") {
        return {
          ...item,
          count: Math.max(1, item.count),
          score: Math.max(45, item.score),
        };
      }
      if (item.key === "joy") {
        return { ...item, score: Math.max(25, item.score) };
      }
      return item;
    });
    emotion.valence = Math.max(0.2, emotion.valence);
  }
  return {
    ...emotion,
    intimacySignals: signals,
    quickRead: buildQuickRead(input, signals, emotion.categories),
    source: lexicon ? "cnsenti-dutir" : "local-fallback",
  };
}

export function analyzeEmotionFallback(input: AnalysisInput): EmotionAnalysis {
  return analyzeWithLexicon(input, null);
}

export async function analyzeEmotion(input: AnalysisInput): Promise<EmotionAnalysis> {
  try {
    return analyzeWithLexicon(input, await loadLexicon());
  } catch (error) {
    console.warn("[Emotion] cnsenti lexicon failed, using fallback", error);
    return analyzeEmotionFallback(input);
  }
}
