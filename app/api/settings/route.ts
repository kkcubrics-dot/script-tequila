import { NextRequest, NextResponse } from "next/server";

import { saveSettings } from "@/lib/store";
import { AppSettings } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AppSettings;
  const settings = await saveSettings(body);
  return NextResponse.json(settings);
}
