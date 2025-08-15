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

const POPULAR_THRESHOLD = 20; // total votes (yes + no) to trigger highlight

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

  async function copyResultsLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      alert("Results link copied");
    } catch {
      alert("Failed to copy link");
    }
  }

  function ShareBar() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = survey ? `Check out results: ${survey.title}` : "Survey results";
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);

    const wa = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
    const tw = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    const li = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

    const btn: React.CSSProperties = {
      minHeight: 44,
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid #C9D7CB",
      background: "#fff",
      textDecoration: "none",
      display: "inline-grid",
      placeItems: "center",
    };

    return (
      <div role="group" aria-label="Share results" className="row-actions" style={{ gap: 8, flexWrap: "wrap" }}>
        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn secondary" style={btn} aria-label="Share on WhatsApp">WhatsApp</a>
        <a href={tw} target="_blank" rel="noopener noreferrer" className="btn secondary" style={btn} aria-label="Share on X/Twitter">X</a>
        <a href={li} target="_blank" rel="noopener noreferrer" className="btn secondary" style={btn} aria-label="Share on LinkedIn">LinkedIn</a>
      </div>
    );
  }

  if (loading) return <main className="container"><p>Loading…</p></main>;
  if (err) return <main className="container"><p className="error">Error: {err}</p></main>;
  if (!survey) return <main className="container"><p>Not found</p></main>;

  const createdRel = timeAgo(survey.created_at);
  const createdAbs = new Date(survey.created_at).toLocaleString();

  // Small button/touch tweaks
  const btnStyle: React.CSSProperties = { minHeight: 44, padding: "10px 14px" };

  return (
    <main className="container">
      <header className="card" aria-label="Survey results header">
        <h1>{survey.title} — Results</h1>
        <p className="muted">
          <span title={createdAbs}>Created {createdRel}</span> · Visibility: <b>{survey.is_public ? "Public" : "Private"}</b> ·{" "}
          Questions: <b>{questions.length}</b> · Total votes: <b>{totalVotes}</b>
        </p>
        <div className="row-actions" style={{ gap: 8, flexWrap: "wrap" }}>
          <a className="btn secondary" href={`/surveys/${survey.id}`} style={btnStyle}>Back to survey</a>
          <button className="btn secondary" onClick={() => void copyResultsLink()} style={btnStyle}>Copy results link</button>
          {(isOwner || isAdmin) && (
            <button className="btn" onClick={() => void downloadCsv()} style={btnStyle}>Download CSV</button>
          )}
        </div>
        {/* New: Share bar */}
        <div style={{ marginTop: 10 }}>
          <ShareBar />
        </div>
      </header>

      <section className="card" aria-labelledby="results">
        <h2 id="results" style={{ marginBottom: 8 }}>Per-question results</h2>
        {questions.length === 0 ? (
          <p className="muted">No questions yet.</p>
        ) : (
          <ul className="list" role="list" style={{ display: "grid", gap: 12 }}>
            {questions.map((q) => {
              const yes = q.yes_count ?? 0;
              const no = q.no_count ?? 0;
              const sum = yes + no;
              const yesPct = sum ? Math.round((yes / sum) * 100) : 0;
              const noPct = sum ? 100 - yesPct : 0;
              const popular = sum >= POPULAR_THRESHOLD;

              return (
                <li key={q.id} className="row touch-row" aria-label={`Results for ${q.body}`} style={{ padding: 0 }}>
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      borderRadius: 12,
                      border: popular ? "2px solid #588157" : "1px solid #C9D7CB",
                      background: popular ? "rgba(88,129,87,0.08)" : "#fff",
                      padding: 12,
                      transition: "transform 150ms ease, border-color 150ms ease, background-color 150ms ease",
                    }}
                  >
                    {popular && (
                      <span
                        aria-label="Most Voted"
                        title="Most Voted"
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          padding: "2px 8px",
                          fontSize: 12,
                          borderRadius: 999,
                          background: "#588157",
                          color: "#fff",
                          lineHeight: 1.6
                        }}
                      >
                        ⭐ Most Voted
                      </span>
                    )}

                    <div style={{ fontWeight: 600, marginBottom: 10, paddingTop: popular ? 20 : 0 }}>
                      {q.body}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
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
