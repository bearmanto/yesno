"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getClient } from "@/utils/supabase/client";
import { useToast } from "@/components/toast/ToastProvider";

export default function CreateSurveyForm() {
  const supabase = getClient();
  const router = useRouter();
  const { push } = useToast();

  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { push("Please sign in.", "error"); return; }

      const res = await fetch("/api/surveys/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: t, isPublic }),
      });
      const json = await res.json();

      if (!res.ok) {
        push(json?.error || "Create failed", "error");
        return;
      }

      const id: string | undefined = json?.id || json?.survey?.id;
      if (!id) {
        push("Survey created but couldn’t open it. Check Dashboard.", "error");
        router.push("/dashboard");
        return;
      }

      push("Survey created", "success");
      router.push(`/surveys/${id}?new=1`);
    } catch (e) {
      push(e instanceof Error ? e.message : "Create failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onCreate} className="card" aria-label="Create survey">
      <h3>Create Survey</h3>
      <div className="row-actions" style={{ gap: 8 }}>
        <input
          className="input touch"
          placeholder="Survey title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          inputMode="text"
          aria-label="Survey title"
        />
        <select
          className="input touch"
          aria-label="Visibility"
          value={isPublic ? "public" : "private"}
          onChange={(e) => setIsPublic(e.target.value === "public")}
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
        <button className="btn" disabled={!title.trim() || busy} type="submit">
          {busy ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}
