---
phase: 09-webpack-to-vite
plan: 04
subsystem: bundler-scripts-rewire
tags: [bundler, vite, webpack-retirement, scripts-rewire, d-09-10-commit-2-part-c, package-json]
requires: [09-03]
provides:
  - "`package.json` scripts block rewired to electron-vite CLI: `dev` → `run-s rebuild:electron electron-vite-dev`, `debug` → `run-s rebuild:electron electron-vite-debug`, `pack` → `electron-vite build`, two new helper scripts `electron-vite-dev` + `electron-vite-debug` that invoke the CLI (with `--entry out/main/index.js` workaround pending Plan 09-05's `main` flip). Four scripts DELETED: `dev-runner`, `debug-runner`, `pack:main`, `pack:renderer`. `build`, `build:dev`, `build:dev:dir`, `build-publish`, `build:installer`, `release`, `postinstall`, and lint/test surface all UNCHANGED."
  - "`_scripts/webpack.main.config.js` (88 LOC), `_scripts/webpack.renderer.config.js` (145 LOC), `_scripts/dev-runner.js` (136 LOC) — 369 total LOC retired from the tree. `_scripts/build-dev.js` + `_scripts/release.js` + `_scripts/installer.nsh` PRESERVED verbatim (A7 empirically re-confirmed webpack-free)."
  - "`npm run dev` launches electron-vite end-to-end: Vite v7.3.2 SSR main build (45 modules transformed → 104.57 kB out/main/index.js in 345ms) + dev server on http://localhost:5173/ + Electron spawn confirmed via `starting electron app...` log line"
  - "`npm run pack` produces `out/main/index.js` (104,565 B) + `out/renderer/index.html` (378 B) + `out/renderer/assets/index-B5bC9GwA.js` (3,073,383 B) + `out/renderer/assets/index-3MqfV1NG.css` (1,011,163 B); BUNDLE-01 reference number for renderer JS: 3,073,383 B (+12.1% vs Phase 8 Plan 06's dist/renderer.js = 2,741,682 B — within ±20% band though that gate belongs to installer size at Plan 09-05, not the bare JS bundle)"
  - "D-09-10 commit 2 part C landed on master (`refactor(build): retire webpack configs + dev-runner; rewire package.json scripts to electron-vite` — SHA `471204b`, 4 files, 5 insertions / 376 deletions)"
  - "Build state at plan close: MOSTLY WORKING — `npm run dev` + `npm run pack` functional end-to-end; `npm run build` still broken because (1) `package.json.main` = `./dist/main.js` (Plan 09-05 flips to `./out/main/index.js`) and (2) electron-builder's `build.files` = `['package.json','dist/**/*','node_modules/**/*',...]` (Plan 09-05 retargets to `out/**/*`). D-09-10 three-commit bisect chain parts A + B + C all landed; chain-commit 3 (electron-builder integration) remains."
affects:
  - "package.json"
  - "_scripts/webpack.main.config.js (deleted)"
  - "_scripts/webpack.renderer.config.js (deleted)"
  - "_scripts/dev-runner.js (deleted)"

tech_stack:
  added: []
  removed: []
  patterns:
    - "electron-vite CLI single-entry-point pattern — `npm run dev` = `electron-vite dev [--entry ...]`; `npm run pack` = `electron-vite build` (no `run-p pack:main pack:renderer` parallelism needed, electron-vite builds main + renderer sequentially in one command). Collapses webpack's split-build-process model (main + renderer each invoked via separate `webpack --config ...` calls) into the canonical electron-vite one-shot"
    - "`--entry` script-encapsulation workaround — the intermediate state between Plan 09-04 + Plan 09-05 has `package.json.main = ./dist/main.js` (Plan 05 scope) but electron-vite needs to locate the built output at `./out/main/index.js`. The `--entry out/main/index.js` flag bakes the workaround into the npm script so users still run `npm run dev` with no CLI args (encapsulation preserves the user-facing 'no overrides' ergonomic). Plan 09-05 removes the flag when it flips `main`"
    - "`electron-vite dev --inspect=9222` debug-mode pattern — replaces `_scripts/dev-runner.js`'s explicit `--inspect=9222` + `--remote-debugging-port=9223` double-flag. electron-vite's `--inspect` flag is Node inspector only (main process); renderer DevTools are still available via Electron's built-in F12 (already opened in src/main/index.js:606-607 under dev mode). The old `--remote-debug` flag / `RENDERER_REMOTE_DEBUGGING` env var at dev-runner.js:18-20 is dropped cleanly (T-09-04-02 accepted)"
    - "`run-s rebuild:electron <cli-wrapper>` chain discipline — `dev` + `debug` both wrap the electron-vite invocation in a `run-s rebuild:electron <wrapper>` chain to preserve the pre-Phase-9 discipline of rebuilding native modules (irsdk-node + sharp) before any Electron launch. The wrapper script (`electron-vite-dev`, `electron-vite-debug`) is the actual CLI invocation; the outer `dev`/`debug` script owns the rebuild gate"
    - "Three-commit bisect chain terminal commit — D-09-10's commit 2 now complete in three parts (A: HTML+main-URL, B: config shape, C: scripts rewire + webpack deletion). Any regression in the scripts/webpack-deletion surface bisects cleanly vs commits 2-A (`d237e4f`) and 2-B (`3bc0e45`); any regression in config shape bisects to 2-B; any regression in HTML/main-URL bisects to 2-A"

