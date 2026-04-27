# 📋 Bug Reports & Feature Requests — Quick Guide

Welcome! This channel is where you tell us what's broken and what you wish the app could do. Every report here becomes a tracked ticket in our GitHub tracker, so nothing gets lost.

You do **not** need a GitHub account. File from Discord, get pinged back from Discord — that's the whole loop.

---

## 🐞 Report a bug

Type `/bug` anywhere in this channel. A form pops up asking for:
- **Title** — one-line description ("Screenshot saves at wrong resolution")
- **Steps to reproduce** — numbered list, as exact as you can
- **What you expected to happen**
- **What actually happened**
- **App version** — find it in Settings → About

Submit, and within a few seconds you'll see the bot post a link to the new GitHub issue.

### Attaching screenshots or logs
After submitting, the bot will DM you privately asking for attachments. **Drop files into this channel within 2 minutes** — screenshots (`.png`, `.jpg`, `.webp`) and log files (`.txt`, `.log`) are all supported. Type `done` to finish early.

Logs live at: `%AppData%\iracing-screenshot-tool\logs\` (Windows) — grab the most recent `.log` when reporting a crash or weird behavior.

---

## ✨ Request a feature

Type `/feature`. The form asks for:
- **Title**
- **Use case** — when would you use this? ("When I'm setting up a replay")
- **Why it matters** — what does it unlock that you can't do today?
- **Nice to have** — optional follow-ons

### 👍 Vote on features you want
React with 👍 on any feature post in this channel. The bot tallies reactions every minute or so and mirrors the count onto the GitHub issue as a `votes:N` label. Top-voted features get built first — this is how the community decides the roadmap.

Use `/top-features` to see the current leaderboard.

---

## 🔍 Find an existing report

Before filing, check if someone already reported it:

- **`/search <keyword>`** — full-text search across all open and closed issues
- **`/list open`** — all currently open reports (paginated)
- **`/list mine`** — just the ones you filed
- **`/status <issue-number>`** — see current state, labels, assignee, and vote count for a specific issue

If you find a duplicate, react with 👍 instead of filing again — that's the real "me too" vote.

---

## 🔔 What happens after you file

- Your report becomes a GitHub issue labeled `bug` or `feature`.
- When a maintainer triages it (marked `triaged`, `in-progress`, `fixed`, `wontfix`, or `needs-repro`), the bot edits the original Discord post and pings you with the update.
- If it gets closed: ✅ fixed · 🔒 won't fix · 🔁 duplicate
- If it gets reopened: 🔄
- You can mute these pings per-user in Discord if you'd rather not get notified.

---

## 📏 Rules of the road

- **3 reports per day** per user — stops spam without being annoying. If you hit the limit, come back tomorrow.
- **Reactions count, duplicate threads don't.** If someone already filed your issue, upvote with 👍 and add context in a reply.
- **Be specific.** "It's broken" isn't actionable; "Screenshot saves at 1920x1080 instead of my configured 3840x2160 in ReShade mode" is.
- **Attach the log** for any crash or silent failure — 90% of bug reports are solved faster when the log is included.

---

## 🛠 Maintainer-only commands

These exist but regular users can't run them — don't worry about them, they're for triage. The maintainer uses `/close`, `/label`, `/assign-status`, and `/mark-duplicate` to manage issues on GitHub. Status changes flow back to you automatically via the bot pings described above.

---

*This bot relays between Discord and GitHub. The source of truth lives at [github.com/svglol/iracing-screenshot-tool/issues](https://github.com/svglol/iracing-screenshot-tool/issues) — you can browse it directly if you prefer, but filing from here is easier.*
