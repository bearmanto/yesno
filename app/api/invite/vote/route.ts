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
  if (!body?.surveyId || !body?.answer || !["yes", "no"].includes(body.answer)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : undefined;

  const client = createClient(supabaseUrl, anonKey, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });

  if (body.questionId) {
    const { error } = await client.rpc("increment_question_counter", {
      qid: body.questionId,
      column_name: body.answer === "yes" ? "yes_count" : "no_count",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });

    // Return the updated question row (and parent survey unchanged)
    const { data: question, error: qErr } = await client
      .from("survey_questions")
      .select("*")
      .eq("id", body.questionId)
      .maybeSingle();
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, question });
  } else {
    const { error } = await client.rpc("increment_counter", {
      table_name: "surveys",
      id_value: body.surveyId,
      column_name: body.answer === "yes" ? "yes_count" : "no_count",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });

    // Return the updated survey row
    const { data: survey, error: sErr } = await client
      .from("surveys")
      .select("*")
      .eq("id", body.surveyId)
      .maybeSingle();
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, survey });
  }
}
