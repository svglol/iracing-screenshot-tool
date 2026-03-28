# Codebase Structure

*Generated: 2026-03-28 | Focus: arch*

## Directory Layout

```
iracing-screenshot-tool/
├── _scripts/                    # Build tooling (webpack configs, dev runner, installer)
├── src/
│   ├── data/                    # Static data directory (currently empty, .gitkeep)
│   ├── main/                    # Electron main process code
│   ├── renderer/                # Electron renderer process code (Vue 2 SPA)
│   │   ├── assets/
│   │   │   └── style/           # Global SCSS stylesheets
│   │   ├── components/          # Vue single-file components
│   │   ├── router/              # Vue Router configuration
│   │   ├── store/               # Vuex store (initialized but unused)
│   │   │   └── modules/         # Auto-imported Vuex modules (none defined)
│   │   └── views/               # Top-level route views
│   └── utilities/               # Shared cross-process utilities
├── static/                      # Static assets bundled with app (icons, images)
├── build/                       # Electron-builder output (gitignored)
├── dist/                        # Webpack output (gitignored)
├── .eslintrc.js                 # ESLint config
├── .babelrc                     # Babel config
├── .gitignore                   # Git ignore rules
├── package.json                 # Project manifest and scripts
└── src/index.ejs                # HTML template for renderer (HtmlWebpackPlugin)
```

## Directory Purposes

**`_scripts/`:**
- Purpose: Build and development tooling
- Contains: Webpack configurations, dev runner with HMR, dev build script, NSIS installer customization
- Key files:
  - `_scripts/webpack.main.config.js`: Webpack config for main process (target: `electron-main`)
  - `_scripts/webpack.renderer.config.js`: Webpack config for renderer process (target: `electron-renderer`)
  - `_scripts/dev-runner.js`: Development workflow -- starts webpack-dev-server for renderer on port 9080, watches main process, auto-restarts Electron
  - `_scripts/build-dev.js`: Creates dev builds with commit-hash-suffixed version strings
  - `_scripts/installer.nsh`: NSIS installer customization (opens a URL during install)

**`src/main/`:**
- Purpose: Electron main process -- app lifecycle, iRacing integration, IPC hub
- Contains: JavaScript modules (CommonJS `require`/`module.exports`)
- Key files:
  - `src/main/index.js`: Main entry point (~970 lines). App bootstrap, window creation, all IPC handlers, screenshot orchestration, ReShade wait logic, error reporting, auto-update
  - `src/main/iracing-sdk.js`: IRacingBridge singleton. Wraps `irsdk-node`, polls for connection, emits events, exposes telemetry/sessionInfo/camControls
  - `src/main/iracing-sdk-utils.js`: Telemetry flattening and camera state decoding helpers
  - `src/main/main-utils.js`: General-purpose utilities for the main process -- object merging, display serialization, error payload construction, ReShade INI parsing, Windows path normalization, camera state bitmask parsing
  - `src/main/window-utils.js`: PowerShell-based Win32 window manipulation -- get iRacing window position/size and resize it

**`src/renderer/`:**
- Purpose: Vue 2 SPA loaded by both the main window and the worker window
- Contains: Vue SFCs, router, store, entry point

**`src/renderer/assets/style/`:**
- Purpose: Global stylesheets
- Contains: SCSS files imported in the renderer entry
- Key files:
  - `src/renderer/assets/style/main.scss`: Global styles, Bulma/Buefy imports, custom scrollbars, context menu styling, color theming (`$primary: #ec202a`)
  - `src/renderer/assets/style/animations.scss`: CSS keyframe animations and Vue transition classes

