import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/utils/supabase/admin";

const ALLOWED_TYPES = ["yesno", "multi", "rating", "text"] as const;
type QType = typeof ALLOWED_TYPES[number];

type Body = {
  surveyId?: string;
  body?: string;
  type?: QType;          // optional, defaults to 'yesno'
  options?: string[];    // used when type === 'multi'
};

type OptionRow = {
  id: string;
  question_id: string;
  label: string;
  position: number;
  votes_count?: number;
};

export async function POST(req: NextRequest) {
  try {
    const admin = getAdmin();
    const { surveyId, body, type, options }: Body = await req.json();

    const qtype: QType = (type ?? "yesno");
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
    if (sErr || !survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });

    const { data: isAdmin, error: adminErr } = await admin.rpc("is_admin", { uid });
    if (adminErr) return NextResponse.json({ error: adminErr.message }, { status: 500 });
    if (survey.owner_id !== uid && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Insert question (explicit qtype)
    const { data: q, error: qErr } = await admin
      .from("survey_questions")
      .insert({ survey_id: surveyId, body: text, qtype })
      .select("id, survey_id, body, qtype, yes_count, no_count, created_at")
      .single();
    if (qErr || !q) {
      return NextResponse.json({ error: qErr?.message || "Failed to add question" }, { status: 500 });
    }

    let insertedOptions: Required<OptionRow>[] = [];

    // Insert options if multi
    if (qtype === "multi") {
      const rows =
        (options ?? [])
          .map((label) => (label ?? "").trim())
          .filter(Boolean)
          .map((label, i) => ({
            question_id: q.id as string,
            label,
            position: i,
          }));

      if (rows.length === 0) {
        return NextResponse.json({ error: "Provide at least one option for Multiple Choice" }, { status: 400 });
      }

      const { error: insErr } = await admin.from("question_options").insert(rows);
      if (insErr) {
        // cleanup the just-created question to avoid half-created objects
        await admin.from("survey_questions").delete().eq("id", q.id);
        return NextResponse.json({ error: `Failed to add options: ${insErr.message}` }, { status: 500 });
      }

      // Read back options (with votes_count). If the column doesn't exist yet, gracefully fallback.
      const { data: opts, error: selErr } = await admin
        .from("question_options")
        .select("id, question_id, label, position, votes_count")
        .eq("question_id", q.id)
        .order("position", { ascending: true });

      if (selErr) {
        // Fallback without votes_count, synthesize 0
        const { data: opts2, error: selErr2 } = await admin
          .from("question_options")
          .select("id, question_id, label, position")
          .eq("question_id", q.id)
          .order("position", { ascending: true });

        if (selErr2) {
          return NextResponse.json({ error: `Failed to load options: ${selErr2.message}` }, { status: 500 });
        }

        const safeOpts = (opts2 ?? []).map((o) => ({
          id: (o as { id: string }).id,
          question_id: (o as { question_id: string }).question_id,
          label: (o as { label: string }).label,
          position: (o as { position: number }).position,
          votes_count: 0,
        })) as Required<OptionRow>[];

        insertedOptions = safeOpts;
      } else {
        insertedOptions = ((opts ?? []) as OptionRow[]).map(o => ({
          id: o.id,
          question_id: o.question_id,
          label: o.label,
          position: o.position,
          votes_count: o.votes_count ?? 0,
        })) as Required<OptionRow>[];
      }
    }

    return NextResponse.json(
      { ok: true, question: q, options: insertedOptions },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
