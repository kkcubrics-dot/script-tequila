import { NextRequest } from "next/server";

import { requireAuthedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/routes/response";
import { sendChat } from "@/lib/services/workspace-service";

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
    if (!message) return fail("VALIDATION_ERROR", "Message is required.", 400);
    if (body.projectId !== null && body.projectId !== undefined && typeof body.projectId !== "string") {
      return fail("VALIDATION_ERROR", "projectId must be a string or null.", 400);
    }
    if (body.noteId !== null && body.noteId !== undefined && typeof body.noteId !== "string") {
      return fail("VALIDATION_ERROR", "noteId must be a string or null.", 400);
    }

    const result = await sendChat({
      projectId: body.projectId ?? null,
      noteId: body.noteId ?? null,
      message,
      includeNote: Boolean(body.includeNote),
      sessionId: body.sessionId ?? null
    });

    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown chat error.";
    if (message === "UNAUTHORIZED") return fail("UNAUTHORIZED", "Login required.", 401);
    return fail("CHAT_ERROR", message, 500);
  }
}
