import type {
  AnalysisInput,
  EmotionAnalysis,
  KnowledgeMatch,
  KnowledgeReference,
} from "../types";
import { parseConversation } from "./conversation";

export interface KnowledgeCase {
  id: string;
  source: string;
  license: string;
  title: string;
  scene: string;
  pattern: string;
  situation: string;
  takeaway: string;
  emotions: string[];
  sentiment: string;
  signals: string[];
  clusterId: number;
  clusterLabel: string;
  searchTerms: string[];
  dialogue: Array<{ speaker: string; text: string }>;
}

export interface KnowledgeCorpus {
  version: string;
  caseCount: number;
  cases: KnowledgeCase[];
  clusters: Array<{ label: string; count: number }>;
  manifest: Record<string, string | number>;
}

let knowledgePromise: Promise<KnowledgeCorpus> | null = null;

export function emptyKnowledge(): KnowledgeMatch {
  return {
    relatedCases: [],
    clusterHints: [],
    caseCount: 0,
  };
}

function loadKnowledge() {
  if (!knowledgePromise) {
    knowledgePromise = fetch(
      `${import.meta.env.BASE_URL}knowledge/cases.json`,
      { cache: "force-cache" },
    ).then((response) => {
      if (!response.ok) throw new Error("关系案例库加载失败。");
      return response.json() as Promise<KnowledgeCorpus>;
    });
  }
  return knowledgePromise;
}

function queryTokens(text: string) {
  const chars = [
    ...text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fffa-z0-9]/gu, ""),
  ];
  const tokens = new Set<string>();
  chars.forEach((char, index) => {
    tokens.add(char);
    if (index + 1 < chars.length) tokens.add(`${char}${chars[index + 1]}`);
    if (index + 2 < chars.length) {
      tokens.add(`${char}${chars[index + 1]}${chars[index + 2]}`);
    }
  });
  return tokens;
}

function caseTokens(item: KnowledgeCase) {
  const dialogue = item.dialogue.map((turn) => turn.text).join("\n");
  return queryTokens(
    [
      item.title,
      item.pattern,
      item.situation,
      item.takeaway,
      item.clusterLabel,
      ...item.searchTerms,
      ...item.emotions,
      ...item.signals,
      dialogue,
    ].join("\n"),
  );
}

export function rankKnowledge(
  input: AnalysisInput,
  emotion: EmotionAnalysis,
  corpus: KnowledgeCorpus,
  limit = 3,
): KnowledgeMatch {
  const parsed = parseConversation(input.chat);
  const queryText = [
    input.selfProfile,
    input.otherProfile,
    input.chat,
    emotion.quickRead.headline,
    emotion.quickRead.observation,
    parsed.planState.summary,
    ...emotion.intimacySignals.map(
      (signal) => `${signal.label} ${signal.hits.join(" ")}`,
    ),
  ].join("\n");
  const query = queryTokens(queryText);
  const activeSignals = new Set(
    emotion.intimacySignals.map((signal) => signal.key),
  );
  const activeEmotions = new Set(
    emotion.categories
      .filter((category) => category.count > 0)
      .map((category) => category.key),
  );
  const scored = corpus.cases.map((item) => {
    const candidate = caseTokens(item);
    let overlap = 0;
    for (const token of query) {
      if (candidate.has(token)) overlap += token.length >= 2 ? 1.4 : 0.2;
    }
    const signalBonus = item.signals.some((signal) =>
      activeSignals.has(signal as never),
    )
      ? 8
      : 0;
    const emotionBonus = item.emotions.some((emotionKey) =>
      activeEmotions.has(emotionKey as never),
    )
      ? 4
      : 0;
    const datingBonus =
      item.source === "letsdate-synthetic" &&
      /dating|暧昧|约会|关系/.test(
        `${input.relationshipStage} ${input.goal} ${queryText}`,
      )
        ? 8
        : 0;
    const controlPenalty =
      item.signals.includes("control") && !activeSignals.has("control")
        ? 9
        : 0;
    return {
      item,
      score: overlap + signalBonus + emotionBonus + datingBonus - controlPenalty,
    };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.max(1, limit));
  const maxScore = top[0]?.score || 1;
  const relatedCases: KnowledgeReference[] = top
    .filter((item) => item.score > 0)
    .map(({ item, score }) => ({
      id: item.id,
      title: item.title,
      source: item.source,
      license: item.license,
      pattern: item.pattern,
      situation: item.situation,
      takeaway: item.takeaway,
      similarity: Math.max(20, Math.min(96, Math.round((score / maxScore) * 82))),
      synthetic: item.source === "letsdate-synthetic",
    }));
  return {
    relatedCases,
    clusterHints: [...new Set(top.map(({ item }) => item.clusterLabel))],
    caseCount: corpus.caseCount,
  };
}

export async function retrieveKnowledge(
  input: AnalysisInput,
  emotion: EmotionAnalysis,
): Promise<KnowledgeMatch> {
  try {
    return rankKnowledge(input, emotion, await loadKnowledge());
  } catch (error) {
    console.warn("[Knowledge] retrieval failed", error);
    return emptyKnowledge();
  }
}
