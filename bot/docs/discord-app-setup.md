# Discord application + bot user setup

Follow this once per deployment (dev and prod each need their own application, or you can reuse one app by swapping `DISCORD_TOKEN`). End state: a Discord bot user invited to your server with the right permissions, the four `DISCORD_*_ID` values populated in `.env`, and the Maintainer role created and its ID copied.

**NEVER commit `.env` to git.** `/bot/.gitignore` already excludes it, but double-check before pushing.

## 1. Create the application

1. Go to https://discord.com/developers/applications.
2. Click **New Application** (top right).
3. Give it a name (e.g. `iRacing Screenshot Tool Bot`) and accept the terms.
4. Click **Create**.

You land on the **General Information** page of the new application.

## 2. Enable the bot user

Every application can have one bot user. For discord.js v14 you need this bot user before you can obtain a token.

1. Left sidebar → **Bot**.
2. Most modern apps now ship with the bot user pre-enabled. If you see an **Add Bot** button, click it and confirm.
3. Customise the display name and avatar if you like (cosmetic only).

## 3. Copy the bot token (DISCORD_TOKEN) and client ID (DISCORD_CLIENT_ID)

### Bot token → `DISCORD_TOKEN`

1. Still on the **Bot** tab, click **Reset Token** (the button label depends on whether a token already exists — first time it says **Reset Token**, and reveals the token once).
2. Copy the revealed value. **This is the only time Discord shows it in full.** If you lose it, you must reset again — all running instances of the bot will disconnect until the new token is deployed.
3. Paste into `.env` as `DISCORD_TOKEN=<paste>`.

Treat the token like a password. A leaked token lets anyone run your bot. If you suspect a leak: reset immediately and redeploy.

### Client ID → `DISCORD_CLIENT_ID`

1. Left sidebar → **General Information**.
2. Copy the **Application ID** (top of the page, under the app name). This is the same value as the "Client ID" referred to in older Discord docs.
3. Paste into `.env` as `DISCORD_CLIENT_ID=<paste>`.

## 4. Required gateway intents

The bot needs **exactly** these intents (set in code, at `bot/src/discord/client.js`):

- `Guilds`
- `GuildMessages`
- `GuildMessageReactions`

And partials `Message`, `Channel`, `Reaction` so reactions on messages cached before bot startup fire events.

**CRITICAL — disable these privileged intents on the Developer Portal Bot tab:**

- **MESSAGE CONTENT INTENT** — must be **OFF**. The bot never reads arbitrary message content; it only reads its own posts' reactions + the scoped follow-up message from the reporter (which it knows the ID of already).
- **SERVER MEMBERS INTENT** — must be **OFF**. The bot does not iterate server members.
- **PRESENCE INTENT** — must be **OFF**. Not used.

If you leave MESSAGE CONTENT INTENT enabled, Discord will eventually demand verification (100+ servers) or disable your bot; there is no reason to request it.

## 5. Generate the bot invite URL

1. Left sidebar → **OAuth2** → **URL Generator** (older Portal UIs: **OAuth2** → **URL Generator**).
2. Under **Scopes** check:
   - `bot`
   - `applications.commands`
3. A **Bot Permissions** section appears. Check:
   - **Send Messages** — post bug/feature embeds to the reports channel.
   - **Read Message History** — required to fetch the original message when editing on state change.
   - **Add Reactions** — seeds the 👍 reaction on feature posts so members can click once instead of typing the emoji.
   - **Manage Messages** — lets the bot edit **its own** posts (discord.js v14 requires this permission to edit messages that include embeds, even the bot's own).
   - **Embed Links** — renders the issue-link embed as a rich preview.
4. Copy the generated URL at the bottom of the page.
5. Paste it into your browser, select the target Discord server, and click **Authorize**.
6. Solve the CAPTCHA. The bot now appears in the server's member list (offline until you start the process).

If you later need to add a permission (e.g. Manage Threads for a future feature), regenerate this URL and re-authorize — Discord will prompt for the delta, not re-do the whole invite.

## 6. Create the Maintainer role + copy its ID

Triage commands (`/close`, `/label`, `/assign-status`, `/mark-duplicate`) are gated on a Discord role per D-15.

1. In the target Discord server: **Server Settings** (gear icon next to the server name) → **Roles** → **Create Role**.
2. Name the role exactly **Maintainer** (the name does not matter in code — only the ID is checked — but keeping the name consistent aids server admins).
3. Permissions: give it nothing special. The bot gates on role membership, not on Discord permissions granted by the role.
4. Assign the role to yourself and any trusted triagers. (Anyone with this role can close and label GitHub issues via the bot.)
5. **Enable Developer Mode** if you have not already: User Settings → **Advanced** → toggle **Developer Mode** on.
6. Back in **Server Settings → Roles**, right-click the **Maintainer** role → **Copy Role ID**.
7. Paste into `.env` as `DISCORD_MAINTAINER_ROLE_ID=<paste>`.

## 7. Copy your own Discord user ID → `DISCORD_OWNER_ID`

This is a hard-coded triage bypass — even if the Maintainer role is accidentally deleted, the user whose ID matches `DISCORD_OWNER_ID` can always run triage commands.

1. Developer Mode enabled (see step 6).
2. Right-click your own name in any chat (or your entry in the Members list) → **Copy User ID**.
3. Paste into `.env` as `DISCORD_OWNER_ID=<paste>`.

## 8. Copy the reports channel ID → `DISCORD_REPORTS_CHANNEL_ID`

This is the public channel where bug/feature posts land (per D-02 the channel is visible to any server member — no mod-only hidden channel).

1. Create or pick an existing public text channel (e.g. `#bugs-and-features`).
2. Right-click the channel name in the channel list → **Copy Channel ID**.
3. Paste into `.env` as `DISCORD_REPORTS_CHANNEL_ID=<paste>`.

Ensure the bot has access to the channel:

- Under **Channel Settings** → **Permissions**, confirm either `@everyone` or the bot's role grants **View Channel**, **Send Messages**, **Embed Links**, **Add Reactions**, and **Manage Messages**. The simplest configuration: grant these on the channel's default `@everyone` permission set — they suffice for the bot regardless of role.

## Verification

At this point `.env` should have all six `DISCORD_*` values populated. Quick check:

```bash
cd bot
node -e "require('dotenv').config(); ['DISCORD_TOKEN','DISCORD_CLIENT_ID','DISCORD_REPORTS_CHANNEL_ID','DISCORD_MAINTAINER_ROLE_ID','DISCORD_OWNER_ID'].forEach(k => console.log(k, process.env[k] ? 'OK' : 'MISSING'))"
```

All five should print `OK`. `DISCORD_GUILD_ID` is optional (dev only).

Continue with [github-webhook-setup.md](github-webhook-setup.md).
