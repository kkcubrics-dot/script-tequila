import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import OpenAI from "openai";

import { AppSettings, ChatMessage, Note, Project } from "@/lib/types";

type ChatRequestInput = {
  settings: AppSettings;
  project: Project | null;
  note: Note | null;
  history: ChatMessage[];
  message: string;
  includeNote: boolean;
};

let cachedCodexApiKey: string | null | undefined;

async function readCodexApiKey(): Promise<string | null> {
  if (cachedCodexApiKey !== undefined) {
    return cachedCodexApiKey;
  }

  try {
    const authPath = path.join(os.homedir(), ".codex", "auth.json");
    const raw = await readFile(authPath, "utf8");
    const payload = JSON.parse(raw) as { OPENAI_API_KEY?: string | null };
    cachedCodexApiKey = payload.OPENAI_API_KEY?.trim() || null;
  } catch {
    cachedCodexApiKey = null;
  }

  return cachedCodexApiKey;
}

async function resolveApiKey(settingsApiKey: string, baseUrl: string): Promise<string> {
  const fromSettings = settingsApiKey.trim();
  if (fromSettings) {
    return fromSettings;
  }

  const usingDeepSeek = baseUrl.includes("api.deepseek.com");
  if (usingDeepSeek) {
    return process.env.DEEPSEEK_API_KEY?.trim() || "";
  }

  const fromEnv =
    process.env.DEEPSEEK_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.CODEX_OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_KEY?.trim() ||
    "";
  if (fromEnv) {
    return fromEnv;
  }

  return (await readCodexApiKey()) ?? "";
}

function resolveBaseUrl(settingsBaseUrl: string): string {
  const raw = settingsBaseUrl.trim() || process.env.OPENAI_BASE_URL?.trim() || "";
  const fallback = process.env.DEEPSEEK_API_KEY?.trim()
    ? "https://api.deepseek.com/v1"
    : "https://api.openai.com/v1";
  const normalizedRaw =
    raw && !raw.startsWith("http://") && !raw.startsWith("https://") ? `https://${raw}` : raw;

  try {
    const url = new URL(normalizedRaw || fallback);
    if (!url.protocol.startsWith("http")) {
      return fallback;
    }
    if (url.hostname === "api.deepseek.com" && (url.pathname === "" || url.pathname === "/")) {
      return "https://api.deepseek.com/v1";
    }
    if (url.hostname === "api.openai.com" && (url.pathname === "" || url.pathname === "/")) {
      return "https://api.openai.com/v1";
    }
    if (!url.pathname || url.pathname === "/") {
      url.pathname = "/v1";
      return url.toString().replace(/\/$/, "");
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

export const __test__ = {
  resolveBaseUrl
};

export async function generateAssistantReply(input: ChatRequestInput) {
  const { settings, project, note, history, message, includeNote } = input;
  const rawBaseUrl = resolveBaseUrl(settings.baseUrl);
  const shouldUseDeepSeekDefault =
    rawBaseUrl.includes("api.openai.com") &&
    !settings.apiKey.trim() &&
    !process.env.OPENAI_API_KEY?.trim() &&
    !process.env.CODEX_OPENAI_API_KEY?.trim() &&
    !!process.env.DEEPSEEK_API_KEY?.trim();
  const baseUrl = shouldUseDeepSeekDefault ? "https://api.deepseek.com/v1" : rawBaseUrl;
  const model = shouldUseDeepSeekDefault ? "deepseek-v4-flash" : settings.model;
  const apiKey = await resolveApiKey(settings.apiKey, baseUrl);

  if (!apiKey) {
    return {
      content:
        "Missing API key. Set it in Config, or provide DEEPSEEK_API_KEY / OPENAI_API_KEY (or CODEX_OPENAI_API_KEY) in the server environment."
    };
  }

  const promptParts = [
    settings.systemPrompt.trim(),
    project
      ? [
          `Project: ${project.name}`,
          project.description ? `Description: ${project.description}` : "",
          project.logline ? `Logline: ${project.logline}` : "",
          project.genre ? `Genre: ${project.genre}` : "",
          project.tone ? `Tone: ${project.tone}` : "",
          project.targetLength ? `Target length: ${project.targetLength}` : ""
        ]
          .filter(Boolean)
          .join("\n")
      : "",
    includeNote && note ? `Current note: ${note.title}\n${note.content}` : ""
  ].filter(Boolean);

  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl
  });

  const response = await client.chat.completions.create({
    model,
    temperature: 0.8,
    messages: [
      {
        role: "system",
        content: promptParts.join("\n\n")
      },
      ...history.slice(-8).map((item) => ({
        role: item.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: item.content
      })),
      {
        role: "user",
        content: message
      }
    ]
  });

  const content = response.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content : "";

  return {
    id: randomUUID(),
    content: text.trim() || "The model returned an empty response."
  };
}
