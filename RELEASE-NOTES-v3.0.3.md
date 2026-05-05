# v3.0.3

The v3.0.x line is now stable. Here's what's in it.

## New features

- **Keep Aspect Ratio toggle** — for ultrawide (21:9, 32:9), 16:10, or 4:3 monitors. Pick a resolution preset, flip the toggle, and the height is recomputed from your monitor's native ratio while the width stays exactly what you chose. (Example: 8k on a 21:9 monitor → `7680 × 3240`.) Defaults to off; 16:9 users see no change.
- **File bugs and feature requests from Discord** — no GitHub account needed. See the `#readme` channel for the full walkthrough.

## Bugs fixed

- **Screenshots come out at the right resolution.** A bug where saved screenshots were sometimes captured at your monitor's native resolution instead of the one you chose is fixed for both regular and ReShade-mode capture.
- **The gallery now finds all your screenshots.** If your output format was JPEG (the default) or WEBP, the gallery was silently filtering them out and only showing PNGs. It now picks up `.jpg`, `.jpeg`, `.png`, `.webp`, and `.bmp`.
- **Help and Changelog windows fit on screen.** The horizontal scrollbar that some users saw on wide monitors is gone, and long file paths and hotkeys wrap inside the window instead of running off the side.
- Smaller polish across the Settings, gallery, and pop-up windows — calmer info bubbles, friendlier toggles, blurred backgrounds, clearer wording.

## Under the hood

The whole app has been rebuilt on a more modern foundation across v3.0.x: Vue 3 instead of Vue 2, Vite instead of Webpack for the build, and TypeScript across the codebase. Nothing for you to do — same app, healthier guts. The practical upshot is that future updates can land faster and with fewer regressions.

## How to get it

- **Installer (recommended)** — `iRacing Screenshot Tool Setup 3.0.3.exe`
- **Portable (no install)** — `iRacing Screenshot Tool 3.0.3.exe`

Settings and screenshots from v2 carry over automatically. The first time you open the new gallery, thumbnails may take a moment to refresh as you scroll — expected.

## Need help or found a bug?

Hop into our Discord and check the `#readme` channel.

## 🙏 Thanks

To everyone who reported empty galleries, sideways-scrolling Help windows, wrong-resolution screenshots, and asked for an ultrawide-friendly resolution mode — the logs and feedback you sent made all of these fixes possible.
