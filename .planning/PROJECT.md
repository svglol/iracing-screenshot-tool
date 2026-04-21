# iRacing Screenshot Tool

**Description:** Electron + Vue 2 desktop app for taking high-resolution screenshots of iRacing, with a separate Discord bot for community bug reports and feature requests mirrored to GitHub Issues.
**Stack:** Electron 41 + Vue 2.7 + Buefy (desktop) · Node 24 + discord.js 14 + Fastify 5 + Octokit + better-sqlite3 (bot)
**Repository:** svglol/iracing-screenshot-tool

## What This Is

A two-part project:
- **Desktop app (`src/`)** — Electron 41 / Vue 2.7 / Buefy UI for capturing iRacing screenshots with configurable resolution, filename format, output format (JPEG/PNG/WebP), watermark cropping, and session-field tokens resolved from iRacing telemetry via `irsdk-node`.
- **Discord bot (`bot/`)** — Separate always-on Node 24 service that relays community bug/feature reports between a public Discord channel and GitHub Issues (source of truth), with reaction-based upvoting, Maintainer-role triage commands, attachment re-hosting to an orphan branch, and reporter pings on status changes via HMAC-verified GitHub webhook over Cloudflare Tunnel.

## Core Value

**Make great-looking race screenshots effortless for sim racers**, and **gather community signal without friction** — reporters file bugs and vote on features from Discord without needing a GitHub account.

## Current State

- **v1.2 shipped** (2026-04-20) — PR #25 merged upstream. Phase 1 (filename format configurator) and Phase 2 (Discord bug & feature tracker bot) complete.
- **Dependabot (upstream, since PR #25 merge):** `jimp` 0.10 → 1.6.1, `jest` 25 → 30.3.0 (main + bot), `np` 6 → 11.2.0, `got` bumped. These shipped via PRs #26–#43 consolidations.

## Current Milestone: v1.3 UI Refresh

**Goal:** Ship user-visible UI polish via isolated, low-risk dependency upgrades — independent of the Vue 2/3 migration track.

**Target upgrades:**
- Font Awesome 5.13 / core 1.2 → 7.x (icons packages; keep `vue-fontawesome` at 0.1.x since 3.x requires Vue 3)
- Bulma 0.9.4 → 1.0.2 (native CSS variables + dark-mode capability)
- Prettier 2.0.2 → 3.3 (codebase-wide reformat in a single commit)

**Key context:**
- All three upgrades are isolated from Vue 2 and from each other
- `bulma-pro` 0.1.8 must be verified against Bulma 1.0 or dropped with a documented replacement decision
- Jimp 1.6 upgrade that was in the original v1.3 plan is **already done upstream** (dependabot) — removed from scope
- Derived from dependency analysis captured in `.planning/notes/dependency-analysis-2026-04.md` and `.planning/seeds/v1.3-ui-refresh.md`

## Requirements

### Active

- [ ] Font Awesome upgraded from v5 to v7 across icon packages (UI-01 — v1.3)
- [ ] Bulma upgraded from 0.9.4 to 1.0.2 with bulma-pro compatibility resolved (UI-02 — v1.3)
- [ ] Codebase formatted with Prettier 3 conventions (TOOL-01 — v1.3)

### Validated
- ✓ User-configurable screenshot filename format with session-field tokens — v1.2
- ✓ Output format selector (JPEG / PNG / WebP) — v1.2
- ✓ Relative watermark crop (3% of dimensions instead of hardcoded px) — v1.2
- ✓ File-based INFO/DEBUG logging across capture pipeline — v1.2
- ✓ Discord bot for community bug reports & feature requests mirrored to GitHub Issues — v1.2
- ✓ Reaction-based feature upvoting with debounced `votes:N` label mirror — v1.2
- ✓ Maintainer-gated triage commands (/close, /label, /assign-status, /mark-duplicate) — v1.2
- ✓ Reporter pings on GitHub state change via HMAC-verified webhook — v1.2

### Out of Scope
- In-app "Report a bug" button from the Electron app itself — privacy + scope implications, defer to future milestone
- Auto-duplicate detection via embeddings — over-engineered for current queue size
- Automatic crash/telemetry reporting — privacy scope to be defined first
- Release announcements on Discord via electron-updater — nice-to-have, not tracker-related
- Mac/Linux build of the Electron app — iRacing is Windows-only
- `@fortawesome/vue-fontawesome` 0.1 → 3 — requires Vue 3, deferred to v2.0
- Vue 2 → Vue 3 migration — scope too large; dedicated v2.0 milestone
- TypeScript 3 → 5, ESLint 7 → 9 — deferred to v1.4 tooling modernization
- Jest 25 → 30, Jimp 0.10 → 1.6 — already handled by upstream dependabot

## Constraints

- **Windows-only Electron target** (iRacing requirement) — bot code is cross-platform but desktop app is Win-only
- **Node 24+ for bot** — pinned via `.nvmrc`, uses native ESM and modern features
- **Fine-grained GitHub PAT** — scoped to this one repo; manual rotation documented in `bot/README.md`

## Context

**Codebase:**
- Electron app: `src/main/` (Node-side), `src/renderer/` (Vue 2 UI), `src/utilities/` (shared, TS-checked)
- Bot: `bot/src/` ESM modules, `bot/docs/` deployment guides, own `package.json`
- `/bot/` excluded from electron-builder packaging (`!bot/**/*` in `build.files`) and from root Jest (`/bot/` in `testPathIgnorePatterns`)

**Tech decisions recorded in v1.2:** 80+ architectural/implementation decisions from Phase 2 captured in the shipped PR #25.

## Key Decisions

| Decision | Milestone | Outcome |
|----------|-----------|---------|
| Split/join for filename token replacement (not regex) | v1.2 | ✓ Good — simpler, no escaping surprises |
| `/bot/` as a separate top-level dir with own `package.json` | v1.2 | ✓ Good — clean isolation from Electron build |
| GitHub Issues as single source of truth (not custom DB) | v1.2 | ✓ Good — leveraged existing infra, no external service |
| Orphan branch `bug-attachments` for Discord CDN re-hosting | v1.2 | ✓ Good — main branch stays clean, raw.githubusercontent.com URLs survive |
| Fine-grained PAT over GitHub App | v1.2 | ✓ Good for single-maintainer scale; ⚠️ Revisit if multi-maintainer |
| Cloudflare Tunnel over port-forward | v1.2 | ✓ Good — Windows-native, no TLS cert management |
| Reaction debounce via setTimeout Map + deterministic test hook | v1.2 | ✓ Good — avoided Jest 25 fake-timer fragility |
| HMAC verification with `timingSafeEqual` + length guard | v1.2 | ✓ Good — guards the length-mismatch throw footgun |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-04-21 — milestone v1.3 (UI Refresh) started on master after upstream dependabot sync.*