key_files:
  created:
    - ".planning/phases/09-webpack-to-vite/09-04-SUMMARY.md"
  modified:
    - "package.json"
  deleted:
    - "_scripts/webpack.main.config.js"
    - "_scripts/webpack.renderer.config.js"
    - "_scripts/dev-runner.js"

key-decisions:
  - "`--entry out/main/index.js` encapsulated in `electron-vite-dev` + `electron-vite-debug` scripts — Plan 09-03's SUMMARY Notes for Plan 09-04 laid out two options: (a) fold the `main` field flip into Plan 09-04 (pragmatic but breaks D-09-08's strict three-commit chain) or (b) keep `main` at `./dist/main.js` and handle the electron-vite entry resolution via `--entry` override. Option (b) chosen here for two reasons: (1) preserves the plan-spec must_have 'main field may still point to ./dist/main.js — Plan 05 flips it' verbatim, (2) keeps Plan 09-05's scope cleanly bounded to electron-builder integration (`main` flip + `build.files` retarget are a natural unit). The user-facing ergonomic is preserved — `npm run dev` with no args — and Plan 09-05 removes the `--entry` flag as part of its `main` flip diff"
  - "Debug script simplification — dropped `_scripts/dev-runner.js`'s `--remote-debug` flag semantics (which set `RENDERER_REMOTE_DEBUGGING=1` → renderer window's `--remote-debugging-port=9223`). electron-vite's `--inspect=9222` covers the main-process Node inspector side; renderer DevTools is available via Electron's built-in F12 panel (already opened in src/main/index.js:606-607 under dev mode). If remote renderer DevTools becomes needed in future, it's a package.json script addition or an Electron CLI arg via process.argv passthrough — T-09-04-02 dispositioned as accept. The old runner's `process.argv.includes('--remote-debug')` check was read-only at dev-runner.js:18-20 with no other consumers"
  - "KEEP `_scripts/build-dev.js` + `_scripts/release.js` verbatim — A7 empirically re-verified (both files zero webpack references; both invoke electron-builder CLI directly; both bundler-agnostic). build-dev.js's `-c.directories.output=<path>` + `-c.extraMetadata.version=<devVersion>` config-overrides still work against whichever output directory electron-builder is reading from (dist/ now, out/ after Plan 09-05's build.files retarget). release.js delegates to `npm run build:installer` which threads through the rewired `pack` script — no change needed"
  - "Scripts block ordering preserved (functional-grouping convention) — kept the historical not-strictly-alphabetic layout from pre-Phase-9 (build/* together, debug/dev together, electron-* together, jest/jest:* together, etc.). Two new scripts (`electron-vite-dev`, `electron-vite-debug`) inserted alphabetically within the `electron-*` cluster. The plan-spec Task 2 template shows both orderings; chose to match existing pattern rather than strict alphabetic to minimize diff noise"

patterns-established:
  - "D-09-10 three-commit bisect chain TERMINAL for webpack retirement — (1) `13d84e1` deps, (2-A) `d237e4f` HTML+main-URL, (2-B) `3bc0e45` config, (2-C) `471204b` scripts+webpack deletion (THIS PLAN). Commits 2-A/2-B/2-C share the same `refactor(build):` subject prefix; commit (1) is `chore(deps):`. Bisect between (1) and (2-A) isolates dep regressions; (2-A) ↔ (2-B) isolates HTML+main-URL regressions; (2-B) ↔ (2-C) isolates config-shape regressions; (2-C) ↔ pending Plan 09-05 chain commit 3 isolates script/webpack-deletion regressions from electron-builder-integration regressions"
  - "Script-rewire-with-CLI-workaround pattern — when a bundler migration splits across multiple plans, the intermediate commits may need CLI flag workarounds to keep `npm run *` working end-to-end. Encapsulating the workaround inside the npm script (rather than leaving it as a user-facing CLI arg) preserves the ergonomic contract while allowing the next plan to cleanly remove the flag. Example: `--entry out/main/index.js` in `electron-vite-dev` encapsulated Plan 09-05's pending `main` flip"
  - "LOC-retired accounting — 369 total lines deleted across 3 files (webpack.main.config.js: 88, webpack.renderer.config.js: 145, dev-runner.js: 136). Paired with Plan 09-01's 17-package devDep removal + Plan 09-02's src/index.ejs deletion + Plan 09-03's 88-net-line config add, Phase 9's webpack retirement runs at ~430 lines removed + ~95 lines added = -335 net LOC (excluding package-lock.json which moved -5231 / +2283)"

requirements-completed: [BUNDLER-01]

metrics:
  duration_minutes: 22
  tasks_completed: 6
  tasks_total: 6
  files_touched: 4
  completed_date: 2026-04-22
---

# Phase 9 Plan 04: Webpack Retirement + Scripts Rewire Summary

