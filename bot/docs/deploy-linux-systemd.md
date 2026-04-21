# Deploy on Linux with systemd

systemd is the standard init/service manager on every modern Linux distro (Debian/Ubuntu/Rocky/Alma/Arch/…). One unit file turns the bot into a boot-time service with crash-restart, log aggregation via `journalctl`, and basic sandboxing.

## 1. Why systemd

- **Already installed** on every target distro — no extra package.
- **Crash-restart** with configurable backoff (`Restart=always`, `RestartSec=5`).
- **Logs aggregated** in the systemd journal — one place to look (`journalctl -u iracing-screenshot-bot`).
- **Sandboxing primitives** (`ProtectSystem`, `ProtectHome`, `ReadWritePaths`, `NoNewPrivileges`, `PrivateTmp`) let us reduce the bot's blast radius with no code changes.
- **Dependency ordering** (`After=network-online.target`) ensures the bot does not start before networking is up.

## 2. Prerequisites

- **Node 24 installed system-wide.** Run `node --version` — must print `v24.x.y` or higher. If your distro ships an older Node, install via [NodeSource](https://github.com/nodesource/distributions) or `nvm` and make sure `/usr/bin/node` (or `/usr/local/bin/node`) points at 24.
- **Repo cloned at a stable path**, suggested `/opt/iracing-screenshot-tool/`. Any path is fine, but `/opt` is the FHS-conventional home for optional third-party software.
- **`npm ci` run** inside `/opt/iracing-screenshot-tool/bot/` after cloning — this builds the `better-sqlite3` native addon against the installed Node.
- **`.env` populated** per the main [README.md](../README.md) — every `DISCORD_*`, `GITHUB_*`, `GITHUB_WEBHOOK_SECRET`, `WEBHOOK_PORT` value.
- **Cloudflare Tunnel configured** — see [cloudflare-tunnel.md](cloudflare-tunnel.md). Install it as its own systemd service (`sudo cloudflared service install`) alongside the bot. The bot's Fastify server binds `localhost:3001` (overridable via `WEBHOOK_PORT`) and serves `POST /webhook/github`; the tunnel maps your public hostname to that port so GitHub posts to `https://<hostname>/webhook/github`.
- **Slash commands registered** once: `cd /opt/iracing-screenshot-tool/bot && npm run register-commands`.

## 3. Create a dedicated service user (recommended)

Running the bot as a dedicated low-privilege user contains the blast radius of any compromise. Skip this only on throwaway dev boxes.

```bash
sudo useradd --system --create-home --home-dir /var/lib/iracing-bot --shell /usr/sbin/nologin iracing-bot
sudo chown -R iracing-bot:iracing-bot /opt/iracing-screenshot-tool/bot
```

The user has no login shell, no password, and owns the `/bot/` subtree so it can write `./logs/` and `./data/`.

**Ownership gotcha:** if you later `git pull` as root, new files will be owned by root and the bot (running as `iracing-bot`) cannot delete them. Always pull as the service user:

```bash
sudo -u iracing-bot bash -c 'cd /opt/iracing-screenshot-tool && git pull'
```

Or add `iracing-bot` to a shared group and set the repo group-writable.

## 4. Create the systemd unit

Write the file `/etc/systemd/system/iracing-screenshot-bot.service`:

```ini
[Unit]
Description=iRacing Screenshot Tool — Discord Bot
Documentation=https://github.com/svglol/iracing-screenshot-tool
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=iracing-bot
Group=iracing-bot
WorkingDirectory=/opt/iracing-screenshot-tool/bot
EnvironmentFile=/opt/iracing-screenshot-tool/bot/.env
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

# Hardening — reduce blast radius of any compromise
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/opt/iracing-screenshot-tool/bot/logs /opt/iracing-screenshot-tool/bot/data
# Network exposure limited to webhook port + outbound Discord/GitHub
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX

[Install]
WantedBy=multi-user.target
```

### Field-by-field notes

- **`Type=simple`** — the bot does not daemonize; `ExecStart` stays in the foreground and systemd tracks it directly. Correct for a Node process.
- **`User=` / `Group=iracing-bot`** — runs the process as the dedicated low-privilege account.
- **`WorkingDirectory=`** — must point to `/bot/` because `src/index.js` resolves `./data/bot.db` and `./logs/bot.log` relative to the CWD.
- **`EnvironmentFile=`** — systemd parses `KEY=value` lines from `.env`; comments (`#`) and blank lines are ignored. This is why the bot's `dotenv` load is effectively a no-op under systemd: the env is already populated.
- **`ExecStart=/usr/bin/node`** — full absolute path. Do NOT use `/usr/bin/env node` here; systemd resolves `ExecStart` binaries literally, and `env` adds a layer with no benefit. Run `which node` to confirm the actual path on your host; some distros install to `/usr/local/bin/node` (adjust accordingly).
- **`Restart=always`** + **`RestartSec=5`** — if the process exits (cleanly OR with error), wait 5 seconds, restart. Throttles crash loops without disabling them entirely.
- **`StandardOutput=journal`** + **`StandardError=journal`** — all stdout/stderr goes to the journal. Retrieve via `journalctl -u iracing-screenshot-bot`.
- **`NoNewPrivileges=true`** — the process cannot gain new privs via setuid/setgid binaries.
- **`ProtectSystem=strict`** — mounts `/usr`, `/boot`, `/efi`, `/etc` read-only for this process.
- **`ProtectHome=true`** — `/home`, `/root`, `/run/user` are inaccessible (the service user's home is at `/var/lib/iracing-bot`, outside these paths).
- **`ReadWritePaths=`** — explicit allowlist for paths the bot needs to write. With `ProtectSystem=strict` everything else is read-only; the bot only writes logs and the SQLite DB, so both paths are listed. If you move `LOG_DIR` elsewhere, update this line.
- **`PrivateTmp=true`** — private `/tmp` and `/var/tmp` for the process; protects against tmp-file collisions/attacks.
- **`RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX`** — IPv4/IPv6/Unix sockets only (which is all the bot needs).
- **`WantedBy=multi-user.target`** — the bot starts when the system reaches the standard multi-user state (post-network, non-graphical).

## 5. Enable and start

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now iracing-screenshot-bot
sudo systemctl status iracing-screenshot-bot
```

`daemon-reload` is mandatory after creating or editing a unit file. `enable --now` does both `enable` (start on boot) and `start` (now) in one call.

`status` output should show:

```
● iracing-screenshot-bot.service - iRacing Screenshot Tool — Discord Bot
     Loaded: loaded (/etc/systemd/system/iracing-screenshot-bot.service; enabled; ...)
     Active: active (running) since ...
     ...
```

If `Active: failed (Result: exit-code)`, check logs (§6).

## 6. Logs

Stream live:

```bash
journalctl -u iracing-screenshot-bot -f
```

Last 200 lines:

```bash
journalctl -u iracing-screenshot-bot -n 200
```

Structured bot log (pino-roll, JSON):

```bash
tail -f /opt/iracing-screenshot-tool/bot/logs/bot.log | jq .
```

The two streams overlap — pino writes to both stdout (captured by journal) and `bot.log` (captured by pino-roll). Use `journalctl` for lifecycle events (start/crash/restart) and `bot.log` for structured query.

Restrict journal retention if log volume is a concern (default is unlimited per distro settings). Edit `/etc/systemd/journald.conf` → `SystemMaxUse=500M` → `sudo systemctl restart systemd-journald`.

## 7. Updating

```bash
cd /opt/iracing-screenshot-tool
sudo -u iracing-bot git pull
sudo -u iracing-bot bash -c 'cd bot && npm ci'
sudo systemctl restart iracing-screenshot-bot
```

`npm ci` is preferred over `npm install` in prod — installs exact lockfile versions, fails on drift. If the update changed slash command definitions, run the register step before restart:

```bash
sudo -u iracing-bot bash -c 'cd /opt/iracing-screenshot-tool/bot && npm run register-commands'
```

Verify after restart:

```bash
systemctl status iracing-screenshot-bot
journalctl -u iracing-screenshot-bot -n 20
```

## 8. PAT rotation

When the GitHub fine-grained PAT nears expiry (see the main README's PAT rotation section), swap it:

```bash
sudo -u iracing-bot vi /opt/iracing-screenshot-tool/bot/.env   # edit GITHUB_TOKEN=<new value>
sudo systemctl restart iracing-screenshot-bot
```

Then confirm:

```bash
journalctl -u iracing-screenshot-bot -n 30
```

The next GitHub-touching command (any `/status`, `/list`, `/label` etc.) proves the new token works. Revoke the old token on GitHub immediately after confirming.

## Quick reference — systemctl commands

| Command                                                                   | What it does                                                    |
| ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `sudo systemctl daemon-reload`                                            | Reload unit files after editing `iracing-screenshot-bot.service`|
| `sudo systemctl start iracing-screenshot-bot`                             | Start                                                           |
| `sudo systemctl stop iracing-screenshot-bot`                              | Stop (sends `SIGTERM` → 90 s → `SIGKILL`)                       |
| `sudo systemctl restart iracing-screenshot-bot`                           | Stop then start                                                 |
| `sudo systemctl enable iracing-screenshot-bot`                            | Start on boot                                                   |
| `sudo systemctl disable iracing-screenshot-bot`                           | Do not start on boot                                            |
| `sudo systemctl status iracing-screenshot-bot`                            | Show current state + last 10 log lines                          |
| `journalctl -u iracing-screenshot-bot -f`                                 | Tail logs live                                                  |
| `journalctl -u iracing-screenshot-bot --since '1 hour ago'`               | Time-windowed logs                                              |
