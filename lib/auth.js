// Dashboard accounts: usernames, passwords and sign-in cookies.
//
// Passwords are hashed with scrypt and a random salt. Sign-in cookies are
// random tokens; the database only keeps their SHA-256 hash, the same way
// sync codes are stored.

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { hashKey } from "./keys";
import { bumpRateLimit, createLogin, findLogin } from "./store";

const scryptAsync = promisify(scrypt);

export const SESSION_COOKIE = "brick_session";
export const SESSION_DAYS = 30;

// How many tries are allowed per window. Per username stops guessing one
// student's password; per network stops trying a few guesses on many
// usernames, and stops mass signups.
export const LIMITS = {
  loginPerUser: { max: 5, windowSeconds: 15 * 60 },
  loginPerNetwork: { max: 30, windowSeconds: 15 * 60 },
  signupPerNetwork: { max: 10, windowSeconds: 60 * 60 },
};

// The visitor's IP address. On Vercel this header is set by Vercel itself,
// so visitors can't fake it.
export function clientIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

// Counts an attempt and says whether it's over the limit.
export async function overLimit(key, { max, windowSeconds }) {
  return (await bumpRateLimit(key, windowSeconds)) > max;
}

// Lowercase letters, numbers, dots and underscores. Stored lowercase, so
// "Suha" and "suha" are the same account.
export function cleanUsername(value) {
  const username = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[a-z0-9_.]{3,24}$/.test(username) ? username : null;
}

export function passwordProblem(password) {
  if (typeof password !== "string" || password.length < 8) {
    return "Use at least 8 characters for your password.";
  }
  if (password.length > 200) return "That password is too long.";
  return null;
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function checkPassword(password, stored) {
  const [scheme, salt, expected] = (stored ?? "").split("$");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const hash = await scryptAsync(password, Buffer.from(salt, "base64"), 64);
  const want = Buffer.from(expected, "base64");
  return want.length === hash.length && timingSafeEqual(want, hash);
}

// Signs a browser in: saves a new sign-in and returns a JSON response that
// sets its cookie. httpOnly so page scripts can't read it.
export async function signIn(brickId, body) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await createLogin(brickId, hashKey(token), expires);
  const response = NextResponse.json(body);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return response;
}

// The signed-in account's id, or null.
export async function signedInBrickId(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return findLogin(hashKey(token));
}
