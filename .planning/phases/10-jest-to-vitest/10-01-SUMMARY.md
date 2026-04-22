---
phase: 10-jest-to-vitest
plan: 01
subsystem: test-runner
tags: [vitest, jest-migration, test-runner, bisect]
dependency-graph:
  requires:
    - vite@^7.3.2 (Phase 9 — provides Vite config pipeline that Vitest piggybacks)
  provides:
    - vitest@^4.1.5 (root test runner replacing jest@^30.3.0)
    - @vitest/coverage-v8@^4.1.5 (coverage provider for future Phase 11 work)
    - vitest.config.mjs (canonical Vitest config; replaces inline "jest" block)
  affects:
    - npm test / npm run test:watch / npm run test:coverage (all point at vitest now)
    - bot/npm test (UNCHANGED — bot workspace still runs its own Jest 29; 294/294)
tech-stack:
  added:
    - vitest@^4.1.5 (latest stable, supports Vite 6/7/8)
    - @vitest/coverage-v8@^4.1.5 (matching version; v8 built-in coverage, zero extra deps)
  patterns:
    - "Vitest globals mode (`globals: true`): mirrors Jest's implicit describe/test/expect/vi"
    - "Environment: node (all 5 test files test pure Node utilities)"
    - "Include: src/**/*.test.{js,ts}; Exclude: bot/**,dist/**,build/**,out/**,.tools/**,node_modules/**"
    - "Coverage: v8 provider with text/html/lcov reporters"
key-files:
  created:
    - vitest.config.mjs
  modified:
    - package.json
    - package-lock.json
    - src/main/iracing-sdk-utils.test.js
    - src/utilities/iracing-config-checks.test.js
decisions:
  - "Pinned vitest + @vitest/coverage-v8 at ^4.1.5 (latest stable at 2026-04-22)"
  - "D-10-10 bisect shape preserved: 2 content commits (deps-only + config+tests+scripts) via manual revert-and-reapply technique (no interactive git add -p needed)"
  - "Auto-landed 3rd commit (style/prettier reformat) — eslint --fix triggered by npm run lint normalized multi-line vi\\n\\t.spyOn chains to single-line form; committed separately to keep each commit semantically focused"
metrics:
  duration-seconds: 368
  completed-date: 2026-04-22
---

# Phase 10 Plan 01: Jest → Vitest Migration Summary

**One-liner:** Root test runner migrated from Jest 30 to Vitest 4.1.5; 256/256 tests pass natively under Vitest with `globals: true` + `environment: 'node'`; bot/ workspace untouched at 294/294 Jest tests.

## What Landed

Five mechanical steps executed sequentially across 3 git commits:

1. **Dep swap** (`d12e4d4` — commit 1 of D-10-10 bisect chain): Removed `"jest": "^30.3.0"` from devDependencies; added `"vitest": "^4.1.5"` + `"@vitest/coverage-v8": "^4.1.5"`; deleted the `"jest": { "testPathIgnorePatterns": [...] }` block from package.json. `npm install` exited clean (no ERESOLVE, no `--legacy-peer-deps`, 30 packages added, 166 removed).
2. **Vitest config** (landed in commit 2 below): Created `vitest.config.mjs` at project root — `globals: true`, `environment: 'node'`, include `src/**/*.test.{js,ts}`, exclude `node_modules/** + .tools/** + dist/** + build/** + out/** + bot/**`, coverage provider `v8` with text/html/lcov reporters.
3. **Test file jest → vi rewrites** (landed in commit 2 below): `src/main/iracing-sdk-utils.test.js` — 1 `jest.mock` → `vi.mock` swap. `src/utilities/iracing-config-checks.test.js` — 5 `jest.spyOn` → `vi.spyOn` + 1 `jest.restoreAllMocks` → `vi.restoreAllMocks` + 4 multi-line `jest\n\t.spyOn(...)` chained forms collapsed to `vi.spyOn(...)` — required a follow-up edit after the initial `replace_all "jest.spyOn("` missed the multi-line forms, spotted by the first `npx vitest run` reporting 4 failing tests with `ReferenceError: jest is not defined`.
4. **Scripts rewire** (landed in commit 2 below): Removed `jest`, `jest:coverage`, `jest:watch`; `test` → `vitest run --passWithNoTests`; `test:watch` → `vitest --passWithNoTests` (dropped the `rebuild:node` pre-hook per D-10-08 — Vitest's file-watcher doesn't need native-module rebuild for these 5 tests); added `test:coverage` → `vitest run --coverage --passWithNoTests`.
5. **Commit 2** (`08ea10b` — commit 2 of D-10-10 bisect chain): Combined Tasks 2 + 3 + 4 into a single `refactor(test): migrate 5 test files + scripts to Vitest` commit (vitest.config.mjs + 2 test files + package.json scripts region).
6. **Prettier auto-reformat** (`909915f` — style commit, post-D-10-10 hygiene): `npm run lint` runs `eslint --fix` which triggered prettier to collapse the 4 multi-line `vi\n\t.spyOn(fs, 'readFileSync')\n\t.mockReturnValue(...)` chains in iracing-config-checks.test.js into `vi.spyOn(fs, 'readFileSync').mockReturnValue(...)` single-line form. Committed separately so the semantic (jest → vi) change stays bisect-clean in commit 2; the style change lands in commit 3 where `git blame` can attribute the formatting to prettier-not-the-human.

