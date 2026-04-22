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
