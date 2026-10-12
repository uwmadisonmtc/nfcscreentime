// POST /api/create  { "name": "Suha" }
// Makes a new Brick and returns its key. The key is shown exactly once.

import { NextResponse } from "next/server";
import { newKey } from "../../../lib/keys";
import { createBrick } from "../../../lib/store";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";

  if (!name) {
    return NextResponse.json({ error: "Please enter a name." }, { status: 400 });
  }

  try {
    const key = newKey();
    await createBrick(name, key);
    return NextResponse.json({ key, name });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
