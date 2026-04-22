# Project State

**Project:** iRacing Screenshot Tool
**Current Milestone:** v1.4 Tooling Modernization
**Last activity:** 2026-04-22 — Phase 6 plan 06-02 shipped: `refactor(eslint): migrate to flat config with full prettier wiring` commit `96fe918` (D-01 Amendment: eslint-plugin-vue 6 → 9; @eslint/compat added)

## Current Position

Phase: Phase 6: ESLint 9 Flat Config + Prettier Full Wiring — **COMPLETE** (pending /gsd-verify-work gate)
Plan: 2/2 complete — plan 06-02 (flat-config migration + plugin:prettier/recommended wiring + D-01 Amendment eslint-plugin-vue 6→9 + @eslint/compat shim) shipped 2026-04-22
Status: Ready for Phase 6 verification gate; Phase 7 (plugin upgrades) deferred per D-01 intent
Branch: master

Milestone kicked off via `/gsd-new-milestone` on 2026-04-21 after v1.3 UI Refresh shipped. REQUIREMENTS.md defined (9 active reqs across TS/LINT/FMT/BABEL categories). Roadmap completed 2026-04-21 — three phases (5, 6, 7) with full coverage of all 9 v1.4 requirements. Phase 5 planning completed 2026-04-22: research pinned `@babel/eslint-parser@^7.28.6`, verified Vue SFC delegation chain by source-reading, established lint-delta ±0–10 surface; plans shipped as D-09 two-commit shape **extended to a four-commit chain** (`chore(deps): rename babel packages` + two pre-condition `chore(lint):` scope-control commits + `refactor(eslint): wire @babel/eslint-parser via parserOptions.parser`) when post-swap validation surfaced bot/ out-of-scope glob miscount (user-selected Option A) and dist/ generated-output lint noise (Rule 2 auto-fix).

## Project Reference

See [.planning/PROJECT.md](./PROJECT.md) (updated 2026-04-21 — v1.4 milestone started).

**Core value:** Make great-looking race screenshots effortless for sim racers, and gather community signal without friction.
**Current focus:** v1.4 Tooling Modernization — TypeScript 5, ESLint 9 flat config, retire deprecated Babel packages, resolve v1.3 carryover tech debt.

## Previous Milestones

- **v1.2 Feature Enhancements** (2026-04-20) — shipped via PR #25. Filename configurator + Discord Bug & Feature Tracker Bot (10 plans, 294 bot tests). See [milestones/v1.2-ROADMAP.md](./milestones/v1.2-ROADMAP.md).
- **v1.3 UI Refresh** (2026-04-21) — shipped on master. Font Awesome v5 → v6 (Phase 3) + Prettier 3 codebase reformat (Phase 4). 2 phases, 5 plans, 14 tasks. See [milestones/v1.3-ROADMAP.md](./milestones/v1.3-ROADMAP.md) / [REQUIREMENTS](./milestones/v1.3-REQUIREMENTS.md) / [AUDIT](./milestones/v1.3-MILESTONE-AUDIT.md).

## Deferred Items

Items carried over from v1.3 close on 2026-04-21:

| Category | Item | Status |
|----------|------|--------|
| debug | capture-resolution-no-reshade | verifying |
| debug | gallery-delete-not-removing-file | awaiting_human_verify |
| quick_task | 260403-evq-implement-ui-format-configurator-for-pic | missing |
| quick_task | 260410-n97-change-crop-watermark-from-hardcoded-54- | missing |
| quick_task | 260410-v7a-add-prefer-top-left-watermark-crop-toggl | missing |
| quick_task | 260414-r9x-add-file-based-info-debug-logging-system | missing |
| quick_task | 260414-rvd-add-output-format-selector-jpeg-png-webp | missing |

All pre-existing from v1.2 era. None blocking v1.4.

## Blockers/Concerns

