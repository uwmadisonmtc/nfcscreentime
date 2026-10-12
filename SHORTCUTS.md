# Building the two shortcuts (organizers, one time)

You build these once on your own iPhone, then share them as iCloud links. Students tap a link and tap **Add Shortcut**. Brick Toggle asks for a sync code, which they leave blank unless they want the optional dashboard. Nobody else has to build anything.

Before you start, deploy the app (see README) so you know your URL. Below, replace `https://YOUR-APP.vercel.app` with it.

**How they work:** whether you're bricked is saved in a small file on the phone, `brick.txt` in the Shortcuts folder. It holds the word `bricked` or `unlocked`. Brick Toggle flips it and Brick Check reads it, so blocking needs no internet. The only thing that goes online is Brick Toggle's last step, which updates the dashboard.

---

## Shortcut 1: Brick Toggle

Runs when you tap your tag. Locks if you're unlocked, unlocks if you're locked, then updates the dashboard.

In the Shortcuts app, tap **+** and name it **Brick Toggle**. Add these actions in order:

1. **Text**
   Type `SYNC-CODE`. (The import question below replaces this with the student's code, or nothing.)

2. **Set Variable**
   Name it `SyncCode`. Input: the **Text** from step 1.

3. **Get File**
   - Folder: **Shortcuts**
   - File Path: `brick.txt`
   - Tap **Show More** and turn **Error If Not Found** off (the file doesn't exist until the first tap)

4. **Get Text from Input**
   Input: **File** from step 3.

5. **If** **Text** **contains** `bricked`
   - **Text**: `unlocked`

   **Otherwise**
   - **Text**: `bricked`

   **End If**

6. **Set Variable**
   Name it `NewState`. Input: **If Result**.

7. **Save File**
   - Input: **NewState**
   - Turn **Ask Where to Save** off
   - Destination Path: `brick.txt`
   - Turn **Overwrite If File Exists** on

8. **If** **NewState** **is** `bricked`
   - **Show Notification**: `🧱 Bricked. Your apps are blocked until you tap again.`

   **Otherwise**
   - **Show Notification**: `🔓 Unbricked. Nice focus.`

   **End If**

9. **If** **SyncCode** **has any value** (keep this whole block last)
   - **Get Contents of URL**
     - URL: `https://YOUR-APP.vercel.app/api/sync`
     - Tap **Show More**
     - Method: **POST**
     - Headers → **Add new header**: key `x-brick-key`, value: the **SyncCode** variable
     - Request Body: **JSON** → **Add new field** → **Text**: key `state`, value: the **NewState** variable

   **End If**

> **Why the web request goes last:** if it fails (no internet, server paused), Shortcuts stops the shortcut there. By then the lock is already saved and you've seen the notification, so a failed request can't stop the Brick from working. Students with no sync code skip it entirely, so they never go online.

## Shortcut 2: Brick Check

Runs every time a blocked app opens. If you're bricked, it sends you back to the home screen. No key, no internet.

New shortcut named **Brick Check**:

1. **Get File**
   - Folder: **Shortcuts**
   - File Path: `brick.txt`
   - **Error If Not Found** off

2. **Get Text from Input**
   Input: **File** from step 1.

3. **If** **Text** **contains** `bricked`
   - **Show Notification**: `🧱 You're bricked. Tap your tag to unlock.`
   - **Go to Home Screen**

4. **End If** (added automatically)

If `brick.txt` is missing or unreadable, the text is empty, so the app opens. A bug can never lock anyone out.

---

## Make them shareable

**Brick Toggle** needs an import question so each student can paste their own sync code:

1. Open the shortcut, tap the **ⓘ** (or the name at the top) → **Set Up Import Questions** (on some iOS versions it's under **Shortcut Details → Setup**).
2. Tap **Add Question**, choose the `SYNC-CODE` text from step 1.
3. Question text: `Dashboard sync code (optional, leave blank to skip)`. Clear the default answer.

**Brick Check** has nothing personal in it, so it needs no import question.

For each shortcut, tap **Share → Copy iCloud Link**. Then put both links in Vercel → your project → **Settings → Environment Variables**:

- `NEXT_PUBLIC_TOGGLE_SHORTCUT_URL` = Brick Toggle's link
- `NEXT_PUBLIC_CHECK_SHORTCUT_URL` = Brick Check's link

Redeploy. The setup page now shows working **Add** buttons.

> **Changed a shortcut later?** iCloud links are a snapshot. Copy a new link and update the environment variable.

---

## Test it yourself first

1. Add both shortcuts from the links, as a student would. Leave the sync code blank.
2. Create the two automations (setup page, steps 2 and 3).
3. Tap your tag and open Instagram: you should bounce home. Tap again to unlock. That's the no-account path.
4. Now make an account on `/me`, tap **Get a sync code**, and paste the code into Brick Toggle's first **Text** action.
5. Tap your tag: you should get a "🧱 Bricked" notification, and the dashboard should say Bricked.
6. Open Instagram: you should bounce to the home screen.
7. Turn on **Airplane Mode** and open Instagram again: you should still bounce.
8. Tap the tag again (still offline): "🔓 Unbricked". Instagram opens normally. You'll likely also see a Shortcuts error about the connection; that's the dashboard update failing, and it's expected.
9. Turn Airplane Mode off and tap twice more. The dashboard catches up to the phone's state.

### If something's off

- **No notification on tap:** the NFC automation must be set to **Run Immediately**.
- **Blocked app opens anyway:** check the app automation is **Run Immediately** and points to **Brick Check**. Then open **Files → iCloud Drive → Shortcuts** (or **On My iPhone → Shortcuts**) and check `brick.txt` says `bricked`. Both shortcuts must use the same folder and file name.
- **Dashboard doesn't update:** the sync code in Brick Toggle's first Text action is missing, wrong, has a space, or was replaced by a newer code. Get a new code on the dashboard and paste it in. Also check the URL in step 9. Blocking still works in the meantime.
- **Dashboard is wrong after being offline:** it shows whatever the phone last reported. The next tap with internet fixes it. A missed unlock makes that session look longer than it was; a missed lock means that session isn't counted.
- **"Running your automation" banners:** open each automation and turn off **Notify When Run**.
- **Lost the tag while bricked:** open the Shortcuts app and run **Brick Toggle** by hand.

### What this can't do

This uses Shortcuts, not Apple's Screen Time tools, so it's an honor-system Brick: you can always turn off the automation or run Brick Toggle from the Shortcuts app. A real app blocker needs a native iPhone app, a Mac and a paid Apple Developer account (see README).
