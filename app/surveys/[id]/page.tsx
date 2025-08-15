"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getClient } from "@/utils/supabase/client";
import { useToast } from "@/components/toast/ToastProvider";
import { timeAgo } from "@/utils/time";

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
  const search = useSearchParams();
  const supabase = getClient();
  const { push } = useToast();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Favorites state
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  // Per-question pending vote lock (prevents double-click spam)
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const [newQ, setNewQ] = useState("");
  const [adding, setAdding] = useState(false);
  const addRef = useRef<HTMLInputElement | null>(null);

  // Load survey + questions (+ liked state)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;

        const res = await fetch(`/api/surveys/get?id=${encodeURIComponent(String(id))}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const payload = await res.json();

        if (!res.ok) {
          if (res.status === 404) setError("private_or_missing");
          else setError(payload.error || "failed to load survey");
          setSurvey(null); setQuestions([]); setIsOwner(false); setIsAdmin(false);
          return;
        }

        if (!alive) return;
        setSurvey(payload.survey as Survey);
        setQuestions((payload.questions as Question[]) ?? []);
        setIsOwner(Boolean(payload.isOwner));
        setIsAdmin(Boolean(payload.isAdmin));

        // Load real liked state (requires auth)
        if (token && payload?.survey?.id) {
          try {
            const r = await fetch(`/api/surveys/is-liked?id=${encodeURIComponent(String(payload.survey.id))}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const j = await r.json();
            if (r.ok && typeof j.liked === "boolean") setLiked(j.liked);
          } catch {
            // ignore
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, supabase]);

  useEffect(() => {
    if (search.get("new") === "1" && addRef.current) {
      addRef.current.focus();
      push("Survey created — add your first question", "info");
    }
  }, [search, push]);

  const totalQuestionVotes = useMemo(
    () => questions.reduce((acc, q) => acc + (q.yes_count ?? 0) + (q.no_count ?? 0), 0),
    [questions]
  );

  // --- Vote: trust the server; detect NO-OP (same vote) to adjust toast
  async function vote(questionId: string, answer: "yes" | "no") {
    if (!survey?.id) return;
    if (pending[questionId]) return; // lock while in flight

    // Snapshot previous counts for NO-OP detection
    const prev = questions.find((q) => q.id === questionId);
    const prevYes = prev?.yes_count ?? 0;
    const prevNo = prev?.no_count ?? 0;

    setPending((p) => ({ ...p, [questionId]: true }));
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { push("Please sign in to vote.", "error"); return; }

      const res = await fetch("/api/invite/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ surveyId: survey.id, questionId, answer }),
      });

      // If API signals same-vote explicitly (e.g., 409 or a code), show info toast.
      if (res.status === 409) {
        push("You already voted the same way.", "info");
        return;
      }

      const json = await res.json();

      if (!res.ok) {
        const maybeCode = (json && (json.code || json.error)) || "";
        if (String(maybeCode).toUpperCase().includes("ALREADY")) {
          push("You already voted the same way.", "info");
        } else {
          push(json.error || "Vote failed", "error");
        }
        return;
      }

      // Prefer server-provided updated question
      let newYes = prevYes;
      let newNo = prevNo;
      const updated: Question | null =
        (json.question as Question) ||
        (json.updatedQuestion as Question) ||
        null;

      if (updated && updated.id === questionId) {
        newYes = updated.yes_count ?? 0;
        newNo = updated.no_count ?? 0;
        setQuestions((prevList) =>
          prevList.map((q) => (q.id === questionId ? { ...q, yes_count: newYes, no_count: newNo } : q))
        );
      } else if (typeof json.yes_count === "number" && typeof json.no_count === "number") {
        newYes = json.yes_count;
        newNo = json.no_count;
        setQuestions((prevList) =>
          prevList.map((q) => (q.id === questionId ? { ...q, yes_count: newYes, no_count: newNo } : q))
        );
      } else {
        // Absolute fallback: refetch and compute new counts from server
        try {
          const ref = await fetch(`/api/surveys/get?id=${encodeURIComponent(String(survey.id))}`);
          const payload = await ref.json();
          if (ref.ok && Array.isArray(payload.questions)) {
            const fresh = (payload.questions as Question[]).find((q: Question) => q.id === questionId);
            if (fresh) {
              newYes = fresh.yes_count ?? 0;
              newNo = fresh.no_count ?? 0;
              setQuestions((prevList) => prevList.map((q) => (q.id === questionId ? fresh : q)));
            }
          }
        } catch {
          // ignore
        }
      }

      // Decide toast by comparing before/after counts
      const changed = newYes !== prevYes || newNo !== prevNo;
      if (changed) {
        push(json.message || "Vote recorded", "success");
      } else {
        push("You already voted the same way.", "info");
      }
    } catch (e) {
      push(e instanceof Error ? e.message : "Vote failed", "error");
    } finally {
      setPending((p) => ({ ...p, [questionId]: false }));
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
        body: JSON.stringify({ surveyId: survey.id, body }),
      });
      const json = await res.json();
      if (!res.ok) { push(json.error || "Add question failed", "error"); return; }
      if (json.question) setQuestions((prev) => [...prev, json.question as Question]);
      setNewQ("");
      push("Question added", "success");
    } catch (e) {
      push(e instanceof Error ? e.message : "Add question failed", "error");
    } finally {
      setAdding(false);
    }
  }

  // Favorite toggle (optimistic)
  async function toggleLike() {
    if (!survey?.id) return;
    try {
      setLiking(true);
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { push("Please sign in to favorite.", "error"); return; }

      const res = await fetch("/api/surveys/toggle-like", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ surveyId: survey.id }),
      });
      const json = await res.json();
      if (!res.ok) { push(json.error || "Failed to update favorite", "error"); return; }

      setLiked((prev) => !prev);
      push(!liked ? "Added to favorites" : "Removed from favorites", "success");
    } catch (e) {
      push(e instanceof Error ? e.message : "Failed to update favorite", "error");
    } finally {
      setLiking(false);
    }
  }

  // Back button handler (safe fallback to /dashboard)
  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
    else window.location.href = "/dashboard";
  }

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

  // Mobile-friendly button sizing
  const btnStyle: React.CSSProperties = { minHeight: 44, padding: "10px 14px" };

  return (
    <main className="container">
      <header className="card" role="region" aria-label="Survey header">
        <h1>{survey.title}</h1>
        <p className="muted">
          <span title={createdAbs}>Created {createdRel}</span> · Visibility: <b>{survey.is_public ? "Public" : "Private"}</b> ·{" "}
          Questions: <b>{questions.length}</b> · Votes: <b>{totalQuestionVotes}</b>
        </p>
        <div className="row-actions" style={{ marginTop: 8, gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn secondary" onClick={goBack} style={btnStyle} aria-label="Go back">Back</button>
          <a className="btn secondary" href={`/surveys/${survey.id}/results`} style={btnStyle} aria-label="View results">
            View Results
          </a>
          <button
            type="button"
            className="btn secondary"
            onClick={async () => { await navigator.clipboard.writeText(location.href); push("Link copied", "success"); }}
            style={btnStyle}
            aria-label="Copy link"
          >
            Copy link
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void toggleLike()}
            disabled={liking}
            aria-pressed={liked}
            style={btnStyle}
            aria-label={liked ? "Unfavorite survey" : "Favorite survey"}
          >
            {liking ? "…" : liked ? "★ Favorited" : "☆ Favorite"}
          </button>
        </div>
      </header>

      <section className="card" aria-labelledby="questions">
        <h2 id="questions">Questions</h2>
        {questions.length === 0 ? (
          <div className="row" role="note" aria-live="polite">
            <span className="muted">No questions yet — add your first one below.</span>
          </div>
        ) : (
          <ul className="list" role="listbox" aria-label="Questions list">
            {questions.map((q) => {
              const isPending = Boolean(pending[q.id]);
              return (
                <li key={q.id} className="row touch-row" aria-label={`Question: ${q.body}`}>
                  <div style={{ width: "100%" }}>
                    <div style={{ marginBottom: 8, fontWeight: 600 }}>{q.body}</div>
                    <div className="row-actions" role="group" aria-label={`Vote on: ${q.body}`}>
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={isPending}
                        onClick={() => void vote(q.id, "yes")}
                        aria-disabled={isPending}
                      >
                        Yes ({q.yes_count})
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={isPending}
                        onClick={() => void vote(q.id, "no")}
                        aria-disabled={isPending}
                      >
                        No ({q.no_count})
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(isOwner || isAdmin) && (
        <section className="card" aria-labelledby="add-question">
          <h3 id="add-question">Add Question</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <div className="row-actions" style={{ gap: 8 }}>
              <input
                ref={addRef}
                className="input touch"
                value={newQ}
                onChange={(e) => setNewQ(e.target.value)}
                placeholder="Type your question…"
                aria-label="Question text"
                inputMode="text"
                onKeyDown={(e) => { if (e.key === "Enter" && newQ.trim() && !adding) { e.preventDefault(); void addQuestion(); }}}
              />
              <button className="btn" disabled={!newQ.trim() || adding} onClick={() => void addQuestion()} aria-label="Add question">
                {adding ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </section>
      )}

      <div style={{ height: 64 }} />
    </main>
  );
}
