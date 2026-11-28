import { describe, expect, it } from "vitest";
import type { AnalysisInput } from "../types";
import {
  analyzeEmotionFallback,
} from "./emotion-analysis";

const input = (chat: string): AnalysisInput => ({
  relationshipLabel: "测试关系",
  selfProfile: "",
  otherProfile: "",
  chat,
  relationshipStage: "刚匹配",
  goal: "判断关系信号",
  consent: true,
});

describe("emotion and intimacy analysis", () => {
  it("still gives advice and missing information for a very short chat", () => {
    const result = analyzeEmotionFallback(input("我：你好\n对方：嗯"));
    expect(result.quickRead.suggestion.length).toBeGreaterThan(20);
    expect(result.quickRead.missingInformation.length).toBeGreaterThan(0);
    expect(result.categories.every((category) => category.count === 0)).toBe(true);
  });

  it("detects closeness and flirtation in a short exchange", () => {
    const result = analyzeEmotionFallback(
      input("我：我有点想你\n对方：周末想见你，主要想见你"),
    );
    expect(
      result.intimacySignals.some((signal) => signal.key === "closeness"),
    ).toBe(true);
    expect(
      result.intimacySignals.some((signal) => signal.key === "flirtation"),
    ).toBe(true);
    expect(result.quickRead.headline).toContain("亲密");
    expect(result.valence).toBeGreaterThan(0);
    expect(
      result.categories.find((category) => category.key === "sadness")?.score ?? 0,
    ).toBeLessThan(20);
  });

  it("recognizes withdrawal as a state rather than a personality label", () => {
    const result = analyzeEmotionFallback(
      input("对方：今天低电量，不想聊，晚点再说"),
    );
    expect(
      result.intimacySignals.some((signal) => signal.key === "withdrawal"),
    ).toBe(true);
    expect(result.quickRead.suggestion).toContain("休息");
    expect(result.quickRead.headline).not.toContain("回避型");
  });

  it("prioritizes control and boundary risk", () => {
    const result = analyzeEmotionFallback(
      input("对方：把定位打开，手机给我查，不许和别人联系"),
    );
    expect(result.quickRead.headline).toContain("控制");
    expect(result.quickRead.suggestion).toContain("边界");
  });

  it("treats an apology and follow-up adjustment as repair, not a boundary violation", () => {
    const result = analyzeEmotionFallback(
      input(`我：你临时取消没提前说，我有点失落
对方：抱歉，我应该早点告诉你
我：我也不想憋着不说
对方：以后有变化我提前说
我：好，这次先翻篇
对方：谢谢你直接讲，周日我重新安排`),
    );
    expect(result.quickRead.headline).toContain("修复");
    expect(result.quickRead.suggestion).toContain("后续行动");
  });

  it("estimates positive and negative valence", () => {
    const positive = analyzeEmotionFallback(
      input("我：今天很开心，也很期待见你"),
    );
    const negative = analyzeEmotionFallback(
      input("我：今天很难过，也很失望"),
    );
    expect(positive.valence).toBeGreaterThan(negative.valence);
  });
});
