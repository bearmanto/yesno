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
    setHasMore(arr.length === pageSize);
    setLoading(false);
  }

  useEffect(() => {
    setItems([]); setPage(0); setHasMore(true);
    if (mode === "mine") void fetchMine();
    else void fetchPublic(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const heading = useMemo(() => mode === "mine" ? "My Surveys" : "Public Surveys", [mode]);

  // Group by day for public mode
  function dayKey(iso: string) {
    const d = new Date(iso);
    return d.toISOString().slice(0,10); // YYYY-MM-DD
  }
  function dayLabel(isoDate: string) {
    const today = new Date().toISOString().slice(0,10);
    const y = new Date(Date.now() - 86400000).toISOString().slice(0,10);
    if (isoDate === today) return "Today";
    if (isoDate === y) return "Yesterday";
    const d = new Date(isoDate);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  const grouped = useMemo(() => {
    if (mode !== "public") return null;
    const map = new Map<string, Survey[]>();
    for (const it of items) {
      const k = dayKey(it.created_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return Array.from(map.entries()).sort((a,b) => b[0].localeCompare(a[0])); // newest day first
  }, [items, mode]);

  return (
    <section className="card" aria-labelledby={`list-${mode}`} style={{ paddingBottom: 12 }}>
      <h3 id={`list-${mode}`}>
        {heading} {mode === "mine" && email ? <span className="muted">({email})</span> : null}
      </h3>

      {loading && items.length === 0 ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No surveys {mode === "mine" ? "yet. Create one above ↑" : "to show."}</p>
      ) : mode === "mine" ? (
        <ul className="list" style={{ gap: 8 }}>
          {items.map((s) => (
            <SurveyCard
              key={s.id}
              survey={s}
              canManage={mode === "mine"}
              onChanged={() => { void fetchMine(); }}
            />
          ))}
        </ul>
      ) : (
        <>
          {grouped!.map(([k, arr]) => (
            <div key={k} style={{ marginBottom: 8 }}>
              <div
                className="muted"
                style={{ display: "block", margin: "8px 0 4px 0", fontWeight: 600 }}
              >
                {dayLabel(k)}
              </div>
              <ul className="list" style={{ gap: 8 }}>
                {arr.map((s) => (
                  <SurveyCard
                    key={s.id}
                    survey={s}
                    canManage={false}
                    onChanged={() => { void fetchPublic(0); }}
                  />
                ))}
              </ul>
            </div>
          ))}
        </>
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
