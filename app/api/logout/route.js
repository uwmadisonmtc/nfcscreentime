// POST /api/logout
// Signs this browser out. The phone and its sync code aren't affected.

import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "../../../lib/auth";
import { hashKey } from "../../../lib/keys";
import { deleteLogin } from "../../../lib/store";

export async function POST(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  try {
    if (token) await deleteLogin(hashKey(token));
  } catch {
    // Still clear the cookie below, so the browser is signed out either way.
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
