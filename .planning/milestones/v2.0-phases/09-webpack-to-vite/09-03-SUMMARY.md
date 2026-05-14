---
phase: 09-webpack-to-vite
plan: 03
subsystem: bundler-vite-config-completion
tags: [bundler, vite, electron-vite-config, externals, aliases, scss-loadpaths, dev-smoke-test, hmr-verified, d-09-10-commit-2-part-b]
requires: [09-01, 09-02]
provides:
  - "`electron.vite.config.mjs` fully populated (94 lines): main + renderer sub-configs with externals (5/3), aliases (@ + src; icons dropped per A6), SCSS loadPaths + custom @oruga-ui/theme-bulma importer, define blocks (__static, PRODUCT_NAME, Vue 3 feature flags), @vitejs/plugin-vue wired, commonjsOptions.include for src/** CJS traversal"
  - "`npx electron-vite dev --watch --entry out/main/index.js` validated end-to-end: Vite dev server HTTP 200 on localhost:5173, Electron main+renderer+worker processes up, 45 modules transformed, renderer HMR fires on Vue SFC edit, main-process rebuild+restart fires on src/main/index.js edit"
  - "`.gitignore` + `eslint.config.js` patched to ignore electron-vite `out/` build artifacts (Rule 3 auto-fix — without ignores, build output pollutes working tree + adds ~50 lint errors from bundled vendor code)"
  - "D-09-10 commit 2 part B landed on master (`refactor(build): flesh out electron.vite.config.mjs ...` — SHA `3bc0e45`) + Rule 3 follow-up (`chore(build): ignore electron-vite out/ build artifacts` — SHA `356cd93`)"
  - "Build state at plan close: PARTIALLY WORKING — `npx electron-vite dev --watch --entry out/main/index.js` launches end-to-end (smoke test gate green); `npm run dev` still invokes the deleted-webpack-era `_scripts/dev-runner.js` and fails; `npm run pack:*` still references webpack; Plan 09-04 rewires package.json scripts + retires _scripts/webpack.*.config.js + dev-runner; Plan 09-05 flips package.json `main` field from `./dist/main.js` → `./out/main/index.js` so `npx electron-vite dev` works without `--entry` override"
affects:
  - "electron.vite.config.mjs"
  - ".gitignore"
  - "eslint.config.js"

tech_stack:
  added: []
  removed: []
  patterns:
    - "electron-vite main+renderer sub-config idiom — separate `main: { build: {...}, resolve: {...}, define: {...} }` and `renderer: { root, plugins, build, resolve, css, define }` blocks. Each sub-config is an independent Vite config passed to the respective Rollup build. Externals asymmetry: main has 5 modules (+ irsdk-node + electron-updater), renderer has 3 (common subset)"
    - "externalizeDepsPlugin (v5 deprecated but still functional) — auto-externalizes all `dependencies` from package.json for main process. Explicit `rollupOptions.external` list duplicates native modules as belt-and-suspenders per RESEARCH.md P1. Note: docs show `externalizeDepsPlugin` is soft-deprecated in v5 with migration path to `build.externalizeDeps` (default-enabled) but the plugin still works; keeping the plugin form preserves RESEARCH.md canonical shape"
    - "@vitejs/plugin-vue v6 convention — single `plugins: [vue()]` call in renderer sub-config; API shape unchanged from v5 (Plan 09-01 A2 version-drift note). No other plugin options needed — Vue 3 Options API + SCSS + assets all default-supported"
    - "SCSS loadPaths + findFileUrl custom importer pattern — port of Phase 8 Plan 03 theme-bulma quirk to Vite's sass-embedded. `loadPaths: [node_modules]` alone is insufficient because sass-embedded's default nodeJsImporter consults the `@oruga-ui/theme-bulma` package-exports map first, and the exports key `./dist/scss/*.scss` requires trailing `.scss` extension that sass-embedded strips during resolution. Custom `findFileUrl` importer intercepts `@oruga-ui/theme-bulma/` imports and resolves them directly to filesystem paths via `resolve(__dirname, 'node_modules/@oruga-ui/theme-bulma', rel)`, bypassing the exports-map check entirely"
    - "commonjsOptions.include [node_modules, src/] — required for Rollup @rollup/plugin-commonjs to traverse src/main/*.js relative requires. Without this, the default include pattern matches node_modules only, and the plugin treats src/main/index.js as 'already-CJS' + leaves all `require('./iracing-sdk')` calls raw (fails at Electron load time with `Cannot find module`). Discovery scar tissue: first 3 smoke-test attempts produced 29.51 kB bundle with 1 module transformed; adding `include: [/node_modules/, /src\\//]` + `transformMixedEsModules: true` produced the correct 104.57 kB bundle with 45 modules transformed"
    - "Vite 7 dev server + Electron main-process restart via `--watch` flag — electron-vite dev watches main bundle mtime and re-executes Electron on change. Without `--watch`, only renderer HMR fires; main edits require manual restart. Phase 9 Plan 04 will wire `dev` script to `electron-vite dev --watch` so the flag is implicit"
    - "--entry CLI override for Plan 09-03 smoke-test — package.json `main` field still points at webpack-era `./dist/main.js` (Plan 09-05 flips to `./out/main/index.js`). Using `--entry out/main/index.js` on the CLI bypasses the package.json lookup without touching package.json, preserving Plan 09-03's 1-file commit scope. Plan 09-04's script rewire will add `--watch` but won't need `--entry` once Plan 09-05 fixes the `main` field"

key_files:
  created:
    - ".planning/phases/09-webpack-to-vite/09-03-SUMMARY.md"
  modified:
    - "electron.vite.config.mjs"
    - ".gitignore"
    - "eslint.config.js"
  deleted: []

