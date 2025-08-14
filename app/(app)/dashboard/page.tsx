"use client";

import { useEffect, useMemo, useState } from "react";
import { getClient } from "@/utils/supabase/client";
import { timeAgo } from "@/utils/time";

type Survey = {
  id: string;
  owner_id: string;
  title: string;
  is_public: boolean;
  yes_count: number;
  no_count: number;
  created_at: string;
  liked_by_me?: boolean;
};

export default function Dashboard() {
  const supabase = getClient();
  const [mine, setMine] = useState<Survey[]>([]);
  const [pub, setPub] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"new" | "popular" | "alpha">("new");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      // Load "My surveys"
      const { data: mineRows } = await supabase
        .from("surveys")
        .select("id, owner_id, title, is_public, yes_count, no_count, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      // Load "Public surveys"
      const { data: pubRows } = await supabase
        .from("surveys")
        .select("id, owner_id, title, is_public, yes_count, no_count, created_at")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!alive) return;
      setMine((mineRows ?? []) as Survey[]);
      setPub((pubRows ?? []) as Survey[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [supabase]);

  function score(s: Survey) {
    return (s.yes_count ?? 0) + (s.no_count ?? 0);
  }

  const filterAndSort = (arr: Survey[]) => {
    const needle = q.trim().toLowerCase();
    let out = arr;
    if (needle) {
      out = out.filter(s => s.title.toLowerCase().includes(needle));
    }
    if (sort === "new") {
      out = [...out].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === "popular") {
      out = [...out].sort((a, b) => score(b) - score(a));
    } else if (sort === "alpha") {
      out = [...out].sort((a, b) => a.title.localeCompare(b.title));
    }
    return out;
  };

  const mineView = useMemo(() => filterAndSort(mine), [mine, q, sort]);
  const pubView  = useMemo(() => filterAndSort(pub),  [pub, q, sort]);

  return (
    <main className="container" aria-labelledby="dash-title">
      <h1 id="dash-title" style={{ marginBottom: 12 }}>Dashboard</h1>

      {/* Toolbar */}
      <section className="card" aria-label="Filters">
        <div style={{ display: "grid", gap: 8 }}>
          <input
            className="input touch"
            placeholder="Search surveys…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search surveys"
            inputMode="search"
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="group" aria-label="Sort surveys">
            <button
              type="button"
              className={`btn ${sort === "new" ? "" : "secondary"}`}
              onClick={() => setSort("new")}
              aria-pressed={sort === "new"}
            >Newest</button>
            <button
              type="button"
              className={`btn ${sort === "popular" ? "" : "secondary"}`}
              onClick={() => setSort("popular")}
              aria-pressed={sort === "popular"}
            >Most voted</button>
            <button
              type="button"
              className={`btn ${sort === "alpha" ? "" : "secondary"}`}
              onClick={() => setSort("alpha")}
              aria-pressed={sort === "alpha"}
            >A–Z</button>
          </div>
        </div>
      </section>

      {/* My surveys */}
      <section className="card" aria-labelledby="my-title">
        <h2 id="my-title">My surveys</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : mineView.length === 0 ? (
          <EmptyState
            headline="You have no surveys yet"
            sub="Create one from the home screen."
          />
        ) : (
          <ul className="list" role="list">
            {mineView.map((s) => (
              <li key={s.id} className="row touch-row">
                <a href={`/surveys/${s.id}`} className="row" style={{ width: "100%", textDecoration: "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{s.title}</div>
                    <div className="muted">
                      {s.is_public ? "Public" : "Private"} · {score(s)} votes · {timeAgo(s.created_at)}
                    </div>
                  </div>
                  <div className="muted" aria-hidden>›</div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Public surveys */}
      <section className="card" aria-labelledby="pub-title">
        <h2 id="pub-title">Public surveys</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : pubView.length === 0 ? (
          <EmptyState
            headline="No surveys match your search"
            sub="Try a different keyword or sort order."
          />
        ) : (
          <ul className="list" role="list">
            {pubView.map((s) => (
              <li key={s.id} className="row touch-row">
                <a href={`/surveys/${s.id}`} className="row" style={{ width: "100%", textDecoration: "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{s.title}</div>
                    <div className="muted">
                      Public · {score(s)} votes · {timeAgo(s.created_at)}
                    </div>
                  </div>
                  <div className="muted" aria-hidden>›</div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div style={{ height: 64 }} />
    </main>
  );
}

function EmptyState({ headline, sub }: { headline: string; sub?: string }) {
  return (
    <div style={{ display: "grid", placeItems: "center", gap: 8, padding: "16px 0" }} role="note" aria-live="polite">
      <svg width="72" height="72" viewBox="0 0 36 36" aria-hidden focusable="false">
        <rect x="4" y="6" width="28" height="20" rx="3" fill="#E8EFE9"></rect>
        <rect x="8" y="10" width="20" height="2" rx="1" fill="#C9D7CB"></rect>
        <rect x="8" y="14" width="14" height="2" rx="1" fill="#C9D7CB"></rect>
        <rect x="8" y="18" width="10" height="2" rx="1" fill="#C9D7CB"></rect>
      </svg>
      <div style={{ fontWeight: 600, textAlign: "center" }}>{headline}</div>
      {sub && <div className="muted" style={{ textAlign: "center" }}>{sub}</div>}
    </div>
  );
}
