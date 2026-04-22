---
phase: 13-electron-ship-prep
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/main/index.ts
autonomous: true
requirements: [FIX-01]
tags: [devtools, electron, ship-prep, uat, final]

must_haves:
  truths:
    - "installDevTools() function deleted from src/main/index.ts"
    - "Both call sites at lines 658 + 664 removed"
    - "Zero require('vue-devtools') references remain anywhere"
    - "prettier@2.8.8 NOT present in dep tree"
    - "All 18 v2.0 REQ-IDs validated in REQUIREMENTS.md"
    - "npm test 256/256; npm run pack exit 0; npm run build produces installer"
  artifacts:
    - path: "src/main/index.ts"
      provides: "DevTools handler cleanup"
      contains: "electron-debug"
  key_links: []
---

<objective>
Phase 13 closing plan — v2.0 ship-prep. Delete the broken `installDevTools()` function in `src/main/index.ts` (requires the retired `vue-devtools` legacy package). Verify prettier 2.8.8 transitive is gone (confirmed pre-plan; just record). Confirm all 18 v2.0 REQ-IDs validated. Final build smoke-test.

After this plan: v2.0 is ready to ship.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/13-electron-ship-prep/13-CONTEXT.md
@.planning/REQUIREMENTS.md

@src/main/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Delete installDevTools() + both call sites</name>
  <read_first>
    - src/main/index.ts lines 127-135 (the broken function)
    - src/main/index.ts lines 658 + 664 (the call sites) — confirm exact line numbers with grep `installDevTools` src/main/index.ts
  </read_first>
  <action>
    1. Delete the `installDevTools()` function (entire async function block + the `// eslint-disable-next-line` comment above `require`)
    2. Delete the call at line 658 (`installDevTools();`) — if it's on a standalone line, delete the line; if it's inside an if/else block, check the surrounding context and ensure the block isn't orphaned
    3. Confirm via grep that all `installDevTools` AND `vue-devtools` references are gone:
       ```bash
       grep -n "installDevTools\|vue-devtools" src/main/index.ts
       # Expected: 0 matches
       ```
    4. Run `npx tsc --noEmit` — expect 0 errors (no new type problems introduced by the deletion)
    5. Run `npm run pack` — expect exit 0
    6. Run `npm run dev` for 10 seconds, confirm no `Cannot find module 'vue-devtools'` error in console, then kill
  </action>
  <verify>
    <automated>
      grep -c "installDevTools" src/main/index.ts  # returns 0
      grep -c "vue-devtools" src/main/index.ts  # returns 0
      npx tsc --noEmit 2>&1 | grep -cE "error TS"  # returns 0
      npm test 2>&1 | grep -c "256 passed"  # returns 1
    </automated>
  </verify>
  <acceptance_criteria>
    - Zero `installDevTools` and `vue-devtools` references in src/
    - `npx tsc --noEmit` returns zero errors
    - `npm test` 256/256
    - `npm run pack` exit 0
  </acceptance_criteria>
  <done>
    DevTools handler cleanup complete. File reduced by ~11 lines.
  </done>
</task>

<task type="auto">
  <name>Task 2: Verify prettier 2.8.8 retirement + capture dep tree state</name>
  <read_first>
    - (none — empirical check)
  </read_first>
  <action>
    Run and capture output:
    ```bash
    npm ls prettier 2>&1
    ```
    Expected: `prettier@3.8.3` at top level, deduped via `eslint-plugin-prettier@5.5.5`. NO `prettier@2.8.8` anywhere.

    Also run:
    ```bash
    npm ls prettier --all 2>&1 | grep -c "prettier@2"  # should be 0
    ```

    Record the full `npm ls prettier` output in the plan SUMMARY.
  </action>
  <verify>
    <automated>
      npm ls prettier 2>&1 | grep -c "prettier@3"  # ≥ 1
      npm ls prettier --all 2>&1 | grep -c "prettier@2"  # 0
    </automated>
  </verify>
  <acceptance_criteria>
    - Only prettier@3.x in the dep tree
    - REQ FIX-01b validated
  </acceptance_criteria>
  <done>
    Prettier retirement confirmed.
  </done>
</task>