key-decisions:
  - "Custom sass `findFileUrl` importer for @oruga-ui/theme-bulma — chosen over alternatives: (1) changing main.scss `@use '@oruga-ui/theme-bulma/dist/scss/theme-build'` to `@use '@oruga-ui/theme-bulma/scss/theme-build'` would hit the same exports-map-extension-strip issue at the `./scss/*.scss` key. (2) Disabling all nodeJsImporters globally would break other @use targets. (3) Monkey-patching the package.json exports map would require a postinstall. Custom importer is local + minimal + documented as Phase 8 Plan 03 scar tissue port. Config comment explicitly flags the reason so future maintainers don't wonder"
  - "`commonjsOptions.include: [/node_modules/, /src\\//]` — discovered empirically after 3 smoke-test failures showed 29.51 kB bundle (= size of src/main/index.js alone) with 1 module transformed. Without this config, Rollup's @rollup/plugin-commonjs sees src/main/index.js as a raw CJS module and leaves all `require('./sibling')` calls externalized. Adding src/ to the include pattern + enabling `transformMixedEsModules` makes the plugin traverse src/main + src/utilities siblings. Result: 104.57 kB bundle, 45 modules transformed, relative requires inlined"
  - "Use `--entry out/main/index.js` on the `npx electron-vite dev` CLI rather than editing package.json `main` field — package.json `main` flip is Plan 09-05's scope (D-09-08 three-commit chain commit 3). Keeping Plan 09-03's commit scope to the single electron.vite.config.mjs file preserves bisect discipline; the smoke test runs via CLI override. Plan 09-04's script rewire will encapsulate the `--entry` + `--watch` flags in the `dev` npm script so the ergonomics don't leak into user-visible workflows"
  - "Separate commit for `.gitignore` + `eslint.config.js` build-hygiene (`chore(build): ignore electron-vite out/ ...` SHA `356cd93`) — rather than bundling into the config commit. Rationale: D-09-10 three-commit bisect chain treats commit 2 as 'config shape' so bisecting between HEAD and 09-02 isolates config regressions. The ignore updates are build-hygiene (not config shape) — should not land in the bisect-targeted config commit. Plan 09-03 Task 4 spec'd 1-file scope for the config commit; Rule 3 auto-fix for ignores lands in a separate commit with a clear chore() type. Both commits together satisfy Plan 09-03's scope (config + immediate build-hygiene byproducts), but the SHA-per-concern split keeps bisect granularity"
  - "KEEP `externalizeDepsPlugin()` despite v5 deprecation — the plugin still works + the warning is non-blocking + the alternative (`build.externalizeDeps` default) achieves the same outcome but deviates from RESEARCH.md's canonical config template. Migration to the default-enabled shape is a nice-to-have for Phase 12 or later; Phase 9 preserves RESEARCH.md shape verbatim to minimize surprise for readers consulting the research doc"
  - "Lint-scope-ignore pattern carryforward — `out/**` added to `eslint.config.js` ignores block follows the existing Phase 5/6 D-17/D-18 pattern that added `bot/**` + `dist/**`. Same lint hygiene philosophy: generated bundler output is not source code; excluding from lint prevents a ~50-error spike from bundled vendor code without changing actual source quality. Pattern now reads: `bot/** + dist/** + out/** + node_modules/** + build/** + .planning/** + .tools/** + .tmp-inspect/**`"

patterns-established:
  - "Smoke-test log excerpt archival → /tmp/electron-vite-dev-09-03-final.log (261 lines captured) — preserves the empirical evidence of the dev-mode cycle (Vite ready, 45 modules, HMR update /components/SideBar.vue, main rebuild + restart) for future plan references. Pattern: ephemeral /tmp/ log during smoke test, then archive with -final suffix for SUMMARY reference"
  - "Dev smoke test protocol — (1) rm -rf out/ (clean slate), (2) NODE_ENV=development npx electron-vite dev --watch --entry <entry> in background, (3) grep for 'watching for file changes' readiness signal, (4) curl http://localhost:5173/ for HTTP 200 + /main.js for module endpoint, (5) edit Vue SFC text node → grep log for 'hmr update /components/<File>.vue', (6) edit src/main/index.js → grep for 'rebuilt successfully' + 'restarting electron app', (7) revert both edits → verify git diff empty, (8) taskkill /F /IM electron.exe → verify zero lingering processes. All steps captured in /tmp/electron-vite-dev-09-03-final.log"
  - "Build-artifact ignore pattern — whenever a new bundler lands that produces a new output directory at project root (v1.4 had dist/, v2.0 Phase 9 adds out/), the pattern is: (1) add to .gitignore so git status doesn't spike, (2) add to eslint.config.js ignores so lint count doesn't regress from bundled-vendor-code false-positives, (3) document both in the SUMMARY's Rule 3 deviation section"

requirements-completed: [BUNDLER-01]

metrics:
  duration_minutes: 35
  tasks_completed: 5
  tasks_total: 5
  files_touched: 3
  completed_date: 2026-04-22
---

# Phase 9 Plan 03: electron-vite Config Completion + Dev Smoke Test Summary

