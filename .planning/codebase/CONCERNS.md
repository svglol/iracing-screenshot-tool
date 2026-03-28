# CONCERNS
*Generated: 2026-03-28 | Focus: concerns*

## Tech Debt

**Vue 2 End-of-Life Frontend:**
- Issue: The entire renderer is built on Vue 2 (`vue@^2.7.16`) which reached end-of-life on December 31, 2023. The ecosystem packages (`vue-router@^3.6.5`, `buefy@^0.9.29`, `vue-loader@^15.11.1`, `vue-template-compiler@^2.7.16`, `vuex` via store) are all Vue 2-only.
- Files: `package.json`, `src/renderer/main.js`, all `src/renderer/**/*.vue`
- Impact: No security patches, no new features, shrinking community support. Buefy (the UI framework) has no Vue 3 version - migration requires switching to Oruga or another framework entirely.
- Fix approach: Migrate to Vue 3 + Vite + a Vue 3-compatible UI library (e.g., Oruga, PrimeVue). This is a major rewrite of the renderer.

**Legacy Build Tooling (Babel + Webpack for a JS Codebase):**
- Issue: The project uses Babel with TypeScript presets (`@babel/preset-typescript`) and TypeScript-ESLint plugins (`@typescript-eslint/eslint-plugin@^2.25.0`, `@typescript-eslint/parser@^2.25.0`) despite the entire codebase being plain JavaScript. The `tsconfig.json` exists but only covers `src/utilities` and has `noEmit: true`. TypeScript v3.8.3 is listed as a devDependency but provides no type checking benefit.
- Files: `package.json`, `tsconfig.json`, `_scripts/webpack.main.config.js`, `_scripts/webpack.renderer.config.js`
- Impact: Unnecessary complexity in the build pipeline. Developers may assume TypeScript support exists when it does not. The TS-ESLint plugins at v2.x are severely outdated.
- Fix approach: Either remove all TypeScript-related config and dependencies, or commit to actually migrating to TypeScript for type safety.

**Outdated ESLint Ecosystem:**
- Issue: ESLint v7 with `eslint-config-standard@^14.1.1`, `eslint-plugin-promise@^4.2.1`, `eslint-plugin-standard@^4.0.1`, and `eslint-plugin-vue@^6.2.2` are all multiple major versions behind. `eslint-plugin-standard` is deprecated entirely.
- Files: `package.json`, `.eslintrc.js`
- Impact: Missing modern linting rules, potential incompatibilities with newer Node versions.
- Fix approach: Upgrade to ESLint 9+ flat config, replace `eslint-config-standard` with `@eslint/js`, update `eslint-plugin-vue` to v9+.

**Stale Jest Configuration:**
- Issue: Jest v25.3.0 is installed (current is v29+). No `jest.config.js` file exists, so Jest relies entirely on defaults. The test script uses `--passWithNoTests` which silently passes when tests are not found.
- Files: `package.json`
- Impact: Missing modern Jest features (better ESM support, improved snapshots, faster execution). Tests may silently not run if file discovery fails.
- Fix approach: Upgrade Jest to v29+, add explicit `jest.config.js` with `testMatch` and `transform` configuration.

**Bundled Node 12 in `.tools` Directory:**
- Issue: A full Node.js v12.22.12 distribution is bundled in `.tools/node-v12.22.12-win-x64/`. Node 12 reached end-of-life in April 2022. The `.nvmrc` specifies Node 24.12.0 for development, so this bundled Node 12 appears to be leftover cruft.
- Files: `.tools/node-v12.22.12-win-x64/`
- Impact: Wastes disk space, could confuse developers or CI if accidentally used. `.gitignore` excludes `.tools/` so it is not committed, but it persists locally.
- Fix approach: Delete `.tools/node-v12.22.12-win-x64/` and `.tools/npm-8.19.4/` if they are not used by any build scripts.

**Abandoned TODO in Vuex Store:**
- Issue: `vuex-persistedstate` plugin is imported but commented out with `// TODO: Enable when deploy` since an unknown date.
- Files: `src/renderer/store/index.js` (line 13)
- Impact: Dead code. The store module system exists but may not be providing meaningful value if persistence was the intended use case.
- Fix approach: Either enable the plugin or remove the commented code and the Vuex dependency if state persistence is not needed.

## Security Concerns

