import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/utils/supabase/admin";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const admin = getAdmin();

  // Require auth
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : "";
  if (!token) return NextResponse.json({ error: "missing auth token" }, { status: 401 });

  const { data: uinfo, error: uerr } = await admin.auth.getUser(token);
  if (uerr || !uinfo?.user?.id) return NextResponse.json({ error: "invalid user token" }, { status: 401 });
  const uid = uinfo.user.id;

  // Check like
  const { data: row, error } = await admin
    .from("survey_likes")
    .select("survey_id")
    .eq("survey_id", id)
    .eq("user_id", uid)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ liked: Boolean(row) });
}
