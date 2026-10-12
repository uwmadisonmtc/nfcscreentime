// Where Bricks and focus sessions are saved.
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
  globalThis.__mtcBrick ??
  (globalThis.__mtcBrick = { bricks: new Map(), sessions: [], nextId: 1 });

function fail(action, error) {
  throw new Error(`Could not ${action}: ${error.message}`);
}

// ---------- Bricks ----------

export async function createBrick(name, key) {
  const row = {
    name,
    key_hash: hashKey(key),
    is_bricked: false,
    bricked_since: null,
  };
  if (db) {
    const { data, error } = await db.from("bricks").insert(row).select("id").single();
    if (error) fail("create your Brick", error);
    return data.id;
  }
  const id = crypto.randomUUID();
  memory.bricks.set(row.key_hash, { id, ...row, created_at: new Date().toISOString() });
  return id;
}

async function findBrick(key) {
  const key_hash = hashKey(key);
  if (db) {
    const { data, error } = await db
      .from("bricks")
      .select("id, name, is_bricked, bricked_since")
      .eq("key_hash", key_hash)
      .maybeSingle();
    if (error) fail("look up your Brick", error);
    return data;
  }
  return memory.bricks.get(key_hash) ?? null;
}

// Flip a Brick between locked and unlocked. Returns null for an unknown key.
export async function toggleBrick(key) {
  const brick = await findBrick(key);
  if (!brick) return null;

  const now = new Date().toISOString();

  if (!brick.is_bricked) {
    await saveBrickState(brick, true, now);
    await startSession(brick.id, now);
    return { bricked: true, since: now, minutes: 0 };
  }

  await saveBrickState(brick, false, null);
  await endSession(brick.id, now);
  const minutes = Math.max(
    0,
    Math.round((Date.parse(now) - Date.parse(brick.bricked_since ?? now)) / 60000)
  );
  return { bricked: false, since: null, minutes };
}

export async function brickStatus(key) {
  const brick = await findBrick(key);
  if (!brick) return null;
  return { bricked: brick.is_bricked, since: brick.bricked_since, name: brick.name };
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

export async function brickStats(key) {
  const brick = await findBrick(key);
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
    name: brick.name,
    bricked: brick.is_bricked,
    since: brick.bricked_since,
    todayMinutes,
    streak,
    sessions: list.slice(0, 10),
  };
}