**`electron.vite.config.mjs` fleshed from 5-line skeleton (Plan 09-01) to production-ready 94-line config with main + renderer sub-configs, externals (5 main / 3 renderer), @+src aliases (icons dropped per A6), @vitejs/plugin-vue wired, SCSS loadPaths + custom findFileUrl importer porting Phase 8 Plan 03 theme-bulma quirk, commonjsOptions.include for src/** CJS traversal, define blocks (__static + PRODUCT_NAME + Vue 3 feature flags); empirical `npx electron-vite dev --watch --entry out/main/index.js` smoke test PASSED — 45 modules transformed, Vite dev server HTTP 200 on :5173, Electron main+renderer+worker processes up, renderer HMR fires on Vue SFC edit (`hmr update /components/SideBar.vue`), main-process rebuild+restart fires on src/main/index.js edit (`rebuilt successfully` + `restarting electron app`); Rule 3 auto-fix commit adds `out/` to .gitignore + eslint.config.js ignores; D-09-10 commit 2 part B landed as `3bc0e45` (`refactor(build): flesh out electron.vite.config.mjs ...`) + follow-up `356cd93` (`chore(build): ignore electron-vite out/ build artifacts`); 256/256 tests + 734 lint problems unchanged from Plan 09-02 close; bot/** dirty count preserved at 21; build state: PARTIALLY WORKING (`npx electron-vite dev` works with CLI overrides; `npm run dev`/`npm run pack:*` still webpack-era — Plans 09-04 + 09-05 restore).**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-04-22T19:15:00Z (approx)
- **Completed:** 2026-04-22T19:50:00Z (approx)
- **Tasks:** 5/5
- **Files modified:** 3 (electron.vite.config.mjs, .gitignore, eslint.config.js)

## Accomplishments

- D-09-10 commit 2 part B landed on master (`refactor(build): flesh out electron.vite.config.mjs ...` — SHA `3bc0e45`) with exactly 1 file in the bisect-targeted config commit
- Rule 3 auto-fix follow-up commit (`chore(build): ignore electron-vite out/ build artifacts` — SHA `356cd93`) adds out/ + /out to .gitignore and `out/**` to eslint.config.js ignores
- Electron main + renderer sub-configs populated end-to-end: 5 main externals / 3 renderer externals / @+src aliases (no icons) / SCSS loadPaths + custom importer / define blocks / @vitejs/plugin-vue wired
- Empirical dev-mode smoke test: Vite v7.3.2 builds SSR environment for development → 45 modules transformed → main bundle 104.57 kB built in 354ms → main process bundle succeeds → dev server up on :5173 → Electron spawns (7 processes: main + renderer + GPU + worker + 3 helpers)
- Renderer HMR verified: 2 edit/revert cycles on `src/renderer/components/SideBar.vue` produced 2 `hmr update /components/SideBar.vue` log lines within <2s each
- Main-process rebuild + restart verified: 2 edit/revert cycles on `src/main/index.js` produced `build started → electron main process rebuilt successfully → restarting electron app` cycles
- SCSS compilation verified: Oruga theme-bulma + Bulma 1.0 resolved via custom `findFileUrl` importer — no `Missing specifier` errors in log after importer added (only expected `DEPRECATION WARNING [if-function]` / `[color-functions]` warnings from Bulma's older syntax — pre-existing from Phase 8 Plan 04)
- Pre-existing Electron 41 `vue-devtools` module-not-found error caught + handled by `try/catch` in `src/main/index.js:113-118` — logged but non-fatal (Phase 13 scope, same as webpack era)
- `dev` URL loading via `process.env.ELECTRON_RENDERER_URL` (Plan 09-02) confirmed working — main window + worker window both loaded from Vite dev server origin
- bot/** dirty count preserved at 21 throughout
- `src/renderer/main.js` pre-existing dirty state (kebab-case → PascalCase component-name rename) carried forward unstaged — same posture as Plan 09-02

## Empirical Assumption Outcomes

| Assumption | Hypothesis | Outcome | Evidence |
| ---------- | ---------- | ------- | -------- |
| Task 1 A6 re-verification | `icons/` alias is dead; `_icons/` directory absent | **CONFIRMED (second verification)** | `Grep pattern="['\"]icons/" path=src/` → 0 matches (unchanged from Plan 09-01 A6). `test -d _icons` → ABSENT. Plan 09-03 omits `icons` alias from both main + renderer resolve.alias blocks. |
| Task 1 `@` + `src` alias usage | At-least-one import in src/renderer/**/*.vue uses `@/` or `src/` alias | **UNUSED — both are load-bearing for nothing** | `Grep pattern="from ['\"](@\|src)/" path=src` → 0 matches across all `.js`/`.vue`/`.scss` files. Unlike Plan 09-01 A6's `icons` alias, the plan spec explicitly kept `@` + `src` in the canonical config (RESEARCH.md §Config File Pattern). Keeping them is harmless + provides ergonomic hooks for future refactors that might want path-stable imports. NOTE: This is NOT a deviation — plan spec Task 2 directed to include both; empirical finding flags latent dead weight for a future minor cleanup plan. |
| Plan 09-03 Task 3 dev smoke test | `npx electron-vite dev` launches clean with renderer HMR + main restart | **PASS (with CLI override + commonjsOptions fix)** | See Dev-Mode Smoke Test Results section below. Required 4 config iterations to reach green: (1) base config failed on package.json `main` path, resolved via `--entry out/main/index.js` CLI override; (2) main bundle only 29.51 kB with 1 module transformed, resolved via `commonjsOptions.include: [/node_modules/, /src\\//]`; (3) SCSS failed on theme-bulma `dist/scss/theme-build` exports-map strip, resolved via custom `findFileUrl` importer; (4) main-process restart needed `--watch` flag (renderer HMR works default). Final green on 4th iteration. |

## Dev-Mode Smoke Test Results (empirical log excerpts from /tmp/electron-vite-dev-09-03-final.log)

**(a) Vite dev server up + main process built:**

```
vite v7.3.2 building ssr environment for development...
watching for file changes...
build started...
✓ 45 modules transformed.
rendering chunks...
out/main/index.js  104.57 kB
built in 354ms.
electron main process built successfully

-----

dev server running for the electron renderer process at:

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose

starting electron app...
```

**(b) HTTP endpoint probes (via curl from test shell):**

```
$ curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:5173/
HTTP 200
$ curl -s -o /dev/null -w "main.js HTTP %{http_code}\n" http://localhost:5173/main.js
main.js HTTP 200
$ curl -s -o /dev/null -w "App.vue HTTP %{http_code}\n" http://localhost:5173/App.vue
App.vue HTTP 200
```

Index.html served with Vite's `<script type="module" src="/@vite/client"></script>` auto-injected for HMR client wiring.

