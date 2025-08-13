import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = { surveyId: string; body: string };

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "supabase env missing" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : undefined;
  if (!token) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const body = (await req.json()) as Body;
  const surveyId = body?.surveyId;
  const qBody = (body?.body ?? "").trim();
  if (!surveyId || !qBody) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const { data, error } = await client
    .from("survey_questions")
    .insert([{ survey_id: surveyId, body: qBody }])
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ question: data });
}
