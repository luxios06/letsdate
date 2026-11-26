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
