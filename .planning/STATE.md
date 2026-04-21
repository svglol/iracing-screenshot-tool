# Project State

**Project:** iRacing Screenshot Tool
**Current Milestone:** v1.3 UI Refresh
**Last activity:** 2026-04-21 — Phase 3 Plan 01 executed (commit ae2627b); Plan 02 next

## Current Position

Phase: 3 — Font Awesome v5 → v6 Upgrade
Plan: 2 plans (✅ 03-01 deps+main.js [ae2627b], ⏳ 03-02 templates+UAT)
Status: Plan 01 complete — FA v6 core + vue-fontawesome 2.0.10 resolved, main.js on v6 symbols (Variant A prune, 8 icons). Commit 1 of D-04's two-commit split is landed. The 5 renamed template call sites (Settings.vue:8/15, PromoCard.vue:21, Home.vue:54) render BLANK until Plan 02 lands — intentional bisect shape.
Resume file: `.planning/phases/03-font-awesome-v6-upgrade/03-02-PLAN.md`
Branch: master (working directly on master per user decision)

## Project Reference

See [.planning/PROJECT.md](./PROJECT.md) (updated 2026-04-21 for v1.3 milestone kickoff).

**Core value:** Make great-looking race screenshots effortless for sim racers, and gather community signal without friction.
**Current focus:** v1.3 UI Refresh — Font Awesome 7, Bulma 1.0, Prettier 3.

## Recent Upstream Changes (since PR #25 merge)

Dependabot landed via consolidated PRs #26–#43:
- `jimp` 0.10 → 1.6.1 (was in original v1.3 scope — removed)
- `jest` 25 → 30.3.0 (main repo + bot)
- `np` 6 → 11.2.0
- `got` bumped
- `electron` 41.0.0 → 41.2.1

## Previous Milestones

- **v1.2 Feature Enhancements** (2026-04-20) — shipped via PR #25 · Filename configurator + Discord Bug & Feature Tracker Bot (10 plans, 294 bot tests).

## Deferred Items (from v1.2 close)

| Category | Item | Status |
|----------|------|--------|
| debug | capture-resolution-no-reshade | verifying |
| debug | gallery-delete-not-removing-file | awaiting_human_verify |

Debug sessions carried into v1.3 but not blocking.

## Blockers/Concerns

None blocking. Notes from Plan 01 execution:
- Pre-existing `npm install` ERESOLVE between `@typescript-eslint/eslint-plugin@2.34.0` and `eslint@7` — worked around with `--legacy-peer-deps` (same approach dependabot has been using implicitly via lockfile-preserving installs). Unrelated to FA; out of Phase 3 scope.
- Pre-existing Electron main-process error: `electron.BrowserWindow.addDevToolsExtension is not a function` at `src/main/index.js:116` under Electron 41. Vue-devtools-auto-install API was removed in Electron ~36+. Does NOT block the renderer; out of Phase 3 scope.

## Decisions Log (accumulated)

- **Phase 3 / Plan 01 — D-07 PRUNED (Variant A):** faUserCog / faInfoCircle / faCamera removed from library.add after three-grep audit confirmed zero .vue template usage, zero dynamic :icon= constructions, and zero icon-pack="fa" overrides on Buefy icon-left. library.add went from 11 → 8 icons.
- **Phase 3 / Plan 01 — Baseline path correction:** webpack writes the renderer chunk directly as `dist/renderer.js` (not `dist/renderer/*.js` as the plan assumed). 03-01-BASELINE.md records 1,450,730 bytes for `dist/renderer.js` and documents the path correction for Plan 02's SC4 comparison to match.
- **Phase 3 / Plan 01 — vue-fontawesome pinned at ^2.0.10:** Confirmed resolving to `2.0.10` (NOT 3.x). Pitfall 1 avoided.
