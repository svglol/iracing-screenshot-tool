---
phase: 09-webpack-to-vite
plan: 02
type: execute
wave: 2
depends_on: [09-01]
files_modified:
  - src/renderer/index.html
  - src/index.ejs
  - src/main/index.js
autonomous: true
requirements: [BUNDLER-01]
tags: [bundler, vite, html-migration, electron-renderer-url, d-09-10-commit-2-part-a]
must_haves:
  truths:
    - "`src/renderer/index.html` exists with plain-HTML content (no EJS <% %> blocks)"
    - "`src/index.ejs` is deleted (no EJS template left in the tree)"
    - "`src/main/index.js` dev-mode branches load `process.env.ELECTRON_RENDERER_URL` when set; prod branches load the file-URL"
    - "Hardcoded `http://localhost:9080` and `http://localhost:9080/#/worker` references are gone from src/main/index.js"
    - "Worker window still receives the `#/worker` hash route in both dev + prod (regression boundary: hash routing)"
    - "Build is still broken at end of this plan (electron.vite.config.mjs is still a skeleton from Plan 09-01; scripts still reference webpack — Plan 09-03 fleshes config, Plan 09-04 rewires scripts)"
  artifacts:
    - path: "src/renderer/index.html"
      provides: "Vite renderer entry HTML — default electron-vite location"
      contains: "<script type=\"module\" src=\"./main.js\">"
      min_lines: 10
    - path: "src/main/index.js"
      provides: "Dev/prod URL loading via ELECTRON_RENDERER_URL for both main + worker windows"
      contains: "ELECTRON_RENDERER_URL"
  key_links:
    - from: "src/renderer/index.html"
      to: "src/renderer/main.js"
      via: "<script type=\"module\">"
      pattern: "script type=.module. src="
    - from: "src/main/index.js dev branch (main window)"
      to: "process.env.ELECTRON_RENDERER_URL"
      via: "mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)"
      pattern: "ELECTRON_RENDERER_URL"
    - from: "src/main/index.js dev branch (worker window)"
      to: "process.env.ELECTRON_RENDERER_URL + '#/worker'"
      via: "workerWindow.loadURL"
      pattern: "ELECTRON_RENDERER_URL.*worker|worker.*ELECTRON_RENDERER_URL"
---

<objective>
Migrate the renderer HTML template from the webpack-era `src/index.ejs` (with EJS `<% %>` node_modules-injection hack) to a plain `src/renderer/index.html` at electron-vite's default renderer root. Patch the four hardcoded `http://localhost:9080` dev-URL loadURL call sites in `src/main/index.js` (lines 294, 296, 325, 327) to use electron-vite's `process.env.ELECTRON_RENDERER_URL` pattern with prod fallback to `loadFile('../renderer/index.html', { hash: '/worker' })` for the worker window and `loadFile('../renderer/index.html')` for the main window. This is the middle half of D-09-10 commit 2 (`refactor(build): ...`); the remainder — `electron.vite.config.mjs` completion and `_scripts/` cleanup — lands in Plans 09-03 and 09-04. We commit this as its own atomic commit inside commit-2 scope to keep the diff focused on template + main-URL loading.

Purpose: Vite's dev server serves the HTML + renderer entry via HTTP + HMR sockets; it needs the entry HTML at `src/renderer/index.html` (Vite convention, matches electron-vite `renderer.root` default). The EJS node_modules hack was a webpack-era workaround that electron-vite's renderer flow no longer needs (Vite resolves imports via its own module graph). The main process has to stop hardcoding port 9080 (webpack-dev-server-specific) and pick up electron-vite's injected `ELECTRON_RENDERER_URL` env var at dev time. Doing this before Plan 09-03 (config completion) means Plan 09-03 can verify dev-mode smoke-test empirically against a correctly-loading renderer.

Output: One `refactor(build): migrate EJS template to Vite renderer index.html; main-URL load via ELECTRON_RENDERER_URL` commit + `docs(09-02): ...` commit.

