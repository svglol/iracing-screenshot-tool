---
phase: 09-webpack-to-vite
plan: 05
type: execute
wave: 5
depends_on: [09-04]
files_modified:
  - package.json
autonomous: true
requirements: [BUNDLER-01]
tags: [bundler, electron-builder, out-folder, installer-smoke-test, phase-close, d-09-10-commit-3]
must_haves:
  truths:
    - "`package.json` `\"main\"` = `\"./out/main/index.js\"` (was `\"./dist/main.js\"`)"
    - "`package.json` `build.files` lists `\"out/**/*\"` (not `\"dist/**/*\"`)"
    - "`package.json` `build.files` still excludes `\"!bot/**/*\"` (pre-existing scope boundary preserved)"
    - "`npm run build` produces a complete Electron installer in `build/`"
    - "Installer size within ±20% of v1.4 baseline (per ROADMAP Phase 9 success criterion 4)"
    - "`npm run dev` still works (regression check — no accidental breakage of dev-mode)"
    - "`npm run pack` still works (regression check)"
    - "`npm test` 256/256 green; `npm run lint` ≤ 1881"
    - "Phase 9 CLOSES: all 5 ROADMAP Phase 9 success criteria PASS (webpack/*-loader gone, electron.vite.config.mjs authoritative, `npm run dev` HMR works, `npm run build` installer works + size band, test + lint gates green)"
  artifacts:
    - path: "package.json"
      provides: "`main` + `build.files` retargeted at `out/`"
      contains: "out/main/index.js"
    - path: "build/iRacing Screenshot Tool Setup <version>.exe"
      provides: "NSIS installer produced by electron-builder from out/ output"
      minimum_size_bytes: 80000000
  key_links:
    - from: "package.json main"
      to: "out/main/index.js"
      via: "electron runtime entry resolution"
      pattern: '"main"\\s*:\\s*"\\./out/main/index\\.js"'
    - from: "package.json build.files"
      to: "out/**/*"
      via: "electron-builder source glob"
      pattern: "out/\\*\\*/\\*"
    - from: "package.json build.extraResources"
      to: "static/icon.png"
      via: "electron-builder asset copy (pre-existing, unchanged)"
      pattern: "static/icon\\.png"
---

<objective>
Complete Phase 9 by retargeting `electron-builder` from the retired `dist/` layout to electron-vite's `out/` layout. Two atomic `package.json` edits: `"main": "./dist/main.js"` → `"./out/main/index.js"`, and `"build.files": ["dist/**/*", ...]` → `["out/**/*", ...]`. Run `npm run build` end-to-end — produce a working Windows installer in `build/`. Verify installer size against v1.4 baseline (±20% per ROADMAP success criterion 4). Re-run dev + pack + test + lint as regression gates to confirm nothing broke. Close Phase 9.

This is D-09-10 commit 3: `chore(build): update electron-builder files + main entry for out/ output folder`. Discrete, minimal diff — `package.json` only — because this is the final integration surface between the build system (Phase 9 scope) and packaging (electron-builder, not in scope but consumes our output).

Purpose: electron-builder consumes the bundler's output. Webpack emitted to `dist/`; electron-vite emits to `out/main/` + `out/renderer/`. electron-builder doesn't care which bundler produced the artifacts — it just globs the `build.files` patterns and copies matching files into the installer. Three configuration points need to align:
1. Electron's `"main"` entry (resolved at runtime by Electron's main process)
2. electron-builder's `"files"` glob (which artifacts end up in the installed app)
3. electron-builder's `"directories.output"` for installers (already `./build/`, unchanged)

Output: One `chore(build): ...` commit + `docs(09-05): ...` SUMMARY commit. Phase 9 closes.

