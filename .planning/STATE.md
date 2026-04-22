# Project State

**Project:** iRacing Screenshot Tool
**Current Milestone:** v2.0 Vue 3 Migration
**Last activity:** 2026-04-22 — v2.0 milestone kicked off. REQUIREMENTS.md defined (18 requirements). ROADMAP.md created with 9 phases (8-16), then **merged to 6 phases (8-13)** on 2026-04-22 after codebase scout revealed Buefy + vue-fontawesome v2 + Vue Router 3 are all Vue-2-only. Shipping Vue 3 core alone would break the app. Merged phases 8+9+10+13 into one Phase 8; renumbered 11→9, 12→10, 14→11, 15→12, 16→13. All 18 REQ-IDs still covered.

## Current Position

Phase: Phase 8 (MERGED) — Vue 3 core + vue-router 4 + vue-loader 17 + @vue/devtools + Buefy→Oruga + Bulma 1.0 + FA CDN cleanup + FA v7 + vue-fontawesome 3.x
Plan: — (CONTEXT captured 2026-04-22; plan-phase next)
Status: CONTEXT.md written at `.planning/phases/08-vue3-core-merged/08-CONTEXT.md`. Ready for `/gsd-plan-phase 8`.
Branch: master

## Project Reference

See [.planning/PROJECT.md](./PROJECT.md) (updated 2026-04-22 — v2.0 Vue 3 Migration started).

**Core value:** Make great-looking race screenshots effortless for sim racers, and gather community signal without friction.
**Current focus:** v2.0 Vue 3 Migration — Vue 3 + Oruga UI framework + Vite bundler + Vitest + `.js` → `.ts` conversion + legacy ESLint plugin cleanup.

## Previous Milestones

- **v1.2 Feature Enhancements** (2026-04-20) — shipped via PR #25. Filename configurator + Discord Bug & Feature Tracker Bot (10 plans, 294 bot tests). See [milestones/v1.2-ROADMAP.md](./milestones/v1.2-ROADMAP.md).
- **v1.3 UI Refresh** (2026-04-21) — shipped on master. Font Awesome v5 → v6 (Phase 3) + Prettier 3 codebase reformat (Phase 4). 2 phases, 5 plans, 14 tasks. See [milestones/v1.3-ROADMAP.md](./milestones/v1.3-ROADMAP.md) / [REQUIREMENTS](./milestones/v1.3-REQUIREMENTS.md) / [AUDIT](./milestones/v1.3-MILESTONE-AUDIT.md).
- **v1.4 Tooling Modernization** (2026-04-22) — shipped on master. Babel renames (Phase 5) + ESLint 9 flat config + full prettier wiring (Phase 6) + TypeScript 5.7 + typescript-eslint 8 + `--legacy-peer-deps` retired (Phase 7). 3 phases, 8 plans, 9 master commits. See [milestones/v1.4-ROADMAP.md](./milestones/v1.4-ROADMAP.md) / [REQUIREMENTS](./milestones/v1.4-REQUIREMENTS.md) / [AUDIT](./milestones/v1.4-MILESTONE-AUDIT.md).

## Deferred Items

Items carried over from v1.3 close on 2026-04-21 (none introduced by v1.4):

| Category | Item | Status |
|----------|------|--------|
| debug | capture-resolution-no-reshade | verifying |
| debug | gallery-delete-not-removing-file | awaiting_human_verify |
| quick_task | 260403-evq-implement-ui-format-configurator-for-pic | missing |
| quick_task | 260410-n97-change-crop-watermark-from-hardcoded-54- | missing |
| quick_task | 260410-v7a-add-prefer-top-left-watermark-crop-toggl | missing |
| quick_task | 260414-r9x-add-file-based-info-debug-logging-system | missing |
| quick_task | 260414-rvd-add-output-format-selector-jpeg-png-webp | missing |

All pre-existing from v1.2 era. Acknowledged at v1.4 close.

## Blockers/Concerns

Pre-existing concerns carrying into next milestone:
- Pre-existing Electron 41 `electron.BrowserWindow.addDevToolsExtension is not a function` error at `src/main/index.js:116` — out of scope for v1.4 (main-process cleanup); tracked for next milestone consideration.
- Pre-existing FA v5.2.0 CDN `@import` at `src/renderer/assets/style/main.scss:153` — deferred to v2.0 Bulma/Buefy work.
- Transitive `prettier@2.8.8` via `vue-loader`/`@vue/compiler-sfc` — resolves naturally with v2.0 Vue 3 migration.

**Resolved in v1.4:**
- ~~`--legacy-peer-deps` load-bearing~~ — retired via Phase 7 LINT-03 (commit `3050be7`)
- ~~`eslint-plugin-prettier` not wired via `plugin:prettier/recommended`~~ — wired via Phase 6 FMT-01 (commit `96fe918`)

## Accumulated Context

Load-bearing patterns/decisions from prior milestones:

- **D-04 two/three/four-commit bisect shape** — proven across v1.3 and v1.4 (6 phases, 6 bisect chains). Each phase lands as a `chore(deps):` commit plus content commit(s) so bisecting between HEAD and `chore(deps)` isolates dep-bump regressions from content changes.
- **Minimum-scope derogation philosophy** — when a latent config conflict surfaces mid-phase, a tightly-scoped minimum fix is acceptable if it unblocks the phase goal. Used in v1.3 Phase 4 (`eslint-config-prettier` wiring), v1.4 Phase 5 D-01 (dropping `babel-runtime` entirely vs renaming), v1.4 Phase 5 Option A (bot/ + dist/ `.eslintignore` narrowing).
- **Research-can-be-wrong-about-plugin-runtime-compat** — v1.4 Phase 6 D-01 Amendment: research claimed `eslint-plugin-vue@6` would load under ESLint 9; reality was a hard `TypeError` from removed `codePath.currentSegments` API. Lesson: empirical smoke-test of plugin execution (not just require()) is mandatory when migrating ESLint major versions. Captured in v1.4-MILESTONE-AUDIT §"Architectural Deviations Captured".
- **Dual-parser coexistence in flat config** — v1.4 Phase 7 established the pattern: `@babel/eslint-parser` as primary for `.js/.vue`, `@typescript-eslint/parser` scoped to `files: ['**/*.ts']` via `tseslint.config()` helper. Helper is MANDATORY — direct spread of `tseslint.configs.recommended` would globally override the parser because the base config lacks `files:`.
- **Flat-config entry order convention (established v1.4):** standalone ignores → FlatCompat extends → native languageOptions → `.vue` override (STRING parser) → tseslint.config scoped to `**/*.ts` → prettierRecommended LAST. Each addition/removal goes between `.vue` override and `prettierRecommended`.
- **`@eslint/compat fixupConfigRules` shim** (v1.4 Phase 6) — active bridge for legacy plugins that use removed ESLint 7 context APIs. Will be retired when `eslint-config-standard`, `eslint-plugin-node`, `eslint-plugin-promise`, `eslint-plugin-standard`, and `eslint-plugin-import` upgrade in v2.0.
- **`.eslintignore` → `ignores:` scope control** — Phase 5/6 established `bot/` + `dist/` exclusion as the v1.4 lint-scope-control mechanism. Carry forward through v2.0 (may expand or contract based on Vue 3 migration needs).
- **No `Co-Authored-By:` footer, no `--no-verify`, explicit `git add <path>`** — enforced across all v1.3 and v1.4 commits. Continue in v2.0.
- **`--legacy-peer-deps` RETIRED** (v1.4 Phase 7) — `npm install` (no flag) is the v2.0 baseline.
