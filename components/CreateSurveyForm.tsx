"use client";

import { useState } from "react";
import { getClient } from "@/utils/supabase/client";

export default function CreateSurveyForm() {
  const supabase = getClient();
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Please sign in first.");
      const res = await fetch("/api/surveys/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, is_public: isPublic }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "create failed");
      window.location.href = `/surveys/${payload.survey.id}`;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
      <label>
        <div>Survey Title</div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required style={{ padding: 8, width: "100%" }} />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        Public
      </label>
      <button type="submit">Create Survey</button>
      {message && <div style={{ color: "crimson" }}>{message}</div>}
    </form>
  );
}
