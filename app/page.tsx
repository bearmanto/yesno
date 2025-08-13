import AuthStatus from "@/components/AuthStatus";

export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Yes/No — MVP</h1>
      <p>Milestone 1: Email/Password auth + profiles auto-create + dashboard.</p>
      <div style={{ marginTop: 12 }}>
        <AuthStatus />
      </div>
      <p style={{ marginTop: 24, opacity: 0.8 }}>Try <code>/api/health</code> to confirm envs.</p>
    </main>
  );
}