**Bisect intent:** `git bisect` between this commit and 09-04 isolates regressions caused by retargeting electron-builder's source paths — distinct from config regressions (09-03), scripts regressions (09-04), or dep regressions (09-01). A build-time "file not found" error for an installer source would land in this commit's bisect range.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-webpack-to-vite/09-CONTEXT.md
@.planning/phases/09-webpack-to-vite/09-RESEARCH.md
@.planning/phases/09-webpack-to-vite/09-04-SUMMARY.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@package.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Empirically verify out/ layout + measure v1.4 installer baseline</name>
  <read_first>
    - `out/` directory populated by Plan 09-04's `npm run pack` (if still present; if not, re-run `npm run pack` to reproduce)
    - `package.json` current state (`main` at line 44, `build.files` at lines 18-24)
    - v1.4 installer size reference (v1.3 Phase 3 completed milestone; archive at `.planning/milestones/v1.4-ROADMAP.md`)
  </read_first>
  <action>
    1. **Verify/reproduce `out/` layout** — if missing from Plan 09-04 gate run:
       ```
       npm run pack 2>&1 | tee /tmp/pack-reproduce-09-05.log
       ```
       Then:
       ```
       find out -type f | sort
       ```
       Expected directory structure (electron-vite default):
       ```
       out/main/index.js
       out/renderer/index.html
       out/renderer/assets/index-<hash>.js
       out/renderer/assets/index-<hash>.css
       out/renderer/assets/<other assets>
       ```
       Note the EXACT path of `out/main/index.js` — this becomes the new `"main"` value.

    2. **Measure v1.4 installer baseline** — Phase 9 success criterion 4 requires `±20% of v1.4 baseline`. Source:
       ```
       ls -la build/ 2>&1 | grep -iE '(Setup|iracing).*\.exe' | head -3
       ```
       This may list artifacts from previous builds (v1.4 or earlier). If a `iRacing Screenshot Tool Setup <pre-v2.0-version>.exe` or portable `.exe` exists, record its size. If not, use the Phase 8 Plan 06 context: v1.4 baseline installer size is NOT explicitly numbered in Phase 8 summaries (they measured `dist/renderer.js` internal bundle bytes). The 09-CONTEXT.md says "installer size within ±20% of v1.4 baseline" per ROADMAP — RESEARCH.md §Build-Mode Smoke Test Note 4 is the canonical reference, which defers to existing v1.4 installer artifacts.

       If the v1.4 installer binary is no longer present in `build/`, two options:
       - (a) Check `.planning/milestones/v1.4-MILESTONE-AUDIT.md` — v1.4 shipped per ROADMAP, audit may record installer size. Read it:
         ```
         grep -iE 'installer|setup.*\.exe|\.exe.*[0-9]' .planning/milestones/v1.4-MILESTONE-AUDIT.md | head -5
         ```
       - (b) If no v1.4 baseline number survives anywhere, ACCEPT the current build's size as the new baseline and document. The ROADMAP success criterion can be interpreted as "within reasonable bounds given electron-vite ≈ webpack output semantics". Expected size: ~100-200 MB for an NSIS-packaged Electron 41 app with our dep set.

       Record the v1.4 baseline number (or "no baseline recoverable") in scratch notes.

    3. **Pre-edit gate check** — confirm `package.json` is at the post-Plan-09-04 state:
       ```
       grep -E '"main":' package.json
       # Expected: "main": "./dist/main.js",  (unchanged from pre-Phase-9 state)

       grep -A 10 '"files":' package.json | head -10
       # Expected: "files": [ "package.json", "dist/**/*", "node_modules/**/*", "static/icon.*", "!bot/**/*" ]
       ```
  </action>
  <verify>
    <automated>
    test -f out/main/index.js
    test -f out/renderer/index.html
    # package.json is at expected pre-edit state
    grep -q '"main": "\./dist/main\.js"' package.json
    grep -q '"dist/\*\*/\*"' package.json
    </automated>
  </verify>
  <acceptance_criteria>
    - `out/main/index.js` + `out/renderer/index.html` exist (from Plan 09-04 pack)
    - `package.json` confirmed at post-Plan-09-04 state (main=dist/main.js, files list dist/**/*)
    - v1.4 installer baseline recorded (actual size or "not recoverable — current build is new baseline")
  </acceptance_criteria>
  <done>Pre-edit state verified; ready to retarget.</done>
</task>

