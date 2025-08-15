export default function FavoritesPage() {
  return (
    <main className="container" aria-labelledby="fav-title">
      <section className="card">
        <h1 id="fav-title">Favorites</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Your liked surveys will appear here. Coming soon!
        </p>
        <a className="btn" href="/dashboard" style={{ marginTop: 12 }}>
          Go to dashboard
        </a>
      </section>
      <div style={{ height: 64 }} />
    </main>
  );
}
