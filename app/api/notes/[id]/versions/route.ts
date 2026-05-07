import { NextRequest } from "next/server";

import { requireAuthedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/routes/response";
import { getNoteVersions } from "@/lib/services/workspace-service";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuthedUser();
    const { id: noteId } = await context.params;
    if (!noteId) return fail("VALIDATION_ERROR", "Note id is required.", 400);
    const versions = await getNoteVersions(noteId);
    return ok(versions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown version error.";
    if (message === "UNAUTHORIZED") return fail("UNAUTHORIZED", "Login required.", 401);
    return fail("NOTE_VERSION_ERROR", message, 500);
  }
}
