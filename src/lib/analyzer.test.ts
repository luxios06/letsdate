import { describe, expect, it } from "vitest";
import { buildLocalAnalysis } from "./analyzer";
import { DEMO_SAMPLE } from "./demo";
import { validateReport } from "./report-schema";

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

  it("calibrates a warm short sample instead of returning near-certainty", () => {
    const report = buildLocalAnalysis({
      ...DEMO_SAMPLE,
      selfProfile: "平时喜欢摄影，也会主动约朋友看展。",
      otherProfile:
        "喜欢胶片摄影、爵士和夜跑，最近在学做饭。比起一直线上聊天，更想和同频的人做点具体的事。",
      chat: `我：你主页那组夜跑照片是在滨江拍的吗？
对方：对，蓝色时刻最好看。你也跑步吗？
对方：你周六一般有空吗？
对方：我看看拍摄安排，周四晚回你。
对方：那你先欠我一顿饭，后面验收你的咖喱`,
    });
    expect(report.compatibilityScore).toBeLessThanOrEqual(
      report.calibration.scoreCap,
    );
    expect(report.compatibility.score).toBe(report.compatibilityScore);
    expect(report.interest.score).toBeLessThan(100);
    expect(report.confidence).toBe("低");
    expect(report.action.messageOptions).toHaveLength(3);
    expect(report.action.nextMessage).toBe(
      report.action.messageOptions[0]?.text,
    );
    expect(report.person.mbti.candidate).toBe("待观察");
  });

  it("uses concrete day and chat topics in reply options", () => {
    const report = buildLocalAnalysis({
      ...DEMO_SAMPLE,
      otherProfile: "喜欢胶片摄影、小店和做饭。",
      chat: `我：最近在研究咖喱。
对方：我也在学做饭，你周六有空吗？
对方：我看看安排，周四晚回你。`,
    });
    const combined = report.action.messageOptions
      .map((option) => option.text)
      .join("\n");
    expect(combined).toContain("周四");
    expect(combined).toContain("咖喱");
    expect(combined).not.toContain("你之前提到的那个活动");
  });

  it("does not force a four-letter MBTI type from insufficient evidence", () => {
    const report = buildLocalAnalysis({
      ...DEMO_SAMPLE,
      selfProfile: "",
      otherProfile: "",
      chat: "我：你好\n对方：你好\n我：在忙吗\n对方：嗯",
    });
    expect(report.person.mbti.candidate).toBe("待观察");
    expect(
      report.person.mbti.dimensions.filter(
        (dimension) => dimension.status === "insufficient",
      ),
    ).toHaveLength(4);
  });

  it("always returns a schema-valid report", () => {
    const report = buildLocalAnalysis({
      ...DEMO_SAMPLE,
      chat: "我：周末有空吗？\n对方：我看看安排，周四回你。",
    });
    expect(() => validateReport(report)).not.toThrow();
  });

  it("samples long chats across conflict, repair and final agreement", () => {
    const report = buildLocalAnalysis({
      ...DEMO_SAMPLE,
      selfProfile:
        "慢热，但重视稳定回应和直接表达。喜欢电影、散步和做饭。",
      otherProfile:
        "喜欢胶片摄影、夜跑和小范围深聊，需要提前说清安排。",
      chat: `我：你主页那张夜跑照片是在滨江拍的吗？
对方：对，蓝色时刻最好看。你也跑步吗？
我：偶尔跑。你周末有空吗？
对方：我先看拍摄安排，周四回你。
对方：周六要拍摄，周日可以。
我：我以为你周六有空，有点失望。
对方：抱歉，是我没说清楚，不想让你等模糊答案。
我：我也有问题，嘴上说没关系其实憋着。
对方：以后直接说？我更怕猜。
对方：今天有点低电量，想安静一会儿。
我：好，你需要我时再找我。
对方：谢谢，这对我很重要。
对方：周日两点在展馆门口？
我：可以，看两小时？
对方：够了。之后找家小店，我主要想见你。
我：好，周日见。`,
    });
    const quotes = report.evidence.map((item) => item.quote).join("\n");
    expect(quotes).toContain("抱歉");
    expect(quotes).toContain("想见你");
    expect(report.compatibility.dimensions.find((item) => item.key === "pace")?.summary).toContain(
      "修复",
    );
    const replies = report.action.messageOptions.map((item) => item.text).join("\n");
    expect(replies).toContain("周日两点");
    expect(replies).toContain("展馆门口");
  });
});
