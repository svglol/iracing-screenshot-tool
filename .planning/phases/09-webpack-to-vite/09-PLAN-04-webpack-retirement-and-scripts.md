---
phase: 09-webpack-to-vite
plan: 04
type: execute
wave: 4
depends_on: [09-03]
files_modified:
  - _scripts/webpack.main.config.js
  - _scripts/webpack.renderer.config.js
  - _scripts/dev-runner.js
  - package.json
autonomous: true
requirements: [BUNDLER-01]
tags: [bundler, vite, webpack-retirement, scripts-rewire, d-09-10-commit-2-part-c]
must_haves:
  truths:
    - "`_scripts/webpack.main.config.js`, `_scripts/webpack.renderer.config.js`, `_scripts/dev-runner.js` are deleted from the tree"
    - "`_scripts/build-dev.js` is UNCHANGED (it never used webpack — calls electron-builder directly with dynamic version)"
    - "`_scripts/release.js` is UNCHANGED (calls `npm run build:installer` which delegates to the new electron-vite-aware pack script)"
    - "`package.json` scripts: `dev`, `pack`, `build`, `build:dev`, `debug`, `debug-runner`, `dev-runner`, `pack:main`, `pack:renderer` all rewired to `electron-vite` CLI or deleted"
    - "`npm run dev` launches electron-vite dev end-to-end (not `node _scripts/dev-runner.js`)"
    - "`npm run pack` runs `electron-vite build` and produces `out/main/index.js` + `out/renderer/index.html` + `out/renderer/assets/*.{js,css}`"
    - "`npm test` 256/256 green; `npm run lint` ≤ 1881"
    - "Build is NEARLY fully working: pack step emits to `out/`; `electron-builder` integration points still at old `dist/` paths — Plan 09-05 retargets"
  artifacts:
    - path: "package.json"
      provides: "Scripts invoking electron-vite CLI; no webpack invocations"
      contains: "electron-vite"
    - path: "out/main/index.js"
      provides: "Packed main bundle (created by `npm run pack` at end of Task 4)"
    - path: "out/renderer/index.html"
      provides: "Packed renderer HTML (created by `npm run pack`)"
  key_links:
    - from: "package.json scripts.dev"
      to: "electron-vite dev"
      via: "run-s rebuild:electron electron-vite-dev"
      pattern: "electron-vite dev"
    - from: "package.json scripts.pack"
      to: "electron-vite build"
      via: "direct invocation"
      pattern: "electron-vite build"
    - from: "package.json scripts.debug-runner"
      to: "electron-vite dev --inspect"
      via: "debug-flag passthrough"
      pattern: "electron-vite.*debug|inspect"
---

