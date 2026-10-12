// Where dashboard accounts, sign-ins and focus sessions are saved.
//
// With SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set, everything goes to
// Supabase. Without them, data lives in memory: fine for trying it locally,
// but it resets when the server restarts. Always connect Supabase before
// deploying.

import { createClient } from "@supabase/supabase-js";
import { hashKey } from "./keys";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// The service role key bypasses Row Level Security, so it must only ever be
// used here on the server. It is never sent to the browser.
const db =
  url && serviceKey
    ? createClient(url, serviceKey, { auth: { persistSession: false } })
    : null;

export const usingDatabase = Boolean(db);

// ---------- In-memory fallback ----------
const memory =
  globalThis.__mtcBrickAccounts ??
  (globalThis.__mtcBrickAccounts = {
    bricks: new Map(), // id → account
    logins: new Map(), // token_hash → { brick_id, expires_at }
    limits: new Map(), // rate limit key → { count, window_start }
    sessions: [],
    nextId: 1,
  });

// Older in-memory data (from before rate limits) may be missing this.
memory.limits ??= new Map();

function fail(action, error) {
  throw new Error(`Could not ${action}: ${error.message}`);
}

const BRICK_COLUMNS = "id, username, is_bricked, bricked_since";

// ---------- Accounts ----------

// Returns the new account's id, or null if the username is taken.
export async function createAccount(username, passwordHash) {
  const row = {
    username,
    password_hash: passwordHash,
    key_hash: null,
    is_bricked: false,
    bricked_since: null,
  };
  if (db) {
    const { data, error } = await db.from("bricks").insert(row).select("id").single();
    if (error?.code === "23505") return null; // unique violation: username taken
    if (error) fail("create your account", error);
    return data.id;
  }
  for (const b of memory.bricks.values()) if (b.username === username) return null;
  const id = crypto.randomUUID();
  memory.bricks.set(id, { id, ...row, created_at: new Date().toISOString() });
  return id;
}

export async function findAccount(username) {
  if (db) {
    const { data, error } = await db
      .from("bricks")
      .select("id, password_hash")
      .eq("username", username)
      .maybeSingle();
    if (error) fail("look up your account", error);
    return data;
  }
  for (const b of memory.bricks.values()) if (b.username === username) return b;
  return null;
}

// A new sync code replaces the old one, so the old code stops working.
export async function saveSyncCode(brickId, code) {
  const key_hash = hashKey(code);
  if (db) {
    const { error } = await db.from("bricks").update({ key_hash }).eq("id", brickId);
    if (error) fail("save your sync code", error);
    return;
  }
  const brick = memory.bricks.get(brickId);
  if (brick) brick.key_hash = key_hash;
}

// ---------- Sign-ins ----------

export async function createLogin(brickId, tokenHash, expiresAt) {
  const row = { token_hash: tokenHash, brick_id: brickId, expires_at: expiresAt };
  if (db) {
    const { error } = await db.from("logins").insert(row);
    if (error) fail("sign you in", error);
    return;
  }
  memory.logins.set(tokenHash, row);
}