**(c) Renderer HMR — edit src/renderer/components/SideBar.vue:**

```
19:30:47 [vite] (client) hmr update /components/SideBar.vue
```

Edit applied + reverted; 2 HMR update lines produced, each within ~2s of filesystem mtime bump. Revert verified via `git diff src/renderer/components/SideBar.vue` → empty.

**(d) Main-process rebuild + restart — edit src/main/index.js:**

```
build started...
electron main process rebuilt successfully
restarting electron app...
build started...
electron main process rebuilt successfully
restarting electron app...
```

Edit applied + reverted; 2 rebuild+restart cycles, each ~5s end-to-end. Revert verified via `git diff src/main/index.js` → empty.

**(e) Clean shutdown:**

```
$ taskkill //F //IM electron.exe
SUCCESS: The process "electron.exe" with PID <pid> has been terminated.
... (5 PIDs total — main + renderer + GPU + worker + 1 helper)
$ sleep 3 && tasklist | grep -iE "electron" | wc -l
0
```

Zero lingering electron.exe after SIGKILL; no orphan Vite Node processes attributable to the dev session.

**Dev-mode worker window `#/worker` hash route:** observed working via separate worker electron process visible in tasklist during dev session (lifetime matched main electron process).

## Config Mapping Table (webpack → electron-vite)

