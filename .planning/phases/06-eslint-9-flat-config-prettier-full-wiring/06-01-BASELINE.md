# Phase 6 — Pre-flat-config-migration Lint Baseline

**Captured:** 2026-04-22T09:24:15Z
**Parent commit (pre-migration HEAD):** a9ca74a
**Devtool versions at capture:** eslint@7.32.0 (pre-LINT-01), eslint-config-prettier@9.1.0 (pre-FMT-02), eslint-plugin-prettier@5.2.1 (installed, NOT wired — v1.3 Phase 4 Pitfall 4 derogation state; FMT-01 full integration lands in commit 2), @babel/eslint-parser@7.28.6 (Phase 5 output), .eslintrc.js rc-format config active (legacy; LINT-02 migration lands in commit 2)
**Lint scope:** `.eslintignore` excludes `bot/` + `dist/` (Phase 5 Option-A output; `bot/**` + `dist/**` carry forward into commit 2's `ignores: [...]` flat-config field per D-04/D-17/D-18)
**Tooling state:** unchanged from pre-phase; no `npm install` performed yet.

## Baseline metrics

### Pre-migration lint count (warnings + errors)

**Legacy `./`-glob count:** **722**
**src+_scripts scope count (equals legacy count because `.eslintignore` already narrows scope):** **722**

Captured via:
`npx eslint --ext .js,.ts,.vue ./ --no-fix 2>&1 | grep -cE '^\s+[0-9]+:[0-9]+\s+(warning|error)'`

**prettier/prettier rule firings (pre-FMT-01 wiring):** **0** (expected 0 — `plugin:prettier/recommended` NOT wired; `eslint-plugin-prettier` installed but inactive per v1.3 Phase 4 Pitfall 4 minimum-scope derogation)

This count is the denominator for CONTEXT D-10 acceptance:
- ROADMAP SC2 ceiling: `post_count ≤ 1881` (v1.3 baseline)
- Internal goal: `post_count ≤ 722 + prettier/prettier delta` (expected `prettier/prettier` delta ≤ 20; any delta >20 routes to user per D-10)

### Per-rule frequency table (top 20 rules by count)

| Rule | Count |
|------|-------|
| no-undef | 693 |
| no-unused-vars | 11 |
| no-void | 8 |
| vue/require-prop-types | 3 |
| prefer-const | 2 |
| no-useless-escape | 2 |
| no-new-object | 1 |
| no-new | 1 |
| no-control-regex | 1 |

(Only 9 distinct rules produced messages across the codebase; fewer than 20. All `no-undef` firings are Jest globals in `.test.js` files — deferred per CONTEXT §Deferred.)

Captured via `npx eslint --ext .js,.ts,.vue ./ --no-fix --format json`, post-processed for rule-frequency counting.

### Per-file hotspots (files with ≥50 warnings+errors)

| File | Count |
|------|-------|
| src/main/main-utils.test.js | 257 |
| src/utilities/desktop-capture.test.js | 195 |
| src/main/iracing-sdk-utils.test.js | 97 |
| src/utilities/screenshot-name.test.js | 96 |

(All hotspots are `.test.js` files where `no-undef` fires on Jest globals `describe`, `test`, `expect`, `beforeEach`, etc. — `.eslintrc.js` does not declare the `jest` env. Jest-globals wiring is deferred per CONTEXT §Deferred.)

## D-10 acceptance band

- ROADMAP SC2 ceiling: `post_count ≤ 1881` (historical v1.3 baseline retained in REQUIREMENTS §"Success Criteria" item 2).
- Internal migration-parity goal: `post_count ≤ 722 + N` where `N = prettier/prettier` rule delta introduced by FMT-01 full-integration wiring. Expected `N ≤ 20` (codebase was reformatted end-to-end in v1.3 Phase 4; `.prettierrc` preserved byte-for-byte through Phase 5).
- Non-prettier-attributable delta is treated as a MIGRATION BUG to fix before commit 2 lands (e.g., a rule accidentally dropped by FlatCompat translation).
- Any `N > 20` routes to user for decision before landing commit 2 (per CONTEXT D-10).

## Expected peer-dependency warnings on `npm install --legacy-peer-deps`

Research Pitfall 7 documents the following EXPECTED warnings. These do NOT block the commit (D-15 Option 1: `--legacy-peer-deps` persists past v1.4):

- `eslint-plugin-vue@6.2.2` peer `eslint: ^5 || ^6 || ^7` vs installed `eslint@9.39.4` (plugin loads at runtime — no version assertion)
- `@typescript-eslint/eslint-plugin@2.25.0` peer `eslint: ^5 || ^6` vs installed `eslint@9.39.4` (plugin loads at runtime)
- `@typescript-eslint/parser@2.25.0` peer same (parser loads at runtime)

`eslint-plugin-standard@4`, `eslint-plugin-node@11`, `eslint-plugin-promise@4`, `eslint-plugin-import@2` peer ranges all satisfy ESLint 9 (`eslint: >=5.x`-style ranges) — no warnings expected for those.

## Migration functional verification (referenced by commit 2)

- **Commit 1 self-consistency:** After `npm install` lands, `npm run lint` exits 0 with no findings because ESLint 9 ignores `.eslintrc.js` by default and no `eslint.config.js` exists yet. This is the documented "broken-window" interval from research Pitfall 1. `--ext` flag removed from the script to prevent `"Invalid option '--ext'"` fatal error.
- **Commit 2 gates:** Post-migration `npx eslint --no-fix ./` MUST satisfy: (a) zero "Parsing error", (b) zero "Cannot find module" lines, (c) NET count ≤1881 and ≤ 722 + prettier-delta, (d) `.vue` SFC `<template>` blocks still parse (Pitfall 6 vue-eslint-parser@7 string-parser gotcha canary), (e) `npm run prettier -- --check` exits 0 (SC4 — FMT-01 wiring did not accidentally reformat anything).
