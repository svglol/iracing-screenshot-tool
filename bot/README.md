# iRacing Screenshot Tool — Discord Bug & Feature Tracker Bot

A separate always-on Node service that bridges a public Discord channel to GitHub Issues on `svglol/iracing-screenshot-tool`. Community members file bugs and feature requests with Discord slash-command modals; the bot mirrors them to GitHub, re-hosts attachments to a dedicated orphan branch, tallies 👍 reactions into a `votes:N` label on feature requests, and edits the original Discord post (plus pings the reporter) when the GitHub issue changes state. The bot lives at `/bot/` in this repo but is **NOT bundled** into the Electron desktop app — it deploys independently on a small VPS or home server.

## Prerequisites

- **Node.js ≥ 24.0.0** — required for `better-sqlite3@12.x` prebuilt binaries (N-API 137). Downgrading `better-sqlite3` below 12.0.0 on Node 24 will NOT work.
- **npm ≥ 11** (ships with Node 24)
- **git**
- **Access to `svglol/iracing-screenshot-tool`** on GitHub — needed to create a fine-grained PAT scoped to this repo.
- **A Discord server you control** — for the bot invite and Maintainer role setup.
- **One of:**
  - **Windows 10 or later** for the NSSM deployment path, or
  - **Linux with systemd** (any modern distro: Debian 12+, Ubuntu 22.04+, Rocky/AlmaLinux 9+, Arch, etc.) for the systemd unit path.
- **Recommended:** `cloudflared` for exposing the local webhook port to GitHub without port forwarding or TLS cert management.

## Install

```bash
cd bot
npm install
cp .env.example .env
# Edit .env with your values — see "Configuration" below for each variable
```

`npm install` compiles the `better-sqlite3` native addon against Node 24. If the compile step fails on Linux, install `build-essential python3`; on Windows 10/11 install "Desktop development with C++" via the Visual Studio Build Tools installer (npm will prompt with the link).

## Configuration

All configuration comes from environment variables. The bot uses `dotenv` in development to load a local `.env` file; in production the environment is provided by the service manager (NSSM or systemd) so `.env` is optional. Every variable in `/bot/.env.example` is documented below.

