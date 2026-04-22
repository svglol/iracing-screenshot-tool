# Project State

**Project:** iRacing Screenshot Tool
**Current Milestone:** v2.0 Vue 3 Migration
**Last activity:** 2026-04-22 — **Phase 8 Plan 06 landed; Phase 8 IMPLEMENTATION-COMPLETE.** Single commit `868688a` (chore(deps): swap Vue 2 plugins for Vue 3 equivalents + delete dead Vuex store) retires the three Vue-2-only plugins (vue-shortkey@3, v-click-outside@3 DELETED entirely per A3 UNUSED outcome, vue-markdown-plus@2) and installs Vue-3-native replacements (vue3-shortkey@4.0.0, vue3-markdown-it@1.0.10), bumps vue-lazyload to 3.0.0 and vue-simple-context-menu to 4.1.0 for Vue 3 peer-deps, deletes the dead Vuex store at src/renderer/store/ (per CONTEXT Claude's Discretion — 0 import sites grep-verified), rewrites main.js plugin registrations to Vue-3-native ES-import form (`import VueShortkey from 'vue3-shortkey'; app.use(VueShortkey)` replaces `app.use(require('vue-shortkey'))` CommonJS), replaces `<vue-markdown-plus>` with `<vue3-markdown-it>` tag in ChangelogModal.vue. **REQ success criterion #6 HARD GATE auto-approved under --auto mode** — build output scan returns zero Vue 2→3 migration warnings; 7 orphan-sweep greps (Vue.*, v-click-*, .sync, $buefy/$set/$delete, FA CDN, @import ~bulma/~buefy, b-*) all return 0. All 8 REQ-IDs (VUE3-01..04, UI-02..05) close PASS. `npm run pack:renderer` exits 0 (12 warnings — all pre-existing Bulma SCSS `if()` deprecations; down from 13 with vue-simple-context-menu Vue 2 default-export warning retired). `npm test` 256/256. `npm run lint` 734 problems (≤ 1881 band). `npm audit --audit-level=high` shows 9 vulnerabilities total (6 low, 2 moderate, 1 high) — REDUCED from Plan 05's 12 (1 HIGH is pre-existing devDep chain `@vue/devtools-electron` → electron; zero NEW findings from Plan 06 swap). Bundle-size delta FLAGGED not blocked: `dist/renderer.js` = 2,741,682 B = +85.6% vs v1.4 baseline (1,477,180 B); Plan 05→06 incremental +17.1% (markdown-it parser is primary contributor; Phase 9 ticket candidate for optional optimization via marked/micromark if user accepts). Plan 01 already registered +34.2% vs v1.4 — ±10% vs v1.4 was never achievable for Phase 8's UI-framework-replacement scope. **Phase 8 ships; ready for /gsd-transition to Phase 9 (webpack → Vite).**

## Current Position

Phase: Phase 8 (MERGED) — **IMPLEMENTATION-COMPLETE** (all 6 plans shipped; all 8 REQ-IDs PASS; REQ criterion #6 HARD GATE auto-approved)
Plan: 06/06 complete. Next: `/gsd-transition` to Phase 9 (webpack → Vite bundler swap).
Status: Plans 01-06 complete with SUMMARYs. Build green on Vue 3 + Oruga + Bulma 1.0 + FA v7 + vue-fontawesome 3.x + vue3-shortkey + vue3-markdown-it + vue-lazyload@3 + vue-simple-context-menu@4 stack. Zero Vue-2-only plugins remain in the renderer (dead Vuex store also deleted). 10-content-commit D-08-18 bisect chain on master.
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
- **A3 UNUSED outcome — v-click-outside deleted entirely** (v2.0 Phase 8 Plan 06) — Empirical 3-step verification (template grep + JS method grep + `npm ls` transitive scan) confirmed `v-click-outside@3` had zero template directive sites in `src/renderer/**/*.vue`. Its only tree presence was the main.js `import vClickOutside from 'v-click-outside'` + `app.use(vClickOutside)` lines (now gone) plus a transitive `v-click-outside@2.1.5` pulled through `vue-simple-context-menu@3` (goes away with the v4 bump). Package DELETED from package.json (no vue3-click-away replacement needed). Pattern: empirical 3-step verify is canonical for third-party plugin removal — research-assumed "likely unused" must be verified, not inferred.
- **ES-import plugin registration form is canonical for Vue 3** (v2.0 Phase 8 Plan 06) — `app.use(require('vue-shortkey'))` CommonJS form retired in favor of `import VueShortkey from 'vue3-shortkey'; app.use(VueShortkey)`. Cleaner for tree-shaking + type-checking + lint. All Vue 3 plugins in main.js now use the ES-import form. `require()` in main.js restricted to Electron IPC interop (`const { ipcRenderer } = require('electron')` which is intentional — Electron's preload/renderer boundary).
- **Phase 8 bundle-size baseline for Phase 9 tracking** (v2.0 Phase 8 Plan 06 close) — `dist/renderer.js` = 2,741,682 bytes, `dist/renderer.css` = 918,207 bytes. Vs v1.4 baseline (1,477,180 B) = +85.6% renderer.js. Primary contributors: (1) Vue 3 + vue-router 4 core ~500 KB, (2) Oruga 0.13 + Bulma 1.0 themes ~400 KB, (3) FA v7 packages ~300 KB, (4) markdown-it parser (via vue3-markdown-it) ~400 KB. Phase 9 (Vite) should compare against this 2.74 MB baseline. Phase 9 ±20% installer-size gate is separate (measured at milestone close).
- **10-content-commit D-08-18 bisect chain intact** (v2.0 Phase 8 shipped) — SHAs in order: `97bc6e8` (deps bump) → `4564ac3` (main.js+router) → `e731588` (SFC idioms) → `0f2b981` (Oruga+Bulma deps) → `fb6936f` (SCSS rewrite) → `4d46469` (small SFCs) → `7a8a25d` (large SFCs) → `338123c` (FA v7 deps) → `8bda4b2` (FA registration) → `868688a` (plugin swap + Vuex cleanup). `git bisect start HEAD <any-pre-phase-8-SHA>` isolates each breaking change to a single commit. D-08-18 originally sketched 9 content commits; reality landed 10 because Plan 04 split SFC migration into small + large waves for bisect granularity.
