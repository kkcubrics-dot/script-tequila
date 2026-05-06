import { NextRequest, NextResponse } from "next/server";

import { saveSettings } from "@/lib/store";
import { AppSettings } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AppSettings;
    const settings = await saveSettings(body);
    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown settings error.";
    return NextResponse.json({ error: { code: "SETTINGS_ERROR", message } }, { status: 500 });
  }
}
