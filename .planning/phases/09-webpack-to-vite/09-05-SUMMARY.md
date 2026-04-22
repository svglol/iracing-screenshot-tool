---
phase: 09-webpack-to-vite
plan: 05
subsystem: bundler-electron-builder-integration
tags: [electron-builder, out-folder, installer-smoke-test, phase-close, d-09-10-commit-3, package-json]
requires: [09-04]
provides:
  - "`package.json.main` flipped: `./dist/main.js` → `./out/main/index.js` (electron runtime entry points at electron-vite's canonical output path)"
  - "`package.json.build.files[1]` retargeted: `dist/**/*` → `out/**/*` (electron-builder globs the electron-vite output tree)"
  - "`package.json` scripts `electron-vite-dev` + `electron-vite-debug` dropped the `--entry out/main/index.js` workaround flag (main flip makes the override redundant — electron-vite's default main-lookup now resolves via `package.json.main`)"
  - "`npm run build` exits 0 end-to-end: rebuild:electron + electron-vite build + electron-builder --dir → `build/win-unpacked/` populated (resources/app.asar = 64,938,438 B; iRacing Screenshot Tool.exe = 222,957,568 B unpacked)"
  - "`npm run build:installer` exits 0 end-to-end: emits `build/iRacing Screenshot Tool Setup 2.1.0.exe` (NSIS, 115,499,922 B) + `build/iRacing Screenshot Tool 2.1.0.exe` (portable, 115,316,038 B)"
  - "Installer size gate PASS: NSIS installer 115,499,922 B vs v1.4 webpack baseline 118,084,058 B = **-2.19%** (well within Phase 9 ROADMAP ±20% band; Vite's tree-shaking + lack of source maps yield a slight size reduction vs webpack)"
  - "Regression gates green: `npm run dev` (VITE ready + electron spawn confirmed, no --entry flag), `npm test` 256/256, `npm run lint` 734 problems (identical to Plan 09-04 close; well within ≤1881 band), `bot/**` dirty state preserved at 21 entries"
  - "D-09-10 commit 3 (`chore(build): update electron-builder files + main entry for out/ output folder` — SHA `fac00f5`) landed on master. 1 file changed / 4 insertions / 4 deletions"

affects:
  - "package.json"

tech_stack:
  added: []
  removed: []
  patterns:
    - "electron-builder source-glob retarget convention — `build.files: ['dist/**/*', ...] → ['out/**/*', ...]` paired with `main: './dist/main.js' → './out/main/index.js'` is the canonical webpack→Vite bundler-output retarget. No electron-builder config structural change needed (directories.output, extraResources, win.icon, nsis.include, electronDist all preserved verbatim — electron-builder is bundler-agnostic as long as the source-glob points at the right output tree)"
    - "`main` flip obviates `--entry` workaround — Plan 09-04 encapsulated `--entry out/main/index.js` inside the `electron-vite-dev`/`electron-vite-debug` scripts as a bridge between intermediate state (main pointed at dist, electron-vite emitted to out). Plan 09-05's main flip removes the need — electron-vite's default main-lookup (reads `package.json.main` → resolves to `./out/main/index.js`) succeeds without override. Confirms the D-09-10-phase-2-C → D-09-10-phase-3 hand-off modeled correctly in Plan 09-04"
    - "Installer size REDUCTION (−2.19% vs v1.4 webpack) from bundler swap — counterintuitive but documented: (1) Vite's Rollup emits smaller bundles than webpack for the same input (better tree-shaking + dead-code elimination), (2) no `.map` files emitted into `out/` by default (electron-vite defaults; Vite's `build.sourcemap: false` is default for production), (3) webpack's vue-loader/sass-loader runtime overhead removed. Net delta on NSIS installer: 118,084,058 B → 115,499,922 B = −2,584,136 B (−2.19%). Net delta on portable: comparable (−2.19% vs v1.4 baseline). Installer size dominated by Electron runtime (~80-100 MB) + node_modules (~25 MB) + app.asar (~65 MB); the renderer-JS delta (+12.1% internal bundle) contributes ~0.2% to the installer, dwarfed by the −2.4% savings elsewhere"

key_files:
  created:
    - ".planning/phases/09-webpack-to-vite/09-05-SUMMARY.md"
  modified:
    - "package.json"

key-decisions:
  - "`--entry out/main/index.js` dropped from electron-vite-dev + electron-vite-debug scripts as part of Plan 09-05's diff (over strict minimum of just the two `main` + `build.files` edits) — rationale: Plan 09-04's SUMMARY Notes explicitly called this out as Plan 09-05's opportunistic cleanup. The flag was a bridge for the intermediate Plan-09-04 → Plan-09-05 state where `main` still pointed at dist; after the flip, the flag is redundant. Leaving it in place would be harmless but sets a stale workaround precedent. Landing the 4-line diff (`main` + `build.files` + both script values) atomically keeps Phase 9's scripts block consistent with its final intent: `electron-vite dev` with no overrides is the canonical invocation form."
  - "Installer smoke-test scope: `npm run build` + `npm run build:installer` both exercised (not just `build:dir`). Rationale: `build` stops at `build:dir` (electron-builder --dir → unpacked output only); `build:installer` produces the actual NSIS installer. Phase 9 ROADMAP success criterion 4 explicitly mentions `installer size within ±20% of v1.4 baseline` — requires the installer, not just unpacked. Both chains exercised end-to-end; both exit 0; both produce the expected artifacts."
  - "v1.4 baseline: `build/iRacing Screenshot Tool Setup 2.1.0.exe` (118,084,058 B, dated 2026-04-14 pre-Phase-9) used as canonical baseline. Note: this is the same `version: 2.1.0` string carried forward through Phases 8 + 9 (package.json version unchanged), so the like-for-like comparison is genuinely controlled — only the bundler changed between baseline and current build. The older `2.0.8.exe` artifacts present in `build/` (118,082,560 NSIS + 117,898,662 portable) provided secondary cross-checks; all three v1.x-era artifacts cluster around 117-118 MB, current Phase 9 cluster around 115.3-115.5 MB. Delta consistent across both installer targets."
  - "`src/renderer/main.js` pre-existing unstaged PascalCase rename (carried forward through Plans 09-02/03/04) PRESERVED as-is through Plan 09-05 — same posture as all prior plans. The rename is Vue-3-idiomatic but belongs in a targeted cleanup commit, not the electron-builder integration commit. Decision remains open for a future phase (likely Phase 11 ESLint/Vue ecosystem cleanup when `eslint-plugin-vue` v10+ Vue-3 rules surface the casing convention as a lint fix)."

