import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/utils/supabase/admin";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const admin = getAdmin();

  // Identify user (must be owner or admin)
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : "";
  if (!token) return NextResponse.json({ error: "missing auth token" }, { status: 401 });

  const { data: uinfo, error: uerr } = await admin.auth.getUser(token);
  if (uerr || !uinfo?.user?.id) {
    return NextResponse.json({ error: "invalid user token" }, { status: 401 });
  }
  const uid = uinfo.user.id;

  // Load survey & permission
  const { data: survey, error: sErr } = await admin
    .from("surveys")
    .select("id, owner_id, title, is_public, created_at")
    .eq("id", id)
    .maybeSingle();

  if (sErr || !survey) {
    return NextResponse.json({ error: "survey not found" }, { status: 404 });
  }

  // Is admin?
  const { data: prof } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", uid)
    .maybeSingle();

  const isOwner = survey.owner_id === uid;
  const isAdmin = Boolean(prof?.is_admin);

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Load questions
  const { data: questions, error: qErr } = await admin
    .from("survey_questions")
    .select("id, body, yes_count, no_count, created_at")
    .eq("survey_id", id)
    .order("created_at", { ascending: true });

  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  // Build CSV
  const rows: string[] = [];
  const esc = (s: unknown) => `"${String(s ?? "").replace(/\"/g, '""')}"`;

  rows.push(["survey_id", "survey_title", "question_id", "question", "yes_count", "no_count", "created_at"].join(","));
  for (const q of questions || []) {
    rows.push([
      esc(survey.id),
      esc(survey.title),
      esc(q.id),
      esc(q.body),
      String(q.yes_count ?? 0),
      String(q.no_count ?? 0),
      esc(q.created_at),
    ].join(","));
  }
  const csv = rows.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="survey-${survey.id}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
