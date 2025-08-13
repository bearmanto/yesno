"use client";

import { useEffect, useState } from "react";
import { getClient } from "@/utils/supabase/client";
import Link from "next/link";

type Profile = { id: string; is_admin: boolean; created_at: string };

export default function DashboardPage() {
  const supabase = getClient();
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) { setError(userErr.message); return; }
      const u = userRes.user ?? null;
      if (!u) { setError("Not signed in"); return; }

      if (!mounted) return;
      setEmail(u.email ?? null);
      setUserId(u.id);

      const { data, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .maybeSingle();

      if (profErr) { setError(profErr.message); return; }
      if (data) setProfile(data as Profile);
    })();
    return () => { mounted = false; };
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Dashboard</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {!error && (
        <div style={{ marginTop: 12 }}>
          <div><b>User ID:</b> {userId ?? "—"}</div>
          <div><b>Email:</b> {email ?? "—"}</div>
          <div><b>is_admin:</b> {String(profile?.is_admin ?? false)}</div>
          <div><b>profile created_at:</b> {profile?.created_at ?? "—"}</div>
        </div>
      )}
      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <button onClick={signOut}>Sign out</button>
        <Link href="/">Home</Link>
      </div>
    </main>
  );
}
