# Deploy on Windows with NSSM

NSSM (the Non-Sucking Service Manager) wraps any program as a proper Windows Service with crash-restart, log redirection, rotation, and startup ordering. The bot is a plain Node process — NSSM turns it into a boot-time service with one small GUI.

Before starting, confirm you have:

- The bot repo cloned at a stable path (suggested: `C:\opt\iracing-screenshot-tool\`). Avoid paths under `C:\Users\<you>\Documents\…` for a service — the `LocalSystem` account does not see user Documents.
- `/bot/` set up per the main [README.md](../README.md): `npm install` run, `.env` populated with every required value, `npm run register-commands` run once. The bot will bind Fastify to `localhost:3001` (configurable via `WEBHOOK_PORT` in `.env`) and serve `POST /webhook/github`.
- Cloudflare Tunnel configured and running (see [cloudflare-tunnel.md](cloudflare-tunnel.md)) — the tunnel forwards your public hostname to `http://localhost:3001` and GitHub posts to `https://<hostname>/webhook/github`. The bot can start before the tunnel, but the webhook receives no traffic until the tunnel is up.

## 1. Why NSSM

- **Lightweight service wrapper** — no .NET dependency, no hidden changes to `app.exe`; NSSM runs `node.exe src/index.js` and captures stdout/stderr.
- **Automatic restart** on crash with configurable throttle (avoids hot-loop when the error is deterministic).
- **Log redirection + built-in size-based rotation** — parallels the bot's own `pino-roll` rotation; NSSM's rotation watches stdout/stderr, pino-roll watches `logs/bot.log`.
- **No Task Scheduler quirks** — Task Scheduler can run a process on boot but cannot restart it on crash without extra logic. NSSM does both, cleanly.
- **Familiar idiom** — the Windows ecosystem uses NSSM for Node, Python, and Go services; a new maintainer likely recognises it.

## 2. Prerequisites

1. Download NSSM from https://nssm.cc/download (latest release, `nssm-<version>.zip`).
2. Unzip, navigate to `win64\` inside the archive, extract `nssm.exe` to a directory on your PATH. Suggested: `C:\Tools\nssm\nssm.exe`, then add `C:\Tools\nssm` to **System** PATH.
3. Verify in a new cmd window: `nssm --version` prints the NSSM version string.

## 3. Pre-flight — confirm the bot runs in the foreground

Service setup is painful to debug. Make sure the bot works **without** NSSM first:

```bat
cd C:\opt\iracing-screenshot-tool\bot
node src\index.js
```

Expect the usual startup log lines (Discord ready, Fastify listening, DB opened). If anything is missing or an error appears, fix it **before** moving on — a broken service is harder to diagnose than a broken foreground process. Ctrl+C to stop.

## 4. Install the service

Run cmd **as Administrator** (right-click cmd → **Run as administrator**):

```bat
nssm install iracing-screenshot-bot
```

NSSM opens a GUI window titled "NSSM service installer". Configure the tabs below:

### Application tab

- **Path:** the full path to `node.exe`. Find it with `where node` in another cmd window. Typical values:
  - `C:\Program Files\nodejs\node.exe` (official installer)
  - `C:\Users\<you>\AppData\Local\fnm_multishells\<pid>_<ts>\node.exe` if using fnm — use the fixed install path, not the shell-specific one, or `fnm use default` globally and reference that.
- **Startup directory:** the full path to the `/bot/` directory, e.g. `C:\opt\iracing-screenshot-tool\bot`. This is the working directory the bot sees — critical because `src/index.js` resolves `./data/bot.db` and `./logs/bot.log` relative to this.
- **Arguments:** `src\index.js` (NO quotes, NO leading `.\`; NSSM handles that).

### Details tab

- **Display name:** `iRacing Screenshot Tool — Discord Bot` (shows up in `services.msc`).
- **Description:** `Relays Discord bug/feature reports to GitHub Issues and syncs state back via webhook.`
- **Startup type:** **Automatic** (starts on boot). Alternative **Automatic (Delayed Start)** if you want the bot to wait 2 minutes after boot to avoid competing for CPU during Windows Update restarts.

### Log on tab

- **Local System account** is the default and fine for the bot (the bot does not need user-context file shares or Kerberos). Leave it selected.
- If your organisation requires a dedicated service account, create a local user, grant it "Log on as a service", and configure its access to the `/bot/` tree — out of scope for this doc.

### Dependencies tab

- Optional: add `Cloudflared` here if you installed Cloudflare Tunnel as a Windows Service (§9 of `cloudflare-tunnel.md`). The bot does not require the tunnel at startup (GitHub retries for 24 h), but listing it as a dependency makes service order explicit.

### Process tab

- **Priority class:** Normal. Leave as default.
- **Processor affinity:** All CPUs. Leave as default.

### Shutdown tab

- **Console shutdown behaviour:** check **Generate Control-C**. This lets the bot catch `SIGINT` and close Discord + Fastify + SQLite cleanly before NSSM force-kills it. Default timeout 1500 ms is enough.

### Exit actions tab

- **Default action:** **Restart application**.
- **Delay restart by:** `1500` ms (throttle to avoid a tight crash loop).
- **Restart throttle:** `1500` ms — the minimum uptime before NSSM considers a start "successful". A bot that crashes within the first 1500 ms is NOT restarted immediately, breaking runaway loops.

### I/O tab

Redirect stdout and stderr to dedicated files. NSSM appends (does not overwrite) on restart.

- **Output (stdout):** `C:\opt\iracing-screenshot-tool\bot\logs\stdout.log`
- **Error (stderr):** `C:\opt\iracing-screenshot-tool\bot\logs\stderr.log`

The directory must exist (`mkdir C:\opt\iracing-screenshot-tool\bot\logs`). The bot's `pino-roll` also writes structured JSON to `logs\bot.log` — three files total, each with a distinct purpose:

| File        | Written by | Content                                                                         |
| ----------- | ---------- | ------------------------------------------------------------------------------- |
| `stdout.log`| NSSM       | Anything `console.log`ed before pino is initialised; Node warnings.             |
| `stderr.log`| NSSM       | Uncaught exceptions, Node deprecation warnings.                                 |
| `bot.log`   | pino-roll  | Structured JSON log lines from `logger.info/debug/error` (the bulk of output).  |

### File rotation tab

- Check **Replace existing Output/Error files** (prevents disk-fill over months).
- **Rotate files when:**
  - Check **Restart application**: no (already handled above).
  - Check **Rotate files** with condition **File is bigger than** and set `5242880` bytes (5 MB) — matches pino-roll's 5 MB threshold for `bot.log`.
- Older rotations are renamed `stdout.log.1`, `stdout.log.2`, etc. Prune manually every few months or via a scheduled task.

### Environment tab

- Leave empty if `/bot/.env` is populated — the bot loads `.env` via `dotenv` at startup.
- If you prefer **not** to depend on `.env` in production, paste each variable here, one per line in `KEY=value` form. Advantages: no reliance on dotenv, easier to audit via `nssm dump iracing-screenshot-bot`. Disadvantage: edits require reinstalling the service.

Click **Install service**. NSSM confirms "Service 'iracing-screenshot-bot' installed successfully!".

## 5. Start the service

```bat
nssm start iracing-screenshot-bot
nssm status iracing-screenshot-bot
```

Expected output from `status`: `SERVICE_RUNNING`. If you see `SERVICE_STOPPED` or an exit code, check `stderr.log` and `bot.log`.

Alternative: `services.msc` → scroll to "iRacing Screenshot Tool — Discord Bot" → right-click → **Start**. Either approach works.

## 6. View logs

- **Structured bot log:** `type C:\opt\iracing-screenshot-tool\bot\logs\bot.log` (or your preferred log viewer — `jq` friendly).
- **Service stdout:** `type C:\opt\iracing-screenshot-tool\bot\logs\stdout.log`.
- **Service stderr:** `type C:\opt\iracing-screenshot-tool\bot\logs\stderr.log`.
- **Windows Event Viewer:** open `eventvwr.msc` → **Windows Logs** → **Application**. NSSM writes service-lifecycle events (start, stop, crash, restart) here with source `nssm`.

For live tailing PowerShell has:

```powershell
Get-Content C:\opt\iracing-screenshot-tool\bot\logs\bot.log -Wait -Tail 50
```

## 7. Updating the bot

```bat
nssm stop iracing-screenshot-bot
cd C:\opt\iracing-screenshot-tool
git pull
cd bot
npm ci
nssm start iracing-screenshot-bot
```

`npm ci` is preferred over `npm install` for prod — it installs the exact versions from `package-lock.json` and fails loudly on a drifted lockfile.

If the update changed slash command definitions, run `npm run register-commands` before `nssm start` (the bot itself does NOT re-register on boot — there is a per-day Discord API limit on command creation).

## 8. Uninstall

```bat
nssm stop iracing-screenshot-bot
nssm remove iracing-screenshot-bot confirm
```

The `confirm` keyword bypasses the interactive prompt. The bot's `/bot/` directory, logs, and SQLite database are untouched; only the service registration is removed. Delete the directory separately if you are decommissioning.

## Quick reference — NSSM commands

| Command                                        | What it does                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `nssm install iracing-screenshot-bot`          | Open the install GUI                                               |
| `nssm edit iracing-screenshot-bot`             | Re-open the GUI on an existing service to change a setting         |
| `nssm start iracing-screenshot-bot`            | Start                                                              |
| `nssm stop iracing-screenshot-bot`             | Stop (gracefully, via Ctrl+C → 1500 ms → kill)                    |
| `nssm restart iracing-screenshot-bot`          | Stop then start                                                    |
| `nssm status iracing-screenshot-bot`           | Print `SERVICE_RUNNING` / `SERVICE_STOPPED` / etc.                |
| `nssm remove iracing-screenshot-bot confirm`   | Uninstall the service (bot files untouched)                        |
| `nssm dump iracing-screenshot-bot`             | Print the full configuration (useful for recreating on a new host) |
