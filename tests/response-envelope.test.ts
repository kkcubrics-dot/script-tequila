import { describe, expect, it } from "vitest";

import { fail, ok } from "@/lib/routes/response";

describe("response envelope", () => {
  it("ok returns {data,error,requestId}", async () => {
    const res = ok({ x: 1 }, "req-1");
    const json = await res.json();
    expect(json).toEqual({ data: { x: 1 }, error: null, requestId: "req-1" });
  });

  it("fail returns error envelope", async () => {
    const res = fail("X", "bad", 400, "req-2");
    const json = await res.json();
    expect(json).toEqual({ data: null, error: { code: "X", message: "bad" }, requestId: "req-2" });
    expect(res.status).toBe(400);
  });
});
