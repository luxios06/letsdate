import type { AnalysisInput, AnalysisReport, ProviderSettings } from "../types";
import { buildLocalAnalysis } from "./analyzer";

const PROVIDER_DEFAULTS: Record<
  ProviderSettings["provider"],
  Pick<ProviderSettings, "baseUrl" | "model">
> = {
  demo: { baseUrl: "", model: "内置演示分析" },
  deepseek: { baseUrl: "https://api.deepseek.com", model: "deepseek-chat" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini" },
  anthropic: { baseUrl: "https://api.anthropic.com", model: "claude-sonnet-4-5" },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.5-flash",
  },
  ollama: { baseUrl: "http://localhost:11434", model: "qwen3:8b" },
  custom: { baseUrl: "https://api.example.com/v1", model: "your-model" },
};

export const PROVIDER_LABELS: Record<ProviderSettings["provider"], string> = {
  demo: "本地演示",
  deepseek: "DeepSeek",
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Gemini",
  ollama: "Ollama",
  custom: "OpenAI 兼容接口",
};

export function getProviderDefaults(provider: ProviderSettings["provider"]) {
  return PROVIDER_DEFAULTS[provider];
}

const trimSlash = (value: string) => value.replace(/\/+$/, "");

const resolveEndpoint = (baseUrl: string, suffix: string) => {
  const base = trimSlash(baseUrl);
  return base.endsWith(suffix) ? base : `${base}${suffix}`;
};

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("模型没有返回可解析的 JSON。");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function mergeWithFallback(raw: unknown, input: AnalysisInput, provider: ProviderSettings["provider"]): AnalysisReport {
  const fallback = buildLocalAnalysis(input, provider);
  if (!raw || typeof raw !== "object") return fallback;
  const candidate = raw as Partial<AnalysisReport>;
  return {
    ...fallback,
    ...candidate,
    id: fallback.id,
    createdAt: new Date().toISOString(),
    provider,
    person: {
      ...fallback.person,
      ...(candidate.person ?? {}),
      mbti: {
        ...fallback.person.mbti,
        ...(candidate.person?.mbti ?? {}),
      },
      bigFive: candidate.person?.bigFive?.length
        ? candidate.person.bigFive
        : fallback.person.bigFive,
    },
    self: {
      ...fallback.self,
      ...(candidate.self ?? {}),
      mbti: {
        ...fallback.self.mbti,
        ...(candidate.self?.mbti ?? {}),
      },
      bigFive: candidate.self?.bigFive?.length
        ? candidate.self.bigFive
        : fallback.self.bigFive,
    },
    compatibility: {
      ...fallback.compatibility,
      ...(candidate.compatibility ?? {}),
      dimensions: candidate.compatibility?.dimensions?.length
        ? candidate.compatibility.dimensions
        : fallback.compatibility.dimensions,
    },
    interest: {
      ...fallback.interest,
      ...(candidate.interest ?? {}),
    },
    action: {
      ...fallback.action,
      ...(candidate.action ?? {}),
    },
    evidence: candidate.evidence?.length ? candidate.evidence : fallback.evidence,
    uncertainties: candidate.uncertainties?.length
      ? candidate.uncertainties
      : fallback.uncertainties,
    safetyNotes: candidate.safetyNotes?.length
      ? candidate.safetyNotes
      : fallback.safetyNotes,
  };
}

export async function loadSkillPrompt(): Promise<string> {
  const response = await fetch(`${import.meta.env.BASE_URL}skill/SKILL.md`, {
    cache: "force-cache",
  });
  if (!response.ok) {
    throw new Error("分析 Skill 加载失败，请刷新页面后重试。");
  }
  return response.text();
}

