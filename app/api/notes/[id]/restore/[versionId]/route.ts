import { NextRequest } from "next/server";

import { requireAuthedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/routes/response";
import { rollbackNoteVersion } from "@/lib/services/workspace-service";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    await requireAuthedUser();
    const { id: noteId, versionId } = await context.params;
    if (!noteId || !versionId) return fail("VALIDATION_ERROR", "Note id and version id are required.", 400);

    const restored = await rollbackNoteVersion(noteId, versionId);
    if (!restored) return fail("NOT_FOUND", "Note/version not found.", 404);
    return ok(restored);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown restore error.";
    if (message === "UNAUTHORIZED") return fail("UNAUTHORIZED", "Login required.", 401);
    return fail("RESTORE_ERROR", message, 500);
  }
}
