import { NextRequest } from "next/server";

import { requireAuthedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/routes/response";
import { saveNote } from "@/lib/services/workspace-service";

export async function POST(request: NextRequest) {
  try {
    await requireAuthedUser();
    const body = (await request.json()) as {
      id?: string;
      projectId: string;
      title: string;
      content: string;
    };
    const note = await saveNote(body);
    return ok(note);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown note error.";
    if (message === "UNAUTHORIZED") return fail("UNAUTHORIZED", "Login required.", 401);
    return fail("NOTE_ERROR", message, 500);
  }
}
