// Setup page: add the two shortcuts, connect a tag, pick apps. No account
// needed; blocking runs entirely on the phone. The dashboard is an optional
// extra at the end.

// Paste the iCloud links for the two shortcuts here once you've built them
// (see SHORTCUTS.md), or set them as environment variables in Vercel.
const TOGGLE_SHORTCUT_URL = process.env.NEXT_PUBLIC_TOGGLE_SHORTCUT_URL || "";
const CHECK_SHORTCUT_URL = process.env.NEXT_PUBLIC_CHECK_SHORTCUT_URL || "";

function ShortcutLink({ url, label }) {
  if (!url) {
    return <span className="soft">{label} (link coming soon, ask an MTC organizer)</span>;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

export default function Setup() {
  return (
    <>
      <p className="eyebrow">MTC Brick</p>
      <h1>Brick your phone with an NFC tag</h1>
      <p className="soft">
        Tap your tag to block distracting apps. Tap again to unlock. Free, no account, works
        without internet, and nothing to install but two shortcuts. iPhone only.
      </p>

      <div className="glass">
        <h2>1. Add the two shortcuts</h2>
        <p className="soft">
          Open these on your iPhone. If Brick Toggle asks for a sync code, leave it blank. You
          only need one for the optional dashboard (step 5).
        </p>
        <ol className="steps">
          <li>
            <ShortcutLink url={TOGGLE_SHORTCUT_URL} label="Add “Brick Toggle”" />: locks and
            unlocks when you tap your tag.
          </li>
          <li>
            <ShortcutLink url={CHECK_SHORTCUT_URL} label="Add “Brick Check”" />: sends you home
            if you open a blocked app while bricked.
          </li>
        </ol>
      </div>

      <div className="glass">
        <h2>2. Connect your tag</h2>
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

      <div className="glass">
        <h2>3. Pick the apps to block</h2>
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

      <div className="glass">
        <h2>4. Try it</h2>
        <p>
          Tap your tag, then open a blocked app. You should land back on your home screen. Tap
          the tag again to unlock. That's it, you're done.
        </p>
      </div>

      <div className="glass">
        <h2>5. Optional: track your focus</h2>
        <p className="soft">
          Want focus time and a streak? Make an account, then paste your sync code into Brick
          Toggle. Skip this and your Brick works exactly the same.
        </p>
        <p>
          <a className="button" href="/me">
            Open the dashboard
          </a>
        </p>
      </div>
    </>
  );
}
