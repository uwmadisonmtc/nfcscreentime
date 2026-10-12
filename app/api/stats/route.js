// GET /api/stats   (signed in)
// Powers the dashboard: current status, focus time today, streak, sessions.

import { NextResponse } from "next/server";
import { signedInBrickId } from "../../../lib/auth";
import { brickStats } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const brickId = await signedInBrickId(request);
    if (!brickId) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    const stats = await brickStats(brickId);
    if (!stats) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
