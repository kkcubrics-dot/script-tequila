import { describe, expect, it } from "vitest";

import { __test__ } from "@/lib/llm";

describe("resolveBaseUrl", () => {
  it("normalizes deepseek host without scheme", () => {
    expect(__test__.resolveBaseUrl("api.deepseek.com")).toContain("https://api.deepseek.com/v1");
  });

  it("normalizes openai root to /v1", () => {
    expect(__test__.resolveBaseUrl("https://api.openai.com")).toBe("https://api.openai.com/v1");
  });

  it("adds /v1 for custom root path", () => {
    expect(__test__.resolveBaseUrl("https://example.com")).toBe("https://example.com/v1");
  });
});
