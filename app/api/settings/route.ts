import { NextRequest } from "next/server";

import { requireAuthedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/routes/response";
import { saveAppSettings } from "@/lib/services/workspace-service";
import { AppSettings } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    await requireAuthedUser();
    const body = (await request.json()) as AppSettings;
    const settings = await saveAppSettings(body);
    return ok(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown settings error.";
    if (message === "UNAUTHORIZED") return fail("UNAUTHORIZED", "Login required.", 401);
    return fail("SETTINGS_ERROR", message, 500);
  }
}
