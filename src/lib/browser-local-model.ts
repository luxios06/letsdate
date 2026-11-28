import type {
  ChatCompletionResponse,
  Wllama,
} from "@wllama/wllama";
import { z } from "zod";
import type {
  AnalysisInput,
  MessageInsight,
} from "../types";
import { parseConversation } from "./conversation";
import {
  buildLocalMessageInsights,
  type ExtractedMessageInsight,
  MESSAGE_CUES,
  MESSAGE_EMOTIONS,
  MESSAGE_INTENTS,
  mergeMessageInsights,
} from "./message-insights";

export interface BrowserModelProgress {
  status: string;
  percent: number;
}

export interface BrowserModelEnhancement {
  insights: MessageInsight[];
  modelUsed: boolean;
  warning: string;
}

const MODEL_URL =
  "https://modelscope.cn/models/Qwen/Qwen3-0.6B-GGUF/resolve/master/Qwen3-0.6B-Q8_0.gguf";
const MODEL_BYTES = 639_446_688;
const MODEL_READY_KEY = "letsdate.browser-model-ready.v1";
const MAX_MODEL_MESSAGES = 16;
const MESSAGE_BATCH_SIZE = 6;

const BrowserConfidence = z.any().transform((value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["中", "中等", "medium"].includes(normalized)) return "中" as const;
  if (["高", "较高", "high"].includes(normalized)) return "较高" as const;
  return "低" as const;
});

const LabelResponseSchema = z.object({
  labels: z
    .array(
      z.object({
        messageId: z.string().trim().min(1).max(80),
        quote: z.string().trim().min(1).max(500),
        emotion: z.enum(MESSAGE_EMOTIONS),
        intent: z.enum(MESSAGE_INTENTS),
        cue: z.enum(MESSAGE_CUES),
        confidence: BrowserConfidence,
        explanation: z.string().trim().max(400).catch("本地模型未提供解释。"),
      }),
    )
    .max(MESSAGE_BATCH_SIZE),
});

let instancePromise: Promise<Wllama> | null = null;
let loadedPromise: Promise<void> | null = null;
let progressListener: ((update: BrowserModelProgress) => void) | null = null;

function createWllama() {
  instancePromise ??= Promise.all([
    import("@wllama/wllama"),
    import("@wllama/wllama/esm/wasm/wllama.wasm?url"),
  ]).then(([module, wasm]) => {
    return new module.Wllama(
      { default: wasm.default },
      {
        logger: module.LoggerWithoutDebug,
        allowOffline: true,
        parallelDownloads: 4,
      },
    );
  });
  return instancePromise;
}

export function isBrowserLocalModelReady() {
  try {
    return localStorage.getItem(MODEL_READY_KEY) === "1";
  } catch {
    return false;
  }
}

async function resolveModelDownloadUrl() {
  const response = await fetch(MODEL_URL, {
    headers: { Range: "bytes=0-0" },
    cache: "no-store",
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`ModelScope 下载地址解析失败：HTTP ${response.status}`);
  }
  const resolved = response.url;
  await response.body?.cancel();
  if (!resolved || resolved === MODEL_URL) {
    throw new Error("ModelScope 没有返回可用的下载地址。");
  }
  return resolved;
}

async function findCachedModelBlob(wllama: Wllama): Promise<Blob | null> {
  const files = await wllama.cacheManager.list();
  const entry = files
    .filter(
      (file) =>
        file.size === MODEL_BYTES &&
        file.metadata.originalSize === MODEL_BYTES,
    )
    .at(-1);
  return entry ? wllama.cacheManager.open(entry.name) : null;
}

export async function loadBrowserLocalModel(
  onProgress?: (update: BrowserModelProgress) => void,
) {
  progressListener = onProgress ?? null;
  const wllama = await createWllama();
  if (wllama.isModelLoaded()) return wllama;
  if (!loadedPromise) {
    loadedPromise = (async () => {
      await navigator.storage?.persist?.().catch(() => false);
      onProgress?.({
        status: "检查本地模型缓存",
        percent: 2,
      });
      const loadOptions = {
        n_ctx: 4096,
        n_threads: 1,
        n_batch: 64,
        n_ubatch: 64,
        cache_type_k: "q8_0" as const,
        cache_type_v: "q8_0" as const,
      };
      const cached = await findCachedModelBlob(wllama);
      if (cached) {
        onProgress?.({
          status: "正在加载已缓存的 Qwen3-0.6B",
          percent: 68,
        });
        await wllama.loadModel([cached], loadOptions);
      } else {
        const downloadUrl = await resolveModelDownloadUrl();
        await wllama.cacheManager.download(downloadUrl, {
          progressCallback: ({ loaded, total }) => {
            const target = total > 0 ? total : MODEL_BYTES;
            const percent = Math.min(
              68,
              Math.max(2, Math.round((loaded / target) * 68)),
            );
            progressListener?.({
              status:
                loaded >= target
                  ? "本地模型下载完成，正在加载"
                  : `正在下载 Qwen3-0.6B ${percent}%`,
              percent,
            });
          },
          retries: 5,
          connections: 4,
        });
        const downloaded = await findCachedModelBlob(wllama);
        if (!downloaded) {
          throw new Error("模型下载完成，但无法从浏览器缓存中读取。");
        }
        await wllama.loadModel([downloaded], loadOptions);
      }
      localStorage.setItem(MODEL_READY_KEY, "1");
      progressListener?.({
        status: "本地模型已加载",
        percent: 72,
      });
    })().catch((error) => {
      loadedPromise = null;
      throw error;
    });
  }
  await loadedPromise;
  return wllama;
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/iu);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("本地模型没有返回可解析的 JSON");
  }
  return JSON.parse(raw.slice(start, end + 1)) as unknown;
}

