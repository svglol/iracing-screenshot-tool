# v3.0.4

A small, targeted patch fixing two issues reported against v3.0.3.

## Bugs fixed

- **Screenshots no longer fail with "iRacing telemetry is not available" while you're sitting in the menus.** Previously, the screenshot button would refuse to fire any time you were connected to iRacing but not yet in an active session (e.g. on the main menu, between sessions, or before joining a server) — and the error message blamed telemetry, which was misleading. Now the screenshot proceeds. If no session info is available, the file is saved with a fallback name like `iRacingScreenshotTool-0.png` so you can still grab a UI screenshot. (The telemetry gate is unchanged for the real case where iRacing isn't running.)
- **The error toast no longer shows `<br>` and `<small>` tags as text.** Following the v3.0.x rebuild, the notification library stopped rendering HTML inside toast messages, so error toasts were displaying their formatting tags as literal characters next to the actual error. Error notifications now render cleanly, with the log file path on its own line in a smaller style.

## How to get it

- **Installer (recommended)** — `iRacing Screenshot Tool Setup 3.0.4.exe`
- **Portable (no install)** — `iRacing Screenshot Tool 3.0.4.exe`

Settings carry over from v3.0.3 — no migration needed.

## Need help or found a bug?

Hop into our Discord and check the `#readme` channel.

## 🙏 Thanks

To the user who shared the full error log on 2026-05-20 that surfaced both issues — that report contained exactly the diagnostic information needed to diagnose and fix both bugs in one pass.
