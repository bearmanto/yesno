"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getClient } from "@/utils/supabase/client";

type Survey = {
  id: string;
  owner_id: string;
  title: string;
  is_public: boolean;
  created_at: string;
};

export default function SurveysList() {
  const supabase = getClient();
  const [mine, setMine] = useState<Survey[]>([]);
  const [pub, setPub] = useState<Survey[]>([]);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const u = userRes.user;
      if (mounted) setEmail(u?.email ?? null);

      if (u?.id) {
        const resp = await supabase
          .from("surveys")
          .select("*")
          .eq("owner_id", u.id)
          .order("created_at", { ascending: false })
          .limit(10);
        if (mounted && resp.data) setMine(resp.data as unknown as Survey[]);
      }

      const respPub = await supabase
        .from("surveys")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(10);
      if (mounted && respPub.data) setPub(respPub.data as unknown as Survey[]);
    })();
    return () => { mounted = false; };
  }, [supabase]);

  const Empty = ({ text }: { text: string }) => (
    <div className="row" role="note" aria-live="polite">
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="14" rx="2" ry="2" fill="none" stroke="currentColor" />
          <path d="M3 8h18" stroke="currentColor" />
        </svg>
        <span className="muted">{text}</span>
      </span>
    </div>
  );

  return (
    <div className="grid2" role="region" aria-label="Surveys overview">
      <section className="card" aria-labelledby="mine">
        <h3 id="mine">My Surveys {email ? <span className="muted">({email})</span> : null}</h3>
        {mine.length === 0 ? (
          <Empty text="No surveys yet. Create one above ↑" />
        ) : (
          <ul className="list">
            {mine.map(s => (
              <li key={s.id} className="row">
                <span>{s.title}</span>
                <Link className="link" href={`/surveys/${s.id}`}>Open</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="public">
        <h3 id="public">Public Surveys</h3>
        {pub.length === 0 ? (
          <Empty text="No public surveys yet." />
        ) : (
          <ul className="list">
            {pub.map(s => (
              <li key={s.id} className="row">
                <span>{s.title}</span>
                <Link className="link" href={`/surveys/${s.id}`}>Open</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