<task type="auto">
  <name>Task 3: Validate all 18 v2.0 REQ-IDs + full build smoke test</name>
  <read_first>
    - .planning/REQUIREMENTS.md (all 18 v2.0 entries)
    - Summaries from all prior phases (08-01 through 12-05) for cross-reference
  </read_first>
  <action>
    1. Read REQUIREMENTS.md. Count rows with status `[x]` (complete) in the v2.0 section. Expected: 18/18. If any show `[ ]`, mark them `[x]` with phase attribution based on the SUMMARY files.

    2. Run full build + test battery:
       ```bash
       npm install 2>&1 | tail -3  # confirm clean, no --legacy-peer-deps needed
       npm test 2>&1 | tail -3  # 256/256
       npm run lint 2>&1 | tail -5  # ≤1881 problems
       npm run pack 2>&1 | tail -5  # exit 0
       npm run build 2>&1 | tail -20  # installer produced
       ```

    3. Verify installer emitted in `build/`:
       ```bash
       ls build/*.exe 2>&1 | head -3
       ```

    Capture all outputs in the plan SUMMARY.
  </action>
  <verify>
    <automated>
      grep -c "^- \[x\]" .planning/REQUIREMENTS.md | head -1
      npm test 2>&1 | grep -c "256 passed"
      ls build/*.exe 2>&1 | wc -l
    </automated>
  </verify>
  <acceptance_criteria>
    - 18/18 v2.0 REQ-IDs validated (all `[x]` with correct phase attribution)
    - `npm install` clean
    - `npm test` 256/256
    - Lint ≤1881
    - Installer produced in build/
  </acceptance_criteria>
  <done>
    v2.0 milestone requirements fully traced. Build artifacts confirmed.
  </done>
</task>

<task type="auto">
  <name>Task 4: Commit fix + SUMMARY + Phase 13 close</name>
  <action>
    Commit 1 (fix):
    ```bash
    git add src/main/index.ts
    git commit -m "fix(main): delete broken installDevTools() — @vue/devtools v8 is standalone app, not in-process require"
    ```

    Commit 2 (SUMMARY):
    ```bash
    git add -f .planning/phases/13-electron-ship-prep/13-01-SUMMARY.md
    git commit -m "docs(13-01): complete Phase 13 ship-prep plan summary"
    ```

    Commit 3 (Phase 13 close + v2.0 REQ traceability):
    Update .planning/ROADMAP.md (Phase 13 checkbox `[x]`; Progress table Phase 13 → 1/1 Complete, 2026-04-22), .planning/STATE.md (Phase 13 complete; v2.0 milestone ready to ship), .planning/REQUIREMENTS.md (any FIX-01 attribution drift). Commit:
    ```bash
    git add -f .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md
    git commit -m "docs(phase-13): mark Phase 13 complete; v2.0 milestone ready to ship"
    ```

    Do NOT run /gsd-complete-milestone or tag v2.0.0 — those are orchestrator-level operations handled by the autonomous workflow's lifecycle step.

    Do NOT stage any bot/** files.
  </action>
  <verify>
    <automated>
      git log --oneline -5 | head -5
      git log --oneline -5 | grep -c "Phase 13\|ship-prep\|installDevTools"  # ≥ 2
    </automated>
  </verify>
  <acceptance_criteria>
    - Three commits on master
    - No Co-Authored-By
    - bot/** untouched
    - ROADMAP Phase 13 = `[x]` Complete
  </acceptance_criteria>
  <done>
    Phase 13 complete. v2.0 milestone artifact landed. Ready for lifecycle (audit → complete → cleanup).
  </done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| main-process startup → dev-only code path | `installDevTools()` only runs in !isPackaged mode; deletion has zero prod impact |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-13-01 | Denial of Service | Deleting installDevTools leaves orphan block | mitigate | Task 1 grep-checks both function + all call sites; `npx tsc --noEmit` surfaces any orphan or type breakage |
| T-13-02 | Integrity | REQ traceability drift | accept | Task 3 explicitly counts `[x]` entries in REQUIREMENTS.md v2.0 section; fix any drift before closing phase |

Block threshold: none — ship-prep is intentionally low-risk.

</threat_model>

<verification>

Post-plan state:
1. `grep -c "installDevTools" src/main/index.ts` → 0
2. `grep -c "vue-devtools" src/main/index.ts` → 0
3. `npm ls prettier` → `prettier@3.8.3` only (no v2 transitives)
4. `npx tsc --noEmit` → 0 errors
5. `npm test` → 256/256
6. `npm run lint` → ≤1881
7. `npm run build` → installer produced in build/
8. `.planning/REQUIREMENTS.md` → 18/18 v2.0 REQ-IDs marked `[x]`
9. Three commits landed on master
10. bot/** untouched

</verification>

<success_criteria>

- [ ] `installDevTools()` function + both call sites deleted
- [ ] Zero `vue-devtools` references in src/
- [ ] `npm ls prettier` confirmed (REQ FIX-01b)
- [ ] All 18 v2.0 REQ-IDs validated in REQUIREMENTS.md
- [ ] Build installer produced
- [ ] Three commits: fix + SUMMARY + phase-complete docs
- [ ] 13-01-SUMMARY.md created
- [ ] ROADMAP + STATE + REQUIREMENTS updated
- [ ] bot/** untouched; no Co-Authored-By; no --no-verify

</success_criteria>

<output>
Create `.planning/phases/13-electron-ship-prep/13-01-SUMMARY.md` with:
- Exact diff applied to src/main/index.ts (before/after line ranges)
- `npm ls prettier` full output
- Build smoke-test results (installer path + size)
- REQUIREMENTS.md v2.0 validation count (should be 18/18)
- All 3 commit SHAs
- v2.0 milestone-ready status
</output>
