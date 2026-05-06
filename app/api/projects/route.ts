import { NextRequest } from "next/server";

import { requireAuthedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/routes/response";
import { saveProject } from "@/lib/services/workspace-service";

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
    const project = await saveProject(body);
    return ok(project);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown project error.";
    if (message === "UNAUTHORIZED") return fail("UNAUTHORIZED", "Login required.", 401);
    return fail("PROJECT_ERROR", message, 500);
  }
}