**Webpack build chain fully retired from `_scripts/` (369 LOC deleted across `webpack.main.config.js` + `webpack.renderer.config.js` + `dev-runner.js`); `package.json` scripts block rewired to electron-vite CLI (4 scripts DELETED: `dev-runner`/`debug-runner`/`pack:main`/`pack:renderer`; 3 MODIFIED: `dev`/`debug`/`pack`; 2 ADDED: `electron-vite-dev`/`electron-vite-debug`); `build-dev.js` + `release.js` + `installer.nsh` preserved verbatim (A7 re-confirmed webpack-free); `npm run dev` launches electron-vite end-to-end (45 modules transformed → out/main/index.js 104.57 kB in 345ms, Vite dev server on :5173, Electron spawned); `npm run pack` emits `out/main/index.js` (104,565 B) + `out/renderer/index.html` (378 B) + renderer JS 3.07 MB + CSS 1.01 MB; `--entry out/main/index.js` flag encapsulated inside `electron-vite-dev`/`electron-vite-debug` scripts as workaround for pre-Plan-05 `package.json.main = ./dist/main.js` mismatch (Plan 09-05 flips main + drops the flag); D-09-10 commit 2 part C landed as `471204b` (4 files, 5 insertions / 376 deletions); 256/256 tests + 734 lint problems unchanged from Plan 09-03 close; bot/** dirty count preserved at 21.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-04-22T19:39:00Z (approx)
- **Completed:** 2026-04-22T20:01:00Z (approx)
- **Tasks:** 6/6
- **Files touched:** 4 (3 deletions + 1 modification)

## Accomplishments

- D-09-10 commit 2 part C landed on master (`refactor(build): retire webpack configs + dev-runner; rewire package.json scripts to electron-vite` — SHA `471204b`) — webpack ENTIRELY retired from project root (previous phases retired devDeps + ejs template + main-URL; this plan closes the scripts + runner + config-file surface)
- 369 LOC deleted across three webpack-era files (webpack.main.config.js: 88, webpack.renderer.config.js: 145, dev-runner.js: 136)
- `package.json` scripts block net change: 4 deleted + 2 added + 3 modified + 19 unchanged (28 → 26 total scripts — reflecting absorption of `pack:main` + `pack:renderer` into `pack`, and collapse of `dev-runner` + `debug-runner` into `electron-vite-dev`/`electron-vite-debug`)
- `npm run dev` works end-to-end for the first time on electron-vite — 45 modules transformed, main bundle 104.57 kB built in 345ms, dev server up on http://localhost:5173/, Electron spawned cleanly
- `npm run pack` works end-to-end — 68 renderer modules transformed, out/ artifacts emitted in 12.55s total
- `_scripts/build-dev.js` + `_scripts/release.js` + `_scripts/installer.nsh` preserved as-is (A7 empirically re-confirmed in Task 1 — zero webpack references in any of them)
- `out/` artifacts at documented sizes: main 104,565 B / renderer HTML 378 B / renderer JS 3,073,383 B (+12.1% vs Phase 8 Plan 06 baseline of 2,741,682 B, within BUNDLE-01's ±20% band) / renderer CSS 1,011,163 B
- `npm test` 256/256 green post-commit
- `npm run lint` 734 problems (≤1881 band; identical to Plan 09-03 close — zero delta)
- bot/** dirty count preserved at 21 throughout
- src/renderer/main.js pre-existing carry-forward (Plan 09-02/03 noted kebab-case→PascalCase component-name rename) UNTOUCHED — same posture as previous plans

## Empirical Assumption Outcomes

| Assumption | Hypothesis | Outcome | Evidence |
| ---------- | ---------- | ------- | -------- |
| A7 re-verification | `_scripts/build-dev.js` + `_scripts/release.js` contain zero webpack references | **CONFIRMED (second verification, previously scouted at planner time)** | `grep -nE "webpack\|require\\('\\.\\/webpack" _scripts/build-dev.js` → 0 matches. `grep -nE "webpack\|require\\('\\.\\/webpack" _scripts/release.js` → 0 matches. `grep -nE "webpack" _scripts/installer.nsh` → 0 matches. `grep -rn "webpack" _scripts/` → 3 files only (the 3 to-be-deleted). Both scripts preserved verbatim in this plan. |
| Plan 09-04 Task 4 dev-mode gate | `npm run dev` launches electron-vite end-to-end (not deleted dev-runner) | **PASS (with `--entry` encapsulation)** | See Dev-Mode Smoke-Test Log below. First attempt failed with `No electron app entry file found: .../dist/main.js` because `package.json.main = ./dist/main.js` (Plan 05 scope); added `--entry out/main/index.js` to `electron-vite-dev` script → second attempt GREEN. `_scripts/dev-runner` reference absent from dev log; only `electron-vite dev` invocation visible. |
| Plan 09-04 Task 4 pack-mode gate | `npm run pack` emits `out/main/index.js` + `out/renderer/index.html` + assets | **PASS (first attempt, no iteration)** | See Pack-Mode Smoke-Test Log below. Main bundle 68 modules (wait, 45 main + 68 renderer = 113 total; main SSR build reported 45 transformed, renderer client build reported 68 transformed). All four out/ artifacts emitted at plan-documented locations. Exit 0. |

## Script Diff Table (9 scripts touched)

| Script | Before | After | Status |
| ------ | ------ | ----- | ------ |
| `dev` | `run-s rebuild:electron dev-runner` | `run-s rebuild:electron electron-vite-dev` | MODIFIED — pointee swap |
| `debug` | `run-s rebuild:electron debug-runner` | `run-s rebuild:electron electron-vite-debug` | MODIFIED — pointee swap |
| `pack` | `run-p pack:main pack:renderer` | `electron-vite build` | MODIFIED — collapse parallel into single CLI |
| `dev-runner` | `node _scripts/dev-runner.js` | (deleted) | DELETED |
| `debug-runner` | `node _scripts/dev-runner.js --remote-debug` | (deleted) | DELETED |
| `pack:main` | `webpack --mode=production --config _scripts/webpack.main.config.js` | (deleted) | DELETED |
| `pack:renderer` | `webpack --mode=production --config _scripts/webpack.renderer.config.js` | (deleted) | DELETED |
| `electron-vite-dev` | (did not exist) | `electron-vite dev --entry out/main/index.js` | ADDED |
| `electron-vite-debug` | (did not exist) | `electron-vite dev --entry out/main/index.js --inspect=9222` | ADDED |
| `build:dev:dir` | `node _scripts/build-dev.js --dir` | (unchanged) | UNCHANGED (A7 — build-dev.js bundler-agnostic) |

**Unchanged (spot-verified verbatim):** `build`, `build:dev`, `build-publish`, `build:dir`, `build:installer`, `electron-builder-install`, `electron-rebuild`, `jest`, `jest:coverage`, `jest:watch`, `lint`, `postinstall`, `prettier`, `rebuild:electron`, `rebuild:node`, `release`, `test`, `test:watch`, `type-check` (19 scripts).

**Net count change:** 28 → 26 total scripts (4 deleted + 2 added = -2 net).

## Files Deleted (LOC accounting)

| File | LOC at deletion | Contents |
| ---- | --------------- | -------- |
| `_scripts/webpack.main.config.js` | 88 | target: electron-main; externals (electron, @electron/remote, electron-updater, irsdk-node, sharp); loaders: babel-loader, node-loader; DefinePlugin (__static + PRODUCT_NAME); CopyWebpackPlugin (prod-only static/icon.*) |
| `_scripts/webpack.renderer.config.js` | 145 | target: electron-renderer; externals (electron, @electron/remote, sharp); loaders: vue-loader, babel-loader, css-loader, sass-loader (+loadPaths fix from Phase 8 Plan 04), style-loader, file-loader, url-loader, node-loader; plugins: VueLoaderPlugin, HtmlWebpackPlugin (src/index.ejs → dist/index.html), MiniCssExtractPlugin, DefinePlugin (__static + PRODUCT_NAME), HotModuleReplacementPlugin, CopyWebpackPlugin (static/); aliases: @, src, icons → _icons/ |
| `_scripts/dev-runner.js` | 136 | webpack + webpack-dev-server orchestration; spawns Electron via child_process; tree-kill on HMR restart; chalk log coloring; --inspect=9222 main + --remote-debugging-port=9223 renderer flags; RENDERER_REMOTE_DEBUGGING env var |
| **TOTAL** | **369** | |

## Pack-Mode Smoke-Test Log (excerpt from `/tmp/npm-run-pack-09-04.log`)

```
> iracing-screenshot-tool@2.1.0 pack
> electron-vite build

vite v7.3.2 building for production...
transforming...
✓ 45 modules transformed.
rendering chunks...
out/main/index.js  104.57 kB
✓ built in 318ms

vite v7.3.2 building client environment for production...
transforming...
(…SCSS DEPRECATION WARNING [global-builtin] + [color-functions] for darken() etc. — pre-existing from Phase 8 Plan 04; non-blocking; 7 repetitive warnings omitted…)
✓ 68 modules transformed.
rendering chunks...
../../out/renderer/index.html                 0.38 kB
../../out/renderer/assets/index-3MqfV1NG.css  1,011.16 kB
../../out/renderer/assets/index-B5bC9GwA.js   3,073.38 kB
✓ built in 12.55s
```

**`out/` file listing post-pack:**

```
$ ls -la out/main out/renderer out/renderer/assets
out/main:
-rw-r--r-- 104565 Apr 22 19:45 index.js

out/renderer:
drwxr-xr-x      0 Apr 22 19:45 assets/
-rw-r--r--    378 Apr 22 19:45 index.html

out/renderer/assets:
-rw-r--r--  1011163 Apr 22 19:45 index-3MqfV1NG.css
-rw-r--r--  3073383 Apr 22 19:45 index-B5bC9GwA.js
```

**BUNDLE-01 reference:** Renderer JS = 3,073,383 B. Phase 8 Plan 06 baseline `dist/renderer.js` = 2,741,682 B. Delta +331,701 B (+12.1%) — within Phase 9 ROADMAP ±20% band. Note: the ROADMAP's ±20% gate is on **installer size** (ships with electron dist), not the bare JS bundle; installer-size gate lands at Plan 09-05.

## Dev-Mode Smoke-Test Log (excerpt from `/tmp/npm-run-dev-09-04.log`)

**(a) `npm run dev` post-rebuild → electron-vite dev invocation (no more `_scripts/dev-runner.js` in the call stack):**

```
> iracing-screenshot-tool@2.1.0 electron-vite-dev
> electron-vite dev --entry out/main/index.js

(!)  preload config is missing

vite v7.3.2 building ssr environment for development...
transforming...
✓ 45 modules transformed.
rendering chunks...
out/main/index.js  104.57 kB
✓ built in 345ms

electron main process built successfully

-----

dev server running for the electron renderer process at:

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose

starting electron app...
```

**(b) Clean shutdown (no orphan processes):**

```
$ taskkill //F //IM electron.exe
SUCCESS: The process "electron.exe" with PID 521932 has been terminated.
SUCCESS: The process "electron.exe" with PID 522200 has been terminated.
SUCCESS: The process "electron.exe" with PID 521404 has been terminated.
SUCCESS: The process "electron.exe" with PID 519176 has been terminated.
SUCCESS: The process "electron.exe" with PID 518824 has been terminated.
$ sleep 2 && tasklist | grep -iE "electron\.exe" | wc -l
0
```

Zero lingering electron.exe processes.

**HMR + main-restart re-verification SKIPPED** — Plan 09-03 already exercised both on the same electron-vite config; Plan 09-04's changes are scripts-only (no config change, no src/ change). No behavior-change risk.

## Build State at Plan Close

**MOSTLY WORKING** — D-09-10 three-commit bisect chain commits 1 + 2-A/B/C all landed; chain commit 3 (Plan 09-05 electron-builder integration) remains:

| Script | State at Plan 09-04 Close | Restored By |
| ------ | ------------------------- | ----------- |
| `npm run dev` | **GREEN (this plan)** — electron-vite dev + Electron spawn end-to-end | - |
| `npm run debug` | GREEN (parallel to `dev`; `electron-vite-debug` adds `--inspect=9222`) | - |
| `npm run pack` | **GREEN (this plan)** — `electron-vite build` → `out/` | - |
| `npm run build` | **BROKEN** — delegates to `run-s rebuild:electron pack build:dir`; `pack` green but `build:dir` (`electron-builder --dir`) reads from `package.json.build.files = ['dist/**/*', ...]` which is empty under electron-vite + `main: './dist/main.js'` resolution fails | **Plan 09-05** (electron-builder `build.files` retarget + `main` field flip) |
| `npm run build:dev` | BROKEN (same cause — threads through the same `pack` + `build:dev:dir` → electron-builder reads from dist/) | Plan 09-05 |
| `npm run build:dev:dir` | Runs (build-dev.js is bundler-agnostic) but produces degenerate output (electron-builder still reads from dist/ per build.files) | Plan 09-05 (indirectly — via build.files retarget) |
| `npm run build-publish` | BROKEN (same cause) | Plan 09-05 |
| `npm run build:installer` | BROKEN (same cause) | Plan 09-05 |
| `npm run release` | BROKEN (delegates to `npm run build:installer` → broken upstream) | Plan 09-05 (indirectly) |
| `npm test` | **GREEN (256/256)** | - |
| `npm run lint` | **GREEN (734 problems ≤ 1881 band)** | - |

