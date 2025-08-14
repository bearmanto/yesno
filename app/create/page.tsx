"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getClient } from "@/utils/supabase/client";

export default function CreateSurveyPage() {
  const supabase = getClient();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setError(null);
    setCreating(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { setError("Please sign in first."); setCreating(false); return; }
      const res = await fetch("/api/surveys/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim() || "Untitled", isPublic }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Failed to create survey"); setCreating(false); return; }
      const id = json?.survey?.id || json?.id;
      if (id) router.replace(`/surveys/${id}?new=1`);
      else router.replace("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create survey");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="container" aria-labelledby="create-title">
      <h1 id="create-title" style={{ marginBottom: 12 }}>Create a new survey</h1>
      <form onSubmit={onCreate} className="card" aria-label="Create survey form">
        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Title</span>
            <input
              className="input touch"
              placeholder="Survey title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Survey title"
              inputMode="text"
            />
          </label>

          <label className="row" style={{ gap: 8 }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              aria-label="Public survey"
            />
            <span className="muted">Public</span>
          </label>

          {error && <p className="error" role="alert">{error}</p>}

          <div className="row-actions" style={{ gap: 8 }}>
            <button className="btn" type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create"}
            </button>
            <a className="btn secondary" href="/dashboard">Cancel</a>
          </div>

          <p className="muted" style={{ fontSize: 12 }}>
            Public surveys are visible to everyone. Private surveys are visible only to you/admin.
          </p>
        </div>
      </form>
    </main>
  );
}
