# Building the two shortcuts (organizers, one time)

You build these once on your own iPhone, then share them as iCloud links. Students tap a link, tap **Add Shortcut**, and paste their Brick key when asked. Nobody else has to build anything.

Before you start, deploy the app (see README) so you know your URL. Below, replace `https://YOUR-APP.vercel.app` with it.

---

## Shortcut 1: Brick Toggle

Runs when you tap your tag. Locks if you're unlocked, unlocks if you're locked.

In the Shortcuts app, tap **+** and name it **Brick Toggle**. Add these actions in order:

1. **Text**
   Type `PASTE-YOUR-KEY-HERE`.

2. **Get Contents of URL**
   - URL: `https://YOUR-APP.vercel.app/api/toggle`
   - Tap **Show More**
   - Method: **POST**
   - Headers → **Add new header**: key `x-brick-key`, value: the **Text** variable from step 1
   - Request Body: leave as **JSON** with no fields

3. **Get Dictionary Value**
   Get **Value** for key `message` in **Contents of URL**.

4. **Show Notification**
   Body: **Dictionary Value**.

## Shortcut 2: Brick Check

Runs every time a blocked app opens. If you're bricked, it sends you back to the home screen.

New shortcut named **Brick Check**:

1. **Text**
   Type `PASTE-YOUR-KEY-HERE`.

2. **Get Contents of URL**
   - URL: `https://YOUR-APP.vercel.app/api/status`
   - Method: **GET**
   - Headers: `x-brick-key` = the **Text** variable from step 1

3. **Get Dictionary Value**
   Get **Value** for key `state` in **Contents of URL**.

4. **If** **Dictionary Value** **is** `bricked`
   - **Show Notification**: `🧱 You're bricked. Tap your tag to unlock.`
   - **Go to Home Screen**

5. **End If** (added automatically)

---

## Make them shareable

For **each** shortcut:

1. Open the shortcut, tap the **ⓘ** (or the name at the top) → **Set Up Import Questions** (on some iOS versions it's under **Shortcut Details → Setup**).
2. Tap **Add Question**, choose the `PASTE-YOUR-KEY-HERE` text from step 1.
3. Question text: `Paste your Brick key (it starts with brk_)`. Clear the default answer.
4. Back out, tap **Share → Copy iCloud Link**.

Then put both links in Vercel → your project → **Settings → Environment Variables**:

- `NEXT_PUBLIC_TOGGLE_SHORTCUT_URL` = Brick Toggle's link
- `NEXT_PUBLIC_CHECK_SHORTCUT_URL` = Brick Check's link

Redeploy. The setup page now shows working **Add** buttons.

> **Changed a shortcut later?** iCloud links are a snapshot. Copy a new link and update the environment variable.

---

## Test it yourself first

1. Make a Brick on your deployed setup page and add both shortcuts from the links, as a student would.
2. Create the two automations (setup page, steps 3 and 4).
3. Tap your tag: you should get a "🧱 Bricked" notification.
4. Open Instagram: you should bounce to the home screen.
5. Tap the tag again: "🔓 Unbricked after X min". Instagram opens normally.

### If something's off

- **No notification on tap:** the NFC automation must be set to **Run Immediately**. Also check the URL in Brick Toggle.
- **"Brick key not recognized":** the key in the shortcut is wrong or has a space. Delete the shortcut and add it again from the link.
- **Blocked app opens anyway:** check the app automation is **Run Immediately** and points to **Brick Check**. Also, with no internet, Brick Check can't reach the server and lets the app open (on purpose, so a bad connection never locks you out).
- **"Running your automation" banners:** open each automation and turn off **Notify When Run**.

### What this can't do

This uses Shortcuts, not Apple's Screen Time tools, so it's an honor-system Brick: you can always turn off the automation in the Shortcuts app. A real app blocker needs a native iPhone app, a Mac and a paid Apple Developer account (see README).
