"use client";

import { useEffect, useMemo, useState } from "react";
import { getClient } from "@/utils/supabase/client";
import SurveyCard, { type Survey } from "./SurveyCard";

export default function SurveyList({
  mode,
  pageSize = 10,
}: {
  mode: "mine" | "public";
  pageSize?: number;
}) {
  const supabase = getClient();
  const [items, setItems] = useState<Survey[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  async function fetchMine() {
    setLoading(true);
    const { data: me } = await supabase.auth.getUser();
    const uid = me.user?.id ?? null;
    setEmail(me.user?.email ?? null);
    if (!uid) { setItems([]); setLoading(false); return; }
    const { data } = await supabase
      .from("surveys")
      .select("*")
      .eq("owner_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as unknown as Survey[]) ?? []);
    setHasMore(false);
    setLoading(false);
  }

  async function fetchPublic(nextPage: number) {
    setLoading(true);
    const from = nextPage * pageSize;
    const to = from + pageSize - 1;
    const { data } = await supabase
      .from("surveys")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range(from, to);
    const arr = (data as unknown as Survey[]) ?? [];
    if (nextPage === 0) setItems(arr);
    else setItems(prev => [...prev, ...arr]);
    setHasMore(arr.length === pageSize); // more likely exists if we filled a page
    setLoading(false);
  }

  useEffect(() => {
    // reset pagination when mode changes
    setItems([]);
    setPage(0);
    setHasMore(true);
    if (mode === "mine") void fetchMine();
    else void fetchPublic(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const heading = useMemo(() => mode === "mine" ? "My Surveys" : "Public Surveys", [mode]);

  return (
    <section className="card" aria-labelledby={`list-${mode}`} style={{ paddingBottom: 12 }}>
      <h3 id={`list-${mode}`}>
        {heading} {mode === "mine" && email ? <span className="muted">({email})</span> : null}
      </h3>

      {loading && items.length === 0 ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No surveys {mode === "mine" ? "yet. Create one above ↑" : "to show."}</p>
      ) : (
        <ul className="list" style={{ gap: 8 }}>
          {items.map((s) => (
            <SurveyCard
              key={s.id}
              survey={s}
              canManage={mode === "mine"}
              onChanged={() => {
                if (mode === "mine") void fetchMine();
                else void fetchPublic(0);
              }}
            />
          ))}
        </ul>
      )}

      {mode === "public" && (
        <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
          {hasMore ? (
            <button
              className="btn"
              onClick={() => { const np = page + 1; setPage(np); void fetchPublic(np); }}
            >
              Load more
            </button>
          ) : (
            <span className="muted">End of list</span>
          )}
        </div>
      )}
    </section>
  );
}
