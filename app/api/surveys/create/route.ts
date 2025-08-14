import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/utils/supabase/admin";

type CreateBody = {
  title?: string;
  isPublic?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const { title, isPublic }: CreateBody = await req.json();
    const t = (title ?? "").toString().trim();
    if (!t) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }
    const token = auth.slice(7);

    const admin = getAdmin();

    // Verify the user from the access token
    const { data: uinfo, error: uerr } = await admin.auth.getUser(token);
    if (uerr || !uinfo?.user?.id) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }
    const uid = uinfo.user.id;

    // Create survey and return id
    const { data, error } = await admin
      .from("surveys")
      .insert({
        owner_id: uid,
        title: t,
        is_public: !!isPublic,
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      return NextResponse.json(
        { error: error?.message || "Failed to create survey" },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.id }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
