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

async function resolveApiKey(settingsApiKey: string): Promise<string> {
  const fromSettings = settingsApiKey.trim();
  if (fromSettings) {
    return fromSettings;
  }

  const fromEnv =
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.CODEX_OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_KEY?.trim() ||
    "";
  if (fromEnv) {
    return fromEnv;
  }

  return (await readCodexApiKey()) ?? "";
}

export async function generateAssistantReply(input: ChatRequestInput) {
  const { settings, project, note, history, message, includeNote } = input;
  const apiKey = await resolveApiKey(settings.apiKey);
  const baseUrl =
    settings.baseUrl.trim() || process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";

  if (!apiKey) {
    return {
      content:
        "Missing API key. Set it in Config, or provide OPENAI_API_KEY (or CODEX_OPENAI_API_KEY) in the server environment."
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

  const response = await client.responses.create({
    model: settings.model,
    instructions: promptParts.join("\n\n"),
    input: [
      ...history.slice(-8).map((item) => ({
        type: "message" as const,
        role: item.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: [{ type: "input_text" as const, text: item.content }]
      })),
      {
        type: "message" as const,
        role: "user" as const,
        content: [{ type: "input_text" as const, text: message }]
      }
    ],
    temperature: 0.8
  });

  return {
    id: randomUUID(),
    content: response.output_text?.trim() || "The model returned an empty response."
  };
}
