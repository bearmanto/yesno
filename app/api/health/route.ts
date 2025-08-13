import { NextResponse } from "next/server";
import { getAdmin } from "@/utils/supabase/admin";

/**
 * Minimal health endpoint to confirm lazy admin works at runtime
 * (and that env vars are present). No top-level client creation.
 */
export async function GET() {
  try {
    // lazy creation happens here (not at import time)
    const admin = getAdmin();

    // Call the lightweight RPC added in Step 4; we only care about error presence
    const { error } = await admin.rpc("now");

    return NextResponse.json({
      ok: true,
      supabaseConfigured: true,
      rpcNowError: error?.message ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
