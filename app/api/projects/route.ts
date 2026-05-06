import { NextRequest, NextResponse } from "next/server";

import { upsertProject } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id?: string;
      name: string;
      description?: string;
      logline?: string;
      genre?: string;
      tone?: string;
      targetLength?: string;
    };
    const project = await upsertProject(body);
    return NextResponse.json(project);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown project error.";
    return NextResponse.json({ error: { code: "PROJECT_ERROR", message } }, { status: 500 });
  }
}
