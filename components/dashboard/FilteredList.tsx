"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getClient } from "@/utils/supabase/client";

type Survey = {
  id: string;
  owner_id: string;
  title: string;
  is_public: boolean;
  yes_count: number | null;
  no_count: number | null;
  created_at: string;
};

type Props = { filter: string; sort: string };

export default function FilteredList({ filter, sort }: Props) {
  const supabase = getClient();
  const [items, setItems] = useState<Survey[]>([]);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: me } = await supabase.auth.getUser();
      const uid = me.user?.id ?? null;
      setEmail(me.user?.email ?? null);

      let q = supabase
        .from("surveys")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (filter === "mine" && uid) q = q.eq("owner_id", uid);
      if (filter === "public") q = q.eq("is_public", true);
      if (filter === "private") q = q.eq("is_public", false);

      const { data } = await q;
      if (mounted && data) setItems(data as unknown as Survey[]);
    })();
    return () => { mounted = false; };
    // refetch when filter changes; sorting happens client-side
  }, [filter, supabase]);

  const sorted = useMemo(() => {
    const copy = [...items];
    if (sort === "title") copy.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "votes") {
      copy.sort((a, b) => {
        const av = (a.yes_count ?? 0) + (a.no_count ?? 0);
        const bv = (b.yes_count ?? 0) + (b.no_count ?? 0);
        return bv - av;
      });
    }
    return copy; // "new" is default order from DB
  }, [items, sort]);

  return (
    <section className="card" aria-labelledby="results">
      <h3 id="results">
        Results {filter === "mine" && email ? <span className="muted">({email})</span> : null}
      </h3>
      {sorted.length === 0 ? (
        <p className="muted">No surveys match your filters.</p>
      ) : (
        <ul className="list">
          {sorted.map((s) => (
            <li key={s.id} className="row touch-row">
              <div style={{ display: "grid" }}>
                <b>{s.title}</b>
                <span className="muted">{s.is_public ? "Public" : "Private"}</span>
              </div>
              <Link className="btn secondary" href={`/surveys/${s.id}`} aria-label={`Open survey ${s.title}`}>
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