// The account id for a sign-in, or null if it's unknown or expired.
export async function findLogin(tokenHash) {
  let login;
  if (db) {
    const { data, error } = await db
      .from("logins")
      .select("brick_id, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (error) fail("check your sign-in", error);
    login = data;
  } else {
    login = memory.logins.get(tokenHash);
  }
  if (!login || Date.parse(login.expires_at) < Date.now()) return null;
  return login.brick_id;
}

export async function deleteLogin(tokenHash) {
  if (db) {
    const { error } = await db.from("logins").delete().eq("token_hash", tokenHash);
    if (error) fail("sign you out", error);
    return;
  }
  memory.logins.delete(tokenHash);
}

// ---------- Rate limits ----------

// Counts one attempt for this key and returns how many there have been in
// the current window (which starts at the first attempt).
export async function bumpRateLimit(key, windowSeconds) {
  if (db) {
    const { data, error } = await db.rpc("bump_rate_limit", {
      p_key: key,
      p_window_seconds: windowSeconds,
    });
    if (error) fail("check sign-in attempts", error);
    return data;
  }
  const now = Date.now();
  const row = memory.limits.get(key);
  if (!row || row.window_start < now - windowSeconds * 1000) {
    memory.limits.set(key, { count: 1, window_start: now });
    return 1;
  }
  row.count += 1;
  return row.count;
}

export async function clearRateLimit(key) {
  if (db) {
    const { error } = await db.from("rate_limits").delete().eq("key", key);
    if (error) fail("reset sign-in attempts", error);
    return;
  }
  memory.limits.delete(key);
}

// ---------- Bricks ----------

async function findBrickByCode(code) {
  const key_hash = hashKey(code);
  if (db) {
    const { data, error } = await db
      .from("bricks")
      .select(BRICK_COLUMNS)
      .eq("key_hash", key_hash)
      .maybeSingle();
    if (error) fail("look up your Brick", error);
    return data;
  }
  for (const b of memory.bricks.values()) if (b.key_hash === key_hash) return b;
  return null;
}

async function findBrickById(id) {
  if (db) {
    const { data, error } = await db
      .from("bricks")
      .select(BRICK_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) fail("look up your Brick", error);
    return data;
  }
  return memory.bricks.get(id) ?? null;
}

// Record the state the phone says it's now in. The phone is the source of
// truth: blocking works offline, and this only keeps the dashboard up to date.
//
// The phone sends the state it switched to, not "flip it", so a missed update
// (no internet, server paused) fixes itself on the next tap instead of leaving
// the dashboard backwards. Repeating the current state changes nothing.
// Returns null for an unknown sync code.
export async function setBrickState(code, bricked) {
  const brick = await findBrickByCode(code);
  if (!brick) return null;

  const now = new Date().toISOString();

  if (bricked && !brick.is_bricked) {
    await saveBrickState(brick, true, now);
    await startSession(brick.id, now);
    return { bricked: true, since: now, minutes: 0 };
  }

  if (!bricked && brick.is_bricked) {
    await saveBrickState(brick, false, null);
    await endSession(brick.id, now);
    const minutes = Math.max(
      0,
      Math.round((Date.parse(now) - Date.parse(brick.bricked_since ?? now)) / 60000)
    );
    return { bricked: false, since: null, minutes };
  }

  return { bricked: brick.is_bricked, since: brick.bricked_since, minutes: 0 };
}

async function saveBrickState(brick, isBricked, since) {
  if (db) {
    const { error } = await db
      .from("bricks")
      .update({ is_bricked: isBricked, bricked_since: since })
      .eq("id", brick.id);
    if (error) fail("save your Brick", error);
    return;
  }
  brick.is_bricked = isBricked;
  brick.bricked_since = since;
}

// ---------- Focus sessions ----------

async function startSession(brickId, now) {
  if (db) {
    const { error } = await db.from("sessions").insert({ brick_id: brickId, started_at: now });
    if (error) fail("start your session", error);
    return;
  }
  memory.sessions.push({ id: memory.nextId++, brick_id: brickId, started_at: now, ended_at: null });
}

async function endSession(brickId, now) {
  if (db) {
    const { error } = await db
      .from("sessions")
      .update({ ended_at: now })
      .eq("brick_id", brickId)
      .is("ended_at", null);
    if (error) fail("end your session", error);
    return;
  }
  for (const s of memory.sessions) {
    if (s.brick_id === brickId && !s.ended_at) s.ended_at = now;
  }
}

async function recentSessions(brickId, limit = 200) {
  if (db) {
    const { data, error } = await db
      .from("sessions")
      .select("started_at, ended_at")
      .eq("brick_id", brickId)
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error) fail("load your sessions", error);
    return data;
  }
  return memory.sessions
    .filter((s) => s.brick_id === brickId)
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, limit);
}

// ---------- Stats for the dashboard ----------

const TIME_ZONE = "America/Chicago";

// "2026-10-11" for the given moment, in Central time.
function dayOf(date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
}

export async function brickStats(brickId) {
  const brick = await findBrickById(brickId);
  if (!brick) return null;

  const sessions = await recentSessions(brick.id);
  const now = Date.now();
  const today = dayOf(new Date(now));

  let todayMinutes = 0;
  const daysWithFocus = new Set();

  const list = sessions.map((s) => {
    const start = Date.parse(s.started_at);
    const end = s.ended_at ? Date.parse(s.ended_at) : now;
    const minutes = Math.max(0, Math.round((end - start) / 60000));
    const day = dayOf(new Date(start));
    daysWithFocus.add(day);
    if (day === today) todayMinutes += minutes;
    return { started_at: s.started_at, ended_at: s.ended_at, minutes };
  });

  // Streak: consecutive days with at least one session, counting back from
  // today (or from yesterday, if there's no session yet today).
  let streak = 0;
  const cursor = new Date(now);
  if (!daysWithFocus.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (daysWithFocus.has(dayOf(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return {
    username: brick.username,
    bricked: brick.is_bricked,
    since: brick.bricked_since,
    todayMinutes,
    streak,
    sessions: list.slice(0, 10),
  };
}
