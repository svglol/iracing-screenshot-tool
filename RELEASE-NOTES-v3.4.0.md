# iRacing Screenshot Tool v3.4.0

The big one this time is Graphics Profiles. Keep one set of iRacing graphics
settings for racing and another for screenshots, and swap between them with
a click. The tool also speaks seven more languages, and screenshots finally
look right on HDR monitors.

Some problems that used to end in a confusing error now tell you what to do.
We also fixed a Long Exposure bug that could save a black picture and report
success. That one was nasty, because nothing told you it had happened.

## New

- **Graphics Profiles.** Save your iRacing graphics settings and switch
  between them from the top of the window.
- **A new layout.** Settings and Help are full pages, reached from a bar on
  the left.
- **Seven more languages.** Twenty in total.
- **Carry on numbering.** `{counter+5}` in the filename format starts your
  files at 5 instead of 0.
- **Picture size and file size in the gallery.** They show under each
  screenshot's name.
- **A FAQ in Help.** It covers the three problems people most often mistake
  for bugs.

## Fixes

- **Running as administrator.** Windows blocks capture for it. The tool now
  says so and shows the fix, where before you got a vague error.
- **HDR monitors.** Screenshots no longer come out far too bright.
- **Wrong ReShade.ini setting.** You get a clear message about what is
  wrong, where before you got "ENOENT".
- **Black Long Exposure pictures.** The tool refuses to save them, where
  before it saved them and reported success.
- **Documents in OneDrive.** The tool now finds iRacing's settings there.
- **Duplicate Long Exposure warnings.** Each warning shows once.

The full story behind each change is in
[v3.4.0 in detail](https://github.com/svglol/iracing-screenshot-tool/blob/v3.4.0/docs/releases/v3.4.0.md).

## Notes

- Windows may say it "protected your PC" the first time you run the
  installer. Click More info, then Run anyway. You see this because the
  release isn't digitally signed yet, and none of our releases have been.
  Signing is in progress and should arrive in a later release.
- We updated the browser engine the app is built on, which brings in its
  latest security fixes.
- iRacing still needs to run in Windowed Borderless. In iRacing's Full
  Screen mode, captures still come out black.
- On Windows 10 versions older than 2004, the mouse pointer can show up in
  your captures. The tool warns you if your PC is affected.

## Get it

- Installer, which most people want: `iRacing-Screenshot-Tool-Setup-3.4.0.exe`
- Portable, runs without installing: `iRacing-Screenshot-Tool-3.4.0.exe`
