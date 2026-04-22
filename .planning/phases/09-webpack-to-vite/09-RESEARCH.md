# Phase 9 Research: webpack → Vite Migration

**Compiled:** 2026-04-22
**Primary sources:** electron-vite.org/guide/ + /config/, CONTEXT.md, codebase scout.

## Environment + Versions

- **electron-vite:** latest stable v5.0.0 (requires Vite ≥5.0, Node 20.19+/22.12+)
- **@vitejs/plugin-vue:** latest v5.x (works with vue@3.5.x installed in Phase 8)
- **Current Electron:** 41.x (installed, unchanged in Phase 9)
- **Current Node in dev:** verify with `node --version`; v20.19+ required

## Config File Pattern (CANONICAL)

**File:** `electron.vite.config.mjs` at project root (per D-09-02 we defer TypeScript to Phase 12).

```javascript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ['electron', '@electron/remote', 'electron-updater', 'irsdk-node', 'sharp'],
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        'src': resolve(__dirname, 'src'),
      },
    },
    define: {
      '__static': JSON.stringify(resolve(__dirname, 'static').replace(/\\/g, '\\\\')),
      'process.env.PRODUCT_NAME': JSON.stringify('iRacing Screenshot Tool'),
    },
  },
  renderer: {
    plugins: [vue()],
    build: {
      rollupOptions: {
        external: ['electron', '@electron/remote', 'sharp'],
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        'src': resolve(__dirname, 'src'),
        'icons': resolve(__dirname, '_icons'),  // preserve only if grep confirms usage
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          loadPaths: [resolve(__dirname, 'node_modules')],  // Phase 8 Plan 04 fix for Oruga theme-bulma
        },
      },
    },
    define: {
      '__static': JSON.stringify('/static'),
      'process.env.PRODUCT_NAME': JSON.stringify('iRacing Screenshot Tool'),
    },
  },
  // preload: SKIP — project doesn't use preload scripts (nodeIntegration still on)
});
```

**`externalizeDepsPlugin()`** auto-externalizes all `dependencies` (not devDependencies) for main/preload. This is the recommended default; explicit `rollupOptions.external` is belt-and-suspenders for native modules.

## HTML Template Migration

**Current:** `src/index.ejs` — HtmlWebpackPlugin template with `<% %>` EJS blocks.
**Target:** `src/renderer/index.html` — electron-vite's default renderer root (Vite convention).

**Contents after migration:**
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

**Drops:**
- EJS `<% if (htmlWebpackPlugin.options.nodeModules) %>` `module.globalPaths` hack — electron-vite handles module resolution for the renderer via Vite dev server and does not need dev-mode node_modules path injection
- Inline `<script>` `window.__static = require('path').join(...)` — replaced by `define` in renderer config

**Adds:**
- `<script type="module" src="./main.js">` — Vite entry convention (file `src/renderer/main.js` must live next to `index.html` or use an absolute import path)

**Entry file reorganization:** Move `src/renderer/main.js` unchanged, OR update the HTML script src to `/src/renderer/main.js` (Vite resolves project root for absolute paths). Recommend keeping `src/renderer/main.js` where it is and pointing the script src appropriately. electron-vite's `renderer.root` defaults to `src/renderer/` if `index.html` lives there — aligns with our layout.

## Dev-Mode URL Loading (main process)

**Current `src/main/index.js`:** hardcodes dev URL (likely `http://localhost:9080` from `dev-runner.js:113`) or loads from `__dirname`. **Must migrate** to electron-vite's pattern:

```javascript
// In main.js, replace the current loadURL(...) or loadFile(...) call with:
if (process.env.ELECTRON_RENDERER_URL) {
  mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
} else {
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}
```

electron-vite sets `ELECTRON_RENDERER_URL` at dev time. In prod, the renderer sits at `out/renderer/index.html` relative to `out/main/index.js` (which is `__dirname` in the built main bundle).

