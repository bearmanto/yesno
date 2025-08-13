"use client";

import { useState } from "react";
import { getClient } from "@/utils/supabase/client";

export default function VisibilityToggle({ surveyId, initial }: { surveyId: string; initial: boolean }) {
  const supabase = getClient();
  const [isPublic, setIsPublic] = useState<boolean>(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Sign in required");
      const res = await fetch("/api/admin/set-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ surveyId, is_public: !isPublic }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "update failed");
      setIsPublic((v) => !v);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row-actions">
      <span className="muted">Currently: {isPublic ? "Public" : "Private"}</span>
      <button className="btn secondary" onClick={toggle} disabled={busy}>
        Set {isPublic ? "Private" : "Public"}
      </button>
    </div>
  );
}
