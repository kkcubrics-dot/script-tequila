import { NextRequest } from "next/server";

import { requireAuthedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/routes/response";
import { saveFolder } from "@/lib/services/workspace-service";

export async function POST(request: NextRequest) {
  try {
    await requireAuthedUser();
    const body = (await request.json()) as { id?: string; name: string };
    const folder = await saveFolder(body);
    return ok(folder);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown folder error.";
    if (message === "UNAUTHORIZED") return fail("UNAUTHORIZED", "Login required.", 401);
    return fail("FOLDER_ERROR", message, 500);
  }
}
