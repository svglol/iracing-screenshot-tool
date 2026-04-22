---
phase: 06-eslint-9-flat-config-prettier-full-wiring
plan: 01
subsystem: tooling
tags: [eslint, eslint-9, eslint-config-prettier, flat-compat, globals, npm-deps, lockfile, lint-baseline]

requires:
  - phase: 05-babel-package-renames
    provides: "@babel/eslint-parser wired as rc-format parser; .eslintignore scoping bot/ + dist/ out of lint scope; 722 post-swap count as D-09 denominator"

provides:
  - "eslint upgraded to ^9.39.4 (LINT-01 dep bump satisfied)"
  - "eslint-config-prettier upgraded to ^10.1.8 (FMT-02 dep bump satisfied)"
  - "@eslint/eslintrc@^3.3.5 installed (FlatCompat bridge for commit 2)"
  - "globals@^15.15.0 installed (env: migration helper for commit 2)"
  - "scripts.lint --ext flag removed (ESLint 9 Pitfall 1 pre-empted)"
  - "06-01-BASELINE.md: pre-migration lint baseline (722 count, 9 rules, 4 hotspots, 0 prettier/prettier)"

affects:
  - 06-02-flat-config-migration
  - milestone-v1.4-audit

tech-stack:
  added:
    - "@eslint/eslintrc@3.3.5 (FlatCompat bridge)"
    - "globals@15.15.0 (languageOptions.globals replacement for legacy env:)"
    - "eslint@9.39.4 (from 7.32.0)"
    - "eslint-config-prettier@10.1.8 (from 9.1.0)"
  patterns:
    - "D-12 bisect commit shape: chore(deps) commit isolates dep changes from config changes"
    - "Broken-window interval documented in commit body (Pitfall 1 acknowledgment)"
    - "--legacy-peer-deps standing flag per D-15 Option 1 (persists to v2.0)"

key-files:
  created:
    - ".planning/phases/06-eslint-9-flat-config-prettier-full-wiring/06-01-BASELINE.md"
  modified:
    - "package.json"
    - "package-lock.json"

key-decisions:
  - "D-15 Option 1 confirmed: --legacy-peer-deps persists past v1.4; eslint-plugin-vue@6 peer conflict stays until v2.0"
  - "Broken-window interval behavior: ESLint 9 exits code 2 (not 0) when no eslint.config.js exists — more aggressive than plan expected; no hook dependency so non-blocking"
  - "--ext removal lands in commit 1 per Pitfall 1 resolution (D-05 Claude's Discretion resolved)"
  - "Lockfile churn 1028 lines (500 ins/528 del): all ESLint-adjacent transitives; no non-ESLint-adjacent top-level major bumps detected"

patterns-established:
  - "Pre-migration baseline captured BEFORE any npm install; git status verified clean on key paths"
  - "Four version sanity checks via npm ls --depth=0 after install"
  - "Lockfile churn inspection via git diff --stat + spot-check for non-ESLint-adjacent bumps"

requirements-completed:
  - LINT-01
  - FMT-02

duration: 10min
completed: 2026-04-22
---

# Phase 6 Plan 01: Dep Bump (eslint 9 + eslint-config-prettier 10) Summary

**eslint bumped 7.32.0 → 9.39.4 + eslint-config-prettier 9 → 10 + @eslint/eslintrc and globals freshly installed; pre-migration baseline 722 firings captured; scripts.lint --ext flag removed for ESLint 9 compatibility**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-22T09:20:00Z
- **Completed:** 2026-04-22T09:27:26Z
- **Tasks:** 3 (baseline capture, package.json edits + npm install, stage + commit)
- **Files modified:** 3 (package.json, package-lock.json, 06-01-BASELINE.md)

## Accomplishments

- Captured pre-migration lint baseline: 722 warnings+errors across src+_scripts scope (9 distinct rules; 4 test-file hotspots; 0 prettier/prettier firings confirming eslint-plugin-prettier is installed but not wired)
- Bumped eslint 7.10.0 → 9.39.4, eslint-config-prettier 9.1.0 → 10.1.8; installed @eslint/eslintrc@3.3.5 and globals@15.15.0 as new devDependencies for commit 2's FlatCompat migration
- Removed `--ext .js,.ts,.vue` from `npm run lint` script (ESLint 9 Pitfall 1 pre-emption); lockfile regenerated with 1028-line ESLint-adjacent-only churn; 256/256 tests confirmed passing

## Task Commits

1. **Task 1: Capture pre-migration baseline** — no commit (artifact written, staged in Task 3)
2. **Task 2: Edit package.json + npm install** — no commit (staged in Task 3)
3. **Task 3: Stage + commit chore(deps)** — `15b7042`

## Files Created/Modified

