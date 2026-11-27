import { describe, expect, it } from "vitest";
import { assemblePaddleText } from "./ocr-paddle";
import {
  MAX_SCREENSHOT_BATCH,
  mergeScreenshotTexts,
  normalizeOcrText,
  validateScreenshotFiles,
} from "./ocr";

describe("PaddleOCR text assembly", () => {
  it("sorts boxes by row then x", () => {
    const text = assemblePaddleText(
      [
        {
          text: "第二行",
          score: 0.9,
          poly: [
            [20, 60],
            [100, 60],
            [100, 80],
            [20, 80],
          ],
        },
        {
          text: "第一行",
          score: 0.9,
          poly: [
            [20, 20],
            [100, 20],
            [100, 40],
            [20, 40],
          ],
        },
      ],
      300,
      "text",
    );
    expect(text).toBe("第一行\n第二行");
  });

  it("infers chat speakers from bubble side", () => {
    const text = assemblePaddleText(
      [
        {
          text: "你周末有空吗？",
          score: 0.9,
          poly: [
            [20, 20],
            [140, 20],
            [140, 40],
            [20, 40],
          ],
        },
        {
          text: "周日下午可以",
          score: 0.9,
          poly: [
            [210, 60],
            [370, 60],
            [370, 80],
            [210, 80],
          ],
        },
      ],
      400,
      "chat",
    );
    expect(text).toContain("对方：你周末有空吗？");
    expect(text).toContain("我：周日下午可以");
  });

  it("merges wrapped bubble lines before assigning a speaker", () => {
    const text = assemblePaddleText(
      [
        {
          text: "你今天还好吗？我有点",
          score: 0.95,
          poly: [
            [40, 20],
            [280, 20],
            [280, 50],
            [40, 50],
          ],
        },
        {
          text: "低电量",
          score: 0.95,
          poly: [
            [40, 58],
            [150, 58],
            [150, 88],
            [40, 88],
          ],
        },
      ],
      400,
      "chat",
    );
    expect(text).toBe("对方：你今天还好吗？我有点低电量");
  });
});

describe("normalizeOcrText", () => {
  it("removes spaces between Chinese characters and punctuation gaps", () => {
    expect(
      normalizeOcrText("我 们 周 日 见 ， 好 吗 ？\n对 方：可 以"),
    ).toBe("我们周日见，好吗？\n对方：可以");
  });
});

describe("batch screenshot import", () => {
  it("removes repeated boundary messages while preserving order", () => {
    expect(
      mergeScreenshotTexts([
        "对方：你今天还好吗？\n我：有点累",
        "我：有点累\n对方：那你先休息\n对方：晚点再聊",
        "对方：晚点再聊\n我：好",
      ]),
    ).toBe(
      "对方：你今天还好吗？\n我：有点累\n对方：那你先休息\n对方：晚点再聊\n我：好",
    );
  });

  it("keeps legitimate repeated lines inside one screenshot", () => {
    expect(
      mergeScreenshotTexts(["对方：嗯\n对方：嗯\n我：好"]),
    ).toBe("对方：嗯\n对方：嗯\n我：好");
  });

  it("validates count, format and size in selection order", () => {
    const valid = Array.from({ length: MAX_SCREENSHOT_BATCH + 1 }, (_, index) => ({
      name: `chat-${String(index + 1).padStart(2, "0")}.png`,
      type: "image/png",
      size: 1024,
    }));
    const checked = validateScreenshotFiles([
      { name: "notes.txt", type: "text/plain", size: 40 },
      ...valid,
      { name: "large.jpg", type: "image/jpeg", size: 26 * 1024 * 1024 },
    ]);

    expect(checked.slice(1, MAX_SCREENSHOT_BATCH + 1).every((item) => !item.reason)).toBe(
      true,
    );
    expect(checked[0]?.reason).toContain("图片格式");
    expect(checked[MAX_SCREENSHOT_BATCH + 1]?.reason).toContain("最多");
    expect(checked.at(-1)?.reason).toContain("25MB");
  });
});