**Bisect intent:** This commit isolates template + main-URL changes from dep swap (09-01) and from config completion (09-03). `git bisect` between this commit and 09-01 isolates any regression to "HTML template or main-URL pattern" — separately from "electron-vite config shape." Build stays intentionally broken at this commit (config skeleton has no entry points; `npm run dev`/`pack` still reference webpack), consistent with Phase 8 Plan 03's "pack:renderer NOT gated" pattern.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-webpack-to-vite/09-CONTEXT.md
@.planning/phases/09-webpack-to-vite/09-RESEARCH.md
@.planning/phases/09-webpack-to-vite/09-01-SUMMARY.md
@src/index.ejs
@src/main/index.js
@src/renderer/main.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Verify A4 + A8 empirically; inventory the loadURL/loadFile surface</name>
  <read_first>
    - `src/main/index.js` lines 271-335 (createWindow function, both workerWindow and mainWindow loadURL/loadFile sites)
    - `src/index.ejs` (full file — it is short)
    - 09-RESEARCH.md §Dev-Mode URL Loading (main process)
  </read_first>
  <action>
    1. Grep the `loadURL|loadFile` site inventory in `src/main/index.js`:
       ```
       grep -nE "loadURL|loadFile" src/main/index.js
       ```
       Expected output (from planner's empirical read):
       ```
       294:  workerWindow.loadURL('http://localhost:9080/#/worker');
       296:  workerWindow.loadFile(path.join(__dirname, 'index.html'), {
       325:  mainWindow.loadURL('http://localhost:9080');
       327:  mainWindow.loadFile(`${__dirname}/index.html`);
       ```
       (A4 was originally stated as "single site to patch" — empirical truth is FOUR sites: 2 loadURLs for dev + 2 loadFiles for prod, across two windows. Document the 4-site correction in the SUMMARY.)

    2. Grep the `__static` + `NODE_ENV` + hardcoded-port pattern surface across src/:
       ```
       grep -rn "9080\|ELECTRON_RENDERER_URL\|__static" src/
       ```
       Expected hits:
       - src/index.ejs:19-27 (window.__static try/catch — gets deleted with EJS)
       - src/main/index.js:294,299,325,328 (hardcoded ports + global.__static writes)
       - Zero hits for ELECTRON_RENDERER_URL yet (we're introducing it this plan)

    3. Grep the `#/worker` hash-route surface:
       ```
       grep -rn "#/worker\|/#/worker" src/
       ```
       Expected: src/main/index.js:294 (dev) + 298 (prod hash) + src/renderer/router/ (route definition — DO NOT edit, verify only)

       The worker route MUST survive both dev and prod branches of the patched code. Read src/renderer/router/index.js to confirm the `/worker` route is registered — if it's registered, the dev-mode `ELECTRON_RENDERER_URL + '#/worker'` appendage preserves the behavior.

    4. A8 verification: confirm `__static` has zero template-side readers in `src/renderer/**` other than the EJS-injected assignment:
       ```
       grep -rn "__static\|process\.env\.NODE_ENV" src/renderer/
       ```
       Expected: zero usage of `__static` in renderer code, confirming the `window.__static = ...` assignment in src/index.ejs:22-25 has no consumer. Safe to delete with the EJS template. `global.__static` writes at src/main/index.js:299,328 also have no readers (grep across src/ for `global\.__static|__static` reads returned zero consumers) — leave them alone anyway (dead writes are out of Phase 9 scope; Phase 13 cleanup candidate).

    Document all four inventory results in scratch notes for the SUMMARY.
  </action>
  <verify>
    <automated>
    # Four loadURL/loadFile sites exist at the expected line numbers
    grep -cE "^[[:space:]]*(workerWindow|mainWindow)\.(loadURL|loadFile)" src/main/index.js | grep -q '^4$'
    # Worker hash route still exists
    grep -q "#/worker\|/worker" src/main/index.js
    # No ELECTRON_RENDERER_URL yet
    ! grep -q "ELECTRON_RENDERER_URL" src/main/index.js
    </automated>
  </verify>
  <acceptance_criteria>
    - 4 loadURL/loadFile sites confirmed at lines 294/296/325/327
    - `#/worker` hash route confirmed in dev loadURL
    - Zero ELECTRON_RENDERER_URL usage pre-edit (negative control)
    - `__static` readers in src/renderer/** confirmed zero
  </acceptance_criteria>
  <done>Inventory complete; edit targets pinned to exact line numbers.</done>
</task>

<task type="auto">
  <name>Task 2: Create src/renderer/index.html (plain HTML, no EJS)</name>
  <read_first>
    - 09-RESEARCH.md §HTML Template Migration (the target HTML content)
    - Current `src/index.ejs` (already read in Task 1)
    - `src/renderer/main.js` (verify it exists and is the renderer entry — it is per the ls from planner scout)
  </read_first>
  <action>
    Using the Write tool, create `src/renderer/index.html` with this exact content (matches RESEARCH.md §HTML Template Migration + the `./main.js` entry script reference — electron-vite's `renderer.root` defaults to `src/renderer/` so `./main.js` resolves to `src/renderer/main.js`):

    ```html
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title></title>
      </head>

      <body>
        <div id="app"></div>

        <script type="module" src="./main.js"></script>
      </body>
    </html>
    ```

    Drops vs `src/index.ejs`:
    - No `<% if (htmlWebpackPlugin.options.nodeModules) %>` block — electron-vite's dev server resolves renderer imports natively
    - No `window.__static = require('path').join(...)` try/catch — Plan 09-03 defines `__static` via `define` in the renderer config block
    - Preserves: DOCTYPE, viewport meta, empty `<title>`, `<div id="app">`, `utf-8` charset

    Do NOT inline any `<style>` or `<link rel="stylesheet">`. All styles enter via `src/renderer/main.js` importing `src/renderer/assets/style/main.scss` (already wired from Phase 8). Do NOT add `<base href="./">` — Vite handles base URL via config (Plan 09-03 sets `base: './'` if needed for file-URL prod load).
  </action>
  <verify>
    <automated>
    test -f src/renderer/index.html
    grep -qE '<script type="module" src="\./main\.js"' src/renderer/index.html
    grep -q 'id="app"' src/renderer/index.html
    # No EJS residue
    ! grep -qE '<%|%>' src/renderer/index.html
    # No __static residue
    ! grep -q '__static' src/renderer/index.html
    </automated>
  </verify>
  <acceptance_criteria>
    - `src/renderer/index.html` exists with the exact 13-line plain-HTML content above
    - Script tag uses `type="module"` + `./main.js` relative path
    - Zero EJS delimiters
    - Zero `__static` references
  </acceptance_criteria>
  <done>Vite-compatible renderer HTML entry in place.</done>
</task>

<task type="auto">
  <name>Task 3: Delete src/index.ejs</name>
  <read_first>
    - A8 verification outcome from Task 1 (zero renderer-side `__static` readers)
    - 09-RESEARCH.md §HTML Template Migration (confirms the EJS node_modules hack is dead under electron-vite)
    - 08-06-SUMMARY.md's orphan-sweep pattern for file-deletion discipline
  </read_first>
  <action>
    Confirm safety:
    1. `grep -rn 'index\.ejs' src/ _scripts/ package.json electron.vite.config.mjs` — expected hits:
       - `_scripts/webpack.renderer.config.js:95` (the HtmlWebpackPlugin template reference — will die with webpack config in Plan 09-04)
       - zero other refs
    2. `grep -rn "src/index\\.ejs" .` across the whole tree (exclude .git, node_modules, dist, build) — should yield the webpack.renderer.config.js hit and nothing else.

    If ANY other file references `index.ejs` (especially under src/ or _scripts/release.js or build.files), STOP and document in SUMMARY — the reference must be removed before the delete is safe. Based on planner scout: only `_scripts/webpack.renderer.config.js:95` references it; that file retires in Plan 09-04.

    Delete the file:
    ```
    git rm src/index.ejs
    ```
    (Use `git rm`, not plain `rm`, so the deletion is staged in the same commit as the creation of the new file — keeps the diff coherent.)
  </action>
  <verify>
    <automated>
    ! test -f src/index.ejs
    git status --porcelain | grep -qE '^D\s+src/index\.ejs'
    # Only webpack.renderer.config.js references the deleted file (Plan 09-04 kills it)
    grep -rn 'src/index\.ejs\|index\.ejs' src/ _scripts/ package.json electron.vite.config.mjs 2>&1 | grep -cE 'index\.ejs' | awk '{ if ($1+0 <= 1) print "OK"; else print "FAIL"; }' | grep -q OK
    </automated>
  </verify>
  <acceptance_criteria>
    - `src/index.ejs` deleted and staged (status `D`)
    - At most 1 remaining reference (in `_scripts/webpack.renderer.config.js:95`; dies in Plan 09-04)
  </acceptance_criteria>
  <done>EJS template retired; staged for commit alongside Task 2's new HTML.</done>
</task>

<task type="auto">
  <name>Task 4: Patch src/main/index.js dev-URL loading (4 sites)</name>
  <read_first>
    - `src/main/index.js` lines 271-335 (createWindow function body)
    - 09-RESEARCH.md §Dev-Mode URL Loading (main process) — the canonical diff pattern
  </read_first>
  <action>
    The current `createWindow()` has two if/else blocks — one for `workerWindow` (lines 293-300) and one for `mainWindow` (lines 324-329). Each has a dev branch (loadURL with hardcoded http://localhost:9080) and a prod branch (loadFile with `__dirname/index.html`).

    Using the Edit tool, replace the workerWindow dev/prod block (approximate current content):
    ```javascript
    if (isDev) {
        workerWindow.loadURL('http://localhost:9080/#/worker');
    } else {
        workerWindow.loadFile(path.join(__dirname, 'index.html'), {
            hash: '/worker',
        });
        global.__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\');
    }
    ```

    With this new pattern (matches electron-vite's documented dev-URL-injection convention + preserves prod hash routing + preserves `global.__static` dead write — out of scope to delete here):
    ```javascript
    if (process.env.ELECTRON_RENDERER_URL) {
        workerWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/worker`);
    } else {
        workerWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
            hash: '/worker',
        });
        global.__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\');
    }
    ```

    And replace the mainWindow dev/prod block:
    ```javascript
    if (isDev) {
        mainWindow.loadURL('http://localhost:9080');
    } else {
        mainWindow.loadFile(`${__dirname}/index.html`);
        global.__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\');
    }
    ```

    With:
    ```javascript
    if (process.env.ELECTRON_RENDERER_URL) {
        mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
        global.__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\');
    }
    ```

    Key changes per block:
    - Dev-branch condition: `isDev` → `process.env.ELECTRON_RENDERER_URL` (the env var IS the dev-mode signal electron-vite injects; truthiness check is the canonical pattern — electron-vite's own quickstart uses it). The existing `isDev` variable at line 88 (`process.env.NODE_ENV === 'development'`) is NOT the same signal and is retained for other `isDev` branches elsewhere in the file (do not touch those).
    - Dev-branch URL: hardcoded `http://localhost:9080` → `process.env.ELECTRON_RENDERER_URL`. Hash preserved via template-string concatenation for worker.
    - Prod-branch path: `__dirname/index.html` (webpack output: dist/main.js sits next to dist/index.html) → `path.join(__dirname, '../renderer/index.html')` (electron-vite output: out/main/index.js + out/renderer/index.html — `../renderer/` from main's dirname). Worker's `{ hash: '/worker' }` option preserved verbatim.
    - `global.__static` lines preserved verbatim (dead write cleanup is Phase 13 scope; touching here would balloon the diff).

    **Do NOT touch any other logic in createWindow() or src/main/index.js.** Specifically: do NOT modify `remoteMain.enable`, `webPreferences`, `on('ready-to-show')`, `on('close')`, `on('closed')`, or any IPC handlers outside createWindow.

    After the Edit calls, re-read src/main/index.js lines 285-335 to verify both blocks match the patterns above exactly.
  </action>
  <verify>
    <automated>
    # ELECTRON_RENDERER_URL appears exactly 4 times (2 conditions + 2 loadURLs)
    grep -c "ELECTRON_RENDERER_URL" src/main/index.js | grep -qE '^[4-6]$'
    # Hardcoded port gone
    ! grep -q "localhost:9080" src/main/index.js
    # Prod paths point at ../renderer/index.html for both windows
    grep -c "'../renderer/index\.html'" src/main/index.js | grep -qE '^2$'
    # Worker hash route preserved
    grep -qE "hash:\s*'/worker'" src/main/index.js
    grep -qE 'ELECTRON_RENDERER_URL.*#/worker|#/worker.*ELECTRON_RENDERER_URL' src/main/index.js
    # `isDev` variable unchanged (other sites still use it)
    grep -q "const isDev = process\.env\.NODE_ENV === 'development'" src/main/index.js
    </automated>
  </verify>
  <acceptance_criteria>
    - 4 ELECTRON_RENDERER_URL references (2 env-var reads in conditions + 2 loadURL args)
    - Zero `localhost:9080` references
    - Two `../renderer/index.html` prod paths (worker + main)
    - Worker hash `/worker` preserved in both branches
    - Unrelated `isDev` usage elsewhere in file unchanged
    - `global.__static` dead writes untouched
  </acceptance_criteria>
  <done>Main process ready to pair with electron-vite's dev server and with out/-layout prod bundle.</done>
</task>

<task type="auto">
  <name>Task 5: Commit template + main-URL changes (D-09-10 commit 2 — part A)</name>
  <read_first>
    - 09-CONTEXT.md carryforward (no Co-Authored-By, no --no-verify, explicit `git add`, bot/** untouched)
    - 09-RESEARCH.md §Commit Plan commit 2 message (but only part A is committed here — SUMMARY notes the split)
  </read_first>
  <action>
    1. Confirm `bot/**` dirty files untouched since Plan 09-01 close: `git status --short | grep -cE '^ M bot|^\?\? bot'`. Count should match the count recorded in 09-01-SUMMARY.

    2. Confirm working-tree scope — ONLY these three paths should be modified/created/deleted:
       ```
       git status --short
       ```
       Expected lines (new/modified/deleted) beyond the pre-existing bot/** dirty state:
       ```
       D  src/index.ejs
       A  src/renderer/index.html   (or "?? src/renderer/index.html" if not yet staged)
       M  src/main/index.js
       ```
       If ANY other src/ path appears, STOP + investigate.

    3. Stage explicitly:
       ```
       git add src/renderer/index.html
       git add src/main/index.js
       # src/index.ejs already staged via git rm in Task 3
       ```

    4. Verify staged diff contains exactly 3 paths:
       ```
       git diff --cached --name-status
       ```
       Expected (order may vary):
       ```
       A       src/renderer/index.html
       D       src/index.ejs
       M       src/main/index.js
       ```

    5. Commit with message:
       ```
       refactor(build): migrate EJS template to Vite renderer index.html; main-URL via ELECTRON_RENDERER_URL
       ```
       (No Co-Authored-By, no --no-verify.)

    6. Verify the commit:
       - `git log -1 --format=%s` matches the message
       - `git log -1 --format=%B | grep -c Co-Authored` → 0
       - `git show --stat HEAD` → exactly 3 files (1 added, 1 deleted, 1 modified)

    7. Run `npm test` → 256/256 (regression gate — template migration must not affect Jest tests since none of the modified paths are in Jest's watch set).

    8. Run `npm run lint 2>&1 | tail -3` → problem count ≤ 1881. Record exact count in SUMMARY.

    9. DO NOT run `npm run dev` or `npm run pack:*` — they still reference webpack scripts that Plan 09-04 will rewire. The build-broken-by-design state continues through this plan per the carryforward "Build breakage is acceptable between commits within a plan" rule — this plan's break boundary is: renderer HTML migrated, main-URL pattern migrated, but electron.vite.config.mjs is still skeleton + package.json scripts still call webpack. Plan 09-03 makes `npm run dev` work for the first time.
  </action>
  <verify>
    <automated>
    git log -1 --format=%s | grep -qE '^refactor\(build\): migrate EJS template'
    git log -1 --format=%B | { ! grep -qi 'Co-Authored'; }
    git show --stat HEAD --format= | grep -cE 'src/renderer/index\.html|src/index\.ejs|src/main/index\.js' | grep -q '^3$'
    npm test 2>&1 | grep -qE '256 passed'
    </automated>
  </verify>
  <acceptance_criteria>
    - Exactly one new commit on master with the canonical `refactor(build): migrate EJS template ...` message
    - Commit diff is exactly 3 files (A/D/M)
    - No Co-Authored-By
    - `bot/**` dirty state preserved
    - `npm test` 256/256 green
    - `npm run lint` ≤ 1881 problems
  </acceptance_criteria>
  <done>Template + main-URL migration landed; ready for Plan 09-03 config completion.</done>
</task>

<task type="auto">
  <name>Task 6: Write 09-02-SUMMARY.md and commit it</name>
  <read_first>
    - $HOME/.claude/get-shit-done/templates/summary.md
    - Scratch notes from Tasks 1-5 (4-site inventory, deleted EJS + added HTML diff, main-URL diff, commit SHA)
    - 08-03-SUMMARY.md as reference for Phase 8's "two-commit + intentional-build-break" pattern (Plan 03 shipped broken SFCs by design — same discipline)
  </read_first>
  <action>
    Create `.planning/phases/09-webpack-to-vite/09-02-SUMMARY.md` with these sections:

    - YAML frontmatter (phase: 09-webpack-to-vite, plan: 02, subsystem: bundler-html-main-url, tags: [vite, html-migration, electron-renderer-url, d-09-10-commit-2-part-a], requires: [09-01], provides: enumerated above in must_haves.artifacts)
    - **Empirical Assumption Outcomes** — rows for A4 (single-site assumption WRONG: 4 sites actually) + A8 (zero __static renderer readers confirmed)
    - **loadURL/loadFile site inventory** — table with the 4 sites pre-edit → post-edit mapping
    - **Dropped EJS artifacts** — list the EJS features not ported (node_modules globalPaths hack, window.__static try/catch) with rationale
    - **Build state at plan close** — INTENTIONALLY BROKEN: `npm run dev` still invokes `_scripts/dev-runner.js` (calls webpack); `npm run pack:*` still invokes webpack configs. Plan 09-03 (config completion) and Plan 09-04 (script rewire) together restore functional build.
    - **Commit** — SHA + message + file list (3 files)
    - **Deviations from Plan** — A4 correction (single → 4 sites); any unexpected references to `index.ejs` surfaced in Task 3
    - **Threat Model Dispositions** — restate T-09-02-01..03 (below) with outcomes
    - **Self-Check** — file existence + commit SHA + bot/** untouched
    - **Notes for Plan 09-03** — config completion needs to port SCSS loadPaths (Phase 8 Plan 03 fix at webpack.renderer.config.js:54), externalize `sharp`/`irsdk-node`/`@electron/remote`/`electron-updater`, preserve `@` + `src` aliases but DROP the `icons` alias per A6; set `renderer.root` = `src/renderer/` (electron-vite default aligns with our new HTML location)

    Commit as:
    ```
    git add .planning/phases/09-webpack-to-vite/09-02-SUMMARY.md
    git commit -m "docs(09-02): complete HTML template + main-URL migration plan"
    ```
  </action>
  <verify>
    <automated>
    test -f .planning/phases/09-webpack-to-vite/09-02-SUMMARY.md
    git log -1 --format=%s | grep -qE '^docs\(09-02\):'
    git log -1 --format=%B | { ! grep -qi 'Co-Authored'; }
    </automated>
  </verify>
  <acceptance_criteria>
    - SUMMARY.md exists with all sections
    - `docs(09-02): ...` commit on master
    - No Co-Authored-By
  </acceptance_criteria>
  <done>Plan 09-02 closes; Phase 9 at commit 2 of 3 in D-09-10 chain (template+URL half); Plan 09-03 ships config completion + dev smoke test.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| `process.env.ELECTRON_RENDERER_URL` → main process | Env var injected by electron-vite at dev time; trusted because it's under build-tool control, not user input. In prod it's unset → file-URL fallback. |
| `src/renderer/index.html` → renderer process | Entry HTML served by Vite dev server OR loaded via `file://` in prod. Script src `./main.js` is trusted project code. |
| prod `loadFile('../renderer/index.html')` path | Constructed via `path.join(__dirname, '../renderer/index.html')` — resolves relative to `out/main/` → `out/renderer/` in the packaged app. No user input traverses this path. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-09-02-01 | Spoofing | `process.env.ELECTRON_RENDERER_URL` injection | accept | Env var is set by electron-vite's dev CLI only; Electron app's runtime environment never receives arbitrary env at prod (build artifact doesn't inherit dev env). If a user manually set ELECTRON_RENDERER_URL at runtime in prod, worst case is loading an attacker-specified URL — but prod users can't easily override env for a signed installer-installed app. Pre-existing risk identical to pre-Vite era where NODE_ENV could be overridden the same way. |
| T-09-02-02 | Tampering | EJS template deletion removes `module.globalPaths` inject | mitigate | A8 grep confirmed no `window.__static` or `module.globalPaths` readers in src/renderer/**; hack was defensive dead code. If runtime regression surfaces (unlikely per research), fallback is to add a non-EJS `<script>` tag to index.html — documented as Phase 9 follow-up ticket. |
| T-09-02-03 | Denial of Service | Worker window's `#/worker` hash route fails to resolve post-migration | mitigate | Hash preserved in both dev (template-string concat) + prod (loadFile options.hash) branches; renderer's vue-router 4 `createWebHashHistory` from Phase 8 consumes the `#/worker` fragment the same way regardless of origin. Plan 09-03 dev smoke test catches any regression live. |
| T-09-02-04 | Information Disclosure | `global.__static` dead writes retained | accept | Out of Phase 9 scope (Phase 13 dead-code cleanup ticket). Dead write has no downstream reader per A8 grep. |

**Block threshold:** MODERATE — the commit lands even if a low-severity regression surfaces as long as test + lint gates stay green. Any HIGH regression (e.g., worker window fails to load in prod build) blocks Plan 09-03's verification and must be resolved before moving forward.
</threat_model>

<verification>

Consolidated verification (run at end of Task 5, before Task 6 SUMMARY):

```bash
# HTML template state
test -f src/renderer/index.html
! test -f src/index.ejs
grep -q 'type="module"' src/renderer/index.html
! grep -qE '<%|%>' src/renderer/index.html

# Main-URL state
grep -c "ELECTRON_RENDERER_URL" src/main/index.js
# Expected: 4
! grep -q "localhost:9080" src/main/index.js
grep -c "'../renderer/index\.html'" src/main/index.js
# Expected: 2

# Worker hash route preserved
grep -qE "hash:\s*'/worker'" src/main/index.js
grep -qE '#/worker' src/main/index.js

# Test + lint bands
npm test 2>&1 | grep -E '256 passed'
# Expected: "256 passed, 256 total"

npm run lint 2>&1 | tail -3 | grep -oE '[0-9]+ problems'
# Expected: a number ≤ 1881

# Commit discipline
git log -2 --format='%s'
# Expected:
#   docs(09-02): complete HTML template + main-URL migration plan
#   refactor(build): migrate EJS template to Vite renderer index.html; main-URL via ELECTRON_RENDERER_URL

git log -1 --format=%B HEAD~1 | { ! grep -qi 'Co-Authored'; }

# bot/** untouched
git status --short | grep -cE '^[ ]?M bot|^\?\? bot'
# Expected: same count as at Plan 09-01 close
```

</verification>

<success_criteria>

- [ ] A4 correction documented (4 loadURL/loadFile sites, not 1)
- [ ] A8 empirical outcome captured (zero __static renderer readers)
- [ ] `src/renderer/index.html` created with plain HTML + `<script type="module" src="./main.js">` entry
- [ ] `src/index.ejs` deleted via `git rm`
- [ ] `src/main/index.js` has exactly 4 ELECTRON_RENDERER_URL references + zero localhost:9080 references + 2 `../renderer/index.html` prod paths
- [ ] Worker `#/worker` hash preserved in both dev + prod branches
- [ ] `npm test` 256/256 green
- [ ] `npm run lint` ≤ 1881 problems
- [ ] D-09-10 commit 2 (part A) landed on master as `refactor(build): migrate EJS template ...` with exactly 3 files
- [ ] No Co-Authored-By on the content commit
- [ ] `bot/**` pre-existing dirty files untouched + unstaged
- [ ] 09-02-SUMMARY.md created + committed as `docs(09-02): ...`
- [ ] Threat register T-09-02-01..04 dispositioned

</success_criteria>

<output>

After completion, create `.planning/phases/09-webpack-to-vite/09-02-SUMMARY.md` capturing:
- A4 correction (single → 4 sites) + A8 outcome
- Exact pre-edit → post-edit diff of loadURL/loadFile blocks for both windows
- EJS features dropped + rationale (nodeModules hack + window.__static try/catch)
- Commit SHA + full message
- Build state at plan close: STILL INTENTIONALLY BROKEN (config skeleton + webpack scripts). Plan 09-03 unbreaks dev; Plan 09-04 unbreaks pack; Plan 09-05 unbreaks installer.
- Test + lint gate compliance (256/256, ≤ 1881)
- Notes for Plan 09-03 (externals list, SCSS loadPaths from Phase 8 Plan 03, drop `icons` alias per A6, `renderer.root: 'src/renderer'`)

Commit as `docs(09-02): complete HTML template + main-URL migration plan`.

</output>