| Webpack surface | Location (webpack) | electron-vite equivalent | Notes |
| --------------- | ------------------ | ------------------------ | ----- |
| Main externals (5) | `_scripts/webpack.main.config.js:16-22` `externals: { electron, @electron/remote, electron-updater, irsdk-node, sharp }` | `electron.vite.config.mjs:13-19` `main.build.rollupOptions.external` array | Preserved verbatim (5 entries). `externalizeDepsPlugin()` auto-externalizes dependencies; explicit list is belt-and-suspenders per P1 |
| Renderer externals (3) | `webpack.renderer.config.js:24-28` `externals: { electron, @electron/remote, sharp }` | `renderer.build.rollupOptions.external` | Preserved verbatim (3 entries — subset of main) |
| `@` alias | Both configs — `alias: { '@': src/ }` | `main.resolve.alias` + `renderer.resolve.alias` — `{'@': resolve(__dirname, 'src')}` | Preserved. Empirical grep: unused; kept per plan spec + RESEARCH canonical |
| `src` alias | Both configs — `alias: { src: src/ }` | `main.resolve.alias` + `renderer.resolve.alias` — `{src: resolve(__dirname, 'src')}` | Preserved. Empirical grep: unused; kept per plan spec + RESEARCH canonical |
| `icons` alias | `webpack.renderer.config.js:113` `alias: { icons: '_icons/' }` | **DROPPED** | A6 empirical outcome — `_icons/` absent + zero imports. Plan 09-01 flagged; Plan 09-03 executes the drop |
| SCSS loadPaths | `webpack.renderer.config.js:53-56` sass-loader `sassOptions.loadPaths: [node_modules]` | `renderer.css.preprocessorOptions.scss.loadPaths: [resolve('node_modules')]` + custom `findFileUrl` importer | Ported. Custom importer added because Vite's sass-embedded enforces package-exports-map before loadPaths (webpack's sass-loader did not); scar-tissue-documented in config comment |
| Vue SFC loader | `webpack.renderer.config.js:41-43,100` `vue-loader` + `VueLoaderPlugin` | `renderer.plugins: [vue()]` from `@vitejs/plugin-vue` | Replaced 1:1 |
| DefinePlugin `__static` (main, dev) | `webpack.main.config.js:62-67` | `main.define.__static: JSON.stringify(resolve('static').replace(/\\/g, '\\\\'))` | Preserved Windows path escaping for bug-parity |
| DefinePlugin `__static` (renderer) | `webpack.renderer.config.js:124` | `renderer.define.__static: JSON.stringify('/static')` | Relative path at renderer-runtime; webpack asymmetry preserved |
| DefinePlugin `process.env.PRODUCT_NAME` | Both configs — `JSON.stringify(productName)` | Both define blocks — `JSON.stringify('iRacing Screenshot Tool')` | Hardcoded productName from package.json (which RESEARCH.md canonical did); future refactor could read from package.json dynamically |
| HtmlWebpackPlugin (renderer) | `webpack.renderer.config.js:93-99` | **DROPPED** (replaced by Vite's native `index.html` consumption — Plan 09-02's src/renderer/index.html) | — |
| VueLoaderPlugin | `webpack.renderer.config.js:100` | **DROPPED** (replaced by `@vitejs/plugin-vue`) | — |
| MiniCssExtractPlugin | `webpack.renderer.config.js:104-107` | **DROPPED** (replaced by Vite's native CSS handling in production; dev mode inlines via style tag) | — |
| CopyWebpackPlugin (static/) | `webpack.renderer.config.js:131-141` + `webpack.main.config.js:70-84` (prod-only) | **DROPPED** (replaced by D-09-06 strategy: keep `static/` at project root; `__static` define points at it; electron-builder's `extraResources` copies `static/icon.png` at packaging) | — |
| babel-loader (.js/.ts) | Both configs — `test: /\\.(j\|t)s$/, loader: 'babel-loader'` | **DROPPED** (replaced by Vite's built-in esbuild transform) | Vite's esbuild is faster + pre-configured |
| node-loader (.node) | Both configs — `test: /\\.node$/, use: 'node-loader'` | **DROPPED** (native modules externalized; not bundled) | Sharp/irsdk-node loaded at runtime via Node's native require |
| url-loader (images, fonts) | `webpack.renderer.config.js:65-84` | **DROPPED** (replaced by Vite's native asset handling: <4kb inline, >4kb emit) | Vite inlines small assets as data-URIs automatically |
| webpack.HotModuleReplacementPlugin | `webpack.renderer.config.js:122` | **DROPPED** (replaced by Vite's native HMR — no plugin needed) | — |

## Added Surfaces (beyond RESEARCH.md §Config File Pattern canonical)

| Surface | Reason | Config Location |
| ------- | ------ | --------------- |
| `__VUE_OPTIONS_API__: 'true'` | P2: silence Vue 3 feature-flag warning (Phase 8 uses Options API per D-07) | `renderer.define` |
| `__VUE_PROD_DEVTOOLS__: 'false'` | P2: disable Vue devtools in prod bundle (also prevents the feature-flag warning) | `renderer.define` |
| `renderer.root: resolve('src/renderer')` | Pins explicit entry location for Vite's index.html discovery; matches Plan 09-02's HTML move | Top-level in renderer block |
| `main.build.commonjsOptions.include: [/node_modules/, /src\\//]` + `transformMixedEsModules: true` | **Empirical discovery during smoke test** — without this, Rollup's CJS plugin only processes the entry file and leaves `require('./sibling')` calls raw. Critical for bundling src/main/*.js sibling modules (iracing-sdk, window-utils, main-utils) + src/utilities/*.js imports | `main.build.commonjsOptions` |
| Custom SCSS `findFileUrl` importer for `@oruga-ui/theme-bulma/` | **Empirical discovery during smoke test** — Vite's sass-embedded integration enforces package-exports-map first; the map key `./dist/scss/*.scss` requires trailing extension that sass-embedded strips during resolution. Custom importer bypasses exports check entirely | `renderer.css.preprocessorOptions.scss.importers` |
| `node:` protocol imports (`node:path` + `node:url`) | ESM + Node 20+ convention — makes built-in imports explicit | Top of config |
| `dirname(fileURLToPath(import.meta.url))` `__dirname` shim | `.mjs` ESM doesn't expose `__dirname`; shim required for `resolve(__dirname, ...)` calls | Line 6 of config |

## Dropped Surfaces

See Config Mapping Table "DROPPED" rows: `icons` alias, HtmlWebpackPlugin, VueLoaderPlugin, MiniCssExtractPlugin, CopyWebpackPlugin, babel-loader, node-loader, url-loader, HotModuleReplacementPlugin — all 9 retired naturally as Vite + electron-vite subsume their functions.

## Build State at Plan Close

**PARTIALLY WORKING** — consistent with D-09-10 three-commit bisect chain midpoint:

| Script | State at Plan 09-03 Close | Restored By |
| ------ | ------------------------- | ----------- |
| `npx electron-vite dev --watch --entry out/main/index.js` | **GREEN (Plan 09-03 smoke-test gate)** | - |
| `npm run dev` | BROKEN (references `_scripts/dev-runner.js` which requires removed `tree-kill`/`chalk`; also references webpack) | Plan 09-04 (script rewire) |
| `npm run pack:main` | BROKEN (references `webpack --config _scripts/webpack.main.config.js`; webpack removed) | Plan 09-04 |
| `npm run pack:renderer` | BROKEN (references webpack + deleted `src/index.ejs`) | Plan 09-04 |
| `npm run build` | BROKEN (delegates to pack + build:dir; pack broken upstream) | Plan 09-05 (electron-builder integration) |
| `npm run build:dev:dir` | BROKEN (references `_scripts/build-dev.js`; webpack-bound) | Plan 09-04 |
| `npm test` | **GREEN (256/256)** — Jest unaffected by bundler migration | - |
| `npm run lint` | **GREEN (≤1881 band: 734 problems)** — identical to Plan 09-02 close after Rule 3 out/** ignore fix | - |

Plan 09-04 rewires `package.json` scripts + retires `_scripts/webpack.*.config.js` + `_scripts/dev-runner.js` so `npm run dev` works. Plan 09-05 flips `main` field so `--entry` override no longer needed.

## Commits

**Commit 1 (content — D-09-10 commit 2 part B):**
- **SHA:** `3bc0e45`
- **Message:** `refactor(build): flesh out electron.vite.config.mjs (externals, aliases, SCSS, define, plugin-vue)`
- **Files (1):** M `electron.vite.config.mjs` (91 insertions, 3 deletions — net +88 lines taking 5 → 94)
- **Body:** 22-line commit message documenting the config shape + empirical smoke-test outcomes

**Commit 2 (Rule 3 build-hygiene follow-up):**
- **SHA:** `356cd93`
- **Message:** `chore(build): ignore electron-vite out/ build artifacts in git + lint`
- **Files (2):** M `.gitignore` (+2 lines: `out` + `/out`), M `eslint.config.js` (+1 line: `'out/**',` in ignores block)
- **Body:** Documents the Rule 3 auto-fix rationale — build artifact pollution of both git status and lint count

Both commits: No Co-Authored-By footer; no `--no-verify`; explicit `git add <path>` (not `git add -A`).

## Test + Lint Gates

| Gate | Target | Result | Evidence |
| ---- | ------ | ------ | -------- |
| Config file exists + parses | `node --input-type=module import(...)` returns object | **PASS** | `console.log('OK')` printed |
| File line count | 40-100 | **PASS** (94 lines) | `wc -l electron.vite.config.mjs` → 94 |
| All verify greps | externalizeDepsPlugin, @vitejs/plugin-vue, loadPaths, __VUE_OPTIONS_API__, 'irsdk-node', 'sharp', main:, renderer: present; 'icons' alias absent | **PASS (9/9 greps)** | See Task 2 verify run output |
| Dev smoke test | VITE ready, HMR update fires, main rebuild+restart fires, clean shutdown | **PASS** | Log excerpts above from /tmp/electron-vite-dev-09-03-final.log |
| `npm test` | 256/256 green | **PASS** | `Test Suites: 5 passed, 5 total / Tests: 256 passed, 256 total` |
| `npm run lint` | ≤1881 problems | **PASS (734 problems)** | Identical to Plan 09-02 close (0 delta after out/** ignore added; pre-ignore spike was 784 due to out/main/index.js scan — now excluded) |
| bot/** dirty preserved | 21 entries | **PASS** | `git status --short | grep -cE '^[ ]?M bot|^\\?\\? bot'` → 21 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Build-chain blocker] Smoke-test failed with `No electron app entry file found: .../dist/main.js`**

- **Found during:** Task 3 (first dev smoke-test attempt)
- **Issue:** package.json `main` field still points at webpack-era `./dist/main.js` (Plan 09-05 flips to `./out/main/index.js`). electron-vite's CLI reads `main` to locate the bundled entry → fails with "No electron app entry file found" before Electron spawns.
- **Fix:** Use `npx electron-vite dev --entry out/main/index.js` CLI override (added to `--watch` flag at iteration 4 for main restart). This keeps Plan 09-03's 1-file config-commit scope intact (package.json untouched — Plan 09-05's scope). Plan 09-04's `dev` script rewrite can encapsulate the flag; Plan 09-05's `main` flip will retire the need for `--entry`.
- **Files modified:** None (CLI flag only)
- **Verification:** Iteration 2 reached "starting electron app..." (confirming entry resolution)
- **Commit:** n/a (CLI-only workaround)

**2. [Rule 1 — Bundler correctness bug] Main process bundle only 29.51 kB with 1 module transformed — relative requires passing through as raw `require('./iracing-sdk')`**

- **Found during:** Task 3 (second dev smoke-test attempt)
- **Issue:** `externalizeDepsPlugin()` + default `commonjsOptions` combined to treat src/main/index.js as already-CJS without traversing `require('./sibling')` calls. Result: bundle = 1:1 copy of src/main/index.js (~28 KB source → 29.51 kB output after CJS transform), all sibling modules (iracing-sdk, window-utils, main-utils, utilities/logger, utilities/desktop-capture) left as raw relative requires → Electron load fails with `Cannot find module './iracing-sdk'` (out/main/ has no sibling files because they weren't inlined).
- **Fix:** Add `main.build.commonjsOptions.include: [/node_modules/, /src\\//]` + `transformMixedEsModules: true` to opt the src/ tree into Rollup's @rollup/plugin-commonjs processing. Default include matches node_modules only; widening to src/ teaches the plugin to resolve + inline relative requires.
- **Files modified:** `electron.vite.config.mjs` (added commonjsOptions block under main.build)
- **Verification:** Iteration 3 produced 104.57 kB bundle with 45 modules transformed; all siblings inlined (verified via `grep -c 'require("./[^"]+")' out/main/index.js` = 0 for src-relative paths; remaining externals are `../../package.json` and `electron`/`@electron/remote`/`etc` package requires which are correctly external)
- **Commit:** `3bc0e45`

**3. [Rule 1 — Sass/exports resolution bug] SCSS compile failed with `Missing "./dist/scss/theme-build" specifier in "@oruga-ui/theme-bulma" package`**

- **Found during:** Task 3 (third dev smoke-test attempt)
- **Issue:** Vite's sass-embedded integration consults @oruga-ui/theme-bulma's `exports` map during @use resolution. The exports key is `"./dist/scss/*.scss": "./dist/scss/*.scss"` — the `.scss` suffix is part of the key pattern. When sass strips the extension during `@use '@oruga-ui/theme-bulma/dist/scss/theme-build'`, the exports-map lookup fails (pattern `./dist/scss/theme-build` has no match against `./dist/scss/*.scss`). Phase 8 Plan 03 webpack-era used sass-loader + `sassOptions.loadPaths: [node_modules]` which bypassed exports entirely. Vite's integration does not bypass by default.
- **Fix:** Add custom `findFileUrl` importer to `renderer.css.preprocessorOptions.scss.importers` that intercepts `@oruga-ui/theme-bulma/<path>` URLs and resolves them directly to `node_modules/@oruga-ui/theme-bulma/<path>` filesystem paths, bypassing the package-exports check entirely. Inline comment in config documents the scar tissue.
- **Files modified:** `electron.vite.config.mjs` (added `importers: [{ findFileUrl(url) {...} }]` block)
- **Verification:** Iteration 4 produced successful SCSS compile — only expected Bulma `DEPRECATION WARNING [if-function]` / `[color-functions]` / `[global-builtin]` warnings in log (pre-existing from Phase 8 Plan 04; not new; not blocking)
- **Commit:** `3bc0e45`

**4. [Rule 3 — Lint scope leak] Build artifact `out/main/index.js` scanned by eslint → lint count 734 → 784 (spike of 50)**

- **Found during:** Task 4 post-smoke-test lint gate
- **Issue:** Plan 09-01 + 09-02 preserved 734 as the lint baseline. Post-smoke-test `npm run lint` produced 784 problems. Root cause: `eslint --fix ./` scans the full working tree — `out/main/index.js` (the bundled CJS vendor code, 2000+ lines of Rollup output) gets linted and produces ~50 no-undef / prefer-const / etc errors from bundled vendor code patterns.
- **Fix:** Add `'out/**'` to `eslint.config.js` flat-config ignores block (following existing `bot/**` + `dist/**` + `.planning/**` + `.tools/**` + `.tmp-inspect/**` pattern from Phase 5 D-17/D-18 + Phase 6 D-18). Also add `out` + `/out` to `.gitignore` to prevent build output from polluting working-tree state.
- **Files modified:** `.gitignore` (+2 lines), `eslint.config.js` (+1 line in ignores array)
- **Verification:** Post-fix `npm run lint 2>&1 | tail -3` → `✖ 734 problems (731 errors, 3 warnings)` — identical to Plan 09-02 close
- **Commit:** `356cd93`

**5. [Rule N/A — Pre-existing carry-over] `src/renderer/main.js` dirty state carried forward from Plan 09-02**

- **Found during:** Plan 09-03 Task 4 scope check (`git status --short`)
- **State:** Same pre-existing unstaged modification as Plan 09-02's close — `app.component('font-awesome-icon', ...)` → `app.component('FontAwesomeIcon', ...)` + `app.component('vue3-markdown-it', ...)` → `app.component('Vue3MarkdownIt', ...)` renames. Diff = 2 lines.
- **Decision:** Left untouched per Plan 09-02's established discipline (D-09-10 bisect-chain scope hygiene). Plan 09-03's scope is electron.vite.config.mjs (+ Rule 3 build-hygiene byproducts); touching src/renderer/main.js would balloon the commit beyond scope.
- **Impact:** Zero effect on Plan 09-03 deliverables. Same carry-forward recommendation for Plan 09-04: adopt (if Plan 09-04's script rewrites interact with renderer registration), revert (if stale), or continue carrying. The PascalCase form is actually the Vue 3 idiomatic one (Plan 09-02's Deviations section noted this is "possibly-intentional pending work").

### Scope-Expansion Considered + Rejected

- **Could have migrated `externalizeDepsPlugin` → v5 `build.externalizeDeps` default** — rejected. v5 warning is non-blocking, functional outcome identical, and RESEARCH.md §Config File Pattern canonical uses `externalizeDepsPlugin`. Preserve canonical shape for reader-trust; defer to Phase 12 or later when `.ts` migration naturally invites config-shape revisit.
- **Could have dropped `@` + `src` aliases (empirical zero-usage grep)** — rejected. Plan spec Task 2 directed to preserve them; drop would be scope creep. Aliases are harmless + provide ergonomic hooks for future code. Lint/test gates unaffected.
- **Could have fixed pre-existing Electron 41 `vue-devtools` require-not-found** — rejected. Out of Phase 9 scope (Phase 13 main-process cleanup per CONTEXT `src/main/index.js:116` pre-existing note). The try/catch in `installDevTools` (line 115-117) already handles it gracefully; error logs but non-fatal.
- **Could have migrated Bulma `darken()` / `if()` deprecations** — rejected. Phase 8 Plan 04 already triaged these as Bulma-1.0-upstream-syntax warnings, not regressions. Same posture under Vite — warnings emit but don't block compile.
- **Could have package.json `main` field flip (`./dist/main.js` → `./out/main/index.js`)** — rejected. Plan 09-05 scope (D-09-08 commit 3). Using `--entry` CLI override preserves Plan 09-03's 1-file commit scope for the bisect-targeted config commit.
- **Could have package.json scripts rewire (`dev`, `pack:*`, `build:dev:dir`)** — rejected. Plan 09-04 scope. Smoke test runs via CLI invocation.

### Summary

**Total deviations:** 4 auto-fixed (Rule 3 + Rule 1 + Rule 1 + Rule 3) + 1 pre-existing carry-over
**Impact on plan:** All auto-fixes land in the two commits under this plan's responsibility. Scope discipline held (config commit = 1 file; build-hygiene commit = 2 files narrowly related to the newly-landed bundler output). Bisect-targeted config commit preserved for D-09-10 commit 2 part B semantics.

## Threat Model Dispositions

| Threat ID | Category | Component | Disposition at Plan Close | Evidence |
| --------- | -------- | --------- | ------------------------- | -------- |
| T-09-03-01 | Tampering | `electron.vite.config.mjs` — new build-tool entry point | **Mitigated** | File committed + auditable (SHA `3bc0e45`); Node ESM `import()` test passes (no parse error); 4-iteration smoke test validates semantic correctness end-to-end; custom `findFileUrl` importer surface reviewed (bounded to @oruga-ui/theme-bulma URL prefix, filesystem resolve only — no arbitrary code execution surface) |
| T-09-03-02 | Denial of Service | Missing external → runtime `Cannot find module` | **Mitigated** | Task 3 smoke test exercised full boot path — caught two DoS-class issues: (a) `./iracing-sdk` missing (Rule 1 auto-fix #2 — commonjsOptions.include); (b) theme-build exports resolution (Rule 1 auto-fix #3 — custom importer). Both resolved before commit. A5 sharp-in-dependencies confirmed via Plan 09-01 — `externalizeDepsPlugin()` picks it up automatically + explicit rollupOptions.external is belt-and-suspenders |
| T-09-03-03 | Information Disclosure | Vite dev server on localhost:5173 | **Accepted** | No regression vs webpack-dev-server:9080 (pre-Vite era); Vite binds to localhost by default (confirmed — curl to 127.0.0.1:5173 works, no Network interface exposure until `--host` flag). Same attack surface class |
| T-09-03-04 | Elevation of Privilege | `@vitejs/plugin-vue` + electron-vite SFC compiler | **Mitigated** | `@vitejs/plugin-vue@6.0.6` uses same `@vue/compiler-sfc` (via `vue@3.5.33` transitive) as Phase 8's `vue-loader@17` used. No new code-execution vector introduced by plugin swap |

**Block threshold held (HIGH):** No HIGH-severity regression surfaced. All 4 smoke-test failures were build-correctness class (DoS-adjacent at most) and resolved via config adjustments that are now committed + documented. D-09-01 escape hatch (`vite-plugin-electron`) NOT needed.

## Self-Check

Verified post-commit:

- [x] `electron.vite.config.mjs` exists, 94 lines, parses clean under Node ESM (`node --input-type=module ...` → `OK`)
- [x] Config contains `externalizeDepsPlugin` + `@vitejs/plugin-vue` + `renderer:` + `main:` + `'irsdk-node'` + `'sharp'` + `loadPaths` + `__VUE_OPTIONS_API__` (9/9 greps PASS)
- [x] Config does NOT contain `'icons':` alias (A6 honored)
- [x] Dev smoke test PASSED — 4 outcomes captured in `/tmp/electron-vite-dev-09-03-final.log`: Vite ready on :5173; Electron process spawn; renderer HMR fires; main rebuild+restart fires; clean shutdown
- [x] HMR-TEST edits fully reverted (`git diff src/renderer/components/SideBar.vue src/main/index.js` → empty)
- [x] Commit `3bc0e45` exists on master (`git log --oneline -3` confirms)
- [x] Commit `3bc0e45` subject = `refactor(build): flesh out electron.vite.config.mjs (externals, aliases, SCSS, define, plugin-vue)`
- [x] Commit `3bc0e45` diff = exactly 1 file (`git show --stat` confirms)
- [x] Commit `3bc0e45` has NO Co-Authored-By footer (`git log -1 --format=%B | grep -ci 'Co-Authored'` → 0)
- [x] Commit `356cd93` (Rule 3 follow-up) diff = exactly 2 files (`.gitignore` + `eslint.config.js`)
- [x] Commit `356cd93` has NO Co-Authored-By footer
- [x] `npm test` → 256/256 green
- [x] `npm run lint` → 734 problems (identical to Plan 09-02 close; ≤1881 band)
- [x] bot/** dirty count = 21 (preserved from Plan 09-02 close)
- [x] `out/` directory ignored by git (`git status --short | grep -E '^\\?\\? out'` → empty)
- [x] `out/main/index.js` ignored by lint (not scanned)

**Self-Check: PASSED**

## Notes for Plan 09-04

Plan 09-04 is the **package.json scripts rewire + webpack/dev-runner retirement** plan. Scope:

1. **Retire webpack-era scripts:**
   - `dev`: `run-s rebuild:electron dev-runner` → `run-s rebuild:electron electron-vite-dev`
   - `dev-runner`: DELETE
   - `debug-runner`: DELETE (or reimplement via `electron-vite dev --inspect`)
   - `pack`: `run-p pack:main pack:renderer` → `electron-vite build`
   - `pack:main`: DELETE
   - `pack:renderer`: DELETE
   - `build:dev:dir`: `node _scripts/build-dev.js --dir` → `electron-builder --dir` (verify `_scripts/build-dev.js` only orchestrated webpack → delete; else retain + strip webpack bits)

2. **Add new script:**
   - `electron-vite-dev`: `electron-vite dev --watch` (--watch encapsulated; users don't pass it manually)

3. **Plan 09-04 considerations:**
   - `--entry out/main/index.js` CLI override used in Plan 09-03's smoke test is NOT needed after Plan 09-05 flips `main` field. Plan 09-04's `electron-vite-dev` script does NOT need `--entry`; Plan 09-05 will update `main` to `./out/main/index.js` which electron-vite's default lookup resolves automatically.
   - Actually — Plan 09-04 lands BEFORE Plan 09-05, so the dev script WILL need the `--entry` flag UNLESS Plan 09-04 also updates `main` field. Planner decides whether to fold the `main` flip into 09-04 (pragmatic — keeps `npm run dev` working after 09-04) or keep 09-04 config-only + 09-05 output-layout-only (strict bisect-chain).
   - **Recommendation:** Fold the `main: './out/main/index.js'` field flip into Plan 09-04 so `npm run dev` works end-to-end after 09-04 closes. Plan 09-05 then owns the `build.files` change + any electron-builder-specific bits. This is a minor deviation from D-09-08's strict three-commit chain but keeps user-visible `npm run dev` working sooner.

4. **Retire `_scripts/` files:**
   - DELETE `_scripts/webpack.main.config.js`
   - DELETE `_scripts/webpack.renderer.config.js`
   - DELETE `_scripts/dev-runner.js`
   - INSPECT `_scripts/build-dev.js` — if it only wraps `webpack + electron-builder`, delete; if it has release-version logic worth keeping, strip webpack bits
   - INSPECT `_scripts/release.js` — should stay (calls `npm run build:installer` which will be valid post-rewire)

5. **Carried forward from Plan 09-03:**
   - `src/renderer/main.js` pre-existing dirty state — same decision Plan 09-04 planner faces (adopt/revert/carry). PascalCase rename is Vue-3-idiomatic but not yet on master.
   - bot/** 21-file dirty state — unchanged throughout; Plan 09-04 should preserve.
   - 734-lint / 256-test baseline — maintain through Plan 09-04.

6. **HMR flag awareness:** electron-vite's `--watch` flag is what enables main-process rebuild-on-change. Without it, only renderer HMR works. Plan 09-04's dev script should bake `--watch` in so users get the expected behavior.

## Next Phase Readiness

- **Ready for Plan 09-04:** Config is proven end-to-end via empirical smoke test. Config-shape regressions would surface in Plan 09-04's package.json-scripts-rewire smoke test immediately.
- **Build PARTIALLY WORKING:** `npx electron-vite dev --watch --entry out/main/index.js` launches full Electron app in dev mode with renderer HMR + main-process restart. `npm run dev` still webpack-era — Plan 09-04 rewires.
- **Jest still green (256/256):** Phase 10 Vitest migration untouched. Phase 9 does not disturb test infra.
- **Lint still 734 (≤1881):** After Rule 3 out/** ignore fix landed in commit `356cd93`. Phase 9 Plan 03 ran zero ESLint plugin/config changes beyond the narrow ignore add; lint-delta is zero vs Plan 09-02 close.
- **D-09-10 three-commit bisect chain status:** commits 1 (`13d84e1` deps), 2-A (`d237e4f` HTML+main-URL), 2-B (`3bc0e45` config). Commits 3 (scripts+webpack retirement — Plan 09-04) and 4 (electron-builder integration — Plan 09-05) pending.

---
*Phase: 09-webpack-to-vite*
*Plan: 03*
*Commits: 3bc0e45 (content) + 356cd93 (Rule 3 build-hygiene follow-up) + <pending docs(09-03)> (this SUMMARY)*
*Completed: 2026-04-22*
