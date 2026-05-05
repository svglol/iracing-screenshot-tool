# v3.0.3

The v3.0.x line is now stable. This release rolls in everything that landed across v3.0.0, v3.0.1, v3.0.2, and v3.0.3 — a faster gallery that actually shows all your screenshots, the right resolution every time, an ultrawide / 4:3 aspect-ratio mode, an in-Discord way to send bug reports and feature requests, and a long list of polish.

## What's new

### Your screenshots — at the right resolution, in a gallery that finds them all

- **Right resolution, every time.** A sneaky bug where saved screenshots came out at your monitor's native resolution instead of the one you picked is fixed across regular capture and ReShade-mode capture both. The file you get matches what you chose, with the watermark cleanly cropped out.
- **Gallery shows all your screenshots — not just PNGs.** If your output format was set to JPEG (the default) or WEBP, the gallery used to silently filter your shots out. The thumbnail strip now picks up `.jpg`, `.jpeg`, `.png`, `.webp`, and `.bmp` files alike. If you've been wondering where your shots went, open the gallery again — they were always there.
- **A faster, smoother gallery.** The thumbnail strip stays smooth no matter how many screenshots you have, the selected shot is shown larger and centered, and thumbnails are now generated as you browse instead of all at once — so the app feels snappier on long sessions.

### Keep Aspect Ratio — match your monitor, not the preset

If you race on a 21:9 ultrawide, a 32:9 super-ultrawide, a 16:10 panel, or a 4:3 retro setup, the built-in resolution presets (1080p, 4k, 8k, …) are 16:9 and don't match your screen. There's a **Keep Aspect Ratio** toggle in the sidebar that fixes that automatically — pick your resolution, flip the switch, and the height is recomputed from your monitor's native ratio while the width stays exactly what you chose.

Worked example: with the toggle on and a 21:9 monitor selected, picking **8k** gives you `7680 × 3240` instead of `7680 × 4320`. A live `Target: W × H` line under the resolution dropdown previews the value before you press Screenshot, so you always know what you're going to get.

The toggle defaults to **off**, so 16:9 users see no change.

### Send bug reports and feature requests from Discord

You can file bugs and feature requests **straight from our Discord server** — no GitHub account needed, no leaving the chat. There are commands to browse what others have already reported, and you can vote with reactions on the features you want to see most.

👉 **Check the `#readme` channel in the Discord for the full walkthrough.**

### Help, Changelog, and Settings windows look right

- The Help dialog used to pin its text to a narrow 600 px column inside an otherwise wide window, and long file paths and hotkeys (`C:\Users\…\Pictures\Screenshots`, `Control + PrintScreen`, …) pushed a horizontal scrollbar across the whole dialog. Both gone — text fills the dialog and wraps cleanly at the edge.
- The Help and Changelog windows themselves no longer blow past their container on wide monitors, so the horizontal scrollbar that some users saw doesn't appear at all.
- Inside the Changelog, long URLs, fenced code blocks, and wide tables also wrap inside the window now (code blocks reflow; wide tables get their own contained scroll).
- In Settings, the "Changelog" and "Open Logs Folder" links now read as small, right-aligned uppercase actions, visually distinct from the static `Version - X.Y.Z` label sitting above them.

### Polish you'll notice

- Pop-up windows (Settings, Help, etc.) have a nicely blurred background.
- The Settings switches have a friendlier "light-switch" look — and the whole row is clickable, switch or label.
- Sidebar info bubbles are calmer and less in-your-face.
- The "Crop Watermark" hint actually explains what the option does.
- Various small wording fixes and layout tweaks throughout.

## Behind the scenes

A lot of the app's plumbing has been rebuilt under the hood across the v3.0.x line. Nothing for you to do — it just means future updates can land more quickly and more reliably.

## How to get it

- **Installer (recommended)** — `iRacing Screenshot Tool Setup 3.0.3.exe`
- **Portable (no install)** — `iRacing Screenshot Tool 3.0.3.exe`

Your existing settings and screenshots from v2 carry over automatically. The first time you open the new gallery, it may take a moment to refresh thumbnails as you scroll through them — that's expected.

## Need help or found a bug?

Hop into our Discord and check the `#readme` channel — it has a quick guide to filing bugs and feature requests right from chat.

## 🙏 Thank you

To everyone who reported empty galleries, sideways-scrolling Help windows, wrong-resolution screenshots, watermark-crop edge cases, and asked for an ultrawide-friendly resolution mode — the logs and feedback you sent back made all of these fixes possible.
