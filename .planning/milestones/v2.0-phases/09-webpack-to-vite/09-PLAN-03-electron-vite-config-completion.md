---
phase: 09-webpack-to-vite
plan: 03
type: execute
wave: 3
depends_on: [09-02]
files_modified:
  - electron.vite.config.mjs
autonomous: true
requirements: [BUNDLER-01]
tags: [bundler, vite, electron-vite-config, externals, aliases, scss-loadpaths, dev-smoke-test, d-09-10-commit-2-part-b]
must_haves:
  truths:
    - "`electron.vite.config.mjs` contains a complete `defineConfig({ main: {...}, renderer: {...} })` with externals, aliases, define, and SCSS loadPaths"
    - "`npx electron-vite dev` launches the Vite dev server + spawns Electron, the window opens, and the Home view renders"
    - "Renderer HMR is confirmed live via a one-line Vue SFC edit visible in <2s without full reload"
    - "Main-process restart on change is confirmed via a one-line src/main/index.js edit that re-spawns Electron"
    - "`__static` `define` propagates to both main + renderer sub-configs (Phase 8's dead-writes in main/index.js still work OR are confirmed unused)"
    - "Build is PARTIALLY working: `npm run dev` launches via `npx electron-vite dev` (one-off, not yet wired in package.json scripts — Plan 09-04 does that); `npm run pack:*` still broken because it references the deleted-in-Plan-09-04 webpack configs"
  artifacts:
    - path: "electron.vite.config.mjs"
      provides: "Full electron-vite config: main + renderer sub-configs with externals, aliases, SCSS preprocessorOptions, define blocks"
      contains: "externalizeDepsPlugin"
      contains_2: "@vitejs/plugin-vue"
      min_lines: 40
  key_links:
    - from: "electron.vite.config.mjs main.plugins"
      to: "electron-vite externalizeDepsPlugin"
      via: "externalize main-process dependencies"
      pattern: "externalizeDepsPlugin"
    - from: "electron.vite.config.mjs renderer.plugins"
      to: "@vitejs/plugin-vue"
      via: "Vue SFC parsing"
      pattern: "vue\\(\\)"
    - from: "electron.vite.config.mjs renderer.css.preprocessorOptions.scss.loadPaths"
      to: "node_modules (for @oruga-ui/theme-bulma resolution)"
      via: "dart-sass loadPaths"
      pattern: "loadPaths"
    - from: "electron.vite.config.mjs main.resolve.alias / renderer.resolve.alias"
      to: "src/ directory"
      via: "@ + src aliases (drop icons per A6)"
      pattern: "'@':|'src':"
---

<objective>
Complete `electron.vite.config.mjs` from the Plan 09-01 skeleton to a production-ready config — externals for native modules (`sharp`, `irsdk-node`, `@electron/remote`, `electron-updater`), `@` + `src` aliases matching the two webpack configs (drop `icons` alias per empirical A6 — `_icons/` directory does not exist), SCSS `loadPaths: [node_modules]` porting the Phase 8 Plan 03 theme-bulma fix, `define` blocks for `__static` + `process.env.PRODUCT_NAME`, and `@vitejs/plugin-vue` wired into `renderer.plugins`. Run the first end-to-end `npx electron-vite dev` smoke test: Electron window opens, renderer HMR confirmed live, main-process restart-on-change confirmed.

This is D-09-10 commit 2 part B (the config-completion half of `refactor(build): replace webpack with electron-vite`). Plan 09-04 ships part C (webpack script + dev-runner retirement + package.json scripts rewire). Keeping this commit scoped to the config file only means `git bisect` between this commit and 09-02 isolates config shape regressions from the scripts rewire.

Purpose: This is where electron-vite starts doing work — the config is the authoritative contract between the renderer/main source trees and the bundler. Shipping a correct config before retiring webpack (Plan 09-04) gives us a back-out lane: if electron-vite's behaviour surprises us, we can still revert this commit and `npm run dev-runner` keeps working on the old webpack chain.

Output: One `refactor(build): flesh out electron.vite.config.mjs (externals, aliases, SCSS, define, plugin-vue)` commit (single file) + `docs(09-03): ...` commit for the SUMMARY.

