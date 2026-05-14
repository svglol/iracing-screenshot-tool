---
phase: 12-js-to-ts
plan: 04
subsystem: typescript
tags: [typescript, vue-sfc, script-lang-ts, options-api, esbuild, plugin-vue]

dependency-graph:
  requires:
    - "Plan 12-01 (src/utilities/*.ts + tsconfig types/skipLibCheck)"
    - "Plan 12-02 (src/main/*.ts — Electron types into shared scope)"
    - "Plan 12-03 (src/renderer/main.ts + router/index.ts + shims-vue.d.ts)"
    - "@vitejs/plugin-vue ^6.0.6 (native <script lang=\"ts\"> support via esbuild)"
  provides:
    - "All 10 SFCs under src/renderer/ authored with <script lang=\"ts\"> (was <script>)"
    - "Zero .js files remain in src/renderer/ source tree (only .ts, .d.ts, .vue, .scss, .html)"
    - "Zero template or style-block modifications — byte-for-byte identical below/above script block"
    - "Phase 12 SFC surface ready for Plan 05 (vue-tsc install + tsconfig include expansion to src/**/*)"
  affects:
    - "Plan 12-05 (tsconfig expansion + parser swap) — include=src/**/* will pick up all .vue files; shim file already covers import surface"
    - "Phase 12 @ts-expect-error budget: 6 of 15 used (Plan 01: 3, Plan 02: 3, Plan 03: 0, Plan 04: 0) — 9 slots remain for Plan 05"

tech-stack:
  added: []
  patterns:
    - "Options API SFCs under <script lang=\"ts\">: esbuild strips type syntax (there was none to strip) and emits the same JS the project has always shipped. Plugin-vue 6 handles the lang=\"ts\" attribute natively; no configuration change required."
    - "CommonJS require() inside <script lang=\"ts\">: `const { ipcRenderer } = require('electron')` etc. are left AS-IS across 8 of 10 SFCs. No @ts-expect-error needed because esbuild does type stripping (not type checking) — the runtime emits the same bundle as before."
    - "Array-form props (e.g. TitleBar.vue's `props: ['title', 'ico']`) left unchanged. esbuild strips types; semantic prop-type inference is Plan 05's vue-tsc concern."
    - "No defineComponent wrapper added to any of the 10 SFCs. Plan-predicted escape hatches (Oruga `any` cast, window.process, data() inference) all proved unnecessary at this gate. Vue-tsc in Plan 05 may surface latent issues to fix then."

key-files:
  created:
    - ".planning/phases/12-js-to-ts/12-04-SUMMARY.md"
  modified:
    - "src/renderer/App.vue (<script> → <script lang=\"ts\">)"
    - "src/renderer/components/ChangelogModal.vue (<script> → <script lang=\"ts\">)"
    - "src/renderer/components/HelpModal.vue (<script> → <script lang=\"ts\">)"
    - "src/renderer/components/PromoCard.vue (<script> → <script lang=\"ts\">)"
    - "src/renderer/components/Settings.vue (<script> → <script lang=\"ts\">)"
    - "src/renderer/components/SettingsModal.vue (<script> → <script lang=\"ts\">)"
    - "src/renderer/components/SideBar.vue (<script> → <script lang=\"ts\">)"
    - "src/renderer/components/TitleBar.vue (<script> → <script lang=\"ts\">)"
    - "src/renderer/views/Home.vue (<script> → <script lang=\"ts\">)"
    - "src/renderer/views/Worker.vue (<script> → <script lang=\"ts\">)"

