---
phase: 03-font-awesome-v6-upgrade
plan: 02
subsystem: ui
tags:
  - font-awesome
  - fontawesome-v6
  - vue-fontawesome-2
  - template-migration
  - visual-parity
  - vue2

# Dependency graph
requires:
  - phase: 03-font-awesome-v6-upgrade
    provides: "FA v6 deps + vue-fontawesome 2.0.10 resolved + main.js on v6 symbols (Plan 01, commit ae2627b)"
provides:
  - "All 4 renamed-icon template call sites (Home.vue:54, Settings.vue:8, Settings.vue:15, PromoCard.vue:21) on v6 kebab-case names"
  - "Post-upgrade dist/renderer.js measurement: 1,477,189 bytes (+1.82% vs baseline, within D-06 ≤10% tolerance)"
  - "UI-01 requirement fully satisfied — Phase 3 complete (SC1/SC2/SC3/SC4 PASS)"
  - "D-04 two-commit bisect shape locked (HEAD = refactor(icons) b5ecc32, chore(deps) ae2627b earlier in chain)"
affects:
  - "Phase 4 (Prettier 3 reformat) — unblocked per ROADMAP.md depends-on"
  - "v2.0 Vue 3 / FA v7 migration — Plan 02's template edits are neutral for that path (array-syntax :icon=['fas', …] continues into vue-fontawesome 3.x)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Minimal-change template migration: swap only the kebab-case name literals, keep `:icon=\"['fas', …]\"` array syntax, never switch to `fa-solid` long form (RESEARCH.md Anti-Patterns, D-04 minimal-change rationale)"
    - "Post-upgrade bundle-diff artifact format: per-file size table + signed-percentage delta row + D-06 tolerance + PASS/FAIL result, citable verbatim from commit body for audit"

key-files:
  created:
    - ".planning/phases/03-font-awesome-v6-upgrade/03-02-BUNDLE-DIFF.md"
  modified:
    - "src/renderer/views/Home.vue"
    - "src/renderer/components/Settings.vue"
    - "src/renderer/components/PromoCard.vue"

key-decisions:
  - "UAT approval relay: user-confirmed via orchestrator AskUserQuestion — `Approved` (all 9 call sites render in dev AND prod, devtools FA-silent, 4 renamed glyphs show v6 shapes). Dev + prod paths both verified."
  - "D-04 two-commit shape preserved despite intervening `docs(03-01):` metadata commit (cc09b8a) between `chore(deps): ae2627b` and `refactor(icons): b5ecc32`. Bisect from HEAD back to ae2627b still isolates template-rename regressions to this commit's 3-file surface — documented in commit body."
  - "TitleBar.vue deliberately excluded from diff — `arrow-down` name is unchanged v5↔v6; included only in the UAT walkthrough"
  - "Orchestrator-applied Task 4 commit: the wave2-executor reached the blocking UAT checkpoint and returned Tasks 1+2 staged, then did not resume after the user's `approved` signal. Orchestrator applied the atomic `refactor(icons)` commit directly using the exact plan-specified message template, bundle numbers, and UAT sign-off block. Outcome is identical to what the executor would have produced."

patterns-established:
  - "Orchestrator-as-fallback-finalizer: when a checkpoint-gated executor stalls after a `SendMessage` resume signal, the orchestrator can finalize with full data provenance (rename table + bundle deltas + UAT outcome) using the plan's locked commit template"
  - "UAT routing via `AskUserQuestion`: for `checkpoint:human-verify` gates, route the executor's relay block to the user with structured `Approved` / `Failed` options + free-text for failure descriptions"

requirements-completed:
  - UI-01

# Metrics
duration: ~35min
completed: 2026-04-21
---

# Phase 3 Plan 02: FA v6 Template Migration Summary

**Four template strings renamed across Home.vue / Settings.vue / PromoCard.vue; +1.82% bundle delta well within ≤10% D-06 tolerance; manual UAT green across 4 views + 9 call sites in dev AND prod — Phase 3 complete.**

## Performance

- **Duration:** ~35 min end-to-end (executor + user UAT + orchestrator finalize)
- **Started:** 2026-04-21T15:35Z (wave2-executor spawn)
- **Commit landed:** 2026-04-21T16:01:42Z (b5ecc32)
- **Tasks:** 4 (Task 1 edits + Task 2 bundle-diff + Task 3 user UAT + Task 4 atomic commit)
- **Files modified:** 3 Vue templates + 1 bundle-diff artifact created
- **Commits:** 1 atomic `refactor(icons)` commit

## Accomplishments

- 4 template string replacements landed, exactly as planned:
  - `Home.vue:54` `external-link-alt` → `up-right-from-square`
  - `Settings.vue:8` `cog` → `gear`
  - `Settings.vue:15` `question-circle` → `circle-question`
  - `PromoCard.vue:21` `external-link-alt` → `up-right-from-square`
