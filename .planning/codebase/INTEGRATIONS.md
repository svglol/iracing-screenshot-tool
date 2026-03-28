# External Integrations

*Generated: 2026-03-28 | Focus: tech*

## APIs & External Services

**iRacing SDK (Primary Integration):**
- SDK: `irsdk-node` `^4.4.0` with native addon `@irsdk-node/native` `^5.4.0`
- Binding type: C++ N-API addon compiled via node-gyp (`binding.gyp`), prebuilds for `win32-x64` and `win32-arm64`
- Bridge: `src/main/iracing-sdk.js` - Singleton `IRacingBridge` class extending `EventEmitter`
- Connection model: Polling loop that checks `IRacingSDK.IsSimRunning()` every 500ms when disconnected, 16ms when connected
- Data access:
  - `sdk.getSessionData()` - Session info (track, drivers, weekend info) via YAML parsing
  - `sdk.getTelemetry()` - Real-time telemetry (camera state, car indices) via shared memory
  - `sdk.changeCameraState(state)` - Camera control (hide UI for screenshots)
  - `sdk.waitForData(16)` - Blocking wait for new telemetry frame
- Events emitted: `Connected`, `Disconnected`, `update`
- Telemetry processing: `src/main/iracing-sdk-utils.js` flattens raw telemetry, decodes camera state bitmask into named states
- Windows-only: Relies on iRacing's shared memory interface (memory-mapped files)

**GitHub Releases (Auto-Update):**
- SDK: `electron-updater` `^6.8.3`
- Checks for updates on production app ready (`autoUpdater.checkForUpdates()`)
- Event: `update-downloaded` triggers UI notification via IPC to renderer
- Install: `autoUpdater.quitAndInstall()` via `install-update` IPC channel
- Repository: `svglol/iracing-screenshot-tool` (configured in `package.json`)

**ARMS Tools (Installer Promotion):**
- URL: `https://armediasolutions.net/tools/irst`
- Opened in default browser during NSIS installation (non-silent installs only)
- Implementation: `_scripts/installer.nsh` using `${StdUtils.ExecShellAsUser}`

## Native Modules & FFI

**irsdk-node / @irsdk-node/native:**
- Type: N-API C++ addon
- Build: `binding.gyp` with node-gyp (requires Visual Studio Build Tools)
- Prebuilds: `win32-x64`, `win32-arm64` in `node_modules/@irsdk-node/native/prebuilds/`
- Rebuild: `electron-rebuild -f --which-module irsdk-node` (postinstall hook)
- Accesses iRacing's shared memory (`IRacingSDK`) for telemetry and session data
- Dependencies: `js-yaml` (YAML session data parsing), `module-alias`

**sharp:**
- Type: Native image processing library (libvips bindings)
- Rebuild: `electron-rebuild -f --which-module sharp` (postinstall hook)
- Usage locations:
  - `src/renderer/views/Worker.vue` - Screenshot saving, cropping, ReShade image processing
  - `src/renderer/views/Home.vue` - Thumbnail generation (1280x720 WebP)
- Operations used: `resize()`, `extract()` (crop), `toFile()`, `metadata()`
- Cache: Explicitly disabled during screenshot saves (`sharp.cache(false)`)

**PowerShell / Win32 API (Window Management):**
- Implementation: `src/main/window-utils.js`
- Invocation: `child_process.spawnSync('powershell.exe', ...)` with inline C# type definitions
- Win32 functions used via P/Invoke:
  - `user32.dll!GetWindowRect` - Get iRacing window position/size
  - `user32.dll!SetWindowPos` - Resize/reposition iRacing window for high-res capture
  - `user32.dll!ShowWindow` - Restore window
  - `user32.dll!BringWindowToTop`, `SetForegroundWindow`, `SetFocus`, `SetActiveWindow` - Ensure window is focused
- Target process: `iRacingSim64DX11` (hardcoded)
- Functions exported:
  - `getIracingWindowDetails()` - Returns `{ handle, title, left, top, width, height }`
  - `resizeIracingWindow(width, height, left, top)` - Repositions and returns handle

## IPC Mechanisms (Electron Main/Renderer)

**Synchronous IPC (ipcMain.on / sendSync):**
| Channel | Direction | Purpose | File |
|---------|-----------|---------|------|
| `config:get` | renderer -> main | Read config value | `src/main/index.js` |
| `config:set` | renderer -> main | Write config value, broadcasts change | `src/main/index.js` |
| `app:getPath-sync` | renderer -> main | Get Electron app path | `src/main/index.js` |
| `window-control` | renderer -> main | Close/minimize/maximize window | `src/main/index.js` |

