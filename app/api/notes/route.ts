import { NextRequest, NextResponse } from "next/server";

import { requireAuthedUser } from "@/lib/auth";
import { upsertNote } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    await requireAuthedUser();

    const body = (await request.json()) as {
      id?: string;
      projectId: string;
      title: string;
      content: string;
    };
    const note = await upsertNote(body);
    return NextResponse.json(note);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown note error.";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    const code = message === "UNAUTHORIZED" ? "UNAUTHORIZED" : "NOTE_ERROR";
    return NextResponse.json({ error: { code, message: status === 401 ? "Login required." : message } }, { status });
  }
}
