const baseUrl = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const model = process.env.OLLAMA_MODEL ?? "letsdate-qwen3:0.6b";

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${path} -> HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : {};
}

try {
  const tags = await request("/api/tags");
  const names = (tags.models ?? []).map((item) => item.name);
  if (!names.includes(model)) {
    throw new Error(`Ollama 中未找到 ${model}。已安装模型：${names.join(", ")}`);
  }
  const result = await request("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      options: { temperature: 0, num_predict: 32 },
      messages: [
        {
          role: "user",
          content: "只回复 JSON：{\"ok\":true}",
        },
      ],
    }),
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        model,
        response: result.message?.content ?? "",
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(`本机模型检查失败：${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
