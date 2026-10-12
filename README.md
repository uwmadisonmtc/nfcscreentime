# MTC Brick

Brick your iPhone with an NFC tag, for free. Tap your tag and distracting apps send you straight back to your home screen. Tap again to unlock. A dashboard tracks your focus time and streak.

Inspired by [Brick](https://getbrick.app) and the open-source [Broke](https://github.com/OzTamir/broke), but built with **Apple Shortcuts and a small web app**, so it needs no Mac, no Xcode and no paid Apple Developer account.

```
Tap tag ──► NFC automation ──► "Brick Toggle" ──► flip brick.txt on the phone ──► (if online) POST /api/sync ──► dashboard
Open Instagram ──► App automation ──► "Brick Check" ──► read brick.txt ──► bricked? go home
```

- **Blocking works offline.** Locked/unlocked lives in a file on the phone. The server only powers the dashboard.
- The Shortcuts NFC automation is tied to the one tag you scanned, so only that tag can lock or unlock.
- If anything fails (missing file, bad key, no internet, server down) the check lets the app open, so you can never be locked out.
- **Keys are never stored.** The database only keeps a SHA-256 hash, and keys travel in a header, not the URL.

## Design decisions

**The phone is the source of truth, not the server.** An earlier version asked the server "am I bricked?" every time a blocked app opened. That needed internet for every check, and since a failed check lets the app open, losing the server (Supabase paused, Vercel down, no signal) quietly turned blocking off for everyone. Now Brick Toggle saves `bricked` or `unlocked` to `brick.txt` in the phone's Shortcuts folder and Brick Check reads it. No network involved.

**The tag is the key for blocking.** Shortcuts doesn't give the shortcut the tag's ID, but it doesn't need to: the NFC automation only fires for the exact tag you scanned when setting it up. Brick keys (`brk_...`) are now only used to link a phone to its dashboard.

**The dashboard is an optional extra.** Brick Toggle's last step sends the new state to `/api/sync`. It goes last because a failed web request stops a shortcut; by then the lock is saved and the notification shown, so a dead server can't break the Brick. Pausing or deleting the Supabase project only stops the dashboard from updating.

**The phone reports its state, it doesn't ask the server to flip it.** `/api/sync` takes `{ "state": "bricked" }` or `{ "state": "unlocked" }`. If an update is missed while offline, the server would otherwise end up backwards forever; with an explicit state, the next tap with internet corrects it. Sending the state it's already in does nothing. The trade-off: a missed unlock makes that session look longer, and a missed lock isn't counted.

**The server uses its own clock.** The update is sent right after the tap or not at all, so the phone's timestamp would add setup steps without adding accuracy.

**What Supabase stores.** `bricks`: name, key hash, current state, when the current lock started, signup time. `sessions`: start and end time of each lock. Nothing about which apps are opened, or when.

---

## Setup (organizers)

### 1. Run it locally

```bash
git clone [repo link]
cd mtc-brick
npm install
npm run dev
```

Open http://localhost:3000 and make a test Brick. Without a database, data lives in memory and resets when you restart. Fine for poking around, but the shortcuts need a deployed URL anyway.

### 2. Create the database

The database only powers the dashboard. Blocking works without it, but on Vercel the in-memory fallback resets constantly, so connect Supabase if you want the dashboard to work.

1. Make a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**, paste `supabase/schema.sql`, **Run**.
3. **Project Settings → API**: copy the **Project URL** and the **service_role** key.
4. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

> The service role key can read and write everything. It stays on the server only. Never commit `.env.local` or put this key in a `NEXT_PUBLIC_` variable.

### 3. Deploy to Vercel

Import the repo in Vercel, add the same two environment variables, and deploy.

### 4. Build and share the shortcuts

Follow **[SHORTCUTS.md](SHORTCUTS.md)**. You build them once on your iPhone, then paste their iCloud links into Vercel as `NEXT_PUBLIC_TOGGLE_SHORTCUT_URL` and `NEXT_PUBLIC_CHECK_SHORTCUT_URL`.

### 5. Send students the link

Students open your site on their iPhone, make a Brick, add the two shortcuts, and set up two automations. It takes about 10 minutes and needs an NFC tag and an iPhone XS or newer.

---

## API

All routes except `create` need the header `x-brick-key: brk_...`. None of them are needed for blocking.

| Route | What it does |
|---|---|
| `POST /api/create` `{ "name": "studentName" }` | Makes a Brick, returns its key (shown once) |
| `POST /api/sync` `{ "state": "bricked" \| "unlocked" }` | Records the phone's new state, returns `{ bricked, since, minutes }` |
| `GET /api/stats` | Status, focus minutes today, streak, last 10 sessions |

Brick Check never contacts the server, so it can't record which apps you open or when.

## Files

| File | What it does |
|---|---|
| `app/page.js` | Setup page: make a Brick, get your key, step-by-step instructions |
| `app/me/page.js` | Dashboard: status, focus time, streak, sessions |
| `app/api/*/route.js` | The three API routes above |
| `lib/store.js` | Saves Bricks and sessions (Supabase or memory) |
| `lib/keys.js` | Makes, hashes and checks Brick keys |
| `supabase/schema.sql` | Database tables, locked down with Row Level Security |
| `SHORTCUTS.md` | How to build and share the two shortcuts |

## Want real app blocking?

That needs Apple's Screen Time tools (Family Controls), which only work in a native iPhone app. You'd need a Mac with Xcode and a paid Apple Developer account; Apple doesn't offer Family Controls to free accounts. See [Foqos](https://github.com/awaseem/foqos) for a free, open-source example on the App Store.

---
