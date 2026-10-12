// POST /api/toggle   header: x-brick-key: brk_...
// Called by the "Brick Toggle" shortcut when you tap your NFC tag.
// Locks if unlocked, unlocks if locked, and returns a message to show.

import { NextResponse } from "next/server";
import { keyFromRequest } from "../../../lib/keys";
import { toggleBrick } from "../../../lib/store";

export async function POST(request) {
  const key = keyFromRequest(request);
  if (!key) {
    return NextResponse.json(
      { error: "Missing or invalid Brick key.", message: "Brick key not recognized." },
      { status: 401 }
    );
  }

  try {
    const result = await toggleBrick(key);
    if (!result) {
      return NextResponse.json(
        { error: "Unknown Brick key.", message: "Brick key not recognized." },
        { status: 404 }
      );
    }

    const message = result.bricked
      ? "🧱 Bricked. Your apps are blocked until you tap again."
      : `🔓 Unbricked after ${result.minutes} min of focus.`;

    return NextResponse.json({ ...result, message });
  } catch (err) {
    return NextResponse.json({ error: err.message, message: "Something went wrong." }, { status: 500 });
  }
}
