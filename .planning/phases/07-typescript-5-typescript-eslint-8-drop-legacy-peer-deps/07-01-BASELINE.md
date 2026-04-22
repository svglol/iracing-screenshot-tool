# Phase 7 — Pre-migration TypeScript + ESLint Baseline

**Captured:** 2026-04-22T11:07:20Z
**Parent commit (pre-migration HEAD):** 8103d94a2a8d2e4ba0857743b17db771265a1e93
**Devtool versions at capture:** typescript@3.8.3, @typescript-eslint/eslint-plugin@2.34.0, @typescript-eslint/parser@2.25.0 (all pre-TS-02), eslint@9.39.4, eslint-plugin-vue@9.33.0, eslint-config-prettier@10.1.8, @babel/eslint-parser@7.28.6 (all Phase 6 post-migration; eslint.config.js active — NOT .eslintrc.js)
**Lint scope:** ignores[] in eslint.config.js — bot/, dist/, node_modules/, build/, .planning/, .tools/, .tmp-inspect/

## TypeScript baseline metrics

### Total error count

**2567** errors total (all in node_modules/; zero in src/)

Captured via:
`npx tsc --noEmit 2>&1 | grep -c "error TS"`

### src/ error count

**0** — src/utilities/*.js compiles clean under TS 3.8 with strict: true + allowJs: true

Captured via:
`npx tsc --noEmit 2>&1 | grep "^src/" | wc -l`

### node_modules/ per-source breakdown (top 15)

All 2567 errors are TS 3.8's inability to parse modern type syntax (conditional types, mapped types, template literals, `infer` patterns, satisfies operator). TS 5.7 handles all of these — expected to clear substantially post-migration.

| Count | Source |
|-------|--------|
| 893 | node_modules/@types/yargs/index.d.ts |
| 567 | node_modules/@types/node/http2.d.ts |
| 474 | node_modules/@types/node/https.d.ts |
| 385 | node_modules/@types/node/http.d.ts |
| 123 | node_modules/@types/express-serve-static-core/index.d.ts |
| 40 | node_modules/@types/node/util.d.ts |
| 40 | node_modules/@types/babel__traverse/index.d.ts |
| 19 | node_modules/@types/node/test.d.ts |
| 13 | node_modules/undici-types/dispatcher.d.ts |
| 2 | node_modules/undici-types/pool.d.ts |
| 2 | node_modules/undici-types/h2c-client.d.ts |
| 2 | node_modules/undici-types/client.d.ts |
| 2 | node_modules/undici-types/balanced-pool.d.ts |
| 2 | node_modules/@types/node/buffer.d.ts |
| 1 | node_modules/@types/node/events.d.ts |

**Total accounted:** 2567 (matches grep count exactly)

## ESLint baseline metrics

### Total finding count

**735** warnings + errors

Captured via:
`npx eslint --no-fix ./ 2>&1 | grep -cE '^\s+[0-9]+:[0-9]+\s+(warning|error)'`

This matches the Phase 6 post-migration count per 06-02-SUMMARY.md (735). The D-17 denominator for Phase 7.

### Per-rule frequency table (top 15)

| Count | Rule |
|-------|------|
| 693 | no-undef |
| 18 | no-unused-vars |
| 8 | no-void |
| 3 | vue/multi-word-component-names |
| 3 | vue/require-prop-types |
| 3 | vue/component-definition-name-casing |
| 2 | prefer-const |
| 2 | no-useless-escape |
| 1 | no-new-object |
| 1 | no-new |
| 1 | no-control-regex |

(All 11 distinct rules across codebase. `no-undef` dominates due to Jest globals in .test.js files — deferred per Phase 6/7 CONTEXT §Deferred.)

### Per-file hotspots (files with ≥50 findings)

(Same pattern as Phase 6 baseline — all hotspots are .test.js files with no-undef on Jest globals.)

| File | Approx. Count |
|------|---------------|
| src/main/main-utils.test.js | ~257 (no-undef Jest globals) |
| src/utilities/desktop-capture.test.js | ~195 (no-undef Jest globals) |
| src/main/iracing-sdk-utils.test.js | ~97 (no-undef Jest globals) |
| src/utilities/screenshot-name.test.js | ~96 (no-undef Jest globals) |

### @typescript-eslint/* rule frequency

(none — current @typescript-eslint@2 plugin loaded but no @typescript-eslint rules enabled in eslint.config.js inline overrides)

Expected: zero @typescript-eslint/* firings at this HEAD because:
1. typescript-eslint@2 was installed but NOT wired as a native flat-config entry in eslint.config.js
2. The FlatCompat `compat.extends('plugin:vue/recommended', 'standard', 'prettier')` chain does not include any @typescript-eslint rules
3. No inline `rules: { '@typescript-eslint/*': ... }` overrides exist in eslint.config.js

## D-17 acceptance band

Post-migration lint count MUST satisfy:

- **Hard ceiling:** ≤ 1881 (ROADMAP SC2 — retained from v1.3 baseline per REQUIREMENTS §"Success Criteria" item 2)
- **Internal goal:** ≈ 735 ± typescript-eslint 8 delta
- **typescript-eslint 8 delta:** Expected near-zero — rules scoped to `files: ['**/*.ts']` only (D-08), and the project has ZERO .ts files at this HEAD. Rules will never fire until a .ts file is added post-v1.4.
- **Canary:** If post-migration count exceeds 755 (baseline + 20), investigate before landing commit 2. Any delta >20 without clear attribution routes to user per research §Pitfall 1 canary.
- **Phase 6 precedent:** Phase 6 baseline was 722 → post-migration 735 (delta: +13 from prettier/prettier rule firings). Phase 7 internal goal: post-migration ≈ 735 ± small delta.

