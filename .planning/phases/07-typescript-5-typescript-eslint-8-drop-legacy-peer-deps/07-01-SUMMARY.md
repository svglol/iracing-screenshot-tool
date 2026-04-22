---
phase: 07-typescript-5-typescript-eslint-8-drop-legacy-peer-deps
plan: 01
subsystem: build-tooling
tags:
  - typescript-5
  - typescript-eslint-8
  - dep-bump
  - baseline-capture
  - v1.4
  - tilde-pin
dependency_graph:
  requires:
    - "Phase 6: eslint-9-flat-config-prettier-full-wiring (eslint@9.39.4 in place; eslint.config.js active)"
  provides:
    - "typescript@~5.7.3 resolved at 5.7.3 in node_modules"
    - "@typescript-eslint/eslint-plugin@^8.59.0 resolved at 8.59.0"
    - "@typescript-eslint/parser@^8.59.0 resolved at 8.59.0"
    - "typescript-eslint@^8.59.0 resolved at 8.59.0 (umbrella — new devDep)"
    - "07-01-BASELINE.md: pre-migration tsc (2567/0 src) + eslint (735) baselines"
  affects:
    - "plan 07-02: eslint.config.js wiring (tseslint umbrella now installed)"
    - "plan 07-03: tsc --noEmit check (TypeScript compiler now at 5.7.3)"
    - "plan 07-04: --legacy-peer-deps drop (LINT-03 gate)"
tech_stack:
  added:
    - "typescript-eslint@8.59.0 (new umbrella devDep)"
  patterns:
    - "tilde pin ~5.7.3 for TypeScript (enforces 5.7.x ceiling — Pitfall 2 guard)"
    - "umbrella package alongside separate plugin+parser (documented API for tseslint.config())"
    - "--legacy-peer-deps on commit 1; clean install deferred to commit 4 (D-14 pattern)"
key_files:
  created:
    - ".planning/phases/07-typescript-5-typescript-eslint-8-drop-legacy-peer-deps/07-01-BASELINE.md"
  modified:
    - "package.json"
    - "package-lock.json"
decisions:
  - "TILDE pin ~5.7.3 on typescript (not caret) — prevents drift to 5.9.x per Research Pitfall 2"
  - "typescript-eslint umbrella added as new devDep alongside separate plugin+parser"
  - "--legacy-peer-deps used for commit 1 install (eslint.config.js still references @typescript-eslint@2 FlatCompat path)"
metrics:
  duration: "~35 minutes (including npm install + full gate suite)"
  completed: "2026-04-22"
  tasks_completed: 3
  files_changed: 3
---

# Phase 7 Plan 01: Dep Bump + Baseline Capture Summary

TypeScript 3.8 → ~5.7.3 (tilde) + typescript-eslint 2.25 → 8.59.0 + new typescript-eslint umbrella devDep, with pre-migration baseline captured (2567 tsc / 735 eslint) and --legacy-peer-deps retained for this commit pending plan 07-04 LINT-03 gate.

## Commit

| Hash | Message | Files |
|------|---------|-------|
| d873b50 | chore(deps): typescript 5 + typescript-eslint 8 | package.json, package-lock.json, 07-01-BASELINE.md |

## Dependency Delta

| Package | Before | After | Note |
|---------|--------|-------|------|
| typescript | ^3.8.3 | ~5.7.3 | TILDE pin — enforces 5.7.x ceiling (Pitfall 2) |
| @typescript-eslint/eslint-plugin | ^2.25.0 | ^8.59.0 | Peer conflict with eslint@9 cleared |
| @typescript-eslint/parser | ^2.25.0 | ^8.59.0 | Must match plugin version |
| typescript-eslint | (not present) | ^8.59.0 | NEW umbrella — required for tseslint.config() API in plan 07-02 |

**Resolved versions (node_modules):**
- typescript@5.7.3 (tsc --version: Version 5.7.3 — Pitfall 2 guard passed)
- typescript-eslint@8.59.0
- @typescript-eslint/eslint-plugin@8.59.0
- @typescript-eslint/parser@8.59.0

## Baseline Counts (captured at pre-migration HEAD 8103d94)

| Metric | Count |
|--------|-------|
| tsc --noEmit total errors | 2567 |
| tsc --noEmit src/ errors | 0 |
| tsc --noEmit node_modules/ errors | 2567 |
| eslint --no-fix ./ total findings | 735 |
| @typescript-eslint/* rule firings | 0 (none — no rules enabled) |

D-17 denominator: 735 (eslint). D-18 denominator: 0 src/ errors (must remain 0 post-migration).

## Gate Results at HEAD d873b50

| Gate | Result |
|------|--------|
| npm test 256/256 (D-19) | PASS |
| npm run prettier -- --check (D-20) | PASS (exit 0) |
| npm run pack:main (D-21) | PASS (compiled with 2 pre-existing warnings, 0 errors) |
| npm run pack:renderer (D-21) | PASS (compiled successfully) |
| npx tsc --version = 5.7.x (Pitfall 2) | PASS (Version 5.7.3) |
| git log -1 --pretty=%s exact match | PASS |
| 3 files in commit only | PASS |
| No Co-Authored-By | PASS |
| TS-01 + TS-02 refs in commit body | PASS |
| Pre-existing dirty paths unstaged | PASS |

## Deviations from Plan

None — plan executed exactly as written.

The only procedural note: `.planning/` is gitignored at the project root, so `git add -f` was required for `07-01-BASELINE.md` (consistent with Phase 5/6 artifact pattern).

## Known Stubs

None — this plan is a dep bump + baseline capture only. No UI or data wiring.

## Threat Flags

None — no new network endpoints, auth paths, or production surfaces introduced. All changes are dev-tooling (devDependencies only).

## Next Steps

- **Plan 07-02:** Rewire `eslint.config.js` to native typescript-eslint 8 flat-config entries using `tseslint.config({ files: ['**/*.ts'], extends: [tseslint.configs.recommended] })` (D-06 through D-10). The `typescript-eslint` umbrella installed in this plan provides the `tseslint.configs.recommended` API.
- **Plan 07-03:** Address any TypeScript 5 inference errors in `src/utilities/` (expected: 0 per Research §TS 3.8→5.7 Breaking Changes Assessment).
- **Plan 07-04:** Run `npm install` without `--legacy-peer-deps` as the LINT-03 acceptance-gate commit (D-11/D-12).

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| 07-01-BASELINE.md exists | FOUND |
| 07-01-SUMMARY.md exists | FOUND |
| commit d873b50 in log | FOUND |
| commit subject exact match | PASS |
| typescript ~5.7.3 tilde pin in package.json | PASS |
| typescript-eslint ^8.x umbrella in package.json | PASS |
