// POST /api/sync-code   (signed in)
// Makes a new sync code for the phone's Brick Toggle shortcut and returns it.
// Only a hash is stored, so the code is shown this once. Making a new one
// disconnects the old code.

import { NextResponse } from "next/server";
import { signedInBrickId } from "../../../lib/auth";
import { newKey } from "../../../lib/keys";
import { saveSyncCode } from "../../../lib/store";

export async function POST(request) {
  try {
    const brickId = await signedInBrickId(request);
    if (!brickId) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }
    const code = newKey();
    await saveSyncCode(brickId, code);
    return NextResponse.json({ code });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
