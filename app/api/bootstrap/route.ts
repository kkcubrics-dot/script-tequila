import { NextResponse } from "next/server";

import { requireAuthedUser } from "@/lib/auth";

import { readState } from "@/lib/store";

export async function GET() {
  try {
    await requireAuthedUser();
    const state = await readState();
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required." } }, { status: 401 });
  }
}
