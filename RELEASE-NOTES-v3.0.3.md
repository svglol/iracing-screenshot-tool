# v3.0.3

A polish bump on top of v3.0.2. Carries everything from the v3.0.x line plus a handful of important fixes — most notably, the gallery now actually shows your screenshots if you save them as JPG (the default). The Help and Changelog windows have also been straightened out: no more sideways scrolling, no more weirdly narrow text columns inside huge dialogs.

## What's new in v3.0.3

### The gallery now shows all your screenshots — not just PNGs

If your output format was set to JPEG (the default) or WEBP, the gallery was silently filtering them out and only listing PNGs — so a folder full of screenshots looked half-empty or completely empty. The thumbnail strip now picks up `.jpg`, `.jpeg`, `.png`, `.webp`, and `.bmp` files alike, matching everything the app and ReShade can actually write.

If you've been wondering where your shots went, open the gallery again — they were always there.

### Help and Changelog windows look right again

The Help dialog had an old layout bug where the text was pinned to a narrow 600 px column inside an otherwise wide window — and long file paths and hotkeys (`C:\Users\…\Pictures\Screenshots`, `Control + PrintScreen`, …) pushed a horizontal scrollbar across the whole dialog. Both of those are gone:

- The text now uses the full width of the window and wraps cleanly at the edge — long Windows paths break instead of running off the side.
- The window itself no longer blows past its container on wide monitors, so the horizontal scrollbar that some users saw doesn't appear at all.

The Changelog window had the same window-sizing bug and got the same fix — opening Help → What's new on a wide monitor now shows release notes filling the dialog properly instead of being clipped or overflowing.

### Settings sidebar — small polish

The "Changelog" and "Open Logs Folder" links in the Settings sidebar now read as small, right-aligned uppercase actions, visually distinct from the static `Version - X.Y.Z` label sitting above them. Same buttons, same behavior — just easier to recognize as clickable.

## Everything from v3.0.2, still in v3.0.3

### Keep Aspect Ratio — match your monitor, not the preset

If you race on a 21:9 ultrawide, a 32:9 super-ultrawide, a 16:10 panel, or a 4:3 retro setup, the built-in resolution presets (1080p, 4k, 8k, …) are 16:9 and don't match your screen. There's a **Keep Aspect Ratio** toggle in the sidebar that fixes that automatically — pick your resolution, flip the switch, and the height is recomputed from your monitor's native ratio while the width stays exactly what you chose.

Worked example: with the toggle on and a 21:9 monitor selected, picking **8k** gives you `7680 × 3240` instead of `7680 × 4320`. A live `Target: W × H` line under the resolution dropdown previews the value before you press Screenshot, so you always know what you're going to get.

The toggle defaults to **off**, so 16:9 users see no change.

### Changelog content wraps long lines

The in-app changelog (Help → What's new) used to push a horizontal scrollbar when a release entry contained long URLs, fenced code blocks, or wide tables. It now wraps cleanly inside the window, with code blocks reflowing and any wide tables getting their own contained scroll. (The dialog *itself* is also now correctly sized — see "Help and Changelog windows look right again" above.)

## Everything from v3.0.1, still in v3.0.3

### Screenshots come out at the right resolution, every time

There was a sneaky bug where, on some machines, a saved screenshot would come out at your monitor's native resolution instead of the one you picked in the app. It's fixed across the board — regular capture and ReShade-mode capture both. Whatever resolution you choose, the file you get will match it exactly, with the watermark cleanly cropped out.

### A faster, smoother gallery

The thumbnail strip at the bottom of the app has been redesigned:

- It stays smooth no matter how many screenshots you have
- The selected screenshot is shown larger and centered so you can see it clearly
- Thumbnails are now generated as you browse, not all at once — so the app feels snappier, especially on long sessions

### Send bug reports and feature requests from Discord

You can file bugs and feature requests **straight from our Discord server** — no GitHub account needed, no leaving the chat. There are commands to browse what others have already reported, and you can vote with reactions on the features you want to see most.

👉 **Check the `#readme` channel in the Discord for the full walkthrough.**

### Polish you'll notice

- Pop-up windows (Settings, Help, etc.) have a nicely blurred background
- The Settings switches have a friendlier "light-switch" look — and the whole row is clickable, switch or label
- Sidebar info bubbles are calmer and less in-your-face
- The "Crop Watermark" hint actually explains what the option does
- Various small wording fixes and layout tweaks throughout

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