## package.json Diff (CANONICAL)

**Before:**
```json
{
  "main": "./dist/main.js",
  "scripts": {
    "dev": "run-s rebuild:electron dev-runner",
    "dev-runner": "node _scripts/dev-runner.js",
    "pack": "run-p pack:main pack:renderer",
    "pack:main": "webpack --mode=production --config _scripts/webpack.main.config.js",
    "pack:renderer": "webpack --mode=production --config _scripts/webpack.renderer.config.js",
    "build": "run-s rebuild:electron pack build:dir",
    "build:dir": "...",
    "build:dev": "run-s rebuild:electron pack build:dev:dir",
    "build:dev:dir": "node _scripts/build-dev.js --dir"
  },
  "build": {
    "files": ["package.json", "dist/**/*", "node_modules/**/*", "static/icon.*", "!bot/**/*"]
  }
}
```

**After:**
```json
{
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "run-s rebuild:electron electron-vite-dev",
    "electron-vite-dev": "electron-vite dev",
    "pack": "electron-vite build",
    "build": "run-s rebuild:electron pack build:dir",
    "build:dir": "electron-builder --dir",
    "build:dev": "run-s rebuild:electron pack build:dev:dir",
    "build:dev:dir": "electron-builder --dir"
  },
  "build": {
    "files": ["package.json", "out/**/*", "node_modules/**/*", "static/icon.*", "!bot/**/*"]
  }
}
```

- `"main"` path change: `./dist/main.js` → `./out/main/index.js`
- `"dev"` chain: delegates to `electron-vite dev` instead of the custom dev-runner
- `"pack"` script: single `electron-vite build` replaces the two parallel webpack invocations
- `"build:dev"` chain: `_scripts/build-dev.js` can be retired if its only job was webpack invocation — verify and delete
- `"build:dir"` just calls `electron-builder --dir` (bundling already done by pack)
- Remove `"dev-runner"` script; delete `_scripts/dev-runner.js`

## Static Assets (`static/`)

**Strategy:** Keep `static/` directory at project root. electron-vite copies `resources/` directory by default to `out/main/resources/`, but since we use `static/`, we need one of:

1. **Rename `static/` → `resources/` globally** — cleanest, but breaks `electron-builder` `extraResources` paths
2. **Use `vite-plugin-static-copy`** in renderer config — explicit, predictable
3. **Define `__static` to point at project-root `static/` at runtime** — electron-builder already copies `static/icon.*` per `build.files`

**Recommended:** Option 3 — keep `static/` + define `__static` in both main and renderer configs. No new plugin needed. Runtime behavior:
- Dev: `__static` = absolute `./static/` path (resolved in config via `resolve(__dirname, 'static')`)
- Prod: `__static` = relative `./static/` path — electron-builder copies it to the app bundle alongside `out/` per `extraResources` config (verify)

## Loaders → Vite Equivalents

| Webpack loader | Vite equivalent |
|---|---|
| `babel-loader` (.js/.ts) | Built-in ESBuild (zero config) |
| `vue-loader` | `@vitejs/plugin-vue` |
| `sass-loader` + `css-loader` + `MiniCssExtractPlugin` | Built-in (Vite has native SCSS support) |
| `file-loader` / `url-loader` (images, fonts) | Built-in (Vite inlines < 4kb, emits files for larger) |
| `node-loader` (.node files) | `@rollup/plugin-node-resolve` (usually not needed for renderer; main externalizes native modules) |
| `HtmlWebpackPlugin` | Native (Vite consumes `index.html` as entry) |
| `CopyWebpackPlugin` | `vite-plugin-static-copy` if needed; otherwise built-in `public/` |
| `webpack.DefinePlugin` | `define` in config |
| `webpack.HotModuleReplacementPlugin` | Native HMR (no plugin needed) |

## Devdependencies Diff (CANONICAL)

