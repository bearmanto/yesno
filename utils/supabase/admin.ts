import { createClient } from "@supabase/supabase-js";

/**
 * Lazily create an admin (service role) Supabase client.
 * NEVER create clients at module top-level; call getAdmin() inside handlers only.
 */
export function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Admin env missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  // security note: service key is server-only; do not expose this in client code.
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "yesno-admin" } },
  });
  return client;
}