<objective>
Retire the webpack build chain and rewire `package.json` scripts to electron-vite. Delete `_scripts/webpack.main.config.js`, `_scripts/webpack.renderer.config.js`, `_scripts/dev-runner.js` (three files, ~370 lines total). Rewrite 9 package.json scripts (`dev`, `pack`, `pack:main`, `pack:renderer`, `dev-runner`, `debug`, `debug-runner`, `build:dev`, `build:dev:dir`) to invoke `electron-vite` or delete them. Verify empirically that `_scripts/build-dev.js` and `_scripts/release.js` do NOT need to change (A7 empirical verification from planner scout: neither invokes webpack). After this plan: `npm run dev` launches electron-vite end-to-end (matching Plan 09-03's one-off `npx` launch), `npm run pack` emits to `out/`, and `npm run lint` + `npm test` stay green.

This is D-09-10 commit 2 part C — the final half of `refactor(build): replace webpack with electron-vite`. With this commit, webpack is COMPLETELY retired from the project root. `electron-builder` still reads from `dist/**/*` per package.json `build.files` (line 20) — Plan 09-05 retargets that to `out/**/*` and updates `"main"` path.

Purpose: This plan is the "decisive cut-over" — after this commit, webpack is gone. Plan 09-03 proved electron-vite works; this plan commits to it. Once this commit lands, rolling back requires reverting this commit AND Plan 09-03 AND Plan 09-02 AND Plan 09-01 — the dep tree, config, HTML template, and scripts are now mutually-dependent. The bisect isolation is worth the risk because the alternative (keeping both build systems) doubles maintenance cost indefinitely.

Output: One `refactor(build): retire webpack configs + dev-runner; rewire package.json scripts to electron-vite` commit (4 files: 3 deletions + 1 modification) + `docs(09-04): ...` SUMMARY commit.

**Bisect intent:** Between this commit and 09-03, `git bisect` isolates any regression caused by scripts rewire OR webpack deletion side-effects (e.g., a dev-runner consumer we missed, or a residual webpack import). Separate from 09-03 config regressions and 09-05 electron-builder integration.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-webpack-to-vite/09-CONTEXT.md
@.planning/phases/09-webpack-to-vite/09-RESEARCH.md
@.planning/phases/09-webpack-to-vite/09-03-SUMMARY.md
@package.json
@_scripts/dev-runner.js
@_scripts/webpack.main.config.js
@_scripts/webpack.renderer.config.js
@_scripts/build-dev.js
@_scripts/release.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Verify A7 + cross-check _scripts/ for residual webpack references</name>
  <read_first>
    - `_scripts/build-dev.js` (planner already scouted: 92 lines, calls `electron-builder` CLI directly with `-c.directories.output=...` — zero webpack refs)
    - `_scripts/release.js` (planner already scouted: 186 lines, calls `npm run build:installer` + `gh` CLI — zero webpack refs)
    - Current `package.json` `scripts` block (lines 122-150)
  </read_first>
  <action>
    1. Empirical A7 verification across `_scripts/`:
       ```
       grep -rn "webpack\|webpack-dev-server\|HtmlWebpack\|CopyWebpack\|MiniCssExtract\|VueLoaderPlugin\|require('webpack')\|from 'webpack'" _scripts/
       ```
       Expected (from planner scout):
       - `_scripts/dev-runner.js:5` (`const webpack = require('webpack')`)
       - `_scripts/dev-runner.js:6` (`const WebpackDevServer = require('webpack-dev-server')`)
       - `_scripts/dev-runner.js:11,12` (requires of the two webpack configs)
       - `_scripts/webpack.main.config.js` (the file itself — 7 matches for `webpack` in require/plugin names)
       - `_scripts/webpack.renderer.config.js` (similar)
       - **NO matches** in `build-dev.js` or `release.js` or `installer.nsh` or any other `_scripts/` file

       If ANY unexpected `_scripts/` file references webpack, document in SUMMARY as a Plan 09-04 deviation and decide per-case: patch or defer.

    2. Cross-check for non-`_scripts/` references to the deleted files or the dev-runner script path:
       ```
       grep -rn "_scripts/webpack\|_scripts/dev-runner\|dev-runner" . --include='*.{js,ts,vue,json,md}' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.planning --exclude-dir=build --exclude-dir=dist --exclude-dir=out --exclude-dir=bot
       ```
       Expected:
       - `package.json`:129 (`"dev-runner": "node _scripts/dev-runner.js"`)
       - `package.json`:127 (`"debug-runner": "node _scripts/dev-runner.js --remote-debug"`)
       - `package.json`:138,139 (`"pack:main": "webpack --config _scripts/webpack.main.config.js"`, `"pack:renderer": "webpack --config _scripts/webpack.renderer.config.js"`)
       - No other matches

       If ANY other match appears (docs references are OK — exclude `.planning/` already — but source code references are NOT OK), document + fix.

    3. Confirm `_scripts/build-dev.js` stays:
       ```
       grep -nE "webpack|require\('\.\/webpack" _scripts/build-dev.js
       ```
       Expected: zero matches.

    4. Confirm `_scripts/release.js` stays:
       ```
       grep -nE "webpack|require\('\.\/webpack" _scripts/release.js
       ```
       Expected: zero matches.

    5. Confirm `_scripts/installer.nsh` stays (it's an NSIS installer script — probably doesn't reference webpack; verify):
       ```
       grep -nE "webpack" _scripts/installer.nsh || echo "no matches"
       ```
       Expected: no matches.

    Record all confirmations in scratch notes for SUMMARY's A7 outcome row.
  </action>
  <verify>
    <automated>
    # webpack refs limited to the 3 scripts we'll delete
    grep -l "webpack" _scripts/ -r | sort > /tmp/webpack-refs-09-04.txt
    [ "$(cat /tmp/webpack-refs-09-04.txt)" = "$(printf '_scripts/dev-runner.js\n_scripts/webpack.main.config.js\n_scripts/webpack.renderer.config.js\n')" ]
    # package.json has expected webpack invocations
    grep -c "webpack" package.json | awk '{ if ($1+0 >= 2 && $1+0 <= 5) print "OK"; else print "FAIL"; }' | grep -q OK
    </automated>
  </verify>
  <acceptance_criteria>
    - `_scripts/` webpack references confined to 3 files (the ones being deleted)
    - `_scripts/build-dev.js` has zero webpack references (A7 confirmed)
    - `_scripts/release.js` has zero webpack references (A7 confirmed)
    - No residual webpack refs outside of package.json + 3 doomed files
  </acceptance_criteria>
  <done>Deletion surface confirmed safe; 3-file deletion + 1-file scripts rewrite is the complete change surface.</done>
</task>

<task type="auto">
  <name>Task 2: Rewrite package.json scripts</name>
  <read_first>
    - Current `package.json` scripts block (lines 122-150)
    - 09-RESEARCH.md §package.json Diff (CANONICAL) — target scripts shape
    - 09-CONTEXT.md §D-09-03 (HMR scope) + §D-09-04 (dev server defaults)
  </read_first>
  <action>
    Using the Edit tool on `package.json`, rewrite the `scripts` block. The current block has 28 scripts; the new block should have 21 scripts. Specific changes:

    **DELETE these 4 scripts:**
    - `"dev-runner": "node _scripts/dev-runner.js"` (the wrapper that dev → dev-runner chain used)
    - `"debug-runner": "node _scripts/dev-runner.js --remote-debug"` (same — debug flag now goes via `electron-vite dev --inspect`)
    - `"pack:main": "webpack --mode=production --config _scripts/webpack.main.config.js"`
    - `"pack:renderer": "webpack --mode=production --config _scripts/webpack.renderer.config.js"`

    **MODIFY these 4 scripts:**

    1. `"dev"`:
       - Before: `"dev": "run-s rebuild:electron dev-runner"`
       - After: `"dev": "run-s rebuild:electron electron-vite-dev"`

    2. `"debug"`:
       - Before: `"debug": "run-s rebuild:electron debug-runner"`
       - After: `"debug": "run-s rebuild:electron electron-vite-debug"`

    3. `"pack"`:
       - Before: `"pack": "run-p pack:main pack:renderer"`
       - After: `"pack": "electron-vite build"`
       (Single invocation — electron-vite builds main + renderer in one shot; no parallel wrapper needed.)

    4. `"build:dev:dir"`:
       - Before: `"build:dev:dir": "node _scripts/build-dev.js --dir"`
       - After: UNCHANGED — `_scripts/build-dev.js` stays (A7 confirmed). The script itself needs NO changes because it never invoked webpack; it only dynamically configures electron-builder's output directory with a `<baseVersion>+<shortHash>` version tag and passes through to `electron-builder`. electron-builder now reads from `out/` (Plan 09-05 updates the `build.files` config) but `build-dev.js` is bundler-agnostic.

    **ADD these 2 scripts:**

    1. `"electron-vite-dev": "electron-vite dev"` — the actual CLI invocation `dev` wraps
    2. `"electron-vite-debug": "electron-vite dev --inspect=9222"` — debug-mode invocation with Node inspector on port 9222 (matches the `--inspect=9222` pattern from the retired `dev-runner.js:49`). The `--remote-debug` flag from the old debug-runner (which set `--remote-debugging-port=9223`) is dropped — electron-vite handles renderer DevTools natively; if the user needs remote DevTools port, they can add `--inspect-brk` or use electron's own `--remote-debugging-port` arg via `process.argv` in main.js. Not critical for Phase 9 — document in SUMMARY as a minor debug-mode surface change.

    **UNCHANGED (verify still present verbatim):**
    - `build`, `build-publish`, `electron-builder-install`, `electron-rebuild`, `jest`, `jest:coverage`, `jest:watch`, `lint`, `postinstall`, `prettier`, `rebuild:electron`, `rebuild:node`, `test`, `test:watch`, `type-check`, `build:dir`, `build:installer`, `release`, `build:dev`

    Final scripts block should look like (ordering — alphabetical WITHIN the scripts object, though JSON insertion order is preserved by JS engines and this codebase has been somewhat-ordered historically; match the current ordering pattern — scripts by functional grouping):

    ```json
    "scripts": {
        "build": "run-s rebuild:electron pack build:dir",
        "build:dev": "run-s rebuild:electron pack build:dev:dir",
        "build:dev:dir": "node _scripts/build-dev.js --dir",
        "build-publish": "run-s rebuild:electron pack && electron-builder --publish always",
        "debug": "run-s rebuild:electron electron-vite-debug",
        "dev": "run-s rebuild:electron electron-vite-dev",
        "electron-builder-install": "electron-builder install-app-deps",
        "electron-rebuild": "electron-rebuild -f --which-module irsdk-node,sharp",
        "electron-vite-debug": "electron-vite dev --inspect=9222",
        "electron-vite-dev": "electron-vite dev",
        "jest": "jest",
        "jest:coverage": "jest --collect-coverage",
        "jest:watch": "jest --watch",
        "lint": "eslint --fix ./",
        "pack": "electron-vite build",
        "postinstall": "run-s electron-builder-install electron-rebuild",
        "prettier": "prettier --write \"{src,_scripts}/**/*.{js,ts,vue}\"",
        "rebuild:electron": "run-s electron-builder-install electron-rebuild",
        "rebuild:node": "npm rebuild",
        "test": "jest --passWithNoTests",
        "test:watch": "run-s rebuild:node jest:watch --passWithNoTests",
        "type-check": "tsc --noEmit",
        "build:dir": "electron-builder --dir",
        "build:installer": "run-s rebuild:electron pack && electron-builder",
        "release": "node _scripts/release.js"
    }
    ```

    NOTE: the `"build:dev"` script still chains `run-s rebuild:electron pack build:dev:dir` — now that `pack` is `electron-vite build`, the pack step emits `out/`, `build:dev:dir` then invokes `_scripts/build-dev.js --dir` which calls `electron-builder --dir`. electron-builder's `build.files` still references `dist/**/*` after this plan commits — Plan 09-05 retargets.

    Do NOT modify `build`, `main`, `dependencies`, `devDependencies`, or `jest` config keys in package.json. Scripts-only.
  </action>
  <verify>
    <automated>
    # Check JSON validity
    node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"
    # webpack-invoking scripts gone
    ! grep -qE '"(pack:main|pack:renderer|dev-runner|debug-runner)":' package.json
    # electron-vite scripts present
    grep -q '"electron-vite-dev":' package.json
    grep -q '"electron-vite-debug":' package.json
    grep -q '"pack": "electron-vite build"' package.json
    grep -q '"dev": "run-s rebuild:electron electron-vite-dev"' package.json
    grep -q '"debug": "run-s rebuild:electron electron-vite-debug"' package.json
    # Unchanged scripts preserved
    grep -q '"build:dev:dir": "node _scripts/build-dev.js --dir"' package.json
    grep -q '"release": "node _scripts/release.js"' package.json
    grep -q '"postinstall":' package.json
    # webpack string remaining ONLY in any non-scripts location (or removed entirely)
    # package.json no longer has ANY webpack references (scripts were the only ones)
    ! grep -q '"webpack"' package.json
    </automated>
  </verify>
  <acceptance_criteria>
    - `package.json` parses as valid JSON
    - 4 scripts deleted (`pack:main`, `pack:renderer`, `dev-runner`, `debug-runner`)
    - 4 scripts modified (`dev`, `debug`, `pack`, `build:dev:dir` unchanged BUT verified)
    - 2 scripts added (`electron-vite-dev`, `electron-vite-debug`)
    - `build:dev`, `release`, `build-publish`, `build:installer` unchanged
    - Zero occurrences of `"webpack"` as a JSON key or value in package.json
  </acceptance_criteria>
  <done>Scripts block rewritten; ready to delete the webpack files.</done>
</task>

<task type="auto">
  <name>Task 3: Delete the three webpack files</name>
  <read_first>
    - Task 1's confirmation that no remaining consumers reference the deleted paths (after Task 2's scripts rewrite)
  </read_first>
  <action>
    1. Re-confirm Task 2's scripts rewrite eliminated all package.json consumers of the three files:
       ```
       grep -nE "_scripts/webpack\.main\.config|_scripts/webpack\.renderer\.config|_scripts/dev-runner" package.json
       ```
       Expected: 0 matches (all references removed in Task 2).

    2. Delete via `git rm` (atomic with the commit — prefer over plain `rm` + `git add -u`):
       ```
       git rm _scripts/webpack.main.config.js
       git rm _scripts/webpack.renderer.config.js
       git rm _scripts/dev-runner.js
       ```

    3. Verify staged state:
       ```
       git status --short
       ```
       Expected (beyond bot/** dirty state):
       - `D  _scripts/dev-runner.js`
       - `D  _scripts/webpack.main.config.js`
       - `D  _scripts/webpack.renderer.config.js`
       - `M  package.json`

       If ANY other path appears (especially anything under `src/` or `bot/`), STOP + fix.

    4. Cross-check no consumers remain anywhere:
       ```
       grep -rn "_scripts/webpack\|_scripts/dev-runner\|webpack.main.config\|webpack.renderer.config" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.planning --exclude-dir=build --exclude-dir=dist --exclude-dir=out --exclude-dir=bot
       ```
       Expected: 0 matches (note: `.planning/` is excluded — historical PLAN.md files may reference these paths, which is fine).
  </action>
  <verify>
    <automated>
    ! test -f _scripts/webpack.main.config.js
    ! test -f _scripts/webpack.renderer.config.js
    ! test -f _scripts/dev-runner.js
    git status --short | grep -cE '^D\s+_scripts/(webpack\.main\.config\.js|webpack\.renderer\.config\.js|dev-runner\.js)$' | grep -q '^3$'
    </automated>
  </verify>
  <acceptance_criteria>
    - Three webpack-era scripts deleted
    - Deletions staged (status `D`)
    - No live consumers remain
  </acceptance_criteria>
  <done>webpack build chain retired from `_scripts/`.</done>
</task>

<task type="auto">
  <name>Task 4: Gate check — npm run dev + npm run pack end-to-end</name>
  <read_first>
    - 09-RESEARCH.md §Build-Mode Smoke Test (MUST PASS)
    - 09-RESEARCH.md §Dev-Mode Smoke Test (already exercised in Plan 09-03; this task re-validates via `npm run` wrapper)
  </read_first>
  <action>
    1. **Dev-mode gate** — verify `npm run dev` now launches end-to-end via electron-vite (not the deleted dev-runner):
       - Start in background: `npm run dev 2>&1 | tee /tmp/npm-run-dev-09-04.log`
       - Poll log for `VITE` + `ready` markers (up to 60s)
       - Verify Electron spawns (log lines or ps check)
       - No need to re-do HMR + main-restart tests (Plan 09-03 covered those; changes in this plan are scripts-only)
       - Terminate via SIGTERM; verify clean shutdown (no orphan processes)
       - If `npm run dev` fails because `run-s rebuild:electron` (the postinstall) fails, that's unrelated to Phase 9 — document + either skip the rebuild step (`run-s electron-vite-dev` without rebuild) for this smoke test or wait for rebuild to complete.

    2. **Pack-mode gate** — `npm run pack` is the first production-build run for electron-vite:
       ```
       npm run pack 2>&1 | tee /tmp/npm-run-pack-09-04.log
       ```
       Expected output:
       - `vite v<ver> building for production...` (main build)
       - `✓ built in <ms>ms` (main)
       - `vite v<ver> building for production...` (renderer build)
       - `✓ <N> modules transformed.`
       - `out/renderer/index.html`, `out/renderer/assets/index-<hash>.js`, `out/renderer/assets/index-<hash>.css`, `out/main/index.js` file emissions
       - Exit 0

       **If pack fails:**
       - `Cannot find entry for main` → electron-vite couldn't locate main entry; config's `main` sub-config may need `build.lib.entry` or rely on default `src/main/index.{js,ts}` convention. Check electron-vite's defaults; common fix is ensuring `src/main/index.js` is where it's looking. Our main entry IS at `src/main/index.js` (verified by planner scout line 14 of webpack.main.config.js: `entry: { main: path.join(__dirname, '../src/main/index.js') }`). electron-vite's default main entry is `src/main/index.{js,ts,mjs}` — aligns, no config needed. If it still fails, add explicit `build.lib.entry: resolve(__dirname, 'src/main/index.js')` to the main sub-config in `electron.vite.config.mjs` and commit that as a separate `refactor(build): ...` prep step within this plan.
       - `Cannot resolve './main.js' from 'src/renderer/index.html'` → renderer.root mismatch; verify Plan 09-03 set it to `resolve(__dirname, 'src/renderer')`.
       - `Failed to resolve import '<some package>'` in renderer build → missing external; add to `renderer.build.rollupOptions.external`.
       - SCSS errors → loadPaths wrong.

       Document any fix in SUMMARY as a deviation; commit the config fix as part of this plan's content commit (no separate "oopsie" commit — this plan's scope is "retire webpack + make npm run dev/pack work", and a config adjustment discovered during gate-check is in-scope).

    3. **Output verification:**
       ```
       test -f out/main/index.js && echo "main OK"
       test -f out/renderer/index.html && echo "renderer HTML OK"
       ls out/renderer/assets/*.js 2>&1 | head -3
       ls out/renderer/assets/*.css 2>&1 | head -3
       ```
       All four checks should pass. Record the file sizes for the renderer JS bundle — comparable-to Phase 8 Plan 06's `dist/renderer.js` = 2,741,682 bytes (this becomes the BUNDLE-01 reference number; Plan 09-05 checks the ±20% vs v1.4 INSTALLER gate, not this number).

    4. **Test + lint gates:**
       - `npm test` → 256/256
       - `npm run lint 2>&1 | tail -3` → ≤ 1881 problems

    5. **Installer path broken** — DO NOT run `npm run build` yet. electron-builder's `build.files` still points at `dist/**/*` (it needs to point at `out/**/*`, and `"main"` still points at `./dist/main.js` — should be `./out/main/index.js`). That's Plan 09-05's scope. Running `npm run build` here would either fail ("cannot find dist/") or produce a degenerate installer missing all renderer assets. Document in SUMMARY that `npm run build` is the remaining breakage, closing at Plan 09-05.
  </action>
  <verify>
    <automated>
    # Dev-mode log shows electron-vite, not dev-runner
    grep -qE 'VITE.*ready|ready in' /tmp/npm-run-dev-09-04.log
    ! grep -qE '_scripts/dev-runner' /tmp/npm-run-dev-09-04.log

    # Pack-mode succeeded
    grep -qE 'built in|✓' /tmp/npm-run-pack-09-04.log
    test -f out/main/index.js
    test -f out/renderer/index.html
    # At least 1 JS + 1 CSS asset in out/renderer/assets/
    ls out/renderer/assets/*.js 2>&1 | head -1 | grep -q .
    ls out/renderer/assets/*.css 2>&1 | head -1 | grep -q .

    # Test + lint
    npm test 2>&1 | grep -qE '256 passed'
    </automated>
  </verify>
  <acceptance_criteria>
    - `npm run dev` launches electron-vite end-to-end (VITE ready line observed in log)
    - `npm run pack` exits 0
    - `out/main/index.js` exists
    - `out/renderer/index.html` exists
    - `out/renderer/assets/` has ≥ 1 JS + 1 CSS file
    - `npm test` 256/256
    - `npm run lint` ≤ 1881
  </acceptance_criteria>
  <done>npm-facing build surface works; `out/` directory populated; installer path unwired (Plan 09-05 scope).</done>
</task>

<task type="auto">
  <name>Task 5: Commit webpack retirement + scripts rewire (D-09-10 commit 2 — part C)</name>
  <read_first>
    - 09-CONTEXT.md carryforward (commit discipline)
  </read_first>
  <action>
    1. Confirm `bot/**` dirty state unchanged from Plan 09-03 close.

    2. Verify working tree contains ONLY expected changes (beyond bot/** pre-existing):
       ```
       git status --short
       ```
       Expected:
       - `D  _scripts/dev-runner.js`
       - `D  _scripts/webpack.main.config.js`
       - `D  _scripts/webpack.renderer.config.js`
       - `M  package.json`
       - possibly `M  electron.vite.config.mjs` IF Task 4 needed a config fix. If that fix landed, document in SUMMARY. Otherwise expected to be absent.

       Also: `out/` directory may be present from Task 4's `npm run pack`. That's a build artifact. Verify `.gitignore` excludes `out/` — it should (webpack's `dist/` was ignored; electron-vite's `out/` follows the same pattern). Check:
       ```
       cat .gitignore | grep -E '^(out|dist)'
       ```
       If `out/` is NOT in .gitignore, add it (append `out/` to .gitignore as a single line) and stage — otherwise `git add <files>` would accidentally pick up the build artifacts. If `.gitignore` needs updating, that's a 5th file in this commit; document in SUMMARY.

    3. Stage explicitly:
       ```
       git add package.json
       # The three deletions were staged via `git rm` in Task 3 already
       # Optional: git add .gitignore (only if Task 4 found it missing `out/`)
       # Optional: git add electron.vite.config.mjs (only if Task 4 needed a fix)
       ```

    4. Verify staged scope:
       ```
       git diff --cached --name-status
       ```
       Expected (minimum):
       ```
       D       _scripts/dev-runner.js
       D       _scripts/webpack.main.config.js
       D       _scripts/webpack.renderer.config.js
       M       package.json
       ```
       (plus 0-2 additional lines for .gitignore or electron.vite.config.mjs adjustments if Task 4 needed them)

    5. Commit:
       ```
       refactor(build): retire webpack configs + dev-runner; rewire package.json scripts to electron-vite
       ```
       No Co-Authored-By. No --no-verify.

    6. Verify commit:
       - `git log -1 --format=%s` matches
       - No Co-Authored-By
       - `git show --stat HEAD` shows 4-6 files

    7. Post-commit gates:
       - `npm test` 256/256 (re-check)
       - `npm run lint 2>&1 | tail -3` ≤ 1881 (re-check + record count)
       - `bot/**` dirty count unchanged
  </action>
  <verify>
    <automated>
    git log -1 --format=%s | grep -qE '^refactor\(build\): retire webpack configs'
    git log -1 --format=%B | { ! grep -qi 'Co-Authored'; }
    # At least 4 files changed in this commit
    git show --stat HEAD --format= | grep -cE 'dev-runner|webpack\.main|webpack\.renderer|package\.json' | awk '{ if ($1+0 >= 4) print "OK"; else print "FAIL"; }' | grep -q OK
    npm test 2>&1 | grep -qE '256 passed'
    </automated>
  </verify>
  <acceptance_criteria>
    - Exactly one new commit with `refactor(build): retire webpack ...` message
    - Commit diff = 4-6 files (3 deletions + package.json + optional .gitignore + optional config fix)
    - No Co-Authored-By
    - `bot/**` dirty state preserved
    - `npm test` 256/256; `npm run lint` ≤ 1881
  </acceptance_criteria>
  <done>D-09-10 commit 2 (full trilogy of parts A+B+C) landed; webpack retired.</done>
</task>

<task type="auto">
  <name>Task 6: Write 09-04-SUMMARY.md and commit it</name>
  <read_first>
    - $HOME/.claude/get-shit-done/templates/summary.md
    - Task-4 smoke-test log excerpts (VITE ready, pack output)
    - Task-1 A7 verification outcome
  </read_first>
  <action>
    Create `.planning/phases/09-webpack-to-vite/09-04-SUMMARY.md`:

    - YAML frontmatter (phase, plan: 04, subsystem: bundler-scripts-rewire, tags: [webpack-retirement, scripts, vite, d-09-10-commit-2-part-c], requires: [09-03], provides: see must_haves.artifacts above, affects: package.json + 3 deleted scripts, tech_stack: no packages added/removed — the retirement was done in 09-01, this just retires their config/runner files; patterns: run-s chain preservation, electron-vite CLI as single build entry)
    - **Empirical Outcomes** — row for A7 (both `_scripts/build-dev.js` + `_scripts/release.js` confirmed webpack-free, kept as-is)
    - **Script Diff Table** — column: `before` → `after` for each of the 9 scripts touched (4 deleted + 4 modified + 2 added + 1 confirmed-unchanged)
    - **Files Deleted** — list of 3 deleted paths with their line counts at deletion time (webpack.main.config.js: 88, webpack.renderer.config.js: 146, dev-runner.js: 137 → 371 total LOC retired)
    - **Pack-mode Smoke-Test Output** — log excerpt from Task 4 showing Vite build of both main + renderer + out/ file listing with sizes
    - **Dev-mode Smoke-Test Re-Validation** — `npm run dev` now goes through electron-vite (not dev-runner); log excerpt confirming
    - **Build state at plan close** — MOSTLY WORKING: `npm run dev` + `npm run pack` functional; `npm run build` still broken because electron-builder reads from `dist/` + `"main"` points at `./dist/main.js`; Plan 09-05 retargets.
    - **Commit** — SHA + message + file list
    - **Deviations from Plan** — any Task-4 config fixes (likely none, but document if any), .gitignore update if needed, debug-runner's `--remote-debug` flag replacement semantics
    - **Threat Model Dispositions** — T-09-04-01..03 (below)
    - **Self-Check** — file existence + deletions + commit SHA + working tree clean + bot/** untouched
    - **Notes for Plan 09-05** — package.json changes needed: `"main": "./dist/main.js"` → `"./out/main/index.js"` + `"build.files": ["dist/**/*", ...]` → `["out/**/*", ...]`. Run `npm run build` (not just `pack` + `build:dir`) end-to-end; verify installer emits into `build/` with correct size band (±20% of v1.4 per ROADMAP success criterion 4); final `_scripts/build-dev.js` + `_scripts/release.js` re-verified by executing `npm run build:dev` smoke test.

    Commit as:
    ```
    git add .planning/phases/09-webpack-to-vite/09-04-SUMMARY.md
    git commit -m "docs(09-04): complete webpack retirement + scripts rewire plan"
    ```
  </action>
  <verify>
    <automated>
    test -f .planning/phases/09-webpack-to-vite/09-04-SUMMARY.md
    git log -1 --format=%s | grep -qE '^docs\(09-04\):'
    git log -1 --format=%B | { ! grep -qi 'Co-Authored'; }
    </automated>
  </verify>
  <acceptance_criteria>
    - SUMMARY.md exists with all sections
    - `docs(09-04): ...` commit on master
    - No Co-Authored-By
  </acceptance_criteria>
  <done>Plan 09-04 closes; webpack fully retired; Plan 09-05 ships the final electron-builder integration.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| `package.json` scripts → shell invocation | npm scripts run in the user's shell with full filesystem access; replacing a webpack invocation with electron-vite changes what code runs under those privileges but both are part of the trusted build-tool chain. |
| `_scripts/*` file retirement | Deleting files removes code from the repository; any reference elsewhere (accidentally retained) becomes a runtime error rather than a security issue. |
| electron-vite build output (`out/`) → electron-builder | `out/` becomes the trusted input to electron-builder in Plan 09-05; this plan populates it but doesn't wire it to the installer yet. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-09-04-01 | Tampering | `_scripts/` file deletion introduces regressions if any consumer missed | mitigate | Task 1 grep comprehensively audits all `_scripts/` + project-root consumers; Task 4 gate-check (`npm run dev` + `npm run pack`) exercises the runtime surface. Any missed consumer would surface as "cannot find module _scripts/webpack.main.config" etc. — immediately obvious. |
| T-09-04-02 | DoS | debug-runner's `--remote-debug` flag (renderer remote-debugging-port=9223) lost in translation to electron-vite | accept | The `RENDERER_REMOTE_DEBUGGING` env var at dev-runner.js:18-20 was only consumed by dev-runner itself (no grep hits elsewhere). electron-vite's `--inspect=9222` covers the main-process side; renderer DevTools is available via Electron's built-in devtools (already opened in src/main/index.js:606-607). If `--remote-debug` is needed in future, it's an electron-vite CLI arg or a package.json script addition. Not a blocker for Phase 9. |
| T-09-04-03 | Elevation of Privilege | package.json `scripts` hijack | accept | Same attack surface as pre-migration (npm scripts can always execute arbitrary code); no new vector. Supply-chain risk on `electron-vite` package itself was addressed in Plan 09-01's T-09-01-01. |

**Block threshold:** HIGH — any Task 4 gate-check failure that can't be resolved within the plan's scope blocks the commit. Most likely failure mode would be a residual webpack consumer missed in Task 1; documented mitigation is to re-run Task 1's grep with looser filters and patch the consumer before landing.
</threat_model>

<verification>

Consolidated verification (end of Task 5, before Task 6 SUMMARY):

```bash
# Files deleted
! test -f _scripts/webpack.main.config.js
! test -f _scripts/webpack.renderer.config.js
! test -f _scripts/dev-runner.js

# Files preserved (A7 outcome)
test -f _scripts/build-dev.js
test -f _scripts/release.js

# package.json scripts
! grep -qE '"(pack:main|pack:renderer|dev-runner|debug-runner)":' package.json
grep -q '"electron-vite-dev":' package.json
grep -q '"electron-vite-debug":' package.json
grep -q '"pack": "electron-vite build"' package.json

# Zero residual webpack references in checked-in code (excluding .planning/)
grep -rE "webpack" . --include='*.{js,ts,json,mjs,cjs}' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.planning --exclude-dir=build --exclude-dir=dist --exclude-dir=out --exclude-dir=bot | head -3
# Expected: 0-1 lines (the webpack-related devDep entries in package.json were removed in Plan 09-01; if 0, perfect; if 1-2, they're package.json transitive strings like "webpack://" in sourcemaps — not real webpack usage)

# Output present after Task 4 pack
test -f out/main/index.js
test -f out/renderer/index.html

# Dev + pack smoke logs
grep -qE 'VITE.*ready' /tmp/npm-run-dev-09-04.log
grep -qE 'built in|✓' /tmp/npm-run-pack-09-04.log

# Test + lint bands
npm test 2>&1 | grep -E '256 passed'
npm run lint 2>&1 | tail -3 | grep -oE '[0-9]+ problems' | head -1
# Expected: ≤ 1881

# Commit discipline
git log -2 --format='%s'
# Expected:
#   docs(09-04): complete webpack retirement + scripts rewire plan
#   refactor(build): retire webpack configs + dev-runner; rewire package.json scripts to electron-vite

git log -1 --format=%B HEAD~1 | { ! grep -qi 'Co-Authored'; }

# bot/** untouched
git status --short | grep -cE '^[ ]?M bot|^\?\? bot'
# Expected: same count as at Plan 09-03 close
```

</verification>

<success_criteria>

- [ ] A7 empirically re-verified (build-dev.js + release.js webpack-free, preserved as-is)
- [ ] `_scripts/webpack.main.config.js`, `_scripts/webpack.renderer.config.js`, `_scripts/dev-runner.js` deleted
- [ ] `package.json` scripts block rewritten: 4 scripts deleted, 4 modified, 2 added, rest unchanged
- [ ] `npm run dev` launches electron-vite end-to-end (replaces dev-runner path)
- [ ] `npm run pack` emits `out/main/index.js` + `out/renderer/index.html` + `out/renderer/assets/*.{js,css}`
- [ ] `npm test` 256/256
- [ ] `npm run lint` ≤ 1881
- [ ] D-09-10 commit 2 part C (`refactor(build): retire webpack ...`) landed on master with 4-6 files
- [ ] No Co-Authored-By
- [ ] `bot/**` dirty state preserved
- [ ] 09-04-SUMMARY.md created + committed as `docs(09-04): ...`
- [ ] Threat register T-09-04-01..03 dispositioned

</success_criteria>

<output>

After completion, create `.planning/phases/09-webpack-to-vite/09-04-SUMMARY.md` capturing:
- A7 outcome (build-dev.js + release.js preserved)
- Script before/after diff table (9 scripts)
- 3-file deletion with LOC totals (~371 lines retired)
- `npm run dev` + `npm run pack` smoke-test log excerpts with `out/` file listing
- Commit SHA + message
- Build state at plan close: MOSTLY WORKING (dev + pack green; installer broken pending Plan 09-05)
- Notes for Plan 09-05 (`"main"` path + `build.files` retarget + `npm run build` installer smoke test + size gate vs v1.4)

Commit as `docs(09-04): complete webpack retirement + scripts rewire plan`.

</output>
