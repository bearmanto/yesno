"use client";

import { useEffect, useState } from "react";
import { getClient } from "@/utils/supabase/client";
import { useToast } from "@/components/toast/ToastProvider";

type UserInfo = { email: string | null };

export default function ProfilePage() {
  const supabase = getClient();
  const { push } = useToast();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      setUser({ email: data.user?.email ?? null });
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [supabase]);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) push(error.message, "error");
    else {
      push("Signed out", "success");
      window.location.href = "/signin";
    }
  }

  if (loading) return <main className="container"><p>Loading…</p></main>;

  if (!user?.email) {
    return (
      <main className="container">
        <section className="card">
          <h1>Profile</h1>
          <p className="muted">You’re not signed in.</p>
          <a className="btn" href="/signin">Sign in</a>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <section className="card">
        <h1>Profile</h1>
        <p className="muted" style={{ marginTop: 8 }}>Signed in as <b>{user.email}</b></p>
        <div className="row-actions" style={{ marginTop: 12 }}>
          <button className="btn secondary" onClick={() => (window.location.href = "/dashboard")}>
            Dashboard
          </button>
          <button className="btn" onClick={signOut}>Sign out</button>
        </div>
      </section>
      <div style={{ height: 64 }} />
    </main>
  );
}