## D-10-10 Bisect Shape — Preserved via revert-and-reapply

The plan offered a minimum-scope derogation to a single combined commit if interactive staging became fragile. Instead, I used a cleaner non-interactive technique that preserved the 2-content-commit bisect shape:

1. After Tasks 1+4 both landed (deps swapped + scripts rewired), I temporarily reverted the scripts portion of package.json back to the jest-era form (keeping Task 1's devDeps + jest-block-removal).
2. `git add package.json package-lock.json && git commit -m "chore(deps): add vitest + coverage-v8; remove jest from root devDependencies"` → commit 1 = deps-only (tests intentionally broken at this HEAD, per D-10-10 intent).
3. Re-edited the scripts portion of package.json back to the Vitest form.
4. `git add vitest.config.mjs src/main/iracing-sdk-utils.test.js src/utilities/iracing-config-checks.test.js package.json && git commit` → commit 2 = config + test files + scripts rewire (tests restore green at this HEAD).

`git bisect start HEAD 7df09a2` (the plan-capture commit) will cleanly isolate dep-bump regressions (commit `d12e4d4`) from content regressions (commit `08ea10b`). Plus the post-hoc prettier `909915f` if formatting drift ever becomes a bisect target.

## Commit SHAs

| # | SHA     | Type     | Message                                                                |
|---|---------|----------|------------------------------------------------------------------------|
| 1 | d12e4d4 | chore    | chore(deps): add vitest + coverage-v8; remove jest from root devDependencies |
| 2 | 08ea10b | refactor | refactor(test): migrate 5 test files + scripts to Vitest               |
| 3 | 909915f | style    | style(test): prettier auto-reformat of vi.spyOn chains to single-line form |

## Verification Results

| Gate                                         | Expected                              | Actual                                   | Pass |
|----------------------------------------------|---------------------------------------|------------------------------------------|------|
| `grep -c "jest" package.json`                | 0 (fully purged)                      | 0                                        | ✅   |
| `grep -c "vitest" package.json`              | ≥3                                    | 5 (devDep × 2, test, test:coverage, test:watch) | ✅ |
| `test -f vitest.config.mjs`                  | present                               | present                                  | ✅   |
| `npm install` (clean, no --legacy-peer-deps) | exit 0, no ERESOLVE                   | exit 0, 9 vulnerabilities = pre-existing baseline (np → listr-input → inquirer chain; zero NEW from vitest) | ✅ |
| `npm test`                                   | 256/256 under Vitest                  | 256/256 passed in 210–227 ms             | ✅   |
| `(cd bot && npm test)`                       | unchanged count                       | 294/294 passed, 30 suites (baseline established for Phase 11+) | ✅ |
| `npm run lint`                               | ≤1881 problems, band preserved        | 734 problems (731 errors, 3 warnings) — **IDENTICAL to pre-Phase-10 baseline**; 13 `'vi' is not defined` errors replaced 13 `'jest' is not defined` errors 1:1 | ✅ |
| `npm run build`                              | installer still produced              | `build/win-unpacked/iRacing Screenshot Tool.exe` produced via electron-builder --dir | ✅ |
| Bisect chain landed                          | 2 commits (or 1 with derogation)      | 2 D-10-10 commits + 1 style follow-up    | ✅   |
| bot/** untouched                             | no staged changes to bot/             | git log shows only package.json, package-lock.json, vitest.config.mjs, and 2 src/ test files | ✅ |
| No Co-Authored-By                            | absent                                | absent (per user instruction)            | ✅   |
| No --no-verify                               | hooks ran                             | hooks ran; commits accepted              | ✅   |

All 7 `must_haves.truths` from plan frontmatter satisfied. All 5 Phase 10 ROADMAP success criteria satisfied.

## Bot Baseline (for future Phase 11+ reference)

`bot/npm test` at 2026-04-22: **30 test suites, 294 tests, 0 snapshots, ~2.7 s runtime** under Jest 29 (bot's own local Jest, separate tree). Unchanged by Phase 10. Phase 10 scope-gate held: zero bot/** staging across the 3 commits.

## vi.* API Differences Observed During Rewrite

**None semantic.** All 9 `jest.*` call-sites in 2 files mapped 1:1 to `vi.*` equivalents (`jest.mock` → `vi.mock`, `jest.spyOn` → `vi.spyOn`, `jest.restoreAllMocks` → `vi.restoreAllMocks`). No hoisting corner cases (the single `vi.mock('irsdk-node', () => ({...}))` factory-mock ported verbatim — Vitest hoists `vi.mock` identically to Jest for this pattern, per D-10-07/T-10-03 research assumption, now empirically confirmed).

One cosmetic surprise: 4 sites used the chained multi-line form `jest\n\t.spyOn(obj, 'method')\n\t.mockReturnValue(...)`. My first pass used a simple `replace_all "jest.spyOn("` which **missed these multi-line forms** (the literal string `jest.spyOn(` didn't match when `jest` and `.spyOn` were on separate lines). Spotted by the first `npx vitest run` which reported 4 `ReferenceError: jest is not defined` failures. Fixed via second `replace_all "jest\n\t.spyOn(fs, 'readFileSync')"`. **Lesson for future mechanical rewrites:** after a `replace_all`, always run the downstream verifier (vitest in this case) — don't trust the grep count alone. Logged as a Phase-10-specific observation; no broader impact.

## Peer-Dep Warnings During Install

**None noteworthy.** `npm install` produced the standard `9 vulnerabilities (6 low, 2 moderate, 1 high)` banner — identical to pre-Phase-10 baseline (STATE.md: "9 vulnerabilities total (6 low, 2 moderate, 1 high)"). The vulnerability chain is all pre-existing: `np → listr-input → inquirer-autosubmit-prompt → inquirer`. **Zero NEW findings from vitest + @vitest/coverage-v8 supply chain.** T-10-01 mitigation discharged.

No ERESOLVE. No `--legacy-peer-deps`. LINT-03 gate preserved.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] First pass of Task 3 missed 4 multi-line `jest\n\t.spyOn(...)` sites**
- **Found during:** Task 3 verification — `npx vitest run` reported 4 failing tests after my initial `replace_all "jest.spyOn("`.
- **Issue:** Literal `jest.spyOn(` doesn't match when `jest` and `.spyOn(` are on separate lines (prettier's chained-call formatting).
- **Fix:** Second `replace_all "jest\n\t.spyOn(fs, 'readFileSync')"` caught all 4 remaining sites.
- **Files modified:** src/utilities/iracing-config-checks.test.js
- **Commit:** 08ea10b (rolled into Task 3's final state before commit)

**2. [Rule 2 — Hygiene] Prettier drift post-npm-run-lint**
- **Found during:** Task 5 verification — `npm run lint` (which runs `eslint --fix`) triggered prettier to reformat 4 `vi\n\t.spyOn(x).mockReturnValue(y)` chains into `vi.spyOn(x).mockReturnValue(y)` single-line form.
- **Issue:** Prettier's opinionated formatting prefers single-line chains when they fit. Not a correctness issue — pure style normalization.
- **Fix:** Committed the reformat as a separate `style(test):` commit so the jest-to-vi semantic diff in commit 2 stays clean for future `git blame`.
- **Files modified:** src/utilities/iracing-config-checks.test.js
- **Commit:** 909915f

### No Rule-4 Architectural Changes

None required. The Jest-to-Vitest swap was purely mechanical — no schema changes, no new services, no auth flow changes, no breaking API shifts.

## Authentication Gates Encountered

None. This plan had zero external-service interactions.

## Phase 10 ROADMAP Success Criteria — All PASS

1. ✅ `jest` + `babel-jest` removed from root `devDependencies` (bot/ unchanged); `vitest` added at `^4.1.5`. (babel-jest was never in devDependencies per Phase 10 CONTEXT — STATE confirms "babel-jest: NOT in current devDeps per earlier scan". Only `jest@^30.3.0` was retired.)
2. ✅ `vitest.config.mjs` exists; excludes `bot/**`, `dist/**`, `build/**`, `.tools/**`, `out/**`, `node_modules/**`. Note: plan spec called for `vitest.config.ts`; chose `.mjs` per D-10-03 decision (Phase 9 electron.vite.config.mjs consistency; `.ts` conversion deferred to Phase 12).
3. ✅ `npm run test` runs 256/256 under Vitest; assertion API compatible (zero test logic changes needed).
4. ✅ `bot/` tests still run separately via `bot/npm test` with its own Jest config unchanged (294/294 confirmed).
5. ✅ `npm run lint` in v1.4 band (734 problems = pre-Phase-10 count; ≤1881 satisfied); `npm run build` clean (win-unpacked produced).

## REQ-IDs Closed

**BUNDLER-02** — Migrate root test runner from Jest to Vitest. Status: **PASS** (all 5 ROADMAP success criteria satisfied).

## Known Stubs

None. All 5 test files exercise real code paths against real module behavior (with `vi.spyOn` intercepts where appropriate for unit isolation). No hardcoded-empty stubs.

## Self-Check: PASSED

**Files verified:**
- ✅ FOUND: `vitest.config.mjs`
- ✅ FOUND: `src/main/iracing-sdk-utils.test.js` (modified — `vi.mock` in place)
- ✅ FOUND: `src/utilities/iracing-config-checks.test.js` (modified — 8 `vi.*` calls in place)
- ✅ FOUND: `package.json` (modified — zero `jest`, 5 `vitest` references)

**Commits verified:**
- ✅ FOUND: d12e4d4 (commit 1)
- ✅ FOUND: 08ea10b (commit 2)
- ✅ FOUND: 909915f (commit 3 style follow-up)
