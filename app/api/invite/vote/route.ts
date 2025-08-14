import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/utils/supabase/admin";
import { getUserScopedClient } from "@/utils/supabase/userServer";

type Body = {
  surveyId?: string;
  questionId?: string;
  answer?: string;
  optionId?: string;   // preferred
  optId?: string;      // tolerated
  option_id?: string;  // tolerated
};

export async function POST(req: NextRequest) {
  try {
    const admin = getAdmin();

    // Parse & normalize inputs
    const raw = (await req.json()) as Body;
    let surveyId   = (raw.surveyId   ?? "").trim() || undefined;
    let questionId = (raw.questionId ?? "").trim() || undefined;
    const optionId = (raw.optionId ?? raw.optId ?? raw.option_id ?? "").trim() || undefined;
    const answer   = raw.answer?.trim().toLowerCase();

    // Auth (user-scoped)
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }
    const token = auth.slice(7);

    const { data: uinfo, error: uerr } = await admin.auth.getUser(token);
    if (uerr || !uinfo?.user?.id) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }
    const userClient = getUserScopedClient(token);

    // ── Multiple Choice branch (prefer this if optionId present)
    if (optionId) {
      // Derive questionId if missing
      if (!questionId) {
        const { data: optRow, error: optErr } = await admin
          .from("question_options")
          .select("question_id")
          .eq("id", optionId)
          .single();
        if (optErr || !optRow?.question_id) {
          return NextResponse.json({ error: "Invalid optionId" }, { status: 400 });
        }
        questionId = String(optRow.question_id);
      }

      // Derive surveyId if missing
      if (!surveyId) {
        const { data: qRow, error: qErr } = await admin
          .from("survey_questions")
          .select("survey_id")
          .eq("id", questionId)
          .single();
        if (qErr || !qRow?.survey_id) {
          return NextResponse.json({ error: "Invalid questionId for option" }, { status: 400 });
        }
        surveyId = String(qRow.survey_id);
      }

      const { data, error } = await userClient.rpc("set_multi_choice_vote", {
        qid: questionId,
        opt_id: optionId,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, multi: data }, { status: 200 });
    }

    // ── Yes/No branch
    if (questionId && (answer === "yes" || answer === "no")) {
      // Derive surveyId if missing
      if (!surveyId) {
        const { data: qRow, error: qErr } = await admin
          .from("survey_questions")
          .select("survey_id")
          .eq("id", questionId)
          .single();
        if (qErr || !qRow?.survey_id) {
          return NextResponse.json({ error: "Invalid questionId" }, { status: 400 });
        }
        surveyId = String(qRow.survey_id);
      }

      const { data, error } = await userClient.rpc("set_question_vote", {
        qid: questionId,
        choice: answer,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      const row = Array.isArray(data) && data[0] ? data[0] : null;
      return NextResponse.json({ ok: true, question: row }, { status: 200 });
    }

    // Nothing matched
    return NextResponse.json({ error: "Missing optionId or valid answer" }, { status: 400 });
  } catch (err: unknown) {
    // Minimal server-side logging to aid debugging
    console.error("vote error:", err);
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
