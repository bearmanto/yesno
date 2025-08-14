"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getClient } from "@/utils/supabase/client";
import VisibilityToggle from "@/components/VisibilityToggle";
import { timeAgo } from "@/utils/time";
import { useToast } from "@/components/toast/ToastProvider";

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
  qtype?: "yesno" | "multi" | "rating" | "text"; // NEW tolerated field
  yes_count: number;
  no_count: number;
  created_at: string;
};

export default function SurveyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const supabase = getClient();
  const { push } = useToast();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rename, setRename] = useState("");

  const [newQ, setNewQ] = useState("");
  const [adding, setAdding] = useState(false);
  const addRef = useRef<HTMLInputElement | null>(null);

  const [undoQ, setUndoQ] = useState<{ id: string; title: string; deadline: number } | null>(null);
  const mounted = useRef(true);
  const tickTimer = useRef<number | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (tickTimer.current) window.clearInterval(tickTimer.current);
    };
  }, []);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`/api/surveys/get?id=${encodeURIComponent(id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const payload = await res.json();
      if (!res.ok) {
        if (res.status === 404) setError("private_or_missing");
        else setError(payload.error || "failed to load survey");
        setSurvey(null); setQuestions([]); setIsOwner(false); setIsAdmin(false);
        return;
      }
      setSurvey(payload.survey as Survey);
      setRename((payload.survey as Survey).title);
      setQuestions(payload.questions as Question[]);
      setIsOwner(Boolean(payload.isOwner));
      setIsAdmin(Boolean(payload.isAdmin));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  useEffect(() => {
    if (search.get("new") === "1" && addRef.current) {
      addRef.current.focus();
      push("Survey created — add your first question", "info");
    }
  }, [search, push]);

  async function vote(questionId: string, answer: "yes" | "no") {
    if (!survey?.id) return;
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { push("Please sign in to vote.", "error"); return; }
      const res = await fetch("/api/invite/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ surveyId: survey.id, questionId, answer }),
      });
      const payload = await res.json();
      if (!res.ok) { push(payload.error || "Vote failed", "error"); return; }
      if (payload.question) {
        setQuestions((prev) =>
          prev.map(q => q.id === payload.question.id
            ? { ...q, yes_count: payload.question.yes_count, no_count: payload.question.no_count }
            : q)
        );
      }
      push("Vote recorded", "success");
    } catch (e) {
      push(e instanceof Error ? e.message : "Vote failed", "error");
    }
  }

  async function onRename(e: React.FormEvent) {
    e.preventDefault();
    if (!survey?.id) return;
    const title = rename.trim();
    if (!title) return;
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { push("Please sign in.", "error"); return; }
      const res = await fetch("/api/surveys/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ surveyId: survey.id, title }),
      });
      const json = await res.json();
      if (!res.ok) { push(json.error || "Rename failed", "error"); return; }
      setSurvey((prev) => (prev ? { ...prev, title } : prev));
      push("Title saved", "success");
    } catch (e) {
      push(e instanceof Error ? e.message : "Rename failed", "error");
    }
  }

  async function deleteSurvey() {
    if (!survey?.id) return;
    if (!confirm("Delete this survey?")) return;
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { push("Please sign in.", "error"); return; }
      const res = await fetch("/api/surveys/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ surveyId: survey.id }),
      });
      const json = await res.json();
      if (!res.ok) { push(json.error || "Delete failed", "error"); return; }
      push("Survey deleted", "success");
      router.replace("/dashboard");
    } catch (e) {
      push(e instanceof Error ? e.message : "Delete failed", "error");
    }
  }

  async function deleteQuestion(q: Question) {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { push("Please sign in.", "error"); return; }
      const res = await fetch("/api/questions/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questionId: q.id }),
      });
      const json = await res.json();
      if (!res.ok) { push(json.error || "Delete failed", "error"); return; }

      setQuestions(prev => prev.filter(x => x.id !== q.id));
      const deadline = Date.now() + 30_000;
      setUndoQ({ id: q.id, title: q.body, deadline });
      if (tickTimer.current) window.clearInterval(tickTimer.current);
      tickTimer.current = window.setInterval(() => {
        if (!mounted.current) return;
        setUndoQ(curr => {
          if (!curr) return null;
          if (Date.now() >= curr.deadline) return null;
          return { ...curr };
        });
      }, 500);
      push("Question deleted", "info");
    } catch (e) {
      push(e instanceof Error ? e.message : "Delete failed", "error");
    }
  }

  async function undoDelete() {
    if (!undoQ) return;
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { push("Please sign in.", "error"); return; }
      const res = await fetch("/api/questions/undo-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questionId: undoQ.id }),
      });
      const json = await res.json();
      if (!res.ok) { push(json.error || "Undo failed", "error"); return; }
      setUndoQ(null);
      if (tickTimer.current) { window.clearInterval(tickTimer.current); tickTimer.current = null; }
      await fetchData();
      push("Restored", "success");
    } catch (e) {
      push(e instanceof Error ? e.message : "Undo failed", "error");
    }
  }

  async function addQuestion() {
    if (!survey?.id) return;
    const body = newQ.trim();
    if (!body) return;
    setAdding(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { push("Please sign in.", "error"); return; }
      const res = await fetch("/api/surveys/add-question", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ surveyId: survey.id, body, type: "yesno" }), // explicit default
      });
      const json = await res.json();
      if (!res.ok) { push(json.error || "Add question failed", "error"); return; }
      if (json.question) {
        setQuestions(prev => [...prev, json.question as Question]);
        setNewQ("");
        push("Question added", "success");
      } else {
        await fetchData();
        setNewQ("");
        push("Question added", "success");
      }
    } catch (e) {
      push(e instanceof Error ? e.message : "Add question failed", "error");
    } finally {
      setAdding(false);
    }
  }

  const totalQuestionVotes = useMemo(
    () => questions.reduce((acc, q) => acc + (q.yes_count ?? 0) + (q.no_count ?? 0), 0),
    [questions]
  );

  if (loading) return <main className="container"><p>Loading...</p></main>;
  if (error === "private_or_missing") {
    return (
      <main className="container" aria-labelledby="private-title">
        <h1 id="private-title">This survey is private</h1>
        <p className="muted" style={{ marginTop: 8, marginBottom: 16 }}>
          You don’t have access. Sign in with the correct account, or contact the owner for access.
        </p>
        <a className="btn" href="/signin" aria-label="Go to sign in">Sign in</a>
      </main>
    );
  }
  if (error) return <main className="container"><p className="error">Error: {error}</p></main>;
  if (!survey) return <main className="container"><p>Not found</p></main>;

  const createdRel = timeAgo(survey.created_at);
  const createdAbs = new Date(survey.created_at).toLocaleString();

  return (
    <main className="container">
      <header className="card" role="region" aria-label="Survey header">
        <h1>{survey.title}</h1>
        <p className="muted">
          <span title={createdAbs}>Created {createdRel}</span> · Visibility: <b>{survey.is_public ? "Public" : "Private"}</b> ·
          {' '}Questions: <b>{questions.length}</b> · Votes: <b>{totalQuestionVotes}</b>
        </p>
        <div className="row-actions" style={{ marginTop: 8 }}>
          <button
            className="btn secondary"
            onClick={async () => { await navigator.clipboard.writeText(location.href); push("Link copied", "success"); }}
            aria-label="Copy link"
          >
            Copy link
          </button>
        </div>
      </header>

      {(isOwner || isAdmin) && (
        <section className="card" aria-labelledby="owner-controls">
          <h3 id="owner-controls">Owner Controls</h3>
          <form onSubmit={onRename} className="row-actions" aria-label="Rename survey">
            <input
              className="input"
              value={rename}
              onChange={(e) => setRename(e.target.value)}
              placeholder="Survey title"
              aria-label="Survey title"
              inputMode="text"
            />
            <button className="btn" type="submit">Save title</button>
            <button className="btn secondary" type="button" onClick={deleteSurvey} aria-label="Delete survey">Delete survey</button>
          </form>
          <div style={{ height: 10 }} />
          <VisibilityToggle surveyId={survey.id} initial={survey.is_public} />
        </section>
      )}

      <section className="card" aria-labelledby="questions">
        <h2 id="questions">Questions</h2>
        {questions.length === 0 ? (
          <div className="row" role="note" aria-live="polite">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor"/>
                <path d="M12 7v6" stroke="currentColor" />
                <circle cx="12" cy="17" r="1" fill="currentColor" />
              </svg>
              <span className="muted">No questions yet — add your first one below.</span>
            </span>
          </div>
        ) : (
          <ul className="list" role="listbox" aria-label="Questions list">
            {questions.map((q) => (
              <li key={q.id} className="row touch-row" aria-label={`Question: ${q.body}`}>
                <div>{q.body}</div>
                <div className="row-actions" role="group" aria-label={`Vote on: ${q.body}`}>
                  <button className="btn secondary" onClick={() => vote(q.id, "yes")} aria-label="Vote yes">Yes ({q.yes_count})</button>
                  <button className="btn secondary" onClick={() => vote(q.id, "no")} aria-label="Vote no">No ({q.no_count})</button>
                  {(isOwner || isAdmin) && (
                    <button className="btn secondary" onClick={() => deleteQuestion(q)} aria-label="Delete question">Delete</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {undoQ && (
          <div className="row" role="alert" aria-live="polite" style={{ marginTop: 12 }}>
            <span>Question deleted: “{undoQ.title}”</span>
            <div className="row-actions">
              <button className="btn secondary" onClick={() => void undoDelete()}>Undo</button>
              <span className="muted">
                {Math.max(0, Math.ceil((undoQ.deadline - Date.now())/1000))}s
              </span>
            </div>
          </div>
        )}
      </section>

      {(isOwner || isAdmin) && (
        <section className="card" aria-labelledby="add-question">
          <h3 id="add-question">Add Question</h3>
          <div className="row-actions" style={{ gap: 8 }}>
            <input
              ref={addRef}
              className="input touch"
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              placeholder="Type your yes/no question…"
              aria-label="Question text"
              inputMode="text"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newQ.trim() && !adding) {
                  e.preventDefault();
                  void addQuestion();
                }
              }}
            />
            <button
              className="btn"
              disabled={!newQ.trim() || adding}
              onClick={() => void addQuestion()}
              aria-label="Add question"
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </div>
        </section>
      )}

      <div style={{ height: 64 }} />
    </main>
  );
}
