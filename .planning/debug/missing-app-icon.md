---
slug: missing-app-icon
status: resolved
trigger: "The icon of the application seems to have gone missing. It is located at /dist/static/icon.png"
created: 2026-04-27
updated: 2026-04-27
---

# Debug Session: missing-app-icon

## Symptoms

<!-- DATA_START -->
- **expected**: Application icon (window icon, taskbar icon, dock icon) shows the AR-branded `icon.png` both in dev (`npm run dev`) and in the packaged build.
- **actual**: User reports the icon "has gone missing" — note: the user-supplied path `/dist/static/icon.png` is the **old webpack build location** that no longer exists in the runtime resolution chain after the Phase 9 webpack→electron-vite migration. The canonical source file `static/icon.png` still exists at the project root.
- **error**: Not specified by user. Investigator should check `npm run dev` stderr for any `ENOENT` errors involving `icon.png`, and check Electron's main-process console for `nativeImage.createFromPath` failures (silent: returns an empty NativeImage on failure rather than throwing).
- **timeline**: Almost certainly broke during the webpack → electron-vite migration (Phase 9, multiple commits in the v2.0 → v2.1 / v3.0 line). Pre-migration the main bundle output was `dist/main/index.js`, so `__dirname/../static/icon.png` resolved to `dist/static/icon.png`. Post-migration the main bundle output is `out/main/index.js`, and there is no `out/static/icon.png`.
- **reproduction**: `npm run dev` and observe the window/taskbar icon. Also `npm run build:installer` and inspect the installed app — though for the *packaged* build, `extraResources` copies `static/icon.png` → `resources/icon.png` and the main process resolves to `process.resourcesPath/icon.png`, so the packaged build is likely fine. **Suspected scope: dev runtime only** plus possibly the renderer-side `App.vue` icon binding.
<!-- DATA_END -->

## Initial Context for Investigator

The orchestrator already ran a quick grep before opening this session. Findings:

### Two icon-path references in the codebase

1. **Main process** — `src/main/index.ts:93-95`
   ```ts
   ? path.join(process.resourcesPath, 'icon.png')        // packaged: OK
   : path.join(__dirname, '..', 'static', 'icon.png');   // dev: BROKEN
   const icon = nativeImage.createFromPath(iconPath);
   ```
   Dev branch resolves relative to `__dirname` of the bundled main script. With electron-vite that's `out/main/`, so `__dirname + '/../static/icon.png'` → `out/static/icon.png` — does not exist. `nativeImage.createFromPath` silently returns an empty image when the path is missing (no exception), which explains "missing" without error logs.

2. **Renderer** — `src/renderer/App.vue:6`
   ```vue
   :ico="'./static/icon.png'"
   ```
   A literal string path passed to a child component (probably TitleBar or similar — investigator should check). Post-Vite this string is not processed through the renderer's asset pipeline; it's evaluated relative to whatever URL the renderer is served from (`http://localhost:<port>/` in dev, `file:///.../out/renderer/index.html` in prod) — neither has a `./static/icon.png` resolving to the actual file.

### Build config (package.json)
- `build.files` includes `static/icon.*` (so the file gets packaged into the asar)
- `build.extraResources` copies `static/icon.png` → `<install-dir>/resources/icon.png`
- `build.win.icon` is `static/icon.png` (consumed by electron-builder at build time — likely fine)

### Hypotheses (for investigator to confirm/refine)

- **H1 (high prior)**: Dev-mode main process icon path is broken because `__dirname` shifted from `dist/main/` to `out/main/` and there is no `out/static/` neighbor. **Fix**: either (a) emit `static/icon.png` to `out/static/` via Vite's static-asset handling or `electron-vite`'s `viteStaticCopy`/built-in static handling, (b) use `app.getAppPath()` + `'static/icon.png'` (works because `cwd` is the project root in dev), or (c) hard-code an absolute path during dev only via `import.meta.env.DEV`.
- **H2 (high prior)**: Renderer `App.vue` icon binding is broken because the literal string path bypasses Vite's asset pipeline. **Fix**: `import iconUrl from '../../static/icon.png'` (Vite will hash + serve), pass `iconUrl` to the component instead of the literal string.
- **H3 (lower prior)**: The packaged build may also be affected if the main process's packaged-branch path is wrong, or if the electron-builder `extraResources` copy is broken. Verify against `build/win-unpacked/resources/icon.png` from a fresh `npm run pack` — that file should exist.