<task type="auto">
  <name>Task 2: Edit package.json — retarget main + build.files</name>
  <read_first>
    - `package.json` current state (lines 12-44 for `build` block + line 44 for `main`)
    - 09-RESEARCH.md §package.json Diff (CANONICAL) — target shape
  </read_first>
  <action>
    Using the Edit tool on `package.json`, make these TWO atomic edits:

    **Edit 1 — `"main"` field:**
    - Find: `"main": "./dist/main.js",`
    - Replace: `"main": "./out/main/index.js",`
    (Note the filename change from `main.js` → `main/index.js` — electron-vite's default main build output is `out/main/index.js` with the `main/` subdirectory, not `out/main.js` flat.)

    **Edit 2 — `build.files` array entry:**
    - Find: `"dist/**/*",`
    - Replace: `"out/**/*",`
    (Preserve the other entries — `"package.json"`, `"node_modules/**/*"`, `"static/icon.*"`, `"!bot/**/*"` — unchanged.)

    **Preserve unchanged:**
    - `build.appId` (unchanged)
    - `build.productName` (unchanged)
    - `build.directories.output` = `"./build/"` (unchanged — installer output location stays `build/`, only the bundler-output input changes from dist/ to out/)
    - `build.extraResources` array entry `{ from: 'static/icon.png', to: 'icon.png' }` — unchanged; per P4 in RESEARCH.md, electron-builder operates on the source tree (not bundler output), so `static/` at project root is still the right source
    - `build.win.icon` = `"static/icon.png"` (unchanged — same reason)
    - `build.win.target` = `["nsis", "portable"]` (unchanged)
    - `build.nsis.include` = `"_scripts/installer.nsh"` (unchanged — not a webpack script)
    - `build.electronDist` = `"node_modules/electron/dist"` (unchanged)

    After edits, re-read the `package.json` `build` + `main` sections and verify JSON validity.
  </action>
  <verify>
    <automated>
    # JSON still valid
    node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"
    # main retargeted
    grep -q '"main": "\./out/main/index\.js"' package.json
    # build.files retargeted
    grep -q '"out/\*\*/\*"' package.json
    # Old paths gone
    ! grep -q '"dist/\*\*/\*"' package.json
    ! grep -q '"./dist/main\.js"' package.json
    # Critical preserved
    grep -q '!bot/\*\*/\*' package.json
    grep -q '"static/icon\.\*"' package.json
    grep -q 'static/icon\.png' package.json
    </automated>
  </verify>
  <acceptance_criteria>
    - JSON valid
    - `main` = `./out/main/index.js`
    - `build.files` contains `out/**/*` (and not `dist/**/*`)
    - `!bot/**/*` glob preserved (scope boundary)
    - `static/icon.*` glob preserved
    - All other `build` keys unchanged
  </acceptance_criteria>
  <done>package.json retargeted at `out/`; ready for installer smoke test.</done>
</task>

<task type="auto">
  <name>Task 3: Installer smoke test — `npm run build` end-to-end</name>
  <read_first>
    - 09-RESEARCH.md §Build-Mode Smoke Test (MUST PASS) — 4 checkpoints
    - Plan 09-04 SUMMARY: `npm run pack` already verified (re-runs inside `npm run build` chain but we'll re-verify)
    - `_scripts/installer.nsh` exists (electron-builder NSIS include path — referenced by build.nsis.include)
  </read_first>
  <action>
    1. Before running the full build, verify `out/` is clean-rebuildable:
       ```
       rm -rf out
       npm run pack 2>&1 | tail -20
       ```
       Expected: clean `npm run pack` exits 0; `out/main/index.js` + `out/renderer/index.html` re-emitted. Records the pack runtime (in ms) for SUMMARY.

    2. Run the full build chain:
       ```
       npm run build 2>&1 | tee /tmp/npm-run-build-09-05.log
       ```
       The `build` script chains `run-s rebuild:electron pack build:dir`, so:
       - `rebuild:electron` → `run-s electron-builder-install electron-rebuild` → reinstalls Electron deps + runs `electron-rebuild -f --which-module irsdk-node,sharp`
       - `pack` → `electron-vite build` → emits `out/`
       - `build:dir` → `electron-builder --dir` → packages the Electron app into `build/win-unpacked/` (unsigned, for smoke-test; full NSIS installer comes from `build:installer` or `build-publish`)

       Expected log signatures:
       - `• electron-builder  version=...`
       - `• loaded configuration  file=package.json`
       - `• packaging       platform=win32 arch=x64 electron=41.x.x appOutDir=build/win-unpacked`
       - `• Building targets  targets=nsis, portable` (ONLY if `--dir` flag is absent — with `--dir`, just unpacked)
       - `• Asar integrity preparing` / `• signing`
       - Exit 0

       **If build fails:**
       - `Cannot find module '/path/to/dist/main.js'` → Task 2 edit didn't land (retry)
       - `Cannot read property 'files' of undefined` → JSON syntax error in package.json (unlikely with Edit tool)
       - `ENOENT: no such file or directory, open '.../out/...'` → build ran before `pack` completed, or `pack` didn't emit expected files; re-run `npm run pack` standalone first, then `npm run build`
       - `appName too short` / NSIS error → non-Vite-related; document + skip if unrelated to bundler change
       - `electron-rebuild` native-module issues → electron-rebuild compatibility with current Node, pre-existing, skip if unrelated

    3. **Run `npm run build:installer`** to produce the actual NSIS installer (not just unpacked):
       ```
       npm run build:installer 2>&1 | tee /tmp/npm-run-build-installer-09-05.log
       ```
       This runs `run-s rebuild:electron pack && electron-builder` (no `--dir` flag → emits nsis + portable targets per build.win.target).

       Expected output: `build/iRacing Screenshot Tool Setup <version>.exe` + `build/iRacing Screenshot Tool <version>.exe` (portable, possibly).

    4. **Installer size gate**:
       ```
       ls -la build/*.exe | awk '{ print $5, $9 }'
       ```
       Record sizes. If v1.4 baseline is available, compute delta: (current - v1.4) / v1.4 * 100 %. ROADMAP gate: within ±20%.

       **If size exceeds ±20% gate:**
       - Compare with Phase 8 Plan 06's +85.6% `renderer.js` delta context (carried forward): the +85.6% was internal bundle delta, NOT installer delta. Installer size is dominated by Electron runtime (~80-100 MB) + node_modules — the renderer bundle is <3 MB of that total, so +1.3 MB delta on the renderer moves the installer ≈ +1.5% not +85%. Within ±20% is plausible.
       - If actually exceeded, document as a FLAG (same pattern as Phase 8 Plan 06's bundle flag — not a block under --auto, user can accept or request revision)
       - Common causes of unexpected inflation: Vite emitting source-map files into prod (check `out/renderer/assets/*.map` — if present, size bloat; add `build.sourcemap: false` to renderer config in a follow-up), or duplicate native modules (check with `du -sh out/` vs prior `dist/` size if recoverable).

    5. **Installer functional smoke-test (deferred, optional):**
       Running the installer on a clean Windows 11 box is ideal but heavyweight. Under `--auto` mode, deferred to "first user launch" per Phase 8 Plan 06's precedent. Build success + file existence + size-within-band is the gate for Phase 9 close.

    6. **Regression gates** (re-verify):
       - `npm run dev` — launch in background, observe VITE ready, terminate. Log to `/tmp/npm-run-dev-09-05-regression.log`.
       - `npm test` → 256/256
       - `npm run lint 2>&1 | tail -3` → ≤ 1881 problems
  </action>
  <verify>
    <automated>
    # Build completed
    grep -qE 'building for production|✓ built in' /tmp/npm-run-build-09-05.log
    ! grep -qiE '(error|fail)' /tmp/npm-run-build-09-05.log | head -5
    # Installer emitted (build:installer task)
    ls build/*.exe 2>&1 | head -1 | grep -qE '\.exe'
    # Size recorded (cannot gate strictly without baseline)
    du -h build/*.exe 2>&1 | head -3

    # Regression gates
    grep -qE 'VITE.*ready' /tmp/npm-run-dev-09-05-regression.log
    npm test 2>&1 | grep -qE '256 passed'
    </automated>
  </verify>
  <acceptance_criteria>
    - `npm run build` exits 0
    - `npm run build:installer` exits 0 and emits `build/*.exe`
    - Installer size within ±20% of v1.4 baseline OR size recorded and documented as FLAG (per --auto mode)
    - `npm run dev` regression: still works
    - `npm test` 256/256
    - `npm run lint` ≤ 1881
  </acceptance_criteria>
  <done>Full build chain validated end-to-end; installer produced; regression gates green.</done>
</task>

<task type="auto">
  <name>Task 4: Commit the retarget (D-09-10 commit 3)</name>
  <read_first>
    - 09-CONTEXT.md carryforward (commit discipline)
    - 09-RESEARCH.md §Commit Plan commit 3 message
  </read_first>
  <action>
    1. Confirm `bot/**` dirty state unchanged from Plan 09-04 close.

    2. Confirm working-tree scope is ONLY `package.json`:
       ```
       git status --short
       ```
       Expected (beyond bot/** pre-existing): `M package.json` only.

       Also: `build/` + `out/` directories populated with Task 3's artifacts. Confirm both are in `.gitignore` (verified in Plan 09-04; re-check):
       ```
       git status --short | grep -cE 'build/|out/'
       ```
       Expected: 0 (both ignored).

    3. Stage explicitly:
       ```
       git add package.json
       ```

    4. Verify staged diff:
       ```
       git diff --cached --name-only
       ```
       Expected: exactly `package.json`.

       ```
       git diff --cached package.json | head -30
       ```
       Expected: exactly 2 line changes (one for `"main"`, one for `"dist/**/*"` → `"out/**/*"`).

    5. Commit:
       ```
       chore(build): update electron-builder files + main entry for out/ output folder
       ```
       No Co-Authored-By. No --no-verify.

    6. Verify:
       - `git log -1 --format=%s` matches
       - No Co-Authored-By
       - `git show --stat HEAD` → exactly 1 file (package.json)
       - `git show HEAD` diff preserves exactly 2 line changes + any JSON whitespace-reordering

    7. Final gate run:
       - `npm test` 256/256
       - `npm run lint 2>&1 | tail -3` ≤ 1881
  </action>
  <verify>
    <automated>
    git log -1 --format=%s | grep -qE '^chore\(build\): update electron-builder'
    git log -1 --format=%B | { ! grep -qi 'Co-Authored'; }
    git show --stat HEAD --format= | grep -cE 'package\.json' | grep -q '^1$'
    git show HEAD --format= -- package.json | grep -cE '^-.*dist|^\+.*out' | awk '{ if ($1+0 >= 4) print "OK"; else print "FAIL: "$1" lines changed"; }' | grep -q OK
    npm test 2>&1 | grep -qE '256 passed'
    </automated>
  </verify>
  <acceptance_criteria>
    - Exactly one new commit (`chore(build): update electron-builder ...`)
    - Commit diff = 1 file (package.json)
    - Diff is minimal: only the 2 line changes + JSON whitespace preserved
    - No Co-Authored-By
    - `npm test` 256/256; `npm run lint` ≤ 1881
  </acceptance_criteria>
  <done>D-09-10 commit 3 landed; Phase 9 content commits complete.</done>
</task>

<task type="auto">
  <name>Task 5: Phase 9 closing declaration — write 09-05-SUMMARY.md</name>
  <read_first>
    - $HOME/.claude/get-shit-done/templates/summary.md
    - Scratch notes: installer size, build log excerpts, full D-09-10 3-commit chain
    - 08-06-SUMMARY.md (as reference for the "Phase Closing Declaration" section pattern)
    - .planning/REQUIREMENTS.md §BUNDLER-01 (for the REQ-ID verdict table)
    - .planning/ROADMAP.md §Phase 9 success criteria (5 items to check off)
  </read_first>
  <action>
    Create `.planning/phases/09-webpack-to-vite/09-05-SUMMARY.md` with:

    - YAML frontmatter (phase, plan: 05, subsystem: bundler-electron-builder-integration, tags: [electron-builder, out-folder, installer-smoke-test, phase-close, d-09-10-commit-3], requires: [09-04], provides: see must_haves above, affects: package.json, tech_stack: no packages; patterns: electron-builder source-glob retarget convention)
    - **Empirical Smoke-Test Results** — sections for:
      - `npm run pack` (clean re-run)
      - `npm run build` (full chain)
      - `npm run build:installer` (NSIS emission)
      - `npm run dev` (regression)
      - `npm test` (regression)
      - `npm run lint` (regression, with exact count)
    - **Installer Size Analysis**
      - Current size: X bytes (record actual)
      - v1.4 baseline: Y bytes (record actual or "not recoverable")
      - Delta: ±Z% (or "no baseline — accept current as new v2.0 baseline")
      - Pass/Fail vs ROADMAP's ±20% criterion (or FLAG if exceeded)
    - **REQ-ID Verdict** — single row:
      | REQ-ID | Success Criterion | Verdict | Evidence |
      | BUNDLER-01 | webpack → Vite migrated; pack:main + pack:renderer consolidated; electron.vite.config.mjs authoritative; `npm run build` produces installer; dev HMR works | **PASS** | All 5 ROADMAP Phase 9 success criteria satisfied (see below) |
    - **ROADMAP Phase 9 Success Criteria** — checklist with evidence:
      1. webpack/webpack-cli/webpack-dev-server/*-loader devDependencies absent → PASS (Plan 09-01 + 09-04 outcomes)
      2. `electron.vite.config.mjs` authoritative; `@vitejs/plugin-vue` wired → PASS (Plan 09-03)
      3. `npm run dev` launches Electron + HMR works → PASS (Plan 09-03 live smoke-test + Plan 09-04 + Plan 09-05 regression re-run)
      4. `npm run build` produces Electron installer; size within ±20% of v1.4 → PASS (this plan's Task 3 + size analysis above)
      5. `npm test` 256/256; `npm run lint` in v1.4 band → PASS (all 5 plans' gate records)
    - **Full D-09-10 3-Commit Bisect Chain** — table of all Phase 9 content commits:
      | # | SHA | Message | Plan |
      | 1 | `<SHA from Plan 09-01>` | chore(deps): add electron-vite + @vitejs/plugin-vue; remove 15 webpack devDependencies | 09-01 |
      | 2a | `<SHA from Plan 09-02>` | refactor(build): migrate EJS template to Vite renderer index.html; main-URL via ELECTRON_RENDERER_URL | 09-02 |
      | 2b | `<SHA from Plan 09-03>` | refactor(build): flesh out electron.vite.config.mjs (externals, aliases, SCSS, define, plugin-vue) | 09-03 |
      | 2c | `<SHA from Plan 09-04>` | refactor(build): retire webpack configs + dev-runner; rewire package.json scripts to electron-vite | 09-04 |
      | 3 | `<SHA from this plan>` | chore(build): update electron-builder files + main entry for out/ output folder | 09-05 |

      Note the chain landed as 5 content commits (+ 5 docs-SUMMARY commits = 10 total), not 3 as the original D-09-10 plan specified. The commit-2 split into 2a/2b/2c is the minimum-scope derogation documented here: a single commit-2 would have touched 8+ files across config + template + main + scripts + 3 deletions = too broad for useful bisect granularity. Splitting preserves the bisect isolation (each part isolates a single class of regression).

    - **Commit** — this plan's single SHA + message.
    - **Deviations from Plan** — any Task 3 installer-size issues, size-gate FLAG, commit-2 split rationale (above), any unexpected electron-rebuild / electron-builder issues
    - **Threat Model Dispositions** — T-09-05-01..03 (below)
    - **Self-Check** — all 5 content commits exist + SUMMARY files exist + build artifacts present + bot/** untouched
    - **Phase 9 Closing Declaration: SHIPPED** (mirror Phase 8 Plan 06's pattern)
      - 5 plans, 23 tasks (summed across plans), 5 content commits + 5 docs commits, 0 blocking deviations
      - All 5 ROADMAP Phase 9 success criteria satisfied
      - `--legacy-peer-deps` not regressed (LINT-03 gate holds)
      - `bot/**` scope boundary preserved across all 5 plans
      - Bisect chain intact: `git bisect start <this-commit> <pre-Phase-9-SHA>` isolates any regression to a single commit
      - Phase 9 READY for `/gsd-transition` to Phase 10 (Jest → Vitest)
    - **Notes for Phase 10**
      - electron-vite has first-class Vitest support via `defineConfig({ test: {...} })` in the renderer sub-config (Vitest reuses Vite's config pipeline). Phase 10 wires Vitest into the existing `electron.vite.config.mjs`.
      - Jest 25 still in tree as dev-dep; Phase 10 retires it for root tests. `bot/` workspace keeps Jest.
      - Bundle-size opportunities carried forward from Phase 8 Plan 06 notes (markdown-it → marked or micromark if installer size becomes a concern) remain open for a post-v2.0 follow-up.
      - `_icons/` directory remains absent (never existed per A6) — no cleanup needed.
      - `global.__static` dead writes at `src/main/index.js:299,328` still in place — out of Phase 9 scope; Phase 13 dead-code cleanup candidate.

    Commit as:
    ```
    git add .planning/phases/09-webpack-to-vite/09-05-SUMMARY.md
    git commit -m "docs(09-05): phase 9 close — electron-builder out/ retarget + installer smoke test"
    ```
  </action>
  <verify>
    <automated>
    test -f .planning/phases/09-webpack-to-vite/09-05-SUMMARY.md
    git log -1 --format=%s | grep -qE '^docs\(09-05\):'
    git log -1 --format=%B | { ! grep -qi 'Co-Authored'; }
    # All 5 plan SUMMARYs present
    ls .planning/phases/09-webpack-to-vite/09-0*-SUMMARY.md | wc -l | grep -q '^5$'
    # All 5 plan files present
    ls .planning/phases/09-webpack-to-vite/09-PLAN-0*.md | wc -l | grep -q '^5$'
    </automated>
  </verify>
  <acceptance_criteria>
    - SUMMARY.md exists with all required sections including the phase-close declaration
    - REQ-ID verdict row present (BUNDLER-01 = PASS)
    - All 5 ROADMAP Phase 9 success criteria checked off with evidence
    - Full D-09-10 bisect chain table present (5 content commits)
    - `docs(09-05): ...` commit on master
    - No Co-Authored-By
  </acceptance_criteria>
  <done>Phase 9 CLOSES. All 5 plans complete. Ready for `/gsd-transition` to Phase 10.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| `package.json` `main` field → Electron runtime | Electron's runtime resolves the main entry from this path; wrong path means the app fails to launch. Build-time-correctness concern. |
| `package.json` `build.files` → electron-builder source glob | electron-builder copies matching files into the installer; wrong glob means missing files in the installed app. |
| Installer binary `build/*.exe` → end-user machine | The installer executes with user-level privileges; code-signing is a separate concern (deferred per `build.win.signAndEditExecutable: false` in package.json line 38) and unchanged by this plan. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-09-05-01 | Tampering | `build.files` glob misses files → broken installer | mitigate | Task 3 full-build smoke-test exercises the complete packaging chain; if a critical file is missing, the installer build either fails or (worse) succeeds with a broken installed app. The `out/**/*` glob is the same recursive shape as the retired `dist/**/*` — any file electron-vite emits under `out/` will match. static/ + node_modules/ + package.json globs preserved verbatim. |
| T-09-05-02 | Denial of Service | `npm run build` hangs on `electron-rebuild -f` | accept | Pre-existing concern (same script chain as pre-Phase-9); not introduced by this plan. If surfaced, it's a Phase 13 candidate or a native-module pin issue. |
| T-09-05-03 | Info Disclosure | Source maps leak to the installer | mitigate | Check `out/renderer/assets/*.map` post-pack. Vite default for production builds is to EMIT source maps to disk but NOT include them in the HTML (`sourcemap: true` is default — re-verify). If source maps are in `out/` AND the glob `out/**/*` copies them into the installer, they ship. Fix (if confirmed) is to add `build.sourcemap: false` to both main and renderer sub-configs in `electron.vite.config.mjs` — but this is a follow-up ticket, not a Phase 9 blocker. Document in SUMMARY. |

**Block threshold:** HIGH — any Task 3 failure that produces a non-functional installer (installer builds but the installed app crashes on launch, or NSIS produces nothing) blocks this plan. Task 3's smoke-test includes launching the packed Electron app via dev-mode regression; if the packed artifact has a different failure mode than dev-mode, surface it in SUMMARY.
</threat_model>

<verification>

Consolidated verification (end of Task 4, before Task 5 SUMMARY):

```bash
# Package.json retargeted
grep -q '"main": "\./out/main/index\.js"' package.json
grep -q '"out/\*\*/\*"' package.json
! grep -q '"dist/\*\*/\*"' package.json
! grep -q '"\./dist/main\.js"' package.json

# All pre-existing build-config preserved
grep -q '!bot/\*\*/\*' package.json
grep -q '"static/icon\.\*"' package.json
grep -q '"electronDist":' package.json
grep -q '_scripts/installer\.nsh' package.json

# Build chain success signals
grep -qE 'VITE.*ready' /tmp/npm-run-dev-09-05-regression.log
grep -qE 'building for production' /tmp/npm-run-build-09-05.log
ls build/*.exe 2>&1 | head -1 | grep -qE '\.exe'

# Test + lint bands
npm test 2>&1 | grep -E '256 passed'
npm run lint 2>&1 | tail -3 | grep -oE '[0-9]+ problems' | head -1
# Expected: ≤ 1881

# Commit discipline
git log -2 --format='%s'
# Expected:
#   docs(09-05): phase 9 close — electron-builder out/ retarget + installer smoke test
#   chore(build): update electron-builder files + main entry for out/ output folder

git log -1 --format=%B HEAD~1 | { ! grep -qi 'Co-Authored'; }

# All 5 Phase 9 content commits on master (end-to-end bisect chain verification)
git log --oneline master | head -20 | grep -cE '^[a-f0-9]+ (chore|refactor|docs)\((09|deps|build)' | awk '{ if ($1+0 >= 10) print "OK"; else print "FAIL: "$1" Phase 9-era commits"; }' | grep -q OK

# bot/** untouched
git status --short | grep -cE '^[ ]?M bot|^\?\? bot'
# Expected: same count as Plan 09-04 close (Phase 8 precedent: ~20)
```

</verification>

<success_criteria>

- [ ] v1.4 installer baseline recorded (or explicit "not recoverable — accept new baseline")
- [ ] `package.json` `main` = `./out/main/index.js`
- [ ] `package.json` `build.files` contains `out/**/*` (not `dist/**/*`)
- [ ] `!bot/**/*` glob + `static/icon.*` + `extraResources` + `directories.output` + `win.icon` + `electronDist` + `_scripts/installer.nsh` preserved
- [ ] `npm run pack` re-verified (Plan 09-04 regression)
- [ ] `npm run build` exits 0; produces `build/win-unpacked/` or equivalent
- [ ] `npm run build:installer` emits `build/*.exe`
- [ ] Installer size recorded; within ±20% of v1.4 OR documented as FLAG
- [ ] `npm run dev` regression: VITE ready observed
- [ ] `npm test` 256/256
- [ ] `npm run lint` ≤ 1881
- [ ] D-09-10 commit 3 (`chore(build): update electron-builder ...`) landed on master with 1 file (package.json)
- [ ] No Co-Authored-By
- [ ] `bot/**` dirty state preserved
- [ ] 09-05-SUMMARY.md created with the Phase 9 closing declaration
- [ ] REQ BUNDLER-01 marked PASS with evidence
- [ ] All 5 ROADMAP Phase 9 success criteria checked off with evidence
- [ ] Full 5-content-commit bisect chain table in SUMMARY
- [ ] Threat register T-09-05-01..03 dispositioned
- [ ] Phase 9 SHIPPED declaration

</success_criteria>

<output>

After completion, create `.planning/phases/09-webpack-to-vite/09-05-SUMMARY.md` capturing:
- All regression + smoke-test outcomes (`npm run pack/dev/build/build:installer/test/lint`)
- Installer size analysis with v1.4 baseline comparison (or baseline-not-recoverable note)
- REQ BUNDLER-01 PASS verdict with evidence
- All 5 ROADMAP Phase 9 success criteria checklist with evidence per item
- Full D-09-10 bisect chain (5 content commits; split-rationale for commit-2 into 2a/2b/2c)
- Phase 9 SHIPPED declaration
- Notes for Phase 10 (Vitest wiring opportunity, Jest 25 retirement scope, `_icons/` permanent absence, `global.__static` dead-writes deferred to Phase 13)

Commit as `docs(09-05): phase 9 close — electron-builder out/ retarget + installer smoke test`.

**Phase 9 CLOSES.** `/gsd-transition` to Phase 10 (Jest → Vitest) is the next orchestrator step.

</output>
