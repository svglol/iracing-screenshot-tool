---
phase: 09-webpack-to-vite
plan: 02
subsystem: bundler-html-main-url
tags: [bundler, vite, html-migration, electron-renderer-url, d-09-10-commit-2-part-a]
requires: [09-01]
provides:
  - "`src/renderer/index.html` plain-HTML renderer entry (13 lines; `<script type=\"module\" src=\"./main.js\">` entry; no EJS delimiters; no `__static` literal)"
  - "`src/index.ejs` deleted (the webpack-era EJS template with the `module.globalPaths` injection hack + `window.__static` try/catch is gone from the tree)"
  - "`src/main/index.js` patched at 4 loadURL/loadFile sites (2 worker + 2 main) — dev branches now gate on `process.env.ELECTRON_RENDERER_URL` (electron-vite dev-server injection); prod branches use `path.join(__dirname, '../renderer/index.html')` for the out/ layout; worker `#/worker` hash preserved in both branches"
  - "D-09-10 commit 2 part A landed on master (`refactor(build): migrate EJS template to Vite renderer index.html; main-URL via ELECTRON_RENDERER_URL` — SHA `d237e4f`)"
  - "Build state at plan close: STILL INTENTIONALLY BROKEN — `electron.vite.config.mjs` is still the 5-line skeleton from Plan 09-01 (no externals/aliases/define/plugin-vue wiring) and `package.json` scripts still reference webpack; Plan 09-03 (config completion + first working `npm run dev`) and Plan 09-04 (script rewire + webpack/dev-runner deletion) together restore functional build"
affects:
  - "src/renderer/index.html"
  - "src/index.ejs"
  - "src/main/index.js"

tech_stack:
  added: []
  removed: []
  patterns:
    - "electron-vite dev-URL injection — `process.env.ELECTRON_RENDERER_URL` truthiness gates dev vs prod branches (canonical electron-vite pattern). The existing `const isDev = process.env.NODE_ENV === 'development'` at line 88 is retained for OTHER branches in src/main/index.js (unchanged) — only the 4 renderer-load sites switched signal source"
    - "Prod renderer path shift: `__dirname/index.html` → `path.join(__dirname, '../renderer/index.html')` — reflects electron-vite's out/main/index.js + out/renderer/index.html layout (vs webpack's flat dist/ layout)"
    - "Worker hash preservation across origin swap — in dev, `${process.env.ELECTRON_RENDERER_URL}#/worker` template-string concat (no trailing slash needed; vue-router's `createWebHashHistory` handles the fragment regardless of origin); in prod, `{ hash: '/worker' }` options arg on `loadFile` (unchanged semantics vs pre-edit)"
    - "Bisect-chain discipline — D-09-10 commit 2 INTENTIONALLY SPLIT into part A (this plan: template + main-URL) and part B (Plan 09-03: electron.vite.config.mjs completion + `_scripts/` cleanup). Bisect between HEAD and 09-01's commit (`13d84e1`) isolates any renderer-entry or dev-URL regression to part A; bisect between part A and part B isolates config-shape regressions from dev-URL-pattern regressions"

key_files:
  created:
    - "src/renderer/index.html"
  modified:
    - "src/main/index.js"
  deleted:
    - "src/index.ejs"