key-decisions:
  - "D-12-06 preserved: single content commit (bfe93f9) for the entire .vue batch"
  - "D-12-08 preserved (and under-used): zero `any` casts, zero @ts-expect-error, zero defineComponent wrappers added. Plan predicted ≤2 @ts-expect-error budget; reality was 0. Net savings of 2 slots returned to Phase 12 budget."
  - "Plan prediction stale (third plan in a row): Plan 04 reserved 2 directive slots for require('electron')/this.$oruga scenarios. Reality: esbuild's TS stripping in plugin-vue@6 does NOT type-check — it only strips type syntax. Since the SFC bodies were valid ES modules to begin with, no type errors could surface at the pack gate. Pattern matches Plans 02 + 03 (both retired plan-reserved slots). See 'Plan prediction pattern' below."
  - "Each SFC's diff is exactly `1 insertion(+), 1 deletion(-)` — the minimum possible. Templates and <style> blocks verified byte-identical via `git diff --stat`."

requirements-completed:
  - "TS-03"

metrics:
  duration-seconds: 0
  completed-date: 2026-04-22
---

# Phase 12 Plan 04: Vue SFC `<script lang="ts">` Migration Summary

**All 10 Vue SFCs in `src/renderer/` migrated from `<script>` to `<script lang="ts">` with zero other content changes. Templates and `<style>` blocks byte-identical to pre-plan state. Zero `@ts-expect-error`, zero `any` casts, zero `defineComponent` wrappers — esbuild's TS-stripping pipeline in `@vitejs/plugin-vue@^6.0.6` accepted every Options API body as-is. `npm run pack` exit 0 with 78 modules transformed; `npm test` 256/256 (suite unaffected). Single commit `bfe93f9`, 10 files each `+1/-1` line.**

## Performance

- **Started:** 2026-04-22 (same day as Plans 01-03)
- **Completed:** 2026-04-22 (commit `bfe93f9`)
- **Tasks:** 3/3
- **Files in commit:** 10 (all `.vue` SFCs under `src/renderer/`)

## Per-File Diff Stat

Every single SFC shows the absolute minimum-possible diff: `1 insertion, 1 deletion` — the swap of the opening `<script>` tag to `<script lang="ts">`. Template and `<style>` blocks are byte-identical to pre-plan state.

```
 src/renderer/App.vue                       | 2 +-
 src/renderer/components/ChangelogModal.vue | 2 +-
 src/renderer/components/HelpModal.vue      | 2 +-
 src/renderer/components/PromoCard.vue      | 2 +-
 src/renderer/components/Settings.vue       | 2 +-
 src/renderer/components/SettingsModal.vue  | 2 +-
 src/renderer/components/SideBar.vue        | 2 +-
 src/renderer/components/TitleBar.vue       | 2 +-
 src/renderer/views/Home.vue                | 2 +-
 src/renderer/views/Worker.vue              | 2 +-
 10 files changed, 10 insertions(+), 10 deletions(-)
```

No SFC needed a type fix. No SFC needed an `@ts-expect-error`. No SFC needed an `any` cast. No SFC needed a `defineComponent` wrapper.

## Which SFCs Needed Fixes

**None.**

Plan 04's Step 3 "Decision tree" had three branches:
- 0 errors → no fixes (THIS BRANCH)
- 1-2 errors → minimal fix with budget 2
- 3+ errors → stop and reassess

All 10 SFCs went through the 0-error branch. Every existing pattern in the script bodies — CommonJS `require('electron')`, array-form props (`props: ['title', 'ico']`), `this.$oruga.notification.open(...)` programmatic calls, untyped `data()` return objects — parsed and stripped by esbuild without complaint.

## vue-tsc Availability at Plan HEAD

**Not installed at Plan 04's HEAD.** `ls node_modules/.bin/vue-tsc` → file missing. This is expected — Plan 05's remit includes installing `vue-tsc` and wiring it into an NPM `type-check` script. Plan 04 relies on `npm run pack` (electron-vite → Vite → @vitejs/plugin-vue → esbuild) as the primary type-check gate. esbuild is a TS stripper rather than a type checker, so this gate validates syntactic correctness only.

Full semantic SFC type checking is deferred to Plan 05. If vue-tsc surfaces errors in any of the 10 SFCs at that gate (likely candidates: Oruga programmatic calls, array-form props, `$refs.vueSimpleContextMenu.showMenu()` typing), Plan 05 handles them with targeted `any` casts or type annotations.