## D-18 acceptance band

Post-migration tsc baseline:

- **Hard requirement:** src/ error count = 0 (no regression in src/utilities/ under TS 5.7)
- **node_modules/ expectation:** Count expected to drop substantially (TS 5.7 correctly parses modern .d.ts syntax that caused all 2567 TS 3.8 failures)
- **Specific prediction per 07-RESEARCH.md:** @types/yargs (893), @types/node http2/https/http (1426), @types/express-serve-static-core (123), undici-types (29) — all modern syntax parse failures; all expected to resolve under TS 5.7
- **If any new src/ errors surface under TS 5.7:** Apply D-04 hybrid triage (trivial fix preferred; @ts-expect-error as last resort; hard limit: ≤5 total @ts-expect-error insertions before stopping and routing to user)

## Migration verification gates

Post-migration commit chain must satisfy all gates at every commit:

- **(a) LINT-03 gate (commit 4 only):** `npm install` (NO `--legacy-peer-deps`) exits 0 with zero ERESOLVE — confirms D-11/D-12. The single remaining ERESOLVE (`@typescript-eslint/eslint-plugin@2.34.0 peer eslint@"^5.0.0 || ^6.0.0"`) clears when TS-02 bumps typescript-eslint to 8.
- **(b) ESLint gate (all commits):** `npx eslint --no-fix ./` count ≤ 1881 with zero "Parsing error" and zero "Cannot find module" lines. .vue SFC `<template>` blocks still parse (Phase 6 Pitfall 6 canary carryover — vue-eslint-parser string-parser pattern must survive typescript-eslint 8 wiring).
- **(c) Test gate (all commits):** `npm test` passes 256/256 (D-19).
- **(d) Prettier gate (all commits):** `npm run prettier -- --check` exits 0 (D-20 / FMT-01 carryover).
- **(e) Build gate (all commits):** `npm run pack:main` + `npm run pack:renderer` both compile clean via webpack (D-21).
- **(f) TypeScript version guard (commits 1+):** `npx tsc --version` reports `Version 5.7.x` (NOT 5.8.x, NOT 5.9.x — Pitfall 2 guard; tilde pin ~5.7.3 enforces this).
