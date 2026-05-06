import { NextRequest, NextResponse } from "next/server";

import { requireAuthedUser } from "@/lib/auth";
import { saveSettings } from "@/lib/store";
import { AppSettings } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    await requireAuthedUser();

    const body = (await request.json()) as AppSettings;
    const settings = await saveSettings(body);
    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown settings error.";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    const code = message === "UNAUTHORIZED" ? "UNAUTHORIZED" : "SETTINGS_ERROR";
    return NextResponse.json({ error: { code, message: status === 401 ? "Login required." : message } }, { status });
  }
}
