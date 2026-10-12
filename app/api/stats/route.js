// GET /api/stats   header: x-brick-key: brk_...
// Powers the dashboard: current status, focus time today, streak, sessions.

import { NextResponse } from "next/server";
import { keyFromRequest } from "../../../lib/keys";
import { brickStats } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const key = keyFromRequest(request);
  if (!key) {
    return NextResponse.json({ error: "Missing or invalid Brick key." }, { status: 401 });
  }

  try {
    const stats = await brickStats(key);
    if (!stats) {
      return NextResponse.json({ error: "Unknown Brick key." }, { status: 404 });
    }
    return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
