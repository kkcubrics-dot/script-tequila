import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { isAdminDebugAuthenticated } from "@/lib/admin-auth";

function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const withProtocol = trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (!url.pathname || url.pathname === "/") url.pathname = "/v1";
  return url.toString().replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  const authed = await isAdminDebugAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Admin authentication required." } }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      baseUrl?: string;
      apiKey?: string;
      model?: string;
      message?: string;
      temperature?: number;
    };

    const model = body.model?.trim() || "deepseek-v4-flash";
    const message = body.message?.trim() || "";
    if (!message) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "message is required." } }, { status: 400 });
    }

    const baseUrl = normalizeUrl(body.baseUrl?.trim() || "https://api.deepseek.com/v1");
    const apiKey = body.apiKey?.trim() || process.env.DEEPSEEK_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || "";
    if (!apiKey) {
      return NextResponse.json({ error: { code: "MISSING_API_KEY", message: "Missing API key for debug call." } }, { status: 400 });
    }

    const client = new OpenAI({ apiKey, baseURL: baseUrl });
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: message }],
      temperature: typeof body.temperature === "number" ? body.temperature : 0.7
    });

    const content = response.choices?.[0]?.message?.content;
    const output = typeof content === "string" ? content : "";

    return NextResponse.json({
      ok: true,
      request: { model, baseUrl },
      response: output,
      raw: response
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Debug call failed.";
    return NextResponse.json({ error: { code: "DEBUG_CALL_ERROR", message } }, { status: 500 });
  }
}
