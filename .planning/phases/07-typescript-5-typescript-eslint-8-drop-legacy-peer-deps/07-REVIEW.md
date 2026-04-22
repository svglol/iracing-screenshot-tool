---
phase: 07-typescript-5-typescript-eslint-8-drop-legacy-peer-deps
reviewed: 2026-04-22T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - eslint.config.js
  - package.json
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 7: Code Review Report

**Reviewed:** 2026-04-22
**Depth:** standard
**Files Reviewed:** 2 (`eslint.config.js`, `package.json`)
**Status:** clean

---

## Summary

Phase 7 introduces three targeted changes: TypeScript 3.8 → ~5.7.3, `@typescript-eslint/*` 2.25 → 8.59.0, a new `typescript-eslint` umbrella devDep, a `tseslint.config()` entry in `eslint.config.js`, and a clean `npm install` without `--legacy-peer-deps` to close LINT-03. The review covers the two source-code files changed (`eslint.config.js`, `package.json`) against all eleven specified check points.

**All reviewed files meet quality standards. No issues found.**

---

## Check-Point Compliance Matrix

| # | Check | File | Result | Evidence |
|---|-------|------|--------|----------|
| 1 | Pitfall 1 — `tseslint.config()` helper mandatory | `eslint.config.js:113-116` | PASS | Spread uses helper: `...tseslint.config({ files: ['**/*.ts'], extends: [tseslint.configs.recommended] })` — raw `...tseslint.configs.recommended` never appears |
| 2 | Pitfall 5 — `.ts`-scoped files guard | `eslint.config.js:113` | PASS | `files: ['**/*.ts']` inside the `tseslint.config()` call; `no-require-imports` cannot fire on `.js` CommonJS `require()` calls |
| 3 | Entry order: ignores first, prettierRecommended last, tseslint between `.vue` and Prettier | `eslint.config.js:23,47,59,89,113,122` | PASS | 6-entry order matches D-07: (1) ignores, (2) FlatCompat chain, (3) native languageOptions, (4) `.vue` SFC override, (5) tseslint spread, (6) `prettierRecommended` |
| 4 | D-07 — `'prettier'` dropped from `compat.extends()` chain | `eslint.config.js:48` | PASS | `compat.extends('plugin:vue/recommended', 'standard')` — two arguments only; `'prettier'` removed |
| 5 | Parser preservation — `@babel/eslint-parser` primary; `@typescript-eslint/parser` only for `.ts` | `eslint.config.js:69,94,113` | PASS | Entry 3 sets `babelParser` for `**/*.{js,ts,vue}`; entry 4 uses `'@babel/eslint-parser'` STRING for `.vue` (Pitfall 6 guard); entry 5 scopes `@typescript-eslint/parser` to `.ts` via helper |
| 6 | Pitfall 2 — `typescript` tilde pin `~5.7.3` | `package.json:112` | PASS | `"typescript": "~5.7.3"` — tilde enforces `>=5.7.3 <5.8.0` ceiling |
| 7 | Pitfall 3 — `typescript-eslint` umbrella present | `package.json:113` | PASS | `"typescript-eslint": "^8.59.0"` present as new devDep alongside `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` |
| 8 | Security — no dynamic code paths in `eslint.config.js` | `eslint.config.js:1-123` | PASS | All `require()` calls are top-level static strings; `tseslint.config()` receives a plain object literal; no `eval()`, no user-supplied paths, no dynamic string construction |
| 9 | Commit hygiene — no `Co-Authored-By`, explicit `git add <path>`, pre-existing dirty paths unstaged | commits `d873b50`, `b8f8e1c`, `3050be7` | PASS | `git log -1 --format="%B" <sha>` on each code commit confirms zero `Co-Authored-By` lines; staged files match exactly: `d873b50` → {package.json, package-lock.json, 07-01-BASELINE.md}; `b8f8e1c` → {eslint.config.js}; `3050be7` → {package.json, package-lock.json}; dirty-tree paths (bot/**/*.test.js, src/renderer/**/*.vue, .planning/PROJECT.md) remain unstaged |
| 10 | LINT-03 gate closure — commit `3050be7` body acknowledges milestone | commit `3050be7` | PASS | Body contains "Refs: LINT-03; closes v1.4 Tooling Modernization milestone." with full 6-SC evidence table; both peer-conflict clearances (`96fe918` Phase 6 + `d873b50` Phase 7) cited |
| 11 | All 21 D-decisions spot-checked | All files | PASS | See decision coverage table below |

