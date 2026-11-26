export interface OcrProgress {
  status: string;
  progress: number;
}

export async function recognizeScreenshot(
  file: File,
  onProgress: (progress: OcrProgress) => void,
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("chi_sim+eng", 1, {
    logger: (message) => {
      onProgress({
        status: message.status,
        progress: Math.round((message.progress ?? 0) * 100),
      });
    },
  });

  try {
    const result = await worker.recognize(file);
    return result.data.text
      .trim()
      .replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, "$1")
      .replace(/\s+([，。！？；：])/g, "$1");
  } finally {
    await worker.terminate();
  }
}
