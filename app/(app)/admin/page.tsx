"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getClient } from "@/utils/supabase/client";
import { timeAgo } from "@/utils/time";

type Metrics = {
  surveys_public: number;
  surveys_private: number;
  total_survey_votes: number;
  total_question_votes: number;
  users: number;
  recent: { id: string; title: string; is_public: boolean; created_at: string }[];
};

export default function AdminPage() {
  const supabase = getClient();
  const [m, setM] = useState<Metrics | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Sign in as admin");
      const res = await fetch("/api/admin/metrics", { headers: { Authorization: `Bearer ${token}` }});
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setM(json as Metrics);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function setVisibility(id: string, is_public: boolean) {
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Sign in as admin");
      const res = await fetch("/api/admin/set-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ surveyId: id, is_public }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "update failed");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <nav className="nav">
        <Link href="/" className="link nav-link">Home</Link>
        <span className="sep">·</span>
        <Link href="/dashboard" className="link nav-link">Dashboard</Link>
      </nav>

      <h1>Admin</h1>
      {err && <p className="error">{err}</p>}
      {m && (
        <>
          <section className="card" aria-labelledby="overview">
            <h2 id="overview">Overview</h2>
            <div className="row"><span>Public surveys</span><b>{m.surveys_public}</b></div>
            <div className="row"><span>Private surveys</span><b>{m.surveys_private}</b></div>
            <div className="row"><span>Total survey-level votes</span><b>{m.total_survey_votes}</b></div>
            <div className="row"><span>Total question-level votes</span><b>{m.total_question_votes}</b></div>
            <div className="row"><span>Users</span><b>{m.users}</b></div>
          </section>

          <section className="card" aria-labelledby="recent">
            <h2 id="recent">Recent surveys</h2>
            <ul className="list">
              {m.recent.map(s => (
                <li key={s.id} className="row">
                  <div style={{ display: "grid" }}>
                    <b>{s.title}</b>
                    <span className="muted">{timeAgo(s.created_at)}</span>
                  </div>
                  <div className="row-actions">
                    <span className="muted" style={{ marginRight: 8 }}>{s.is_public ? "Public" : "Private"}</span>
                    <button
                      className="btn secondary"
                      aria-label={`Set survey "${s.title}" ${s.is_public ? "private" : "public"}`}
                      disabled={busy}
                      onClick={() => setVisibility(s.id, !s.is_public)}
                    >
                      Set {s.is_public ? "Private" : "Public"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
