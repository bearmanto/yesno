import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/utils/supabase/admin";
import { createClient } from "@supabase/supabase-js";

type Body = { surveyId: string; is_public: boolean };

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const token = req.headers.get("authorization")?.slice(7);
  if (!supabaseUrl || !anonKey) return NextResponse.json({ error: "env missing" }, { status: 500 });
  if (!token) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userRes } = await userClient.auth.getUser();
  const uid = userRes?.user?.id ?? null;
  if (!uid) return NextResponse.json({ error: "invalid session" }, { status: 401 });

  const { data: isAdmin } = await userClient.rpc("is_admin", { uid });

  const body = (await req.json()) as Body;
  if (!body?.surveyId || typeof body.is_public !== "boolean") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // fetch current owner
  const admin = getAdmin();
  const { data: survey, error: sErr } = await admin
    .from("surveys")
    .select("owner_id")
    .eq("id", body.surveyId)
    .maybeSingle();

  if (sErr || !survey) return NextResponse.json({ error: "survey not found" }, { status: 404 });

  if (!isAdmin && survey.owner_id !== uid) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { error } = await admin
    .from("surveys")
    .update({ is_public: body.is_public })
    .eq("id", body.surveyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
