# iRacing Screenshot Tool v3.4.1

A small fix-up for v3.4.0. If v3.4.0 stopped you taking screenshots, this
release is for you.

## Fixes

- **"Windows is refusing screen capture (0x80070057)".** On some Windows 11
  PCs, v3.4.0 wrongly decided capture was blocked and refused every
  screenshot, even though nothing was blocking it. Screenshots work again.
  The message now only appears when Windows really does refuse, for example
  when the tool is set to run as administrator.
- **"Click to download" in Settings now works.** Settings showed that an
  update was ready and said to click, but clicking did nothing. It now
  downloads and installs the update, just like the icon at the top of the
  window.

## Notes

- If you are on v3.4.0, the tool offers this update itself. Click the update
  icon at the top of the window.
- Windows may say it "protected your PC" the first time you run the
  installer. Click More info, then Run anyway. The release isn't digitally
  signed yet. Signing is in progress.
- iRacing still needs to run in Windowed Borderless. In iRacing's Full
  Screen mode, captures still come out black.

## Get it

- Installer, which most people want: `iRacing-Screenshot-Tool-Setup-3.4.1.exe`
- Portable, runs without installing: `iRacing-Screenshot-Tool-3.4.1.exe`
