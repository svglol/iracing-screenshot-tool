# Project State

**Project:** iRacing Screenshot Tool
**Current Milestone:** v2.0 Vue 3 Migration
**Last activity:** 2026-04-22 — Phase 8 Plan 05 landed. Two-commit bisect pair (`338123c` FA deps bump + `8bda4b2` FA registration + three-grep audit) bumps `@fortawesome/fontawesome-svg-core` + `free-solid-svg-icons` + `free-brands-svg-icons` to ^7.2.0 and `@fortawesome/vue-fontawesome` to ^3.2.0 (Vue 3 native bridge), updates main.js FA registration from PascalCase `'FontAwesomeIcon'` to kebab-case `'font-awesome-icon'` per plan verification spec. Three-grep icon audit per v1.3 Phase 3 D-07 pattern (template usage + dynamic reference + Oruga iconpack) confirmed all 8 registered icons (faGear, faUpRightFromSquare, faFolder, faTrash, faCopy, faCircleQuestion, faArrowDown, faDiscord) have ≥1 template usage site; none pruned. A8 outcome: CLEAN — all 8 icons still exported by FA v7.2.0 type definitions (verified against `node_modules/@fortawesome/free-{solid,brands}-svg-icons/index.d.ts`); zero v6→v7 renames on our surface. REQ UI-04 (CDN removed — 0 `use.fontawesome.com` matches in src/) and REQ UI-05 (FA v7 + vue-fontawesome 3 operational) both closed. **`--legacy-peer-deps` retired** — Plan 03's Rule 3 bridge resolved at this plan's completion; `npm install` without flag exits clean with zero ERESOLVE (LINT-03 re-achieved). `npm run pack:renderer` exits 0 (bundle size `dist/renderer.js` = 2,340,447 bytes, +0.82% vs Plan 04 baseline — within ±10% gate). `npm test` 256/256.

## Current Position

Phase: Phase 8 (MERGED) — Vue 3 core + vue-router 4 + vue-loader 17 + @vue/devtools + Buefy→Oruga + Bulma 1.0 + FA CDN cleanup + FA v7 + vue-fontawesome 3.x
Plan: 05/06 complete. Next: 08-PLAN-06-third-party-plugins-and-final-uat.md (vue-shortkey/vue-markdown-plus/v-click-outside retirement + vue3-* replacements + vue-lazyload/vue-simple-context-menu bumps + Vuex store deletion + final UAT)
Status: Plans 01, 02, 03, 04, 05 complete with SUMMARYs. Build green on Vue 3 + Oruga + Bulma 1.0 + FA v7 + vue-fontawesome 3.x stack. `--legacy-peer-deps` RETIRED — `npm install` without flag exits clean; LINT-03 gate re-achieved.
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
- **`--legacy-peer-deps` RETIRED (AGAIN)** (v2.0 Phase 8 Plan 05) — Plan 05 bumped `@fortawesome/vue-fontawesome` from 2.0.10 (vue:~2 peer) to 3.2.0 (vue:>=3.0.0 peer). The lone vue@~2 constraint is gone from the tree. `npm install` (no flag) exits clean with zero ERESOLVE. LINT-03 re-achievement gate from Plan 03 is met at end of Plan 05. STATE's earlier temporary regression banner resolved.
- **A8 outcome CLEAN — zero FA v6 → v7 icon renames on our surface** (v2.0 Phase 8 Plan 05) — Research assumption A8 (FA v7 rename-table excerpt may be incomplete; three-grep audit canonical) verified empirically. All 8 registered icons (faGear, faUpRightFromSquare, faFolder, faTrash, faCopy, faCircleQuestion, faArrowDown, faDiscord) remain exported from FA v7.2.0 type definitions — zero import renames + zero template usage site edits needed. Three-grep methodology (template + dynamic + iconpack) per v1.3 Phase 3 D-07 preserved.
- **theme-bulma SCSS entry path quirk** (v2.0 Phase 8 Plan 03) — `@oruga-ui/theme-bulma`'s package.json `exports` map `"./scss/*.scss": "./dist/scss/*.scss"` doesn't resolve under `npx sass --load-path=node_modules` (the CLI doesn't traverse pkg exports without a registered importer). Use explicit `@use '@oruga-ui/theme-bulma/dist/scss/theme-build'` path — works in both sass CLI and webpack sass-loader.
- **Bulma 1.0 color customization via CSS custom properties** (v2.0 Phase 8 Plan 03) — theme-build.scss consumes Bulma's `with()` slot internally, so `$primary` can't be overridden via our own @use of theme-build. The Bulma 1.0 pattern is `:root { --bulma-primary: ...; --bulma-primary-h/s/l: ...; }` for runtime color theming. `$theme-bulma-custom-colors` (not `$custom-colors`) is the correct `with()`-configurable variable for extension variants like twitter.
- **webpack sass-loader needs explicit `sassOptions.loadPaths` for package-qualified @use** (v2.0 Phase 8 Plan 04) — sass-loader v16 with Dart Sass modern API does NOT traverse node_modules or package-export maps for bare `@use 'pkg/path'` targets. Either use the `~` prefix (css-loader's webpack resolver) or set `sassOptions.loadPaths: [node_modules]` on the sass-loader options. Plan 03 tested SCSS via `npx sass --load-path=node_modules` CLI; webpack's lack of the equivalent default caused pack:renderer to fail until the loadPaths option was added. Carry forward: any future sass-package @use targets will resolve cleanly.
- **Oruga `$oruga` IS globally injected** (v2.0 Phase 8 Plan 04 A2 verification) — `createOruga()` + `app.use(oruga, config)` sets `app.config.globalProperties.$oruga` (plus a Symbol-keyed `provide()`). Options-API components can use `this.$oruga.notification.open({variant: 'X'})` without `useProgrammatic()` composable. Oruga 0.13.4 confirmed via `grep "globalProperties.\\\$oruga" node_modules/@oruga-ui/oruga-next/dist/index.js`.
- **Oruga carousel uses singular `indicator` slot for per-item override** (v2.0 Phase 8 Plan 04 A3 verification) — Oruga's `<o-carousel>` exposes BOTH `indicators` (plural — overrides entire bar, props `{activeIndex, switchTo}`) and `indicator` (singular — fires per item, prop `{index}`). Buefy's old `slot="indicators"` with `slot-scope="props"` and `props.i` matches Oruga's SINGULAR slot semantics, not the plural. When migrating `<b-carousel>` per-item thumbnail overrides, use `<template #indicator="props">` and reference `props.index` (not `props.i`).
