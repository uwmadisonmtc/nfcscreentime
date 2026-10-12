"use client";

// Setup page: make a Brick, get your key, then follow the steps to connect
// your iPhone. Blocking runs entirely on the phone; the key only links the
// phone to the online dashboard. It's shown once and also saved in this
// browser so the dashboard can find it.

import { useState } from "react";

// Paste the iCloud links for the two shortcuts here once you've built them
// (see SHORTCUTS.md), or set them as environment variables in Vercel.
const TOGGLE_SHORTCUT_URL = process.env.NEXT_PUBLIC_TOGGLE_SHORTCUT_URL || "";
const CHECK_SHORTCUT_URL = process.env.NEXT_PUBLIC_CHECK_SHORTCUT_URL || "";

function saveKeyLocally(key) {
  try {
    localStorage.setItem("brickKey", key);
  } catch {
    // Private browsing or storage blocked: the dashboard will just ask for it.
  }
}

function ShortcutLink({ url, label }) {
  if (!url) {
    return <span className="muted">{label} (link coming soon, ask an MTC organizer)</span>;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

export default function Setup() {
  const [name, setName] = useState("");
  const [key, setKey] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setKey(data.key);
      saveKeyLocally(data.key);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically. Press and hold the key to copy it.");
    }
  }

  return (
    <>
      <p className="eyebrow">MTC Brick</p>
      <h1>Brick your phone with an NFC tag</h1>
      <p className="muted">
        Tap your tag to block distracting apps. Tap again to unlock. Free, works without
        internet, and nothing to install but two shortcuts. iPhone only.
      </p>

      {!key ? (
        <form className="card" onSubmit={create}>
          <h2>1. Make your Brick</h2>
          <p className="muted">
            This sets up your online dashboard for focus time and streaks. Just a first name
            or nickname, so it can greet you.
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={40}
            required
          />
          <p>
            <button type="submit" disabled={busy || !name.trim()}>
              {busy ? "Making it…" : "Make my Brick"}
            </button>
          </p>
          {error && <p className="error">{error}</p>}
        </form>
      ) : (
        <>
          <div className="card dark">
            <h2>Your Brick key</h2>
            <p className="muted">
              This is like a password for your dashboard. You'll paste it into the Brick
              Toggle shortcut. It's only shown once, so copy it now.
            </p>
            <span className="key">{key}</span>
            <button type="button" onClick={copyKey}>
              {copied ? "Copied!" : "Copy key"}
            </button>
          </div>

          <div className="card">
            <h2>2. Add the two shortcuts</h2>
            <p className="muted">
              Open these on your iPhone. When Brick Toggle asks, paste your key.
            </p>
            <ol className="steps">
              <li>
                <ShortcutLink url={TOGGLE_SHORTCUT_URL} label="Add “Brick Toggle”" />: locks
                and unlocks when you tap your tag.
              </li>
              <li>
                <ShortcutLink url={CHECK_SHORTCUT_URL} label="Add “Brick Check”" />: sends you
                home if you open a blocked app while bricked.
              </li>
            </ol>
          </div>

          <div className="card">
            <h2>3. Connect your tag</h2>
            <ol className="steps">
              <li>
                In the Shortcuts app, go to <b>Automation → New Automation → NFC</b>.
              </li>
              <li>
                Tap <b>Scan</b>, hold your phone to your tag, and name it “Brick”.
              </li>
              <li>
                Choose <b>Run Immediately</b>, then pick the <b>Brick Toggle</b> shortcut.
              </li>
            </ol>
          </div>

          <div className="card">
            <h2>4. Pick the apps to block</h2>
            <ol className="steps">
              <li>
                <b>New Automation → App</b>. Choose Instagram, TikTok or anything else.
              </li>
              <li>
                Leave <b>Is Opened</b> checked and choose <b>Run Immediately</b>.
              </li>
              <li>
                Pick the <b>Brick Check</b> shortcut.
              </li>
            </ol>
          </div>

          <div className="card">
            <h2>5. Try it</h2>
            <p>
              Tap your tag, then open a blocked app. You should land back on your home screen.
              Tap the tag again to unlock.
            </p>
            <p>
              <a className="button" href="/me">
                Open my dashboard
              </a>
            </p>
          </div>
        </>
      )}

      <p className="muted">
        Already have a Brick? <a href="/me">Go to your dashboard</a>.
      </p>
    </>
  );
}
