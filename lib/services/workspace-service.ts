import { randomUUID } from "node:crypto";

import { generateAssistantReply } from "@/lib/llm";
import { workspaceRepository } from "@/lib/repositories/workspace-repository";
import { AppSettings, ChatMessage, StructuredSections } from "@/lib/types";

export async function getWorkspaceState() {
  return workspaceRepository.readState();
}

export async function saveProject(input: {
  id?: string;
  name: string;
  description?: string;
  logline?: string;
  genre?: string;
  tone?: string;
  targetLength?: string;
}) {
  return workspaceRepository.upsertProject(input);
}

export async function saveNote(input: { id?: string; projectId: string; title: string; content: string }) {
  return workspaceRepository.upsertNote(input);
}

export async function saveAppSettings(settings: AppSettings) {
  return workspaceRepository.saveSettings(settings);
}

export async function patchNoteSections(noteId: string, mode: "append" | "replace", sections: Partial<StructuredSections>) {
  const state = await workspaceRepository.readState();
  const note = state.notes.find((item) => item.id === noteId) ?? null;
  if (!note) return null;

  const allowedKeys: Array<keyof StructuredSections> = [
    "scene",
    "characters",
    "objective",
    "conflict",
    "beats",
    "dialogueNotes",
    "revisionTasks"
  ];

  const nextSections = { ...note.structuredSections };
  const updatedSections: Partial<StructuredSections> = {};

  for (const key of allowedKeys) {
    const value = sections[key];
    if (typeof value !== "string") continue;

    if (mode === "replace") {
      nextSections[key] = value;
    } else {
      const current = nextSections[key]?.trim() ?? "";
      const incoming = value.trim();
      nextSections[key] = current && incoming ? `${current}\n\n${incoming}` : current || incoming;
    }
    updatedSections[key] = nextSections[key];
  }

  const updatedNote = await workspaceRepository.updateNoteStructuredSections(note.id, nextSections);
  if (!updatedNote) return null;
  return { note: updatedNote, updatedSections };
}

export async function sendChat(input: {
  projectId?: string | null;
  noteId?: string | null;
  message: string;
  includeNote: boolean;
  sessionId?: string | null;
}) {
  const state = await workspaceRepository.readState();
  const projectId = input.projectId ?? null;
  const noteId = input.noteId ?? null;
  const sessionId = input.sessionId ?? randomUUID();

  const project = state.projects.find((item) => item.id === projectId) ?? null;
  const note = state.notes.find((item) => item.id === noteId) ?? null;
  const history = state.messages.filter(
    (item) => item.projectId === projectId && item.noteId === noteId && (item.sessionId ?? null) === sessionId
  );

  const userMessage: ChatMessage = {
    id: randomUUID(),
    projectId,
    noteId,
    sessionId,
    source: "human",
    role: "user",
    content: input.message,
    createdAt: new Date().toISOString()
  };

  const reply = await generateAssistantReply({
    settings: state.settings,
    project,
    note,
    history,
    message: input.message,
    includeNote: input.includeNote
  });

  const assistantMessage: ChatMessage = {
    id: reply.id ?? randomUUID(),
    projectId,
    noteId,
    sessionId,
    source: "model",
    role: "assistant",
    content: reply.content,
    createdAt: new Date().toISOString()
  };

  await workspaceRepository.appendMessages([userMessage, assistantMessage]);

  return { userMessage, assistantMessage, sessionId };
}