function responseText(response: ChatCompletionResponse) {
  const content = response.choices[0]?.message.content;
  return typeof content === "string" ? content : "";
}

async function labelBatch(
  wllama: Wllama,
  messages: ReturnType<typeof parseConversation>["messages"],
  batch: ReturnType<typeof parseConversation>["messages"],
) {
  const payload = batch.map((message) => {
    const index = messages.findIndex((item) => item.id === message.id);
    return {
      messageId: message.id,
      quote: message.text,
      sender: message.sender,
      context: messages
        .slice(Math.max(0, index - 2), index)
        .map((item) => `${item.sender === "self" ? "我" : "对方"}：${item.text}`)
        .join("\n"),
    };
  });
  const response = await wllama.createChatCompletion({
    stream: false,
    messages: [
      {
        role: "system",
        content: `你是逐消息标注器。只输出 JSON，格式为 {"labels":[...]}。
每条消息输出一个对象：messageId、quote、emotion、intent、cue、confidence、explanation。
emotion 只能取：${MESSAGE_EMOTIONS.join("、")}。
intent 只能取：${MESSAGE_INTENTS.join("、")}。
cue 只能取：${MESSAGE_CUES.join("、")}。
confidence 只能取：低、中、较高。
quote 必须逐字复制输入。标签描述字面表达，不诊断人格或隐藏动机。控制、定位、查手机、隔离社交优先标为风险。`,
      },
      {
        role: "user",
        content: JSON.stringify({ messages: payload }),
      },
    ],
    max_tokens: 900,
    temperature: 0.1,
    top_k: 40,
    top_p: 0.9,
    response_format: { type: "json_object" },
    chat_template_kwargs: { enable_thinking: false },
  });
  return LabelResponseSchema.parse(extractJson(responseText(response))).labels;
}

export async function enhanceMessageInsightsWithBrowserModel(
  input: AnalysisInput,
  onProgress?: (update: BrowserModelProgress) => void,
): Promise<BrowserModelEnhancement> {
  const parsed = parseConversation(input.chat);
  const local = buildLocalMessageInsights(parsed.messages);
  if (!parsed.messages.length) {
    return {
      insights: local,
      modelUsed: false,
      warning: "没有可标注的消息。",
    };
  }
  try {
    const wllama = await loadBrowserLocalModel(onProgress);
    const selected = parsed.messages.slice(0, MAX_MODEL_MESSAGES);
    const extracted: ExtractedMessageInsight[] = [];
    for (
      let offset = 0;
      offset < selected.length;
      offset += MESSAGE_BATCH_SIZE
    ) {
      const percent = 72 + Math.round((offset / selected.length) * 26);
      onProgress?.({
        status: `本地模型标注 ${Math.min(offset + 1, selected.length)}-${Math.min(offset + MESSAGE_BATCH_SIZE, selected.length)} 条消息`,
        percent,
      });
      extracted.push(
        ...(await labelBatch(
          wllama,
          parsed.messages,
          selected.slice(offset, offset + MESSAGE_BATCH_SIZE),
        )),
      );
    }
    onProgress?.({
      status: "本地消息标签完成",
      percent: 100,
    });
    return {
      insights: mergeMessageInsights(
        local,
        extracted,
        "browser-local",
        parsed.messages,
      ),
      modelUsed: true,
      warning:
        parsed.messages.length > MAX_MODEL_MESSAGES
          ? `浏览器本地模型只增强了前 ${MAX_MODEL_MESSAGES} 条消息，其余消息使用本地规则。`
          : "",
    };
  } catch (error) {
    return {
      insights: local,
      modelUsed: false,
      warning: `浏览器本地模型不可用，已回退到本地规则：${
        error instanceof Error ? error.message : "未知错误"
      }`,
    };
  }
}

export async function clearBrowserLocalModel() {
  try {
    const wllama = await createWllama();
    if (wllama.isModelLoaded()) {
      await wllama.exit();
    }
    await wllama.cacheManager.clear();
  } finally {
    loadedPromise = null;
    instancePromise = null;
    localStorage.removeItem(MODEL_READY_KEY);
  }
}