**Asynchronous IPC (ipcMain.handle / invoke):**
| Channel | Direction | Purpose | File |
|---------|-----------|---------|------|
| `dialog:showOpen` | renderer -> main | Show native folder picker | `src/main/index.js` |
| `desktop-capturer:get-source-id` | renderer -> main | Resolve desktop capture source for screenshot | `src/main/index.js` |

**Event IPC (webContents.send / ipcRenderer.on):**
| Channel | Direction | Purpose | File |
|---------|-----------|---------|------|
| `resize-screenshot` | renderer -> main | Trigger screenshot capture | `src/main/index.js` |
| `screenshot-request` | main -> worker | Request worker to capture and save | `src/main/index.js` |
| `screenshot-reshade` | main -> worker | Send ReShade screenshot file for processing | `src/main/index.js` |
| `screenshot-response` | worker -> main -> renderer | Screenshot saved, notify UI | `src/main/index.js`, `src/renderer/views/Worker.vue` |
| `screenshot-finished` | worker -> main | Capture complete, restore window | `src/main/index.js` |
| `screenshot-error` | worker -> main | Report screenshot failure | `src/main/index.js` |
| `session-info` | main -> worker | Forward iRacing session data | `src/main/index.js` |
| `telemetry` | main -> worker | Forward iRacing telemetry | `src/main/index.js` |
| `iracing-connected` | main -> renderer | iRacing connected notification | `src/main/index.js` |
| `iracing-disconnected` | main -> renderer | iRacing disconnected notification | `src/main/index.js` |
| `request-iracing-status` | renderer -> main | Poll iRacing connection status | `src/main/index.js` |
| `iracing-status` | main -> renderer | Reply with connection status | `src/main/index.js` |
| `hotkey-screenshot` | main -> renderer | Global shortcut triggered | `src/main/index.js` |
| `screenshotKeybind-change` | renderer -> main | Update global shortcut | `src/main/index.js` |
| `update-available` | main -> renderer | Auto-update downloaded | `src/main/index.js` |
| `install-update` | renderer -> main | Trigger update install | `src/main/index.js` |
| `config:changed:{key}` | main -> all windows | Config value changed broadcast | `src/main/index.js` |
| `screenshot-error` | main -> renderer | Error details for UI display | `src/main/index.js` |

**Config Bridge Pattern:**
- `src/utilities/config.js` exports different interfaces based on `process.type`:
  - Main process: Direct `electron-store` instance
  - Renderer process: IPC proxy that uses `sendSync` for `get`/`set` and `ipcRenderer.on` for change listeners
- Allows both processes to use `config.get(key)` / `config.set(key, value)` transparently

## Image Processing Pipeline

**Standard Screenshot Flow:**
1. User triggers via hotkey (global shortcut) or UI button
2. Main process (`src/main/index.js`):
   - Saves original iRacing window bounds
   - Hides iRacing UI (`CameraState.UIHidden`)
   - Resizes iRacing window to target resolution via PowerShell/Win32 (`src/main/window-utils.js`)
   - Sends `screenshot-request` to worker with `{ width, height, crop, windowID, captureBounds }`
3. Worker process (`src/renderer/views/Worker.vue`):
   - Requests desktop capture source ID via `desktop-capturer:get-source-id` IPC
   - Source resolution: window handle match -> title match -> known iRacing title -> display fallback
   - Captures via `navigator.mediaDevices.getUserMedia()` with `chromeMediaSource: 'desktop'`
   - Renders video frame to `OffscreenCanvas`
   - Optional crop: removes 54px right, 30px bottom (iRacing UI padding)
   - Converts canvas to PNG blob
   - Saves to disk via `fs.promises.writeFile()`
   - Generates WebP thumbnail (1280x720) via `sharp`
4. Main process restores iRacing window to original position and camera state

**ReShade Screenshot Flow:**
1. Main process resizes window and hides UI (same as standard)
2. Main process (`src/main/index.js`):
   - Reads ReShade `.ini` file (`read-ini-file`) to find screenshot folder
   - Resolves screenshot folder with environment variable expansion and user profile remapping (`src/main/main-utils.js`)
   - Watches folder via `fs.watch()` + polling (500ms) for new file
   - Waits for file to settle (stable size for ~250ms, 12 attempts)
   - Sends file path to worker via `screenshot-reshade` IPC
3. Worker process:
   - Loads image via `sharp`, reads metadata
   - Optional crop: `extract({ left: 0, top: 0, width: width-54, height: height-30 })`
   - Saves as PNG to screenshot folder
   - Cleans up source ReShade file (if different from destination)
   - Generates WebP thumbnail