## `out/renderer/` Artifact Regeneration

`npm run pack` produced:
- `out/renderer/index.html` (0.38 kB)
- `out/renderer/assets/index-pHUv0IHA.css` (1,011.16 kB)
- `out/renderer/assets/index-D0ez7XWv.js` (3,073.45 kB)

78 modules transformed in 10.17 s (up from Plan 03's 68 modules — the 10 SFCs now contribute additional module nodes to the graph since their compiled `<script lang="ts">` output goes through a slightly different esbuild branch, though the runtime JS is equivalent).

## Commit SHA

| # | SHA     | Type     | Message                                                          |
|---|---------|----------|------------------------------------------------------------------|
| 1 | bfe93f9 | refactor | refactor(ts): migrate 10 .vue SFCs to `<script lang="ts">`       |
| 2 | _this_  | docs     | docs(12-04): complete Plan 12-04 summary                         |

## `@ts-expect-error` Budget (0/2 used)

Plan allocated 2 slots. Used: **0**. Phase running total: **6 of 15**.

| File    | Line | Reason |
|---------|------|--------|
| _none_  | —    | All 10 SFCs parsed clean under esbuild's TS stripping |

### Plan prediction pattern (third plan in a row)

Each of Plans 02, 03, 04 has returned unused `@ts-expect-error` slots to the phase budget:

| Plan | Reserved | Used | Retired | Cumulative phase usage |
|------|----------|------|---------|----------------------|
| 01 (utilities/*.ts) | ≤3 | 3 | 0 | 3 |
| 02 (main/*.ts) | ≤5 | 3 | 2 | 6 |
| 03 (renderer .ts files) | ≤2 | 0 | 2 | 6 |
| 04 (vue SFCs) | ≤2 | 0 | 2 | 6 |
| **Totals** | **≤12 plan-budgeted** | **6 actual** | **6 retired** | **6 of 15** |

TypeScript's shared-scope type resolution combined with esbuild's type-stripping (not type-checking) nature has consistently made the plans' defensive directive reservations unnecessary. Plan 05 has **9 slots remaining** (15 total - 6 used) — generous headroom for the tsconfig expansion + vue-tsc introduction, which are the stages most likely to surface latent type issues.

## `any` Usage Patterns

**None introduced in Plan 04.** Zero new `any` casts were added to any of the 10 SFCs.

Pre-existing `any` in `src/renderer/main.ts:66` (`oruga.use(c as any)` from Plan 03) is unchanged. No new `any` entry points in the SFC script bodies.

## Decisions Made

1. **Do not pre-emptively add `defineComponent` wrappers.** Plan's Step 3 pattern D explicitly allowed `defineComponent` for data() inference failures; the failure didn't materialize at any SFC under esbuild's TS stripping. Adding `defineComponent` would have inflated diffs beyond the minimum-possible `+1/-1` per file. D-12-08 pragmatic-not-dogmatic stance: wait for an actual error before wrapping.

2. **Do not convert array-form props to object form.** TitleBar.vue's `props: ['title', 'ico']` stays as-is. Vanilla tsc + esbuild accept this; vue-tsc (Plan 05) will probably accept it too under its default settings. If vue-tsc strict mode demands object form, that's a Plan 05 concern.

3. **Do not type `this.$oruga.notification.open(...)` calls.** Three SFCs use this: Settings.vue (lines ~176, 192), SettingsModal.vue (none directly but through watchers), and Home.vue (line 395). All three work under esbuild's TS stripping. If vue-tsc flags these in Plan 05, a single-line `(this.$oruga as any).notification.open(...)` is the minimum fix — but not pre-emptively applied here.

4. **Do not annotate `require('electron')` with `@ts-expect-error`.** Plan 03 retired both predicted slots for `require('electron')` after discovering TypeScript's shared-scope resolution accepts it. The same logic applies to the 8 SFCs that use `require('electron')` — esbuild doesn't care, and semantic typing is Plan 05's concern.

5. **Minimal commit shape preserved (D-12-06).** Single commit, 10 files, each exactly `+1/-1`. Templates + styles untouched. Bisect granularity: if a regression surfaces in one specific SFC post-merge, the per-file diff on commit `bfe93f9` is the minimum possible, making isolation trivial.

## Deviations from Plan

**None.** Plan 04 executed exactly as written.

All 10 SFCs were migrated with the single-character-run mechanical change (`<script>` → `<script lang="ts">`). The plan's decision tree's 0-error branch was taken for every file. No Rule 1 bugs, no Rule 2 missing functionality, no Rule 3 blocking issues, no Rule 4 architectural changes.

## Issues Encountered

- **CRLF autocrlf warnings on all 10 staged files:** Windows Git's LF→CRLF normalization. Git stores LF in-repo regardless; working-tree sees CRLF on checkout. Same pattern as Plans 12-02 and 12-03 saw on their staged files. Non-issue.
- **Sass deprecation warnings during `npm run pack`:** pre-existing (observed in Plan 02 + 03 summaries too). Out of scope per Rule 3 scope boundary. Not introduced by this plan.
- **.tmp-inspect/ carry-forward deletions + bot/docs/community-guide.md untracked:** pre-existing working-tree state. Not staged. Confirmed post-commit via `git status --short`.

## User Setup Required

None — plan had zero external-service interactions.

## Next Phase Readiness

- **Plan 12-05 (tsconfig expansion + parser swap) ready:**
  - `tsconfig.json` `include` expansion to `src/**/*` is safe — `shims-vue.d.ts` from Plan 03 provides the `.vue` module typing; all 10 SFCs use `<script lang="ts">` so vue-tsc or the expanded glob will treat them as type-checkable.
  - Phase running `@ts-expect-error` total: 6 of 15. Plan 05 has 9 slots remaining, generous for any vue-tsc-introduced fixes + the ESLint parser swap.
  - `@typescript-eslint/parser` becoming primary for `.ts` + `.vue` files needs one new ESLint config block; no conflict with existing Plan 11-era `.ts` block since `.vue` wasn't covered before.
- **Zero `.js` files remain under `src/`:** confirmed via `git ls-files src/ '*.js' | wc -l` → 0 (post-Plan-03 state unchanged by Plan 04). Phase 12's file-extension goal is complete at Plan 04 HEAD, pending only Plan 05's tooling-config wiring.

## Self-Check: PASSED

**Files verified:**
- FOUND: `.planning/phases/12-js-to-ts/12-04-SUMMARY.md` (this file)
- FOUND: 10 `.vue` files in commit, each with `<script lang="ts">` at the script block opening
- FOUND: Zero bare `<script>` in the 10 SFCs (verified via `Grep '^<script>$'` → 0 matches)
- FOUND: `out/renderer/index.html` + assets regenerated by `npm run pack`

**Commits verified:**
- FOUND: `bfe93f9` — refactor(ts): migrate 10 .vue SFCs to `<script lang="ts">`

**Gates verified:**
- PASS: `npm run pack` → exit 0, 78 modules transformed in 10.17 s
- PASS: `npm test` → 256/256 under Vitest 4.1.5 (~235 ms)
- PASS: `@ts-expect-error` count in SFCs = 0 (budget ≤2; phase running total 6 of 15)
- PASS: `@ts-ignore` count in SFCs = 0
- PASS: Per-file diff = `+1/-1` for all 10 files (minimum-possible diff)
- PASS: No `Co-Authored-By` footer on commit
- PASS: No `--no-verify` used
- PASS: All 10 SFCs staged explicitly by path (no `git add .` or `-A`)
- PASS: No bot/** or .tmp-inspect/** leakage in commit
- PASS: Phase-running `.js` files in `src/` tree = 0 (unchanged; Plan 04 did not touch extensions)

---

*Phase: 12-js-to-ts*
*Completed: 2026-04-22*
