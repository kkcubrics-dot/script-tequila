import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { requireAuthedUser } from "@/lib/auth";
import { generateAssistantReply } from "@/lib/llm";
import { appendMessages, readState } from "@/lib/store";
import { ChatMessage } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    await requireAuthedUser();

    const body = (await request.json()) as {
      projectId?: string | null;
      noteId?: string | null;
      message?: string;
      includeNote?: boolean;
      sessionId?: string | null;
    };
    const message = body.message?.trim() ?? "";
    if (!message) {
      return jsonError("VALIDATION_ERROR", "Message is required.", 400);
    }
    if (body.projectId !== null && body.projectId !== undefined && typeof body.projectId !== "string") {
      return jsonError("VALIDATION_ERROR", "projectId must be a string or null.", 400);
    }
    if (body.noteId !== null && body.noteId !== undefined && typeof body.noteId !== "string") {
      return jsonError("VALIDATION_ERROR", "noteId must be a string or null.", 400);
    }

    const projectId = body.projectId ?? null;
    const noteId = body.noteId ?? null;
    const sessionId = body.sessionId ?? randomUUID();
    const includeNote = Boolean(body.includeNote);
    const state = await readState();
    const project = state.projects.find((item) => item.id === projectId) ?? null;
    const note = state.notes.find((item) => item.id === noteId) ?? null;
    const history = state.messages.filter(
      (item) =>
        item.projectId === projectId &&
        item.noteId === noteId &&
        (item.sessionId ?? null) === sessionId
    );

    const userMessage: ChatMessage = {
      id: randomUUID(),
      projectId,
      noteId,
      sessionId,
      source: "human",
      role: "user",
      content: message,
      createdAt: new Date().toISOString()
    };

    const reply = await generateAssistantReply({
      settings: state.settings,
      project,
      note,
      history,
      message,
      includeNote
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

    await appendMessages([userMessage, assistantMessage]);
    return NextResponse.json({ userMessage, assistantMessage, sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown chat error.";
    if (message === "UNAUTHORIZED") {
      return jsonError("UNAUTHORIZED", "Login required.", 401);
    }
    return jsonError("CHAT_ERROR", message, 500);
  }
}

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}
