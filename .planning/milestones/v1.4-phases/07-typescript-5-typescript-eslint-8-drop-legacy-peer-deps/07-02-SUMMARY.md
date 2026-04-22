---
phase: 07-typescript-5-typescript-eslint-8-drop-legacy-peer-deps
plan: 02
subsystem: build-tooling
tags:
  - typescript-eslint-8
  - flat-config
  - tseslint-config
  - dual-parser
  - prettier-recommended
  - v1.4
dependency_graph:
  requires:
    - "Plan 07-01: typescript-eslint@8.59.0 umbrella installed (tseslint.config() API available)"
  provides:
    - "eslint.config.js: tseslint.config({ files: ['**/*.ts'], extends: [tseslint.configs.recommended] }) entry (entry 5)"
    - "eslint.config.js: 'prettier' dropped from FlatCompat compat.extends() chain (D-07)"
    - "6-entry flat-config structure: ignores, FlatCompat, native, .vue SFC, tseslint, prettierRecommended"
  affects:
    - "plan 07-03: tsc --noEmit check (tsconfig.json may need moduleResolution alias)"
    - "plan 07-04: --legacy-peer-deps drop (LINT-03 gate)"
tech_stack:
  added: []
  patterns:
    - "tseslint.config() helper for files-scoped typescript-eslint 8 entries (Pitfall 1 guard)"
    - "dual-parser: @babel/eslint-parser for .js/.vue (entries 3+4), @typescript-eslint/parser for .ts (entry 5 via helper)"
    - "6-entry module.exports order: ignores, FlatCompat, native languageOptions, .vue override, tseslint, prettierRecommended"
key_files:
  created: []
  modified:
    - "eslint.config.js"
decisions:
  - "tseslint.config() helper MANDATORY — direct spread of tseslint.configs.recommended leaks base config parser override globally (Pitfall 1)"
  - "files: ['**/*.ts'] scope in tseslint.config() call prevents no-require-imports from firing on .js CommonJS requires (Pitfall 5)"
  - "'prettier' dropped from compat.extends() chain (D-07) — prettierRecommended at position 6 handles disables natively"
  - "tseslint.configs.recommended (non-type-checked) chosen over recommendedTypeChecked — no parserOptions.project needed, rules stay dormant"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-22"
  tasks_completed: 2
  files_changed: 1
---

# Phase 7 Plan 02: typescript-eslint 8 Native Flat-Config Wiring Summary

Three surgical edits to `eslint.config.js`: add `tseslint` umbrella import, drop `'prettier'` from the FlatCompat chain (D-07), and insert `tseslint.config({ files: ['**/*.ts'], extends: [tseslint.configs.recommended] })` as entry 5 — scoped to `.ts` files only via the mandatory helper (Pitfall 1 guard), preserving dual-parser coexistence with `@babel/eslint-parser`.

## Commit

| Hash | Message | Files |
|------|---------|-------|
| b8f8e1c | refactor(eslint): wire typescript-eslint 8 as native flat-config entries | eslint.config.js |

## Config Structure Delta

| Entry | Phase 6 | Phase 7 | Change |
|-------|---------|---------|--------|
| 1 | Global ignores | Global ignores | Unchanged |
| 2 | `compat.extends('plugin:vue/recommended', 'standard', 'prettier')` | `compat.extends('plugin:vue/recommended', 'standard')` | Dropped `'prettier'` (D-07) |
| 3 | Native languageOptions + rules | Native languageOptions + rules | Unchanged |
| 4 | .vue SFC override | .vue SFC override | Unchanged |
| 5 | `prettierRecommended` | `tseslint.config({ files: ['**/*.ts'], extends: [...] })` | NEW |
| 6 | — | `prettierRecommended` | Renumbered (still last) |

Post-expansion: 15 objects (Phase 6) → 18 objects (Phase 7, +3 from tseslint.config() expansion).

## Lint Count (D-17)

| Metric | Value |
|--------|-------|
| Baseline (07-01-BASELINE.md) | 735 |
| Post-migration count | 735 |
| Delta | **+0** |
| D-17 ceiling (≤1881) | PASS |
| D-17 internal goal (≈735 ±20) | PASS |

Delta = 0 confirms: (a) Pitfall 5 not triggered — `no-require-imports` correctly scoped to `.ts` files only; (b) Pitfall 1 not triggered — `@babel/eslint-parser` still handles `.js`/`.vue`.

## Parse-Error Canaries

| Canary | File | Parse Errors | Status |
|--------|------|-------------|--------|
| Pitfall 1 (.js) | `src/utilities/screenshot-name.js` | 0 | PASS |
| Pitfall 1 + Pitfall 6 (.vue) | `src/renderer/views/Home.vue` | 0 | PASS |
| Phase 6 Pitfall 6 (.vue) | `src/renderer/components/SettingsModal.vue` | 0 | PASS |
| Phase 6 Pitfall 6 (.vue) | `src/renderer/components/SideBar.vue` | 0 | PASS |
| Phase 6 Pitfall 6 (.vue) | `src/renderer/components/TitleBar.vue` | 0 | PASS |

## Gate Results at HEAD b8f8e1c

| Gate | Result |
|------|--------|
| npm test 256/256 (D-19) | PASS |
| npm run prettier -- --check (D-20) | PASS (exit 0) |
| npm run pack:main (D-21) | PASS (2 pre-existing warnings, 0 errors) |
| npm run pack:renderer (D-21) | PASS (compiled successfully) |
| require('./eslint.config.js') is array ≥6 | PASS (18 entries) |
| tseslint import present | PASS |
| tseslint.config() call present | PASS |
| files: ['**/*.ts'] scope present | PASS |
| compat.extends() is 2-arg (no 'prettier') | PASS |
| prettierRecommended is last entry | PASS |
| No Co-Authored-By | PASS |
| Exactly 1 file in commit | PASS (eslint.config.js) |
| Pre-existing dirty paths unstaged | PASS |
| D-14 chain: d873b50 present in log | PASS (HEAD~2) |

## Deviations from Plan

None — plan executed exactly as written.

The only note: `git log -2` shows `docs(07-01): complete plan...` as HEAD~1 (the SUMMARY meta-commit from plan 07-01 execution), not `chore(deps): typescript 5 + typescript-eslint 8`. That commit is HEAD~2. The D-14 code commit chain (d873b50 → b8f8e1c) is intact and unbroken; the docs commit between them is expected GSD execution artifact.

## Known Stubs

None — this plan is a config edit only. No UI or data wiring.

## Threat Flags

None — no new network endpoints, auth paths, or production surfaces introduced. All changes are dev-tooling (ESLint config only).

## Next Steps

- **Plan 07-03:** Run `npx tsc --noEmit` under TypeScript 5.7.3 and address any `src/` errors (expected: 0). Check `moduleResolution: "node"` alias diagnostic.
- **Plan 07-04:** Run `npm install` without `--legacy-peer-deps` as the LINT-03 acceptance-gate commit (D-11/D-12). The `@typescript-eslint@2` ERESOLVE clears now that TS-02 is wired.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| eslint.config.js modified | FOUND |
| commit b8f8e1c in log | FOUND |
| commit subject exact match | PASS |
| 1 file in commit only | PASS |
| No Co-Authored-By | PASS |
| Lint count 735 (delta 0) | PASS |
| All parse-error canaries 0 | PASS |
| npm test 256/256 | PASS |
| TS-02 ref in commit body | PASS |
