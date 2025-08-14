import { createClient } from "@supabase/supabase-js";

export function getUserScopedClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // This client passes the user's JWT to PostgREST/RPC so auth.uid() works
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
