import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null | undefined;

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  if (!url || !serviceRoleKey) {
    cachedClient = null;
    return cachedClient;
  }

  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith("http")) {
      cachedClient = null;
      return cachedClient;
    }
  } catch {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return cachedClient;
}

export function isSupabaseEnabled() {
  return getSupabaseAdminClient() !== null;
}
