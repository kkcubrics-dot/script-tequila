import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null | undefined;
let cachedNormalizedUrl: string | null | undefined;

function normalizeSupabaseUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const maybeWithProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(maybeWithProtocol);
    if (!url.protocol.startsWith("http")) return null;
    // Supabase URL should be origin-only, avoid accidental path/query input.
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  const normalizedUrl = normalizeSupabaseUrl(url);

  if (!normalizedUrl || !serviceRoleKey) {
    cachedClient = null;
    cachedNormalizedUrl = null;
    return cachedClient;
  }

  cachedNormalizedUrl = normalizedUrl;
  cachedClient = createClient(normalizedUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return cachedClient;
}

export function isSupabaseEnabled() {
  return getSupabaseAdminClient() !== null;
}

export function getSupabaseNormalizedUrl() {
  if (cachedNormalizedUrl !== undefined) return cachedNormalizedUrl;
  const raw = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  cachedNormalizedUrl = normalizeSupabaseUrl(raw);
  return cachedNormalizedUrl;
}
