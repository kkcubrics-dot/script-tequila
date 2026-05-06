import { afterEach, describe, expect, it, vi } from "vitest";

import { postApi } from "@/lib/api-client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("postApi", () => {
  it("returns data for successful envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ data: { id: "1" }, error: null, requestId: "r1" })
      })
    );

    const data = await postApi<{ id: string }>("/api/x", { a: 1 });
    expect(data.id).toBe("1");
  });

  it("throws envelope error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({ data: null, error: { code: "X", message: "boom" }, requestId: "r2" })
      })
    );

    await expect(postApi("/api/x", {})).rejects.toThrow("boom");
  });

  it("throws for empty body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => ""
      })
    );

    await expect(postApi("/api/x", {})).rejects.toThrow("Empty API response");
  });
});
