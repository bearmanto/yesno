import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = { title: string; is_public?: boolean };

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
  const title = (body?.title ?? "").trim();
  const is_public = body?.is_public ?? true;
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const { data: userRes, error: uErr } = await client.auth.getUser();
  if (uErr || !userRes?.user?.id) return NextResponse.json({ error: "invalid session" }, { status: 401 });
  const owner_id = userRes.user.id;

  const { data, error } = await client
    .from("surveys")
    .insert([{ owner_id, title, is_public }])
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ survey: data });
}
