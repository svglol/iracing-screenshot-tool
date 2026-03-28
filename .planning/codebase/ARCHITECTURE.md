# Architecture

*Generated: 2026-03-28 | Focus: arch*

## Pattern Overview

**Overall:** Electron two-process architecture with a hidden worker renderer for screenshot capture

**Key Characteristics:**
- Classic Electron main + renderer split with `nodeIntegration: true` and `contextIsolation: false`
- Two BrowserWindows: a visible main UI window and a hidden worker window for screenshot capture
- IPC-driven communication between all processes (main, renderer, worker)
- Configuration shared across processes via a dual-mode `electron-store` wrapper
- Windows-only: uses PowerShell P/Invoke for native window manipulation (iRacing process)
- No Vuex store modules defined; Vuex is initialized but effectively unused for state

## Layers

**Main Process (Electron Node.js):**
- Purpose: Application lifecycle, iRacing SDK integration, window management, IPC hub, screenshot orchestration
- Location: `src/main/`
- Contains: App bootstrap, IPC handlers, iRacing bridge, PowerShell window manipulation, ReShade integration, config loading, error reporting
- Depends on: `electron`, `irsdk-node`, `electron-store`, `electron-updater`, `@electron/remote`, `read-ini-file`
- Used by: Both renderer windows via IPC

**Renderer Process (Main Window):**
- Purpose: User-facing UI -- screenshot gallery, resolution selector, settings, help/changelog modals
- Location: `src/renderer/`
- Contains: Vue 2 SPA with router, components, views, SCSS styles
- Depends on: `vue`, `vue-router`, `buefy`, `sharp` (for thumbnails), `electron` IPC
- Used by: End user directly

**Renderer Process (Worker Window):**
- Purpose: Performs actual screenshot capture via `navigator.mediaDevices.getUserMedia` (Chromium desktop capture API) and saves images via `sharp`
- Location: `src/renderer/views/Worker.vue`
- Contains: Desktop capture logic, image processing, file saving, ReShade image handling
- Depends on: `electron` IPC, `sharp`, `src/utilities/desktop-capture.js`, `src/utilities/screenshot-name.js`
- Used by: Main process sends capture requests to it via IPC

**Shared Utilities:**
- Purpose: Cross-process helpers used by both main and renderer processes
- Location: `src/utilities/`
- Contains: Config abstraction, desktop capture source matching, screenshot filename generation
- Depends on: `electron-store`, `electron` IPC
- Used by: Main process and both renderer processes

**Build System:**
- Purpose: Webpack compilation, dev server, electron-builder packaging
- Location: `_scripts/`
- Contains: Webpack configs for main and renderer, dev runner with HMR, build-dev script, NSIS installer customization
- Depends on: `webpack`, `electron-builder`, `webpack-dev-server`
- Used by: npm scripts

## Data Flow

**Standard Screenshot Flow (non-ReShade):**

1. User selects resolution in `SideBar.vue` and clicks "Screenshot" (or presses global hotkey)
2. `SideBar.vue` emits `click` event with `{ width, height, crop }` to parent `Home.vue`
3. `Home.vue.screenshot()` sends IPC `resize-screenshot` to main process
4. Main process (`src/main/index.js`) validates iRacing telemetry is available and worker is ready
5. Main process saves current iRacing window bounds via `getIracingWindowDetails()` (PowerShell call in `src/main/window-utils.js`)
6. Main process hides iRacing UI via `iracing.camControls.setState(CameraState.UIHidden)`
7. Main process resizes iRacing window to target resolution via `resizeIracingWindow()` (PowerShell P/Invoke)
8. Main process sends `session-info`, `telemetry`, and `screenshot-request` to worker window via IPC
9. Worker (`Worker.vue`) invokes `ipcRenderer.invoke('desktop-capturer:get-source-id')` to resolve the Chromium capture source for the iRacing window
10. Main process handler tries multiple matching strategies: window handle, window title, known iRacing title, display fallback
11. Worker uses `navigator.mediaDevices.getUserMedia()` with the resolved source ID to capture the desktop
12. Worker draws the video frame to an `OffscreenCanvas`, optionally cropping the iRacing watermark
13. Worker converts canvas to PNG blob, writes to disk via `sharp`, and creates a webp thumbnail
14. Worker sends `screenshot-response` with the file path back to main process
15. Main process forwards `screenshot-response` to the main window
16. Main process calls `restoreScreenshotState()`: restores iRacing window to original bounds and camera state
17. `Home.vue` receives the file path, prepends to gallery, and copies to clipboard

**ReShade Screenshot Flow:**