| Name                          | Required?                | Where to get it / what it does                                                                                                                                                                                                                                             |
| ----------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DISCORD_TOKEN`               | **yes**                  | From https://discord.com/developers/applications → your application → **Bot** tab → **Reset Token** (first time). Treat as a password; never commit. See [docs/discord-app-setup.md](docs/discord-app-setup.md).                                                           |
| `DISCORD_CLIENT_ID`           | **yes**                  | The Application ID — same page, top of **General Information**. Also called "Client ID" in older docs.                                                                                                                                                                    |
| `DISCORD_GUILD_ID`            | optional (dev only)      | Set to a single guild (server) ID for **dev** — slash commands register there instantly. **Leave EMPTY in prod** for global registration (propagation up to 1 hour).                                                                                                       |
| `DISCORD_REPORTS_CHANNEL_ID`  | **yes**                  | Enable **Developer Mode** in Discord (User Settings → Advanced → Developer Mode → on), then right-click your chosen reports channel → **Copy Channel ID**.                                                                                                                |
| `DISCORD_MAINTAINER_ROLE_ID`  | **yes**                  | Server Settings → Roles → right-click the **Maintainer** role → **Copy Role ID**. Grants triage command access. See [docs/discord-app-setup.md](docs/discord-app-setup.md) for role creation.                                                                             |
| `DISCORD_OWNER_ID`            | **yes**                  | Your own Discord user ID (right-click your name anywhere → **Copy User ID**). Acts as a hard-coded triage bypass in case the Maintainer role is missing (D-15).                                                                                                            |
| `GITHUB_TOKEN`                | **yes**                  | Fine-grained Personal Access Token scoped to this one repo with **Issues: R/W**, **Contents: R/W**, **Metadata: R**. See [docs/github-webhook-setup.md](docs/github-webhook-setup.md). Rotate at least annually (max 1 year life).                                         |
| `GITHUB_OWNER`                | default: `svglol`        | GitHub organisation/user that owns the repo. Override for forks.                                                                                                                                                                                                          |
| `GITHUB_REPO`                 | default: `iracing-screenshot-tool` | Repository name. Override for forks.                                                                                                                                                                                                                             |
| `GITHUB_ATTACHMENTS_BRANCH`   | default: `bug-attachments` | Orphan branch that receives re-hosted screenshots and log files (D-18). Created automatically on first attachment. Keep it separate from `master` so attachment commits never pollute main history.                                                                        |
| `GITHUB_WEBHOOK_SECRET`       | **yes**                  | Random high-entropy string. Must match byte-for-byte with the **Secret** you paste into GitHub's webhook configuration. Generate with the one-liner in [docs/github-webhook-setup.md](docs/github-webhook-setup.md).                                                       |
| `WEBHOOK_PORT`                | default: `3001`          | Port Fastify binds locally. Cloudflare Tunnel forwards a public URL to this port; GitHub never talks to it directly. See [docs/cloudflare-tunnel.md](docs/cloudflare-tunnel.md).                                                                                           |
| `RATE_LIMIT_PER_DAY`          | default: `3`             | Per-user cap on combined `/bug` + `/feature` submissions per rolling day (D-14). Tune up if your community is small and well-behaved, down if abuse appears.                                                                                                              |
| `LOG_LEVEL`                   | default: `info`          | Either `info` (INFO only) or `debug` (INFO + DEBUG). Set to `debug` when troubleshooting.                                                                                                                                                                                  |
| `LOG_DIR`                     | default: `./logs`        | Directory (relative to `/bot/`) where `pino-roll` writes rotating JSON log files. The service user must have write access.                                                                                                                                                |
| `NODE_ENV`                    | `production` or `development` | Standard Node convention. `dotenv` still loads `.env` regardless; this is advisory for downstream libs.                                                                                                                                                             |

If any **required** variable is missing at startup the process exits with `MissingConfigError` — fail-fast by design (see `src/config.js`).

## Setup flow

Follow these in order the first time. Each step links to a drill-down doc with copy-pasteable commands.

1. **Create the Discord application and invite the bot** — see [docs/discord-app-setup.md](docs/discord-app-setup.md)
2. **Create a fine-grained GitHub PAT and configure the webhook** — see [docs/github-webhook-setup.md](docs/github-webhook-setup.md)
3. **Expose the local webhook port via Cloudflare Tunnel** — see [docs/cloudflare-tunnel.md](docs/cloudflare-tunnel.md)
4. **Deploy as a service** — see [docs/deploy-windows-nssm.md](docs/deploy-windows-nssm.md) (Windows) or [docs/deploy-linux-systemd.md](docs/deploy-linux-systemd.md) (Linux)

Steps 1–2 can run in parallel with step 3 (the tunnel hostname is needed when you configure the GitHub webhook in step 2, so most people do step 3 first).

## First run (manual foreground for dev)

Once `.env` is populated and the tunnel is up, smoke-test in the foreground before wrapping in a service:

```bash
# From /bot/:
npm run register-commands   # pushes slash commands to Discord (uses DISCORD_GUILD_ID for instant propagation, or global if unset)
npm start                   # runs the bot in the foreground
```

Expect log lines like:

```
INFO  Database opened at ./data/bot.db
INFO  Discord ready as iracing-bot#1234
INFO  Fastify listening on http://0.0.0.0:3001
```

Then in your server try `/bug` — a modal should open. Submit a test report; a GitHub issue should appear in your test repo. Press `Ctrl+C` to stop.

Only run `npm run register-commands` when slash command definitions change. There is a per-day creation limit on the Discord side, and re-registering on every startup is wasteful. The Install/Setup flow runs it once; later changes to `/bot/src/discord/commands/*.js` need a fresh `register-commands` call before they take effect.

## Slash commands

**Public (rate-limited per `RATE_LIMIT_PER_DAY`):**
- `/bug` — opens a bug-report modal (title, steps-to-reproduce, expected, actual, version). Attachments follow as a message within 2 minutes.
- `/feature` — opens a feature-request modal (title, use case, why, nice-to-have).
- `/status <issue>` — show current issue state (open/closed, labels, assignee, vote count).
- `/list [open|closed|mine]` — list issues, paginated, filterable. `mine` filters by the Discord user who filed the report.
- `/top-features` — top 10 upvoted open features, ranked by the `votes:N` label.
- `/search <query>` — full-text search in the repo. `&` and other special chars are URL-encoded for the "see more on GitHub" footer link.

**Maintainer-only (gated by `DISCORD_MAINTAINER_ROLE_ID` or `DISCORD_OWNER_ID`, per D-15):**
- `/close <issue> [reason]` — close with reason `fixed | wontfix | not-planned | duplicate` (default `fixed`). Label is added BEFORE the close so webhook subscribers never see a closed issue without its matching status label.
- `/label <issue> <add|remove> <name>` — add/remove a label from the fixed taxonomy. `votes:N` is excluded from the taxonomy (runtime-managed).
- `/assign-status <issue> <status>` — replace the single-valued status label (`triaged | in-progress | fixed | wontfix | needs-repro`). Idempotent on the current value.
- `/mark-duplicate <issue> <of-issue>` — D-16 duplicate flow: `addLabels(['duplicate'])` → `addComment("Marked as duplicate of #N by <@caller> via bot.")` → `closeIssue(state_reason='duplicate')` in that exact order. Posts a best-effort Discord cross-link in the duplicate's original channel via `msg.reply` with `failIfNotExists: false` so a deleted original message doesn't block the operation.

## How attachments work

Discord's CDN URLs are signed and expire within roughly 24 hours (`ex`/`is`/`hm` query params). The bot must fetch the bytes **immediately**. After a reporter submits `/bug` or `/feature`, the bot opens a 2-minute message-collector scoped to the reporter in the reports channel. Any matching message with attachments triggers this pipeline:

1. Sanitise filename: extension allowlist → 120-char truncation preserving the extension.
2. Reject empty/oversized files (>10 MB) before any network call.
3. Ensure the orphan branch `bug-attachments` exists (create via empty tree + parentless commit + `createRef` on first use).
4. Commit file bytes at `<issue-number>/<sanitized-filename>` on the orphan branch.
5. Embed the `raw.githubusercontent.com` URL in the GitHub issue body.

**Allowed extensions:** `.png, .jpg, .jpeg, .webp, .gif, .log, .txt, .json`. **Max 10 MB per attachment. Max 5 attachments per message.** Per-attachment failures (CDN 404, oversize, bad ext, commit error) are logged and skipped — losing one file must not lose the whole batch. Sending the literal word `done` in the collector window closes the window early.

## How votes work (D-04)

When the bot posts a **feature request** (NOT a bug) to the reports channel, members react with 👍. A per-issue debounced aggregator (60-second `setTimeout` coalesced via a `Map`) fires once, reads the current reaction count, and writes/updates a `votes:N` label on the GitHub issue. `/top-features` pulls the top 100 open features and sorts by `parseVotesLabel` descending, capping the reply at 10 issues.

Reactions on **bug** messages are intentionally ignored (the feature-only scope matches D-04). The aggregator's fast-path requires exactly one `votes:*` label on the issue — two stale labels force a clean-up pass. The webhook handler silently suppresses `votes:*` label events so reporters are not pinged on every upvote (that would be unusable).

## How status sync works (D-17)

GitHub → Discord sync is **push** (webhook), not pull. GitHub calls `POST /webhook/github` on every configured event; Fastify verifies the `X-Hub-Signature-256` HMAC-SHA256 header over the **raw** request bytes with `crypto.timingSafeEqual` and an explicit length guard. Replays are rejected via a 5-minute `X-GitHub-Delivery` UUID window stored in `webhook_deliveries` (UPSERT on conflict — replays respond `200 {ok:true, replay:true}` so GitHub stops retrying).

State-change icons edited into the original Discord message:

| GitHub event                                  | Icon | Meaning                  |
| --------------------------------------------- | ---- | ------------------------ |
| `issues.closed` with `state_reason=completed` | ✅   | Fixed / resolved         |
| `issues.closed` with `state_reason=not_planned` | 🔒 | Won't fix / not planned |
| `issues.closed` with `state_reason=duplicate` | 🔁   | Marked duplicate         |
| `issues.reopened`                             | 🔄   | Reopened                 |

Every change posts a threaded reply pinging the reporter with `allowedMentions: { users: [reporterId] }` — this respects Discord's per-user/role mute semantics AND prevents mention-smuggling via user-controlled label/title strings. Every Discord call is wrapped in try/catch so a permission-revoked or deleted-channel case never escalates to a Fastify 500 (which would trigger a GitHub retry storm).

## Testing

```bash
cd bot
npm test               # runs jest against all *.test.js files (bot tree only)
npm run jest:watch     # watch mode
npm run jest:coverage  # coverage report in coverage/
```

The root repo's Jest config explicitly ignores `/bot/` (`testPathIgnorePatterns` in `/package.json`) so `npm test` in the repo root does NOT run bot tests. Bot tests use `babel-jest` under `@babel/preset-env@7.29.2` because Jest 25 has no native ESM support; the runtime bot still executes as native ESM via Node 24. A Jest stub for `discord.js` lives at `/bot/test-helpers/discord.js.cjs` and is wired through `moduleNameMapper` — tests get real builder output from `@discordjs/builders` without loading discord.js's gateway machinery.

## Electron-builder exclusion verification

The bot lives outside the Electron installer's `build.files` allowlist in the root `package.json`, AND is explicitly negated via `!bot/**/*` (belt-and-suspenders). To verify after any change to either `package.json`:

```bash
# From repo root:
npm run build:dir
# Then confirm no bot/ subtree inside the unpacked build:
node -e "const fs=require('fs'); const p='build/win-unpacked/resources/app/bot'; if(fs.existsSync(p)){console.error('FAIL: bot bundled into installer');process.exit(1)} else {console.log('OK: bot not bundled')}"
```

A positive result (no `bot/` under `build/win-unpacked/resources/app/`) means the desktop installer is not inflated by bot code.

## Log rotation and location

`pino` + `pino-roll` writes structured JSON lines to `./logs/bot.log` (configurable via `LOG_DIR`). Rotation is size-based at **5 MB**, retaining the last 1 MB with a `[TRUNCATED]` marker — matching the desktop app's log shape (see `src/utilities/logger.js` in the main app). Every log call path is wrapped in try/catch so logging failures degrade to line loss rather than crashing the process.

On Linux with systemd you can additionally stream via `journalctl -u iracing-screenshot-bot -f`; NSSM on Windows redirects stdout/stderr to separate log files plus the pino-structured `bot.log`.

## PAT rotation (D-09)

Fine-grained PATs expire at most 1 year from creation. Calendar a reminder a week before expiry and run:

1. Generate a new token at https://github.com/settings/tokens?type=beta with the same scopes (Issues R/W, Contents R/W, Metadata R) on the same single repo.
2. Edit `.env` (or the service's environment source) and update `GITHUB_TOKEN`.
3. Restart the service:
   - Linux: `sudo systemctl restart iracing-screenshot-bot`
   - Windows: `nssm restart iracing-screenshot-bot`
4. Verify by running `/status 1` (or any live issue) from Discord — a successful response means the new token works.
5. **Revoke the old token** on GitHub's token settings page. Do not skip this — a leaked old token stays valid until revoked.

## Troubleshooting

- **Slash commands don't appear in the server** — `register-commands` was never run, OR global registration is still propagating (up to 1 hour). For dev set `DISCORD_GUILD_ID`; the commands appear instantly in that one guild.
- **"This interaction failed"** — the bot was slow to reply (>3 s). All command handlers defer ephemerally on the first await for exactly this reason; check `logs/bot.log` for an unhandled rejection around the failing command.
- **Attachment didn't upload** — extension not in the allowlist, file >10 MB, reporter took longer than 2 minutes, OR the Discord CDN signed URL expired before the bot fetched it (network outage during the 2-min window). Check `logs/bot.log` for `attachment_fetch_failed` or `attachment_commit_failed`.
- **Webhook returns 401 on GitHub's "Recent Deliveries" tab** — HMAC mismatch. Verify `GITHUB_WEBHOOK_SECRET` in `.env` is byte-for-byte identical to the **Secret** in GitHub's webhook settings (no trailing whitespace, no wrapping quotes).
- **Webhook returns 200 `{replay:true}`** — not an error. GitHub's "Redeliver" button sends the same `X-GitHub-Delivery` UUID; the bot's 5-minute replay window correctly rejects the duplicate dispatch.
- **`better-sqlite3` fails to load at startup** — you are on Node < 24, OR you downgraded `better-sqlite3` below 12.0.0. Both are unsupported. Run `node --version`; upgrade if needed.
- **Votes label not updating on a feature issue** — reactions on bug messages are intentionally ignored (D-04 scope: features only). Confirm the issue was filed via `/feature`, not `/bug`.
- **Votes label updating on every reaction (spam)** — should never happen because the aggregator coalesces via a per-issue setTimeout Map. If it does, check `logs/bot.log` for `_getTimerCountForTests` anomalies — likely a clock skew or a broken Map reference.
- **Triage command says "🚫 You need the Maintainer role"** — the calling user does not have the role whose ID is in `DISCORD_MAINTAINER_ROLE_ID`, and their user ID does not match `DISCORD_OWNER_ID`. Verify role assignment in Discord → Server Settings → Members.
- **`/mark-duplicate` succeeds on GitHub but no Discord cross-link appears** — the duplicate issue has no local mapping row (was filed outside Discord) OR `channel.send` failed due to permissions. This is best-effort by design; the GitHub side is the source of truth.
- **Port 3001 already in use** — another process is bound. Either stop it or change `WEBHOOK_PORT` in `.env` AND update Cloudflare Tunnel's `config.yml` ingress entry to the new port.

## License and attribution

Same license as the parent project (`svglol/iracing-screenshot-tool`). Author: Matthew (savageguy@gmail.com).
