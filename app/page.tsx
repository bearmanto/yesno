export default function Home() {
  return (
    <main className="container" aria-labelledby="hero-title">
      <section className="hero card">
        <div className="hero-grid">
          <div className="hero-copy">
            <h1 id="hero-title" className="hero-h1">
              Simple, fast, <span className="accent">Yes/No</span> surveys.
            </h1>
            <p className="muted hero-sub">
              Create a survey in seconds. Share a link. Get clear answers. Designed for mobile, ready for scale.
            </p>
            <div className="row-actions" style={{ gap: 12, flexWrap: "wrap" }}>
              <a className="btn" href="/create" aria-label="Create a new survey">Create a survey</a>
              <a className="btn secondary" href="/dashboard" aria-label="Go to dashboard">Go to dashboard</a>
            </div>
            <p className="tiny muted" style={{ marginTop: 8 }}>
              Free plan • No credit card • Privacy-first
            </p>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <img
              src="/hero-yesno.svg"
              alt=""
              width={640}
              height={420}
              style={{ width: "100%", height: "auto", display: "block", borderRadius: 16 }}
              loading="eager"
            />
          </div>
        </div>
      </section>

      <section className="how card" aria-labelledby="how-title">
        <h2 id="how-title" className="how-h2">How it works</h2>
        <ul className="how-steps">
          <li className="how-step">
            <div className="how-pill">1</div>
            <div>
              <div className="how-title">Create</div>
              <div className="muted">Add Yes/No questions in a tap.</div>
            </div>
          </li>
          <li className="how-step">
            <div className="how-pill">2</div>
            <div>
              <div className="how-title">Share</div>
              <div className="muted">Send a link anywhere. Public or private.</div>
            </div>
          </li>
          <li className="how-step">
            <div className="how-pill">3</div>
            <div>
              <div className="how-title">See results</div>
              <div className="muted">Instant counts, CSV export, admin view.</div>
            </div>
          </li>
        </ul>
      </section>

      <style>{`
        .hero { padding: 28px; }
        .hero-grid { display: grid; grid-template-columns: 1fr; gap: 20px; align-items: center; }
        .hero-h1 { font-size: 28px; line-height: 1.1; margin: 0 0 8px; letter-spacing: -0.02em; }
        .hero-sub { font-size: 15px; margin: 0 0 14px; }
        .accent { color: #588157; }
        .how { margin-top: 16px; padding: 20px; }
        .how-h2 { font-size: 18px; margin: 0 0 12px; }
        .how-steps { display: grid; grid-template-columns: 1fr; gap: 10px; list-style: none; padding: 0; margin: 0; }
        .how-step { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: center; padding: 10px; border: 1px solid #C9D7CB; border-radius: 12px; background: #fff; }
        .how-pill { width: 28px; height: 28px; border-radius: 999px; background: #a3b18a; color: #fff; display: grid; place-items: center; font-weight: 600; }
        .how-title { font-weight: 600; margin-bottom: 2px; }

        /* Desktop enhancements */
        @media (min-width: 1024px) {
          .hero { padding: 36px; }
          .hero-grid { grid-template-columns: 1.1fr 1fr; gap: 28px; }
          .hero-h1 { font-size: 44px; }
          .hero-sub { font-size: 16px; }
          .how { margin-top: 24px; padding: 24px; }
          .how-steps { grid-template-columns: repeat(3, 1fr); gap: 12px; }
        }

        /* Micro-interactions */
        .btn { transition: transform 150ms ease, box-shadow 150ms ease; }
        .btn:active { transform: scale(0.98); }
      `}</style>
    </main>
  );
}