- Post-upgrade bundle measurement: `dist/renderer.js` = 1,477,189 bytes (baseline 1,450,730; delta +26,459 bytes / +1.82%). Result: **PASS** vs D-06 ≤10% tolerance.
- Manual UAT across 4 views / 9 call sites passed in both `npm run dev` and the production build path. Devtools console FA-silent in both environments. All 4 renamed glyphs verified as v6 shapes (diagonal-arrow up-right-from-square ×2, v6 gear, v6 circle-question).
- Atomic `refactor(icons): migrate template usage sites to FA v6 names` commit `b5ecc32` landed with the full UAT sign-off block + SC1–SC4 PASS markers in the body.
- D-04 two-commit bisect shape preserved: HEAD = `b5ecc32` (refactor(icons)) → `cc09b8a` (docs(03-01) metadata) → `ae2627b` (chore(deps)). Bisect between HEAD and `ae2627b` still isolates template-rename regressions to the 3-file surface in this commit.

## Task Commits

Per D-04, Tasks 1–3 are staging for Task 4's single atomic commit.

1. **Task 1: Rename v5→v6 template strings (4 replacements / 3 files)** — staged for commit `b5ecc32`
2. **Task 2: Post-upgrade bundle diff + SC4 tolerance check** — staged for commit `b5ecc32`
3. **Task 3: Manual UAT walkthrough (D-05)** — user-approved via orchestrator relay; no code artifact
4. **Task 4: Atomic commit** — **`b5ecc32bb3239f2da9773876d613e8c649b4e9c5`** (`refactor(icons): migrate template usage sites to FA v6 names`)

Pairs with Plan 01's `chore(deps)` commit `ae2627bad6d3e23b8279636c207ddccc6e597745`.

## Files Created/Modified

- **Created:** `.planning/phases/03-font-awesome-v6-upgrade/03-02-BUNDLE-DIFF.md` — post-upgrade byte count (1,477,189) + baseline reference (1,450,730) + signed delta (+26,459 bytes / +1.82%) + PASS result. Force-added (`git add -f`) because `.planning/` is in `.gitignore` (same pattern as 03-01-BASELINE.md).
- **Modified:** `src/renderer/views/Home.vue` line 54 — `external-link-alt` → `up-right-from-square`. Lines 40 (trash), 43 (folder), 51 (copy) untouched.
- **Modified:** `src/renderer/components/Settings.vue` lines 8 and 15 — `cog` → `gear`, `question-circle` → `circle-question`. Line 19 (`discord` brand) untouched.
- **Modified:** `src/renderer/components/PromoCard.vue` line 21 — `external-link-alt` → `up-right-from-square`.
- **NOT touched:** `src/renderer/components/TitleBar.vue` — `arrow-down` name is unchanged v5↔v6; UAT-only file.

Diff shape: exactly 4 template-string replacements, 4 insertions + 4 deletions, across 3 files. No quote/whitespace/attribute-order normalization. No `fa-solid` long-form switches. No prefix style changes.

## Decisions Made

### SC4 bundle delta commentary (recorded in 03-02-BUNDLE-DIFF.md)

The +1.82% increase is above RESEARCH.md's expected 5→6 decrease but well inside D-06's ≤10% tolerance. Most plausible cause: `@fortawesome/fontawesome-svg-core@6.7.2` added feature hooks (duotone, sharp-family registration scaffolding) whose top-level exports survive tree-shaking even without per-family icon registration. Per-icon SVG path data is roughly the same size as v5. No mitigation needed — the Plan 01 D-07 prune (3 icons removed from `library.add`) already captured the call-site savings, and +1.82% is the natural cost of the core-library upgrade.

### UAT sign-off relayed via orchestrator

The wave2-executor reached Task 3's blocking `checkpoint:human-verify` gate and returned the UAT walkthrough for relay. The orchestrator routed the walkthrough to the user via `AskUserQuestion` with `Approved` / `Approved (dev only)` / `Failed` options. User selected **Approved** (full dev + prod pass). This is the D-05 user-driven verification path — not a routine decision — so auto-mode correctly did not bypass it.

### Orchestrator-applied Task 4 commit (deviation documented below)

After the user approved the UAT, the orchestrator sent a resume signal to the wave2-executor via `SendMessage`. The executor did not resume. Rather than block indefinitely, the orchestrator applied Task 4 directly — staging the exact 4 paths, crafting the atomic commit with the plan-locked message template and real bundle numbers + UAT sign-off, and creating this SUMMARY. Outcome is byte-identical to the executor's planned output; commit is verified via `git log -1 --stat`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Wave2-executor stalled after UAT resume signal; orchestrator applied Task 4 directly**

- **Found during:** Post-UAT resume (Task 4 commit)
- **Issue:** After the user confirmed UAT approval, the orchestrator sent `approved` to the running wave2-executor via `SendMessage`. The executor did not resume within the expected window (git state at the time showed Tasks 1+2 still uncommitted and no SUMMARY). The `Monitor` task remained idle.
- **Fix:** Orchestrator finalized in-place: staged the exact 4 expected paths (`src/renderer/views/Home.vue`, `src/renderer/components/Settings.vue`, `src/renderer/components/PromoCard.vue`, `.planning/phases/03-font-awesome-v6-upgrade/03-02-BUNDLE-DIFF.md`), ran the atomic `refactor(icons):` commit using the exact plan-specified HEREDOC message (rename table + bundle delta numbers + UAT sign-off block + SC1–SC4 PASS markers), and wrote this SUMMARY.
- **Files modified:** No code change beyond the 4 already-staged paths. SUMMARY.md added.
- **Verification:**
  - `git log -1 --pretty=%s` → `refactor(icons): migrate template usage sites to FA v6 names` (exact match)
  - `git log -1 --stat` → 4 files changed (Home.vue, Settings.vue, PromoCard.vue, 03-02-BUNDLE-DIFF.md), 38 insertions / 4 deletions (insertion count includes the new BUNDLE-DIFF.md file)
  - No `Co-Authored-By` line in commit body
  - `bot/docs/community-guide.md` (pre-existing untracked file) not staged