**Desktop Capture Source Resolution (`src/utilities/desktop-capture.js`):**
- Strategy chain (in priority order):
  1. `findSourceByWindowHandles()` - Match by Chromium window handle ID (freshly queried + originally requested)
  2. `findSourceByWindowTitle()` - Match by exact or partial window title
  3. `findSourceByKnownIracingTitle()` - Match against known titles: `"iracing.com simulator"`, `"iracing simulator"`
  4. `findDisplaySourceByDisplayId()` - Fall back to full display capture at matching monitor
- Display capture applies coordinate mapping via `resolveDisplayCaptureRect()` to extract the window region from the display

**Screenshot Naming (`src/utilities/screenshot-name.js`):**
- Format: `{TrackName}-{ConfigName}-{DriverName}-{count}.png`
- Track info from iRacing session data (`WeekendInfo.TrackDisplayName`, `TrackConfigName`)
- Driver name from `DriverInfo.Drivers[]` (team name if team racing, selected camera driver otherwise)
- Deduplication: increments count until filename is unique

## File System Interactions

**Application Data:**
- Config: `%APPDATA%/iRacing Screenshot Tool/config.json` (via `electron-store`)
- Cache: `%APPDATA%/iRacing Screenshot Tool/Cache/` (WebP thumbnails)
- Error logs: `%APPDATA%/iRacing Screenshot Tool/logs/screenshot-errors.log`

**User Data:**
- Screenshots: Default `%USERPROFILE%/Pictures/Screenshots/` (configurable)
- ReShade screenshots: Configurable via ReShade `.ini` (default `C:\Program Files (x86)\iRacing\`)
- ReShade config: Default `C:\Program Files (x86)\iRacing\ReShade.ini` (configurable)

**File Operations:**
- `fs.mkdirSync(path, { recursive: true })` - Ensure directories exist
- `fs.promises.writeFile()` - Save screenshots
- `fs.promises.readdir()` - List gallery and ReShade screenshot files
- `fs.promises.stat()` - File modification times, sizes
- `fs.promises.unlink()` - Clean up ReShade source files, stale thumbnails
- `fs.existsSync()` - Check file/thumbnail existence
- `fs.watch()` - Watch ReShade screenshot folder for new files
- `fs.appendFileSync()` - Append to screenshot error log
- `shell.trashItem()` - Move screenshots to recycle bin (delete action)
- `shell.openPath()` - Open files externally
- `shell.showItemInFolder()` - Show in Explorer

## Data Storage

**Databases:**
- None (no database)

**Persistent Config:**
- `electron-store` `^5.1.1` - JSON file with schema validation
- Location: `%APPDATA%/iRacing Screenshot Tool/config.json`
- Schema defined in `src/utilities/config.js` with defaults for all keys

**File Storage:**
- Screenshots saved as PNG to user-configured folder
- Thumbnails as WebP to `%APPDATA%/iRacing Screenshot Tool/Cache/`
- Gallery loads only `.png` files from screenshot folder

**Caching:**
- Thumbnail cache: WebP files in app userData Cache directory
- Stale thumbnails cleaned up when gallery reloads (`cleanupThumbnailCache()`)
- Thumbnail generation: concurrent (4 workers) background task

## Authentication & Identity

**Auth Provider:**
- None. The application is a local desktop tool with no authentication.
- iRacing SDK uses shared memory (no auth needed when iRacing is running on the same machine).

## Monitoring & Observability

**Error Tracking:**
- Custom screenshot error reporting system in `src/main/index.js`:
  - `reportScreenshotError()` creates structured error payloads with diagnostics
  - Logs to `%APPDATA%/iRacing Screenshot Tool/logs/screenshot-errors.log`
  - Sends error payload to renderer for UI display
  - Includes extensive diagnostics: system info, displays, capture state, iRacing status

**Logs:**
- `console.log` / `console.error` throughout
- `console.time` / `console.timeEnd` for screenshot performance timing in `Worker.vue`
- Structured error log file for screenshot failures with full diagnostic context

## CI/CD & Deployment

**Hosting:**
- GitHub repository: `svglol/iracing-screenshot-tool`
- Distribution: GitHub Releases (via `electron-updater`)

**CI Pipeline:**
- No CI configuration detected (no `.github/workflows/`, no `.travis.yml`, etc.)
- Build/publish: `npm run build-publish` (manual, uses `electron-builder --publish always`)

**Installer:**
- NSIS installer for Windows (`_scripts/installer.nsh`)
- Portable executable also generated
- Custom installer step opens ARMS tools URL in browser

## Environment Configuration

**Required env vars (development):**
- `NODE_ENV=development` (set by dev-runner script)

**Optional env vars:**
- `RENDERER_REMOTE_DEBUGGING` - Enable remote debugging ports (9222, 9223)

**No secrets or API keys required.** The application is entirely local, connecting only to:
1. iRacing via shared memory (local)
2. GitHub for auto-updates (public, no auth)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-03-28*
