---
phase: 04-prettier-3-reformat
plan: 01
subsystem: tooling
tags: [prettier, source-prep, vue2, baseline, html5]

# Dependency graph
requires:
  - phase: 03-font-awesome-v6-upgrade
    provides: clean master HEAD with FA v6 upgrade landed, working pack:renderer pipeline, baseline-artifact precedent (03-01-BASELINE.md)
provides:
  - HelpModal.vue HTML5-valid template (orphan <p>/</p> wrapper removed) so Prettier (2.0.2 and 3.3.x) can parse the file
  - 04-01-BASELINE.md acceptance-denominator artifact (lint warning count 1929, prettier-check failing-file count 35, dist/renderer.js bytes 1,477,180)
  - Unblocks Wave 2 (04-02 chore(deps)) and Wave 3 (04-03 format: prettier 3)
affects: [04-02-PLAN, 04-03-PLAN, bisect-shape, git-blame]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-reformat baseline artifact captured before dep bump (mirrors Phase 3's 03-01-BASELINE.md pattern)"
    - "Hand-edit source-prep commit upstream of D-04 two-commit pair keeps 'pure formatter output' framing of downstream format: prettier 3 commit"

key-files:
  created:
    - .planning/phases/04-prettier-3-reformat/04-01-BASELINE.md
  modified:
    - src/renderer/components/HelpModal.vue

key-decisions:
  - "Baseline counter commands adjusted to match actual Prettier 2.0.2 output on this Windows install (plain file paths, not `[warn] ` prefix)"
  - "Lint-autofix side-effects reverted before commit to keep commit scope at the plan-locked 2 paths"
  - "BASELINE.md records true measured prettier-check failing count (35), not the research's projected 33 — no parser errors present, difference is benign research-time drift"

patterns-established:
  - "Pattern 1: Baseline capture under the original (un-bumped) devDep graph so Wave 2's dep bump can prove no new lint warnings"
  - "Pattern 2: When eslint --fix modifies files beyond the current task's scope, capture the numeric baseline from the lint output FIRST, then revert all file mutations before staging — the warning count is still valid because the revert just restores the measured pre-lint tree"

requirements-completed: [TOOL-01]

# Metrics
duration: ~12min
completed: 2026-04-21
---

# Phase 4 Plan 01: HelpModal orphan p fix + pre-reformat baseline capture Summary

**HelpModal.vue orphan `<p>/</p>` wrapper removed (RESEARCH.md Pitfall 1) and lint/prettier-check/bundle baselines captured for Wave 2+3 acceptance denominators in one atomic `fix(HelpModal)` commit**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-21T21:25:00Z
- **Completed:** 2026-04-21T21:37:00Z
- **Tasks:** 3
- **Files modified:** 2 (HelpModal.vue -2 lines; 04-01-BASELINE.md +41 lines)

## Accomplishments

- Removed the HTML5-invalid `<p>`-wrapping-`<ol>` pattern in HelpModal.vue (exactly 2 lines deleted, 0 insertions) — Prettier 2.0.2 and 3.3.x both parse the file without `SyntaxError: Unexpected closing tag "p"`; SC1 of TOOL-01 is now reachable.
- Captured three baseline metrics on the post-fix working tree under the original (un-bumped) devDep graph: lint warning+error count **1929**, `prettier --check` failing-file count **35**, `dist/renderer.js` byte count **1,477,180**.
- Committed both changes atomically as `fix(HelpModal): remove orphan p tags` at `62f7abc`, preserving the D-07 two-commit bisect shape (commit is upstream of the chore(deps) + format: prettier 3 pair).
- Verified zero parser errors remain across the entire `{src,_scripts}/**/*.{js,ts,vue}` glob (A1 reinforced empirically: the HelpModal orphan was the only parser-error file).

## Task Commits

Each task was committed atomically:

1. **Task 1+2+3 bundled: HelpModal orphan fix + 04-01-BASELINE.md artifact** — `62f7abc` (fix)
   - Files: `src/renderer/components/HelpModal.vue` (-2 lines), `.planning/phases/04-prettier-3-reformat/04-01-BASELINE.md` (+41 lines, force-added per .planning/ gitignore rule)
   - Planned bundling: the plan explicitly merges Tasks 1-3 into one `fix(HelpModal)` commit to keep the phase at exactly 3 commits (fix+baseline, chore(deps), format: prettier 3).

## Files Created/Modified

- `src/renderer/components/HelpModal.vue` — Removed the orphan opening `<p>` (old line 27) and closing `</p>` (old line 37) around the Instructions `<ol>...</ol>` block. HTML5 auto-close already treated the `<p>` as terminated at the `<ol>`; removing the tags is semantically a no-op for browsers (A6). Vue 2.7 template parses identically.
- `.planning/phases/04-prettier-3-reformat/04-01-BASELINE.md` — 3,266-byte baseline artifact recording the three acceptance-denominator metrics (lint/prettier-check/bundle-bytes) plus the exact grep patterns Wave 2 + Wave 3 executors will reuse. Force-added (`git add -f`) because `.planning/` is gitignored at `.gitignore:26`.

## Decisions Made

- **Prettier-check count command adjusted for this Windows install's Prettier 2.0.2 output format.** The plan's `grep -cE '^\[warn\] '` pattern returned 0 because this Prettier build emits bare file paths (e.g. `src\renderer\components\HelpModal.vue`), not `[warn]`-prefixed lines. Substituted `grep -cE '\.(js|ts|vue)$'` to count the failing-file paths directly. The captured number (35) is what Wave 2/3 will actually observe on this tree; correctness was chosen over exact pattern-match to the plan.
- **Baseline value 35 recorded, not research-projected 33.** The plan's expected value of 33 was a research-time forecast (RESEARCH.md §Architecture Patterns line 173). Empirical measurement on commit 757dbe9 shows 35 files fail `prettier --check` under v2.0.2. No parser errors are present (`grep -c "SyntaxError"` = 0), so the delta is benign research-vs-execute drift, not a deviation gate.
- **Eslint --fix side-effects reverted before commit.** `npm run lint` runs `eslint --fix` which modified 69 files (scattered across `_scripts/`, `bot/`, `src/`). Per the plan's Task 2 step 2 CAVEAT, the warning count was captured FIRST (from /tmp/04-baseline-lint.txt), then `git checkout -- _scripts bot src` reverted all mutations, then the Task 1 2-line HelpModal fix was re-applied. Final staged diff is exactly the planned 2 paths.
- **Baseline artifact bundled into the `fix(HelpModal)` commit (not separate).** The plan's Task 3 authority locks this: "splitting into two commits doubles the commit count for no bisect value." Phase commit count stays at exactly 3 as designed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan's prettier-check grep pattern `^\[warn\] ` mismatches actual Prettier 2.0.2 output**
- **Found during:** Task 2 step 3 (prettier-check failing-file count capture)
- **Issue:** `grep -cE '^\[warn\] ' /tmp/04-baseline-prettier.txt` returned 0 because this Prettier 2.0.2 Windows install emits bare file paths, not `[warn]`-prefixed lines. The grep-as-written would have persisted an incorrect 0 count into the baseline, breaking Wave 2 + Wave 3 denominators.
- **Fix:** Substituted `grep -cE '\.(js|ts|vue)$' /tmp/04-baseline-prettier.txt` to count the actual failing file paths emitted by this Prettier build. True measured value: 35. The BASELINE.md records this exact command so Wave 2/3 executors can reproduce.
- **Files modified:** `.planning/phases/04-prettier-3-reformat/04-01-BASELINE.md` (the "Captured via" line uses the adjusted command)
- **Verification:** `head -5 /tmp/04-baseline-prettier.txt` shows bare file paths; `wc -l` = 37 (1 header + 35 files + 1 trailer); `grep -c "SyntaxError"` = 0 (no parser errors anywhere — the genuine pass/fail signal from the plan's perspective is satisfied).
- **Committed in:** `62f7abc` (part of the atomic commit)

**2. [Rule 3 - Blocking] eslint --fix auto-modified 69 files during baseline capture**
- **Found during:** Task 2 step 2 (lint baseline capture via `npm run lint`)
- **Issue:** `npm run lint` invokes `eslint --fix`, which mutated files across `_scripts/`, `bot/`, `src/` (including HelpModal.vue itself, clobbering Task 1's surgical edit). The plan's Task 2 CAVEAT explicitly anticipates this: "If `git diff` shows files modified other than `src/renderer/components/HelpModal.vue` after the lint run, REVERT those auto-fixes with `git checkout -- <path>` before proceeding — they would pollute this commit's scope."
- **Fix:** Captured the numeric count 1929 from `/tmp/04-baseline-lint.txt` BEFORE reverting (the measurement is valid on the post-lint tree per the CAVEAT's last sentence). Then `git checkout -- _scripts bot src` reverted all 69 files back to HEAD. Then re-applied the Task 1 2-line HelpModal deletion via a fresh Edit call.
- **Files modified:** All 69 auto-fix modifications reverted; final tree has only the planned HelpModal.vue -2-line delta.
- **Verification:** `git status --short` post-revert shows only `M src/renderer/components/HelpModal.vue` (the re-applied Task 1 edit) plus the expected untracked `bot/docs/community-guide.md`. `git diff --stat` confirms exactly 2 deletions, 0 insertions on HelpModal.vue.
- **Committed in:** `62f7abc` (revert + re-apply happened entirely before staging)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - Blocking)
**Impact on plan:** Both deviations were explicitly anticipated and pre-authorized by the plan's own Task 2 CAVEAT and scope-boundary language. No scope creep; the commit diff matches the plan's locked 2-path scope exactly. Wave 2 and Wave 3 denominators are captured with true measurements on the exact tree they will regress against.

## Issues Encountered

- Prettier 2.0.2's Windows output format differs from the plan's grep pattern (see Deviation 1). Resolved by substituting a structural grep that matches actual output rather than the predicted format.
- `eslint --fix` cascade across 69 files (see Deviation 2). Resolved per the plan's explicit CAVEAT by capture-first-then-revert sequencing.
- CRLF line-ending warnings emitted by git on both HelpModal.vue (pre-existing, documented in RESEARCH.md Pitfall 6) and the new BASELINE.md. No action needed; `core.autocrlf` handles these transparently.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Wave 2 (04-02-PLAN.md `chore(deps)` Prettier 3 + ESLint-Prettier plugin bumps) is unblocked.** The dep-bump plan can run `npm install --legacy-peer-deps` and `npm run lint` against:
  - A parseable HelpModal.vue (no more `SyntaxError: Unexpected closing tag "p"`).
  - A documented lint warning-count denominator of **1929** (acceptance: post-bump `npm run lint` ≤ 1929).
  - A `dist/renderer.js` byte baseline of **1,477,180** for Wave 3's A2 sanity check (webpack output should be within ±0.1%).
- No blockers, no concerns. Phase bisect shape is intact: bisect between post-Wave-3 HEAD and the `chore(deps)` commit will cleanly isolate reformat-specific regressions from dep-bump regressions, exactly as D-04/D-07 specify.

---
*Phase: 04-prettier-3-reformat*
*Completed: 2026-04-21*

## Self-Check: PASSED

- HelpModal.vue at HEAD has 0 orphan `<p>` / `</p>` lines at 8-space indent: FOUND
- `<ol>` count = 1, `</ol>` count = 1, `<li>` count = 11: FOUND
- `.planning/phases/04-prettier-3-reformat/04-01-BASELINE.md` exists (3266 bytes): FOUND
- BASELINE.md contains all three metric lines (lint, prettier, bytes): FOUND
- `dist/renderer.js` exists (1,477,180 bytes): FOUND
- Commit `62f7abc` exists with subject `fix(HelpModal): remove orphan p tags`: FOUND
- Commit body contains all three baseline numbers (1929, 35, 1477180): FOUND
- Commit body contains `Pitfall 1` / `orphan`: FOUND
- Commit body contains zero `Co-Authored-By` trailers: FOUND
- Commit touches exactly 2 files (HelpModal.vue, 04-01-BASELINE.md): FOUND
- Working tree clean save for expected untracked `bot/docs/community-guide.md`: FOUND
