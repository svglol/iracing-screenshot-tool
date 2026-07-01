# v3.0.5

A patch that lowers how much VRAM iRacing needs for high-resolution screenshots — making crashes at 4k–8k less likely.

## Improvements

- **High-resolution screenshots use less VRAM.** To remove the iRacing watermark, the tool used to make iRacing render about 12% more pixels than the resolution you picked, then crop back down. That extra rendering pushed VRAM higher at exactly the 4k–8k resolutions where iRacing can run out of memory and crash. Now iRacing renders **only** the resolution you select, and the watermark is trimmed from that frame instead — so the game never has to allocate a larger framebuffer than necessary.
  - **What changes for you:** with **Crop Watermark** on, the saved image is now slightly smaller than the nominal preset (for example, 8k saves at about `7219 × 4060` instead of `7680 × 4320`). The resolution readout in the sidebar now shows the exact size you'll get, with the render size next to it (e.g. `Output: 7219 × 4060 · renders at 7680 × 4320`). Turn Crop Watermark off to save at the full selected resolution.

## Bugs fixed

- **Very large Custom resolutions no longer hang.** With Crop Watermark on, a Custom width or height above roughly 9433 px used to be pushed past an internal capture limit, so the capture would spin for several seconds and then save at the wrong size. These now capture correctly.

## How to get it

- **Installer (recommended)** — `iRacing Screenshot Tool Setup 3.0.5.exe`
- **Portable (no install)** — `iRacing Screenshot Tool 3.0.5.exe`

Settings carry over from v3.0.4 — no migration needed.

## Need help or found a bug?

Hop into our Discord and check the `#readme` channel.

## 🙏 Thanks

To everyone running 4k–8k captures on tighter VRAM budgets who flagged iRacing crashing at the highest resolutions — that feedback is what motivated bounding the render size to exactly what you ask for.