**`src/renderer/components/`:**
- Purpose: Reusable Vue components
- Contains: Vue SFCs
- Key files:
  - `src/renderer/components/SideBar.vue`: Resolution selector (1080p-8k + custom), crop toggle, screenshot button, iRacing connection status indicator, ReShade mode hint. Listens for IPC events (`hotkey-screenshot`, `screenshot-response`, `screenshot-error`, `iracing-connected`, `iracing-disconnected`)
  - `src/renderer/components/TitleBar.vue`: Custom frameless window title bar with minimize/maximize/close buttons, update indicator. Sends `window-control` and `install-update` IPC messages
  - `src/renderer/components/Settings.vue`: Settings toolbar (gear, help, discord icons) and modal containers for SettingsModal, HelpModal, ChangelogModal. Fetches GitHub releases JSON
  - `src/renderer/components/SettingsModal.vue`: Settings form -- screenshot folder picker, keybind editor, disable tooltips toggle, manual window restore with custom dimensions, ReShade compatibility mode with INI file picker
  - `src/renderer/components/HelpModal.vue`: Static help/instructions content
  - `src/renderer/components/ChangelogModal.vue`: Renders changelog from cached GitHub releases JSON via `vue-markdown-plus`
  - `src/renderer/components/PromoCard.vue`: Promotional card displayed in sidebar footer

**`src/renderer/views/`:**
- Purpose: Top-level route components
- Contains: Vue SFCs
- Key files:
  - `src/renderer/views/Home.vue`: Main application view. Screenshot gallery with carousel (Buefy `b-carousel`), thumbnail generation with `sharp`, image viewer, context menu (open/copy/delete/open folder), gallery loading from screenshot folder
  - `src/renderer/views/Worker.vue`: Hidden worker window. Performs actual desktop capture via `getUserMedia`, image cropping/saving via `sharp` and `OffscreenCanvas`, ReShade image processing

**`src/renderer/router/`:**
- Purpose: Vue Router configuration
- Key files:
  - `src/renderer/router/index.js`: Defines routes (`/home` -> Home, `/worker` -> Worker, catch-all redirect to `/home`). Sets document title on navigation

**`src/renderer/store/`:**
- Purpose: Vuex store (effectively unused)
- Key files:
  - `src/renderer/store/index.js`: Creates Vuex store with strict mode in development. Has a commented-out `vuex-persistedstate` plugin
  - `src/renderer/store/modules/index.js`: Auto-imports all `.js` files in the directory as Vuex modules. No module files exist

**`src/utilities/`:**
- Purpose: Shared utilities used by both main and renderer processes
- Contains: CommonJS modules
- Key files:
  - `src/utilities/config.js`: Dual-mode config module. In main process: `electron-store` instance with schema. In renderer: IPC proxy with `get()`, `set()`, `onDidChange()`. Schema defines 16 config keys (resolution, crop, screenshotFolder, keybind, reshade settings, window position/size, etc.)
  - `src/utilities/desktop-capture.js`: Desktop capture source matching utilities. Normalizes window handles/titles/bounds, implements multi-strategy source matching (handle, title, known iRacing titles, display fallback), resolves display capture rectangles with scaling
  - `src/utilities/screenshot-name.js`: Screenshot filename generation. Sanitizes file parts, builds track name from iRacing session info (TrackDisplayName + TrackConfigName), creates unique filenames like `{track}-{driver}-{count}.png`

**`static/`:**
- Purpose: Static assets copied into the build
- Contains: `icon.png` (app icon), `screenshot.png`, `arms_logo.png` (promo card logo)
- Not generated, committed to git

**`src/data/`:**
- Purpose: Placeholder data directory
- Contains: `.gitkeep` only
- Copied to `dist/data/` in production builds

## Key File Locations

**Entry Points:**
- `src/main/index.js`: Main process entry (webpack entry point for `pack:main`)
- `src/renderer/main.js`: Renderer process entry (webpack entry point for `pack:renderer`)
- `src/index.ejs`: HTML template processed by HtmlWebpackPlugin

**Configuration:**
- `package.json`: Project metadata, dependencies, npm scripts, jest config, electron-builder config
- `.eslintrc.js`: ESLint config (standard + vue/recommended)
- `.babelrc`: Babel config
- `_scripts/webpack.main.config.js`: Main process webpack config
- `_scripts/webpack.renderer.config.js`: Renderer process webpack config