**Remove (15):** `webpack`, `webpack-cli`, `webpack-dev-server`, `babel-loader`, `copy-webpack-plugin`, `css-loader`, `file-loader`, `html-webpack-plugin`, `mini-css-extract-plugin`, `node-loader`, `sass-loader`, `style-loader`, `url-loader`, `vue-loader`, `vue-style-loader`

**Add (2):** `electron-vite`, `@vitejs/plugin-vue` (+ `vite` as a transitive peer)

**Retain:** `sass` (Dart Sass — Vite consumes it directly via `css.preprocessorOptions.scss`)

## Pitfalls

### P1 — Native module externalization

`sharp`, `irsdk-node`, `@electron/remote`, `electron-updater` must be in `main.build.rollupOptions.external`. `externalizeDepsPlugin()` handles this automatically based on `package.json` dependencies vs devDependencies. **Verify at plan time:** `sharp` is currently in `dependencies` (not devDeps) — confirm with `grep sharp package.json`. If it's in devDeps, the externalize plugin will NOT pick it up and explicit `external` is required.

### P2 — Vue SFC sourcemap + HMR edge cases

`@vitejs/plugin-vue` HMR can fail silently if `<script setup>` syntax is mixed with Options API in the same component. Phase 8 uses Options API exclusively (per CONTEXT.md D-07), so this should not trigger. Add `define` for `__VUE_OPTIONS_API__: 'true'` and `__VUE_PROD_DEVTOOLS__: 'false'` if the default feature flags emit warnings.

### P3 — Windows path escaping

The current webpack config has `.replace(/\\/g, '\\\\')` for `__static` paths. Vite's `resolve()` handles cross-platform paths internally; the escape is unnecessary in Vite's `define` block (but harmless if left in place). Confirm via a dev-mode smoke test.

### P4 — `electron-builder` `extraResources` + `static/`

Current config has `extraResources: [{ from: 'static/icon.png', to: 'icon.png' }]`. This still works with Vite since `static/` is still at project root — electron-builder operates on source tree, not bundler output. No change needed.

### P5 — Bot workspace isolation

`bot/` has its own build chain (separate from webpack). Vite migration does NOT touch `bot/`. Pre-existing dirty `bot/` files in the working tree must remain untouched per Phase 8 precedent.

### P6 — `rebuild:electron` + `electron-rebuild` compatibility

`postinstall` runs `electron-rebuild -f --which-module irsdk-node,sharp`. This re-compiles native modules for Electron ABI. It runs **after** `npm install` and **before** any build step. Unaffected by Vite migration.

## Dev-Mode Smoke Test (MUST PASS)

Planner includes this as a verification task:

1. `npm install` exits 0 without `--legacy-peer-deps`
2. `npm run dev` launches:
   - electron-vite dev server comes up (port 5173 default or whatever Vite picks)
   - Electron window opens
   - Home view renders with FA icons + Oruga components (from Phase 8)
3. Edit `src/renderer/views/Home.vue` (change text content) → renderer HMR replaces the component without full reload (verified via DevTools Network panel showing `.vue` HMR update, not full refresh)
4. Edit `src/main/index.js` (change window title) → main process restarts, window reopens with new title
5. Terminate dev server — no orphaned Electron or Vite processes

## Build-Mode Smoke Test (MUST PASS)

1. `npm run pack` runs `electron-vite build`, emits `out/main/index.js`, `out/renderer/index.html`, `out/renderer/assets/*.js/css`
2. Bundle size: `out/renderer/assets/*.js` total within ±20% of v1.4 baseline (v1.4 baseline ~2.3MB per Phase 8-06 SUMMARY)
3. `npm run build` produces `build/iRacing Screenshot Tool Setup <version>.exe` installer
4. Installer runs on Windows 11 dev box — app launches, Home view renders — deferred to final validation; not blocking Phase 9 completion

## Assumptions to Verify at Plan Time

