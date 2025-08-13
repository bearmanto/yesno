import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = { surveyId: string };

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

  const { surveyId } = (await req.json()) as Body;
  if (!surveyId) return NextResponse.json({ error: "surveyId required" }, { status: 400 });

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // Toggle like and get current count
  const { data: liked, error: tErr } = await client.rpc("toggle_like", { sid: surveyId });
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 403 });

  const { count, error: cErr } = await client
    .from("survey_likes")
    .select("*", { count: "exact", head: true })
    .eq("survey_id", surveyId);
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  return NextResponse.json({ liked: Boolean(liked), likeCount: count ?? 0 });
}