- **Committed in:** `b5ecc32` (the Task 4 atomic commit)

**2. [Rule 3 — Blocking] Plan Task 4's "HEAD~1 is chore(deps)" expectation does not hold due to intervening docs(03-01) commit**

- **Found during:** Task 4 commit body drafting
- **Issue:** Plan 02's Task 4 acceptance criterion expects `HEAD~1` to be Plan 01's `chore(deps):` commit. After Plan 01 ran, its executor landed a separate `docs(03-01):` metadata commit (`cc09b8a`) between the code commit and Phase 3's Plan 02 execution. So at Plan 02 commit time, `HEAD~1` is the metadata commit, not `chore(deps)`.
- **Fix:** Used the adaptation documented in `upstream_state` relayed to wave2-executor: verified the pair exists in the git log chain (HEAD = `refactor(icons)`, `chore(deps) ae2627b` appears as HEAD~2) rather than strictly requiring HEAD~1 adjacency. Noted the intervening metadata commit explicitly in the `refactor(icons)` commit body so bisect reviewers see the shape. Bisecting between HEAD and `ae2627b` still isolates template-rename regressions — the invariant D-04 cared about is preserved.
- **Files modified:** No code change. Commit-body text adjusted relative to plan's literal template.
- **Verification:** `git log --oneline -4` shows `b5ecc32 refactor(icons)` → `cc09b8a docs(03-01)` → `ae2627b chore(deps)` → `5e9b7c6 docs(state)`. Pair relationship preserved.
- **Committed in:** `b5ecc32` (commit body pairs-with paragraph documents the intervening commit).

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking issues).
**Impact on plan:** Neither deviation changes Plan 02's outcome. The 4-file diff surface, commit subject line, commit body structure, and UAT sign-off requirements are all met exactly as specified. The bisect shape remains intact.

## Issues Encountered

- **wave2-executor idle after resume signal:** See Deviation #1. Orchestrator finalized directly. No data loss — Tasks 1+2 had already staged their file changes in the working tree and the BUNDLE-DIFF.md was already written to disk before the checkpoint return.
- **None other:** UAT passed cleanly on first attempt in both dev and prod paths.

## User Setup Required

None — no external services, environment variables, or dashboard configuration introduced.

## Next Phase Readiness

**Phase 3 is complete.** UI-01 requirement fully satisfied. Ready for `/gsd-verify-work` goal-backward verification, then `/gsd-close-phase`.

**Phase 4 (Prettier 3 Codebase Reformat)** depends on Phase 3 per ROADMAP.md — the dependency is now cleared. Plan 02's template edits introduce 4 new lines that Prettier 3 will reformat alongside the rest of the codebase; no special ordering between the FA edits and the Prettier bump is needed.

**v2.0 migration readiness:** The `:icon="['fas', 'kebab-name']"` array syntax used throughout these templates is forward-compatible with `@fortawesome/vue-fontawesome@3.x` (the Vue 3 path). No template rework is needed when the project eventually moves to Vue 3 + FA v7 in milestone v2.0.

## Self-Check: PASSED

- File `.planning/phases/03-font-awesome-v6-upgrade/03-02-BUNDLE-DIFF.md` — FOUND (PASS result recorded)
- File `src/renderer/views/Home.vue` — FOUND (line 54: `up-right-from-square`)
- File `src/renderer/components/Settings.vue` — FOUND (line 8: `gear`, line 15: `circle-question`, line 19: `discord` preserved)
- File `src/renderer/components/PromoCard.vue` — FOUND (line 21: `up-right-from-square`)
- File `src/renderer/components/TitleBar.vue` — FOUND (line 17: `arrow-down` preserved, not in diff)
- Commit `b5ecc32` — FOUND in `git log --oneline` as `b5ecc32 refactor(icons): migrate template usage sites to FA v6 names`
- Commit subject exact match — confirmed
- 4 paths in commit — confirmed (`git log -1 --stat`)
- No `Co-Authored-By` line — confirmed
- v5 identifiers gone in template surface: `grep -c "'external-link-alt'\|'cog'\|'question-circle'" src/renderer/` = 0 — confirmed
- v6 identifiers present: `up-right-from-square` ×2, `gear` ×1, `circle-question` ×1 — confirmed
- UAT approved by user (dev + prod paths) — confirmed via orchestrator relay

---
*Phase: 03-font-awesome-v6-upgrade*
*Completed: 2026-04-21*
