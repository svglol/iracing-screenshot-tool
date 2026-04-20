# GitHub fine-grained PAT + repo webhook

Two things live here: a fine-grained Personal Access Token that lets the bot create and update issues, and a repository webhook that lets GitHub push issue state changes to the bot. Both are scoped to exactly this one repo (D-09).

**NEVER commit `.env` to git. NEVER commit the webhook secret anywhere.**

## 1. Create a fine-grained Personal Access Token

Fine-grained PATs are the modern replacement for classic tokens. They expire (max 1 year), can be scoped to a single repo, and enumerate individual permissions instead of broad scopes.

1. Go to https://github.com/settings/tokens?type=beta (direct link to the fine-grained generator). You can also navigate: **Settings** (your avatar) → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**.
2. Click **Generate new token**.
3. Configure:
   - **Token name:** `iracing-screenshot-tool-bot` (or anything memorable — you will see this name in audit logs).
   - **Resource owner:** yourself (or the `svglol` org if you have admin access and prefer org-owned tokens).
   - **Expiration:** no more than 1 year (GitHub enforces this as the ceiling). Calendar the rotation date now — see the PAT rotation section in the main README.
   - **Repository access:** select **Only select repositories** → add **`svglol/iracing-screenshot-tool`** (and only this repo). Do NOT grant access to all repos; the bot's blast radius must be one repo.
4. Under **Permissions → Repository permissions**, set:
   - **Issues: Read and write** — create, comment, label, close, reopen.
   - **Contents: Read and write** — needed for the `bug-attachments` orphan branch (D-18). The bot commits file bytes to that branch via the Git Trees/Refs API.
   - **Metadata: Read-only** — mandatory for every fine-grained PAT; GitHub adds it automatically if you do not.
5. Leave **Organization permissions** untouched (the bot does not touch org settings).
6. Click **Generate token**.
7. **Copy the token immediately.** GitHub shows it once and never again.

## 2. Paste the token into `.env`

```
GITHUB_TOKEN=<paste the token here>
```

Do not wrap in quotes. Trailing whitespace breaks HMAC-adjacent checks elsewhere — paste cleanly.

Quick sanity check:

```bash
cd bot
node -e "require('dotenv').config(); const t = process.env.GITHUB_TOKEN; console.log(t ? ('OK: token is ' + t.length + ' chars, starts ' + t.slice(0,10) + '...') : 'MISSING')"
```

Expected: a single line `OK: token is <N> chars, starts github_pat_...`.

## 3. Generate the webhook shared secret

GitHub signs every webhook delivery with HMAC-SHA256 over the raw request body, using a secret you configure on both sides. The bot verifies this signature via `crypto.timingSafeEqual` with an explicit length guard. The secret must be high-entropy and secret — 32 random bytes rendered hex is the standard recipe.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this command on any machine with Node installed (including your workstation — the secret does not need to be generated on the server). Example output: `7e4f2a18c9e6bb4d3a0f5e2d1b8c7a9e0f4d3c2b1a098765432100fedcba98765` (do not use this example — generate your own).

Paste the output into `.env` as:

```
GITHUB_WEBHOOK_SECRET=7e4f2a18...<your actual value>
```

You will paste the SAME value into GitHub's webhook configuration in step 4. Byte-for-byte equality is required — trailing whitespace, wrapping quotes, or accidental double-paste all break HMAC verification and every delivery will 401.

## 4. Configure the repository webhook

First set up Cloudflare Tunnel so you have a public hostname pointing at `localhost:3001`. See [cloudflare-tunnel.md](cloudflare-tunnel.md). For the rest of this section we assume you chose `iracing-bot.your-domain.com` as the tunnel hostname.

1. Go to https://github.com/svglol/iracing-screenshot-tool/settings/hooks (repo **Settings** → **Webhooks**). Admin access to the repo is required.
2. Click **Add webhook**. GitHub prompts for your password.
3. Fill in:
   - **Payload URL:** `https://iracing-bot.your-domain.com/webhook/github` (HTTPS, path `/webhook/github` — that is the route the bot's Fastify server exposes).
   - **Content type:** `application/json` (**NOT** `application/x-www-form-urlencoded` — the bot parses JSON).
   - **Secret:** paste the EXACT same string you set as `GITHUB_WEBHOOK_SECRET` in `.env`. No quotes, no whitespace.
   - **SSL verification:** **Enable SSL verification** (the default). Cloudflare Tunnel serves a valid cert at your hostname.
4. Under **Which events would you like to trigger this webhook?** select **Let me select individual events.** A long checkbox list appears. Uncheck **Pushes** (the default) and check ONLY:
   - **Issues** — fires on `issues.opened`, `issues.closed`, `issues.reopened`, `issues.labeled`, `issues.unlabeled`, etc. The bot routes on `action` inside `handlers.js`.
   
   The bot currently does not consume `issue_comment`, `pull_request`, or other events — checking them wastes GitHub's delivery budget and noise-amplifies the bot's logs. If you add new handlers later (e.g. `/mention` awareness), return and check the relevant event.
5. **Active:** checked. Leave this on — unchecking silently stops deliveries.
6. Click **Add webhook**.

GitHub sends a **ping** event immediately after creation to prove your endpoint works. If the bot is running and the tunnel is up, you will see a green checkmark ✅ on the webhook's row within 1–2 seconds. A red ❌ means GitHub got a non-2xx or a connection error — see the troubleshooting section below.

## 5. Validate delivery

1. In the same GitHub webhook settings page, click the webhook entry you just added.
2. Switch to the **Recent Deliveries** tab.
3. You should see at least one **ping** delivery with a 200 OK response. Expand it; the **Response** body contains whatever the bot returned (for ping, `{ok:true}` — the bot handles all event types generously, returning 200 even for events it does not route, to stop GitHub retrying).
4. To test issue events without creating a real issue, open any existing issue in the repo, add a throwaway label (e.g. `test-webhook`), then remove it. Two deliveries appear in the **Recent Deliveries** list (`issues.labeled` then `issues.unlabeled`); both should be 200 OK.
5. GitHub's UI has a **Redeliver** button per delivery — useful for testing the bot's replay-protection behaviour. The first redeliver returns `200 {ok:true, replay:true}`. This is expected (see the main README's "How status sync works" section).

## Troubleshooting

- **Webhook returns 401** — the HMAC signature does not match. Both sides must hold the EXACT same secret. Compare: on the bot side `grep GITHUB_WEBHOOK_SECRET .env | wc -c` (counts characters); on GitHub's side you cannot read back the secret but you can **edit webhook → Change secret → paste again → Update webhook**.
- **Webhook returns 404** — either the tunnel is routing to the wrong port (check `cloudflared` logs) or the bot is not listening on `/webhook/github` (check `logs/bot.log` for `Fastify listening on ...`).
- **Webhook returns 500** — an uncaught error in the bot's handler. Check `logs/bot.log` and file an issue. Every handler should be wrapped in try/catch so this should never happen — a 500 is a real bug.
- **Webhook takes >10 s to respond** — GitHub times out at 10 seconds. The bot defers nothing in the HTTP path; all slow work (Discord message edits) is best-effort and should complete in well under 1 second. If you see timeouts, check network between the server and Cloudflare.
- **Token-related 403 or 401 errors in logs** — the PAT is missing a scope, was revoked, or expired. Regenerate following step 1 and rotate per the README.
