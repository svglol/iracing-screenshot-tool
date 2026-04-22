# Phase 9: webpack → Vite bundler — Context

**Gathered:** 2026-04-22
**Status:** Ready for planning
**Mode:** Auto-generated (`/gsd-discuss-phase 9 --auto`) — Claude's recommended defaults selected for each gray area; user can override at plan-phase time.

<domain>
## Phase Boundary

Replace the webpack build chain with Vite for both Electron main and renderer processes. `_scripts/webpack.*.config.js` + `_scripts/dev-runner.js` retired. `electron-builder` continues consuming the bundler output (path changes from `dist/` → `out/`). Dev-mode HMR switches from custom webpack-dev-server + tree-kill restart loop to Vite's native HMR for renderer + electron process restart-on-change for main.

**In scope:** renderer + main process bundling, dev runner, electron-builder input folder, webpack-era devDependencies removal, `src/index.ejs` → plain `src/index.html` (Vite doesn't use EJS templating).

**Out of scope:** `bot/` workspace (separate tsc build chain, not webpack-driven); TypeScript migration (Phase 12); Jest → Vitest (Phase 10 — but Vitest will be wired in via the same `vite.config.mjs`).

</domain>

<carryforward>
## Prior Decisions Carried Forward

From v1.4 + Phase 8:
- **D-04 two/three-commit bisect shape** — each phase lands as `chore(deps)` + content commit(s)
- **Minimum-scope derogation** — acceptable to tighten dep-chain when a latent conflict surfaces mid-phase
- **No `Co-Authored-By:` footer, no `--no-verify`, explicit `git add <path>`**
- **`--legacy-peer-deps` RETIRED** — `npm install` clean with no flag
- **LINT-03 gate:** `npm install` must exit 0 with zero ERESOLVE
- **Lint band ≤1881 problems** — attribute deltas to rule-set changes, not infrastructure changes
- **bot/** untouched throughout** — pre-existing dirty state in `bot/src/**` is out of scope; never stage or commit those files
- **D-08-18 bisect discipline:** dep bumps commit separately from code changes so `git bisect` between commits isolates dep regressions from content changes

From codebase scout:
- `dev-runner.js` is a custom Node orchestrator running `webpack` + `webpack-dev-server` + `tree-kill` + `electron` spawn — significant custom surface to replace
- `src/index.ejs` uses HtmlWebpackPlugin's `<% %>` templating for an electron-specific quirk: injecting `node_modules` into `module.globalPaths` at dev runtime. Vite has no EJS equivalent — needs replacement
- `__static` DefinePlugin var used in `src/main/index.js:146,159` and `src/index.ejs:24` (window.__static at prod-runtime)
- 3 resolve aliases: `@` / `src` → `src/`, `icons` → `_icons/`
- `electron-builder` `build.files: ['dist/**/*', ...]` assumes webpack output layout
- 14 webpack-era devDependencies in package.json (webpack, webpack-cli, webpack-dev-server, *-loader family, html-webpack-plugin, copy-webpack-plugin, mini-css-extract-plugin, vue-style-loader, vue-loader)
- Post-Phase 8 fix landed `sassOptions.loadPaths: [node_modules]` in `webpack.renderer.config.js:54` — must port to Vite's SCSS options

</carryforward>

<decisions>
## Implementation Decisions

### D-09-01 — Vite integration package: `electron-vite` (alex8088/electron-vite)
**Rationale:** Opinionated wrapper that handles main + renderer + (optional) preload via a single `electron.vite.config.mjs` with separate `main`/`renderer`/`preload` entries. Actively maintained (electron-vite.org), TypeScript-friendly for Phase 12, has built-in HMR for renderer + auto-restart for main, ships with `electron-vite dev` / `electron-vite build` / `electron-vite preview` scripts so `_scripts/dev-runner.js` can be deleted outright. The main alternative (`vite-plugin-electron` + hand-rolled dev runner) would require re-implementing most of `dev-runner.js` — electron-vite subsumes it.
**Alternatives considered:** `vite-plugin-electron` (more flexible but re-builds the orchestration we're trying to delete); `vite` + custom orchestrator (same).
**Not locked:** If `electron-vite` has an electron-41 compat issue we can't work around, fall back to `vite-plugin-electron` — planner notes the escape hatch.

### D-09-02 — Config language: `.mjs` (defer TypeScript to Phase 12)
**Rationale:** Writing `electron.vite.config.ts` now creates a bootstrap cycle — Vite-loaded TS configs need tsconfig to resolve, but tsconfig's `include` is `src/utilities` only today (Phase 12 expands it). ESM `.mjs` avoids the cycle and matches `package.json`'s current CommonJS-by-default stance (`"type"` field absent). Phase 12 converts to `.ts` when the full `src/` tree adopts TS.
**Alternatives considered:** `.ts` (would work with vite-node loader but adds a Phase 9 dependency on tsconfig shape changes that belong to Phase 12).

### D-09-03 — HMR scope: renderer HMR + main-process restart on change
**Rationale:** electron-vite's default. Renderer HMR is the high-value path (Vue SFC edits reflect in <100ms). Main-process HMR is fragile (IPC listeners leak, native modules can't hot-swap, `electron-vite` handles this via full restart). Current dev-runner does the same thing manually (`killElectron()` + `restartElectron()` on main compile done) — no regression.

### D-09-04 — Dev server: electron-vite default (5173 via Vite internal)
**Rationale:** Current webpack-dev-server runs on 9080. electron-vite handles the renderer URL internally (`process.env['ELECTRON_RENDERER_URL']`) so we don't hardcode ports anywhere in main-process code. Port 5173 is Vite's default — fine to accept. If a collision surfaces locally, override via `vite.server.port` in renderer config.
**Tactical change:** `src/main/index.js` must read `process.env['ELECTRON_RENDERER_URL']` in dev-mode to load the dev server URL, fall back to `file://.../index.html` in production. Planner captures the diff.

### D-09-05 — Aliases: preserve `@` → `src/`, `src` → `src/`; verify `icons` → `_icons/` usage before porting
**Rationale:** `@` and `src` aliases are both used across `src/renderer/**/*.vue`; grep will confirm during planning. `icons` → `_icons/` is referenced by webpack config but _icons/ directory exists; planner confirms actual import sites and either ports or deletes the alias based on grep evidence.

### D-09-06 — Static assets: keep `static/` directory, configure electron-vite to copy
**Rationale:** Current webpack uses `CopyWebpackPlugin` → `dist/static`. Vite's convention is `public/` → copied to bundle root automatically. Rather than moving the `static/` directory (would ripple into `electron-builder` `build.extraResources` config + any path refs in main/renderer), keep it and configure electron-vite's `main.build.assetsInclude` or use `vite-plugin-static-copy` explicitly. `__static` global preserved via `define()` in each sub-config.

### D-09-07 — HTML template: migrate `src/index.ejs` → `src/index.html`, delete EJS nodeModules hack
**Rationale:** The EJS `<% %>` block at `src/index.ejs:7-13` was a workaround for electron dev mode (inject node_modules into module.globalPaths). With electron-vite's dev flow, the renderer runs as a normal Vite dev server, and Node module resolution is handled by the main process's context-bridge (or nodeIntegration if still enabled). Plain HTML works; if the globalPaths hack turns out to be load-bearing in production (unlikely — the `try/catch` suggests it was defensive), reinstate via a `<script>` tag with no EJS templating. Planner verifies via dev-mode smoke test.

### D-09-08 — electron-builder integration: point `files` at new output folder
**Rationale:** Webpack output was `dist/`. electron-vite default is `out/` (separate subfolders for main/renderer/preload). Update `package.json` `build.files` from `['dist/**/*', ...]` → `['out/**/*', ...]`. Also update `"main": "./dist/main.js"` → `"main": "./out/main/index.js"` (electron-vite's default output layout). `directories.output: "build/"` for installers stays the same.

### D-09-09 — Vue plugin: `@vitejs/plugin-vue` (direct replacement for vue-loader)
**Rationale:** vue-loader 17 is already in place from Phase 8; `@vitejs/plugin-vue` is the Vite-native equivalent. electron-vite's renderer config slot takes it as a standard Vite plugin.

### D-09-10 — Bisect shape: three commit chain
**Rationale:** Following D-04/D-08-18 pattern:
  1. `chore(deps): add electron-vite + @vitejs/plugin-vue; remove webpack + loaders` — dep swap only
  2. `refactor(build): replace webpack with electron-vite (configs, main-URL load, HTML template)` — all build chain changes
  3. `chore(build): update electron-builder + package.json scripts for out/ output folder` — output path changes
Bisect between HEAD and commit 1 isolates dep regressions. Between 2 and 1 isolates config/dev-runner replacement. Between 3 and 2 isolates electron-builder integration.

### D-09-11 — Vitest pre-wiring: **DEFER to Phase 10**
**Rationale:** Tempting to wire Vitest into `electron.vite.config.mjs` during Phase 9 since electron-vite has first-class Vitest support. But Phase 10 is the Vitest migration — conflating scope breaks the bisect chain. Phase 9 ends with Jest 25 still running; `npm test` still passes 256/256 via Jest.

### Claude's Discretion
- Exact electron-vite config shape (externals, build targets per sub-config) — planner + researcher decide based on electron-vite docs at plan time.
- Whether to keep `file-loader` / `url-loader` asset handling patterns or switch to Vite's native `import logo from './logo.png'` — prefer Vite-native (smaller bundle, no loader middleware), but only if migration touches ≤3 asset import sites. If more, defer to Phase 12 or later.
- `_icons/` directory fate — if `icons` alias is unused (planner grep), delete both the alias and `_icons/` directory from package.json scope. If used, preserve.

</decisions>

<code_context>
## Existing Code Insights (pre-planning scout)

### Build chain files (all to be retired or heavily reshaped)
- `_scripts/webpack.main.config.js` — 88 lines, target: electron-main
- `_scripts/webpack.renderer.config.js` — 146 lines, target: electron-renderer, includes `sassOptions.loadPaths` fix from Phase 8 Plan 04
- `_scripts/dev-runner.js` — 137 lines, orchestrates webpack + dev-server + electron spawn
- `_scripts/build-dev.js` — dev build script (may also retire or adapt to call `electron-vite build --mode development`)
- `_scripts/release.js` — release orchestration (check whether it invokes webpack — if so, adapt to electron-vite)

### HTML + static glue
- `src/index.ejs` — migrate to `src/renderer/index.html` (electron-vite's default renderer entry location)
- `__static` definitions — centralize in electron-vite sub-configs via `define()`

### Package.json surface
- 14 webpack-era devDependencies to remove (webpack, webpack-cli, webpack-dev-server, babel-loader, copy-webpack-plugin, css-loader, file-loader, html-webpack-plugin, mini-css-extract-plugin, node-loader, sass-loader, style-loader, url-loader, vue-loader, vue-style-loader)
- 2 dev deps to add: `electron-vite`, `@vitejs/plugin-vue`
- `"main"` field: `./dist/main.js` → `./out/main/index.js`
- Scripts: `pack`, `pack:main`, `pack:renderer`, `dev-runner`, `build:dev:dir` all rewire to `electron-vite` CLI
- `build.files`: `dist/**/*` → `out/**/*`
- `build.extraResources` + icon paths stay the same (reference `static/` directly)

### Integration points
- `src/main/index.js:116` still has the pre-existing `addDevToolsExtension is not a function` issue — Phase 13 scope, do NOT touch in Phase 9
- `src/main/index.js` dev-mode URL: currently loads `http://localhost:9080` (hardcoded?) or via `__dirname` — needs `process.env.ELECTRON_RENDERER_URL` guard for electron-vite compatibility

</code_context>

<specifics>
## Specific Requirements

From ROADMAP phase success criteria:
1. No webpack, webpack-cli, webpack-dev-server, or `*-loader` devDependencies remain (except any Vite/Vitest legitimately needs transitively — e.g., esbuild)
2. `vite.config.ts` or `electron.vite.config.mjs` is authoritative; `@vitejs/plugin-vue` wired for SFC parsing
3. `npm run dev` launches Electron with Vite dev server; HMR works across Vue component edits
4. `npm run build` produces an installable Electron package via electron-builder; installer size within ±20% of v1.4 baseline
5. `npm test` 256/256 (still Jest until Phase 10); lint in v1.4 band (≤1881)

Planner verification must include a smoke-test of `npm run dev` (Electron launches, window opens, renderer HMR verified on one Vue file edit) and `npm run build` (electron-builder emits an installer in `build/`).

</specifics>

<deferred>
## Deferred Ideas

- **Vitest setup inside `electron.vite.config.mjs`** — defer to Phase 10 (keeps bisect chain clean)
- **Vite config written in TypeScript** — defer to Phase 12 (after `.js → .ts` mass conversion lands tsconfig updates)
- **electron-builder → electron-forge migration** — not raised, just noting that electron-forge has better Vite integration via `@electron-forge/plugin-vite`. Out of scope for v2.0; candidate for post-v2.0 backlog if electron-builder causes friction during Phase 9.
- **Preload script architecture** — current codebase appears not to use a separate preload script (nodeIntegration still on). Not changing that in Phase 9. Preload adoption candidate for post-v2.0 security hardening.

</deferred>

<canonical_refs>
## Canonical References

Planner + researcher must read these:
- `.planning/phases/09-webpack-to-vite/09-CONTEXT.md` (this file)
- `.planning/ROADMAP.md` §"Phase 9 (was 11): webpack → Vite bundler + Electron"
- `.planning/REQUIREMENTS.md` §BUNDLER-01
- `_scripts/webpack.main.config.js`, `_scripts/webpack.renderer.config.js`, `_scripts/dev-runner.js`, `_scripts/build-dev.js`, `_scripts/release.js`
- `src/main/index.js` (dev-mode URL loading site)
- `src/index.ejs` (migration target)
- `package.json` `build`, `scripts`, `main`, dependencies + devDependencies
- https://electron-vite.org/ (canonical docs)
- https://vitejs.dev/config/ (Vite config reference)
- https://github.com/alex8088/electron-vite-boilerplate (reference boilerplate)

</canonical_refs>
