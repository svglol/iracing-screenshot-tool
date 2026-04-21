# iRacing Screenshot Tool - Roadmap

## Milestone 1.2: Feature Enhancements

### Phase 1: Filename Format Configurator
- **Goal:** Allow users to customize screenshot filenames using session data fields
- **Status:** Complete (2026-04-03) — delivered via quick task [260403-evq](./quick/260403-evq-implement-ui-format-configurator-for-pic/) (7/7 verified)

### Phase 2: Discord Bug & Feature Tracker Bot
- **Goal:** Implement a Discord bot that relays bug reports and feature requests between a public Discord channel and GitHub Issues (source of truth), with reaction-based upvoting, Maintainer-role triage commands, attachment re-hosting to an orphan branch, and reporter pings on status changes via an HMAC-verified GitHub webhook exposed through Cloudflare Tunnel.
- **Depends on:** None
- **Status:** Complete (2026-04-20) — code 18/19 verified, deployment walkthrough tracked in 02-HUMAN-UAT.md
- **Plans:** 10 plans

Plans:
- [x] 02-01-PLAN.md — Repo scaffolding: /bot/ skeleton, pinned Node 24 deps, .env.example, electron-builder exclusion (2026-04-20, 12 min)
- [x] 02-02-PLAN.md — Foundation utilities: config loader (fail-fast), structured JSON logger, uniform error payload (2026-04-20, 7 min)
- [x] 02-03-PLAN.md — Storage + guards: SQLite schema/migrations, mappings + rate_limits + reaction_snapshots + webhook_deliveries tables, permission gate, rate-limit facade (2026-04-20, 5 min)
- [x] 02-04-PLAN.md — GitHub client + issues CRUD + label taxonomy seeder (2026-04-20, 4 min)
- [x] 02-05-PLAN.md — Attachment re-hosting to orphan branch `bug-attachments` + issue body rendering with mention neutralization (2026-04-20, 4 min)
- [x] 02-06-PLAN.md — Discord client bootstrap + /bug + /feature modal intake with attachment collector (2026-04-20, 10 min)
- [x] 02-07-PLAN.md — Query commands: /status /list /top-features /search + shared formatters (2026-04-20, 4 min)
- [x] 02-08-PLAN.md — Triage commands (Maintainer-gated): /close /label /assign-status /mark-duplicate (2026-04-20, 5 min)
- [x] 02-09-PLAN.md — Reactions → votes:N label debounced aggregator + Fastify HMAC webhook server + state-change handlers (edit + reporter ping) (2026-04-20, 8 min)
- [x] 02-10-PLAN.md — Documentation: README, Discord app setup, GitHub webhook setup, Cloudflare Tunnel, NSSM (Windows) and systemd (Linux) deployment (2026-04-20, 8 min — docs written; deployment walkthrough tracked in 02-HUMAN-UAT.md)
