import AuthStatus from "@/components/AuthStatus";
import CreateSurveyForm from "@/components/CreateSurveyForm";
import SurveysList from "@/components/SurveysList";

export default function Home() {
  return (
    <main className="container">
      <h1>Yes/No — MVP</h1>
      <div style={{ marginTop: 12 }}>
        <AuthStatus />
      </div>

      <section className="card">
        <h2>Create a survey</h2>
        <p className="muted">Sign in first, then create a survey (public by default).</p>
        <CreateSurveyForm />
      </section>

      <section className="card">
        <h2>Browse</h2>
        <SurveysList />
      </section>

      <p className="muted" style={{ marginTop: 24 }}>Try <code>/api/health</code> to confirm envs.</p>
    </main>
  );
}
