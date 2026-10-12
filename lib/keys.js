// Brick keys are like passwords: whoever has one can lock or unlock that Brick.
// We only ever store a hash of the key, never the key itself, so even if the
// database leaked, nobody could use the keys inside it.

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

// Keys travel in the "x-brick-key" header so they never end up in URLs,
// browser history or server logs.
export function keyFromRequest(request) {
  const key = request.headers.get("x-brick-key")?.trim();
  return looksLikeKey(key) ? key : null;
}