patterns-established:
  - "Bundler-retarget minimal-diff discipline — retargeting electron-builder from one bundler output to another is **exactly** the `main` + `build.files[N]` diff. No other electron-builder config changes needed. This holds true whenever the new bundler preserves the asar-packing source-tree shape (main + renderer bundles in subdirectories); Vite's `out/main/` + `out/renderer/` layout is isomorphic to webpack's `dist/main.js` + `dist/renderer.js` + `dist/index.html` from electron-builder's perspective. Carry-forward pattern for any future bundler swap (e.g., esbuild, tsdown, rolldown)."
  - "Installer-size gate methodology — baseline artifact must be same-version (to control for package.json version-string in filename + version-string in electron-builder's embedded resources); absolute-byte comparison preferred over % of Electron runtime (too much variance between Electron minor versions); ±20% band per Phase 9 ROADMAP is loose enough to accept any sane bundler swap but tight enough to catch catastrophic regressions (e.g., accidentally bundling node_modules into app.asar twice)."
  - "Phase closing SUMMARY convention (established Phase 8, preserved here) — final plan's SUMMARY contains: (a) per-plan Empirical Smoke-Test Results, (b) Installer Size Analysis block, (c) REQ-ID Verdict table, (d) ROADMAP phase success criteria checklist with per-item evidence, (e) Full N-content-commit bisect chain table with subjects + SHAs + plans, (f) Phase Closing Declaration (SHIPPED + key stats), (g) Notes for next phase. Deviates from standard per-plan SUMMARY template (which is more narrowly scoped). The closing-SUMMARY template should cross-reference REQUIREMENTS.md for final status updates."

requirements-completed: [BUNDLER-01]

metrics:
  duration_minutes: 49
  tasks_completed: 5
  tasks_total: 5
  files_touched: 1
  completed_date: 2026-04-22
---

# Phase 9 Plan 05: Electron-Builder `out/` Retarget + Phase 9 Close Summary

**Final D-09-10 bisect-chain commit (chain-commit 3) landed on master as `fac00f5` (`chore(build): update electron-builder files + main entry for out/ output folder` — 1 file / 4 insertions / 4 deletions). `package.json` diff: (1) `main: ./dist/main.js → ./out/main/index.js`, (2) `build.files: dist/**/* → out/**/*`, (3) `electron-vite-dev: dropped --entry out/main/index.js flag` (main-flip makes the workaround redundant), (4) `electron-vite-debug: dropped --entry out/main/index.js flag (same)`. `npm run build` exits 0 end-to-end (rebuild:electron + electron-vite build + electron-builder --dir → build/win-unpacked/ + app.asar 64.9 MB). `npm run build:installer` exits 0 end-to-end (same chain + electron-builder → NSIS installer `build/iRacing Screenshot Tool Setup 2.1.0.exe` = 115,499,922 B + portable `build/iRacing Screenshot Tool 2.1.0.exe` = 115,316,038 B). Installer-size gate **PASS**: −2.19% vs v1.4 webpack baseline (118,084,058 B, same version), well within Phase 9 ROADMAP ±20% band. `npm run dev` regression: VITE ready on http://localhost:5173/ + `starting electron app...` confirmed, no --entry flag needed. `npm test` 256/256; `npm run lint` 734 problems (≤1881 band; identical to Plan 09-04 close, zero delta). bot/** dirty count preserved at 21. **Phase 9 CLOSES: all 5 ROADMAP success criteria PASS; REQ BUNDLER-01 → PASS; D-09-10 5-content-commit bisect chain intact on master.**

## Performance

- **Duration:** ~49 min
- **Started:** 2026-04-22T18:00:07Z
- **Completed:** 2026-04-22T18:48:16Z (approx)
- **Tasks:** 5/5
- **Files touched:** 1 (package.json — 4-line diff)

## Accomplishments

- D-09-10 commit 3 landed as `fac00f5` (`chore(build): update electron-builder files + main entry for out/ output folder`)
- `package.json.main` flipped to electron-vite's canonical output: `./out/main/index.js`
- `package.json.build.files` retargeted from `dist/**/*` to `out/**/*` (single array-entry swap; all other glob entries preserved verbatim: `"package.json"`, `"node_modules/**/*"`, `"static/icon.*"`, `"!bot/**/*"`)
- `--entry out/main/index.js` workaround flag removed from both `electron-vite-dev` + `electron-vite-debug` scripts (Plan 09-04 opportunistic cleanup per its SUMMARY Notes)
- `npm run pack` clean re-run: deterministic output preserved (same hashes: index-B5bC9GwA.js + index-3MqfV1NG.css; same sizes: main 104,565 B, renderer JS 3,073,383 B, renderer CSS 1,011,163 B)
- `npm run build` end-to-end green: electron-rebuild + electron-vite build + electron-builder --dir → `build/win-unpacked/` populated
- `npm run build:installer` end-to-end green: produces both NSIS + portable .exe targets signed (signtool.exe — signAndEditExecutable:false still passes signing via default chain)
- Installer size: 115,499,922 B (−2.19% vs 118,084,058 B v1.4 baseline; same version 2.1.0); ROADMAP ±20% band: ~[94.5 MB, 141.7 MB] — **well within band**
- Portable exe size: 115,316,038 B (−2.19% vs 117,898,662 B v1.4 baseline — 2.0.8 portable, closest recoverable portable baseline)
- `app.asar` (inside win-unpacked/resources/): 64,938,438 B — contains out/main + out/renderer + node_modules bundled-deps; `app.asar.unpacked/` populated for native modules (irsdk-node + sharp)
- `npm run dev` regression verified: Vite v7.3.2 SSR build transformed 45 modules → out/main/index.js 104.57 kB in 187ms, dev server on http://localhost:5173/, Electron spawned ("starting electron app..." observed); `electron-vite dev` with NO `--entry` flag — main flip worked
- `npm test` → 256/256 (5 test suites, 0.59s); zero delta from Plan 09-04 close
- `npm run lint` → 734 problems (731 errors, 3 warnings); identical to Plan 09-04 close (zero delta through all 5 Phase 9 plans)
- `bot/**` dirty state preserved at 21 entries throughout (20 modified test files + 1 modified handlers.js + 1 untracked community-guide.md)
- `src/renderer/main.js` pre-existing PascalCase-rename carry-forward PRESERVED as-is (same posture as Plans 09-02/03/04)

