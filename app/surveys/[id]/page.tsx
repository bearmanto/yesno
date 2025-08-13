"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getClient } from "@/utils/supabase/client";
import VisibilityToggle from "@/components/VisibilityToggle";
import { timeAgo } from "@/utils/time";

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
      if (!token) { alert("Please sign in to favorite surveys."); return; }
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
    <div className="row-actions" role="group" aria-label="Favorite survey">
      <button className="btn" disabled={busy} onClick={toggle} aria-pressed={liked}>
        {liked ? "★ Favorited" : "☆ Favorite"}
      </button>
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
  const router = useRouter();
  const supabase = getClient();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newQ, setNewQ] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rename, setRename] = useState("");
  const [undoQ, setUndoQ] = useState<{ id: string; title: string; deadline: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [invite, setInvite] = useState("");

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

  async function vote(questionId: string, answer: "yes" | "no") {
    if (!survey?.id) return;
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Please sign in to vote.");
      const res = await fetch("/api/invite/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ surveyId: survey.id, questionId, answer }),
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

  async function onRename(e: React.FormEvent) {
    e.preventDefault();
    if (!survey?.id) return;
    const title = rename.trim();
    if (!title) return;
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Please sign in.");
      const res = await fetch("/api/surveys/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ surveyId: survey.id, title }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "rename failed");
      setSurvey((prev) => (prev ? { ...prev, title } : prev));
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteSurvey() {
    if (!survey?.id) return;
    if (!confirm("Delete this survey? This cannot be undone.")) return;
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Please sign in.");
      const res = await fetch("/api/surveys/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ surveyId: survey.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "delete failed");
      router.replace("/");
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteQuestion(q: Question) {
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Please sign in.");
      const res = await fetch("/api/questions/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questionId: q.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "delete failed");

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
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function undoDelete() {
    if (!undoQ) return;
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Please sign in.");
      const res = await fetch("/api/questions/undo-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questionId: undoQ.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "undo failed");
      setUndoQ(null);
      if (tickTimer.current) { window.clearInterval(tickTimer.current); tickTimer.current = null; }
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
      survey.id, survey.title, String(survey.is_public),
      String(survey.yes_count), String(survey.no_count), survey.created_at,
    ]);
    rows.push([]);
    rows.push(["question_id", "body", "yes_count", "no_count", "created_at"]);
    for (const q of questions) rows.push([q.id, q.body, String(q.yes_count), String(q.no_count), q.created_at]);
    return rows.map(r => r.map(cell => {
      const needsQuote = /[",\n]/.test(cell); const escaped = cell.replace(/"/g, '""');
      return needsQuote ? `"${escaped}"` : escaped;
    }).join(",")).join("\n");
  }, [survey, questions]);

  async function copyLink() {
    await navigator.clipboard.writeText(location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Keyboard navigation: arrow up/down to move focus between question rows; y/n to vote.
  const listRef = useRef<HTMLUListElement | null>(null);
  function focusRow(index: number) {
    const el = listRef.current?.querySelectorAll<HTMLLIElement>("li[tabindex='0']")?.[index];
    el?.focus();
  }
  function onListKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLLIElement>("li[tabindex='0']") ?? []);
    if (items.length === 0) return;
    const idx = items.findIndex((el) => el === document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(items.length - 1, (idx < 0 ? 0 : idx + 1));
      focusRow(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(0, (idx < 0 ? 0 : idx - 1));
      focusRow(prev);
    } else if (e.key.toLowerCase() === "y" && idx >= 0) {
      const q = questions[idx];
      if (q) void vote(q.id, "yes");
    } else if (e.key.toLowerCase() === "n" && idx >= 0) {
      const q = questions[idx];
      if (q) void vote(q.id, "no");
    }
  }

  if (loading) return <main className="container"><p>Loading...</p></main>;
  if (error === "private_or_missing") {
    return (
      <main className="container" aria-labelledby="private-title">
        <nav className="nav">
          <Link href="/" className="link nav-link">Home</Link>
          <span className="sep">·</span>
          <Link href="/signin" className="link nav-link">Sign in</Link>
        </nav>
        <h1 id="private-title">This survey is private</h1>
        <p className="muted">You don’t have access. Sign in with the correct account, or enter an invite code below.</p>
        <section className="card" aria-labelledby="invite-code">
          <h3 id="invite-code">Have an invite code?</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              const res = await fetch("/api/invite/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: invite }),
              });
              const json = await res.json();
              alert(json.error || (json.ok ? "Access granted" : "Invalid code"));
            } catch (err) {
              alert("Invite codes are not available yet.");
            }
          }} className="row-actions" aria-label="Enter invite code">
            <input className="input" value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="Enter invite code" aria-label="Invite code" />
            <button className="btn" type="submit" disabled={!invite.trim()}>Submit</button>
          </form>
        </section>
      </main>
    );
  }
  if (error) return <main className="container"><p className="error">Error: {error}</p></main>;
  if (!survey) return <main className="container"><p>Not found</p></main>;

  const createdRel = timeAgo(survey.created_at);
  const createdAbs = new Date(survey.created_at).toLocaleString();

  return (
    <main className="container">
      <nav className="nav" aria-label="Breadcrumb">
        <Link href="/" className="link nav-link">Home</Link>
        <span className="sep">·</span>
        <Link href="/dashboard" className="link nav-link">Dashboard</Link>
      </nav>

      <header className="card" role="region" aria-label="Survey header">
        <h1>{survey.title}</h1>
        <p className="muted">
          <span title={createdAbs}>Created {createdRel}</span> ·
          {' '}Visibility: <b>{survey.is_public ? "Public" : "Private"}</b>
        </p>
      </header>

      {(isOwner || isAdmin) && (
        <section className="card" aria-labelledby="owner-controls">
          <h3 id="owner-controls">Owner Controls</h3>
          <form onSubmit={onRename} className="row-actions" aria-label="Rename survey">
            <input className="input" value={rename} onChange={(e) => setRename(e.target.value)} placeholder="Survey title" aria-label="Survey title" />
            <button className="btn" disabled={submitting || !rename.trim()} type="submit">Save title</button>
            <button className="btn secondary" type="button" disabled={submitting} onClick={deleteSurvey} aria-label="Delete survey">Delete survey</button>
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
              {/* Simple inline icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor"/>
                <path d="M12 7v6" stroke="currentColor" />
                <circle cx="12" cy="17" r="1" fill="currentColor" />
              </svg>
              <span className="muted">No questions yet.</span>
            </span>
          </div>
        ) : (
          <ul ref={listRef} className="list" onKeyDown={onListKeyDown} role="listbox" aria-label="Questions list (use ↑/↓ to move, Y/N to vote)">
            {questions.map((q) => (
              <li key={q.id} className="row" tabIndex={0} aria-label={`Question: ${q.body}`}>
                <div>{q.body}</div>
                <div className="row-actions" role="group" aria-label={`Vote on: ${q.body}`}>
                  <button className="btn secondary" disabled={submitting} onClick={() => vote(q.id, "yes")} accessKey="y" aria-label="Vote yes">Yes ({q.yes_count})</button>
                  <button className="btn secondary" disabled={submitting} onClick={() => vote(q.id, "no")} accessKey="n" aria-label="Vote no">No ({q.no_count})</button>
                  {(isOwner || isAdmin) && (
                    <button className="btn secondary" disabled={submitting} onClick={() => deleteQuestion(q)} aria-label="Delete question">Delete</button>
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
              <button className="btn secondary" onClick={undoDelete}>Undo</button>
              <span className="muted">
                {Math.max(0, Math.ceil((undoQ.deadline - Date.now())/1000))}s
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="favorite">
        <h3 id="favorite">Favorite</h3>
        <LikeWidget surveyId={survey.id} />
      </section>

      <section className="card" aria-labelledby="export">
        <h3 id="export">Share & Export</h3>
        <div className="row-actions">
          <button className="btn" onClick={() => {
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = `survey_${survey?.id}.csv`; a.click();
            URL.revokeObjectURL(url);
          }} aria-label="Export CSV">Export CSV</button>
          <button
            className="btn secondary"
            style={{ marginLeft: 8 }}
            onClick={async () => { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            disabled={copied}
            aria-live="polite"
            aria-label={copied ? "Link copied" : "Copy link"}
          >
            {copied ? "Copied ✓" : "Copy link"}
          </button>
        </div>
      </section>

      {(isOwner || isAdmin) && (
        <section className="card" aria-labelledby="add-question">
          <h3 id="add-question">Add Question</h3>
          <div className="row-actions">
            <input
              className="input"
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              placeholder="Type your question..."
              aria-label="Question text"
              onKeyDown={(e) => { if (e.key === "Enter" && newQ.trim()) (document.getElementById("addQBtn") as HTMLButtonElement)?.click(); }}
            />
            <button
              id="addQBtn"
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
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ surveyId: survey.id, body }),
                    });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error || "add question failed");
                    setNewQ("");
                    if (json.question) setQuestions(prev => [...prev, json.question]);
                  } catch (e) { alert(e instanceof Error ? e.message : String(e)); }
                  finally { setSubmitting(false); }
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
