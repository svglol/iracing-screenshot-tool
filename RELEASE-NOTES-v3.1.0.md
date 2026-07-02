# v3.1.0

The biggest capture update yet: true-color high-fidelity screenshots, GPU-memory safety warnings so high resolutions are less likely to crash iRacing, and fixes for the screenshot button not enabling.

## New features

- **High-Fidelity Capture (true color).** A new native capture path grabs iRacing as true, un-subsampled color instead of routing every frame through the old video pipeline, which quietly reduced color detail (chroma subsampling). Skies, gradients and fine color transitions come out cleaner. It's **on by default** and falls back automatically to the previous method if your system can't use it, so nothing breaks on older setups. You can toggle it under **Settings → High-Fidelity Capture (WGC)**.
- **GPU memory (VRAM) safety.** The tool now measures how much video memory your GPU has free and warns you when a chosen resolution is likely to make iRacing run out of memory and crash. Resolutions in the sidebar are colored by how safe they are, and risky ones show a one-click link that switches you to the largest safe preset (e.g. **Switch to 4k**). The sidebar also shows a live readout of your GPU and how much of its video memory is free. Nothing is ever blocked — it's a warning, not a wall.
- **Exclusive-fullscreen warning.** If iRacing is running in exclusive **Full Screen**, every screenshot comes back black (a Windows limitation). The tool now detects this and tells you to switch iRacing's Display to **Borderless** or **Windowed** so captures work. (ReShade capture is unaffected — it works in Full Screen, so ReShade users don't see this warning.)

## Improvements

- **Faster window resizing.** iRacing's window is now resized in-process instead of shelling out to PowerShell, with a fix for scaled (high-DPI) monitors.
- **Snappier capture and thumbnails.** Screenshots are captured through a single stream, and gallery thumbnails are built in memory instead of re-read from disk.
- **Format options.** JPEG remains the default (now at maximum quality); a lossless **PNG** option is available in Settings, along with WebP. Fully black frames are detected and reported instead of being saved silently.

## Bugs fixed

- **The screenshot button no longer sticks after a save issue.** If a screenshot reported success but its file couldn't be found immediately afterward (for example, moved or quarantined by antivirus), the button could stay greyed out until you restarted the app. It now always re-enables.
- **The screenshot button now enables reliably at startup.** If iRacing was already running when you opened the tool, the button could stay disabled because of a startup timing issue. The tool now keeps checking until it detects iRacing.
- **Better recovery around crashes and disconnects.** A stuck capture is now recovered automatically, a capture is aborted cleanly if iRacing disconnects mid-shot, and requested dimensions are clamped so extreme values can't wedge a capture.

## How to get it

- **Installer (recommended)** — `iRacing Screenshot Tool Setup 3.1.0.exe`
- **Portable (no install)** — `iRacing Screenshot Tool 3.1.0.exe`

Settings carry over from v3.0.5 — no migration needed. High-Fidelity Capture turns on automatically; if you prefer the old behavior you can switch it off in Settings.

## Need help or found a bug?

Hop into our Discord and check the `#readme` channel.

## 🙏 Thanks

To everyone who reported the screenshot button not enabling, and to the drivers running 4k–8k captures on tighter VRAM budgets whose crash reports drove the new memory-safety warnings.