1. Steps 1-7 are the same as above
2. Main process detects `config.get('reshade')` is true
3. Main process reads ReShade INI file to determine the screenshot output folder (via `getReshadeScreenshotFolder()` in `src/main/main-utils.js`)
4. Main process calls `waitForReshadeScreenshot()` which watches the folder for new/changed image files using `fs.watch` + polling
5. User manually presses their ReShade screenshot hotkey
6. When a new file appears and settles (stable size), main process resolves with the file path
7. Main process sends `session-info`, `telemetry`, and `screenshot-reshade` to worker
8. Worker processes the ReShade source image (crop if enabled), saves as PNG, creates thumbnail, cleans up source file
9. Worker sends `screenshot-response` back; flow continues as in step 15-17 above

**Configuration Flow:**

1. `src/utilities/config.js` exports different interfaces depending on `process.type`:
   - In the main process: exports an `electron-store` instance directly (reads/writes `config.json` in userData)
   - In renderer processes: exports a proxy that uses synchronous IPC (`config:get` / `config:set`) to read/write through the main process
2. Main process registers `ipcMain.on('config:get')` and `ipcMain.on('config:set')` handlers
3. On config change, main process broadcasts `config:changed:{key}` to all windows
4. Renderer-side `config.onDidChange(key, callback)` listens for these broadcasts

**State Management:**
- Vuex is installed (`src/renderer/store/index.js`) but has no modules defined -- the `src/renderer/store/modules/` directory auto-imports `.js` files but none exist besides `index.js`
- Component state is managed locally in each Vue component's `data()` + `computed` + `watch`
- Application-wide state (config values) flows through the `config` utility
- Screenshot-in-progress state (`takingScreenshot`, `originalWindowBounds`, `cameraState`) is managed as module-level variables in `src/main/index.js`

## Key Abstractions

**IRacingBridge (Singleton):**
- Purpose: Wraps `irsdk-node` SDK, polls for iRacing process status, emits `Connected`/`Disconnected`/`update` events
- Location: `src/main/iracing-sdk.js`
- Pattern: Singleton via `getInstance()`, extends `EventEmitter`, runs an async polling loop (16ms tick for telemetry, 500ms for connection check)
- Exposes: `telemetry` (flattened), `sessionInfo`, `camControls.setState()`, `Consts.CameraState`

**Config Proxy:**
- Purpose: Provides a unified `config.get()`/`config.set()` API that works identically in main and renderer processes
- Location: `src/utilities/config.js`
- Pattern: Process-type detection at module load time; main gets the real store, renderers get an IPC proxy
- Schema defines all config keys with defaults and types

**Desktop Capture Source Resolver:**
- Purpose: Maps an iRacing window handle to a Chromium desktop capture source ID
- Location: `src/utilities/desktop-capture.js` (matching functions) + `src/main/index.js` (`desktop-capturer:get-source-id` IPC handler)
- Pattern: Multi-strategy fallback chain: window handle match -> window title match -> known iRacing title match -> display fallback
- Returns a `captureTarget` object with `id`, `kind` ('window'|'display'), `captureBounds`, `displayBounds`, `diagnostics`

**Window Utils (PowerShell Bridge):**
- Purpose: Gets iRacing window position/size and resizes it via Win32 API calls
- Location: `src/main/window-utils.js`
- Pattern: Synchronous `spawnSync('powershell.exe', ...)` calls with inline C# P/Invoke code
- Two functions: `getIracingWindowDetails()` returns `{ handle, title, left, top, width, height }`, `resizeIracingWindow()` moves/resizes and returns the window handle

## Entry Points

**Main Process Entry:**
- Location: `src/main/index.js`
- Triggers: Electron app launch (webpack output: `dist/main.js`, referenced by `package.json` `"main"` field)
- Responsibilities: Initialize `@electron/remote`, request single instance lock, create windows, load config, set up all IPC handlers, connect iRacing SDK, register global shortcuts, handle auto-updates

**Renderer Entry:**
- Location: `src/renderer/main.js`
- Triggers: Loaded by both the main window and the worker window (same webpack bundle `dist/renderer.js`, different routes)
- Responsibilities: Initialize Vue 2, register plugins (Buefy, VueLazyload, vue-shortkey, vue-markdown-plus, FontAwesome), mount `App.vue` to `#app`

**Router:**
- Location: `src/renderer/router/index.js`
- Routes:
  - `/` -> redirects to `/home`
  - `/home` -> `Home.vue` (main UI with gallery and sidebar)
  - `/worker` -> `Worker.vue` (hidden screenshot capture process)
  - `*` -> redirects to `/home`
- The main window loads `/` (which becomes `/home`), the worker window loads `/#/worker`

**App Ready Handler:**
- Location: `src/main/index.js` lines 512-713
- Triggers: Electron `app.on('ready')` event
- Responsibilities: Set app user model ID, load config, create windows, initialize screen dimensions, register all IPC listeners for screenshot workflow, connect iRacing event handlers, register global shortcut

