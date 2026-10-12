"use client";

// Dashboard: whether you're bricked, focus time today, streak and recent
// sessions. Optional: you only need an account to see this page. Signing in
// sets an httpOnly cookie, so nothing secret is kept in page scripts.

import { useCallback, useEffect, useState } from "react";
import MeltingClock from "./MeltingClock";

// The focus gauge fills up over this many minutes a day.
const DAILY_GOAL_MINUTES = 120;

// Keep the loading clock up at least this long so it doesn't just flash.
const MIN_LOADING_MS = 1200;

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function formatTime(iso) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatClock(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDay(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    timeZone: "America/Chicago",
    day: "numeric",
    month: "short",
  });
}

function minutesSince(iso) {
  return Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
}

function streakCaption(streak) {
  if (streak === 0) return "Tap your tag today to start";
  if (streak < 7) return `${7 - streak} more ${streak === 6 ? "day" : "days"} to a full week`;
  return "Full week. Keep it going";
}

function formatMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function Dashboard() {
  // "loading" until we know whether this browser is signed in.
  const [status, setStatus] = useState("loading");
  const [stats, setStats] = useState(null);
  const [minTimeDone, setMinTimeDone] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMinTimeDone(true), MIN_LOADING_MS);
    return () => clearTimeout(id);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (res.status === 401) {
        setStatus("signedOut");
        setStats(null);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStats(data);
      setStatus("signedIn");
    } catch {
      // Network hiccup: keep showing what we had and try again next round.
      setStatus((s) => (s === "loading" ? "signedOut" : s));
    }
  }, []);

  // Load now, then every 15 seconds so tapping your tag shows up here.
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  async function signOut() {
    await postJson("/api/logout").catch(() => {});
    setStats(null);
    setStatus("signedOut");
  }

  if (status === "loading" || !minTimeDone) return <MeltingClock />;

  if (status === "signedOut") return <SignIn onDone={refresh} />;

  if (!stats) return <MeltingClock />;

  const now = new Date();
  const focusShare = Math.min(1, stats.todayMinutes / DAILY_GOAL_MINUTES);
  const weekShare = stats.streak >= 7 ? 1 : stats.streak / 7;

  return (
    <>
      <p className="eyebrow">MTC Brick</p>
      <h1>Hi, {stats.username}</h1>

      <div className="tray">
        <div className="glass cell wide">
          <div className="cell-head">
            <h2>{stats.bricked ? "Bricked" : "Unlocked"}</h2>
            <span className={stats.bricked ? "live on" : "live"} aria-hidden="true" />
          </div>
          {stats.bricked ? (
            <p className="cell-value">
              {formatMinutes(minutesSince(stats.since))}
              <span className="soft"> focused so far</span>
            </p>
          ) : (
            <p className="cell-value small">Tap your tag to start focusing.</p>
          )}
          <div className="cell-foot">
            <span>{stats.bricked ? `Since ${formatClock(stats.since)}` : "Apps open"}</span>
            <span>Tap tag to {stats.bricked ? "unlock" : "lock"}</span>
          </div>
        </div>

        <div className="glass cell">
          <div className="cell-head">
            <h2>
              Focus
              <br />
              today
            </h2>
            <a className="cell-arrow" href="#sessions" aria-label="See sessions">
              ↗
            </a>
          </div>
          <Gauge share={focusShare} value={formatMinutes(stats.todayMinutes)} />
          <div className="cell-foot">
            <span>{formatClock(now)}</span>
            <span>{formatDay(now)}</span>
          </div>
        </div>

        <div className="glass cell">
          <div className="cell-head">
            <h2>
              Day
              <br />
              streak
            </h2>
            <a className="cell-arrow" href="#sessions" aria-label="See sessions">
              ↗
            </a>
          </div>
          <div className="track" aria-hidden="true">
            <div className="track-fill" style={{ width: `${weekShare * 100}%` }} />
            <div className="track-dot" style={{ left: `${weekShare * 100}%` }} />
          </div>
          <p className="cell-value center">
            {stats.streak >= 7 ? stats.streak : `${stats.streak}/7`}
          </p>
          <p className="cell-caption">{streakCaption(stats.streak)}</p>
        </div>
      </div>

      <SyncCode />

      <div className="glass" id="sessions">
        <h2>Recent sessions</h2>
        {stats.sessions.length === 0 ? (
          <p className="soft">No sessions yet.</p>
        ) : (
          <ul className="sessions">
            {stats.sessions.map((s) => (
              <li key={s.started_at}>
                <span>{formatTime(s.started_at)}</span>
                <span>{s.ended_at ? formatMinutes(s.minutes) : "in progress"}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="soft fine">
          Updates when you tap your tag with internet. Your Brick works offline either way.
        </p>
      </div>

      <p>
        <button type="button" className="secondary" onClick={signOut}>
          Sign out
        </button>
      </p>
    </>
  );
}

// Arc gauge like the "Daily score" widget: a faint track, a bright stretch
// for progress toward the daily goal, and a dot where it ends.
function Gauge({ share, value }) {
  const start = 150;
  const sweep = 240;
  const r = 48;
  const end = ((start + sweep * share) * Math.PI) / 180;
  const dot = { x: 60 + r * Math.cos(end), y: 60 + r * Math.sin(end) };
  const arc = "M18.43 84 A48 48 0 1 1 101.57 84";
  return (
    <div className="gauge">
      <svg viewBox="0 0 120 96" aria-hidden="true">
        <path d={arc} className="gauge-track" pathLength="100" />
        <path
          d={arc}
          className="gauge-fill"
          pathLength="100"
          strokeDasharray={`${share * 100} 100`}
        />
        <circle cx={dot.x} cy={dot.y} r="3.5" className="gauge-dot" />
      </svg>
      <div className="gauge-label">
        <span className="cell-value">{value}</span>
        <span className="soft">of {formatMinutes(DAILY_GOAL_MINUTES)}</span>
      </div>
    </div>
  );
}

function SignIn({ onDone }) {
  const [mode, setMode] = useState("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const signingUp = mode === "signup";

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await postJson(signingUp ? "/api/signup" : "/api/login", { username, password });
      setPassword("");
      await onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="eyebrow">MTC Brick</p>
      <h1>Your dashboard</h1>
      <p className="soft">
        Optional. Your Brick blocks apps without an account; this just tracks your focus time
        and streak.
      </p>
      <form className="glass" onSubmit={submit}>
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!signingUp}
            className={signingUp ? "tab" : "tab active"}
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={signingUp}
            className={signingUp ? "tab active" : "tab"}
            onClick={() => setMode("signup")}
          >
            Create account
          </button>
        </div>
        <label className="field">
          <span className="soft">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </label>
        <label className="field">
          <span className="soft">Password{signingUp && " (at least 8 characters)"}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={signingUp ? "new-password" : "current-password"}
            minLength={signingUp ? 8 : undefined}
            required
          />
        </label>
        <p>
          <button type="submit" disabled={busy || !username.trim() || !password}>
            {busy ? "One sec…" : signingUp ? "Create account" : "Sign in"}
          </button>
        </p>
        {error && <p className="error">{error}</p>}
        {signingUp && (
          <p className="soft fine">
            There's no email, so a forgotten password can't be reset. Pick one you'll remember.
          </p>
        )}
      </form>
      <p className="soft">
        Haven't set up your phone yet? <a href="/">Start here</a>.
      </p>
    </>
  );
}

// Gets a code to paste into Brick Toggle, which links the phone to this
// account. Only a hash is stored, so a code is shown once; a new one replaces it.
function SyncCode() {
  const [code, setCode] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function makeCode() {
    setBusy(true);
    setError(null);
    try {
      const data = await postJson("/api/sync-code");
      setCode(data.code);
      setCopied(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setError("Couldn't copy automatically. Press and hold the code to copy it.");
    }
  }

  return (
    <div className="glass">
      <h2>Connect your phone</h2>
      {code ? (
        <>
          <p className="soft">
            In the Shortcuts app, open <b>Brick Toggle</b> and paste this into the first Text
            box. It's only shown once.
          </p>
          <span className="key">{code}</span>
          <button type="button" onClick={copy}>
            {copied ? "Copied!" : "Copy code"}
          </button>
        </>
      ) : (
        <>
          <p className="soft">
            Your phone needs a sync code to send your focus sessions here. Already connected?
            Skip this: a new code replaces the old one, so you'd have to paste it in again.
          </p>
          <button type="button" className="secondary" onClick={makeCode} disabled={busy}>
            {busy ? "Making it…" : "Get a sync code"}
          </button>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
