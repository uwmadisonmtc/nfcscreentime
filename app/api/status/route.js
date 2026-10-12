// GET /api/status   header: x-brick-key: brk_...
// Called by the "Brick Check" shortcut every time a blocked app opens.
// Returns { "bricked": true, "state": "bricked" } or
//         { "bricked": false, "state": "unlocked" }.
// "state" is plain text because it's easier to compare in Shortcuts' If action.
// We don't log these checks: the server never records which apps you open.

import { NextResponse } from "next/server";
import { keyFromRequest } from "../../../lib/keys";
import { brickStatus } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const key = keyFromRequest(request);
  if (!key) {
    return NextResponse.json({ error: "Missing or invalid Brick key." }, { status: 401 });
  }

  try {
    const status = await brickStatus(key);
    if (!status) {
      return NextResponse.json({ error: "Unknown Brick key." }, { status: 404 });
    }
    return NextResponse.json(
      {
        bricked: status.bricked,
        state: status.bricked ? "bricked" : "unlocked",
        since: status.since,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
