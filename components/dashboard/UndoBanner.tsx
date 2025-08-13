"use client";

import { useEffect, useRef, useState } from "react";
import { getClient } from "@/utils/supabase/client";

export default function UndoBanner({ surveyId, title }: { surveyId: string; title: string }) {
  const supabase = getClient();
  const [deadline, setDeadline] = useState<number>(Date.now() + 30_000);
  const tick = useRef<number | null>(null);

  async function undo() {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return alert("Please sign in.");
    const res = await fetch("/api/surveys/undo-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ surveyId }),
    });
    const json = await res.json();
    if (!res.ok) return alert(json.error || "undo failed");
    location.replace("/dashboard");
  }

  useEffect(() => {
    tick.current = window.setInterval(() => setDeadline((d) => d), 500);
    return () => { if (tick.current) window.clearInterval(tick.current); };
  }, []);

  const remaining = Math.max(0, Math.ceil((deadline - Date.now())/1000));

  return (
    <div className="row" role="alert" style={{ marginBottom: 16 }}>
      <span>Survey deleted: “{title}”</span>
      <div className="row-actions">
        <button className="btn secondary" onClick={undo}>Undo</button>
        <span className="muted">{remaining}s</span>
      </div>
    </div>
  );
}