**Electron Security Model Fully Disabled:**
- Risk: Both the main window and worker window are created with `nodeIntegration: true`, `contextIsolation: false`, and `webSecurity: false`. This is the least secure Electron configuration possible.
- Files: `src/main/index.js` (lines 269-273, 306-309)
- Current mitigation: The app does not load remote/untrusted content in production. It loads local files or `localhost` in dev.
- Recommendations: Migrate to `contextIsolation: true` with a proper `preload.js` script using `contextBridge.exposeInMainWorld()`. This requires refactoring all `require('electron')` calls in renderer code to use IPC instead. Set `webSecurity: true`. This is a significant refactor but is the Electron team's #1 security recommendation.

**Synchronous IPC Calls Block the Renderer:**
- Risk: `ipcRenderer.sendSync()` is used for config reads/writes and `app:getPath-sync` in multiple renderer files. Synchronous IPC blocks the entire renderer process until the main process responds.
- Files: `src/utilities/config.js` (lines 93, 96), `src/renderer/views/Home.vue` (line 116), `src/renderer/views/Worker.vue` (line 20), `src/renderer/components/Settings.vue` (line 66), `src/renderer/components/ChangelogModal.vue` (line 20)
- Current mitigation: The main process handlers are fast (config reads from memory).
- Recommendations: Replace `sendSync` with `invoke`/`handle` async pattern for all IPC communication. The config proxy in `src/utilities/config.js` would need an async API.

**No Input Validation on IPC Handlers:**
- Risk: IPC handlers in `src/main/index.js` accept arbitrary keys for `config:get` and `config:set` without validation. The `app:getPath-sync` handler passes user-supplied `name` directly to `app.getPath()`.
- Files: `src/main/index.js` (lines 348-365)
- Current mitigation: Only renderer code that the app itself controls sends these messages. With `nodeIntegration: true`, the renderer already has full Node.js access, so this is not an additional attack surface beyond the existing security model.
- Recommendations: Add allowlists for config keys and `app.getPath` names. This becomes critical if `contextIsolation` is enabled.

**Global `process.env.ELECTRON_DISABLE_SECURITY_WARNINGS` Set to `false`:**
- Risk: Line 67 of `src/main/index.js` sets this to `false` (which is actually the string `"false"` due to JS truthiness). This actually disables the warnings because any non-empty string is truthy. Likely a bug - the intent appears to be enabling warnings.
- Files: `src/main/index.js` (line 67)
- Current mitigation: None. Security warnings are silenced.
- Recommendations: Remove this line entirely (warnings are shown by default) or set to `''` to keep them enabled.

## Performance Bottlenecks

**Synchronous PowerShell Spawning for Window Management:**
- Problem: `resizeIracingWindow()` and `getIracingWindowDetails()` use `spawnSync('powershell.exe', ...)` which blocks the main process thread. Each call starts a new PowerShell process, loads the .NET `Add-Type` compilation, executes P/Invoke calls, and exits. PowerShell startup alone takes 200-500ms.
- Files: `src/main/window-utils.js` (lines 48, 133)
- Cause: PowerShell cold start is slow. The `Add-Type` C# compilation happens on every call. During screenshot flows, `getIracingWindowDetails()` is called from `ipcMain.handle('desktop-capturer:get-source-id')` on the main thread.
- Improvement path: Use a native Node.js addon (e.g., `ffi-napi` or a custom N-API module) to call Win32 APIs directly without PowerShell. Alternatively, keep a persistent PowerShell child process and send commands via stdin/stdout.

**Blocking `loadIniFile.sync()` During Screenshot Flow:**
- Problem: ReShade INI parsing uses `loadIniFile.sync()` on line 632 of `src/main/index.js`, blocking the main process during the screenshot capture flow.
- Files: `src/main/index.js` (line 632)
- Cause: Synchronous file I/O.
- Improvement path: Use the async version `loadIniFile()` (returns a promise).

**Config Load Error Handling Deletes and Reloads:**
- Problem: `loadConfig()` in `src/main/index.js` (lines 953-959) catches any config error by deleting `config.json` via `fs.unlinkSync()` and re-requiring the module. This destroys all user settings on any corruption.
- Files: `src/main/index.js` (lines 953-959)
- Cause: Aggressive error recovery without attempting repair.
- Improvement path: Attempt to parse and repair the config, or create a backup before deletion. Log what was lost.