### Suggested investigation order

1. Confirm `out/main/index.js`'s runtime `__dirname` and verify `out/static/icon.png` does NOT exist after `npm run build:dev` (or `npm run pack`).
2. Find the consumer of `App.vue:6`'s `:ico=` prop — likely a `<TitleBar>` or `<HelpModal>` — to confirm whether the string is used as an `<img src>` (which Vite must process) or as something else.
3. Apply fixes for H1 + H2.
4. Smoke test: `npm run dev` → window icon visible. `npm run build:installer` → installed app shows correct icon in taskbar.

### Files likely to change
- `src/main/index.ts` (icon-path resolution in dev branch)
- `src/renderer/App.vue` (icon import + binding)
- `electron.vite.config.mjs` (possibly — to copy `static/` into `out/`)
- Possibly the consuming child component if it expects a string-path interface vs. URL

## Current Focus

- **hypothesis**: H1 (dev main-process icon path broke when `__dirname` shifted from `dist/main/` to `out/main/` post-Vite migration) is the primary cause. H2 (renderer literal string bypassing Vite asset pipeline) is a secondary related break.
- **test**: Inspect `out/main/index.js`'s build-time `__dirname` resolution; confirm no `out/static/icon.png` exists; locate the consumer of `App.vue`'s `:ico` prop to verify how the literal string is used.
- **expecting**: Both H1 and H2 confirmed. Fix is two small changes plus possibly an `electron.vite.config.mjs` static-copy entry.
- **next_action**: Investigate H1 + H2 in code, decide on the cleanest fix shape (use `app.getAppPath()` for the main process; Vite asset import for the renderer), apply.

## Evidence

