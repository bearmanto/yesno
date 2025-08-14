"use client";

import Link from "next/link";
import { getClient } from "@/utils/supabase/client";
import { useToast } from "@/components/toast/ToastProvider";
import { useState } from "react";
import { timeAgo } from "@/utils/time";

export type Survey = {
  id: string;
  owner_id: string;
  title: string;
  is_public: boolean;
  yes_count: number | null;
  no_count: number | null;
  created_at: string;
};

export default function SurveyCard({
  survey,
  canManage = false,
  onChanged,
}: {
  survey: Survey;
  canManage?: boolean;
  onChanged?: () => void;
}) {
  const supabase = getClient();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const votes = (survey.yes_count ?? 0) + (survey.no_count ?? 0);
  const rel = timeAgo(survey.created_at);
  const abs = new Date(survey.created_at).toLocaleString();

  async function rename() {
    const title = prompt("New title:", survey.title)?.trim();
    if (!title || title === survey.title) return;
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return push("Please sign in.", "error");
      const res = await fetch("/api/surveys/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ surveyId: survey.id, title }),
      });
      const json = await res.json();
      if (!res.ok) return push(json.error || "Rename failed", "error");
      push("Title updated", "success");
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisibility() {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("surveys")
        .update({ is_public: !survey.is_public })
        .eq("id", survey.id);
      if (error) return push(error.message, "error");
      push(survey.is_public ? "Set to Private" : "Set to Public", "success");
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm("Delete this survey? This cannot be undone.")) return;
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return push("Please sign in.", "error");
      const res = await fetch("/api/surveys/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ surveyId: survey.id }),
      });
      const json = await res.json();
      if (!res.ok) return push(json.error || "Delete failed", "error");
      push("Survey deleted", "success");
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${location.origin}/surveys/${survey.id}`);
    push("Link copied", "success");
  }

  return (
    <li className="card" style={{ padding: 12, listStyle: "none" }}>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div style={{ display: "grid", gap: 2 }}>
          <b style={{ lineHeight: 1.3 }}>{survey.title}</b>
          <span className="muted" title={abs}>
            {survey.is_public ? "Public" : "Private"} · {votes} vote{votes === 1 ? "" : "s"} · {rel}
          </span>
        </div>
        <div className="row-actions" style={{ gap: 6 }}>
          <button className="btn secondary" onClick={copyLink} aria-label="Copy survey link">Share</button>
          <Link className="btn secondary" href={`/surveys/${survey.id}`} aria-label={`Open survey ${survey.title}`}>
            Open
          </Link>
        </div>
      </div>

      {canManage && (
        <div className="row-actions" style={{ marginTop: 8 }}>
          <button className="btn" disabled={busy} onClick={rename}>Rename</button>
          <button className="btn secondary" disabled={busy} onClick={toggleVisibility}>
            {survey.is_public ? "Make Private" : "Make Public"}
          </button>
          <button className="btn secondary" disabled={busy} onClick={del}>Delete</button>
        </div>
      )}
    </li>
  );
}