**1-Second Hard Delay Before Every Screenshot Capture:**
- Problem: `fullscreenScreenshot()` in `Worker.vue` has `await delay(1000)` (line 364) before starting the desktop capture. This is a fixed wait regardless of whether the iRacing window has finished resizing.
- Files: `src/renderer/views/Worker.vue` (line 364)
- Cause: Likely a workaround to ensure the iRacing window has settled after resize.
- Improvement path: Poll for the window to reach the expected size using `getIracingWindowDetails()` instead of a fixed delay.

## Fragile Areas

**Main Process Index.js (974 lines):**
- Files: `src/main/index.js`
- Why fragile: This single file contains the app lifecycle, window creation, all IPC handlers, screenshot orchestration, ReShade file watching, config management, error reporting, and auto-update logic. Mutable module-level state (`width`, `height`, `left`, `top`, `takingScreenshot`, `originalWindowBounds`, `cameraState`, `config`, `mainWindow`, `workerWindow`, `workerReady`, `cancelReshadeWait`) creates implicit coupling between all these responsibilities.
- Safe modification: Extract IPC handlers into separate modules. The recent `main-utils.js` extraction is a good pattern to follow. Move screenshot orchestration, ReShade watching, and auto-update logic into their own modules.
- Test coverage: Zero unit tests for `src/main/index.js`. All logic in this file is tested only through manual/integration testing.

**Screenshot State Machine Has No Formal States:**
- Files: `src/main/index.js` (lines 55-58), `src/renderer/views/Worker.vue`, `src/renderer/components/SideBar.vue`
- Why fragile: The screenshot flow spans main process and two renderer processes, coordinated entirely through IPC events and a boolean `takingScreenshot` flag. There is no timeout or recovery if the worker never responds. If the worker crashes mid-screenshot, `takingScreenshot` remains `true` forever (until `screenshot-error` or `screenshot-finished` arrives, which it never will from a crashed worker).
- Safe modification: Add a timeout in the main process that calls `restoreScreenshotState()` after a configurable maximum duration. Consider a proper state machine with explicit transitions.
- Test coverage: None.

**Window Handle Matching Cascade:**
- Files: `src/main/index.js` (lines 370-484), `src/utilities/desktop-capture.js`
- Why fragile: The `desktop-capturer:get-source-id` handler uses a four-stage fallback cascade (handle match, title match, known title, display fallback) to find the iRacing window. Each stage has different assumptions. If Electron changes its desktop capturer source ID format, the `window:{handle}:` prefix matching in `findSourceByWindowHandles()` breaks silently.
- Safe modification: Add integration tests that verify the source ID format assumptions. Log which strategy succeeded for telemetry.
- Test coverage: `src/utilities/desktop-capture.test.js` covers the utility functions but not the IPC handler integration.

## Duplicate Code

**`isPlainObject` and `mergePlainObjects` Duplicated Across 3 Files:**
- Issue: These two utility functions are independently implemented in `src/main/main-utils.js`, `src/utilities/desktop-capture.js`, and `src/renderer/views/Worker.vue`. The implementations are functionally identical.
- Files: `src/main/main-utils.js` (lines 8-39), `src/utilities/desktop-capture.js` (lines 5-7, minimal version), `src/renderer/views/Worker.vue` (lines 30-61)
- Impact: Bug fixes must be applied in three places. Drift between implementations is likely.
- Fix approach: Create a shared `src/utilities/objects.js` module exporting both functions. Import from that single source everywhere.

**`createScreenshotErrorPayload` Duplicated Between Main and Worker:**
- Issue: Error payload creation logic exists in both `src/main/main-utils.js` and `src/renderer/views/Worker.vue` with slightly different signatures and behavior.
- Files: `src/main/main-utils.js` (lines 75-106), `src/renderer/views/Worker.vue` (lines 93-121)
- Impact: The two implementations may produce inconsistently structured error payloads.
- Fix approach: Move to a shared utility that can be imported by both main and renderer processes.

## Platform Concerns

**Windows-Only Application:**
- Issue: The application is inherently Windows-only due to its dependency on `irsdk-node` (iRacing shared memory API), PowerShell-based window management, and Windows-specific path handling throughout.
- Files: `src/main/window-utils.js` (PowerShell scripts), `src/main/main-utils.js` (Win32 path handling), `src/utilities/config.js` (hardcoded `\\` path separator on line 5), `package.json` (only `win` build target)
- Impact: Cannot run on macOS or Linux. This is an inherent constraint of iRacing itself, so not a bug, but code should not pretend to handle cross-platform cases it will never encounter.
- Recommendations: The `app.on('window-all-closed')` handler in `src/main/index.js` (line 715-719) checks `process.platform !== 'darwin'`, which is dead code. Similarly, `app.on('activate')` (line 721-725) is a macOS-only event. Remove these platform branches to reduce confusion.