- timestamp: 2026-04-27 — `out/static/` directory does not exist after `npm run pack` (`Glob out/**/*.png` returned no files; `Glob out/static/**` empty). `out/main/index.js` exists. Confirms H1 dev-branch path target is missing.
- timestamp: 2026-04-27 — Compiled `out/main/index.js` line 896 shows the conditional emitted verbatim from source: `const iconPath = process.resourcesPath ? ... : path.join(__dirname, "..", "static", "icon.png");`. The dev-fallback string is preserved in the bundle.
- timestamp: 2026-04-27 — **Deeper finding**: `process.resourcesPath` is set by Electron in BOTH dev and packaged modes (in dev it points at `node_modules/electron/dist/resources/`, which we confirmed contains only `default_app.asar`, no `icon.png`). The truthiness check `process.resourcesPath ? ... : ...` therefore **always takes the packaged branch**, even in dev. The dev branch (`__dirname/../static/icon.png`) is unreachable, so the orchestrator's "broken dev fallback" framing is right in spirit but the actual mechanism is "wrong discriminator → wrong path in dev". `nativeImage.createFromPath` returns an empty image silently → `createWindowIcon()` returns `undefined` → no window/taskbar icon.
- timestamp: 2026-04-27 — `src/renderer/components/TitleBar.vue:6` confirms `:ico` is bound to `<img :src="ico">`. The literal string `'./static/icon.png'` is consumed as an `<img src>` URL, which Vite cannot rewrite (it's a runtime string from a parent prop, not a static template asset). Confirms H2.
- timestamp: 2026-04-27 — `build/win-unpacked/resources/icon.png` exists (from a previous packaged build). Confirms H3 negative: packaged-build branch (`process.resourcesPath/icon.png`) does resolve correctly when `app.isPackaged` is true. Packaged build is fine; **scope is dev runtime + renderer img tag**.
- timestamp: 2026-04-27 — After fix: `npm run pack` emits `out/renderer/assets/icon-C-JN6Eyu.png` (152 KB hashed asset) — confirms the renderer-side `import iconUrl from '../../static/icon.png'` flows through Vite's pipeline correctly. Main bundle reflects the new `app.isPackaged ? ... : app.getAppPath() + 'static/icon.png'` discriminator. `npm run type-check` clean. `npm run dev` boots the dev server with no `[Vue warn]`, no `ENOENT`, no icon-related stderr.

## Eliminated Hypotheses

- **H3 (packaged build broken)** — eliminated: `build/win-unpacked/resources/icon.png` exists from prior packaged build; the `app.isPackaged` branch resolves to the correct `process.resourcesPath/icon.png` location. `extraResources` copy is functioning. No fix needed in the packaged path.
- **"Vite static-copy plugin needed"** (sub-hypothesis under H1) — eliminated: the cleanest fix uses `app.getAppPath()` (which equals the project root in dev under electron-vite, since `cwd` is the project root and there's no app.asar yet), avoiding the need to teach electron-vite to copy `static/` into `out/`. The packaged build's icon path comes from `extraResources`, not from `out/`, so neither path benefits from a Vite static copy.

## Resolution

- **root_cause**: Two compounding regressions from the webpack→electron-vite migration (v2.x → v3.x). (1) `src/main/index.ts:createWindowIcon` discriminates "packaged vs dev" with `process.resourcesPath ? ... : ...`, but Electron sets `process.resourcesPath` in both modes. The condition is therefore always true and the packaged branch always executes. In dev `process.resourcesPath` points at `node_modules/electron/dist/resources/`, where `icon.png` does not exist; `nativeImage.createFromPath` silently returns an empty image, and `createWindowIcon()` returns `undefined` — leaving `BrowserWindow#icon` unset (no window/taskbar icon). (2) `src/renderer/App.vue` passes the literal string `'./static/icon.png'` as the `:ico` prop to `<TitleBar>`, which renders it as `<img :src>`. Vite cannot rewrite a runtime string prop, so it is requested as `./static/icon.png` relative to the renderer document — 404 in both dev (vite dev server) and prod (`file://` in the asar).
- **fix**:
  - `src/main/index.ts:91-105` — replace the `process.resourcesPath ? ... : ...` discriminator with `app.isPackaged ? path.join(process.resourcesPath, 'icon.png') : path.join(app.getAppPath(), 'static', 'icon.png')`. Anchors the dev path at the project root via `app.getAppPath()` (which equals `cwd` under electron-vite dev) and adds a `log.info('Window icon not loaded', { iconPath })` diagnostic so future regressions are visible.
  - `src/renderer/App.vue` — change `:ico="'./static/icon.png'"` to `:ico="iconUrl"` and `import iconUrl from '../../static/icon.png'` in the script. Vite hashes and emits the asset (`out/renderer/assets/icon-<hash>.png`), giving the `<img>` a URL that resolves under both dev (vite dev server) and prod (`file://` in the asar).
  - No `electron.vite.config.mjs` change needed; existing `declare module '*.png'` shim in `src/renderer/shims-vue.d.ts` handles the type side.
- **verification**:
  - `npm run type-check` — clean (no errors).
  - `npm run pack` — succeeds; renderer build emits `out/renderer/assets/icon-C-JN6Eyu.png` (152 KB) confirming the asset import flows through Vite. Main bundle (`out/main/index.js:896`) now shows the corrected `electron.app.isPackaged ? ... : electron.app.getAppPath() ...` discriminator.
  - `npm run dev` — dev server boots cleanly on `http://localhost:5173/`, Electron starts the app, no `[Vue warn]`, no `ENOENT`, no icon-related stderr. (Full visual confirmation of the icon in the window/taskbar requires running `npm run dev` interactively.)
  - Packaged build (`build/win-unpacked/resources/icon.png`) was already correct and continues to work via the `app.isPackaged` branch + `extraResources` copy.
- **files_changed**:
  - `src/main/index.ts` (lines 91-105: `createWindowIcon` rewritten)
  - `src/renderer/App.vue` (full file: import + data binding)
