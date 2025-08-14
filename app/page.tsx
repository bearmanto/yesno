"use client";

import { useEffect, useState } from "react";
import { getClient } from "@/utils/supabase/client";
import { mcEnabled } from "@/utils/flags";

export default function Home() {
  const supabase = getClient();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setSignedIn(Boolean(data.session));
    })();
    return () => { alive = false; };
  }, [supabase]);

  return (
    <main style={{ display: "grid", gap: 16, padding: 16, maxWidth: 880, margin: "0 auto" }}>
      {/* HERO */}
      <section
        aria-label="Hero"
        style={{
          display: "grid",
          gap: 12,
          padding: 20,
          borderRadius: 16,
          background: "linear-gradient(180deg,#E8EFE9 0%, #FFFFFF 100%)",
          border: "1px solid #C9D7CB"
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <h1 style={{ fontSize: 28, lineHeight: 1.15, margin: 0 }}>
            Better surveys. Less friction.
          </h1>
          <p style={{ margin: 0, color: "#344e41" }}>
            Mobile‑first, touch‑friendly, and fast. Create yes/no surveys in seconds,
            with CSV results. Multiple Choice is gated behind a feature flag for stability.
          </p>
        </div>

        {/* CTA group with Create survey entry point */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <a className="btn" href={signedIn ? "/dashboard" : "/signin"} aria-label="Primary call to action">
            {signedIn ? "Go to Dashboard" : "Get started free"}
          </a>
          <a className="btn secondary" href="/dashboard" aria-label="Browse public surveys">
            Browse surveys
          </a>
          <a
            className="btn secondary"
            href={signedIn ? "/create" : "/signin?next=%2Fcreate"}
            aria-label="Create a survey"
          >
            Create survey
          </a>
        </div>

        {/* mini demo card */}
        <div
          role="note"
          aria-label="Mini demo"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 8,
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            border: "1px dashed #C9D7CB",
            background: "#fff"
          }}
        >
          <div style={{ fontWeight: 600 }}>Live preview</div>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 600 }}>Do you prefer remote work?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn secondary" disabled>Yes</button>
              <button className="btn secondary" disabled>No</button>
            </div>
          </div>
          <div className="muted">Interactive votes available inside each survey.</div>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section aria-label="Value" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr", alignItems: "stretch" }}>
          <ValueCard
            title="Simple to build"
            body="Create yes/no surveys fast. Private or public with sensible RLS."
            icon="#3a5a40"
          />
          <ValueCard
            title="Touch-first design"
            body="A modern, flat UI inspired by Typeform, SurveyMonkey & Claude."
            icon="#588157"
          />
          <ValueCard
            title="Fast results"
            body="Per-question results and CSV export (owner-only)."
            icon="#a3b18a"
          />
        </div>
      </section>

      {/* COMING SOON — Kialo-inspired */}
      <section
        aria-label="Coming soon"
        style={{
          display: "grid",
          gap: 10,
          padding: 16,
          borderRadius: 12,
          border: "1px solid #C9D7CB",
          background: "#fff"
        }}
      >
        <div style={{ fontWeight: 700 }}>Visual logic flow (Kialo‑style) — Coming soon</div>
        <p className="muted" style={{ margin: 0 }}>
          Structure complex surveys with branching paths and nested follow‑ups.
          We’ll roll this out gradually after results + export are complete.
        </p>
        <div className="muted">
          Status: {mcEnabled() ? "MC flag enabled (admin/testing)" : "MC flag disabled (stable mode)"}
        </div>
      </section>

      <footer style={{ textAlign: "center", color: "#344e41", paddingBottom: 28 }}>
        © {new Date().getFullYear()} Yes/No — built for fast research.
      </footer>
    </main>
  );
}

function ValueCard({ title, body, icon }: { title: string; body: string; icon: string }) {
  return (
    <div
      className="card"
      style={{
        borderRadius: 12,
        borderColor: "#C9D7CB",
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div aria-hidden style={{
          width: 28, height: 28, borderRadius: 8, background: icon, opacity: 0.85, flex: "0 0 auto"
        }} />
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <div className="muted">{body}</div>
        </div>
      </div>
    </div>
  );
}