**Hardcoded Windows Path Separator in Config Default:**
- Issue: `src/utilities/config.js` line 5 uses `homedir + '\\Pictures\\Screenshots\\'` with hardcoded backslash separators instead of `path.join()`.
- Files: `src/utilities/config.js` (line 5)
- Impact: Minor - the app only runs on Windows. But it violates the pattern used everywhere else in the codebase.
- Fix approach: Use `path.join(homedir, 'Pictures', 'Screenshots')`.

**Hardcoded ReShade Default Path:**
- Issue: `src/utilities/config.js` line 87 hardcodes `'C:\\Program Files (x86)\\iRacing\\ReShade.ini'` as the default ReShade path. iRacing can be installed anywhere.
- Files: `src/utilities/config.js` (line 87)
- Impact: Users with non-default iRacing installations must manually configure the ReShade path.
- Fix approach: Attempt to detect the iRacing installation path from the registry or common locations at runtime.

## Magic Numbers

**Crop Watermark Dimensions (54x30):**
- Issue: The values `54` and `30` are hardcoded in multiple places as the iRacing watermark size to crop. There is no explanation of where these values come from or whether they change with resolution/UI scaling.
- Files: `src/renderer/views/Worker.vue` (lines 239, 309-310), `src/renderer/components/SideBar.vue` (lines 189-190)
- Impact: If iRacing changes its watermark size, multiple files need updating. No documentation explains the source of these values.
- Fix approach: Extract to named constants in a shared module: `const IRACING_WATERMARK_WIDTH = 54; const IRACING_WATERMARK_HEIGHT = 30;`

**Resolution Presets in Switch Statement:**
- Issue: Resolution presets (1080p=1920x1080, 2k=2560x1440, etc.) are defined as a switch statement with magic numbers rather than a data structure.
- Files: `src/renderer/components/SideBar.vue` (lines 151-187)
- Impact: Hard to maintain, easy to introduce typos.
- Fix approach: Define as a `const RESOLUTION_PRESETS = { '1080p': { width: 1920, height: 1080 }, ... }` map.

## Uncommitted / In-Progress Work

**Modified and Untracked Files in Working Tree:**
- Issue: Git status shows active work that has not been committed:
  - Modified: `src/main/index.js`, `src/main/iracing-sdk.js`
  - New (untracked): `src/main/iracing-sdk-utils.js`, `src/main/iracing-sdk-utils.test.js`, `src/main/main-utils.js`, `src/main/main-utils.test.js`
- Impact: The new files (`main-utils.js`, `iracing-sdk-utils.js`) represent an in-progress refactoring that extracted pure functions from `index.js` and `iracing-sdk.js` into testable utility modules. The modified `index.js` imports from these new modules. This is a positive change but is incomplete - the code is in a transitional state where new patterns coexist with old patterns.
- Risk: If someone else pulls the repo and builds, they will not have these files. The build will fail because `index.js` imports from `./main-utils` and `./iracing-sdk-utils` which do not exist in the committed codebase.
- Fix approach: Commit the refactoring work as a cohesive changeset. Continue extracting more logic from `index.js` following the same pattern.

## Dependencies at Risk

**`@electron/remote` (Deprecated Pattern):**
- Risk: `@electron/remote` is the extracted version of Electron's deprecated `remote` module. The Electron team discourages its use due to performance (synchronous IPC under the hood) and security concerns.
- Files: `package.json`, `src/main/index.js` (lines 3, 69, 277, 313)
- Impact: Each `remote` call from the renderer triggers synchronous IPC. Future Electron versions may drop compatibility.
- Migration plan: Replace with explicit `ipcMain.handle()` / `ipcRenderer.invoke()` patterns. The codebase already partially does this (e.g., `dialog:showOpen`).

**`electron-store@^5.1.1` (Old Major Version):**
- Risk: Current version is 8+. Version 5 lacks ESM support, conf v10+ features, and migration utilities.
- Files: `package.json`, `src/utilities/config.js`
- Impact: Missing features. The aggressive `fs.unlinkSync` error recovery in `loadConfig()` may be unnecessary with newer versions that handle schema migration better.
- Migration plan: Upgrade to electron-store v8+. Review schema migration support.