const buildUserPayload = (input: AnalysisInput) =>
  JSON.stringify(
    {
      task: "分析双方主页和聊天材料，输出 letsdate AnalysisReport JSON。",
      input: {
        self_profile: input.selfProfile,
        other_profile: input.otherProfile,
        chat_transcript: input.chat,
        relationship_stage: input.relationshipStage,
        user_goal: input.goal,
      },
      requirements: [
        "只输出一个 JSON 对象，不要使用 Markdown。",
        "所有判断必须绑定证据，并将事实观察与推断分开。",
        "人格判断使用低、中、较高置信度，不允许伪造确定性。",
        "MBTI 只作为透镜，同时给出大五人格和互动模式。",
        "关系建议必须尊重边界，不提供操控、跟踪或欺骗策略。",
      ],
    },
    null,
    2,
  );

const friendlyError = (error: unknown) => {
  if (error instanceof TypeError) {
    return "模型接口无法连接，可能是网络、CORS 或 Base URL 配置问题。可以切回本地演示继续体验。";
  }
  if (error instanceof Error) return error.message;
  return "模型请求失败，请检查配置后重试。";
};

async function requestOpenAICompatible(
  settings: ProviderSettings,
  systemPrompt: string,
  input: AnalysisInput,
) {
  const endpoint = resolveEndpoint(settings.baseUrl, "/chat/completions");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;
  const body: Record<string, unknown> = {
    model: settings.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildUserPayload(input) },
    ],
    temperature: 0.2,
  };
  if (settings.provider === "deepseek" || settings.provider === "openai") {
    body.response_format = { type: "json_object" };
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`模型接口返回 ${response.status}：${detail.slice(0, 180)}`);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

async function requestAnthropic(
  settings: ProviderSettings,
  systemPrompt: string,
  input: AnalysisInput,
) {
  const endpoint = resolveEndpoint(settings.baseUrl, "/v1/messages");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey ?? "",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 6000,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: "user", content: buildUserPayload(input) }],
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Anthropic 返回 ${response.status}：${detail.slice(0, 180)}`);
  }
  const data = (await response.json()) as {
    content?: Array<{ text?: string }>;
  };
  return data.content?.map((item) => item.text ?? "").join("") ?? "";
}

async function requestGemini(
  settings: ProviderSettings,
  systemPrompt: string,
  input: AnalysisInput,
) {
  const base = trimSlash(settings.baseUrl);
  const endpoint = `${base}/models/${encodeURIComponent(settings.model)}:generateContent?key=${encodeURIComponent(settings.apiKey ?? "")}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: buildUserPayload(input) }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini 返回 ${response.status}：${detail.slice(0, 180)}`);
  }
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return (
    data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ??
    ""
  );
}

async function requestOllama(
  settings: ProviderSettings,
  systemPrompt: string,
  input: AnalysisInput,
) {
  const endpoint = resolveEndpoint(settings.baseUrl, "/api/chat");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.model,
      stream: false,
      format: "json",
      options: { temperature: 0.2 },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildUserPayload(input) },
      ],
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Ollama 返回 ${response.status}：${detail.slice(0, 180)}`);
  }
  const data = (await response.json()) as {
    message?: { content?: string };
  };
  return data.message?.content ?? "";
}

export async function analyzeWithProvider(
  input: AnalysisInput,
  settings: ProviderSettings,
): Promise<AnalysisReport> {
  if (settings.provider === "demo") {
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    return buildLocalAnalysis(input, "demo");
  }
  if (!settings.model.trim()) throw new Error("请先填写模型名称。");
  if (settings.provider !== "ollama" && !settings.apiKey?.trim()) {
    throw new Error("请先填写 API Key，或切换到本地演示。");
  }

  try {
    const systemPrompt = await loadSkillPrompt();
    let output = "";
    if (settings.provider === "anthropic") {
      output = await requestAnthropic(settings, systemPrompt, input);
    } else if (settings.provider === "gemini") {
      output = await requestGemini(settings, systemPrompt, input);
    } else if (settings.provider === "ollama") {
      output = await requestOllama(settings, systemPrompt, input);
    } else {
      output = await requestOpenAICompatible(settings, systemPrompt, input);
    }
    return mergeWithFallback(extractJson(output), input, settings.provider);
  } catch (error) {
    throw new Error(friendlyError(error));
  }
}
