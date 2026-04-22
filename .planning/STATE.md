# Project State

**Project:** iRacing Screenshot Tool
**Current Milestone:** v2.0 Vue 3 Migration
**Last activity:** 2026-04-22 — Phase 8 Plan 03 landed. Two-commit bisect pair (`0f2b981` chore(deps) + `fb6936f` refactor(renderer)) swaps Buefy+bulma-pro+bulma@0.9 for Oruga-0.13 + theme-bulma-0.9 + bulma@1.0.4; main.js registers Oruga per-component; main.scss rewritten to Bulma 1.0 @use pattern with theme-bulma entry + `$theme-bulma-custom-colors` twitter variant + `--bulma-primary` CSS custom-property override. Build intentionally broken at SFC level (b-* tags still present) until Plan 04 migrates SFCs. LINT-03 temporarily regressed (`--legacy-peer-deps` used due to FA v2 vue~2 peer — re-achievable at Plan 05).

## Current Position

Phase: Phase 8 (MERGED) — Vue 3 core + vue-router 4 + vue-loader 17 + @vue/devtools + Buefy→Oruga + Bulma 1.0 + FA CDN cleanup + FA v7 + vue-fontawesome 3.x
Plan: 03/06 complete. Next: 08-PLAN-04-buefy-to-oruga-sfc-migration.md (8 SFC migrations + 4-view UAT checkpoint)
Status: Plans 01, 02, 03 complete with SUMMARYs. Build by design broken until Plan 04 retires b-* SFC tags.
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
- **`--legacy-peer-deps` RE-REGRESSED TEMPORARILY** (v2.0 Phase 8 Plan 03) — removing Buefy exposed `@fortawesome/vue-fontawesome@2.0.10`'s `vue: ~2` peer as the lone vue@~2 constraint in the tree. Plan 01 previously masked this via buefy's matching peer. Flag is in use until Plan 05 retires FA v2 for FA v3.x + vue-fontawesome 3.x. LINT-03 re-achievement gate moved to end of Plan 05.
- **theme-bulma SCSS entry path quirk** (v2.0 Phase 8 Plan 03) — `@oruga-ui/theme-bulma`'s package.json `exports` map `"./scss/*.scss": "./dist/scss/*.scss"` doesn't resolve under `npx sass --load-path=node_modules` (the CLI doesn't traverse pkg exports without a registered importer). Use explicit `@use '@oruga-ui/theme-bulma/dist/scss/theme-build'` path — works in both sass CLI and webpack sass-loader.
- **Bulma 1.0 color customization via CSS custom properties** (v2.0 Phase 8 Plan 03) — theme-build.scss consumes Bulma's `with()` slot internally, so `$primary` can't be overridden via our own @use of theme-build. The Bulma 1.0 pattern is `:root { --bulma-primary: ...; --bulma-primary-h/s/l: ...; }` for runtime color theming. `$theme-bulma-custom-colors` (not `$custom-colors`) is the correct `with()`-configurable variable for extension variants like twitter.
