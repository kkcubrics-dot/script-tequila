import { randomUUID } from "node:crypto";

import { AppSettings, ChatMessage, Note, Project } from "@/lib/types";

type ChatRequestInput = {
  settings: AppSettings;
  project: Project | null;
  note: Note | null;
  history: ChatMessage[];
  message: string;
  includeNote: boolean;
};

export async function generateAssistantReply(input: ChatRequestInput) {
  const { settings, project, note, history, message, includeNote } = input;

  if (!settings.apiKey.trim()) {
    return {
      content:
        "Missing API key. Open the Config tab and add your Gemini/OpenAI-compatible credentials before starting chat."
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

  const messages = [
    { role: "system", content: promptParts.join("\n\n") },
    ...history.slice(-8).map((item) => ({ role: item.role, content: item.content })),
    { role: "user", content: message }
  ];

  const endpoint = `${settings.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      temperature: 0.8
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Model request failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return {
    id: randomUUID(),
    content:
      payload.choices?.[0]?.message?.content?.trim() ||
      "The model returned an empty response."
  };
}
