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
    return () => {
      mounted = false;
    };
  }, [supabase]);

  return (
    <div className="grid2">
      <section className="card">
        <h3>
          My Surveys {email ? <span className="muted">({email})</span> : null}
        </h3>
        {mine.length === 0 ? (
          <p className="muted">None yet.</p>
        ) : (
          <ul className="list">
            {mine.map((s) => (
              <li key={s.id} className="row">
                <span>{s.title}</span>
                <Link className="link" href={`/surveys/${s.id}`}>
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3>Public Surveys</h3>
        {pub.length === 0 ? (
          <p className="muted">None yet.</p>
        ) : (
          <ul className="list">
            {pub.map((s) => (
              <li key={s.id} className="row">
                <span>{s.title}</span>
                <Link className="link" href={`/surveys/${s.id}`}>
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
