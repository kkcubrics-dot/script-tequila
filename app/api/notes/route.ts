import { NextRequest, NextResponse } from "next/server";

import { upsertNote } from "@/lib/store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    id?: string;
    projectId: string;
    title: string;
    content: string;
  };
  const note = await upsertNote(body);
  return NextResponse.json(note);
}
