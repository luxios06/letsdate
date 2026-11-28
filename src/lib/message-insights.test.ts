import { describe, expect, it } from "vitest";
import { buildLocalAnalysis } from "./analyzer";
import { parseConversation } from "./conversation";
import { DEMO_SAMPLE } from "./demo";
import {
  buildLocalMessageInsights,
  mergeMessageInsights,
} from "./message-insights";

describe("per-message emotion and intent labels", () => {
  it("labels control, repair, plans and short replies from local rules", () => {
    const parsed = parseConversation(`我：这周末见吗？
对方：抱歉，我临时加班，周日两点可以
我：好
对方：把定位一直开着，以后别和朋友联系`);
    const insights = buildLocalMessageInsights(parsed.messages);

    expect(insights[1]?.intent).toBe("修复");
    expect(insights[1]?.cue).toBe("修复");
    expect(insights[2]?.intent).toBe("回应");
    expect(insights[3]?.intent).toBe("控制要求");
    expect(insights[3]?.cue).toBe("风险");
    expect(insights.every((item) => item.source === "local-rules")).toBe(true);
  });

  it("uses a model label only when its quote exactly matches the message", () => {
    const parsed = parseConversation("我：周末见？\n对方：周日两点可以");
    const local = buildLocalMessageInsights(parsed.messages);
    const merged = mergeMessageInsights(
      local,
      [
        {
          messageId: "msg-2",
          quote: "周日两点可以",
          emotion: "期待",
          intent: "确认计划",
          cue: "稳定",
          confidence: "中",
          explanation: "模型确认这是具体计划。",
        },
      ],
      "local-llm",
      parsed.messages,
    );
    expect(merged[1]?.source).toBe("local-llm");
    expect(merged[1]?.intent).toBe("确认计划");

    const invalid = mergeMessageInsights(
      local,
      [
        {
          messageId: "msg-2",
          quote: "改过的原文",
          emotion: "期待",
          intent: "确认计划",
          cue: "稳定",
          confidence: "中",
          explanation: "无效引用",
        },
      ],
      "provider",
      parsed.messages,
    );
    expect(invalid[1]?.source).toBe("local-rules");
  });

  it("distinguishes a complaint from a rejected plan", () => {
    const parsed = parseConversation(
      "我：你临时取消没提前说，我有点失落",
    );
    const [insight] = buildLocalMessageInsights(parsed.messages);
    expect(insight?.intent).toBe("表达不满");
    expect(insight?.cue).toBe("冲突");
  });

  it("never lets a model downgrade a local control-risk label", () => {
    const parsed = parseConversation("对方：把定位一直开着，手机给我查");
    const local = buildLocalMessageInsights(parsed.messages);
    const merged = mergeMessageInsights(
      local,
      [
        {
          messageId: "msg-1",
          quote: "把定位一直开着，手机给我查",
          emotion: "平静",
          intent: "了解",
          cue: "稳定",
          confidence: "低",
          explanation: "模型误判为普通询问。",
        },
      ],
      "browser-local",
      parsed.messages,
    );
    expect(merged[0]?.cue).toBe("风险");
    expect(merged[0]?.intent).toBe("控制要求");
    expect(merged[0]?.source).toBe("local-rules");
  });

  it("includes local message labels in every analysis report", () => {
    const report = buildLocalAnalysis({
      ...DEMO_SAMPLE,
      relationshipLabel: "消息标签测试",
      chat: "我：周末有空吗？\n对方：周日两点展馆门口见",
    });
    expect(report.messageInsights.length).toBe(2);
    expect(report.messageInsights[1]?.quote).toContain("周日两点");
  });
});