- `.planning/phases/06-eslint-9-flat-config-prettier-full-wiring/06-01-BASELINE.md` — pre-migration lint baseline (722 count, top-9 rules, 4 hotspots ≥50, 0 prettier/prettier)
- `package.json` — 4 dep changes (2 bumps + 2 new installs) + 1 script rewrite
- `package-lock.json` — regenerated; 1028-line diff (500 ins / 528 del); all ESLint-adjacent transitives

## Decisions Made

- `--ext` removal placed in commit 1 (D-05 Claude's Discretion resolved per Pitfall 1: ESLint 9 rejects `--ext` fatally even before config existence check)
- Lockfile churn 1028 lines assessed as acceptable: all changes are ESLint 7→9 internal dep graph reshuffling (`@humanfs/*`, `keyv`, `json-buffer`, `type-check`, etc.); no non-ESLint-adjacent top-level major bumps
- `--legacy-peer-deps` standing flag confirmed; D-15 Option 1 resolution held; expected peer warnings for eslint-plugin-vue@6 / @typescript-eslint@2 not blocking

## Deviations from Plan

**1. [Rule 1 - Behavior difference] Broken-window lint exits code 2, not 0**
- **Found during:** Task 2 step 11 (smoke-check after npm install)
- **Issue:** Plan expected `npm run lint` to exit 0 with no findings in the broken-window interval (ESLint 9 + no config). Actual behavior: ESLint 9 exits code 2 with "ESLint couldn't find an eslint.config.(js|mjs|cjs) file" error.
- **Fix:** No fix needed — this is correct ESLint 9 behavior. The commit body was updated to accurately describe the broken-window state ("exits with error") instead of "exits 0 with no findings". No pre-commit hook depends on lint output, so exit code 2 does not block commits.
- **Impact:** Zero — the D-12 bisect shape is unchanged; commit 2 (plan 06-02) creates `eslint.config.js` and resolves the broken-window state.

---

**Total deviations:** 1 (behavior difference in broken-window interval — non-blocking, commit body updated to reflect accurate description)

## Issues Encountered

None beyond the broken-window behavior difference documented above.

## Peer-Dependency Warnings (npm install output — for plan 06-02 reference)

Expected warnings per research Pitfall 7 (all observed, none blocking):
- `eslint-plugin-vue@6.2.2` peer `eslint: ^5.0.0 || ^6.0.0 || ^7.0.0` vs installed `eslint@9.39.4`
- `@typescript-eslint/eslint-plugin@2.25.0` peer `eslint: ^5.0.0 || ^6.0.0` vs installed `eslint@9.39.4`
- `@typescript-eslint/parser@2.25.0` same peer conflict

All three plugins load at runtime without version assertions (source-verified in RESEARCH.md).

## Post-Commit Verification Results

| Check | Result |
|-------|--------|
| `eslint@9.39.4` installed | PASS |
| `eslint-config-prettier@10.1.8` installed | PASS |
| `@eslint/eslintrc@3.3.5` installed | PASS |
| `globals@15.15.0` installed | PASS |
| `--ext` removed from scripts.lint | PASS |
| No Co-Authored-By in commit | PASS |
| Exactly 3 paths in commit | PASS |
| No dirty-tree path leakage | PASS |
| npm test 256/256 | PASS |
| eslint-plugin-prettier stays ^5.2.1 | PASS |
| eslint-plugin-vue stays ^6.2.2 | PASS |
| @typescript-eslint/* stays ^2.25.0 | PASS |

## Self-Check: PASSED

- `.planning/phases/06-eslint-9-flat-config-prettier-full-wiring/06-01-BASELINE.md` — EXISTS
- `.planning/phases/06-eslint-9-flat-config-prettier-full-wiring/06-01-SUMMARY.md` — EXISTS (this file)
- Commit `15b7042` — EXISTS (verified via `git log -1`)
- 256/256 tests — PASSING

## Next Phase Readiness

Plan 06-02 (flat-config migration) can proceed immediately. The FlatCompat bridge (`@eslint/eslintrc`) and globals helper are installed. The 722-count baseline in `06-01-BASELINE.md` is the D-10 parity-band denominator for commit 2's post-migration count verification.

**Current state between commits:** `npm run lint` exits code 2 (broken-window — ESLint 9 cannot find `eslint.config.js`). This is the expected transient state documented in commit `15b7042`'s body and T-06-01-05 ("accept" disposition). Plan 06-02 creates `eslint.config.js` and resolves this.

**Key file for plan 06-02:**
- Pre-migration baseline: `.planning/phases/06-eslint-9-flat-config-prettier-full-wiring/06-01-BASELINE.md`
- Current `.eslintrc.js` (to be migrated/deleted): repo root
- Current `.eslintignore` (to be migrated/deleted): repo root

---
*Phase: 06-eslint-9-flat-config-prettier-full-wiring*
*Completed: 2026-04-22*
