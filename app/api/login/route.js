// POST /api/login  { "username": "suha", "password": "..." }
// Signs this browser in with a cookie that lasts 30 days. Limited to 5 tries
// per username and 30 per network every 15 minutes (see LIMITS in lib/auth).

import { NextResponse } from "next/server";
import { LIMITS, checkPassword, cleanUsername, clientIp, overLimit, signIn } from "../../../lib/auth";
import { clearRateLimit, findAccount } from "../../../lib/store";

const WRONG = "Wrong username or password.";
const TOO_MANY = "Too many sign-in attempts. Wait 15 minutes and try again.";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const username = cleanUsername(body.username);
  const password = typeof body.password === "string" ? body.password : "";

  try {
    // Count the attempt before checking the password, so going over the
    // limit stops the guessing whether or not the guesses are right.
    const [networkOver, userOver] = await Promise.all([
      overLimit(`login-ip:${clientIp(request)}`, LIMITS.loginPerNetwork),
      username ? overLimit(`login-user:${username}`, LIMITS.loginPerUser) : false,
    ]);
    if (networkOver || userOver) {
      return NextResponse.json({ error: TOO_MANY }, { status: 429 });
    }

    if (!username || !password) {
      return NextResponse.json({ error: WRONG }, { status: 401 });
    }
    const account = await findAccount(username);
    if (!account || !(await checkPassword(password, account.password_hash))) {
      return NextResponse.json({ error: WRONG }, { status: 401 });
    }
    await clearRateLimit(`login-user:${username}`);
    return signIn(account.id, { username });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
