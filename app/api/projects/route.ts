import { NextRequest, NextResponse } from "next/server";

import { upsertProject } from "@/lib/store";

export async function POST(request: NextRequest) {
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
}
