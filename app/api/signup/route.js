// POST /api/signup  { "username": "suha", "password": "..." }
// Makes a dashboard account and signs this browser in. Optional: blocking
// works without an account.

import { NextResponse } from "next/server";
import {
  LIMITS,
  cleanUsername,
  clientIp,
  hashPassword,
  overLimit,
  passwordProblem,
  signIn,
} from "../../../lib/auth";
import { createAccount } from "../../../lib/store";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const username = cleanUsername(body.username);
  if (!username) {
    return NextResponse.json(
      { error: "Usernames are 3–24 letters, numbers, dots or underscores." },
      { status: 400 }
    );
  }
  const problem = passwordProblem(body.password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    if (await overLimit(`signup-ip:${clientIp(request)}`, LIMITS.signupPerNetwork)) {
      return NextResponse.json(
        { error: "Too many new accounts from this network. Try again in an hour." },
        { status: 429 }
      );
    }
    const id = await createAccount(username, await hashPassword(body.password));
    if (!id) {
      return NextResponse.json({ error: "That username is taken." }, { status: 409 });
    }
    return signIn(id, { username });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