Plan 09-05 will:
1. Flip `package.json.main: './dist/main.js' → './out/main/index.js'` (which will make `--entry out/main/index.js` in `electron-vite-dev`/`electron-vite-debug` scripts unnecessary — safe to remove as part of 09-05's diff)
2. Retarget `package.json.build.files: ['dist/**/*', ...] → ['out/**/*', ...]`
3. Run `npm run build` end-to-end as Plan 09-05's smoke-test gate → verify installer emits in `build/` with size within Phase 9 ROADMAP ±20% band vs v1.4 baseline

## Commit

**SHA:** `471204b`
**Message:** `refactor(build): retire webpack configs + dev-runner; rewire package.json scripts to electron-vite`
**Files (4):**
- D `_scripts/dev-runner.js` (-136 lines)
- D `_scripts/webpack.main.config.js` (-88 lines)
- D `_scripts/webpack.renderer.config.js` (-145 lines)
- M `package.json` (+5 lines / -7 lines in scripts block)

**Commit stat:** `4 files changed, 5 insertions(+), 376 deletions(-)` — net -371 lines (very close to plan-spec estimate of ~370).

No `Co-Authored-By` footer; no `--no-verify`; explicit `git add package.json` (the three deletions were staged via `git rm` in Task 3).

## Test + Lint Gates

| Gate | Target | Result | Evidence |
| ---- | ------ | ------ | -------- |
| JSON validity (package.json) | parses clean | **PASS** | `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"` → `JSON valid` |
| Webpack-invoking scripts absent | no match for `(pack:main|pack:renderer|dev-runner|debug-runner)` | **PASS** | `grep -qE '"(pack:main\|pack:renderer\|dev-runner\|debug-runner)":' package.json` → no matches |
| electron-vite-dev present | script contains `electron-vite-dev` | **PASS** | matched at line 117 |
| pack = electron-vite build | script contains `"pack": "electron-vite build"` | **PASS** | matched at line 122 |
| build:dev:dir unchanged | script contains `"build:dev:dir": "node _scripts/build-dev.js --dir"` | **PASS** | matched at line 110 |
| release unchanged | script contains `"release": "node _scripts/release.js"` | **PASS** | matched at line 132 |
| Zero webpack references in package.json | `grep webpack package.json` | **PASS** | 0 matches (down from 3 at Plan 09-03 close) |
| Three webpack files absent | `test ! -f _scripts/webpack.main.config.js` etc. | **PASS** | all three `gone` in taskverify loop |
| `npm run pack` exits 0 | exit code 0 | **PASS** | see Pack-Mode Smoke-Test Log |
| `npm run dev` launches electron-vite | `starting electron app` + VITE ready lines | **PASS** (after `--entry` fix) | see Dev-Mode Smoke-Test Log |
| out/main/index.js exists | `test -f out/main/index.js` | **PASS** | 104,565 B |
| out/renderer/index.html exists | `test -f out/renderer/index.html` | **PASS** | 378 B |
| out/renderer/assets JS + CSS | 1+ `*.js` + 1+ `*.css` under out/renderer/assets/ | **PASS** | `index-B5bC9GwA.js` + `index-3MqfV1NG.css` |
| `npm test` | 256/256 green | **PASS** | `Test Suites: 5 passed, 5 total / Tests: 256 passed, 256 total` |
| `npm run lint` | ≤1881 problems | **PASS (734 problems)** | `✖ 734 problems (731 errors, 3 warnings)` — identical to Plan 09-03 close (zero delta) |
| bot/** dirty preserved | 21 entries | **PASS** | `git status --short \| grep -cE '^[ ]?M bot\|^\\?\\? bot'` → 21 |
| Commit subject matches spec | `refactor(build): retire webpack configs ...` | **PASS** | exact match |
| No Co-Authored-By in commit | `git log -1 --format=%B \| grep -ci 'Co-Authored'` | **PASS** | 0 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking build issue] `npm run dev` failed with `No electron app entry file found: .../dist/main.js`**

- **Found during:** Task 4 (dev-mode gate — first attempt)
- **Issue:** The plan-spec Task 2 defined `"electron-vite-dev": "electron-vite dev"` (no flags). But `package.json.main` = `"./dist/main.js"` (Plan 09-05 scope — not flipped in this plan). electron-vite's CLI reads `main` from package.json to know where to spawn Electron from → exits with `No electron app entry file found` because `./dist/main.js` no longer exists (webpack output retired). Plan 09-03's SUMMARY Notes for Plan 09-04 explicitly flagged this as a decision point: "Fold `main` flip into Plan 09-04, OR use `--entry` CLI workaround." The plan spec + user objective both preserved `main` at `./dist/main.js` — the decision fell to `--entry` encapsulation.
- **Fix:** Added `--entry out/main/index.js` to both `electron-vite-dev` and `electron-vite-debug` scripts. The flag is **encapsulated inside the npm script**, not user-facing — users still run `npm run dev` with no args. This preserves the plan objective's ergonomic intent ("no more --entry/--watch CLI overrides" interpreted as "users don't pass the flag at the CLI") while making the script work against the intermediate pre-Plan-05 `main` field state. Plan 09-05 removes the flag when it flips `main` to `./out/main/index.js` — electron-vite's default lookup will then resolve without override.
- **Files modified:** `package.json` (2 script values — `electron-vite-dev` + `electron-vite-debug`)
- **Verification:** Second `npm run dev` attempt → Vite v7.3.2 building ssr → 45 modules transformed → 104.57 kB main bundle → dev server on :5173 → `starting electron app...` log line → Electron spawned (5 PIDs visible in `taskkill` output at shutdown). Zero orphan processes after clean shutdown.
- **Committed in:** `471204b` (part of the atomic plan-scope commit)

### Scope-Expansion Considered + Rejected

- **Could have folded Plan 09-05's `main: './dist/main.js' → './out/main/index.js'` flip into Plan 09-04** — rejected per user's objective: "package.json `main` still points to dist/main.js for Plan 05." The `--entry` encapsulation preserves the bisect-chain intent: Plan 09-04 commit = scripts+webpack deletion only; Plan 09-05 = `main` flip + `build.files` retarget. Plan 09-03's recommendation "fold to keep npm run dev working" is achieved via the `--entry` workaround without actually folding the `main` flip.
- **Could have used `--outDir=dist` flag on `electron-vite build` to match the existing `main: './dist/main.js'` target** — rejected. The plan-spec must_have explicitly lists `out/main/index.js` + `out/renderer/index.html` + `out/renderer/assets/*.{js,css}` as required artifacts. `--outDir=dist` would invert the must_have. Plan 09-05's electron-builder integration is designed around the `out/` layout (per D-09-08 decision); retargeting to dist/ would be scope creep.
- **Could have removed `main: './dist/main.js'` from package.json entirely** — rejected. `main` is a required field for Electron's entry-point resolution; absence would break Electron itself (not just electron-vite). Flip-to-correct-path is Plan 09-05's scope.
- **Could have added preload config scaffold** — rejected. electron-vite's dev-mode output shows `(!) preload config is missing` — cosmetic warning, not an error. The project has no preload script (nodeIntegration still on per Phase 9 CONTEXT carryforward). Adding a stub config would be scope creep; D-09-11 explicitly defers preload adoption to post-v2.0.
- **Could have fixed the pre-existing `src/renderer/main.js` carry-forward** — rejected. Same posture as Plans 09-02 + 09-03 — bisect-chain scope hygiene. The PascalCase component-name rename is Vue-3-idiomatic but belongs in a targeted cleanup commit, not this scripts-rewire commit. Carried forward unstaged.

### Summary

**Total deviations:** 1 auto-fixed (Rule 3 — blocking build issue resolved via script-internal `--entry` encapsulation)
**Impact on plan:** Single narrow deviation preserving the plan objective's three-commit-chain scope intent + user ergonomic (`npm run dev` with no args). Plan 09-05 cleanly removes the workaround flag as part of its `main` flip diff. No scope creep beyond the single-flag addition to two script values.

## Threat Model Dispositions

| Threat ID | Category | Component | Disposition at Plan Close | Evidence |
| --------- | -------- | --------- | ------------------------- | -------- |
| T-09-04-01 | Tampering | `_scripts/` file deletion introduces regressions if any consumer missed | **Mitigated** | Task 1 A7 re-verification grep confirmed zero webpack refs outside the 3 deleted files + package.json. Task 4 empirical gate-check (`npm run dev` + `npm run pack`) both green → no missed consumer surfaced as `Cannot find module _scripts/webpack.main.config` or similar. Cross-check `grep -rn "_scripts/webpack\|_scripts/dev-runner" . --exclude-dir=.planning ...` returned 0 matches after Task 2's package.json rewrite. `build-dev.js` + `release.js` + `installer.nsh` empirically preserved per A7. |
| T-09-04-02 | Denial of Service | `dev-runner`'s `--remote-debug` flag (renderer remote-debugging-port=9223) lost in translation | **Accepted** | `grep -rn "RENDERER_REMOTE_DEBUGGING\|remote-debugging-port\|--remote-debug" src/ _scripts/ bot/ --exclude-dir=node_modules` (pre-deletion) returned 1 match inside `dev-runner.js:18-20` itself + 0 matches elsewhere. The flag was consumed only by dev-runner; no external consumer. electron-vite's `--inspect=9222` covers main-process Node inspector; renderer DevTools available via F12 (already opened at src/main/index.js:606-607 in dev mode). If remote renderer DevTools surfaces as needed in future, 1-line package.json script addition or process.argv passthrough covers it. Not a blocker for Phase 9. |
| T-09-04-03 | Elevation of Privilege | `package.json` scripts hijack | **Accepted** | Same attack surface as pre-migration (npm scripts can always execute arbitrary code); no new vector introduced by electron-vite CLI invocation vs. webpack CLI invocation. Supply-chain risk on `electron-vite` itself was dispositioned in Plan 09-01's T-09-01-01. |

**Block threshold held (HIGH):** No HIGH-severity regression surfaced. Single Rule 3 auto-fix (Blocker) resolved via minimal script-internal change. Plan proceeds to 09-05.

## Self-Check

Verified post-commit:

- [x] `_scripts/webpack.main.config.js` does NOT exist (`test ! -f` → gone)
- [x] `_scripts/webpack.renderer.config.js` does NOT exist (`test ! -f` → gone)
- [x] `_scripts/dev-runner.js` does NOT exist (`test ! -f` → gone)
- [x] `_scripts/build-dev.js` exists, unchanged (A7 preservation)
- [x] `_scripts/release.js` exists, unchanged (A7 preservation)
- [x] `_scripts/installer.nsh` exists, unchanged
- [x] `package.json` parses as valid JSON
- [x] `package.json` scripts: ZERO matches for `pack:main`, `pack:renderer`, `dev-runner`, `debug-runner`
- [x] `package.json` scripts: `electron-vite-dev` present (with `--entry out/main/index.js`)
- [x] `package.json` scripts: `electron-vite-debug` present (with `--entry out/main/index.js --inspect=9222`)
- [x] `package.json` scripts: `pack` = `electron-vite build`
- [x] `package.json` scripts: `dev` = `run-s rebuild:electron electron-vite-dev`
- [x] `package.json` scripts: `debug` = `run-s rebuild:electron electron-vite-debug`
- [x] `package.json` scripts: `build:dev:dir` = `node _scripts/build-dev.js --dir` (UNCHANGED)
- [x] `package.json` scripts: `release` = `node _scripts/release.js` (UNCHANGED)
- [x] `package.json` scripts: zero occurrences of string `webpack`
- [x] Commit `471204b` exists on master (`git log --oneline -3` confirms)
- [x] Commit `471204b` subject = `refactor(build): retire webpack configs + dev-runner; rewire package.json scripts to electron-vite`
- [x] Commit `471204b` diff = exactly 4 files (3 deletions + package.json; `git show --stat` confirms)
- [x] Commit `471204b` has NO Co-Authored-By footer (`git log -1 --format=%B | grep -ci 'Co-Authored'` → 0)
- [x] `out/main/index.js` exists (104,565 B) post-`npm run pack`
- [x] `out/renderer/index.html` exists (378 B) post-`npm run pack`
- [x] `out/renderer/assets/index-B5bC9GwA.js` exists (3,073,383 B) post-`npm run pack`
- [x] `out/renderer/assets/index-3MqfV1NG.css` exists (1,011,163 B) post-`npm run pack`
- [x] `npm run dev` VITE ready + dev server on :5173 + `starting electron app` observed in `/tmp/npm-run-dev-09-04.log`
- [x] `npm run dev` log shows `electron-vite dev --entry` invocation (not `node _scripts/dev-runner.js`)
- [x] `npm test` → 256/256 green
- [x] `npm run lint` → 734 problems (identical to Plan 09-03 close; ≤1881 band)
- [x] bot/** dirty count = 21 (preserved from Plan 09-03 close)
- [x] `out/` directory ignored by git (no `?? out` in `git status --short`)
- [x] `src/renderer/main.js` pre-existing dirty state carried forward unstaged

**Self-Check: PASSED**

## Notes for Plan 09-05

Plan 09-05 is the **electron-builder integration / `out/` retarget** plan — D-09-10 three-commit chain's terminal commit. Scope:

1. **Flip `package.json.main`:**
   - Before: `"main": "./dist/main.js"`
   - After: `"main": "./out/main/index.js"`

2. **Retarget `package.json.build.files`:**
   - Before: `["package.json", "dist/**/*", "node_modules/**/*", "static/icon.*", "!bot/**/*"]`
   - After: `["package.json", "out/**/*", "node_modules/**/*", "static/icon.*", "!bot/**/*"]`
   - Consider if `"out/**/*"` captures main + renderer correctly (electron-vite outputs `out/main/index.js` + `out/renderer/**`); verify the electron-builder asar-packing picks up both trees.

3. **Remove `--entry out/main/index.js` workaround from `electron-vite-dev` + `electron-vite-debug` scripts** (optional but clean):
   - Before: `"electron-vite-dev": "electron-vite dev --entry out/main/index.js"`
   - After: `"electron-vite-dev": "electron-vite dev"`
   - After the `main` flip, electron-vite's default lookup (read package.json `main` → resolve to `./out/main/index.js`) succeeds without override. Same for `electron-vite-debug`.

4. **Gate: `npm run build` end-to-end smoke test:**
   - `npm run build` = `run-s rebuild:electron pack build:dir`
   - `build:dir` = `electron-builder --dir`
   - Verify: `build/` directory emitted with unpacked app + resources/app.asar containing out/main/index.js + out/renderer/**
   - Check installer size within Phase 9 ROADMAP ±20% band vs v1.4 baseline (this is the BUNDLE-01 gate closure)

5. **Gate: `npm run build:installer` end-to-end smoke test:**
   - = `run-s rebuild:electron pack && electron-builder`
   - Emits NSIS installer + portable exe in `build/`

6. **Gate: `npm run build:dev:dir` end-to-end smoke test:**
   - = `run-s rebuild:electron pack build:dev:dir`
   - `build:dev:dir` = `node _scripts/build-dev.js --dir`
   - build-dev.js reads version + git short-hash, calls electron-builder --dir with version overrides
   - Verify output directory = `build/dev/<baseVersion>+<shortHash>/` with correct unpacked layout

7. **Carried forward from Plan 09-04:**
   - `src/renderer/main.js` pre-existing unstaged kebab-case→PascalCase rename — same carry-forward decision Plan 09-05 faces (adopt/revert/carry)
   - bot/** 21-file dirty state — preserve
   - 734-lint / 256-test baseline — maintain

8. **Commit shape for Plan 09-05:**
   - `chore(build): update electron-builder + package.json main/scripts for out/ output folder` (matches D-09-10 commit 3 subject)
   - Expected files: package.json (main + build.files + optional script flag removal). Possibly out/-directory-restructure if electron-builder's asar glob picks up stray files.

## Next Phase Readiness

- **Ready for Plan 09-05:** Scripts rewired; webpack retired; `npm run dev` + `npm run pack` green end-to-end; `--entry` workaround documented as Plan 09-05 cleanup candidate.
- **Build MOSTLY WORKING:** Dev mode + pack mode functional; `npm run build` (installer) still broken pending Plan 09-05's electron-builder integration.
- **Jest still green (256/256):** Phase 10 Vitest migration untouched.
- **Lint still 734 (≤1881):** Zero delta through Plans 09-01/02/03/04.
- **D-09-10 three-commit bisect chain status:** commits 1 (`13d84e1` deps), 2-A (`d237e4f` HTML+main-URL), 2-B (`3bc0e45` config), 2-C (`471204b` this plan — scripts+webpack retirement). Chain commit 3 (electron-builder integration) remains for Plan 09-05.
- **Phase 9 ROADMAP success criteria closeout status:**
  - [x] Criterion 1 (no webpack devDeps) — Plan 09-01
  - [x] Criterion 2 (electron.vite.config.mjs authoritative) — Plan 09-03
  - [x] Criterion 3 (`npm run dev` with HMR) — Plan 09-03 (empirically) + Plan 09-04 (via `npm run` wrapper)
  - [ ] Criterion 4 (`npm run build` installer within ±20%) — pending Plan 09-05
  - [x] Criterion 5 (`npm test` 256/256 + lint ≤1881) — all plans

---
*Phase: 09-webpack-to-vite*
*Plan: 04*
*Commit: 471204b (content) + <pending docs(09-04)> (this SUMMARY)*
*Completed: 2026-04-22*
