"use client";

import SurveyList from "@/components/surveys/SurveyList";

export default function DashboardPage() {
  return (
    <main className="container">
      <h1>Dashboard</h1>
      <SurveyList mode="mine" />
      <SurveyList mode="public" />
      <div style={{ height: 64 }} />
    </main>
  );
}
