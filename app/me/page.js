"use client";

// Dashboard: whether you're bricked, focus time today, streak and recent
// sessions. The key is read from this browser's storage (saved on setup) or
// typed in, and sent in a header so it never appears in the URL.

import { useCallback, useEffect, useState } from "react";

function loadKey() {
  try {
    return localStorage.getItem("brickKey") || "";
  } catch {
    return "";
  }
}

function saveKey(key) {
  try {
    if (key) localStorage.setItem("brickKey", key);
    else localStorage.removeItem("brickKey");
  } catch {
    // Storage blocked: the key just won't be remembered.
  }
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

function formatMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export default function Dashboard() {
  const [key, setKey] = useState("");
  const [draft, setDraft] = useState("");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setKey(loadKey());
    setLoaded(true);
  }, []);

  const refresh = useCallback(async () => {
    if (!key) return;
    try {
      const res = await fetch("/api/stats", {
        headers: { "x-brick-key": key },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load your Brick.");
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setStats(null);
    }
  }, [key]);

  // Load now, then every 15 seconds so tapping your tag shows up here.
  useEffect(() => {
    refresh();
    if (!key) return;
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [key, refresh]);

  function submitDraftKey(e) {
    e.preventDefault();
    const k = draft.trim();
    saveKey(k);
    setKey(k);
  }

  function forget() {
    saveKey("");
    setKey("");
    setStats(null);
    setDraft("");
  }

  if (!loaded) return null;

  if (!key || (error && !stats)) {
    return (
      <>
        <p className="eyebrow">MTC Brick</p>
        <h1>Your dashboard</h1>
        <form className="card" onSubmit={submitDraftKey}>
          <h2>Paste your Brick key</h2>
          <p className="muted">It starts with brk_. You got it when you made your Brick.</p>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="brk_…"
            autoComplete="off"
          />
          <p>
            <button type="submit" disabled={!draft.trim()}>
              Open dashboard
            </button>
          </p>
          {error && <p className="error">{error}</p>}
        </form>
        <p className="muted">
          No Brick yet? <a href="/">Make one</a>.
        </p>
      </>
    );
  }

  if (!stats) return <p className="muted">Loading…</p>;

  return (
    <>
      <p className="eyebrow">MTC Brick</p>
      <h1>Hi, {stats.name}</h1>

      <div className="card">
        {stats.bricked ? (
          <>
            <span className="pill on">🧱 Bricked</span>
            <p>Since {formatTime(stats.since)}. Tap your tag to unlock.</p>
          </>
        ) : (
          <>
            <span className="pill off">🔓 Unlocked</span>
            <p>Tap your tag to start focusing.</p>
          </>
        )}
        <p className="muted">
          Updates when you tap your tag with internet. Your Brick works offline either way.
        </p>
      </div>

      <div className="row">
        <div className="card">
          <p className="big">{formatMinutes(stats.todayMinutes)}</p>
          <p className="muted">focused today</p>
        </div>
        <div className="card">
          <p className="big">{stats.streak}</p>
          <p className="muted">day streak</p>
        </div>
      </div>

      <div className="card">
        <h2>Recent sessions</h2>
        {stats.sessions.length === 0 ? (
          <p className="muted">No sessions yet.</p>
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
      </div>

      <p>
        <button type="button" className="secondary" onClick={forget}>
          Forget my key on this device
        </button>
      </p>
    </>
  );
}
