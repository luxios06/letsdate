import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyzeWithProvider,
  validateProviderSettings,
} from "./providers";
import { buildLocalAnalysis } from "./analyzer";

const base = {
  provider: "custom" as const,
  baseUrl: "https://api.example.com/v1",
  model: "example-model",
  rememberKey: false,
  apiKey: "test-key",
};

describe("validateProviderSettings", () => {
  it("accepts a bounded HTTPS provider", () => {
    const checked = validateProviderSettings(base);
    expect(checked.baseUrl).toBe("https://api.example.com/v1");
    expect(checked.model).toBe("example-model");
  });

  it("rejects remote HTTP endpoints", () => {
    expect(() =>
      validateProviderSettings({ ...base, baseUrl: "http://api.example.com/v1" }),
    ).toThrow(/HTTPS/);
  });

  it("rejects credentials or query strings in the base URL", () => {
    expect(() =>
      validateProviderSettings({
        ...base,
        baseUrl: "https://user:pass@api.example.com/v1?x=1",
      }),
    ).toThrow(/Base URL/);
  });

  it("requires a key outside local Ollama", () => {
    expect(() =>
      validateProviderSettings({ ...base, apiKey: "" }),
    ).toThrow(/API Key/);
    expect(
      validateProviderSettings({
        ...base,
        provider: "ollama",
        baseUrl: "http://localhost:11434",
        apiKey: "",
      }).baseUrl,
    ).toBe("http://localhost:11434");
  });
});

describe("two-stage provider pipeline", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts exact facts before synthesizing the report", async () => {
    const input = {
      relationshipLabel: "测试关系",
      selfProfile: "我比较慢热，但会认真回应。",
      otherProfile: "喜欢摄影和小范围深聊。",
      chat: "我：周末有空吗？\n对方：周六要拍摄，周日可以。",
      relationshipStage: "稳定聊天中",
      goal: "判断是否值得继续投入",
      consent: true,
    };
    const local = buildLocalAnalysis(input, "custom");
    let providerCalls = 0;
    const synthesisPayloads: string[] = [];
    const mockFetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const textUrl = String(url);
      if (textUrl.endsWith(".md")) {
        return new Response("# approved skill", { status: 200 });
      }
      if (textUrl.endsWith("cnsenti-lexicon.json")) {
        return Response.json({
          source: {
            project: "test",
            license: "MIT",
            dictionary: "test",
            url: "https://example.com",
          },
          categories: {
            good: [],
            joy: [],
            sadness: [],
            anger: [],
            fear: [],
            disgust: [],
            surprise: [],
          },
          modifiers: {
            deny: [],
            extreme: [],
            very: [],
            more: [],
            ish: [],
          },
        });
      }
      if (textUrl.endsWith("knowledge/cases.json")) {
        return Response.json({
          version: "test",
          caseCount: 1,
          clusters: [{ label: "计划、请求与协商", count: 1 }],
          manifest: {},
          cases: [
            {
              id: "test-plan",
              source: "letsdate-synthetic",
              license: "CC0-1.0",
              title: "周末计划协商",
              scene: "dating",
              pattern: "计划确认",
              situation: "双方讨论周末安排，并给出明确的确认时间。",
              takeaway: "把是否给出具体时间作为验证投入的行为线索。",
              emotions: ["joy"],
              sentiment: "positive",
              signals: ["future"],
              clusterId: 0,
              clusterLabel: "计划、请求与协商",
              searchTerms: ["周末", "计划", "确认"],
              dialogue: [{ speaker: "B", text: "周日可以，周六晚确认。" }],
            },
          ],
        });
      }
      providerCalls += 1;
      if (providerCalls === 2) {
        synthesisPayloads.push(String(init?.body ?? ""));
      }
      if (providerCalls === 1) {
        return Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  facts: [
                    {
                      id: "fact-1",
                      type: "plan",
                      quote: "周六要拍摄，周日可以。",
                      sessionId: "session-1",
                      observation: "对方给出了替代时间。",
                      alternative: "也可能只是礼貌说明日程。",
                      confidence: "中",
                    },
                  ],
                  planState: {
                    status: "proposed",
                    summary: "周日是可行时间，但仍需确认。",
                    evidenceIds: ["fact-1"],
                  },
                  shortReplyFacts: [],
                }),
              },
            },
          ],
        });
      }
      return Response.json({
        choices: [{ message: { content: JSON.stringify(local) } }],
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const report = await analyzeWithProvider(input, {
      provider: "custom",
      baseUrl: "https://api.example.com/v1",
      model: "example-model",
      rememberKey: false,
      apiKey: "test-key",
    });
    expect(providerCalls).toBe(2);
    expect(report.pipeline.exactQuoteVerification).toBe(true);
    expect(report.evidence.length).toBeGreaterThan(0);
    expect(report.knowledge.relatedCases[0]?.id).toBe("test-plan");
    expect(synthesisPayloads[0]).toContain("retrieved_cases");
    expect(synthesisPayloads[0]).toContain("周末计划协商");
  });
});