**Bisect intent:** Post-commit, `git bisect start HEAD HEAD~1` isolates regressions caused purely by the config expansion (e.g., wrong externals breaking main-process startup, alias miss breaking a renderer import, SCSS loadPaths regression breaking @oruga-ui/theme-bulma). Separates cleanly from Plan 09-02 (template + main-URL) and Plan 09-04 (scripts + webpack retirement).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-webpack-to-vite/09-CONTEXT.md
@.planning/phases/09-webpack-to-vite/09-RESEARCH.md
@.planning/phases/09-webpack-to-vite/09-01-SUMMARY.md
@.planning/phases/09-webpack-to-vite/09-02-SUMMARY.md
@.planning/phases/08-vue3-core-merged/08-03-SUMMARY.md
@electron.vite.config.mjs
@_scripts/webpack.main.config.js
@_scripts/webpack.renderer.config.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Inventory webpack config → electron-vite config mapping surface</name>
  <read_first>
    - `_scripts/webpack.main.config.js` (88 lines — source of truth for main's externals, aliases, define)
    - `_scripts/webpack.renderer.config.js` (146 lines — source of truth for renderer's externals, vue-loader, SCSS loadPaths, define, HtmlWebpackPlugin, CopyWebpackPlugin, aliases)
    - 09-RESEARCH.md §Config File Pattern (CANONICAL) — target shape, MINUS `icons` alias (A6 outcome)
    - 09-RESEARCH.md §Pitfalls P1-P4
  </read_first>
  <action>
    Extract the following from the webpack configs into scratch notes for Task 2:

    **From `_scripts/webpack.main.config.js`:**
    - Line 16-22 externals list: `electron`, `@electron/remote`, `electron-updater`, `irsdk-node`, `sharp` (5 entries)
    - Line 40-44 DefinePlugin: `process.env.PRODUCT_NAME`
    - Line 52-55 aliases: `@` → `src/`, `src` → `src/` (NO `icons` in main config)
    - Line 62-67 dev-mode DefinePlugin: `__static` → path.join(__dirname, '../static').replace(/\\/g, '\\\\')

    **From `_scripts/webpack.renderer.config.js`:**
    - Line 24-28 externals: `electron`, `@electron/remote`, `sharp` (3 entries — LESS than main's list; renderer doesn't need irsdk-node/electron-updater since those are main-process)
    - Line 46-58 sass-loader options including `sassOptions.loadPaths: [path.join(__dirname, '../node_modules')]` — THE Phase 8 Plan 03 theme-bulma fix
    - Line 92-99 HtmlWebpackPlugin — REPLACED by Vite's native index.html consumption (Plan 09-02 moved HTML to src/renderer/index.html)
    - Line 100 VueLoaderPlugin — REPLACED by `@vitejs/plugin-vue` in renderer.plugins
    - Line 101-103 DefinePlugin: `process.env.PRODUCT_NAME`
    - Line 104-107 MiniCssExtractPlugin — REPLACED by Vite's native CSS handling
    - Line 109-115 aliases: `@` → `src/`, `src` → `src/`, `icons` → `_icons/` (DROP icons per A6)
    - Line 120-127 dev-mode DefinePlugin: `__static`
    - Line 129-143 CopyWebpackPlugin `static/` → `dist/static/` — REPLACED by D-09-06 strategy (keep static/ at project root + `__static` define + electron-builder's `extraResources` still handles icon.png copy)

    **From 09-RESEARCH.md §Pitfalls P1/P2/P3:**
    - P1: `sharp` in `dependencies` (verified A5 in Plan 09-01) → `externalizeDepsPlugin()` picks it up; explicit `rollupOptions.external` is belt-and-suspenders for native modules
    - P2: Add `define` for `__VUE_OPTIONS_API__: 'true'` and `__VUE_PROD_DEVTOOLS__: 'false'` — renderer-only. These silence Vue 3 feature-flag warnings (Phase 8 uses Options API exclusively per D-07)
    - P3: Windows path escaping (`replace(/\\/g, '\\\\')`) — harmless in Vite's `define` block; can carry forward from webpack configs for bug-parity

    Record the full mapping in scratch notes for Task 2. Also confirm:
    ```
    grep -rE "(@|src)/.*" src/renderer/ --include='*.vue' | grep -cE "(from|import).+['\"]@/|from|import.+['\"]src/" | head -5
    ```
    Confirms `@` and `src` aliases are still in use (expected: non-zero; carried forward from Phase 8).

    And the definitive A6 negative control:
    ```
    grep -rE "['\"]icons/" src/ --include='*.{js,vue,scss}'
    ```
    Expected: 0 matches → `icons` alias MUST be dropped from the new config (already an empirical fact from planner scout; re-verify here so the SUMMARY records both pre-edit and post-edit verification).
  </action>
  <verify>
    <automated>
    # At-least-one consumer of @ and src aliases in renderer (so we can't drop them)
    grep -rE "from ['\"]@/|from ['\"]src/" src/renderer/ --include='*.vue' --include='*.js' | head -1 | grep -q .
    # Zero consumers of icons alias (so we CAN drop it)
    ! grep -rqE "from ['\"]icons/" src/ --include='*.vue' --include='*.js' --include='*.scss'
    # _icons directory confirmed absent
    ! test -d _icons
    </automated>
  </verify>
  <acceptance_criteria>
    - Externals lists recorded (main: 5 modules, renderer: 3 modules)
    - Aliases recorded (@, src carry forward; icons dropped)
    - SCSS loadPaths path recorded
    - Define blocks recorded (__static, PRODUCT_NAME, Vue 3 feature flags)
    - A6 negative control re-verified (0 icons/ imports)
  </acceptance_criteria>
  <done>Mapping ready to author Task 2's full config.</done>
</task>

<task type="auto">
  <name>Task 2: Write the complete electron.vite.config.mjs</name>
  <read_first>
    - The scratch notes from Task 1 (exhaustive mapping)
    - Current `electron.vite.config.mjs` skeleton from Plan 09-01 (5-6 lines)
    - 09-RESEARCH.md §Config File Pattern (CANONICAL) — the target shape modulo A6 (drop icons alias)
  </read_first>
  <action>
    Using the Write tool, REPLACE `electron.vite.config.mjs` with the full config. Target content (adapted from 09-RESEARCH.md §Config File Pattern with: `icons` alias DROPPED per A6, Vue 3 feature flags ADDED per P2, path imports via `node:path` for ESM compatibility):

    ```javascript
    import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
    import vue from '@vitejs/plugin-vue';
    import { resolve, dirname } from 'node:path';
    import { fileURLToPath } from 'node:url';

    const __dirname = dirname(fileURLToPath(import.meta.url));

    export default defineConfig({
        main: {
            plugins: [externalizeDepsPlugin()],
            build: {
                rollupOptions: {
                    external: [
                        'electron',
                        '@electron/remote',
                        'electron-updater',
                        'irsdk-node',
                        'sharp',
                    ],
                },
            },
            resolve: {
                alias: {
                    '@': resolve(__dirname, 'src'),
                    src: resolve(__dirname, 'src'),
                },
            },
            define: {
                __static: JSON.stringify(
                    resolve(__dirname, 'static').replace(/\\/g, '\\\\')
                ),
                'process.env.PRODUCT_NAME': JSON.stringify(
                    'iRacing Screenshot Tool'
                ),
            },
        },
        renderer: {
            root: resolve(__dirname, 'src/renderer'),
            plugins: [vue()],
            build: {
                rollupOptions: {
                    external: ['electron', '@electron/remote', 'sharp'],
                },
            },
            resolve: {
                alias: {
                    '@': resolve(__dirname, 'src'),
                    src: resolve(__dirname, 'src'),
                },
            },
            css: {
                preprocessorOptions: {
                    scss: {
                        loadPaths: [resolve(__dirname, 'node_modules')],
                    },
                },
            },
            define: {
                __static: JSON.stringify('/static'),
                'process.env.PRODUCT_NAME': JSON.stringify(
                    'iRacing Screenshot Tool'
                ),
                __VUE_OPTIONS_API__: 'true',
                __VUE_PROD_DEVTOOLS__: 'false',
            },
        },
    });
    ```

    Key notes on this content (document all in SUMMARY):

    1. **No `icons` alias** (A6: `_icons/` directory doesn't exist, zero imports) — unlike RESEARCH.md's §Config File Pattern sample, which still listed it conditionally. RESEARCH had noted "preserve only if grep confirms usage"; empirical grep in Task 1 = 0.

    2. **`__dirname` reconstruction via `fileURLToPath`** — ESM doesn't provide `__dirname` natively. The `node:path` + `node:url` imports are explicit Node built-ins (prefer `node:` protocol for `.mjs` per Node 20+ conventions).

    3. **`renderer.root: resolve(__dirname, 'src/renderer')`** — explicit, matches where `index.html` lives (Plan 09-02). electron-vite's default is to look for `index.html` under the renderer root; we pin it explicitly so the default is never surprising.

    4. **Externals are duplicated explicitly** — `externalizeDepsPlugin()` auto-externalizes all `dependencies` (main process), but the explicit `rollupOptions.external` list is belt-and-suspenders for native modules (P1 recommendation). Renderer externals are a smaller set (3 modules) because the renderer doesn't use `irsdk-node` or `electron-updater` directly.

    5. **Feature flags** (`__VUE_OPTIONS_API__: 'true'`, `__VUE_PROD_DEVTOOLS__: 'false'`) — silences Vue 3 feature-flag warnings (P2). Phase 8 uses Options API exclusively per D-07. The flag values are raw strings (not `JSON.stringify`'d) because they're bool literals in the inline Vue runtime code.

    6. **`__static` asymmetry** — main process uses absolute filesystem path (Windows-escaped) because it's consumed by Node filesystem APIs; renderer uses `/static` (runtime-relative) because in prod the renderer loads via `file://` and the path is DOM-side. Mirrors webpack's two-config asymmetry.

    7. **No `preload` block** — per D-09-01 Claude's Discretion note + CONTEXT.md last line: project doesn't use preload scripts (nodeIntegration still on). Adding an empty `preload: {}` would make electron-vite look for `src/preload/index.js` and error.

    8. **No `vite-plugin-static-copy`** — per D-09-06, we keep `static/` at project root and rely on electron-builder's `extraResources` (package.json:26-30) to copy `static/icon.png` at packaging time. Dev mode doesn't need the copy — Vite's dev server serves assets from `public/` which defaults to `<renderer.root>/public/` but we use `__static` define to point at the project-root `static/` absolute path.

    9. **No `build.outDir` override** — electron-vite's default layout is `out/main/`, `out/renderer/`, `out/preload/` — we accept this (D-09-08 aligns `electron-builder` `build.files` in Plan 09-05).

    After writing, verify the file:
    ```
    node --input-type=module -e "import('./electron.vite.config.mjs').then(c => console.log('loaded:', typeof c.default))"
    ```
    Expected: `loaded: object` (defineConfig returns an object).
  </action>
  <verify>
    <automated>
    test -f electron.vite.config.mjs
    wc -l electron.vite.config.mjs | awk '{ if ($1+0 >= 40 && $1+0 <= 100) print "OK"; else print "FAIL: "$1" lines"; }' | grep -q OK
    # Key plugins and blocks present
    grep -q "externalizeDepsPlugin" electron.vite.config.mjs
    grep -q "from '@vitejs/plugin-vue'" electron.vite.config.mjs
    grep -q "loadPaths" electron.vite.config.mjs
    grep -q "__VUE_OPTIONS_API__" electron.vite.config.mjs
    grep -q "'irsdk-node'" electron.vite.config.mjs
    grep -q "'sharp'" electron.vite.config.mjs
    grep -q "renderer:" electron.vite.config.mjs
    grep -q "main:" electron.vite.config.mjs
    # No icons alias
    ! grep -q "'icons':" electron.vite.config.mjs
    # Module loads clean under Node ESM
    node --input-type=module -e "import('./electron.vite.config.mjs').then(c => { if (typeof c.default !== 'object') throw new Error('not an object'); })"
    </automated>
  </verify>
  <acceptance_criteria>
    - File exists with 40-100 lines
    - Both `main` and `renderer` sub-configs populated
    - Externals present for both (5 main, 3 renderer)
    - `@vitejs/plugin-vue` wired in renderer
    - SCSS loadPaths present
    - Vue 3 feature flags present in renderer define
    - `icons` alias absent
    - Module import resolves clean under Node ESM
  </acceptance_criteria>
  <done>Config ready for dev smoke test.</done>
</task>

<task type="auto">
  <name>Task 3: Live dev smoke test — `npx electron-vite dev` end-to-end</name>
  <read_first>
    - 09-RESEARCH.md §Dev-Mode Smoke Test (MUST PASS) — 5 checkpoints
    - `electron.vite.config.mjs` (written in Task 2)
    - `src/renderer/main.js` entry file (verify it imports `./App.vue` + router + Oruga + SCSS; carried forward from Phase 8 Plan 06 — don't modify)
  </read_first>
  <action>
    **CRITICAL:** This task runs a live Electron process. Under `--auto` mode the executor runs `npx electron-vite dev` in the background and observes stdout, then terminates the process after verification. DO NOT attempt to present this as a checkpoint:human-verify (per user instruction, Plan 09-03 is `autonomous: true`). Auto mode substitutes build-time signals for UAT confirmation — the signals here are:

    (a) electron-vite dev server prints `VITE v<ver> ready in <ms> ms` to stdout within 15s
    (b) Electron process spawns (observable via `ps` or by the process's own stdout lines containing `[main]` or `ready-to-show`)
    (c) No `Cannot find package` or `Invalid config` errors in stderr
    (d) The renderer entry chunk resolves (observable via the dev server serving `GET /src/renderer/main.js`)

    Concrete procedure:

    1. **Launch dev server in background** (run_in_background):
       ```
       cd /c/Users/alero/Documents/Work/iracing-screenshot-tool && NODE_ENV=development npx electron-vite dev 2>&1 | tee /tmp/electron-vite-dev-09-03.log
       ```
       Capture PID via `$!`.

    2. **Wait for readiness** — poll `/tmp/electron-vite-dev-09-03.log` every 2s for up to 60s until either:
       - `VITE v` + `ready in` lines appear → server up
       - An error signature appears (`Error:` at column 0, or `ELIFECYCLE`, or `ERR_MODULE_NOT_FOUND`) → abort + record error in SUMMARY
       After 60s without readiness, terminate and record timeout.

    3. **Verify renderer launched** — look for these signals in the log:
       - `VITE v<version> ready` (Vite dev server up)
       - Something like `electron-vite` and `[electron-vite]` markers (electron-vite's own log prefix)
       - An Electron output signature: either console.log from `src/main/index.js` ('App started' from log.info at line 599) or the renderer's DevTools initialization
       - NO `Uncaught (in promise) Error:` lines (renderer HMR client error or Vue mount failure)

    4. **HMR smoke test — renderer**:
       - Identify a safe single-line edit target in `src/renderer/App.vue` or a view like `src/renderer/views/Home.vue`. Prefer a non-functional text node. Example: if `Home.vue` contains a heading like `<h1>Home</h1>`, change it to `<h1>Home <!-- HMR-TEST --></h1>`.
       - Record the file's mtime before + after the edit.
       - Watch the dev log for HMR indicators: `[vite] hmr update /src/renderer/views/Home.vue` within 2s of the edit.
       - Revert the edit (restore the file byte-for-byte — DO NOT leave the HMR-TEST comment in the tree).
       - Watch for the reverse HMR update in the log.

    5. **Main-process restart smoke test**:
       - Identify a safe single-line edit target in `src/main/index.js` — e.g., change line 599's log message text: `log.info('App started', ...)` → `log.info('App restarted', ...)`.
       - Expect the dev log to show electron-vite's main-restart trigger (`[electron-vite]` + restart/reload/rebuild markers) within ~5s.
       - Revert the edit.

    6. **Terminate the dev server** — kill the background PID via `kill -SIGTERM $PID` (Linux/Git Bash) or equivalent. Verify no orphan Electron or Vite processes linger: `ps -ef | grep -E 'electron|vite' | grep -v grep` — expected: 0 matches after 5s.

    7. **Capture the full log** — record relevant excerpts (VITE ready line, HMR update lines, restart trigger line, exit sequence) for pasting into the SUMMARY.

    **If smoke test FAILS** (server doesn't start, Electron doesn't spawn, renderer errors out, HMR doesn't fire):
    - Capture the error signature + full relevant log excerpt
    - Common failure modes:
      (a) `Cannot find package '@vitejs/plugin-vue'` → likely a forgotten `npm install` — re-run it
      (b) `[vite] Internal server error: Failed to resolve import "./main.js"` → `renderer.root` wrong or `index.html`'s script src path wrong — verify Plan 09-02's HTML has `./main.js` and `renderer.root: resolve(__dirname, 'src/renderer')` is set
      (c) `SASS Error: Can't find stylesheet to import` for Oruga theme-bulma → `loadPaths` wrong or missing `@use '@oruga-ui/theme-bulma/dist/scss/theme-build'` isn't resolving — verify the loadPaths value points at correct `node_modules`
      (d) Main process crashes with `require is not defined` → nodeIntegration is still on per CONTEXT (renderer webPreferences at src/main/index.js:275-280 + 314-318 confirm); should not happen but if it does, document with the full stack
    - If a config issue is found, fix it in `electron.vite.config.mjs`, re-run the smoke test. Document each fix in the SUMMARY's "Deviations" section.

    After all 6 signals pass (or any fail is debugged to green), the dev workflow is canonically functional.
  </action>
  <verify>
    <automated>
    # Dev server starts (log contains VITE readiness marker — checked against captured log file)
    grep -qE 'VITE.*ready|ready in.*ms' /tmp/electron-vite-dev-09-03.log
    # No fatal errors
    ! grep -qE '^Error:|ERR_MODULE_NOT_FOUND|ELIFECYCLE' /tmp/electron-vite-dev-09-03.log
    # HMR update fired (expected if renderer edit was made)
    grep -qE 'hmr update' /tmp/electron-vite-dev-09-03.log
    # Main-process restart trigger fired
    grep -qiE 'electron-vite.*restart|main.*rebuild|rebuild.*main' /tmp/electron-vite-dev-09-03.log
    # No lingering processes
    # (Best-effort; specific command depends on platform — Windows Git Bash: tasklist | findstr electron.exe ; Linux: pgrep electron)
    </automated>
  </verify>
  <acceptance_criteria>
    - `npx electron-vite dev` reaches "ready" state within 60s
    - Electron process spawns (confirmed via log or ps)
    - Renderer HMR update fires on SFC edit within 2s
    - Main-process restart triggers on src/main/index.js edit within 5s
    - Edits reverted cleanly (HMR-TEST comment + log-message edit restored to tree)
    - No fatal errors in log
    - Dev server terminates cleanly on SIGTERM; no orphan processes
  </acceptance_criteria>
  <done>Dev-mode smoke test passed end-to-end; config validated empirically.</done>
</task>

<task type="auto">
  <name>Task 4: Commit the config completion (D-09-10 commit 2 — part B)</name>
  <read_first>
    - 09-CONTEXT.md carryforward (commit discipline)
    - 09-RESEARCH.md §Commit Plan commit 2 message — but this plan ships the CONFIG half only; scripts + dev-runner retirement is Plan 09-04
  </read_first>
  <action>
    1. Confirm `bot/**` dirty state unchanged since Plan 09-02 close. Count baseline from prior SUMMARY.

    2. Confirm working-tree scope is only `electron.vite.config.mjs`:
       ```
       git status --short
       ```
       Expected (beyond bot/** dirty state): `M electron.vite.config.mjs` only.

       If any other file is modified (e.g., Task 3's HMR-TEST edits leaked through because revert failed), STOP + fix before proceeding. Verify src/renderer/views/Home.vue + src/main/index.js are byte-identical to post-Plan-09-02 state:
       ```
       git diff --stat HEAD -- src/renderer/ src/main/
       ```
       Expected: `0 files changed`.

    3. Stage explicitly:
       ```
       git add electron.vite.config.mjs
       ```

    4. Verify staged diff contains exactly 1 path:
       ```
       git diff --cached --name-only
       ```
       Expected: `electron.vite.config.mjs`

    5. Commit:
       ```
       refactor(build): flesh out electron.vite.config.mjs (externals, aliases, SCSS, define, plugin-vue)
       ```
       No Co-Authored-By. No --no-verify.

    6. Verify commit:
       - `git log -1 --format=%s` matches
       - No Co-Authored-By
       - `git show --stat HEAD` → exactly 1 file

    7. Gates:
       - `npm test` → 256/256 (regression gate; config file doesn't affect Jest at all but run it as a sanity check)
       - `npm run lint 2>&1 | tail -3` → ≤ 1881 problems (record count in SUMMARY)

    8. DO NOT run `npm run dev` yet — `package.json` scripts still point at webpack (Plan 09-04 rewires). But `npx electron-vite dev` works (proven in Task 3). Note in SUMMARY that the final "`npm run dev` works" gate lands at Plan 09-04 close.
  </action>
  <verify>
    <automated>
    git log -1 --format=%s | grep -qE '^refactor\(build\): flesh out electron\.vite\.config\.mjs'
    git log -1 --format=%B | { ! grep -qi 'Co-Authored'; }
    git show --stat HEAD --format= | grep -cE 'electron\.vite\.config\.mjs' | grep -q '^1$'
    git show --stat HEAD --format= | wc -l | awk '{ if ($1+0 <= 3) print "OK"; else print "FAIL: too many files"; }' | grep -q OK
    npm test 2>&1 | grep -qE '256 passed'
    </automated>
  </verify>
  <acceptance_criteria>
    - Exactly one new commit with canonical `refactor(build): flesh out electron.vite.config.mjs ...` message
    - Commit diff = 1 file
    - No Co-Authored-By
    - `bot/**` dirty state preserved
    - `npm test` 256/256; `npm run lint` ≤ 1881
  </acceptance_criteria>
  <done>Config completion commit landed; ready for Plan 09-04 scripts + webpack retirement.</done>
</task>

<task type="auto">
  <name>Task 5: Write 09-03-SUMMARY.md and commit it</name>
  <read_first>
    - $HOME/.claude/get-shit-done/templates/summary.md
    - Scratch notes: config diff, smoke-test log excerpts (VITE ready, HMR update, main restart, clean shutdown), lint + test deltas
  </read_first>
  <action>
    Create `.planning/phases/09-webpack-to-vite/09-03-SUMMARY.md` with:

    - YAML frontmatter (tech_stack: no added/removed packages — config-only plan; patterns: electron-vite main+renderer sub-config idiom, externalizeDepsPlugin main-externals, `@vitejs/plugin-vue` renderer-plugin convention, SCSS loadPaths port)
    - **Empirical Smoke-Test Results** — four outcomes (VITE ready, Electron spawn, renderer HMR, main restart) with the log excerpt for each
    - **Config Mapping Table** — two-column: webpack-config-file:line → electron-vite-config-file:block (for each migrated feature)
    - **Dropped Surfaces** — items that did NOT make it to electron-vite config:
      - `icons` alias (A6)
      - `HtmlWebpackPlugin` (replaced by Vite's native HTML consumption)
      - `VueLoaderPlugin` (replaced by `@vitejs/plugin-vue`)
      - `MiniCssExtractPlugin` (replaced by Vite's native CSS)
      - `CopyWebpackPlugin` (replaced by D-09-06 static/ strategy)
      - `node-loader` / `url-loader` / `file-loader` asset handlers (replaced by Vite's native asset handling for < 4kb inline + > 4kb emit)
      - `babel-loader` (replaced by Vite's built-in esbuild TS/JS transform)
    - **Added Surfaces vs RESEARCH.md §Config File Pattern** — any deviation: the Vue 3 feature flags (P2 recommendation), explicit `renderer.root`, `node:` protocol imports, dropped `icons` alias (A6)
    - **Build state at plan close** — PARTIALLY WORKING: `npx electron-vite dev` launches end-to-end; `npm run dev` still invokes the deleted-webpack-era script; Plan 09-04 rewires.
    - **Commit** — SHA + message + file list (1 file)
    - **Deviations from Plan** — any config fixes discovered during Task 3 smoke test (SCSS loadPaths path miss, externals miss, etc.)
    - **Threat Model Dispositions** — T-09-03-01..04 (below)
    - **Self-Check** — file existence + commit SHA + clean working tree + bot/** untouched
    - **Notes for Plan 09-04** — package.json scripts rewire: retire `pack:main`/`pack:renderer`/`dev-runner` webpack invocations, add `electron-vite-dev`, rewire `dev` → `run-s rebuild:electron electron-vite-dev`, rewire `pack` → `electron-vite build`. Delete `_scripts/dev-runner.js`, `_scripts/webpack.main.config.js`, `_scripts/webpack.renderer.config.js`. Verify `_scripts/build-dev.js` stays (already doesn't use webpack — calls electron-builder directly with dynamic version), `_scripts/release.js` stays (calls `npm run build:installer` which will be valid after 09-04 rewire).

    Commit as:
    ```
    git add .planning/phases/09-webpack-to-vite/09-03-SUMMARY.md
    git commit -m "docs(09-03): complete electron-vite config + dev smoke test plan"
    ```
  </action>
  <verify>
    <automated>
    test -f .planning/phases/09-webpack-to-vite/09-03-SUMMARY.md
    git log -1 --format=%s | grep -qE '^docs\(09-03\):'
    git log -1 --format=%B | { ! grep -qi 'Co-Authored'; }
    </automated>
  </verify>
  <acceptance_criteria>
    - SUMMARY.md exists with all sections including smoke-test log excerpts
    - `docs(09-03): ...` commit on master
    - No Co-Authored-By
  </acceptance_criteria>
  <done>Plan 09-03 closes; electron-vite fully configured and empirically validated for dev-mode; Plan 09-04 retires webpack.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| `electron.vite.config.mjs` → electron-vite CLI | Config file is loaded and executed by `electron-vite` at build/dev time; runs in the build-tool trust domain. Any `require`/`import` in the config has the same privilege as the build tool. |
| Vite dev server HTTP → renderer | Dev server serves source files over HTTP on localhost; renderer connects via `ELECTRON_RENDERER_URL` (Plan 09-02). In dev mode only; prod uses `file://`. |
| `externalizeDepsPlugin()` → main process bundle | Declares which modules are NOT bundled (resolved at runtime via node_modules). Correct externalization is a build-time-correctness concern (wrong list → runtime `Cannot find module`). |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-09-03-01 | Tampering | `electron.vite.config.mjs` — new build-tool entry point | mitigate | File is committed + auditable; no user input traverses it; `node --input-type=module -e ...` import-test in Task 2 catches parse errors; live dev smoke test in Task 3 catches semantic errors. |
| T-09-03-02 | Denial of Service | Missing external → runtime `Cannot find module` crash | mitigate | Task 3 smoke test exercises the full main+renderer boot path. If `irsdk-node`/`sharp` etc. are missing from externals, Task 3 surfaces a runtime error and the plan doesn't commit. A5 verified sharp in dependencies — `externalizeDepsPlugin()` picks it up + explicit rollupOptions.external is belt-and-suspenders. |
| T-09-03-03 | Information Disclosure | Vite dev server listens on localhost — attacker on same machine could connect | accept | Same risk profile as webpack-dev-server on :9080 (pre-Vite era); no regression. Vite binds to localhost only by default. |
| T-09-03-04 | Elevation of Privilege | `@vitejs/plugin-vue` + electron-vite parse Vue SFCs with template compiler | mitigate | Template compiler is the same compiler that shipped from Phase 8 (vue-loader 17 ran `@vue/compiler-sfc`). `@vitejs/plugin-vue@^5` uses the same `@vue/compiler-sfc`. No new code-execution vector. |

**Block threshold:** HIGH — any Task 3 smoke-test failure that can't be resolved within the plan's scope (e.g., externals list needs a native module we didn't anticipate AND `externalizeDepsPlugin()` doesn't pick it up AND adding to `rollupOptions.external` doesn't fix it) blocks the commit. Fall back to D-09-01 escape hatch (`vite-plugin-electron`) documented in SUMMARY.
</threat_model>

<verification>

Consolidated verification (end of Task 4, before Task 5 SUMMARY):

```bash
# Config shape
grep -q "externalizeDepsPlugin" electron.vite.config.mjs
grep -q "@vitejs/plugin-vue" electron.vite.config.mjs
grep -q "renderer: {" electron.vite.config.mjs || grep -q "renderer:" electron.vite.config.mjs
grep -q "main: {" electron.vite.config.mjs || grep -q "main:" electron.vite.config.mjs
grep -q "'irsdk-node'" electron.vite.config.mjs
grep -q "loadPaths" electron.vite.config.mjs
grep -q "__VUE_OPTIONS_API__" electron.vite.config.mjs
! grep -q "'icons'" electron.vite.config.mjs

# Module loads clean
node --input-type=module -e "import('./electron.vite.config.mjs').then(c => console.log('OK'))"

# Smoke-test log retained (for SUMMARY)
test -f /tmp/electron-vite-dev-09-03.log
grep -qE 'VITE.*ready' /tmp/electron-vite-dev-09-03.log
grep -qE 'hmr update' /tmp/electron-vite-dev-09-03.log

# Test + lint bands
npm test 2>&1 | grep -E '256 passed'
# Expected: "256 passed, 256 total"

npm run lint 2>&1 | tail -3 | grep -oE '[0-9]+ problems' | head -1
# Expected: a number ≤ 1881

# Commit discipline
git log -2 --format='%s'
# Expected:
#   docs(09-03): complete electron-vite config + dev smoke test plan
#   refactor(build): flesh out electron.vite.config.mjs (externals, aliases, SCSS, define, plugin-vue)

git log -1 --format=%B HEAD~1 | { ! grep -qi 'Co-Authored'; }

# bot/** untouched
git status --short | grep -cE '^[ ]?M bot|^\?\? bot'
# Expected: same count as at Plan 09-02 close
```

</verification>

<success_criteria>

- [ ] `electron.vite.config.mjs` contains main + renderer sub-configs with externals, aliases, SCSS loadPaths, define blocks, and `@vitejs/plugin-vue`
- [ ] `icons` alias absent (A6 honored)
- [ ] `node --input-type=module -e "import(...)"` loads the config clean
- [ ] `npx electron-vite dev` reaches ready state in < 60s
- [ ] Electron window opens, renderer HMR fires on SFC edit, main-process restart fires on main/index.js edit
- [ ] No orphan processes after SIGTERM
- [ ] All HMR-TEST edits reverted; working tree clean aside from the one config change
- [ ] D-09-10 commit 2 part B (`refactor(build): flesh out electron.vite.config.mjs ...`) landed on master with 1 file
- [ ] No Co-Authored-By
- [ ] `bot/**` dirty state preserved
- [ ] `npm test` 256/256; `npm run lint` ≤ 1881
- [ ] 09-03-SUMMARY.md created + committed as `docs(09-03): ...`
- [ ] Threat register T-09-03-01..04 dispositioned

</success_criteria>

<output>

After completion, create `.planning/phases/09-webpack-to-vite/09-03-SUMMARY.md` capturing:
- Exact config content at commit + mapping table (webpack → electron-vite)
- Live dev smoke-test log excerpts (VITE ready, HMR update, main restart, clean shutdown)
- Config items DROPPED vs RESEARCH.md canonical (icons alias, HtmlWebpackPlugin, VueLoaderPlugin, MiniCssExtractPlugin, CopyWebpackPlugin, loaders)
- Config items ADDED vs RESEARCH.md canonical (Vue 3 feature flags, explicit renderer.root, node: imports)
- Commit SHA + message
- Build state at plan close: PARTIALLY WORKING (npx works; npm run dev still webpack-era)
- Notes for Plan 09-04 (scripts rewire + webpack retirement; `_scripts/build-dev.js` + `_scripts/release.js` stay)

Commit as `docs(09-03): complete electron-vite config + dev smoke test plan`.

</output>