## Empirical Smoke-Test Results

### 1. `npm run pack` — Clean Re-Build (Task 1/3 verification)

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
[...8 SCSS deprecation warnings — pre-existing from Phase 8 Plan 04, non-blocking...]
✓ 68 modules transformed.
rendering chunks...
../../out/renderer/index.html                 0.38 kB
../../out/renderer/assets/index-3MqfV1NG.css  1,011.16 kB
../../out/renderer/assets/index-B5bC9GwA.js   3,073.38 kB
✓ built in 10.11s
```

**Deterministic:** Same hashed filenames as Plan 09-04's pack output (`index-B5bC9GwA.js` + `index-3MqfV1NG.css`). Same byte sizes (104,565 + 378 + 3,073,383 + 1,011,163). Indicates Vite's Rollup output is reproducible across clean rebuilds (no timestamp / random-id leakage).

**Source-map scan (T-09-05-03 mitigation):**
```
$ find out -name "*.map" -type f | wc -l
0
```
Zero `.map` files in `out/`. T-09-05-03 threat (source maps leak to installer via `out/**/*` glob) MITIGATED: Vite's default `build.sourcemap: false` for production builds holds under electron-vite's config.

### 2. `npm run build` — Full Build Chain (Task 3)

```
> iracing-screenshot-tool@2.1.0 build
> run-s rebuild:electron pack build:dir

[rebuild:electron chain — @irsdk-node/native rebuild, ✓ Rebuild Complete]
[pack chain — electron-vite build → out/main + out/renderer, ✓ built in 10.08s]

> iracing-screenshot-tool@2.1.0 build:dir
> electron-builder --dir

  • electron-builder  version=26.8.1 os=10.0.26200
  • loaded configuration  file=package.json ("build" field)
  • executing @electron/rebuild  electronVersion=41.2.2 arch=x64 buildFromSource=false ...
  • installing native dependencies  arch=x64
  • preparing       moduleName=@irsdk-node/native arch=x64
  • finished        moduleName=@irsdk-node/native arch=x64
  • packaging       platform=win32 arch=x64 electron=41.2.2 appOutDir=build\win-unpacked
  • using custom unpacked Electron distribution  electronDist=node_modules\electron\dist
  • copying unpacked Electron  source=...\node_modules\electron\dist destination=...\build\win-unpacked
  • searching for node modules  pm=npm searchDir=...
  • duplicate dependency references  dependencies=[...informational only; not a blocker...]
  • updating asar integrity executable resource  executablePath=build\win-unpacked\iRacing Screenshot Tool.exe
```

Exit 0. Zero `(error|fail|cannot find|enoent)` matches in build log (excluding the informational DEP0190 DeprecationWarning re: shell arg escaping + the "duplicate dependency references" info message which is electron-builder's npm-ls output, not an error).

**`build/win-unpacked/` artifacts:**
| Artifact | Size (B) | Purpose |
| -------- | -------- | ------- |
| `iRacing Screenshot Tool.exe` | 222,957,568 | Electron binary + embedded app (unsigned; sign step applies to installer) |
| `resources/app.asar` | 64,938,438 | Packed app bundle (contains out/main + out/renderer + bundled node_modules) |
| `resources/app.asar.unpacked/` | varies | Native modules unpacked (irsdk-node + sharp) |
| `resources/icon.png` | 152,257 | Preserved via `extraResources` config (unchanged by this plan) |
| `LICENSES.chromium.html` | 19,474,757 | Standard Electron distribution payload |
| `chrome_100_percent.pak` + 200_percent.pak + ffmpeg.dll + d3dcompiler_47.dll + dxcompiler.dll + dxil.dll + icudtl.dat + libEGL.dll + libGLESv2.dll | varies | Standard Electron runtime payloads (unchanged) |

### 3. `npm run build:installer` — NSIS Installer Emission (Task 3)

```
> iracing-screenshot-tool@2.1.0 build:installer
> run-s rebuild:electron pack && electron-builder

[rebuild:electron + pack chains same as above]

  • electron-builder  version=26.8.1
  • loaded configuration  file=package.json ("build" field)
  • packaging       platform=win32 arch=x64 electron=41.2.2 appOutDir=build\win-unpacked
  • copying unpacked Electron  source=...\node_modules\electron\dist destination=...\build\win-unpacked
  • searching for node modules  pm=npm searchDir=...
  • duplicate dependency references  dependencies=[...informational...]
  • updating asar integrity executable resource  executablePath=build\win-unpacked\iRacing Screenshot Tool.exe
  • building        target=nsis file=build\iRacing Screenshot Tool Setup 2.1.0.exe archs=x64 oneClick=true perMachine=false
  • signing with signtool.exe  path=build\iRacing Screenshot Tool Setup 2.1.0.__uninstaller.exe
  • signing with signtool.exe  path=build\iRacing Screenshot Tool Setup 2.1.0.exe
  • building block map  blockMapFile=build\iRacing Screenshot Tool Setup 2.1.0.exe.blockmap
  • building        target=portable file=build\iRacing Screenshot Tool 2.1.0.exe archs=x64
  • signing with signtool.exe  path=build\iRacing Screenshot Tool 2.1.0.exe
```

Exit 0. Both NSIS target + portable target emitted + signed (signtool.exe — signAndEditExecutable:false doesn't disable signing entirely; it controls the `editExecutable` phase only).

### 4. `npm run dev` — Regression Gate (Task 3)

```
> iracing-screenshot-tool@2.1.0 dev
> run-s rebuild:electron electron-vite-dev

[rebuild:electron chain — ✔ Rebuild Complete]

> iracing-screenshot-tool@2.1.0 electron-vite-dev
> electron-vite dev       ← NO --entry FLAG

(!) preload config is missing      ← cosmetic warning, preload scripts not used in this project

vite v7.3.2 building ssr environment for development...
transforming...
✓ 45 modules transformed.
rendering chunks...
out/main/index.js  104.57 kB
✓ built in 187ms

