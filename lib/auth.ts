import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const AUTH_COOKIE = "tequila_auth_token";

function getSupabaseAuthClient() {
  const rawUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    "";
  const url = normalizeSupabaseUrl(rawUrl);

  if (!url || !anon) {
    throw new Error("Missing or invalid SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY for auth.");
  }

  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function normalizeSupabaseUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (!parsed.protocol.startsWith("http")) return null;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

export async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE)?.value || "";
}

export async function getAuthedUser() {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const client = getSupabaseAuthClient();
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function requireAuthedUser() {
  const user = await getAuthedUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export function getSupabaseAuthClientForApi() {
  return getSupabaseAuthClient();
}
