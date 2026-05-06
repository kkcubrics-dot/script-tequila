import { NextRequest, NextResponse } from "next/server";

import { upsertNote } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
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
    return NextResponse.json({ error: { code: "NOTE_ERROR", message } }, { status: 500 });
  }
}