**Core Logic:**
- `src/main/index.js`: Screenshot orchestration, IPC hub, ReShade wait logic
- `src/main/iracing-sdk.js`: iRacing SDK bridge
- `src/main/window-utils.js`: Win32 window manipulation via PowerShell
- `src/renderer/views/Worker.vue`: Desktop capture and image processing
- `src/utilities/desktop-capture.js`: Capture source resolution
- `src/utilities/config.js`: Cross-process config abstraction

**Testing:**
- `src/main/iracing-sdk-utils.test.js`: Tests for telemetry flattening and camera state decoding
- `src/main/main-utils.test.js`: Tests for main-utils functions
- `src/utilities/desktop-capture.test.js`: Tests for desktop capture matching utilities
- `src/utilities/screenshot-name.test.js`: Tests for filename generation

## Naming Conventions

**Files:**
- `kebab-case.js` for all JavaScript modules: `iracing-sdk.js`, `window-utils.js`, `desktop-capture.js`, `screenshot-name.js`
- `kebab-case.test.js` for test files, co-located with source: `main-utils.test.js`
- `PascalCase.vue` for Vue components: `SideBar.vue`, `SettingsModal.vue`, `Home.vue`, `Worker.vue`
- `kebab-case.scss` for stylesheets: `main.scss`, `animations.scss`
- `kebab-case.js` for build scripts: `dev-runner.js`, `build-dev.js`, `webpack.main.config.js`

**Directories:**
- `lowercase` or `kebab-case`: `main/`, `renderer/`, `utilities/`, `components/`, `views/`, `router/`, `store/`
- Underscore prefix for build tooling: `_scripts/`

**Exports:**
- CommonJS (`module.exports` / `require`) in main process and utilities
- ES modules (`import`/`export`) in renderer code and Vue components
- Webpack resolves both via Babel

## Where to Add New Code

**New Main Process Feature:**
- Primary code: `src/main/` -- create a new `feature-name.js` module
- If it needs IPC: register handlers in `src/main/index.js`
- Tests: `src/main/feature-name.test.js` (co-located)

**New Renderer Component:**
- Implementation: `src/renderer/components/ComponentName.vue`
- Import from views or other components as needed

**New View / Route:**
- View: `src/renderer/views/ViewName.vue`
- Route: Add entry in `src/renderer/router/index.js`

**New Shared Utility:**
- Implementation: `src/utilities/utility-name.js`
- Tests: `src/utilities/utility-name.test.js` (co-located)
- Use CommonJS exports so it works in both main and renderer processes

**New Vuex Store Module:**
- Implementation: `src/renderer/store/modules/module-name.js`
- Auto-imported by `src/renderer/store/modules/index.js` (must export `default`)

**New Build Script:**
- Implementation: `_scripts/script-name.js`
- Add npm script in `package.json` if needed

**New Static Asset:**
- Place in `static/` directory
- Automatically copied to `dist/static/` in production builds

## Special Directories

**`dist/`:**
- Purpose: Webpack compilation output (main.js, renderer.js, index.html, static assets)
- Generated: Yes (by `npm run pack`)
- Committed: No (gitignored)

**`build/`:**
- Purpose: Electron-builder packaging output (NSIS installer, portable exe)
- Generated: Yes (by `npm run build` or `npm run build:installer`)
- Committed: No (gitignored)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (gitignored)

**`.tools/`:**
- Purpose: Vendored build tools (electron-builder NSIS binaries, npm 8.x for Node 12 compatibility)
- Generated: Partially (downloaded by electron-builder)
- Committed: No (gitignored)

**`.npm-cache/` and `.npm-cache-node12*/`:**
- Purpose: Local npm cache directories
- Generated: Yes
- Committed: No (gitignored)

**`src/data/`:**
- Purpose: Empty placeholder data directory
- Generated: No (has `.gitkeep`)
- Committed: Yes (`.gitkeep` only)

## Webpack Build Details

**Path Aliases (available in both main and renderer):**
- `@` -> `src/`
- `src` -> `src/`
- `icons` -> `_icons/` (renderer only)
- `vue$` -> `vue/dist/vue.common.js` (renderer only)

