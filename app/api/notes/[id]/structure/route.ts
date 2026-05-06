import { NextRequest, NextResponse } from "next/server";

import { readState, writeState } from "@/lib/store";
import { StructuredSections } from "@/lib/types";

type Mode = "append" | "replace";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: noteId } = await context.params;
  const body = (await request.json()) as {
    mode?: Mode;
    sections?: Partial<StructuredSections>;
  };

  if (!noteId) {
    return jsonError("VALIDATION_ERROR", "Note id is required.", 400);
  }

  const mode: Mode = body.mode === "replace" ? "replace" : "append";
  const sections = body.sections ?? {};
  const allowedKeys: Array<keyof StructuredSections> = [
    "scene",
    "characters",
    "objective",
    "conflict",
    "beats",
    "dialogueNotes",
    "revisionTasks"
  ];

  const state = await readState();
  const index = state.notes.findIndex((item) => item.id === noteId);
  if (index < 0) {
    return jsonError("NOT_FOUND", "Note not found.", 404);
  }

  const note = state.notes[index];
  const nextSections = { ...note.structuredSections };
  const updatedSections: Partial<StructuredSections> = {};

  for (const key of allowedKeys) {
    const value = sections[key];
    if (typeof value !== "string") {
      continue;
    }

    if (mode === "replace") {
      nextSections[key] = value;
    } else {
      const current = nextSections[key]?.trim() ?? "";
      const incoming = value.trim();
      nextSections[key] = current && incoming ? `${current}\n\n${incoming}` : current || incoming;
    }

    updatedSections[key] = nextSections[key];
  }

  const updatedNote = {
    ...note,
    structuredSections: nextSections,
    updatedAt: new Date().toISOString()
  };

  state.notes[index] = updatedNote;
  await writeState(state);

  return NextResponse.json({ note: updatedNote, updatedSections });
}

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}