| ID | Assumption | Verification |
|----|-----------|--------------|
| A1 | electron-vite@^5 compatible with Electron 41 | `npm view electron-vite peerDependencies`; check for explicit Electron version constraint |
| A2 | `@vitejs/plugin-vue@^5` compatible with vue@3.5.x | `npm view @vitejs/plugin-vue peerDependencies` |
| A3 | `npm install` after adding both remains clean (no new ERESOLVE) | Empirical: install and observe |
| A4 | `src/main/index.js` has a single loadURL/loadFile site to patch | Grep; read; confirm |
| A5 | `sharp` is in `dependencies` (not devDeps) so `externalizeDepsPlugin()` picks it up | `grep '"sharp"' package.json` |
| A6 | `_icons/` directory is in use (planner grep decides if alias stays or goes) | `grep -r "'icons/" src/` |
| A7 | `_scripts/build-dev.js` and `_scripts/release.js` can be retired (verify they only invoke webpack) | Read each, confirm |
| A8 | `__static` global's existing `try/catch` guard in `src/index.ejs:19-27` can be deleted safely (renderer's `__static` define replaces it) | Search for `window.__static` usage across src/renderer/ |

## Commit Plan (3-commit bisect chain per D-09-10)

### Commit 1: Dep swap
```
chore(deps): add electron-vite + @vitejs/plugin-vue; remove 15 webpack devDependencies
```
- package.json + package-lock.json only
- `npm install` clean
- Build WILL be broken at this commit (no configs yet)

### Commit 2: Config + templates + main URL
```
refactor(build): replace webpack with electron-vite (configs, main-URL load, HTML template)
```
- Add `electron.vite.config.mjs`
- Migrate `src/index.ejs` → `src/renderer/index.html`
- Patch `src/main/index.js` dev-URL loading
- Delete `_scripts/webpack.*.config.js` + `_scripts/dev-runner.js`
- Delete `_scripts/build-dev.js` if it only orchestrated webpack (confirm first)
- `_scripts/release.js` — patch or delete based on A7 verification
- Update package.json scripts (`dev`, `pack`, etc.)

### Commit 3: electron-builder integration
```
chore(build): update electron-builder files + main entry for out/ output folder
```
- package.json `build.files`: `dist/**/*` → `out/**/*`
- package.json `main`: `./dist/main.js` → `./out/main/index.js`
- `npm run build` produces installer with new paths

## Plan Breakdown Suggestion

Based on the 3-commit chain + surrounding setup/verification work, suggested plan decomposition:

- **Plan 09-01 — electron-vite + plugin-vue deps + vite.config.mjs skeleton:** adds packages, creates skeleton config, verifies `npm install` clean. Build NOT yet functional but `electron-vite --help` works.
- **Plan 09-02 — HTML template migration + main-URL dev/prod loader:** migrates `src/index.ejs` → `src/renderer/index.html`, patches `src/main/index.js` for `ELECTRON_RENDERER_URL` pattern.
- **Plan 09-03 — electron-vite config completion (main + renderer full setup):** fleshes out all externals, aliases, define blocks, SCSS loadPaths; first working dev-mode smoke test (`npm run dev`).
- **Plan 09-04 — Retire webpack configs + dev-runner + scripts rewrite:** deletes `_scripts/webpack.*.config.js` + `_scripts/dev-runner.js`, patches `_scripts/build-dev.js` + `_scripts/release.js` or deletes them, rewrites package.json scripts.
- **Plan 09-05 — electron-builder `out/` output folder + final installer build smoke test:** package.json `main` + `build.files` update; `npm run build` produces installer; bundle size within ±20% of v1.4 baseline.
- **Plan 09-06 (optional) — final UAT checkpoint:** 4-view click-through in electron-vite dev mode (autonomous: false) — only if dev-mode smoke test reveals unexpected visual regressions.

Planner decides if 09-06 is needed or if 09-05's verification covers it.
