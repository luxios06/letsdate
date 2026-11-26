import { describe, expect, it } from "vitest";
import { validateProviderSettings } from "./providers";

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