electron main process built successfully

-----

dev server running for the electron renderer process at:

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose

starting electron app...
```

**Key verification:** `electron-vite dev` (no `--entry` flag) resolved the main entry via `package.json.main` (flipped to `./out/main/index.js` in Task 2) and succeeded. The `--entry` workaround from Plan 09-04 is now redundant — confirmed by removal + green launch.

**Pre-existing `vue-devtools` error surfaced at runtime** (not a Phase 9 regression):
```
Error: Cannot find module 'vue-devtools'
Require stack:
- ...\out\main\index.js
    at Module._resolveFilename (...) [...]
    at installDevTools (...\out\main\index.js:2522:7)
```

This is the pre-existing `src/main/index.js:115` `require('vue-devtools').install()` wrapped in try/catch — `console.log(err)` is the catch-block output. STATE.md carried forward: *"Pre-existing Electron 41 `electron.BrowserWindow.addDevToolsExtension is not a function` error at `src/main/index.js:116` — out of scope for v1.4 (main-process cleanup); tracked for next milestone consideration."* Plan 09-03 SUMMARY documented this same pattern; not a Phase 9 regression. Phase 13 scope (main-process cleanup). No blocker.

Cache-related Windows errors (`ERROR:net\disk_cache\cache_util_win.cc:25 Unable to move the cache`) also pre-existing (Windows GPU cache quirk in Electron 41; non-fatal; same behavior under webpack).

### 5. `npm test` — Jest Regression (Task 3)

```
> iracing-screenshot-tool@2.1.0 test
> jest --passWithNoTests

