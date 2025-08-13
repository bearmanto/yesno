import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = { questionId: string };

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !anonKey) return NextResponse.json({ error: "env missing" }, { status: 500 });

  const token = req.headers.get("authorization")?.toLowerCase().startsWith("bearer ")
    ? req.headers.get("authorization")!.slice(7)
    : undefined;
  if (!token) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const body = (await req.json()) as Body;
  if (!body?.questionId) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  // Load current deleted_at to enforce 30s window
  const { data: row, error: rErr } = await client
    .from("survey_questions")
    .select("id, deleted_at")
    .eq("id", body.questionId)
    .maybeSingle();

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  if (!row?.deleted_at) return NextResponse.json({ error: "not deleted" }, { status: 400 });

  const deletedAt = new Date(row.deleted_at);
  const now = new Date();
  if (now.getTime() - deletedAt.getTime() > 30_000) {
    return NextResponse.json({ error: "undo window expired" }, { status: 400 });
  }

  const { data, error } = await client
    .from("survey_questions")
    .update({ deleted_at: null })
    .eq("id", body.questionId)
    .select("id, survey_id, body, yes_count, no_count, deleted_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ question: data });
}
