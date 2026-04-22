# Phase 5 — Pre-parser-swap Lint Baseline

**Captured:** 2026-04-22T07:36:23Z
**Parent commit (pre-swap HEAD):** 5fd3c8d
**Devtool versions at capture:** eslint@7.32.0, babel-eslint@10.1.0 (installed but UNWIRED per CONTEXT D-04), parser actually used: espree (vue-eslint-parser@7.0.0 default fallback per node_modules/vue-eslint-parser/index.js:581-585)
**File count in eslint glob:** 113
**Tooling state:** unchanged from pre-phase; no `npm install` performed yet.

## Baseline metrics

### Pre-swap lint count (warnings + errors)
**1881**

Captured via:
`npx eslint --ext .js,.ts,.vue ./ --no-fix 2>&1 | grep -cE '^\s+[0-9]+:[0-9]+\s+(warning|error)'`

ESLint summary line for cross-reference: `✖ 1881 problems (1878 errors, 3 warnings)`.

This count is the denominator for D-08 acceptance: post-swap NET count must be ≤1881 (v1.3 baseline ceiling), with ±direction tolerance.

### Per-rule frequency table (top 20 rules by count)

| Rule | Count |
|------|-------|
| no-undef | 1818 |
| (no rule) | 31 |
| no-unused-expressions | 19 |
| no-void | 5 |
| vue/require-prop-types | 3 |
| no-unused-vars | 2 |
| no-new-object | 1 |
| no-new | 1 |
| no-control-regex | 1 |

(Only 9 distinct rules produced messages across the codebase; fewer than 20.)

Captured via `npx eslint --ext .js,.ts,.vue ./ --no-fix --format json`, post-processed for rule-frequency counting.

### Per-file hotspots (files with ≥50 warnings+errors)

| File | Count |
|------|-------|
| src/main/main-utils.test.js | 257 |
| src/utilities/desktop-capture.test.js | 195 |
| bot/src/github/attachments.test.js | 101 |
| bot/src/github/issues.test.js | 100 |
| src/main/iracing-sdk-utils.test.js | 97 |
| src/utilities/screenshot-name.test.js | 96 |
| bot/src/discord/intakeHandler.test.js | 81 |
| bot/src/github/renderIssueBody.test.js | 64 |
| bot/src/webhook/handlers.test.js | 60 |
| bot/src/discord/commands/markDuplicate.test.js | 57 |
| bot/src/discord/formatters.test.js | 52 |
| bot/src/logger.test.js | 52 |

(All hotspots are `.test.js` files where `no-undef` fires on Jest globals `describe`, `test`, `expect`, `beforeEach`, etc. — `.eslintrc.js` does not declare the `jest` env or `jest/globals`, which explains the 1818-count dominance of `no-undef`. Not a Phase 5 concern — Phase 6 flat-config migration will decide on jest-env wiring.)

## D-08 acceptance denominator

- Post-swap lint count must satisfy: `post_count ≤ 1881` (v1.3 baseline ceiling, NET).
- Parser-attributable delta direction is acceptable per D-08 ("band" semantics).

## Parser-swap functional verification (referenced by commit 2)

- `.vue` SFC `<template>` blocks MUST still lint via `vue-eslint-parser` (delegation chain intact). Verified post-commit-2 by: `npx eslint --ext .vue src/renderer/views/Home.vue --no-fix` exits without parse errors.
- `.vue` SFC `<script>` blocks now go through `@babel/eslint-parser`.
- `.js` files now go through `@babel/eslint-parser`.
- No `.ts` files exist in `src/` or `_scripts/` (verified 2026-04-21 per RESEARCH §Architectural Responsibility Map).

---

## Addendum (2026-04-22T07:52:48Z) — Scope narrowed to src + _scripts

**Reason:** The original pre-swap baseline above used `npx eslint --ext .js,.ts,.vue ./ --no-fix` which globs the whole repo including `bot/`. CONTEXT.md line 131 and PROJECT.md §Out-of-Scope explicitly declare `bot/` out-of-scope for v1.4 tooling phases. During plan 05-02 execution, wiring `@babel/eslint-parser` (which defaults to `requireConfigFile: true` per D-05) surfaced parse errors in `bot/**/*.js` because `bot/` has its own `bot/babel.config.cjs` (Jest-only) as a project boundary that blocks the config walk-up to root `.babelrc`. Adding `.eslintignore` with `bot/` preserves the minimum-scope-derogation philosophy (STATE.md §Accumulated Context) and brings the lint scope in line with v1.4's declared ownership.

**Post-ignore pre-swap count (src + _scripts scope, espree parser):** **712** (709 errors, 3 warnings)

- **Command:** `npx eslint --ext .js,.ts,.vue ./ --no-fix` with `.eslintignore` excluding `bot/` present at repo root
- **Timestamp:** 2026-04-22T07:52:48Z
- **Pre-swap HEAD:** `6ffe1d6` (plan 05-01 SUMMARY commit; `.eslintrc.js` unmodified from master = espree-via-fallback parser path still in effect)
- **Top-5 rules (src + _scripts scope):**

  | Rule | Count |
  |------|-------|
  | no-undef | 693 |
  | no-void | 5 |
  | vue/require-prop-types | 3 |
  | no-unused-vars | 2 |
  | no-new-object | 1 |

  (Only 7 distinct rules produce messages in the narrowed scope; `no-new`, `no-control-regex` also produce 1 each. Parsing errors in `_scripts/release.js:51:9`, `dist/main.js:2:110388`, `dist/renderer.js:2:157625`, `src/main/index.js:69:21` — all pre-existing espree fallback quirks on modern syntax the parser swap in commit 3 is expected to address.)

- **Per-file hotspots (≥50 messages):** 4 `.test.js` files — `src/main/main-utils.test.js` (257), `src/utilities/desktop-capture.test.js` (195), `src/main/iracing-sdk-utils.test.js` (97), `src/utilities/screenshot-name.test.js` (96). All driven by Jest-globals `no-undef` (ambient env; not a phase concern).

### Re-baselined D-08 band denominator

- Post-swap lint count (plan 05-02 commit 3) must satisfy: `post_count ≤ 712` — the new src+_scripts-only pre-swap count under `.eslintignore`.
- The original **1881** count (above) remains the historical `./`-glob record; it is NOT the denominator for plan 05-02's delta assertion once bot/ is excluded from v1.4 lint scope.
- Parser-attributable delta direction is acceptable per D-08 band semantics (deltas concentrated in `no-unused-vars`/`no-undef` expected per Pitfall 5 — `@babel/eslint-parser` scope-analysis differences vs. espree).
