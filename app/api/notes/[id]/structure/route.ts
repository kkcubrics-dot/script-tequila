import { NextRequest } from "next/server";

import { requireAuthedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/routes/response";
import { patchNoteSections } from "@/lib/services/workspace-service";
import { StructuredSections } from "@/lib/types";

type Mode = "append" | "replace";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuthedUser();

    const { id: noteId } = await context.params;
    const body = (await request.json()) as {
      mode?: Mode;
      sections?: Partial<StructuredSections>;
    };

    if (!noteId) return fail("VALIDATION_ERROR", "Note id is required.", 400);

    const mode: Mode = body.mode === "replace" ? "replace" : "append";
    const result = await patchNoteSections(noteId, mode, body.sections ?? {});
    if (!result) return fail("NOT_FOUND", "Note not found.", 404);

    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown structure error.";
    if (message === "UNAUTHORIZED") return fail("UNAUTHORIZED", "Login required.", 401);
    return fail("STRUCTURE_ERROR", message, 500);
  }
}