key-decisions:
  - "A4 correction from RESEARCH.md forecast (\"single loadURL/loadFile site\") → empirical truth (4 sites: workerWindow dev+prod + mainWindow dev+prod). Planner had captured this correction in Plan 09-02 Task 1; execution confirmed lines 294/296/325/327 exactly. The 4-site shape matters because worker + main are distinct windows with distinct hash-route semantics; each pair needs its own if/else migration."
  - "A8 outcome CLEAN — zero readers of `window.__static` or `global.__static` in src/renderer/** (`grep -rn '__static' src/renderer/` returned no matches). The EJS template's `window.__static = require('path').join(__dirname, '/static')` assignment (the try/catch at index.ejs:19-27) was defensive dead code — deleting the EJS template removes both the assignment and the dead readers (none existed). `global.__static` dead writes at src/main/index.js:299,328 kept verbatim per plan spec (out of Phase 9 scope; Phase 13 dead-code-cleanup candidate)."
  - "Prod renderer path: `path.join(__dirname, '../renderer/index.html')` chosen over `path.resolve(__dirname, '../renderer/index.html')` to match RESEARCH.md §Dev-Mode URL Loading (main process) canonical diff verbatim. Both forms would work on Windows + Linux + macOS (electron-vite's out/ layout is platform-invariant); `path.join` is the electron-vite docs' canonical form."
  - "`isDev` variable retention — line 88's `const isDev = process.env.NODE_ENV === 'development'` RETAINED despite removing all 4 renderer-load-branch `if (isDev)` usages. Other sites in src/main/index.js still reference `isDev` (e.g., workerWindow's `show: isDev` at line 273, devtools-extension branch at line ~116). Touching those would balloon the diff beyond the plan's 3-file scope."
  - "`global.__static` dead writes (lines 299, 328) PRESERVED — deleting them would change the diff shape from 'targeted 4-site patch' to 'mixed patch + dead-code cleanup', muddying bisect. Phase 13 scope per Plan 09-02 Task 4 action text."

patterns-established:
  - "ELECTRON_RENDERER_URL-as-dev-signal — for any future main-process Electron window `loadURL`/`loadFile` site that needs dev/prod branching under electron-vite, the canonical pattern is `if (process.env.ELECTRON_RENDERER_URL) { win.loadURL(...ELECTRON_RENDERER_URL...) } else { win.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: '...' }) }`. Hash routes get preserved via template-string concat in dev and `{ hash: ... }` options in prod — both survive vue-router's `createWebHashHistory` consumer."
  - "Pre-existing working-tree dirty state carry-over discipline — this plan encountered TWO kinds of out-of-scope dirty state: (1) bot/** files (21 entries, known since before Phase 9) and (2) `src/renderer/main.js` (surfaced fresh this plan — a PRE-EXISTING unstaged change that renames `'font-awesome-icon'` → `'FontAwesomeIcon'` + `'vue3-markdown-it'` → `'Vue3MarkdownIt'` in the `app.component(...)` registrations). Both kept unstaged per D-09-10 bisect-chain discipline. The `src/renderer/main.js` carry-over is documented explicitly (see Deviations) so Plan 09-03 can decide whether to adopt the rename or revert; zero effect on Plan 09-02's 3-file scope."

requirements-completed: [BUNDLER-01]

metrics:
  duration_minutes: 6
  tasks_completed: 6
  tasks_total: 6
  files_touched: 3
  completed_date: 2026-04-22
---

# Phase 9 Plan 02: HTML Template + Main-URL Migration Summary

**`src/index.ejs` retired → `src/renderer/index.html` plain HTML at electron-vite's default renderer root; `src/main/index.js` 4 loadURL/loadFile sites (worker + main × dev + prod) migrated from hardcoded `http://localhost:9080` + `__dirname/index.html` to `process.env.ELECTRON_RENDERER_URL` (dev) + `path.join(__dirname, '../renderer/index.html')` (prod); worker `#/worker` hash preserved across both branches via template-string concat (dev) + `{ hash: '/worker' }` options (prod); D-09-10 commit 2 part A landed as `d237e4f`; build remains INTENTIONALLY BROKEN (electron.vite.config.mjs skeleton + webpack-bound scripts — Plan 09-03 restores); 256/256 tests + 734 lint problems unchanged from Plan 09-01 baseline.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-22T17:12:00Z (approx)
- **Completed:** 2026-04-22T17:18:00Z (approx)
- **Tasks:** 6/6
- **Files modified:** 3 (src/renderer/index.html created, src/index.ejs deleted, src/main/index.js modified)

