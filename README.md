# MTC Brick

Brick your iPhone with an NFC tag, for free. Tap your tag and distracting apps send you straight back to your home screen. Tap again to unlock. A dashboard tracks your focus time and streak.

Inspired by [Brick](https://getbrick.app) and the open-source [Broke](https://github.com/OzTamir/broke), but built with **Apple Shortcuts and a small web app**, so it needs no Mac, no Xcode and no paid Apple Developer account.

```
Tap tag ──► NFC automation ──► "Brick Toggle" shortcut ──► POST /api/toggle ──► locked / unlocked
Open Instagram ──► App automation ──► "Brick Check" shortcut ──► GET /api/status ──► bricked? go home
```

## How it compares

| | Brick ($) | Broke | Foqos | **MTC Brick** |
|---|---|---|---|---|
| Cost to students | Paid device | Mac + $99/yr Apple account | Free app | **Free** |
| Build needs a Mac | n/a | Yes | n/a (App Store) | **No** |
| Real Screen Time blocking | Yes | Yes | Yes | No (Shortcuts) |
| Can you bypass it? | Hard | Delete app | Delete app | Turn off the automation |
| Focus stats | Yes | No | Yes | **Yes** |

## What's different from Broke

Broke's ideas, kept: tap to lock, tap again to unlock, a physical tag that lives somewhere else.

Broke's issues, fixed:

- **Broke unlocks with the same phrase on every tag** (`BROKE-IS-GREAT`), so any copied tag works. Here, the Shortcuts NFC automation is tied to the one tag you scanned, and each Brick has its own random key.
- **Broke can crash and leave you stuck in blocking mode.** Here, if anything fails (bad key, no internet, server down) the check lets the app open, so you can never be locked out.
- **Keys are never stored.** The database only keeps a SHA-256 hash, and keys travel in a header, not the URL.

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

All routes except `create` need the header `x-brick-key: brk_...`.

| Route | What it does |
|---|---|
| `POST /api/create` `{ "name": "Suha" }` | Makes a Brick, returns its key (shown once) |
| `POST /api/toggle` | Locks or unlocks, returns `{ bricked, minutes, message }` |
| `GET /api/status` | Returns `{ bricked, state: "bricked" \| "unlocked" }` |
| `GET /api/stats` | Status, focus minutes today, streak, last 10 sessions |

`/api/status` checks are not logged, so the server never records which apps you open or when.

## Files

| File | What it does |
|---|---|
| `app/page.js` | Setup page: make a Brick, get your key, step-by-step instructions |
| `app/me/page.js` | Dashboard: status, focus time, streak, sessions |
| `app/api/*/route.js` | The four API routes above |
| `lib/store.js` | Saves Bricks and sessions (Supabase or memory) |
| `lib/keys.js` | Makes, hashes and checks Brick keys |
| `supabase/schema.sql` | Database tables, locked down with Row Level Security |
| `SHORTCUTS.md` | How to build and share the two shortcuts |

## Want real app blocking?

That needs Apple's Screen Time tools (Family Controls), which only work in a native iPhone app. You'd need a Mac with Xcode and a paid Apple Developer account; Apple doesn't offer Family Controls to free accounts. See [Foqos](https://github.com/awaseem/foqos) for a free, open-source example on the App Store.

---

Made by MTC at UW–Madison. Questions? [MTC contact link]