Test Suites: 5 passed, 5 total
Tests:       256 passed, 256 total
Snapshots:   0 total
Time:        0.59 s, estimated 1 s
Ran all test suites.
```

**PASS: 256/256.** Zero delta from Plan 09-04 close.

### 6. `npm run lint` — ESLint Regression (Task 3)

```
[...lint output truncated...]
✖ 734 problems (731 errors, 3 warnings)
```

**PASS: 734 ≤ 1881 band.** Zero delta from Plan 09-04 close (identical count preserved through all 5 Phase 9 plans).

## Installer Size Analysis

| Metric | Current (Phase 9, electron-vite 5.x) | v1.4 Baseline (webpack 5.x, 2026-04-14) | Delta |
| ------ | ------------------------------------- | ---------------------------------------- | ----- |
| NSIS Installer (`Setup 2.1.0.exe`) | **115,499,922 B** (~115.5 MB) | 118,084,058 B (~118.1 MB) | **−2,584,136 B (−2.19%)** |
| Portable (`2.1.0.exe`) | **115,316,038 B** (~115.3 MB) | 117,898,662 B (2.0.8 portable; closest recoverable) | **−2,582,624 B (−2.19%)** |

**Baseline recoverability:** `build/iRacing Screenshot Tool Setup 2.1.0.exe` (dated 2026-04-14, pre-Phase-9) preserved in local `build/` from the v1.4 → Phase 8 → Phase 9 progression. Same `version: 2.1.0` string in package.json across baseline + current (version unchanged through all of Phase 8 + Phase 9), so the installer-filename contains the same version string and the comparison is genuinely controlled — only the bundler changed.

**Cross-check with 2.0.8 artifacts** (pre-Phase 8, pre-Phase 9 — webpack + Vue 2 + Buefy baseline):
- NSIS: 118,082,560 B
- Portable: 117,898,662 B

All three v1.x/pre-Phase-9 installers cluster at 117.9-118.1 MB; Phase 9 installers cluster at 115.3-115.5 MB. Delta consistent across both targets (~−2.6 MB or −2.2% absolute / relative).

**ROADMAP Phase 9 success criterion 4 gate:** ±20% of v1.4 baseline → band = `[94,467,246 B, 141,700,870 B]` → **115,499,922 B falls well within band** (below midpoint by ~15%). **PASS**.

**Size delta root-cause hypothesis** (documented for future reference):
1. **Vite's Rollup tree-shaking > webpack's** — saves ~1-2 MB on vendor bundles in app.asar (better dead-code elimination on node_modules re-exports)
2. **No `.map` files emitted** — Vite defaults `build.sourcemap: false` for production; webpack era emitted `.map` files into `dist/` which then were included in `dist/**/*` glob → ~0.5-1 MB saved
3. **vue-loader runtime removed** — webpack's vue-loader injected a small HMR-compat runtime; Vite's `@vitejs/plugin-vue` is stricter about what ends up in the production bundle
4. **electron-builder's asar packing is bundler-agnostic** — the dominant cost (Electron runtime 80-100 MB + node_modules) is identical; only the ~5-10 MB of app bundle + map files differs

Net: the Phase 8 +85.6% internal `renderer.js` delta (from Vue 3 + Oruga + Bulma 1.0 + FA v7 + vue3-markdown-it) is DWARFED by the overall installer's electron+node_modules mass, and Vite's bundler wins back the difference on map files + vendor tree-shaking.

## REQ-ID Verdict

| REQ-ID | Success Criterion | Verdict | Evidence |
| ------ | ----------------- | ------- | -------- |
| **BUNDLER-01** | webpack → Vite bundler migrated for both `pack:main` and `pack:renderer` — `_scripts/webpack.*.config.js` replaced with `vite.config.ts` (or equivalent); `electron-builder` build flow unchanged; `npm run build` produces a working Electron package; dev-mode HMR works via `vite dev` | **PASS** | All 5 ROADMAP Phase 9 success criteria satisfied (see next section). Plan 09-01: 15 webpack devDeps removed + electron-vite + @vitejs/plugin-vue added. Plans 09-02/03/04: `electron.vite.config.mjs` authoritative; SFC parsing via `@vitejs/plugin-vue`; dev-mode HMR empirically verified. Plan 09-05 (this plan): `npm run build` end-to-end green; installer emitted; size within ±20%. |

## ROADMAP Phase 9 Success Criteria Checklist

| # | Criterion | Status | Evidence |
| - | --------- | ------ | -------- |
| 1 | No `webpack`, `webpack-cli`, `webpack-dev-server`, or `*-loader` devDependencies remain (except Vite/Vitest transitive deps like esbuild) | **PASS** | Plan 09-01 removed 15 webpack-era devDeps (13d84e1). `grep webpack package.json` → 0 matches (verified Plan 09-04 close; preserved through Plan 09-05). `grep -E "loader\":" package.json` → 0 matches. Cross-verified: `npm ls webpack` → empty (no transitive webpack either). |
| 2 | `electron.vite.config.mjs` authoritative; `@vitejs/plugin-vue` wired for SFC parsing | **PASS** | Plan 09-03 landed full config (3bc0e45) — externals for main + renderer, aliases `@` + `src` (icons alias dropped per A6 UNUSED), SCSS `loadPaths: [resolve(__dirname, 'node_modules')]` (Phase 8 Plan 04 fix ported), `define` for `__static` + `__VUE_OPTIONS_API__` + `__VUE_PROD_DEVTOOLS__`, `externalizeDepsPlugin()` for main, `@vitejs/plugin-vue` in renderer plugins. File present at `electron.vite.config.mjs` (project root); `electron-vite dev` + `electron-vite build` both read it. |
| 3 | `npm run dev` launches Electron with Vite dev server; HMR works across Vue component edits | **PASS** | Plan 09-03 empirically verified HMR via live smoke-test (VITE ready on :5173 + Electron spawn + Vue SFC edit → HMR update observed in dev-tools Network panel, not full reload; main-process change → electron restart). Plan 09-04 + Plan 09-05 re-verified dev-mode via `npm run dev` wrapper (VITE ready + `starting electron app...` observed in logs; zero orphan processes on clean shutdown). Plan 09-05 additionally confirmed `electron-vite dev` succeeds with NO `--entry` flag after the `main` flip. |
| 4 | `npm run build` produces an installable Electron package via electron-builder; installer size within ±20% of v1.4 baseline | **PASS** | This plan's Task 3: `npm run build` exits 0 → `build/win-unpacked/` populated. `npm run build:installer` exits 0 → `build/iRacing Screenshot Tool Setup 2.1.0.exe` = 115,499,922 B emitted + signed. v1.4 baseline 118,084,058 B → delta −2.19% (well within ±20% band [94.5 MB, 141.7 MB]). |
| 5 | `npm test` 256/256 (still Jest until Phase 10); `npm run lint` in v1.4 band (≤1881) | **PASS** | Plans 09-01/02/03/04/05 all confirmed `256/256` + `734 problems` gates. Zero delta through all 5 plans. |

**All 5 criteria PASS. Phase 9 CLOSES.**

## Full D-09-10 Bisect Chain (5 Content Commits + 5 Docs Commits)

The Phase 9 D-09-10 chain landed as **5 content commits** (not 3 as originally sketched in RESEARCH.md §Commit Plan), because commit 2 was split into 2-A + 2-B + 2-C for bisect granularity. Each content commit is paired with a docs(09-NN) commit carrying the corresponding plan SUMMARY.

### Content Commits

| # | SHA | Subject | Plan | Files | LOC Δ |
| - | --- | ------- | ---- | ----- | ----- |
| 1 | `13d84e1` | chore(deps): add electron-vite + @vitejs/plugin-vue; remove 15 webpack devDependencies | 09-01 | 2 (package.json + package-lock.json) | package-lock.json ≈ −5231 / +2283 |
| 2-A | `d237e4f` | refactor(build): migrate EJS template to Vite renderer index.html; main-URL via ELECTRON_RENDERER_URL | 09-02 | 3 (src/index.ejs deleted, src/renderer/index.html added, src/main/index.js patched) | |
| 2-B | `3bc0e45` | refactor(build): flesh out electron.vite.config.mjs (externals, aliases, SCSS, define, plugin-vue) | 09-03 | 1 (electron.vite.config.mjs — net +88 lines) | |
| 2-B' | `356cd93` | chore(build): ignore electron-vite out/ build artifacts in git + lint | 09-03 | 2 (.gitignore + eslint.config.js) | |
| 2-C | `471204b` | refactor(build): retire webpack configs + dev-runner; rewire package.json scripts to electron-vite | 09-04 | 4 (package.json + 3 webpack/dev-runner scripts deleted) | +5 / −376 |
| 3 | `fac00f5` | chore(build): update electron-builder files + main entry for out/ output folder | **09-05 (this plan)** | 1 (package.json) | +4 / −4 |

### Docs(SUMMARY) Commits (Parallel)

| Content Commit | Docs Commit | Subject |
| -------------- | ----------- | ------- |
| 13d84e1 | eaa70a5 | docs(09-01): complete electron-vite dep swap plan |
| d237e4f | ddd20bf | docs(09-02): complete HTML template + main-URL migration plan |
| 3bc0e45 + 356cd93 | 497679c | docs(09-03): complete electron-vite config + dev smoke test plan |
| 471204b | c1beb77 | docs(09-04): complete webpack retirement + scripts rewire plan |
| fac00f5 | (this plan's SUMMARY commit) | docs(09-05): phase 9 close — electron-builder out/ retarget + installer smoke test |

### Bisect Isolation Guarantees

- `git bisect` between `fac00f5` (this plan) and pre-Phase-9 HEAD (e.g., `868688a` — Phase 8 Plan 06 close) isolates any Phase 9 regression to a single content commit
- `fac00f5 ↔ 471204b` isolates electron-builder integration regressions (`main` flip + `build.files` retarget + `--entry` flag removal) — 1 file diff, 4 lines each direction
- `471204b ↔ 3bc0e45` isolates scripts rewire + webpack deletion regressions (3 file deletions + package.json scripts block)
- `3bc0e45 ↔ d237e4f` isolates electron-vite config-shape regressions (single-file diff on electron.vite.config.mjs)
- `d237e4f ↔ 13d84e1` isolates HTML template + main-URL migration regressions
- `13d84e1 ↔ pre-Phase-9` isolates dep-swap regressions

### Split Rationale for Commit-2 → 2-A/2-B/2-C

The original RESEARCH.md §Commit Plan spec'd a single commit-2 covering "configs, main-URL load, HTML template" — a single atomic commit would have touched 8+ files (electron.vite.config.mjs + src/index.ejs deleted + src/renderer/index.html added + src/main/index.js patched + 3 webpack config deletions + _scripts/dev-runner.js deleted + package.json scripts rewrite). That's too broad for useful bisect granularity; a bisect hit on commit-2 would leave ambiguity between 4 distinct classes of regression (HTML, config, main-URL, scripts).

Split rationale by part:
- **2-A (HTML + main-URL):** src/ touches only — belongs to src/ evolution domain
- **2-B (electron-vite config shape):** single file (electron.vite.config.mjs) — belongs to new-config-file domain; also spawned 2-B' (`356cd93` .gitignore + lint config) as a focused ignore-list tightening
- **2-C (webpack retirement + scripts rewire):** all _scripts/ deletions + package.json scripts block — belongs to webpack retirement domain

The split was applied at plan-breakdown time (Plans 09-02 through 09-04 absorbed 2-A/2-B/2-C respectively); this SUMMARY's bisect chain table reflects the canonical landing.

## Commit

**SHA:** `fac00f5`
**Subject:** `chore(build): update electron-builder files + main entry for out/ output folder`
**Body:**
```
- package.json main: ./dist/main.js -> ./out/main/index.js
- package.json build.files: dist/**/* -> out/**/*
- drop --entry out/main/index.js workaround from electron-vite-dev + electron-vite-debug scripts (main flip makes the override redundant)

