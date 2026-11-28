import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalysisInput } from "../types";
import { analyzeEmotionFallback } from "./emotion-analysis";
import {
  rankKnowledge,
  retrieveKnowledge,
  type KnowledgeCase,
  type KnowledgeCorpus,
} from "./knowledge";

const input = (chat: string): AnalysisInput => ({
  relationshipLabel: "测试关系",
  selfProfile: "",
  otherProfile: "",
  chat,
  relationshipStage: "刚匹配",
  goal: "判断是否值得继续投入",
  consent: true,
});

const baseCase = (
  overrides: Partial<KnowledgeCase> & Pick<KnowledgeCase, "id" | "title">,
): KnowledgeCase => ({
  source: "letsdate-synthetic",
  license: "CC0-1.0",
  scene: "dating",
  pattern: "日常互动",
  situation: "一段普通的约会聊天。",
  takeaway: "先观察后续是否有双向行动。",
  emotions: ["neutral"],
  sentiment: "neutral",
  signals: [],
  clusterId: 0,
  clusterLabel: "dating-specific",
  searchTerms: ["约会"],
  dialogue: [],
  ...overrides,
});

const corpus = (cases: KnowledgeCase[]): KnowledgeCorpus => ({
  version: "test",
  caseCount: cases.length,
  cases,
  clusters: [],
  manifest: {},
});

describe("knowledge retrieval", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("ranks a state-based short reply above unrelated cases", () => {
    const analysisInput = input(
      "我：你今天还好吗？\n对方：嗯\n对方：有点低电量，晚点再回你",
    );
    const emotion = analyzeEmotionFallback(analysisInput);
    const result = rankKnowledge(
      analysisInput,
      emotion,
      corpus([
        baseCase({
          id: "short-energy",
          title: "短回复后说明低能量",
          pattern: "状态性短回复",
          situation: "对方回复很短，但明确说疲惫，并约定稍后恢复交流。",
          takeaway: "先按当前状态理解，不要直接判断冷淡或依恋类型。",
          emotions: ["sadness", "neutral"],
          signals: ["withdrawal", "repair"],
          searchTerms: ["短回复", "低能量", "晚点再回", "疲惫"],
          dialogue: [{ speaker: "B", text: "有点低电量，晚点再回你" }],
        }),
        baseCase({
          id: "unrelated-travel",
          title: "旅行照片分享",
          pattern: "轻松分享",
          situation: "双方在聊旅行照片。",
          searchTerms: ["旅行", "照片", "摄影"],
        }),
      ]),
    );

    expect(result.relatedCases[0]?.id).toBe("short-energy");
    expect(result.clusterHints).toContain("dating-specific");
  });

  it("prioritizes control risk when control language is present", () => {
    const analysisInput = input(
      "对方：把定位一直开着\n对方：手机给我查，不许和别人联系",
    );
    const emotion = analyzeEmotionFallback(analysisInput);
    const result = rankKnowledge(
      analysisInput,
      emotion,
      corpus([
        baseCase({
          id: "control-risk",
          title: "把控制包装成关心",
          pattern: "控制风险",
          situation: "对方要求定位、查手机或限制社交。",
          takeaway: "控制不是爱的证明，优先确认边界和拒绝后的反应。",
          emotions: ["anger", "fear"],
          signals: ["control"],
          searchTerms: ["定位", "手机", "控制", "边界"],
        }),
        baseCase({
          id: "flirty",
          title: "暧昧夸奖",
          pattern: "调情",
          searchTerms: ["喜欢", "想你", "心动"],
        }),
      ]),
    );

    expect(result.relatedCases[0]?.id).toBe("control-risk");
  });

  it("down-ranks control cases when the chat has no control signal", () => {
    const analysisInput = input(
      "我：今天路过一家咖啡店\n对方：那家我也喜欢，周末一起去？",
    );
    const emotion = analyzeEmotionFallback(analysisInput);
    const result = rankKnowledge(
      analysisInput,
      emotion,
      corpus([
        baseCase({
          id: "control-risk",
          title: "把控制包装成关心",
          pattern: "控制风险",
          situation: "对方要求定位和查手机。",
          takeaway: "控制不是爱的证明。",
          emotions: ["neutral"],
          signals: ["control"],
          searchTerms: ["咖啡", "周末", "定位", "手机"],
        }),
        baseCase({
          id: "coffee-date",
          title: "接住咖啡话题并提出见面",
          pattern: "计划推进",
          situation: "对方接住共同兴趣，并提出具体见面方向。",
          takeaway: "用一次具体安排验证双方投入。",
          emotions: ["joy"],
          signals: ["future"],
          searchTerms: ["咖啡", "周末", "见面", "一起"],
        }),
      ]),
    );

    expect(result.relatedCases[0]?.id).toBe("coffee-date");
  });

  it("returns an empty result when the case library cannot load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const analysisInput = input("我：你好\n对方：嗨");
    const emotion = analyzeEmotionFallback(analysisInput);
    const module = await import("./knowledge");
    const result = await module.retrieveKnowledge(analysisInput, emotion);

    expect(result).toEqual({
      relatedCases: [],
      clusterHints: [],
      caseCount: 0,
    });
  });
});
