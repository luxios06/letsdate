export interface OcrProgress {
  status: string;
  progress: number;
}

export interface OcrExtractionResult {
  text: string;
  engine: "paddleocr-v6" | "tesseract-fallback";
  confidence: number;
  durationMs: number;
}

export interface ScreenshotFileLike {
  name: string;
  type: string;
  size: number;
}

export const MAX_SCREENSHOT_BATCH = 12;
export const MAX_SCREENSHOT_FILE_BYTES = 25 * 1024 * 1024;

export function normalizeOcrText(value: string) {
  return value
    .replace(/\r\n?/gu, "\n")
    .trim()
    .replace(/([\u4e00-\u9fff])[ \t]+(?=[\u4e00-\u9fff])/g, "$1")
    .replace(/[ \t]+([，。！？；：])/g, "$1")
    .replace(/([，。！？；：])[ \t]+/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

export function validateScreenshotFiles<T extends ScreenshotFileLike>(
  files: T[],
): Array<{ file: T; reason?: string }> {
  let acceptedCount = 0;
  return files.map((file) => {
    const looksLikeImage =
      file.type.startsWith("image/") ||
      /\.(?:png|jpe?g|webp|bmp|gif|heic|heif)$/iu.test(file.name);
    if (!looksLikeImage) return { file, reason: "不是受支持的图片格式" };
    if (file.size <= 0) return { file, reason: "图片为空" };
    if (file.size > MAX_SCREENSHOT_FILE_BYTES) {
      return { file, reason: "单张图片超过 25MB" };
    }
    if (acceptedCount >= MAX_SCREENSHOT_BATCH) {
      return { file, reason: `一次最多识别 ${MAX_SCREENSHOT_BATCH} 张` };
    }
    acceptedCount += 1;
    return { file };
  });
}

function overlapLength(previous: string[], next: string[]) {
  const maximum = Math.min(8, previous.length, next.length);
  for (let size = maximum; size > 0; size -= 1) {
    const previousTail = previous.slice(-size);
    const nextHead = next.slice(0, size);
    if (previousTail.every((line, index) => line === nextHead[index])) {
      return size;
    }
  }
  return 0;
}

export function mergeScreenshotTexts(segments: string[]) {
  let merged: string[] = [];
  for (const segment of segments) {
    const lines = normalizeOcrText(segment)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) continue;
    merged = merged.concat(lines.slice(overlapLength(merged, lines)));
  }
  return merged.join("\n");
}

export async function recognizeScreenshot(
  file: File,
  onProgress: (progress: OcrProgress) => void,
  layout: "text" | "chat" = "text",
): Promise<OcrExtractionResult> {
  const started = performance.now();
  try {
    const { recognizeWithPaddle } = await import("./ocr-paddle");
    const result = await recognizeWithPaddle(file, layout, (status) =>
      onProgress({ status, progress: 35 }),
    );
    onProgress({ status: "PaddleOCR 识别完成", progress: 100 });
    return {
      text: normalizeOcrText(result.text),
      engine: "paddleocr-v6",
      confidence: result.confidence,
      durationMs: Math.round(performance.now() - started),
    };
  } catch (paddleError) {
    console.warn("[OCR] PaddleOCR failed, using Tesseract fallback", paddleError);
    onProgress({
      status:
        paddleError instanceof Error
          ? `PaddleOCR 回退：${paddleError.message}`
          : "PaddleOCR 回退到 Tesseract",
      progress: 20,
    });
  }

  const { prepareScreenshot } = await import("./ocr-paddle");
  const prepared = await prepareScreenshot(file);
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("chi_sim+eng", 1, {
    logger: (message) => {
      onProgress({
        status: message.status,
        progress: 20 + Math.round((message.progress ?? 0) * 80),
      });
    },
  });
  try {
    const result = await worker.recognize(prepared.blob);
    return {
      text: normalizeOcrText(result.data.text),
      engine: "tesseract-fallback",
      confidence: (result.data.confidence ?? 0) / 100,
      durationMs: Math.round(performance.now() - started),
    };
  } finally {
    await worker.terminate();
  }
}
