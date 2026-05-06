import { NextRequest, NextResponse } from "next/server";

import { requireAuthedUser } from "@/lib/auth";
import { upsertProject } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    await requireAuthedUser();

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
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    const code = message === "UNAUTHORIZED" ? "UNAUTHORIZED" : "PROJECT_ERROR";
    return NextResponse.json({ error: { code, message: status === 401 ? "Login required." : message } }, { status });
  }
}
