import { describe, expect, it } from "vitest";
import {
  assessAttachment,
  parseConversation,
  sourceContainsQuote,
} from "./conversation";
import type { AnalysisInput } from "../types";

const baseInput: AnalysisInput = {
  relationshipLabel: "测试关系",
  selfProfile: "",
  otherProfile: "",
  chat: "",
  relationshipStage: "稳定聊天中",
  goal: "判断是否值得继续投入",
  consent: true,
};

describe("parseConversation", () => {
  it("parses timestamps and explicit day sessions", () => {
    const parsed = parseConversation(`2026-11-26 10:00 我：今天好累
[10:05] 对方：怎么了？
（第 2 天）
对方：现在好点了吗？`);
    expect(parsed.messages).toHaveLength(3);
    expect(parsed.sessions).toHaveLength(2);
    expect(parsed.timestampCoverage).toBeCloseTo(2 / 3);
    expect(parsed.messages[1]?.timestamp).toBe("10:05");
    expect(parsed.messages[1]?.replyLagMs).toBe(5 * 60 * 1000);
  });

  it("inherits the active date for bracket-only times", () => {
    const parsed = parseConversation(`2026-11-22 21:00 我：怎么了
[21:04] 对方：哦
[21:09] 对方：我现在不太想聊这个`);
    expect(parsed.messages[1]?.replyLagMs).toBe(4 * 60 * 1000);
    expect(parsed.messages[2]?.replyLagMs).toBe(5 * 60 * 1000);
  });

  it("treats a short reply with later recovery as acknowledgment", () => {
    const parsed = parseConversation(`我：今天提案又被推翻了
对方：听起来很消耗，你最烦哪一部分？
我：主要是需求一直变
对方：嗯
对方：那你先休息一下，晚点想吐槽再找我`);
    const reply = parsed.shortReplies.find((item) => item.quote === "嗯");
    expect(reply?.classification).toBe("acknowledgment");
    expect(reply?.afterEffect).toBe("recovered");
  });

  it("keeps repeated short replies uncertain or withdrawal-like, not certain", () => {
    const parsed = parseConversation(`我：今天怎么样？
对方：一般
我：周末有空吗？
对方：嗯
我：要不要一起吃饭？
对方：哦
我：那你有空再说
对方：好`);
    expect(parsed.shortReplies).toHaveLength(3);
    expect(
      parsed.shortReplies.every(
        (item) =>
          item.classification === "possible_withdrawal" ||
          item.classification === "uncertain" ||
          item.classification === "topic_closed",
      ),
    ).toBe(true);
    const attachment = assessAttachment(parsed.messages, parsed.shortReplies, "other");
    const avoidant = attachment.cues.find((cue) => cue.key === "avoidant");
    expect(avoidant?.status).toBe("insufficient");
    expect(attachment.summary).not.toContain("回避型人格");
  });

  it("recognizes cancellation after an earlier proposal", () => {
    const parsed = parseConversation(`对方：周日两点在展馆门口？
我：可以
对方：不行，我临时要加班，改天吧`);
    expect(parsed.planState.status).toBe("cancelled");
  });

  it("does not treat every mention of today as a plan", () => {
    const parsed = parseConversation(`我：我今天被临时改需求了
对方：听起来很烦
我：是的`);
    expect(parsed.planState.status).toBe("none");
  });

  it("uses nearby low-energy context for a short reply", () => {
    const parsed = parseConversation(`我：你今天还好吗？
对方：有点低电量，脑子转不动
我：那你先休息
对方：嗯
对方：晚点我再回你`);
    const reply = parsed.shortReplies.find((item) => item.quote === "嗯");
    expect(reply?.classification).toBe("low_energy");
  });

  it("does not label explained low energy as avoidant when repair follows", () => {
    const parsed = parseConversation(`我：你今天还好吗？
对方：有点低电量，想安静一会儿
我：好，你需要我时再找我
对方：谢谢理解，这对我很重要
对方：抱歉刚才回得短，不是故意冷淡
对方：以后忙的时候我会提前说`);
    const attachment = assessAttachment(parsed.messages, parsed.shortReplies, "other");
    const avoidant = attachment.cues.find((cue) => cue.key === "avoidant");
    expect(avoidant?.status).toBe("insufficient");
  });
});

describe("sourceContainsQuote", () => {
  it("accepts exact text and rejects paraphrase", () => {
    const input = {
      ...baseInput,
      chat: "我：今天好累\n对方：那你先休息，晚点再聊",
    };
    expect(sourceContainsQuote(input, "那你先休息，晚点再聊")).toBe(true);
    expect(sourceContainsQuote(input, "对方让我先休息然后晚点聊")).toBe(false);
  });
});
