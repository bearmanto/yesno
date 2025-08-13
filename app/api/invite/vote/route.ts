import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  surveyId: string;
  questionId?: string | null;
  answer: "yes" | "no";
};

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "supabase env missing" }, { status: 500 });
  }

  const body = (await req.json()) as Body;
  if (!body?.answer || !["yes", "no"].includes(body.answer)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : undefined;

  const client = createClient(supabaseUrl, anonKey, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });

  // Per-question voting: require auth and use RPC to constrain to 1 vote per user
  if (body.questionId) {
    if (!token) return NextResponse.json({ error: "auth required to vote" }, { status: 401 });
    const { data, error } = await client.rpc("set_question_vote", {
      qid: body.questionId,
      choice: body.answer,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });

    // data can be an array (supabase-js) — pick first
    const row = Array.isArray(data) ? data[0] : data;
    const question = row
      ? { id: row.question_id as string, yes_count: row.yes_count as number, no_count: row.no_count as number }
      : null;

    return NextResponse.json({ ok: true, question });
  }

  // Legacy whole-survey vote (kept for backward compatibility; not used in UI now)
  if (!body?.surveyId) return NextResponse.json({ error: "surveyId required" }, { status: 400 });
  const { error } = await client.rpc("increment_counter", {
    table_name: "surveys",
    id_value: body.surveyId,
    column_name: body.answer === "yes" ? "yes_count" : "no_count",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  const { data: survey, error: sErr } = await client
    .from("surveys")
    .select("*")
    .eq("id", body.surveyId)
    .maybeSingle();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, survey });
}
