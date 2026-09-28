# iRacing Screenshot Tool v3.4.0

This release adds Graphics Profiles for iRacing, seven more languages, and
correct colors on HDR desktops. Two capture failures that used to show a
vague error now name the cause and the fix: the tool running as
administrator, and a ReShade.ini path that points at the wrong file. A Long
Exposure bug that could save a black image and report success is fixed.

## New

- **Graphics Profiles.** Store iRacing graphics configurations and switch
  between them from the title bar, for example one for racing and one for
  screenshots. You no longer have to hand-edit `rendererDX11Monitor.ini` or
  keep your own copies of it.

  The panel shows where the current config stands: "Matches your Screenshots
  profile", "Based on Screenshots, with 5 settings changed since", or "Does
  not match any stored profile". The second state is expected. iRacing
  rewrites its graphics config every time it exits, so a config drifts from
  its profile as soon as you move a slider in the sim.

  Saving refuses to store the same configuration twice and names the profile
  that already holds it. Before any apply or overwrite, the tool backs up the
  current file, keeps the last ten backups, and writes the new file
  atomically. Both actions are disabled while iRacing is open. The sim keeps
  its settings in memory and writes them over the file when it exits, which
  would silently undo the switch.

- **Settings and Help are full pages.** They used to be dialogs. A rail on
  the left switches between Screenshots, Settings and Help, and links to our
  Discord. F1 still opens Help. The title bar shows which stored Graphics
  Profile the active config matches, adds a "Modified" badge once the config
  drifts, and holds the button that opens the profiles panel.

- **Seven more languages.** Arabic, Russian, Japanese, Korean, Traditional
  Chinese, Greek and Turkish join the thirteen from v3.3.0, for twenty in
  total. Graphics Profiles and the new administrator and ReShade.ini messages
  are translated in all twenty. Product names and iRacing's menu paths stay
  in English so they match what you see on screen: iRacing, ReShade, WGC,
  VRAM, and the paths Help sends you to.

- **An offset for the filename counter.** `{counter+5}` starts numbering at
  5 instead of 0, so a sequence can carry on from an earlier session. It
  works alongside a plain `{counter}` in the same format, and the filename
  preview in Settings shows what the first file will be called.

- **Resolution and file size in the gallery.** Each screenshot has a caption
  under its name, such as `3840x2160 · 4.2 MB`. It replaces the badge that
  used to crowd the filename.

- **An FAQ in Help.** It covers the three problems reported most often as
  the tool being broken. None of them is a bug in the tool.

  A long exposure can come back black except for the iRacing UI. A few
  cameras render nothing, and the suspension camera is the worst offender.
  Exclusive fullscreen is a different problem: there the UI goes black too.

  iRacing can move the camera by itself during a capture. That is its own
  Shot Selection setting on Automatic, under Camera > Config > Preferences.

  Triple-screen shots can show vertical bands. Multi-projection (SMP)
  combined with bezel correction causes them. Set the bezel width to 0 mm
  for an immediate fix, or turn SMP off and restart iRacing.

## Fixes

- **Every capture failed with "Could not start video source" when the tool
  ran as administrator.** Windows refuses screen capture to an app running
  with administrator rights. Both of the tool's capture methods go through
  that check, so every screenshot and long exposure failed, and the message
  gave no reason. The setting is easy to turn on by accident, for example by
  ticking "Run this program as an administrator" once while troubleshooting.

  The tool now asks Windows whether it may capture. If it may not, a warning
  above the Screenshot button says so, and Screenshot and Long Exposure stop
  with that message before attempting a capture. When administrator mode is
  the cause, the warning gives the fix: close the tool, right-click
  `iRacing Screenshot Tool.exe`, open Properties > Compatibility, untick
  "Run this program as an administrator" (also under "Change settings for
  all users"), then start the tool normally. When something else refuses
  capture, such as a privacy setting, a company policy or security software,
  the warning says that instead. ReShade Compatibility Mode is not affected,
  because ReShade captures from inside iRacing.

- **Screenshots came out heavily overexposed on HDR desktops.** With HDR on
  in Windows, the desktop is composed in a wider color format, and the tool
  converted it straight to 8-bit color, clipping everything bright. The tool
  now checks whether the monitor showing iRacing is in HDR. If it is, the
  tool captures in the wider format and converts the image back using that
  monitor's SDR brightness setting. SDR monitors, including Windows 11 Auto
  Color Management on an SDR display, are captured as before. Thanks to
  @kylemcd for finding and fixing this.

- **A wrong ReShade.ini path now tells you what is wrong.** A path that
  pointed at nothing used to end in a raw "ENOENT" error, and picking a
  ReShade preset instead of ReShade.ini ended in "unable to determine the
  screenshot folder". Neither said what to do. The tool now tells apart a
  missing or unreadable file, a preset, a file that is not a ReShade config,
  and a config with no screenshot folder, and says which one it found and
  how to fix it. It checks before touching the iRacing window, and shows the
  message above the Screenshot button and under the path in Settings.
  Turning ReShade Compatibility Mode on also looks for ReShade.ini next to
  `iRacingSim64DX11.exe` if the stored path doesn't work.

- **Long Exposure could save an all-black image, or a frozen one, and still
  report success.** Under GPU load, a capture could read a video frame back
  before the previous one had finished copying. This was most likely on a
  busy GPU with little free VRAM, and right after the tool resizes the
  iRacing window, which it does before every capture. The tool now detects a
  blank capture and refuses to save it. When frames come back frozen, the
  result is still a real image but not the exposure you asked for, so the
  tool saves it and warns you.

- **The tool could not find the iRacing config folder when Windows had
  redirected Documents,** usually to OneDrive. Graphics Profiles and the
  in-sim config warnings then had nothing to read and gave no sign of it.
  The tool now gets the folder from Windows' known-folder lookup, which
  follows the redirection.

- **Long Exposure's warning panel no longer shows every warning twice**
  after a capture. A notice such as shutter-too-short, or a conflict between
  bracketing and interpolation, appeared once from the live settings and
  again from the finished capture.

## Notes

- This release is not code-signed, like every release before it. Windows
  SmartScreen may say it "protected your PC" the first time you run the
  installer: click More info, then Run anyway. Signing through the SignPath
  Foundation is in progress and will arrive in a later release.
- Electron is updated from 41.2.2 to 41.10.3, which brings the Chromium
  security fixes released since the version in v3.3.0.
- Captures still need iRacing in Windowed Borderless. Exclusive Full Screen
  still comes back black.
- On Windows 10 before version 2004, the mouse cursor can appear in
  captures, because hiding it needs a newer version of Windows. The tool
  warns you when this applies to your machine.

## Get it

- Installer: `iRacing-Screenshot-Tool-Setup-3.4.0.exe`
- Portable: `iRacing-Screenshot-Tool-3.4.0.exe`
