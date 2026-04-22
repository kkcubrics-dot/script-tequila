import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { generateAssistantReply } from "@/lib/llm";
import { appendMessages, readState } from "@/lib/store";
import { ChatMessage } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    projectId: string | null;
    noteId: string | null;
    message: string;
    includeNote: boolean;
  };
  const state = await readState();
  const project = state.projects.find((item) => item.id === body.projectId) ?? null;
  const note = state.notes.find((item) => item.id === body.noteId) ?? null;
  const history = state.messages.filter(
    (item) => item.projectId === body.projectId && item.noteId === body.noteId
  );

  const userMessage: ChatMessage = {
    id: randomUUID(),
    projectId: body.projectId,
    noteId: body.noteId,
    role: "user",
    content: body.message,
    createdAt: new Date().toISOString()
  };

  try {
    const reply = await generateAssistantReply({
      settings: state.settings,
      project,
      note,
      history,
      message: body.message,
      includeNote: body.includeNote
    });

    const assistantMessage: ChatMessage = {
      id: reply.id ?? randomUUID(),
      projectId: body.projectId,
      noteId: body.noteId,
      role: "assistant",
      content: reply.content,
      createdAt: new Date().toISOString()
    };

    await appendMessages([userMessage, assistantMessage]);
    return NextResponse.json({ userMessage, assistantMessage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown chat error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
