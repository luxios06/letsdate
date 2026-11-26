import { describe, expect, it } from "vitest";
import { buildLocalAnalysis } from "./analyzer";
import { DEMO_SAMPLE } from "./demo";

describe("buildLocalAnalysis", () => {
  it("returns the curated report for the demo sample", () => {
    const report = buildLocalAnalysis(DEMO_SAMPLE);
    expect(report.person.mbti.candidate).toBe("ENFP");
    expect(report.decision).toBe("适度推进");
    expect(report.evidence.length).toBeGreaterThan(2);
  });

  it("keeps scores inside the 0 to 100 range", () => {
    const report = buildLocalAnalysis({
      ...DEMO_SAMPLE,
      chat: "对方：嗯嗯\n对方：忙\n我：好",
      otherProfile: "暂无",
      selfProfile: "暂无",
    });
    expect(report.compatibilityScore).toBeGreaterThanOrEqual(0);
    expect(report.compatibilityScore).toBeLessThanOrEqual(100);
    expect(report.interest.score).toBeGreaterThanOrEqual(0);
    expect(report.interest.score).toBeLessThanOrEqual(100);
  });

  it("does not present short material as high confidence", () => {
    const report = buildLocalAnalysis({
      ...DEMO_SAMPLE,
      chat: "我：你好\n对方：你好",
      otherProfile: "",
      selfProfile: "",
    });
    expect(report.confidence).toBe("低");
  });
});
