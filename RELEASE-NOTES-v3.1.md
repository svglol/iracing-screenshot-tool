# iRacing Screenshot Tool — v3.1

Sharper screenshots, fewer crashes, and captures that recover on their own.

## What's new

- **True-color capture.** A new native path grabs iRacing without the old pipeline's color loss — cleaner skies, gradients and fine detail. On by default, falls back automatically on unsupported systems. Toggle under **Settings → High-Fidelity Capture (WGC)**.
- **VRAM safety warnings.** The tool checks your free GPU memory and flags resolutions likely to crash iRacing, with a one-click switch to the largest safe preset. Accurate on multi-GPU laptops and desktops. It's a warning, never a block.
- **Exclusive-fullscreen alert.** Captures come back black in iRacing's exclusive **Full Screen** (a Windows limit). The tool now spots this and tells you to switch to **Borderless** or **Windowed**. (ReShade users are unaffected.)

## Fixes & improvements

- Screenshot button now enables reliably at startup and no longer sticks after a save hiccup.
- No more getting stuck after an iRacing disconnect or a stalled capture — these recover on their own, and aborted captures no longer leave a stray "ghost" screenshot.
- Safer filenames for non-Latin track/driver names and Windows reserved names.
- Faster window resizing (fixed on high-DPI monitors) and snappier thumbnails.
- Lossless **PNG** and WebP format options in Settings; JPEG stays the default.
- Proper leveled logs with your username masked, so bug reports are far easier to diagnose.
- Removed an unused `@electron/remote` privilege surface and locked down app navigation.

## Get it

- **Installer** — `iRacing Screenshot Tool Setup 3.1.1.exe`
- **Portable** — `iRacing Screenshot Tool 3.1.1.exe`

Settings carry over from v3.0.5 — no migration needed.

## Help or bugs?

Hop into our Discord and check the `#readme` channel.