**Externals (not bundled, loaded at runtime from node_modules):**
- Main: `electron`, `@electron/remote`, `electron-updater`, `irsdk-node`, `sharp`
- Renderer: `electron`, `@electron/remote`, `sharp`

**Output:**
- Main: `dist/main.js` (CommonJS2)
- Renderer: `dist/renderer.js` + `dist/renderer.css` + `dist/index.html` (CommonJS2)
- Static: `dist/static/` (copied from `static/`)
- Data: `dist/data/` (copied from `src/data/`)

**Dev Server:**
- Port: 9080
- HMR enabled for renderer
- Main process recompiled and Electron restarted on changes

## Source File Inventory

| File | Lines | Purpose |
|---|---|---|
| `src/main/index.js` | ~970 | Main process entry, IPC hub, screenshot orchestration |
| `src/main/iracing-sdk.js` | ~82 | iRacing SDK bridge singleton |
| `src/main/iracing-sdk-utils.js` | ~45 | Telemetry flattening, camera state decoding |
| `src/main/iracing-sdk-utils.test.js` | -- | Tests for iracing-sdk-utils |
| `src/main/main-utils.js` | ~275 | Object utils, error payloads, ReShade INI, path normalization, camera state |
| `src/main/main-utils.test.js` | -- | Tests for main-utils |
| `src/main/window-utils.js` | ~160 | PowerShell Win32 window manipulation |
| `src/renderer/main.js` | ~72 | Renderer entry, Vue plugin registration |
| `src/renderer/App.vue` | ~23 | Root Vue component (TitleBar + RouterView) |
| `src/renderer/router/index.js` | ~48 | Vue Router config (3 routes) |
| `src/renderer/store/index.js` | ~15 | Vuex store init (empty) |
| `src/renderer/store/modules/index.js` | ~14 | Auto-import Vuex modules |
| `src/renderer/views/Home.vue` | ~591 | Gallery view with carousel, thumbnails, context menu |
| `src/renderer/views/Worker.vue` | ~448 | Desktop capture, image save, ReShade processing |
| `src/renderer/components/SideBar.vue` | ~292 | Resolution selector, screenshot trigger |
| `src/renderer/components/TitleBar.vue` | ~120 | Custom frameless title bar |
| `src/renderer/components/Settings.vue` | ~180 | Settings toolbar, modal containers |
| `src/renderer/components/SettingsModal.vue` | ~420 | Settings form (folder, keybind, reshade, etc.) |
| `src/renderer/components/ChangelogModal.vue` | ~106 | Changelog display from GitHub releases |
| `src/renderer/components/HelpModal.vue` | ~110 | Help/instructions modal |
| `src/renderer/components/PromoCard.vue` | ~118 | Promotional card |
| `src/utilities/config.js` | ~114 | Dual-mode config (electron-store / IPC proxy) |
| `src/utilities/desktop-capture.js` | ~176 | Capture source matching, bounds normalization |
| `src/utilities/desktop-capture.test.js` | -- | Tests for desktop-capture |
| `src/utilities/screenshot-name.js` | ~71 | Filename generation from session info |
| `src/utilities/screenshot-name.test.js` | -- | Tests for screenshot-name |
| `src/renderer/assets/style/main.scss` | ~240 | Global styles, Bulma config, context menu |
| `src/renderer/assets/style/animations.scss` | ~240 | CSS keyframe animations, Vue transitions |
| `src/index.ejs` | ~32 | HTML template for renderer |
| `_scripts/webpack.main.config.js` | ~87 | Webpack config for main process |
| `_scripts/webpack.renderer.config.js` | ~140 | Webpack config for renderer process |
| `_scripts/dev-runner.js` | ~133 | Dev workflow (HMR + Electron restart) |
| `_scripts/build-dev.js` | ~82 | Dev build with version suffix |
| `_scripts/installer.nsh` | ~6 | NSIS installer customization |

---

*Structure analysis: 2026-03-28*
