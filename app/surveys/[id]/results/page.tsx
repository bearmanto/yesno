"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getClient } from "@/utils/supabase/client";
import { timeAgo } from "@/utils/time";

type Survey = {
  id: string;
  owner_id: string;
  title: string;
  is_public: boolean;
  created_at: string;
};

type Question = {
  id: string;
  survey_id: string;
  body: string;
  yes_count: number;
  no_count: number;
  created_at: string;
};

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = getClient();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        const res = await fetch(`/api/surveys/get?id=${encodeURIComponent(String(id))}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const json = await res.json();
        if (!res.ok) {
          setErr(json.error || "Failed to load results");
          return;
        }
        if (!alive) return;
        setSurvey(json.survey);
        setQuestions(json.questions ?? []);
        setIsOwner(Boolean(json.isOwner));
        setIsAdmin(Boolean(json.isAdmin));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, supabase]);

  const totalVotes = useMemo(
    () => questions.reduce((acc, q) => acc + (q.yes_count ?? 0) + (q.no_count ?? 0), 0),
    [questions]
  );

  async function downloadCsv() {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`/api/surveys/export?id=${encodeURIComponent(String(id))}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const blob = await res.blob();
      if (!res.ok) {
        const text = await blob.text().catch(() => "");
        alert(text || "Failed to export CSV");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `survey-${id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to export CSV");
    }
  }

  if (loading) return <main className="container"><p>Loading…</p></main>;
  if (err) return <main className="container"><p className="error">Error: {err}</p></main>;
  if (!survey) return <main className="container"><p>Not found</p></main>;

  const createdRel = timeAgo(survey.created_at);
  const createdAbs = new Date(survey.created_at).toLocaleString();

  return (
    <main className="container">
      <header className="card" aria-label="Survey results header">
        <h1>{survey.title} — Results</h1>
        <p className="muted">
          <span title={createdAbs}>Created {createdRel}</span> · Visibility: <b>{survey.is_public ? "Public" : "Private"}</b> ·{" "}
          Questions: <b>{questions.length}</b> · Total votes: <b>{totalVotes}</b>
        </p>
        <div className="row-actions" style={{ gap: 8 }}>
          <a className="btn secondary" href={`/surveys/${survey.id}`}>Back to survey</a>
          {(isOwner || isAdmin) && (
            <button className="btn" onClick={() => void downloadCsv()}>Download CSV</button>
          )}
        </div>
      </header>

      <section className="card" aria-labelledby="results">
        <h2 id="results">Per-question results</h2>
        {questions.length === 0 ? (
          <p className="muted">No questions yet.</p>
        ) : (
          <ul className="list" role="list">
            {questions.map((q) => {
              const yes = q.yes_count ?? 0;
              const no = q.no_count ?? 0;
              const sum = yes + no;
              const yesPct = sum ? Math.round((yes / sum) * 100) : 0;
              const noPct = sum ? 100 - yesPct : 0;
              return (
                <li key={q.id} className="row touch-row" aria-label={`Results for ${q.body}`}>
                  <div style={{ width: "100%" }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>{q.body}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
                      <Bar label={`Yes — ${yes} (${yesPct}%)`} percent={yesPct} tone="#588157" />
                      <Bar label={`No — ${no} (${noPct}%)`} percent={noPct} tone="#a3b18a" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div style={{ height: 64 }} />
    </main>
  );
}

function Bar({ label, percent, tone }: { label: string; percent: number; tone: string }) {
  return (
    <div style={{ border: "1px solid #C9D7CB", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
      <div
        style={{
          width: `${Math.max(0, Math.min(100, percent))}%`,
          minWidth: 4,
          height: 16,
          background: tone,
          transition: "width 250ms ease"
        }}
        aria-label={label}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.max(0, Math.min(100, percent))}
      />
      <div style={{ padding: "6px 8px", fontSize: 12, color: "#344e41" }}>{label}</div>
    </div>
  );
}