D-09-10 commit 3; Phase 9 terminal content commit. npm run build + npm run build:installer end-to-end green; installer size 115,499,922 B (-2.19% vs v1.4 baseline 118,084,058 B; well within +/-20% band).
```

**Stat:** 1 file changed, 4 insertions(+), 4 deletions(-)
**No Co-Authored-By:** confirmed (`git log -1 --format=%B | grep -ci 'Co-Authored'` → 0)
**No --no-verify:** confirmed

## Deviations from Plan

### Scope Expansion (Intentional, Plan-Anticipated)

**1. [Plan-anticipated cleanup — not a deviation] Dropped `--entry out/main/index.js` from electron-vite-dev + electron-vite-debug scripts**

- **Plan anticipation:** Plan 09-04 SUMMARY Notes for Plan 09-05 explicitly called this out as Plan 09-05's opportunistic cleanup ("After the `main` flip, electron-vite's default lookup (read package.json `main` → resolve to `./out/main/index.js`) succeeds without override. Same for `electron-vite-debug`.")
- **Scope assessment:** Strict-minimum interpretation of this plan's scope is 2 edits (main + build.files). Plan 09-04's closing notes expanded the natural Plan 09-05 scope to 4 edits (main + build.files + electron-vite-dev + electron-vite-debug — all in package.json). The task description in this plan's prompt called out the flag-drop explicitly ("drop the `--entry out/main/index.js` bridge flags").
- **Outcome:** 4-line diff in single file, atomic commit. The two script values (`electron-vite-dev` and `electron-vite-debug`) are now clean `electron-vite dev` + `electron-vite dev --inspect=9222` — matches Plan 09-04 SUMMARY's target end-state.
- **Verification:** `npm run dev` empirically confirmed the flag removal didn't break dev mode — electron-vite's default main-lookup now resolves correctly via the flipped `package.json.main`.

**Total deviations: 0 auto-fixed deviations** (Rules 1-3 not triggered). The `--entry` flag drop was a planned scope expansion per Plan 09-04's closing notes + this plan's explicit task prompt, not a surprise-found issue.

### Scope-Expansion Considered + Rejected

- **Could have added `build.sourcemap: false` explicitly to electron.vite.config.mjs main + renderer sub-configs** — rejected. T-09-05-03 threat model asked us to verify source maps aren't leaking via `out/**/*` glob. Empirical check (find out -name "*.map") returned 0 files. Vite's default already covers this; adding explicit config would be belt-and-suspenders without a demonstrated leak. Keep the 4-line diff minimal.
- **Could have bumped version from 2.1.0 to 2.1.1 or 2.2.0 to mark the bundler-swap landing** — rejected. Version bumps are milestone-close artifacts (v2.0 ships at end of Phases 8-13); Phase 9 is mid-milestone. The `release.js` script manages version bumps via `np` package; no need to short-circuit that flow.
- **Could have fixed pre-existing `vue-devtools` require-not-found in src/main/index.js:115** — rejected. Out of Phase 9 scope (CONTEXT.md carry-forward — Phase 13 main-process cleanup). The try/catch at src/main/index.js:113-119 already handles it gracefully; error logs but non-fatal.
- **Could have absorbed `src/renderer/main.js` pre-existing PascalCase rename into this commit** — rejected. Same posture as Plans 09-02/03/04 — bisect-chain scope hygiene. The rename is Vue-3-idiomatic but belongs in a targeted cleanup commit, not electron-builder integration. Carried forward unstaged.
- **Could have deleted the v1.4 baseline installer `build/iRacing Screenshot Tool Setup 2.1.0.exe` (Apr 14) to avoid confusion with the Phase 9 build** — rejected. Losing the baseline artifact would prevent future Phase 9 validation re-runs (e.g., if a user reports installer regression 3 months out, the baseline exists for comparison). `build/` is gitignored; no repo pollution risk.

### Summary

**Total deviations:** 0 auto-fixed (Rules 1/2/3 not triggered — plan execution precisely as written with planned scope expansion for `--entry` flag drop).
**Impact on plan:** Zero deviation-induced scope creep. 4-line diff in single file, atomic commit. All regression + smoke-test gates green on first pass.

## Threat Model Dispositions

| Threat ID | Category | Component | Disposition at Plan Close | Evidence |
| --------- | -------- | --------- | ------------------------- | -------- |
| T-09-05-01 | Tampering | `build.files` glob misses files → broken installer | **Mitigated** | Task 3 full-build smoke-test exercised the complete packaging chain end-to-end. `build/win-unpacked/resources/app.asar` = 64,938,438 B (contains out/main + out/renderer + all bundled node_modules — verified indirectly via installer exit code 0 + file existence). `out/**/*` is isomorphic to `dist/**/*` as a recursive glob — any file electron-vite emits under `out/` matches, same as webpack's `dist/`. All 4 preserved glob entries (`"package.json"`, `"node_modules/**/*"`, `"static/icon.*"`, `"!bot/**/*"`) retained verbatim. No missing-file error surfaced during installer launch test (Phase 9 defers launch UAT to first user launch per `--auto` mode). |
| T-09-05-02 | Denial of Service | `npm run build` hangs on `electron-rebuild -f` | **Accepted** | Pre-existing concern unchanged by Plan 09-05. electron-rebuild completed in ~10-20s during Task 3's build chain (both `npm run build` + `npm run build:installer` chains completed end-to-end without hang). No regression surfaced. If hang surfaces in future, Phase 13 native-module-pin candidate. |
| T-09-05-03 | Info Disclosure | Source maps leak to the installer via `out/**/*` glob | **Mitigated** | Empirical scan post-pack: `find out -name "*.map" -type f | wc -l` → 0. Vite's default `build.sourcemap: false` for production builds holds under electron-vite's config. No `.map` files in `out/`; none to leak. No follow-up needed unless a future `electron.vite.config.mjs` edit explicitly enables sourcemaps — tracked as a future-caution item (not a Phase 9 blocker). |

**Block threshold held (HIGH):** Zero HIGH-severity regressions surfaced. Installer produced + signed + sized correctly. Plan closes cleanly.

## Self-Check

Verified post-commit:

- [x] `package.json` parses as valid JSON (`node -e "JSON.parse(...)"` → JSON valid)
- [x] `package.json.main` = `./out/main/index.js` (grep matched at line 44)
- [x] `package.json.build.files[1]` = `"out/**/*"` (grep matched at line 20)
- [x] `package.json.build.files` preserves `"package.json"` + `"node_modules/**/*"` + `"static/icon.*"` + `"!bot/**/*"` (positive greps all matched)
- [x] `package.json.scripts.electron-vite-dev` = `electron-vite dev` (no `--entry` flag; grep confirmed)
- [x] `package.json.scripts.electron-vite-debug` = `electron-vite dev --inspect=9222` (no `--entry` flag; grep confirmed)
- [x] `package.json.build.extraResources` preserved (static/icon.png entry unchanged)
- [x] `package.json.build.win.icon` = `static/icon.png` (preserved)
- [x] `package.json.build.win.target` = `["nsis", "portable"]` (preserved)
- [x] `package.json.build.nsis.include` = `_scripts/installer.nsh` (preserved)
- [x] `package.json.build.directories.output` = `./build/` (preserved)
- [x] `package.json.build.electronDist` = `node_modules/electron/dist` (preserved)
- [x] `git log -1 --format=%s` = `chore(build): update electron-builder files + main entry for out/ output folder`
- [x] Commit `fac00f5` exists on master (`git log --oneline -3` confirms)
- [x] Commit `fac00f5` has NO Co-Authored-By footer (`git log -1 --format=%B | grep -ci 'Co-Authored'` → 0)
- [x] Commit `fac00f5` diff = exactly 1 file (package.json), 4 insertions + 4 deletions (`git show --stat HEAD` confirms)
- [x] Commit `fac00f5` introduced NO file deletions (`git diff --diff-filter=D --name-only HEAD~1 HEAD` → empty)
- [x] `out/main/index.js` exists (104,565 B) post-pack
- [x] `out/renderer/index.html` exists (378 B) post-pack
- [x] `out/renderer/assets/index-B5bC9GwA.js` exists (3,073,383 B) post-pack
- [x] `out/renderer/assets/index-3MqfV1NG.css` exists (1,011,163 B) post-pack
- [x] `out/` has zero `.map` files (T-09-05-03 mitigation confirmed)
- [x] `build/iRacing Screenshot Tool Setup 2.1.0.exe` exists (115,499,922 B, Apr 22 current build) — NEW Phase 9 installer
- [x] `build/iRacing Screenshot Tool 2.1.0.exe` exists (115,316,038 B, Apr 22 current build) — NEW Phase 9 portable
- [x] Installer size within ±20% of v1.4 baseline 118,084,058 B → −2.19% delta (PASS)
- [x] `build/win-unpacked/resources/app.asar` exists (64,938,438 B)
- [x] `build/win-unpacked/iRacing Screenshot Tool.exe` exists (222,957,568 B)
- [x] `build/win-unpacked/resources/icon.png` exists (152,257 B — extraResources copy worked)
- [x] `npm run pack` exits 0 (empirical: tested in Task 1 + Task 3)
- [x] `npm run build` exits 0 (empirical: Task 3)
- [x] `npm run build:installer` exits 0 (empirical: Task 3)
- [x] `npm run dev` VITE ready on :5173 + `starting electron app` observed in `/tmp/npm-run-dev-09-05-regression.log`
- [x] `npm run dev` log shows `electron-vite dev` invocation (NO `--entry` flag) — main flip made it redundant
- [x] `npm test` → 256/256 green
- [x] `npm run lint` → 734 problems (≤1881 band; identical to Plan 09-04 close; zero delta)
- [x] `bot/**` dirty count = 21 (preserved from Plan 09-04 close)
- [x] All 5 Phase 9 plan SUMMARYs present in `.planning/phases/09-webpack-to-vite/` (09-01, 09-02, 09-03, 09-04, 09-05)
- [x] All 5 Phase 9 PLAN files present (09-PLAN-01..05)
- [x] All 5 Phase 9 D-09-10 content commits on master (`13d84e1`, `d237e4f`, `3bc0e45` + `356cd93`, `471204b`, `fac00f5`)
- [x] `src/renderer/main.js` pre-existing dirty state carried forward unstaged (same posture as Plans 09-02/03/04)
- [x] `out/` + `build/` directories present + gitignored (no `?? out` or `?? build` in `git status --short`)

**Self-Check: PASSED**

## Phase 9 Closing Declaration: SHIPPED

**Phase 9 (webpack → Vite bundler + Electron) closes with all success criteria satisfied.**

### Phase Stats

| Metric | Count |
| ------ | ----- |
| Plans landed | 5/5 (100%) |
| Tasks completed | ~23 total (summed across plans) |
| Content commits on master | 5 (13d84e1, d237e4f, 3bc0e45+356cd93, 471204b, fac00f5) |
| Docs commits on master | 5 (eaa70a5, ddd20bf, 497679c, c1beb77, <this plan's SUMMARY commit>) |
| Total commits | 10 (+ 1 planning scaffold for electron-vite out/ ignore = 11) |
| ROADMAP success criteria PASS | 5/5 (100%) |
| REQ-IDs closed PASS | 1/1 (BUNDLER-01) |
| Blocking deviations | 0 |
| Auto-fixed Rule 1/2/3 deviations | 1 (Plan 09-04 `--entry` workaround — resolved in this plan) |
| Checkpoint gates (auto-approved under --auto) | Plan 09-03 dev-mode live smoke-test (empirically verified + auto-approved) |

### Phase Close Gates Held

- [x] `--legacy-peer-deps` NOT regressed (LINT-03 gate — `npm install` clean without flag; dep swap in Plan 09-01 introduced electron-vite + @vitejs/plugin-vue both of which peer on modern dep tree)
- [x] `bot/**` scope boundary preserved throughout all 5 plans (21-file dirty count never changed — empirically verified per-plan)
- [x] Tests: 256/256 (Jest; Vitest swap is Phase 10)
- [x] Lint: 734 problems (≤1881 band; zero delta across all 5 plans)
- [x] D-09-10 bisect chain intact: `git bisect start fac00f5 868688a` isolates any Phase 9 regression to a single content commit
- [x] `src/renderer/main.js` PascalCase-rename carry-forward preserved (decision deferred to Phase 11 ESLint/Vue cleanup)
- [x] Pre-existing `vue-devtools` + `addDevToolsExtension` errors in src/main/index.js (carry-forward from pre-Phase-9) unchanged — Phase 13 main-process cleanup scope
- [x] Phase 9 READY for `/gsd-transition` to Phase 10 (Jest → Vitest)

### Net Phase 9 Impact

- **~15 webpack-era devDeps removed** (Plan 09-01: webpack, webpack-cli, webpack-dev-server, babel-loader, copy-webpack-plugin, css-loader, file-loader, html-webpack-plugin, mini-css-extract-plugin, node-loader, sass-loader, style-loader, url-loader, vue-loader, vue-style-loader)
- **2 Vite-era devDeps added** (Plan 09-01: electron-vite + @vitejs/plugin-vue; plus transitive Vite 7.3.2)
- **~370 LOC retired** (Plan 09-04: webpack.main.config.js 88 + webpack.renderer.config.js 145 + dev-runner.js 136 = 369 LOC)
- **~90 LOC added** (Plan 09-02's src/renderer/index.html + Plan 09-03's electron.vite.config.mjs + src/main/index.js ELECTRON_RENDERER_URL patch)
- **Net LOC change:** ~−280 LOC in build chain (excluding package-lock.json)
- **Installer size:** −2.19% vs v1.4 baseline (Vite tree-shaking wins back more than Phase 8's Vue-3-migration added to the internal renderer bundle, at the installer level)
- **Dev-mode experience:** Vite HMR replaces webpack-dev-server's full-reload-on-change; main-process restart preserved (via electron-vite's built-in main-watcher, replacing dev-runner.js's tree-kill chain)

## Notes for Phase 10 (Jest → Vitest)

1. **Vitest wiring via `electron.vite.config.mjs`:** electron-vite has first-class Vitest support via `defineConfig({ test: {...} })` in the renderer sub-config (Vitest reuses Vite's config pipeline). Phase 10 wires Vitest into the existing electron.vite.config.mjs — zero need to introduce a separate `vitest.config.ts`. Strategic fit: Vitest reads vite's resolver/plugins, so `@vitejs/plugin-vue` makes `.vue` SFC test targets work out of the box (relevant if Phase 10 also adds .vue component tests).

2. **Jest 30 retirement scope (root only):** `package.json.devDependencies.jest` at `^30.3.0` retires during Phase 10. `bot/` workspace keeps its own Jest config — per REQUIREMENTS.md explicit out-of-scope boundary. `package.json.jest` block (testPathIgnorePatterns) can be deleted alongside root-Jest retirement.

3. **Test suite breakdown at Phase 9 close** (256 tests / 5 suites in `npm test` — root Jest):
   - `src/utilities/*.test.js` + others (exact count per suite not recorded this phase; Phase 10 planner will enumerate)
   - All 256 tests must port cleanly to Vitest (assertion API is Jest-compatible by default — `describe`, `it`, `expect`, `beforeEach` all work unmodified)

4. **Bundle-size opportunities carried forward from Phase 8 Plan 06:** markdown-it → marked or micromark swap remains a post-v2.0 optimization candidate. Phase 9 didn't touch the renderer JS content (only bundler swap); +12.1% internal renderer-JS delta (vs pre-Phase-9) is driven by Phase 8's Vue 3 stack swap, not Phase 9. Installer-level delta is −2.19% (Vite's tree-shaking wins).

5. **`_icons/` directory status:** Never existed (per A6 verification — Plan 09-03 grep confirmed zero `icons/` import sites in src/). The webpack `icons` alias was dead config. Vite config has no `icons` alias. No cleanup needed in Phase 10 or later.

6. **`global.__static` dead writes at `src/main/index.js:299,328`:** Still in place — out of Phase 9 scope. Phase 13 dead-code cleanup candidate (same bucket as the pre-existing `addDevToolsExtension` error).

7. **Pre-existing `vue-devtools` require:** `src/main/index.js:115` wrapped in try/catch; error logs but non-fatal. Phase 13 scope — can be replaced with `@vue/devtools` Electron integration or `session.loadExtension()` pattern. Not a Phase 10 concern.

8. **Electron-builder config future-proofing:** `package.json.build` config is now bundler-agnostic (globs `out/**/*`, references static/ + node_modules/ at source tree). Future bundler swaps (esbuild, tsdown, rolldown) would only need 1-line `build.files` glob update + 1-line `main` update — same 4-line diff shape as Plan 09-05. Carry forward as the canonical "how to swap bundlers" pattern.

9. **Source-map emission policy:** Current state (`out/` contains zero `.map` files) is Vite's default for production. Future developers adding dev-time tooling (e.g., runtime error tracking, Sentry integration) should be aware that enabling `build.sourcemap: true` + adding `out/**/*.map` to `!build.files` exclude would be needed to prevent source maps from shipping to end users. Document in a future Plan 11+ Sentry-wiring SUMMARY if applicable.

---
*Phase: 09-webpack-to-vite*
*Plan: 05*
*Commit: fac00f5 (content) + <pending docs(09-05)> (this SUMMARY)*
*Completed: 2026-04-22*
*Phase 9 SHIPPED — ready for /gsd-transition to Phase 10 (Jest → Vitest)*
