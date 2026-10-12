// Sync codes link a phone's Brick Toggle shortcut to a dashboard account.
// Whoever has one can update that dashboard (not the phone: blocking never
// uses it). We only ever store a hash of the code, never the code itself, so
// even if the database leaked, nobody could use the codes inside it.

import { createHash, randomBytes } from "node:crypto";

const KEY_PREFIX = "brk_";

// A new random key, e.g. "brk_Qm9i7xk2pW0aZ3c8Lr5tVy1n".
export function newKey() {
  return KEY_PREFIX + randomBytes(18).toString("base64url");
}

export function hashKey(key) {
  return createHash("sha256").update(key).digest("hex");
}

// Rejects anything that couldn't possibly be one of our keys, before we
// spend a database lookup on it.
export function looksLikeKey(key) {
  return typeof key === "string" && /^brk_[A-Za-z0-9_-]{24}$/.test(key);
}

// Codes travel in the "x-brick-key" header so they never end up in URLs,
// browser history or server logs.
export function keyFromRequest(request) {
  const key = request.headers.get("x-brick-key")?.trim();
  return looksLikeKey(key) ? key : null;
}
