# iRacing Screenshot Tool v3.4.0

Graphics profiles for iRacing, seven more languages, a clear answer when
Windows blocks capture because the tool runs as administrator, and a Long
Exposure bug that could save a black image and report success.

## New

- **Graphics Profiles.** Store iRacing graphics configurations and switch
  between them from the title bar. Keep one profile for racing and another
  for screenshots, instead of hand-editing `rendererDX11Monitor.ini` and
  keeping your own copies.

  The panel names the current state. It reads "Matches your Screenshots
  profile", or "Based on Screenshots, with 5 settings changed since", or
  "Does not match any stored profile". The middle state is normal. iRacing
  rewrites its graphics config every time it exits, so a config drifts away
  from the profile it came from as soon as you touch a slider in the sim.

  Saving refuses to store the same configuration twice. It points you at the
  profile that already holds it, so you do not have to compare `.ini` files
  by hand. Before any apply or overwrite, the tool backs the file up and
  keeps the last ten backups, then writes the new file atomically. It
  disables both actions while iRacing is open. The sim holds its settings in
  memory and writes them back over the file when it exits, so a switch made
  while it is running would be undone without telling you.

- **The app has pages now.** Settings and Help are full pages instead of
  dialogs. You reach them from a rail on the left that also holds
  Screenshots and our Discord. F1 still opens Help. The title bar shows
  which stored Graphics Profile the active config matches, and adds a
  "Modified" badge once the config drifts. It also holds the button that
  opens the profiles panel.

- **Seven more languages.** Arabic, Russian, Japanese, Korean, Traditional
  Chinese, Greek and Turkish join the thirteen from v3.3.0, for twenty in
  total. Graphics Profiles ship translated in all of them. The same rule as
  before still applies. We leave iRacing's own terms in English so they
  match what you see in the sim, including iRacing, ReShade, WGC, VRAM, and
  the menu paths Help sends you to.

- **An offset for the filename counter.** `{counter+5}` numbers files from 5
  instead of 0, so you can continue a sequence from an earlier session
  instead of restarting it. It works alongside a plain `{counter}` in the
  same format. The filename preview in Settings shows what the first file
  will be named.

- **Resolution and file size in the gallery.** Each screenshot now has a
  caption under its name, such as `3840x2160 · 4.2 MB`. It replaces the
  badge that used to crowd the filename.

- **An FAQ in Help.** It covers the three problems people report most often
  as "the tool is broken". None of them is a bug in the tool.

  A long exposure can come back black except for the iRacing UI. A few
  cameras render nothing, and the suspension camera is the worst offender.
  That is different from exclusive fullscreen, where the UI goes black too.

  iRacing can move the camera by itself during a capture. That is its own
  Shot Selection setting on Automatic, under Camera > Config > Preferences.

  Triple-screen shots can show vertical bands. Multi-projection (SMP)
  combined with bezel correction causes them. Set the bezel width to 0 mm
  for an immediate fix, or turn SMP off and restart iRacing.

## Fixes

- **Every capture failed with "Could not start video source" when the tool
  ran as administrator.** Windows refuses screen capture to an app running
  with administrator rights. Both of the tool's capture methods go through
  that same Windows check, so screenshots and long exposures all failed, and
  the message gave no hint why. This is easy to set by accident, for example
  by ticking "Run this program as an administrator" once while
  troubleshooting.

  The tool now asks Windows whether it may capture. If it may not, a warning
  above the Screenshot button says so. When administrator mode is the cause,
  the warning tells you how to turn it off: right-click
  `iRacing Screenshot Tool.exe`, open Properties > Compatibility, and untick
  "Run this program as an administrator". Screenshots and long exposures
  stop straight away with the same message, instead of failing after a
  capture attempt. ReShade Compatibility Mode is not affected, because
  ReShade captures inside iRacing.

- **Long Exposure could save an all-black image, or a frozen one, and still
  report success.** Under GPU load, a capture could read the same video
  frame back before the previous one had finished copying. It was most
  likely on a loaded GPU with little VRAM headroom, and more likely right
  after the app resizes the iRacing window, which it does before every
  capture. The tool now detects a blank capture and refuses to save it
  instead of reporting success. When frames come back frozen rather than
  blank, it warns you and still saves. That is a real image, just not the
  exposure you asked for.

- **The tool could not find the iRacing config folder when Windows had
  redirected Documents.** OneDrive is the usual cause. On those machines,
  Graphics Profiles and the in-sim config warnings had nothing to work with,
  and said nothing about it. The tool now asks Windows for the folder
  through its own known-folder lookup, so it follows the redirection.

- **Long Exposure's warning panel no longer repeats every warning twice**
  after a capture finishes. A shutter-too-short notice, a bracket and
  interpolation conflict, or anything else the panel shows could appear once
  from the live settings, then again word for word from the finished
  capture.

## Notes

- Captures still need iRacing in Windowed Borderless. Exclusive Full Screen
  still comes back black.
- On Windows 10 before version 2004, the mouse cursor can appear in
  captures. Hiding it needs a newer version of Windows. The tool warns you
  when that applies to your machine.

## Get it

- Installer: `iRacing-Screenshot-Tool-Setup-3.4.0.exe`
- Portable: `iRacing-Screenshot-Tool-3.4.0.exe`
