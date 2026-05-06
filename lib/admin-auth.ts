import { cookies } from "next/headers";

export const ADMIN_COOKIE = "tequila_admin_debug";

export async function isAdminDebugAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === "1";
}

export function isValidAdminDebugKey(key: string) {
  const expected = process.env.ADMIN_DEBUG_KEY?.trim() || "";
  return Boolean(expected) && key.trim() === expected;
}
