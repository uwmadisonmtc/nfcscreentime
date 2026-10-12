// POST /api/sync   header: x-brick-key: brk_...   body: { "state": "bricked" | "unlocked" }
// Called last by the "Brick Toggle" shortcut, after the phone has already
// locked or unlocked itself. This only updates the dashboard, so if it fails
// (no internet, server paused) blocking still works.

import { NextResponse } from "next/server";
import { keyFromRequest } from "../../../lib/keys";
import { setBrickState } from "../../../lib/store";

const STATES = { bricked: true, unlocked: false };

export async function POST(request) {
  const key = keyFromRequest(request);
  if (!key) {
    return NextResponse.json({ error: "Missing or invalid Brick key." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  // Shortcuts can add stray whitespace around text, so trim before checking.
  const state = typeof body.state === "string" ? body.state.trim().toLowerCase() : "";
  if (!(state in STATES)) {
    return NextResponse.json(
      { error: 'State must be "bricked" or "unlocked".' },
      { status: 400 }
    );
  }

  try {
    const result = await setBrickState(key, STATES[state]);
    if (!result) {
      return NextResponse.json({ error: "Unknown Brick key." }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
