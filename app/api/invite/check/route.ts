import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const _body = await req.json().catch(() => ({}));
  return NextResponse.json(
    { ok: false, error: "Invite codes not implemented yet." },
    { status: 501 }
  );
}
