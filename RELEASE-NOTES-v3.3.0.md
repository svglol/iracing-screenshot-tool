# iRacing Screenshot Tool — v3.3.0

The tool speaks thirteen languages, and automatic updates finally work.

## New

- **The whole app is now available in thirteen languages.** English, plus
  **Deutsch, Español, Français, Italiano, Português, Nederlands, Polski,
  Svenska, Čeština, Dansk, Suomi** and **Norsk**. Your language is picked up
  from Windows the first time you run this version, and you can change it any
  time under Settings → Language. It switches instantly — no restart.

  This isn't a half-translation: the settings, the sidebar, the Long Exposure
  panel, every warning and error message, and the whole Help screen are all
  covered. Terms you'd recognise from iRacing itself — iRacing, ReShade, WGC,
  VRAM — are left alone on purpose, so they still match what you see in the
  sim's own settings.

  These translations were not done by native speakers. If something reads
  awkwardly in your language, please open an issue — corrections are welcome
  and easy to apply.

## Fixes

- **Automatic updates now work.** Several separate faults in the update check
  have been fixed, including one that stopped it running in installed builds
  and one that left releases pointing at the wrong version.

  **You will need to install this release by hand, one last time** — the fixes
  ship inside the new version, so they can't reach you through the mechanism
  they repair. From v3.3.0 onward it should update itself.

- **Long Exposure no longer refuses shots near the end of a replay.** It read
  one of iRacing's telemetry values backwards — a countdown of frames remaining
  was treated as a position — so any moment in the **back half of a replay** was
  rejected as "past the end of the replay". In a live session it refused
  everything, because the cursor sits at the live edge. Opening a replay parks
  you exactly there, which is how most people would have hit it. Verified on
  hardware: four straight refusals on 3.2.2, then a clean 8K capture on the
  first attempt with the fix.

## Changed

- **Updates no longer download themselves in the background.** The installer is
  around 114 MB, and it used to start transferring the moment the app opened —
  competing with iRacing for bandwidth and disk while you might be on track,
  with nothing on screen to say so. Now the app tells you a version is
  available and waits for you to ask for it.

- **The update button in the title bar says what it does.** It used to be an
  unlabelled green arrow that quit the app instantly on a single click. It now
  names the version and the action, shows download progress as a percentage,
  uses different icons for "download this" and "restart to install", and asks
  before restarting. It won't interrupt a screenshot or a Long Exposure that's
  in flight — it tells you why and waits.

- **Settings has a "Check for Updates" button** with a live status line, so you
  can find out where you stand instead of checking GitHub.

## Notes

- Unchanged: captures need iRacing in **Windowed Borderless**. Exclusive Full
  Screen still comes back black.
- On **Windows 10 before version 2004**, the mouse cursor can appear in
  captures — hiding it is a newer Windows feature. The tool warns you when that
  applies to your machine.

## Get it

- **Installer** — `iRacing Screenshot Tool Setup 3.3.0.exe`
- **Portable** — `iRacing Screenshot Tool 3.3.0.exe`