Entering v1.4 with this technical debt (all targets of the milestone):
- `--legacy-peer-deps` on npm install is load-bearing for two peer conflicts (typescript-eslint@2 vs eslint@7 AND eslint-plugin-prettier@5 peer eslint>=8). **Resolves with v1.4 ESLint 9 + typescript-eslint 8 migration — verified by LINT-03 in Phase 7.**
- `eslint-plugin-prettier` installed but not wired via `plugin:prettier/recommended` — only `eslint-config-prettier` is wired (v1.3 Phase 4 Pitfall 4 minimum-scope derogation). **Full rule integration in v1.4 Phase 6 (FMT-01).**
- Pre-existing Electron 41 `electron.BrowserWindow.addDevToolsExtension is not a function` error at `src/main/index.js:116` — out of scope for v1.4 (main-process cleanup, not tooling).
- Pre-existing FA v5.2.0 CDN `@import` at `src/renderer/assets/style/main.scss:153` — deferred to v2.0 Bulma/Buefy work.
- Transitive `prettier@2.8.8` via `vue-loader`/`@vue/compiler-sfc` — resolves naturally with v2.0 Vue 3 migration.

## Accumulated Context

Load-bearing patterns/decisions from prior milestones that stay in force for v1.4:

- **D-04 / D-07 two/three-commit bisect shape** — proven pattern on master (v1.3 Phase 3 two-commit pair + Phase 4 three-commit chain with neutral pre-condition). Reuse for all three v1.4 phases: each phase should land as a `chore(deps):` commit plus content commit(s) so bisecting between HEAD and `chore(deps)` isolates dep-bump regressions from content changes.
- **Orchestrator-as-fallback-finalizer** — when a checkpoint-gated executor stalls after `SendMessage` resume, the orchestrator can finalize with full data provenance using the plan's locked commit template. Pattern used twice in v1.3.
- **Path-correction note in baseline artifacts** — when a plan's path assumption diverges from actual output, preserve the plan's verify-grep label verbatim but document the actual path so downstream waves measure the same file.
- **Minimum-scope derogation philosophy** — when a latent config conflict surfaces mid-phase, a tightly-scoped minimum fix is acceptable if it unblocks the phase goal; the full integration stays scheduled. (Used for `eslint-config-prettier` wiring in v1.3 Phase 4; v1.4 Phase 6 FMT-01 now picks up the full `plugin:prettier/recommended` integration.)
- **v1.3 lint baseline: 1881** — FMT-01 / LINT-02 parity checks measure against this number; drift beyond the baseline without justification is a regression signal.
- **Phase 5 pre-swap lint baseline: 1881 (errors 1878, warnings 3)** — captured 2026-04-22T07:36:23Z at pre-swap HEAD `5fd3c8d` into `.planning/phases/05-babel-package-renames/05-01-BASELINE.md` via `npx eslint --ext .js,.ts,.vue ./ --no-fix` (NOT `npm run lint` — would apply `--fix`). Dominant rule: `no-undef` (1818, Jest globals in `.test.js` files). This is the D-08 denominator for plan 05-02's post-swap delta assertion (`post_count ≤ 1881`).
- **Phase 5 plan 05-01 landed** — commit `eef6a7a` (chore(deps): rename babel packages). 3 staged paths (package.json, package-lock.json, 05-01-BASELINE.md). 84-line lockfile churn, all Babel-adjacent (Pitfall 8 threshold ~100 — passed clean). @babel/eslint-parser@7.28.6 installed; babel-runtime + babel-eslint + transitive core-js@2.6.11 + regenerator-runtime@0.11.1 retired. `npm test` 256/256. No Co-Authored-By, no --no-verify. Bot/docs/community-guide.md stayed untracked; pre-existing src/*.vue EOL/content modifications stayed unstaged.
- **Phase 5 plan 05-02 landed (Option A derogation)** — commits `e52bbf9` + `656aa8a` + `74e112f` (2026-04-22). `.eslintignore` created with `bot/` + `dist/` patterns to narrow v1.4 lint scope to `src + _scripts` after the parser swap surfaced bot/ out-of-scope files under `@babel/eslint-parser`'s `requireConfigFile: true` default (bot/babel.config.cjs blocks config walk-up to root .babelrc per D-05). **New D-08 band denominator: 712 (src+_scripts-only pre-swap, espree parser)** per `05-01-BASELINE.md` Addendum. Post-swap: 722 (+10, parser-attributable per Pitfall 5 — no-unused-vars +9, no-void +3, no-useless-escape +2, minus 4 resolved espree parse errors). Legacy 1881 `./`-glob count preserved as historical record. **`.eslintignore` is now the v1.4 lint-scope-control mechanism** — bot/ excluded per `PROJECT.md §Out-of-Scope`; dist/ excluded per generated-output hygiene (already `.gitignore` line 19). Carry-forward pattern for Phase 6 LINT-02 flat-config migration: `ignores` array inherits these patterns.
- **Phase 6 plan 06-01 landed** — commit `15b7042` (chore(deps): eslint 9 + eslint-config-prettier 10). 3 staged paths (package.json, package-lock.json, 06-01-BASELINE.md). Lockfile churn 1028 lines, all ESLint-adjacent (ESLint 7→9 internal dep graph reshuffle — @humanfs/*, keyv, json-buffer, type-check added; eslint-utils@2, regexpp@3, legacy @humanwhocodes packages retired). eslint@9.39.4, eslint-config-prettier@10.1.8, @eslint/eslintrc@3.3.5, globals@15.15.0 all installed. `npm test` 256/256. No Co-Authored-By, no --no-verify. **Pre-migration baseline: 722** (src+_scripts scope, @babel/eslint-parser, legacy rc — matches Phase 5 post-swap count exactly; D-10 parity-band denominator for plan 06-02). **Broken-window state:** `npm run lint` exits code 2 (no eslint.config.js) — documented transient per T-06-01-05; no hook dependency. **--ext flag removed** from scripts.lint per Pitfall 1. D-15 Option 1 held: --legacy-peer-deps persists.
- **Phase 6 plan 06-02 landed** — commit `96fe918` (refactor(eslint): migrate to flat config with full prettier wiring). **5 staged paths** (eslint.config.js A, .eslintrc.js D, .eslintignore D, package.json M, package-lock.json M) per D-01 Amendment (was 3 in original plan). **D-01 Amendment (user-approved Option A):** eslint-plugin-vue bumped ^6.2.2 → ^9.33.0 because v6 crashed under ESLint 9 via removed `codePath.currentSegments` API (vue/require-render-return et al). Research Pitfall 7 missed this — v6 entry point had no version assertion but v6 rule code used ESLint 7 internal APIs removed in 9. **@eslint/compat@^2.0.5 added** as Rule-2 auto-fix: `fixupConfigRules` wraps FlatCompat.extends() output so remaining legacy plugins (eslint-plugin-node@11, eslint-plugin-promise@4, @typescript-eslint@2 via eslint-config-standard) get ESLint-7-API shims (context.getScope, context.getAncestors, context.getDeclaredVariables, context.markVariableAsUsed, context.parserServices → sourceCode.* equivalents). **Post-migration lint count: 735** (+13 vs 722 baseline — +6 new v9 Vue rules [vue/multi-word-component-names, vue/component-definition-name-casing], +7 no-unused-vars from scope-analysis rules now working via @eslint/compat shims). SC2 (≤1881) PASS. **prettier/prettier firings: 0** (D-10 ≤20 internal goal PASS; after self-induced drift on new eslint.config.js fixed via `prettier --write eslint.config.js` pre-commit). **SC4** (`npm run prettier -- --check` exit 0) PASS. **SC5** (`npm test` 256/256) PASS. Build gates (pack:renderer + pack:main) compile clean. Pitfall 6 canary PASS: all 4 Vue SFC views lint with zero `<template>` parse errors. **Dotfile-dir ignore expansion** (Rule-2 auto-add): `.planning/**`, `.tools/**`, `.tmp-inspect/**` added to ignores[] to preserve ESLint 7 default-ignore scope parity (ESLint 9 flat config doesn't auto-ignore dotfile dirs). **No rules silently dropped** (D-11 satisfied). LINT-01/LINT-02/FMT-01 all verified.
