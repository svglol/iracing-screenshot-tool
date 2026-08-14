# iRacing Screenshot Tool — v3.3.1

Graphics profiles, seven more languages, and a Long Exposure bug that could
save a black image and call it a success.

## New

- **Graphics Profiles.** Store iRacing graphics configurations and switch
  between them — one for racing, one for screenshots, one for recording
  video — from a new toolbar icon instead of hand-editing
  `rendererDX11Monitor.ini` and keeping copies yourself.

  The panel always tells you where you stand: "Matches your Screenshots
  profile", "Based on Screenshots, with 5 settings changed since", or "Does
  not match any stored profile". That middle case is normal, not a bug —
  iRacing rewrites its graphics config every time it exits, so a config
  drifts away from the profile it came from the moment you touch a slider
  in-sim.

  Saving refuses to store the exact same configuration twice, and points you
  at the profile that already holds it instead of leaving you to diff `.ini`
  files by hand. Every apply and overwrite is backed up first (ten kept), and
  writes are atomic, so a crash mid-write can't leave you with a corrupted
  config that makes iRacing discard everything and re-run its auto-setup.

  **iRacing has to be closed to switch** — it holds its graphics settings in
  memory and writes them back over the file when it exits, so a change made
  while it's running is silently undone. The Load button is disabled while
  iRacing is open, and again for whichever profile the live config already
  matches, since loading it again would change nothing.

- **Seven more languages.** Arabic, Russian, Japanese, Korean, Traditional
  Chinese, Greek and Turkish join the thirteen from v3.3.0, for twenty in
  total. Same coverage as before — settings, sidebar, Long Exposure, every
  warning, the whole Help screen — and the same rule: iRacing's own terms
  (iRacing, ReShade, WGC, VRAM, and the menu paths Help points you to) are
  left in English so they still match what you see in the sim.

- **A new FAQ tab in Help**, for the two things people report as "the tool
  is broken" most often, neither of which is a bug in the tool: a long
  exposure that comes back black except for the iRacing UI (a handful of
  cameras — the suspension camera especially — render nothing, unlike
  exclusive fullscreen where the UI goes black too), and iRacing moving the
  camera on its own mid-capture (its own **Shot Selection: Automatic**,
  under **Camera > Config > Preferences**).

## Fixes

- **Long Exposure could save an all-black image, or a suspiciously frozen
  one, and still call it a success.** Under GPU load, a capture could read
  the same video frame back before the previous one had actually finished
  landing on it — most likely on a loaded GPU with little VRAM headroom, and
  more likely right after the app resizes the iRacing window, immediately
  before every capture. The tool now detects a genuinely blank capture and
  refuses to save it rather than reporting success, and separately warns
  (without refusing) when frames came back frozen rather than blank — that's
  a real image, just not the exposure you asked for.
- **The iRacing config folder wasn't found when Windows had redirected
  Documents** — most commonly via OneDrive. Graphics Profiles and the
  in-sim config warnings both silently had nothing to work with on those
  machines. Now resolved through Windows' own known-folder lookup, so
  redirection is followed correctly.
- **Long Exposure's warning panel stopped repeating every warning twice**
  after a completed capture — a shutter-too-short notice, a bracket/
  interpolation conflict, anything the panel shows could appear once from
  the live settings and once again, verbatim, from the finished capture.

## Notes

- Unchanged: captures need iRacing in **Windowed Borderless**. Exclusive Full
  Screen still comes back black.
- On **Windows 10 before version 2004**, the mouse cursor can appear in
  captures — hiding it is a newer Windows feature. The tool warns you when
  that applies to your machine.

## Get it

- **Installer** — `iRacing-Screenshot-Tool-Setup-3.3.1.exe`
- **Portable** — `iRacing-Screenshot-Tool-3.3.1.exe`
