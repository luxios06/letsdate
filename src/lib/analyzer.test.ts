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
    expect(() => validateReport(report)).not.toThrow();
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
    expect(report.person.mbti.candidate).toMatch(/^[EI][SN][TF][JP]$/);
    expect(["低", "中"]).toContain(report.person.mbti.confidence);
    expect(report.person.mbti.alternatives.length).toBeGreaterThan(0);
    expect(report.person.mbti.summary).toContain(
      report.person.mbti.candidate,
    );
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

  it("uses 待观察 only when the text contains no personality signal", () => {
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

  it("infers the other person's type only from that person's own messages", () => {
    const report = buildLocalAnalysis({
      ...DEMO_SAMPLE,
      selfProfile: "喜欢聚会、热闹、未来想象和临时探索。",
      otherProfile: "慢热，喜欢独处、安静和小范围交流。",
      chat: `我：我们一起去聚会吧，想象一下未来，感觉会很热闹
对方：我喜欢独处和安静
对方：具体安排、时间地点和逻辑方案都要确认
对方：计划确定后我会提前告诉你，周日两点门口见`,
    });
    expect(report.person.mbti.candidate).toBe("ISTJ");
    expect(report.person.mbti.summary).toContain("ISTJ");
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

  it("does not invent a curry when it never appears in the source", () => {
    const report = buildLocalAnalysis({
      ...DEMO_SAMPLE,
      selfProfile: "喜欢散步和看电影。",
      otherProfile: "喜欢摄影和看展。",
      chat: `我：周日要不要去看展？
对方：可以，周日两点展馆门口见。`,
    });
    const replies = report.action.messageOptions.map((item) => item.text).join("\n");
    expect(replies).toContain("展馆");
    expect(replies).not.toContain("咖喱");
  });

  it("keeps a confirmed mutual plan actionable without overstating confidence", () => {
    const report = buildLocalAnalysis({
      ...DEMO_SAMPLE,
      selfProfile: "表达直接，希望得到清楚回应。",
      otherProfile: "慢热，但更看重具体行动和稳定兑现。",
      chat: `我：最近有点想你
对方：我也是，周日想见你
我：那一起吃饭？
对方：好，我查了展馆附近的小店
对方：周日两点展馆门口见`,
    });
    expect(["先观察", "适度推进"]).toContain(report.decision);
    expect(report.confidence).toBe("低");
    expect(report.action.nextMessage).toContain("周日");
  });

  it("forces control risk to pause and returns a boundary message", () => {
    const report = buildLocalAnalysis({
      ...DEMO_SAMPLE,
      selfProfile: "需要个人空间，不接受查手机或限制正常社交。",
      otherProfile: "会用吃醋和关心要求报备。",
      chat: `对方：把定位一直开着
我：不太舒服
对方：你爱我就应该让我查手机
对方：以后别和那个朋友联系
我：这不行，我需要边界`,
    });
    expect(report.decision).toBe("暂缓推进");
    expect(report.action.decision).toBe("暂缓推进");
    expect(report.compatibilityScore).toBeLessThanOrEqual(32);
    expect(report.action.nextMessage).toContain("隐私");
    expect(
      report.compatibility.dimensions.find(
        (dimension) => dimension.key === "boundaries",
      )?.score,
    ).toBeLessThanOrEqual(20);
    expect(report.safetyNotes.join("\n")).toContain("查手机");
  });
});
