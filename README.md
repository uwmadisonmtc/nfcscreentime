# MTC Brick

Brick your iPhone with an NFC tag, for free. Tap your tag and distracting apps send you straight back to your home screen. Tap again to unlock. No account needed. If you want one, an optional dashboard tracks your focus time and streak.

Inspired by [Brick](https://getbrick.app) and the open-source [Broke](https://github.com/OzTamir/broke), but built with **Apple Shortcuts and a small web app**, so it needs no Mac, no Xcode and no paid Apple Developer account.

```
Tap tag ──► NFC automation ──► "Brick Toggle" ──► flip brick.txt on the phone ──► (if online) POST /api/sync ──► dashboard
Open Instagram ──► App automation ──► "Brick Check" ──► read brick.txt ──► bricked? go home
```

- **Blocking works offline.** Locked/unlocked lives in a file on the phone. The server only powers the dashboard.
- The Shortcuts NFC automation is tied to the one tag you scanned, so only that tag can lock or unlock.
- If anything fails (missing file, no internet, server down) the check lets the app open, so you can never be locked out.
- **No secrets are stored.** Passwords are hashed with scrypt; sync codes and sign-in cookies are stored only as SHA-256 hashes.

## For students

- **No account needed.** The setup page is just the four phone steps, and blocking works right away.
- **Optional dashboard.** If they want stats, step 5 sends them to `/me`, where they create a username and password or sign in.
- **Signing in lasts 30 days**, and **Sign out** works like any other website.

### The phone uses a sync code, not the password

The shortcut can't log in like a browser does, so it has to send something with every update. If it sent the password, that password would sit in plain text inside the Shortcuts app. So the phone gets its own random code instead:

- **How to get one:** the dashboard has a **Connect your phone** card with a **Get a sync code** button. You paste the code into Brick Toggle.
- **If it's lost or leaked:** press the button again for a new code, which disconnects the old one. A sync code can only update that dashboard. It can't sign in or change the password.
- **No account?** Students leave the sync code question blank when adding Brick Toggle, and the shortcut then skips the web request completely.

## Design decisions

**The phone is the source of truth, not the server.** An earlier version asked the server "am I bricked?" every time a blocked app opened. That needed internet for every check, and since a failed check lets the app open, losing the server (Supabase paused, Vercel down, no signal) quietly turned blocking off for everyone. Now Brick Toggle saves `bricked` or `unlocked` to `brick.txt` in the phone's Shortcuts folder and Brick Check reads it. No network involved.

**The tag is the key for blocking.** Shortcuts doesn't give the shortcut the tag's ID, but it doesn't need to: the NFC automation only fires for the exact tag you scanned when setting it up. Sync codes (`brk_...`) are only used to link a phone to its dashboard.

**The dashboard is an optional extra.** Brick Toggle's last step sends the new state to `/api/sync`. It goes last because a failed web request stops a shortcut; by then the lock is saved and the notification shown, so a dead server can't break the Brick. Pausing or deleting the Supabase project only stops the dashboard from updating.

**The phone reports its state, it doesn't ask the server to flip it.** `/api/sync` takes `{ "state": "bricked" }` or `{ "state": "unlocked" }`. If an update is missed while offline, the server would otherwise end up backwards forever; with an explicit state, the next tap with internet corrects it. Sending the state it's already in does nothing. The trade-off: a missed unlock makes that session look longer, and a missed lock isn't counted.

**The server uses its own clock.** The update is sent right after the tap or not at all, so the phone's timestamp would add setup steps without adding accuracy.

**Accounts are optional, and only for the dashboard.** Students set up their phone without signing up for anything. If they want stats, they make a username and password on `/me`.

**Username and password for people, a sync code for the phone.** The shortcut can't sign in like a browser, so it needs something to send with each update. Putting the student's password in the shortcut would leave it in plain text in the Shortcuts app. Instead, the dashboard hands out a sync code: a random code that can only update that dashboard. It's shown once (only its hash is stored), and **Get a sync code** makes a new one any time, which also disconnects the old one. A lost code is never a problem, and a leaked one can't sign in or change the password.

**Sign-in is a cookie.** Signing in sets an httpOnly cookie that lasts 30 days, so page scripts can't read it. Its hash is kept in the `logins` table, and **Sign out** deletes it.

**No email, so no password reset.** Keeping no email addresses means less personal data to look after. The trade-off: a forgotten password means making a new account. An organizer can delete the old one in Supabase.

**Login and signup attempts are limited.** Limits are set in `LIMITS` in `lib/auth.js`:

| What | Limit | Stops |
|---|---|---|
| Sign-ins per username | 5 per 15 min | Guessing one student's password |
| Sign-ins per network (IP) | 30 per 15 min | Trying a few guesses on lots of usernames |
| New accounts per network | 10 per hour | Mass-creating accounts |

The counts live in Supabase (`rate_limits` table), so there's no extra service to set up, and they're bumped in one database statement (`bump_rate_limit`) so a burst of parallel tries can't slip past. Attempts are counted before the password is checked, so once over the limit even a correct guess is refused. A successful sign-in resets that username's count. The trade-off: someone who knows a username can lock it for 15 minutes by failing on purpose. That's an annoyance, not a break-in, and the student's Brick keeps working. A whole class on one campus network shares one IP, which is why the network limit is much higher than the per-username one.

**What Supabase stores.** `bricks`: username, password hash, sync code hash, current state, when the current lock started, signup time. `sessions`: start and end time of each lock. `logins`: sign-in cookie hashes and their expiry. `rate_limits`: one row per username or IP address that has tried to sign in or sign up, holding only the latest attempt count and when that window started. Nothing about which apps are opened, or when, and no emails.

---

## Setup (organizers)

### 1. Run it locally

```bash
git clone [repo link]
cd mtc-brick
npm install
npm run dev
```

Open http://localhost:3000 for the setup steps and http://localhost:3000/me to try the dashboard. Without a database, data lives in memory and resets when you restart. Fine for poking around.

**Pretend to tap a tag.** Make an account on `/me`, press **Get a sync code**, then send what Brick Toggle would send. The dashboard updates within 15 seconds. In PowerShell:

```powershell
Invoke-RestMethod -Method Post http://localhost:3000/api/sync -ContentType "application/json" `
  -Headers @{ "x-brick-key" = "brk_YOUR_CODE" } -Body '{"state":"bricked"}'
```

Send `{"state":"unlocked"}` to end the session. This only tests the dashboard; the phone side (notification, bouncing out of apps) needs the real shortcuts on an iPhone.

### 2. Create the database

The database only powers the dashboard. Blocking works without it, but on Vercel the in-memory fallback resets constantly, so connect Supabase if you want the dashboard to work.

1. Make a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**, paste `supabase/schema.sql`, **Run**. Ran an older version of the file before accounts were added? Delete the old tables first: the file only creates tables that don't exist yet, so it won't add the new columns.
3. **Project Settings → API**: copy the **Project URL** and the **service_role** key.
4. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

> The service role key can read and write everything. It stays on the server only. Never commit `.env.local` or put this key in a `NEXT_PUBLIC_` variable.

### 3. Deploy to Vercel

Import the repo in Vercel, add the same two environment variables, and deploy.

### 4. Build and share the shortcuts

Follow **[SHORTCUTS.md](SHORTCUTS.md)**. You build them once on your iPhone, then paste their iCloud links into Vercel as `NEXT_PUBLIC_TOGGLE_SHORTCUT_URL` and `NEXT_PUBLIC_CHECK_SHORTCUT_URL`.

### 5. Send students the link

Students open your site on their iPhone, add the two shortcuts, and set up two automations. Making a dashboard account is optional. It takes about 10 minutes and needs an NFC tag and an iPhone XS or newer.

---

## API

None of these are needed for blocking. "Signed in" means the `brick_session` cookie from signup or login. Signup and login answer `429` when over the limits above.

| Route | Auth | What it does |
|---|---|---|
| `POST /api/signup` `{ username, password }` | none | Makes an account and signs in |
| `POST /api/login` `{ username, password }` | none | Signs in |
| `POST /api/logout` | signed in | Signs this browser out |
| `POST /api/sync-code` | signed in | Makes a new sync code (shown once), replacing the old one |
| `GET /api/stats` | signed in | Status, focus minutes today, streak, last 10 sessions |
| `POST /api/sync` `{ "state": "bricked" \| "unlocked" }` | header `x-brick-key: <sync code>` | Records the phone's new state |

Brick Check never contacts the server, so it can't record which apps you open or when.

## Files

| File | What it does |
|---|---|
| `app/page.js` | Setup page: step-by-step instructions, no account needed |
| `app/me/page.js` | Dashboard: sign in, sync code, status, focus time, streak, sessions |
| `app/me/MeltingClock.js` | The loading screen clock |
| `app/api/*/route.js` | The API routes above |
| `lib/store.js` | Saves accounts, sign-ins and sessions (Supabase or memory) |
| `lib/auth.js` | Usernames, password hashing, sign-in cookies and attempt limits |
| `lib/keys.js` | Makes, hashes and checks sync codes |
| `supabase/schema.sql` | Database tables and the rate limit function, locked down with Row Level Security |
| `SHORTCUTS.md` | How to build and share the two shortcuts |

## Want real app blocking?

That needs Apple's Screen Time tools (Family Controls), which only work in a native iPhone app. You'd need a Mac with Xcode and a paid Apple Developer account; Apple doesn't offer Family Controls to free accounts. See [Foqos](https://github.com/awaseem/foqos) for a free, open-source example on the App Store.

---
