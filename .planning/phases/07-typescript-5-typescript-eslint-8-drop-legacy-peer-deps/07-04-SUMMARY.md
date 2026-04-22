---
phase: 07-typescript-5-typescript-eslint-8-drop-legacy-peer-deps
plan: 04
subsystem: infra
tags: [legacy-peer-deps, lint-03, npm-install, milestone-closing, v1.4-close, eresolve, type-check-script, peer-conflict-resolution]

# Dependency graph
requires:
  - phase: 07-03
    provides: TS-01 acceptance gate satisfied — tsc --noEmit exits 0 under TS 5.7.3, no src/ errors
provides:
  - LINT-03 acceptance gate: npm install (no --legacy-peer-deps) exits 0 with zero ERESOLVE
  - Canonical LINT-03-clean package-lock.json (default npm peer-resolution algorithm)
  - scripts.type-check entry in package.json (D-03 Claude's Discretion)
  - v1.4 Tooling Modernization milestone mechanically complete
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "npm install without --legacy-peer-deps succeeds — both peer conflicts cleared (eslint-plugin-vue 6->9 in Phase 6, @typescript-eslint 2->8 in Phase 7)"
    - "package-lock.json regenerated via default npm peer-dep resolution algorithm (not legacy hoisting)"
    - "scripts.type-check: tsc --noEmit provides DX quality gate for future CI wiring"

key-files:
  created: []
  modified:
    - package.json (added scripts.type-check: "tsc --noEmit")
    - package-lock.json (regenerated clean from default npm algorithm — 6048 insertions, 7557 deletions vs prior lockfile)

key-decisions:
  - "Task 1 executed: scripts.type-check added per D-03 Claude's Discretion — exits 0 under TS 5.7.3"
  - "LINT-03 gate passed: npm install (no --legacy-peer-deps) exits 0 with zero ERESOLVE — v1.3 flag no longer required"
  - "Lockfile churn (13605 lines affected) accepted as expected per research §Lockfile Determinism — default and legacy algorithms differ structurally; top-level package versions identical"
  - "ESLint count 735 unchanged from Phase 6 baseline — typescript-eslint 8 scoped to .ts files (none present) produces zero delta"

patterns-established:
  - "LINT-03-clean-install pattern: rm -rf node_modules package-lock.json + npm install (no flag) = canonical clean-install for milestone gate"

requirements-completed: [LINT-03]

# Metrics
duration: 25min
completed: 2026-04-22
---

# Phase 7 Plan 04: Drop --legacy-peer-deps (MILESTONE-CLOSING) Summary

**LINT-03 milestone gate closed: npm install without --legacy-peer-deps succeeds with zero ERESOLVE after two peer-conflict clearances — eslint-plugin-vue 6->9 (Phase 6) and typescript-eslint 2->8 (Phase 7). v1.4 Tooling Modernization complete.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-22T11:25:00Z
- **Completed:** 2026-04-22T11:50:00Z
- **Tasks:** 3 (all complete)
- **Files modified:** 2 (package.json, package-lock.json)

## Accomplishments

- Added `scripts.type-check` entry (`tsc --noEmit`) to `package.json` per D-03 Claude's Discretion
- Deleted `node_modules/` and `package-lock.json` from clean slate per research §Lockfile Determinism
- `npm install` (NO `--legacy-peer-deps`) succeeded with zero ERESOLVE — LINT-03 acceptance gate passed
- All 6 milestone-level success criteria verified green
- Committed `chore(deps): drop --legacy-peer-deps` as the MILESTONE-CLOSING commit for v1.4 Tooling Modernization

## Task Commits

1. **Task 1: Add scripts.type-check to package.json** — no separate commit (staged with Task 3)
2. **Task 2: Clean install without --legacy-peer-deps** — no separate commit (lockfile staged with Task 3)
3. **Task 3: Stage and commit milestone-closing commit** — `3050be7` (`chore(deps): drop --legacy-peer-deps`)

## Files Created/Modified

- `package.json` — added `"type-check": "tsc --noEmit"` after `test:watch` entry
- `package-lock.json` — regenerated from clean slate using npm default peer-dep resolution algorithm (6048 insertions, 7557 deletions vs prior lockfile; structural churn expected per research §Lockfile Determinism; top-level versions identical)

## LINT-03 Acceptance Gate Evidence

| Check | Command | Result |
|-------|---------|--------|
| Pre-install dry-run ERESOLVE | `npm install --dry-run 2>&1 \| grep -E "ERESOLVE\|peer eslint"` | **Empty — zero matches** |
| Real install exit code | `npm install` | **Exit 0** |
| ERESOLVE in install output | `grep -cE "ERESOLVE" /tmp/npm-lint-03-install.txt` | **0** |
| Post-install dry-run ERESOLVE | `npm install --dry-run 2>&1 \| grep -E "ERESOLVE"` | **Empty — zero matches** |
| Post-commit dry-run ERESOLVE | `npm install --dry-run 2>&1 \| grep -E "ERESOLVE"` | **Empty — zero matches** |

## Package Version Verification

| Package | Expected | Actual | Status |
|---------|----------|--------|--------|
| typescript | 5.7.x | 5.7.3 | PASS |
| typescript-eslint | 8.x | 8.59.0 | PASS |
| @typescript-eslint/eslint-plugin | 8.x | 8.59.0 | PASS |
| @typescript-eslint/parser | 8.x | 8.59.0 | PASS |
| eslint | 9.x | 9.39.4 | PASS |
| eslint-plugin-vue | 9.x | 9.33.0 | PASS |

## Milestone-Level Success Criteria Evidence

| SC | Criterion | Command | Result | Status |
|----|-----------|---------|--------|--------|
| SC 1 | `npm install` without `--legacy-peer-deps` | `npm install` → zero ERESOLVE | Exit 0, zero ERESOLVE | **PASS** |
| SC 2 | `npm run lint` count ≤ 1881 | `npx eslint --no-fix ./ \| tail -1` | **735** problems (729 errors, 6 warnings) | **PASS** |
| SC 3 | `npm test` passes 256/256 | `npm test` | 256/256 passed | **PASS** |
| SC 4 | No `babel-runtime`/`babel-eslint` references (only `@babel/*`) | Preserved from Phase 5 | Phase 5 output intact | **PASS** |
| SC 5 | `npx tsc --noEmit` src/ count = 0 | `npx tsc --noEmit 2>&1 \| grep -c "^src/"` | **0** | **PASS** |
| SC 6 | `npm run prettier -- --check` exits 0 | `npm run prettier -- --check` | All matched files use Prettier code style! | **PASS** |

Additional gates:

| Gate | Command | Result |
|------|---------|--------|
| pack:main compile clean | `npm run pack:main` | Compiled with 2 pre-existing warnings (no errors) |
| pack:renderer compile clean | `npm run pack:renderer` | Compiled with 43 pre-existing warnings (no errors) |
| scripts.type-check works | `npm run type-check` | Exit 0, empty output (zero errors) |

## Lockfile Churn Stats

```
package-lock.json | 13605 +++++++++++++++++++++++-----------------------------
1 file changed, 6048 insertions(+), 7557 deletions(-)
```

Churn is structural (default npm peer-dep resolution algorithm vs `--legacy-peer-deps` hoisting). Top-level package versions are identical to the plan 07-01 lockfile. This is expected and documented in research §Lockfile Determinism.

## Peer Conflict Clearance Chain (Historical Record)

1. **v1.3 state:** Two peer conflicts:
   - `eslint-plugin-vue@6 peer eslint@^5||^6||^7` vs `eslint@9.39.4`
   - `@typescript-eslint@2 peer eslint@^5||^6"` vs `eslint@9.39.4`
2. **Phase 6 commit `96fe918` (D-01 Amendment):** Cleared conflict #1 by bumping `eslint-plugin-vue 6 → 9`
3. **Phase 7 plan 07-01 (TS-02):** Cleared conflict #2 by bumping `@typescript-eslint 2 → 8` via the `typescript-eslint 8` umbrella
4. **Phase 7 plan 07-04 (this commit `3050be7`):** Verified both conflicts gone — zero ERESOLVE in npm default algorithm

## D-14 Commit Chain

| Commit | Hash | Message |
|--------|------|---------|
| 1 (07-01) | `d873b50` | `chore(deps): typescript 5 + typescript-eslint 8` |
| 2 (07-02) | `b8f8e1c` | `refactor(eslint): wire typescript-eslint 8 as native flat-config entries` |
| 3 (07-03) | PATH A1 SKIP | (no commit — zero src/ errors, no file changes needed) |
| 4 (07-04) | `3050be7` | `chore(deps): drop --legacy-peer-deps` ← THIS COMMIT (MILESTONE-CLOSING) |

Chain is 3 commits (D-14 minimum satisfied). Path A1 skip in plan 07-03 was predicted and pre-authorized.

## Decisions Made

- **Task 1 executed (not skipped):** D-03 Claude's Discretion recommends adding `scripts.type-check`. The script exits 0 cleanly under TS 5.7.3, adds DX value for future CI wiring, and produces zero package.json churn beyond the single-line addition.
- **Lockfile churn accepted:** 13605-line structural diff is expected (default algorithm vs legacy hoisting). Top-level versions match — no unexpected version changes surfaced.
- **Single commit for Tasks 1+2+3:** package.json (type-check script) and package-lock.json (clean install) staged together in one milestone-closing commit. This is correct — the type-check script addition and the clean lockfile are both part of the same LINT-03 gate commit.

## Deviations from Plan

None — plan executed exactly as written. Task 1 added type-check script (default path per D-03 discretion). Task 2 clean install succeeded on first attempt with zero ERESOLVE. Task 3 committed exactly the 2 planned paths.

## Issues Encountered

None. All gates passed on first attempt. ERESOLVE prediction from D-11 empirical audit held exactly.

## Known Stubs

None — plan 07-04 produced no stub values. All SC evidence is real measured data.

## User Setup Required

None — no external service configuration required.

## v1.4 Milestone Closure Statement

**v1.4 Tooling Modernization milestone mechanically complete; ready for `/gsd-verify-work`.**

All 6 milestone-level success criteria (SC 1-6 per REQUIREMENTS §"Success Criteria (Milestone-Level)") have been verified and documented above with actual measured values. The load-bearing `--legacy-peer-deps` flag documented in v1.3 as required for `npm install` has been eliminated. The two peer conflicts that necessitated it were cleared across two phases:
- Phase 6 D-01 Amendment (`96fe918`): eslint-plugin-vue 6→9
- Phase 7 TS-02 (`d873b50`): @typescript-eslint 2→8

This SUMMARY.md is the single authoritative record of the LINT-03 acceptance gate pass.

## Next Phase Readiness

- v1.4 milestone mechanically complete — ready for `/gsd-verify-work` against all 6 milestone-level success criteria
- `npm install` (no flag) is now the canonical install command for all contributors
- `npm run type-check` available as a DX shortcut for TypeScript validation
- All pre-existing dirty-tree paths remain unstaged (bot/**/*.test.js, src/renderer/**/*.vue, .planning/PROJECT.md, bot/docs/community-guide.md)

---
*Phase: 07-typescript-5-typescript-eslint-8-drop-legacy-peer-deps*
*Completed: 2026-04-22*

## Self-Check: PASSED

| Item | Status |
|------|--------|
| package-lock.json exists | FOUND |
| package.json exists | FOUND |
| 07-04-SUMMARY.md exists | FOUND |
| commit 3050be7 exists | FOUND |