## Error Handling

**Strategy:** Centralized screenshot error reporting with structured payloads, file-based logging, and UI notification

**Patterns:**

- **Main process errors:** `reportScreenshotError()` in `src/main/index.js` creates a structured payload via `createScreenshotErrorPayload()` from `src/main/main-utils.js`, writes to a log file at `{userData}/logs/screenshot-errors.log`, and sends `screenshot-error` IPC to the main window
- **Worker errors:** `sendScreenshotError()` in `src/renderer/views/Worker.vue` creates a similar structured payload with worker-specific diagnostics and sends `screenshot-error` IPC to the main process, which then routes to `reportScreenshotError()`
- **Error payloads** include: `message`, `stack`, `source` ('main'|'worker'), `context` (string tag), `meta` (arbitrary data), `diagnostics` (system/app/screenshot state)
- **Diagnostics collection:** `buildMainScreenshotDiagnostics()` gathers app version, system info, display info, screenshot state, and iRacing window details; `getWorkerScreenshotDiagnostics()` gathers process/browser info and capture state
- **Config load failure:** `loadConfig()` in `src/main/index.js` catches errors, deletes the corrupt `config.json`, and re-creates the store with defaults
- **General pattern:** Most async operations use try/catch with console.error logging; screenshot-specific errors get the full structured treatment

## Cross-Cutting Concerns

**Logging:**
- Console logging throughout (`console.log`, `console.error`, `console.time`/`console.timeEnd`)
- Structured file logging only for screenshot errors at `{userData}/logs/screenshot-errors.log`
- No general-purpose logging framework

**Validation:**
- Screenshot request validation in main process: checks telemetry availability, worker readiness, window existence
- Config schema validation via `electron-store` schema (type + default for each key)
- Input normalization functions throughout: `normalizeWindowHandle()`, `normalizeCaptureBounds()`, `normalizeWindowTitle()`, `normalizeComparableWindowsPath()`, `sanitizeFilePart()`

**Authentication:**
- Not applicable -- this is a local desktop application with no authentication

**Auto-Updates:**
- `electron-updater` checks for updates on production app ready
- `TitleBar.vue` shows a green download arrow when `update-available` IPC is received
- `install-update` IPC triggers `autoUpdater.quitAndInstall()`

## IPC Channel Reference

| Channel | Direction | Type | Purpose |
|---|---|---|---|
| `config:get` | renderer -> main | `ipcMain.on` (sync) | Read config value |
| `config:set` | renderer -> main | `ipcMain.on` (sync) | Write config value |
| `config:changed:{key}` | main -> renderers | `webContents.send` | Broadcast config change |
| `app:getPath-sync` | renderer -> main | `ipcMain.on` (sync) | Get Electron app path |
| `dialog:showOpen` | renderer -> main | `ipcMain.handle` (async) | Show file/folder picker |
| `desktop-capturer:get-source-id` | worker -> main | `ipcMain.handle` (async) | Resolve capture source |
| `window-control` | renderer -> main | `ipcMain.on` | Minimize/maximize/close |
| `resize-screenshot` | renderer -> main | `ipcMain.on` | Initiate screenshot |
| `screenshot-request` | main -> worker | `webContents.send` | Capture screenshot |
| `screenshot-reshade` | main -> worker | `webContents.send` | Process ReShade file |
| `screenshot-response` | worker -> main -> renderer | `ipcMain.on` + forward | Screenshot complete |
| `screenshot-finished` | worker -> main | `ipcMain.on` | Restore window state |
| `screenshot-error` | worker -> main -> renderer | `ipcMain.on` + forward | Screenshot failure |
| `session-info` | main -> worker | `webContents.send` | iRacing session data |
| `telemetry` | main -> worker | `webContents.send` | iRacing telemetry data |
| `iracing-connected` | main -> renderer | `webContents.send` | iRacing detected |
| `iracing-disconnected` | main -> renderer | `webContents.send` | iRacing lost |
| `iracing-status` | main -> renderer | `event.reply` | Response to status request |
| `request-iracing-status` | renderer -> main | `ipcMain.on` | Check iRacing connection |
| `hotkey-screenshot` | main -> renderer | `webContents.send` | Global shortcut fired |
| `screenshotKeybind-change` | renderer -> main | `ipcMain.on` | Update hotkey registration |
| `defaultScreen{Width,Height,Left,Top}` | renderer -> main | `ipcMain.on` | Update default screen dims |
| `install-update` | renderer -> main | `ipcMain.on` | Trigger auto-update install |
| `update-available` | main -> renderer | `webContents.send` | Update downloaded |

---

*Architecture analysis: 2026-03-28*