**`image-size@^0.8.3` (Very Old):**
- Risk: Current version is 2.x. Version 0.8.x is multiple major versions behind.
- Files: `package.json`, `src/renderer/views/Home.vue` (line 112)
- Impact: May have unfixed bugs for newer image formats.
- Migration plan: Upgrade to `image-size@^2.0.0`. API may have minor changes.

**`babel-runtime@^6.26.0` (Legacy):**
- Risk: This is the Babel 6 runtime, superseded by `@babel/runtime` (Babel 7+). The project already uses Babel 7 (`@babel/core@^7.9.0`).
- Files: `package.json`
- Impact: Dead dependency adding unnecessary weight.
- Migration plan: Remove `babel-runtime` from dependencies. If any code references it, replace with `@babel/runtime`.

## Test Coverage Gaps

**No Tests for Main Process Orchestration:**
- What's not tested: The entire `src/main/index.js` file (974 lines) has zero test coverage. This includes window creation, IPC handler registration, screenshot flow orchestration, ReShade file watching (`waitForReshadeScreenshot`, `findLatestReshadeScreenshot`, `waitForFileToSettle`, `listReshadeScreenshotFiles`), and state management.
- Files: `src/main/index.js`
- Risk: Regressions in screenshot capture flow, window management, or error handling go undetected. The ReShade waiting logic is particularly complex with race conditions.
- Priority: High - this is the core business logic of the application.

**No Tests for Window Utils (PowerShell Integration):**
- What's not tested: `resizeIracingWindow()` and `getIracingWindowDetails()` are untested because they require a running iRacing process and Windows environment.
- Files: `src/main/window-utils.js`
- Risk: PowerShell script generation with string interpolation (injecting `width`, `height`, `left`, `top` directly into script strings) is untested for edge cases like negative coordinates or very large values.
- Priority: Medium - the PowerShell script template interpolation should at least be validated.

**No Tests for Renderer Components:**
- What's not tested: All Vue components (`src/renderer/**/*.vue`) have no unit or component tests.
- Files: `src/renderer/views/Home.vue`, `src/renderer/views/Worker.vue`, `src/renderer/components/SideBar.vue`, `src/renderer/components/Settings.vue`
- Risk: UI regressions, broken event handlers, gallery loading bugs go undetected.
- Priority: Medium - the Worker.vue screenshot capture flow is critical path code with zero tests.

**Good Coverage on Extracted Utilities:**
- The recently extracted utility modules have thorough test suites:
  - `src/main/main-utils.test.js` (707 lines) covers all functions in `main-utils.js`
  - `src/main/iracing-sdk-utils.test.js` (173 lines) covers telemetry flattening and camera state decoding
  - `src/utilities/desktop-capture.test.js` (539 lines) covers desktop capture utilities
  - `src/utilities/screenshot-name.test.js` (333 lines) covers file naming
- This is the right pattern to continue: extract pure logic from monolithic files into testable modules.

## Build/Tooling Concerns

**Webpack-Only Build with No Dev Server HMR for Main Process:**
- Issue: The dev runner (`_scripts/dev-runner.js`) manages two webpack builds (main + renderer). The renderer gets HMR via webpack-dev-server, but main process changes require a full restart.
- Files: `_scripts/webpack.main.config.js`, `_scripts/webpack.renderer.config.js`
- Impact: Slow development iteration for main process changes.
- Fix approach: Consider using `electron-vite` or Vite for faster builds and better DX.

**`node-loader` for `.node` Native Modules:**
- Issue: Both webpack configs include a `node-loader` rule for `.node` files. Native modules (`irsdk-node`, `sharp`) are already externalized. The `node-loader` rule may only be needed for edge cases.
- Files: `_scripts/webpack.main.config.js` (line 31), `_scripts/webpack.renderer.config.js` (line 38)
- Impact: Minor - unused rules add no runtime cost but add build config complexity.

**Electron Rebuild on Every `npm install`:**
- Issue: The `postinstall` script runs `electron-builder install-app-deps` and `electron-rebuild -f --which-module irsdk-node,sharp` sequentially. This makes every `npm install` slow.
- Files: `package.json` (lines 138)
- Impact: 30-60 second overhead on every dependency install. New developers experience long setup times.
- Fix approach: Make rebuild a separate manual step or cache rebuild artifacts.
