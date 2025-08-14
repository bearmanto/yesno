import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/utils/supabase/admin";

const ALLOWED_TYPES = ["yesno", "multi", "rating", "text"] as const;
type QType = typeof ALLOWED_TYPES[number];

type Body = {
  surveyId?: string;
  body?: string;
  type?: QType;          // optional, defaults to 'yesno'
  options?: string[];    // future use for 'multi'
};

export async function POST(req: NextRequest) {
  try {
    const admin = getAdmin();
    const { surveyId, body, type, options }: Body = await req.json();

    const qtype = (type ?? "yesno");
    if (!ALLOWED_TYPES.includes(qtype)) {
      return NextResponse.json({ error: "Invalid question type" }, { status: 400 });
    }

    const text = (body ?? "").trim();
    if (!surveyId || !text) {
      return NextResponse.json({ error: "Missing surveyId or body" }, { status: 400 });
    }

    // Auth
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }
    const token = auth.slice(7);
    const { data: uinfo, error: uerr } = await admin.auth.getUser(token);
    if (uerr || !uinfo?.user?.id) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }
    const uid = uinfo.user.id;

    // Load survey and verify permissions (owner or admin)
    const { data: survey, error: sErr } = await admin
      .from("surveys")
      .select("id, owner_id")
      .eq("id", surveyId)
      .single();

    if (sErr || !survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Admin check via RPC (defined in your schema)
    const { data: isAdmin, error: adminErr } = await admin.rpc("is_admin", { uid });
    if (adminErr) {
      return NextResponse.json({ error: adminErr.message }, { status: 500 });
    }

    if (survey.owner_id !== uid && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Insert question
    const { data: q, error: qErr } = await admin
      .from("survey_questions")
      .insert({
        survey_id: surveyId,
        body: text,
        qtype, // defaults to 'yesno' in DB; we also send explicitly
      })
      .select("id, survey_id, body, qtype, yes_count, no_count, created_at")
      .single();

    if (qErr || !q) {
      return NextResponse.json({ error: qErr?.message || "Failed to add question" }, { status: 500 });
    }

    // (Future) If 'multi', insert options
    if (qtype === "multi" && Array.isArray(options) && options.length > 0) {
      await admin.from("question_options").insert(
        options
          .map((label) => (label ?? "").trim())
          .filter(Boolean)
          .map((label, i) => ({ question_id: q.id, label, position: i }))
      );
    }

    return NextResponse.json({ ok: true, question: q }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
