import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = { surveyId: string };

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
  if (!body?.surveyId) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const { data: row, error: rErr } = await client
    .from("surveys")
    .select("id, deleted_at")
    .eq("id", body.surveyId)
    .maybeSingle();
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  if (!row?.deleted_at) return NextResponse.json({ error: "not deleted" }, { status: 400 });

  const deletedAt = new Date(row.deleted_at);
  if (Date.now() - deletedAt.getTime() > 30_000) {
    return NextResponse.json({ error: "undo window expired" }, { status: 400 });
  }

  const { error } = await client
    .from("surveys")
    .update({ deleted_at: null })
    .eq("id", body.surveyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  return NextResponse.json({ ok: true });
}
