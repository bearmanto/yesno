"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getClient } from "@/utils/supabase/client";
import VisibilityToggle from "@/components/VisibilityToggle";

function LikeWidget({ surveyId }: { surveyId: string }) {
  const supabase = getClient();
  const [count, setCount] = useState<number>(0);
  const [liked, setLiked] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const res = await fetch(`/api/surveys/get?id=${encodeURIComponent(surveyId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const json = await res.json();
    if (res.ok) {
      setCount(json.likeCount ?? 0);
      setLiked(Boolean(json.likedByMe));
    }
  }, [supabase, surveyId]);

  useEffect(() => { refresh(); }, [refresh]);

  async function toggle() {
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        alert("Please sign in to favorite surveys.");
        return;
      }
      const res = await fetch("/api/surveys/toggle-like", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ surveyId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "toggle failed");
      setLiked(Boolean(json.liked));
      setCount(json.likeCount ?? 0);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row-actions">
      <button className="btn" disabled={busy} onClick={toggle}>{liked ? "★ Favorited" : "☆ Favorite"}</button>
      <span className="muted">{count} {count === 1 ? "favorite" : "favorites"}</span>
    </div>
  );
}

type Survey = {
  id: string;
  owner_id: string;
  title: string;
  is_public: boolean;
  yes_count: number;
  no_count: number;
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

export default function SurveyPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = getClient();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newQ, setNewQ] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`/api/surveys/get?id=${encodeURIComponent(id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "failed to load survey");
      setSurvey(payload.survey as Survey);
      setQuestions(payload.questions as Question[]);
      setIsOwner(Boolean(payload.isOwner));
      setIsAdmin(Boolean(payload.isAdmin));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  async function vote(questionId: string, answer: "yes" | "no") {
    if (!survey?.id) return;
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch("/api/invite/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          surveyId: survey.id,
          questionId,
          answer,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "vote failed");
      if (payload.question) {
        setQuestions((prev) =>
          prev.map(q => q.id === payload.question.id
            ? { ...q, yes_count: payload.question.yes_count, no_count: payload.question.no_count }
            : q)
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const csv = useMemo(() => {
    if (!survey) return "";
    const rows: string[][] = [];
    rows.push(["survey_id", "title", "is_public", "survey_yes", "survey_no", "created_at"]);
    rows.push([
      survey.id,
      survey.title,
      String(survey.is_public),
      String(survey.yes_count),
      String(survey.no_count),
      survey.created_at,
    ]);
    rows.push([]);
    rows.push(["question_id", "body", "yes_count", "no_count", "created_at"]);
    for (const q of questions) {
      rows.push([q.id, q.body, String(q.yes_count), String(q.no_count), q.created_at]);
    }
    return rows.map(r => r.map(cell => {
      const needsQuote = /[",\n]/.test(cell);
      const escaped = cell.replace(/"/g, '""');
      return needsQuote ? `"${escaped}"` : escaped;
    }).join(",")).join("\n");
  }, [survey, questions]);

  function downloadCSV() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `survey_${survey?.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <main className="container"><p>Loading...</p></main>;
  if (error) return <main className="container"><p className="error">Error: {error}</p></main>;
  if (!survey) return <main className="container"><p>Not found</p></main>;

  return (
    <main className="container">
      <nav className="nav">
        <Link href="/" className="link nav-link">Home</Link>
        <span className="sep">·</span>
        <Link href="/dashboard" className="link nav-link">Dashboard</Link>
      </nav>

      <h1>{survey.title}</h1>
      <p className="muted">Public: <b>{String(survey.is_public)}</b></p>

      <section className="card">
        <h2>Questions</h2>
        {questions.length === 0 && <p className="muted">No questions yet.</p>}
        <ul className="list">
          {questions.map((q) => (
            <li key={q.id} className="row">
              <div>{q.body}</div>
              <div className="row-actions">
                <button className="btn secondary" disabled={submitting} onClick={() => vote(q.id, "yes")}>Yes ({q.yes_count})</button>
                <button className="btn secondary" disabled={submitting} onClick={() => vote(q.id, "no")}>No ({q.no_count})</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>Favorite</h3>
        <LikeWidget surveyId={survey.id} />
      </section>

      <section className="card">
        <button className="btn" onClick={downloadCSV}>Export CSV</button>
        <button className="btn secondary" style={{ marginLeft: 8 }} onClick={() => { navigator.clipboard.writeText(location.href); }}>
          Copy link
        </button>
      </section>

      {(isOwner || isAdmin) && (
        <section className="card">
          <h3>Owner Controls</h3>
          <VisibilityToggle surveyId={survey.id} initial={survey.is_public} />
          <div className="row-actions" style={{ marginTop: 12 }}>
            <input
              className="input"
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              placeholder="Type your question..."
            />
            <button
              className="btn"
              disabled={submitting || !newQ.trim()}
              onClick={() => {
                const body = newQ.trim();
                if (!body || !survey?.id) return;
                (async () => {
                  setSubmitting(true);
                  try {
                    const { data: sess } = await supabase.auth.getSession();
                    const token = sess.session?.access_token;
                    if (!token) throw new Error("Please sign in.");
                    const res = await fetch("/api/surveys/add-question", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ surveyId: survey.id, body }),
                    });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error || "add question failed");
                    setNewQ("");
                    if (json.question) {
                      setQuestions(prev => [...prev, json.question]);
                    }
                  } catch (e) {
                    alert(e instanceof Error ? e.message : String(e));
                  } finally {
                    setSubmitting(false);
                  }
                })();
              }}
            >
              Add
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