---

## D-Decision Coverage Spot-Check

| D-Decision | Scope | Verified In |
|------------|-------|-------------|
| D-01: `~5.7.3` tilde pin | `package.json:112` | PASS |
| D-02: `tsconfig.json` byte-preserved, `moduleResolution: "node"` kept | `tsconfig.json:6` + 07-03-SUMMARY Path A1 | PASS |
| D-03: No new strict flags added | `tsconfig.json` — unchanged | PASS |
| D-04: Hybrid triage — not triggered (0 src/ errors) | 07-03-SUMMARY | PASS |
| D-05: `07-01-BASELINE.md` shape preserved | 07-01-SUMMARY.md | PASS |
| D-06: Native flat-config exports used, NOT FlatCompat | `eslint.config.js:9,113` — `require('typescript-eslint')` + `tseslint.config()` | PASS |
| D-07: Entry order + `'prettier'` dropped from FlatCompat chain | `eslint.config.js:47-48` | PASS |
| D-08: `.ts`-file scope only | `eslint.config.js:113` | PASS |
| D-09: `@typescript-eslint/parser` in `.ts` block; `@babel/eslint-parser` for `.js`/`.vue` | `eslint.config.js:69,94,113` | PASS |
| D-10: Rule renames audited — no inline override references renamed rules | `eslint.config.js:76-82` — overrides are `generator-star-spacing`, `semi`, `no-debugger` | PASS |
| D-11/D-12: LINT-03 gate commit is final, STOP if ERESOLVE | `3050be7` SUMMARY confirms zero ERESOLVE | PASS |
| D-13: REQUIREMENTS §LINT-03 wording update noted | 07-04-SUMMARY milestone closure statement | PASS |
| D-14: 3-commit chain (Path A1 skip for commit 3) | `d873b50` → `b8f8e1c` → `3050be7` | PASS |
| D-15: No `Co-Authored-By`, no `--no-verify` | All three code commits verified | PASS |
| D-16: Never `git add -A/.`; explicit paths; dirty tree preserved | Per git show --name-only + git status | PASS |
| D-17: Post-migration lint count ≤1881, ≈735 | 07-02-SUMMARY: 735 (delta +0) | PASS |
| D-18: tsc src/ errors = 0 post-migration | 07-03-SUMMARY: Bucket A = 0 | PASS |
| D-19: `npm test` 256/256 at every commit | 07-01/02/03/04-SUMMARY gate tables | PASS |
| D-20: `prettier --check` exits 0 at every commit | 07-01/02/03/04-SUMMARY gate tables | PASS |
| D-21: `pack:main` + `pack:renderer` compile clean | 07-01/02/03/04-SUMMARY gate tables | PASS |

---

## Milestone-Level Success Criteria (SC 1–6)

All six criteria were verified by the implementation and recorded in 07-04-SUMMARY.md. Review confirms the commit body of `3050be7` contains matching evidence.

| SC | Criterion | Value |
|----|-----------|-------|
| SC 1 | `npm install` without `--legacy-peer-deps` | Zero ERESOLVE — PASS |
| SC 2 | `npm run lint` count ≤ 1881 | 735 — PASS |
| SC 3 | `npm test` 256/256 | 256/256 — PASS |
| SC 4 | No `babel-runtime`/`babel-eslint` references | Phase 5 output preserved — PASS |
| SC 5 | `npx tsc --noEmit` src/ count = 0 | 0 — PASS |
| SC 6 | `npm run prettier -- --check` exits 0 | Exit 0 — PASS |

---

## Notes

**`type-check` script (D-03 Claude's Discretion):** `package.json:148` adds `"type-check": "tsc --noEmit"`. This is the recommended path per the research Open Question 2 recommendation. The script is clean, exits 0 under TS 5.7.3, and adds DX value for future CI wiring.

**Path A1 no-op (commit 3 skip):** Per D-14 and 07-03-SUMMARY, the four-commit chain became a three-commit chain because `tsc --noEmit` under TS 5.7.3 produced zero output (zero src/ errors, zero `node_modules/` errors, zero `moduleResolution` diagnostics). The minimum is "three-commit minimum" per D-14 wording. This is an authorized deviation with no compliance impact.

**`tsconfig.json` preservation:** `moduleResolution: "node"` retained per D-02. TS 5.7 accepts `"node"` as a backward-compat alias for `"node10"` with no diagnostic emitted, confirmed by 07-03-SUMMARY Path A1 bucket C = 0.

---

_Reviewed: 2026-04-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
