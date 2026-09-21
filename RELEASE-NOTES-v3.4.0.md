# iRacing Screenshot Tool — v3.4.0

Graphics profiles for iRacing, seven more languages, and a Long Exposure bug
that could save a black image and call it a success.

## New

- **Graphics Profiles.** Store iRacing graphics configurations and switch
  between them — one for racing, one for screenshots, one for recording
  video — from the title bar instead of hand-editing
  `rendererDX11Monitor.ini` and keeping copies yourself.

  The panel always tells you where you stand: "Matches your Screenshots
  profile", "Based on Screenshots, with 5 settings changed since", or "Does
  not match any stored profile". That middle case is normal, not a bug —
  iRacing rewrites its graphics config every time it exits, so a config
  drifts away from the profile it came from the moment you touch a slider
  in-sim.

  Saving refuses to store the exact same configuration twice, and points you
  at the profile that already holds it instead of leaving you to diff `.ini`
  files by hand. Editing a file iRacing depends on deserves some care, so
  applies and overwrites are backed up first (ten kept), written atomically,
  and disabled while iRacing is open — the sim holds its settings in memory
  and writes them back over the file when it exits, so a switch made while
  it's open would be silently undone.

- **The app has pages now.** Settings and Help are full pages instead of
  dialogs, reached from a slim rail on the left that also holds Screenshots
  and our Discord; F1 still opens Help. The title bar shows which stored
  Graphics Profile the active config matches (with a "Modified" badge once
  it drifts) and holds the button to the profiles panel.

- **Seven more languages.** Arabic, Russian, Japanese, Korean, Traditional
  Chinese, Greek and Turkish join the thirteen from v3.3.0, for twenty in
  total. Everything above is covered too — Graphics Profiles ship translated
  in all of them — under the same rule as before:
  iRacing's own terms (iRacing, ReShade, WGC, VRAM, and the menu paths Help
  points you to) are left in English so they still match what you see in the
  sim.

- **An offset for the filename counter.** `{counter+5}` numbers files
  starting at 5 instead of 0 — useful for continuing a sequence from a
  previous session instead of restarting it. Works alongside a plain
  `{counter}` in the same format, and the filename preview in Settings
  shows exactly what the first file will be named.

- **Resolution and file size in the gallery.** Each screenshot now carries a
  small caption under its name — `3840x2160 · 4.2 MB` — replacing the badge
  that crowded the filename.

- **An FAQ in Help**, for the three things people report as "the tool is
  broken" most often, none of which is a bug in the tool: a long exposure
  that comes back black except for the iRacing UI (a handful of cameras —
  the suspension camera especially — render nothing, unlike exclusive
  fullscreen where the UI goes black too); iRacing moving the camera on its
  own mid-capture (its own **Shot Selection: Automatic**, under **Camera >
  Config > Preferences**); and vertical bands in triple-screen shots, a side
  effect of multi-projection (SMP) plus bezel correction — set the bezel
  width to 0 mm (immediate) or turn SMP off (needs an iRacing restart).

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

- **Installer** — `iRacing-Screenshot-Tool-Setup-3.4.0.exe`
- **Portable** — `iRacing-Screenshot-Tool-3.4.0.exe`
