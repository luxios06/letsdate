import type { Point2D } from "@paddleocr/paddleocr-js";

export interface PaddleOcrLine {
  text: string;
  score: number;
  poly: Point2D[];
}

export interface PreparedScreenshot {
  blob: Blob;
  width: number;
  height: number;
}

export interface PaddleOcrOutput {
  text: string;
  confidence: number;
  lines: PaddleOcrLine[];
  durationMs: number;
}

const NOISE =
  /^(?:发送|按住说话|输入消息|表情|语音|相册|拍摄|取消|返回|(?:今天|昨天|前天|周[一二三四五六日天])?\s*\d{1,2}:\d{2}|[0-9%]+)$/u;
let enginePromise: ReturnType<typeof createEngine> | null = null;

function centerY(line: PaddleOcrLine) {
  return line.poly.reduce((sum, point) => sum + point[1], 0) / line.poly.length;
}

function centerX(line: PaddleOcrLine) {
  return line.poly.reduce((sum, point) => sum + point[0], 0) / line.poly.length;
}

export async function prepareScreenshot(file: File | Blob): Promise<PreparedScreenshot> {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const shortest = Math.min(bitmap.width, bitmap.height);
  const scale = Math.min(
    2.4,
    Math.max(1, Math.min(2, 900 / Math.max(shortest, 1)), 1600 / Math.max(longest, 1)),
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    bitmap.close();
    throw new Error("浏览器无法创建图片处理画布。");
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.filter = "contrast(1.12) brightness(1.02)";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (value) resolve(value);
        else reject(new Error("截图预处理失败。"));
      },
      "image/png",
      1,
    );
  });
  return { blob, width, height };
}

function createEngine() {
  return import("@paddleocr/paddleocr-js").then(({ PaddleOCR }) =>
    PaddleOCR.create({
        lang: "ch",
        ocrVersion: "PP-OCRv6",
        worker: false,
        textDetectionBatchSize: 2,
        textRecognitionBatchSize: 8,
        ortOptions: {
          backend: "wasm",
          wasmPaths: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/",
          numThreads: 1,
          simd: true,
        },
      }),
  );
}

function getEngine() {
  if (!enginePromise) enginePromise = createEngine();
  return enginePromise;
}

export function assemblePaddleText(
  lines: PaddleOcrLine[],
  width: number,
  layout: "text" | "chat",
) {
  const sorted = [...lines]
    .filter((line) => line.text.trim() && line.score >= 0.35)
    .sort((a, b) => {
      const rowDelta = centerY(a) - centerY(b);
      return Math.abs(rowDelta) > 12 ? rowDelta : centerX(a) - centerX(b);
    });
  const usable = sorted.filter((line) => !NOISE.test(line.text.trim()));
  if (layout === "text") {
    return usable.map((line) => line.text.trim()).join("\n");
  }

  const grouped: Array<{
    side: "self" | "other";
    lines: PaddleOcrLine[];
    top: number;
    bottom: number;
  }> = [];
  for (const line of usable) {
    const side = centerX(line) / Math.max(width, 1) >= 0.5 ? "self" : "other";
    const ys = line.poly.map((point) => point[1]);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    const height = Math.max(1, bottom - top);
    const previous = grouped.at(-1);
    if (
      previous &&
      previous.side === side &&
      top - previous.bottom <= Math.max(28, height * 0.75)
    ) {
      previous.lines.push(line);
      previous.bottom = Math.max(previous.bottom, bottom);
    } else {
      grouped.push({ side, lines: [line], top, bottom });
    }
  }
  return grouped
    .map((group) => {
      const text = group.lines
        .map((line) => line.text.trim())
        .reduce((value, part) => {
          if (!value) return part;
          if (/^(?:我|对方)[:：]/u.test(part)) return `${value}\n${part}`;
          if (/[A-Za-z0-9]$/u.test(value) && /^[A-Za-z0-9]/u.test(part)) {
            return `${value} ${part}`;
          }
          return `${value}${part}`;
        }, "");
      if (/^(?:我|对方)[:：]/u.test(text)) return text;
      return `${group.side === "self" ? "我" : "对方"}：${text}`;
    })
    .join("\n");
}

export async function recognizeWithPaddle(
  file: File | Blob,
  layout: "text" | "chat",
  onProgress?: (message: string) => void,
): Promise<PaddleOcrOutput> {
  const started = performance.now();
  onProgress?.("正在加载 PaddleOCR 中文模型");
  const prepared = await prepareScreenshot(file);
  onProgress?.("正在进行中文文字检测");
  const engine = await getEngine();
  const results = await engine.predict(prepared.blob, {
    textDetLimitSideLen: 1600,
    textDetLimitType: "max",
    textDetBoxThresh: 0.55,
    textDetThresh: 0.3,
    textDetUnclipRatio: 1.6,
    textRecScoreThresh: 0.35,
  });
  const result = results[0];
  if (!result) throw new Error("PaddleOCR 没有返回识别结果。");
  const lines: PaddleOcrLine[] = result.items.map((item) => ({
    text: item.text,
    score: item.score,
    poly: item.poly,
  }));
  const text = assemblePaddleText(lines, prepared.width, layout);
  if (!text.trim()) throw new Error("PaddleOCR 未识别到可用文字。");
  const confidence =
    lines.length > 0
      ? lines.reduce((sum, line) => sum + line.score, 0) / lines.length
      : 0;
  return {
    text,
    confidence,
    lines,
    durationMs: Math.round(performance.now() - started),
  };
}
