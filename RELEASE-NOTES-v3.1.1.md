# v3.1.1

A stability, reliability and diagnostics release. It builds on v3.1.0's High-Fidelity Capture and VRAM-safety work: capture and recovery are more robust, GPU-memory warnings are now accurate on multi-GPU systems, screenshot filenames are safer, and the app now keeps detailed logs that make bug reports far easier to act on. Most of this is under the hood — there's nothing new to learn, things just fail less and recover better.

## Improvements

- **Accurate GPU-memory (VRAM) warnings on multi-GPU systems.** The VRAM safety warnings added in v3.1.0 now match usage to the correct adapter, so laptops and desktops with two GPUs no longer see false "low memory" warnings.
- **Window position/size is remembered reliably.** Ultrawide and Surround users' saved screen-restore geometry now persists across restarts instead of occasionally being lost.
- **Much better diagnostics.** The app now writes proper, leveled logs (info / warning / error) to its log file, with safe rotation so the log can't grow without bound, structured error details instead of empty entries, and your username masked out of file paths. If you hit a problem, the log now tells us what actually happened — including a one-line summary of your GPU, VRAM, displays and capture backend at startup.

## Bugs fixed

- **The app no longer gets stuck after an iRacing disconnect or a stalled capture.** Several rare-but-severe paths that could silently disable capture until you restarted the app now recover on their own and leave a log trail.
- **No more duplicate or "ghost" screenshots.** If a capture was aborted mid-shot (for example, iRacing disconnecting at the wrong moment), the tool could still deliver a stray screenshot afterward. Aborted captures are now dropped cleanly.
- **Safer screenshot filenames.** Track or driver names containing non-Latin characters (e.g. Japanese, Cyrillic), control characters, or Windows reserved names (like `CON`/`NUL`) no longer produce broken names or a failed save — they're sanitized while preserving spaces and readable names.
- **Fewer background writes and leaks in the UI.** Settings are now saved only when they actually change, and a couple of event-listener leaks were cleaned up.

## Security

- **Removed an unused privilege-escalation surface.** The `@electron/remote` component (unused by the app) has been removed entirely, and both windows now block navigation away from the app and refuse to open new windows — so a malicious link or injected content can't steer the app elsewhere.

## Under the hood

- Crash safety nets for the main and renderer processes, so a crash is recorded in the log instead of vanishing silently.
- The WGC / VRAM failure diagnostics are now durable and honest — a capture that quietly falls back to the older method is recorded, and a GPU-memory reading is taken before iRacing can free its memory, so crash reports point at the real cause.
- Hardened the release pipeline and added an automated test suite (329 tests) covering the previously-untested core logic.

## How to get it

- **Installer (recommended)** — `iRacing Screenshot Tool Setup 3.1.1.exe`
- **Portable (no install)** — `iRacing Screenshot Tool 3.1.1.exe`

Settings carry over from v3.1.0 — no migration needed.

## Need help or found a bug?

Hop into our Discord and check the `#readme` channel. Thanks to the new logging, bug reports are now much easier for us to diagnose.

## 🙏 Thanks

To everyone who reported captures getting stuck or the app needing a restart, and to the drivers on multi-GPU machines whose reports drove the more accurate VRAM warnings.