## Accomplishments

- D-09-10 commit 2 part A landed on master (`refactor(build): migrate EJS template to Vite renderer index.html; main-URL via ELECTRON_RENDERER_URL` — SHA `d237e4f`) with exactly 3 files (A/D/M)
- EJS template retired; Vite-convention renderer entry HTML in place at electron-vite's default `renderer.root` location
- 4 loadURL/loadFile sites migrated atomically — worker window dev+prod branches + main window dev+prod branches — with worker hash route preserved in both
- Zero `localhost:9080` references remain in src/main/index.js
- Zero EJS `<%` `%>` delimiters in src/
- Zero `__static` references in src/renderer/** (both the deleted EJS assignment + zero consumers — A8 CLEAN)
- `isDev` variable retained at src/main/index.js:88 for other (non-renderer-load) `isDev` usage sites — not touched
- `global.__static` dead writes at lines 299/328 preserved verbatim (Phase 13 cleanup candidate)
- `npm test` 256/256 green post-edit (no regression from template/main-URL changes — none of Jest's watch set references the modified paths)
- `npm run lint` 734 problems (≤1881 band; identical to Phase 9 Plan 01 close)
- No post-lint formatting drift on plan-scope files (unlike Plan 09-01's `electron.vite.config.mjs` drift — HTML + main-URL files lint-clean as written)
- bot/** dirty files (21 entries, same count as Plan 09-01 close) — untouched + unstaged throughout
- Pre-existing `src/renderer/main.js` working-tree dirty state (component-name rename from kebab-case to PascalCase) — left unstaged + unmodified per D-09-10 bisect-chain discipline

## Empirical Assumption Outcomes

| Assumption | Hypothesis | Outcome | Evidence |
| ---------- | ---------- | ------- | -------- |
| A4 (corrected) | `src/main/index.js` has a single loadURL/loadFile site to patch | **WRONG — 4 sites** | `grep -nE "loadURL\|loadFile" src/main/index.js` returned exactly 4 lines: 294 (`workerWindow.loadURL('http://localhost:9080/#/worker');`), 296 (`workerWindow.loadFile(path.join(__dirname, 'index.html'), {`), 325 (`mainWindow.loadURL('http://localhost:9080');`), 327 (`mainWindow.loadFile(\`${__dirname}/index.html\`);`). Planner had captured this correction in Plan 09-02 Task 1; execution confirmed the exact line numbers. Two windows × two branches = 4 sites. |
| A8 | `__static` global's EJS `try/catch` guard can be deleted safely (zero renderer-side readers) | **CONFIRMED — ZERO READERS** | `Grep pattern='__static\|process\.env\.NODE_ENV' path='src/renderer'` returned NO matches. `Grep pattern='9080\|ELECTRON_RENDERER_URL\|__static' path='src'` showed `__static` only in src/index.ejs (the deleted file) and src/main/index.js:299,328 (the `global.__static` dead writes — out of scope per plan). The EJS template's `window.__static = require('path')...` try/catch at lines 19-27 had ZERO consumers in src/renderer/**; safely retired with the EJS template. `global.__static` dead writes in main stay — Phase 13 scope. |

## loadURL/loadFile Site Inventory — Pre-Edit → Post-Edit

| Site | Line (pre) | Pre-Edit | Line (post) | Post-Edit |
| ---- | ---------- | -------- | ----------- | --------- |
| workerWindow dev | 293-294 | `if (isDev) { workerWindow.loadURL('http://localhost:9080/#/worker'); }` | 293-294 | `if (process.env.ELECTRON_RENDERER_URL) { workerWindow.loadURL(\`${process.env.ELECTRON_RENDERER_URL}#/worker\`); }` |
| workerWindow prod | 295-300 | `else { workerWindow.loadFile(path.join(__dirname, 'index.html'), { hash: '/worker' }); global.__static = ...; }` | 295-300 | `else { workerWindow.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: '/worker' }); global.__static = ...; }` |
| mainWindow dev | 324-325 | `if (isDev) { mainWindow.loadURL('http://localhost:9080'); }` | 324-325 | `if (process.env.ELECTRON_RENDERER_URL) { mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL); }` |
| mainWindow prod | 326-329 | `else { mainWindow.loadFile(\`${__dirname}/index.html\`); global.__static = ...; }` | 326-329 | `else { mainWindow.loadFile(path.join(__dirname, '../renderer/index.html')); global.__static = ...; }` |

**Invariants preserved across all 4 sites:**
- Worker's `#/worker` hash route (dev: template-string concat; prod: `{ hash: '/worker' }` options arg)
- `global.__static` dead writes (kept verbatim — Phase 13 cleanup scope)
- Adjacent logic in createWindow() (remoteMain.enable, webPreferences, on('ready-to-show'), on('close'), on('closed'), title, x/y/w/h, backgroundColor, frame, icon, Menu.setApplicationMenu) — all untouched

**Tactical changes per site:**
- Dev-branch SIGNAL: `isDev` (NODE_ENV-derived) → `process.env.ELECTRON_RENDERER_URL` (electron-vite-injected). The `isDev` variable itself is RETAINED at line 88 because other sites elsewhere in main/index.js consume it (e.g., `show: isDev` at line 273, devtools-extension branch at ~116).
- Dev-branch URL: hardcoded `http://localhost:9080` → `process.env.ELECTRON_RENDERER_URL`. No port referenced anywhere in src/ now.
- Prod-branch path: `__dirname/index.html` (webpack dist/ flat layout) → `path.join(__dirname, '../renderer/index.html')` (electron-vite out/main/ + out/renderer/ layout).

## Dropped EJS Artifacts

| Artifact | Rationale for Drop |
| -------- | ------------------ |
| `<% if (htmlWebpackPlugin.options.nodeModules) { %> <script> require('module').globalPaths.push(...) </script> <% } %>` (index.ejs:7-13) | Webpack-era workaround for Electron dev-mode node_modules path injection. electron-vite's dev server serves the renderer via Vite's native ESM dev-server — Vite's module graph resolves dependencies without manipulating `module.globalPaths`. Hack is unneeded under Vite. |
| `window.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')` inside a try/catch (index.ejs:19-27) | Prod-runtime `__static` assignment for the renderer context. Under electron-vite, `__static` becomes a renderer-config `define` (Plan 09-03 lands that in `electron.vite.config.mjs`'s renderer block, per RESEARCH.md §Config File Pattern). A8 empirical outcome confirmed zero consumers in src/renderer/** — the assignment was defensive dead code. |
| Empty `<title></title>` | PRESERVED in the new HTML verbatim (not dropped). |
| `<div id="app"></div>` | PRESERVED. |
| `utf-8` charset meta + viewport meta + DOCTYPE | PRESERVED. |

**Added:** `<script type="module" src="./main.js">` — Vite's native ESM-entry convention. Under electron-vite's default `renderer.root = src/renderer/`, the relative `./main.js` resolves to `src/renderer/main.js` (the existing renderer entry, unchanged by this plan).

**Not Added:**
- `<link rel="stylesheet">` or `<style>` block (all styles enter via `src/renderer/main.js` importing `src/renderer/assets/style/main.scss` — wired in Phase 8)
- `<base href="./">` (Vite handles base URL via config `base: './'` — Plan 09-03's job if prod file-URL load needs it)

## Build State at Plan Close

**STILL INTENTIONALLY BROKEN** — consistent with D-09-10 three-commit bisect chain:

| Script | State at Plan 09-02 Close | Restored By |
| ------ | ------------------------- | ----------- |
| `npm run dev` | BROKEN (references `_scripts/dev-runner.js` which requires removed `tree-kill`/`chalk`; webpack too) | Plan 09-03 (dev smoke test) |
| `npm run pack:main` | BROKEN (references `webpack --config _scripts/webpack.main.config.js`; webpack removed) | Plan 09-04 (script rewire) |
| `npm run pack:renderer` | BROKEN (references `webpack --config _scripts/webpack.renderer.config.js`; webpack removed; also still references now-deleted `src/index.ejs` via its template config — renderer build would fail for two distinct reasons) | Plan 09-04 |
| `npm run build` | BROKEN (delegates to pack + build:dir; pack is broken upstream) | Plan 09-05 (electron-builder integration) |
| `npm run build:dev:dir` | BROKEN (references `_scripts/build-dev.js`; webpack-bound) | Plan 09-04 |
| `npm test` | **GREEN (256/256)** — Jest unaffected by bundler migration (no src/renderer/** paths in Jest's watch set) | - |
| `npm run lint` | **GREEN (≤1881 band: 734 problems)** — ESLint unaffected | - |

Plan 09-03 makes `npm run dev` work for the first time on electron-vite; Plan 09-04 rewires all `pack*`/`dev*` scripts to the electron-vite CLI; Plan 09-05 flips electron-builder's `build.files` + `main` entry to the out/ layout so installers ship.

## Commit

**SHA:** `d237e4f`
**Message:** `refactor(build): migrate EJS template to Vite renderer index.html; main-URL via ELECTRON_RENDERER_URL`
**Files (3):**
- A (create) `src/renderer/index.html` — 13 lines + trailing newline
- D (delete) `src/index.ejs` — 31 lines retired
- M (modify) `src/main/index.js` — 8 lines changed across the 4 loadURL/loadFile sites (4 if-conditions + 4 load-call args; prod-path shift + dev-signal shift)

**Commit stat:** `3 files changed, 20 insertions(+), 37 deletions(-)` — net -17 lines, reflecting the EJS template retirement.

No Co-Authored-By footer; no `--no-verify` flag; explicit `git add src/renderer/index.html src/main/index.js` (deletion staged via `git rm src/index.ejs` in Task 3).

## Test + Lint Gates

| Gate | Target | Result | Evidence |
| ---- | ------ | ------ | -------- |
| `npm test` | 256/256 green | **PASS** | `Test Suites: 5 passed, 5 total / Tests: 256 passed, 256 total / Time: 0.897s` |
| `npm run lint` | ≤1881 problems | **PASS** (734 problems) | `✖ 734 problems (731 errors, 3 warnings)` — identical to Plan 09-01 close (zero delta from this plan's changes) |
| Post-lint formatting drift on plan-scope files | none | **CLEAN** | `git status --short \| grep -E 'src/main/index\.js\|src/renderer/index\.html'` → no matches (Plan 09-01 saw `electron.vite.config.mjs` tab-indent drift; this plan's files lint-clean as-written) |

## Deviations from Plan

### Pre-Existing Dirty State Carry-Over

**1. [Rule N/A — Pre-existing out-of-scope dirty state] `src/renderer/main.js` unstaged modification surfaced at Plan start; left untouched per D-09-10 bisect-chain discipline**

- **Found during:** Task 5 (`git status --short` scope check)
- **State at Plan start:** `src/renderer/main.js` had a pre-existing unstaged modification not introduced by any Plan 09-02 task. Diff shows two component-name renames: `app.component('font-awesome-icon', FontAwesomeIcon)` → `app.component('FontAwesomeIcon', FontAwesomeIcon)` and `app.component('vue3-markdown-it', Vue3MarkdownIt)` → `app.component('Vue3MarkdownIt', Vue3MarkdownIt)`. `git log -1 -- src/renderer/main.js` shows the file was last committed in Phase 8 Plan 06's `868688a` (the Vue 3 plugin swap commit); the working-tree rename is post-commit drift.
- **Decision:** Left the dirty state as-is — NOT staged, NOT reverted. Plan 09-02's 3-file scope is hard-bounded (src/renderer/index.html A, src/index.ejs D, src/main/index.js M). Staging `src/renderer/main.js` would balloon the commit beyond scope; reverting would destroy possibly-intentional pending work. Same treatment as bot/** dirty files: out of scope, left to user/next plan to resolve.
- **Impact:** Zero effect on Plan 09-02 deliverables. Plan 09-03 (config completion + dev smoke test) will encounter the same working-tree state at its start; planner can decide to adopt the rename (if it matches Plan 09-03's config changes around renderer components) or revert (if it's stale unintended edit). Documented here for visibility.
- **Files:** `src/renderer/main.js` (2 lines different from committed form; unstaged throughout Plan 09-02)

### Auto-fixed Issues

None. All 6 tasks executed linearly. No Rule 1/2/3 deviations needed. RESEARCH.md's A4 "single site" forecast was ALREADY corrected in the plan spec (Task 1 called out the 4-site truth pre-execution), so the empirical verification landed on-forecast-after-correction — not a mid-execution surprise.

### Scope-Expansion Considered + Rejected

- **Could have cleaned up `global.__static` dead writes at lines 299, 328** — rejected per plan Task 4 action text ("out of scope to delete here; Phase 13 scope"). Touching them would balloon the diff shape from "4-site targeted patch" to "mixed patch + dead-code cleanup", muddying the bisect.
- **Could have deleted `_scripts/webpack.renderer.config.js` (the only remaining `index.ejs` reference)** — rejected; Plan 09-04 owns webpack-config retirement. Grep audit in Task 3 confirmed only 1 remaining `index.ejs` ref after the delete (at webpack.renderer.config.js:95); that file goes in Plan 09-04.

**Total deviations:** 0 auto-fixed + 1 pre-existing-dirty-state documented carry-over.
**Impact on plan:** None. Plan executed as spec'd; 3-file scope held.

## Threat Model Dispositions

| Threat ID | Category | Component | Disposition at Plan Close | Evidence |
| --------- | -------- | --------- | ------------------------- | -------- |
| T-09-02-01 | Spoofing | `process.env.ELECTRON_RENDERER_URL` injection | **Accepted** | Env var is electron-vite-CLI-set only in dev (build artifact doesn't inherit dev env at prod). In prod builds, the variable will be unset → file-URL fallback activates. A user manually setting `ELECTRON_RENDERER_URL` at prod runtime could redirect the main window to an attacker URL — but same attack surface already existed via `NODE_ENV` override pre-migration. Pre-existing risk class; no new surface introduced. |
| T-09-02-02 | Tampering | EJS template deletion removes `module.globalPaths` inject | **Mitigated** | A8 grep confirmed zero consumers in src/renderer/**. `window.__static` had no readers. `module.globalPaths` injection was webpack-dev-specific; electron-vite's dev server resolves renderer imports via Vite's module graph (no `globalPaths` trickery needed). If a prod-runtime regression surfaces (unlikely — the hack was in a `try/catch` defensive block, suggesting it was speculative), fallback is a non-EJS `<script>` tag in `src/renderer/index.html` — documented as Phase 9 follow-up ticket candidate. |
| T-09-02-03 | Denial of Service | Worker window's `#/worker` hash route fails post-migration | **Mitigated** | Hash preserved in both dev (template-string: `${process.env.ELECTRON_RENDERER_URL}#/worker`) and prod (`loadFile` options: `{ hash: '/worker' }`). vue-router 4's `createWebHashHistory` (from Phase 8 Plan 01) consumes `#/worker` the same way regardless of origin — file:// or http://. Router confirmed to register `/worker` at src/renderer/router/index.js:21. Plan 09-03's first dev smoke test catches any regression empirically. |
| T-09-02-04 | Information Disclosure | `global.__static` dead writes retained | **Accepted** | Out of Phase 9 scope (Phase 13 dead-code-cleanup ticket). Dead writes have no downstream reader per A8 grep + zero consumers found across src/. Leaving them verbatim minimizes diff shape. |

**Block threshold held (MODERATE):** No HIGH-severity regression surfaced. Test + lint gates green. Plan proceeds to Plan 09-03 for config completion + empirical dev-mode smoke test (first live verification of T-09-02-03 hash-route preservation).

## Self-Check

Verified post-commit:

- [x] `src/renderer/index.html` exists (13 lines + trailing newline; `<script type="module" src="./main.js">` entry; no EJS delimiters; no `__static`)
- [x] `src/index.ejs` does NOT exist (`test ! -f src/index.ejs` → 0)
- [x] `src/main/index.js` has exactly 4 `ELECTRON_RENDERER_URL` references (2 env-var reads + 2 loadURL args)
- [x] `src/main/index.js` has ZERO `localhost:9080` references (`grep -c 'localhost:9080' src/main/index.js` → 0)
- [x] `src/main/index.js` has exactly 2 `'../renderer/index.html'` references (worker prod + main prod)
- [x] `src/main/index.js` retains 1 `hash: '/worker'` (worker prod options arg) + 1 `ELECTRON_RENDERER_URL.*#/worker` pattern (worker dev template concat)
- [x] `src/main/index.js` retains `const isDev = process.env.NODE_ENV === 'development'` at line 88 (other sites still use it)
- [x] Commit `d237e4f` exists on master (`git log --oneline -3` confirms)
- [x] `git log -1 --format=%s` = `refactor(build): migrate EJS template to Vite renderer index.html; main-URL via ELECTRON_RENDERER_URL`
- [x] `git log -1 --format=%B | grep -ci 'Co-Authored'` = 0 (no coauthor footer)
- [x] `git show --stat HEAD --format=` references exactly 3 plan-scope files (src/renderer/index.html + src/index.ejs + src/main/index.js)
- [x] `git show --stat HEAD` line-delta = `3 files changed, 20 insertions(+), 37 deletions(-)` (net -17 from EJS retirement)
- [x] `git status --short | grep -cE '^[ ]?M bot|^\?\? bot'` = 21 (bot/** dirty count unchanged from Plan 09-01 close)
- [x] `npm test` → 256/256 green
- [x] `npm run lint` → 734 problems (≤1881 band)
- [x] No post-lint formatting drift on plan-scope files (`git status --short | grep -E 'src/main/index\.js|src/renderer/index\.html'` → empty)

**Self-Check: PASSED**

## Notes for Plan 09-03

Plan 09-03 is the **electron.vite.config.mjs completion + first dev-mode smoke test** plan. It fleshes the 5-line skeleton from Plan 09-01 into the canonical config shape from RESEARCH.md §Config File Pattern:

### Config scope (canonical targets)

1. **`main` sub-config:**
   - `plugins: [externalizeDepsPlugin()]` — auto-externalizes `dependencies` (sharp confirmed via Plan 09-01 A5 as in `dependencies`, not devDependencies)
   - `build.rollupOptions.external`: `['electron', '@electron/remote', 'electron-updater', 'irsdk-node', 'sharp']` (belt-and-suspenders for native modules)
   - `resolve.alias`: `@` + `src` only — **DROP `icons` per Plan 09-01 A6 UNUSED outcome**
   - `define`: `__static` (main-context: absolute `resolve(__dirname, 'static')` path), `process.env.PRODUCT_NAME`
2. **`renderer` sub-config:**
   - `plugins: [vue()]` (from `@vitejs/plugin-vue@6.0.6` — Plan 09-01 installed)
   - `build.rollupOptions.external`: `['electron', '@electron/remote', 'sharp']`
   - `resolve.alias`: `@` + `src` only (no `icons`)
   - `css.preprocessorOptions.scss.loadPaths`: `[resolve(__dirname, 'node_modules')]` — **MUST port from Phase 8 Plan 04's webpack fix** (sass-loader v16 / Dart Sass modern API doesn't traverse node_modules or package-export maps by default; the Oruga theme-bulma `@use '@oruga-ui/theme-bulma/dist/scss/theme-build'` target won't resolve without this loadPath)
   - `define`: `__static` (renderer-context: `JSON.stringify('/static')` relative per RESEARCH's canonical), `process.env.PRODUCT_NAME`
3. **`preload` sub-config:** OMIT (project doesn't use preload scripts; nodeIntegration still on per carryforward)
4. **`renderer.root`:** defaults to `src/renderer/` in electron-vite — aligns with Plan 09-02's new HTML location. Do NOT override unless Plan 09-03 decides to change the layout.

### Script handling (defer to Plan 09-04)

Plan 09-03 does NOT yet rewire `package.json` scripts. `npm run dev` and `npm run pack:*` stay webpack-referencing until Plan 09-04. Plan 09-03's dev smoke test runs via `npx electron-vite dev` directly (not `npm run dev`) — explicit CLI invocation bypasses the broken script wiring.

### Dev-mode smoke test (REQUIRED per Plan 09-03 plan gate)

1. `npx electron-vite dev` — expect: Vite dev server + Electron main + Electron renderer window all launch; Home view renders with FA v7 icons + Oruga components (from Phase 8); no blank window, no worker-window error
2. Edit `src/renderer/views/Home.vue` text → expect: HMR replaces the component inline (DevTools Network panel shows HMR ping, not full reload)
3. Edit `src/main/index.js` window title → expect: main process restarts, window reopens with new title
4. Clean shutdown — no orphaned Electron or Vite processes
5. Worker window `#/worker` route — verify the worker window loads + hash route renders the worker view (Plan 09-02's T-09-02-03 live verification gate)

### Pre-existing dirty state discipline

Plan 09-03 will encounter the same pre-existing `src/renderer/main.js` unstaged modification Plan 09-02 documented (component-name rename kebab-case → PascalCase at app.component registrations). Planner should decide: adopt (if Plan 09-03's renderer.alias changes or FA registration changes resolve the rename), revert (if stale unintended edit), or carry-forward to Plan 09-04 (if out of Plan 09-03 scope). The bot/** dirty state (21 files) carries forward unchanged.

### Open invariants for Plan 09-03

- `icons` alias: CONFIRMED UNUSED (Plan 09-01 A6) — OMIT from both main + renderer alias blocks
- `sharp` externalization: CONFIRMED auto-handled by `externalizeDepsPlugin()` (Plan 09-01 A5 — `sharp` in `dependencies`) — explicit `external` entry is belt-and-suspenders
- `__static` semantics: main sub-config = absolute path, renderer sub-config = `'/static'` relative (per RESEARCH.md canonical)
- SCSS loadPaths: mandatory port from `_scripts/webpack.renderer.config.js:54` to prevent Oruga theme-bulma @use resolution failure (Phase 8 Plan 04 scar tissue)

## Next Phase Readiness

- **Ready for Plan 09-03:** Template in place at Vite convention; main-URL wired to electron-vite's dev-URL injection pattern; skeleton config awaits fleshing out; all Plan 09-01 empirical outcomes (A5 sharp, A6 icons) carried forward as Plan 09-03 inputs.
- **Build STILL not functional:** `npm run dev` / `npm run pack:*` / `npm run build` all remain broken until Plans 09-03 + 09-04 + 09-05 land. This is the D-09-10 three-commit chain midpoint (chain: 13d84e1 → d237e4f → pending Plan 09-03/04 consolidation → pending Plan 09-05).
- **Jest still green (256/256):** Phase 10 Vitest migration untouched. Phase 9 does not disturb test infra.
- **Lint still 734 (≤1881):** Zero ESLint plugin/config changes in Plan 09-02.

---
*Phase: 09-webpack-to-vite*
*Plan: 02*
*Commit: d237e4f (content) + <pending docs(09-02)> (this SUMMARY)*
*Completed: 2026-04-22*
