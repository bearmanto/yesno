import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "supabase env missing" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : undefined;

  const client = createClient(supabaseUrl, anonKey, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });

  const { data: survey, error: sErr } = await client
    .from("surveys")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (!survey) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: questions, error: qErr } = await client
    .from("survey_questions")
    .select("*")
    .eq("survey_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const { count: likeCount } = await client
    .from("survey_likes")
    .select("*", { count: "exact", head: true })
    .eq("survey_id", id);

  let isOwner = false;
  let isAdmin = false;
  let likedByMe = false;

  if (token) {
    const { data: userRes } = await client.auth.getUser();
    const uid = userRes?.user?.id ?? null;
    if (uid && uid === survey.owner_id) isOwner = true;
    const { data: adminData } = await client.rpc("is_admin", { uid });
    isAdmin = Boolean(adminData);

    const { count } = await client
      .from("survey_likes")
      .select("*", { count: "exact", head: true })
      .eq("survey_id", id)
      .eq("user_id", uid);
    likedByMe = (count ?? 0) > 0;
  }

  return NextResponse.json({
    survey,
    questions,
    isOwner,
    isAdmin,
    likeCount: likeCount ?? 0,
    likedByMe,
  });
}
