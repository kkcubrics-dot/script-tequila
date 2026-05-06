import { requireAuthedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/routes/response";
import { getWorkspaceState } from "@/lib/services/workspace-service";

export async function GET() {
  try {
    await requireAuthedUser();
    const state = await getWorkspaceState();
    return ok(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown bootstrap error.";
    if (message === "UNAUTHORIZED") return fail("UNAUTHORIZED", "Login required.", 401);
    return fail("BOOTSTRAP_ERROR", message, 500);
  }
}
