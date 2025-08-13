import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/utils/supabase/admin";
import { createClient } from "@supabase/supabase-js";

/**
 * Admin-only metrics.
 * Guard: require Authorization Bearer token AND public.is_admin(uid)=true.
 * Then use service-role for aggregation.
 */
export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const token = req.headers.get("authorization")?.slice(7);
  if (!supabaseUrl || !anonKey) return NextResponse.json({ error: "env missing" }, { status: 500 });
  if (!token) return NextResponse.json({ error: "auth required" }, { status: 401 });

  // Verify admin with a user-scoped client
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userRes } = await userClient.auth.getUser();
  const uid = userRes?.user?.id ?? null;
  if (!uid) return NextResponse.json({ error: "invalid session" }, { status: 401 });
  const { data: isAdmin } = await userClient.rpc("is_admin", { uid });
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = getAdmin();

  // Counts of public/private
  const [{ count: surveys_public }, { count: surveys_private }] = await Promise.all([
    admin.from("surveys").select("*", { count: "exact", head: true }).eq("is_public", true),
    admin.from("surveys").select("*", { count: "exact", head: true }).eq("is_public", false),
  ]);

  // Aggregate survey-level yes/no
  type VoteRow = { yes_count: number | null; no_count: number | null };
  const { data: sSum } = await admin.from("surveys").select("yes_count, no_count");
  const totalSurveyVotes = (sSum as VoteRow[] | null ?? []).reduce(
    (acc, r) => acc + (r.yes_count ?? 0) + (r.no_count ?? 0),
    0
  );

  // Aggregate question-level yes/no
  const { data: qAgg } = await admin.from("survey_questions").select("yes_count, no_count");
  const totalQuestionVotes = (qAgg as VoteRow[] | null ?? []).reduce(
    (acc, r) => acc + (r.yes_count ?? 0) + (r.no_count ?? 0),
    0
  );

  // Users count
  const { count: users } = await admin.from("profiles").select("*", { count: "exact", head: true });

  // Recent surveys
  type Recent = { id: string; title: string; is_public: boolean; created_at: string };
  const { data: recent } = await admin
    .from("surveys")
    .select("id, title, is_public, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    surveys_public: surveys_public ?? 0,
    surveys_private: surveys_private ?? 0,
    total_survey_votes: totalSurveyVotes,
    total_question_votes: totalQuestionVotes,
    users: users ?? 0,
    recent: (recent as Recent[] | null) ?? [],
  });
}
