import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = { surveyId: string; title: string };

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
  const title = (body?.title ?? "").trim();
  if (!body?.surveyId || !title) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const { data, error } = await client
    .from("surveys")
    .update({ title })
    .eq("id", body.surveyId)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ survey: data });
}
