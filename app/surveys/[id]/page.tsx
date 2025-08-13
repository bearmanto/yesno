"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getClient } from "@/utils/supabase/client";

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

  async function fetchData() {
    setLoading(true);
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
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function vote(questionId: string | null, answer: "yes" | "no") {
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
          questionId: questionId ?? null,
          answer,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "vote failed");

      // Optimistically update counts from response (then background refresh)
      if (payload.survey && (questionId === null || questionId === undefined)) {
        setSurvey((prev) => prev ? { ...prev, yes_count: payload.survey.yes_count, no_count: payload.survey.no_count } : prev);
      }
      if (payload.question && questionId) {
        setQuestions((prev) =>
          prev.map(q => q.id === payload.question.id
            ? { ...q, yes_count: payload.question.yes_count, no_count: payload.question.no_count }
            : q)
        );
      }

      // Background refresh to stay consistent with RLS state
      fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function addQuestion() {
    const body = newQ.trim();
    if (!body || !survey?.id) return;
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
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "add question failed");
      setNewQ("");
      await fetchData();
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
        <Link href="/" className="link">Home</Link>
        <span className="sep">·</span>
        <Link href="/dashboard" className="link">Dashboard</Link>
      </nav>

      <h1>{survey.title}</h1>
      <p className="muted">
        Survey totals — Yes: <b>{survey.yes_count}</b> · No: <b>{survey.no_count}</b> · Public: <b>{String(survey.is_public)}</b>
      </p>

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
        <h3>Vote on whole survey</h3>
        <div className="row-actions">
          <button className="btn" disabled={submitting || !survey?.id} onClick={() => vote(null, "yes")}>
            Vote YES
          </button>
          <button className="btn" disabled={submitting || !survey?.id} onClick={() => vote(null, "no")}>
            Vote NO
          </button>
        </div>
      </section>

      <section className="card">
        <button className="btn" onClick={downloadCSV}>Export CSV</button>
        <button className="btn secondary" style={{ marginLeft: 8 }} onClick={() => { navigator.clipboard.writeText(location.href); }}>
          Copy link
        </button>
      </section>

      {(isOwner || isAdmin) && (
        <section className="card">
          <h3>Add Question</h3>
          <div className="row-actions">
            <input
              className="input"
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              placeholder="Type your question..."
            />
            <button className="btn" disabled={submitting || !newQ.trim()} onClick={addQuestion}>Add</button>
          </div>
        </section>
      )}
    </main>
  );
}
