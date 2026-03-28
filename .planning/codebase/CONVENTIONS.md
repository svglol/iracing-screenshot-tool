# Coding Conventions

*Generated: 2026-03-28 | Focus: quality*

## Module System

**Main process (src/main/):** CommonJS (`require`/`module.exports`)
- All main-process files use `'use strict';` at the top
- Example: `src/main/main-utils.js`, `src/main/iracing-sdk-utils.js`, `src/main/iracing-sdk.js`

**Renderer process (src/renderer/):** ES Modules (`import`/`export`)
- Vue components use `import`/`export default`
- Example: `src/renderer/main.js`, `src/renderer/router/index.js`

**Utilities (src/utilities/):** CommonJS (`require`/`module.exports`)
- Example: `src/utilities/config.js`, `src/utilities/desktop-capture.js`, `src/utilities/screenshot-name.js`

**Rule:** Follow the module system of the directory you are working in. Main process and utilities use CommonJS. Renderer uses ES Modules.

## Naming Patterns

**Files:**
- Use lowercase kebab-case for all source files: `iracing-sdk.js`, `desktop-capture.js`, `screenshot-name.js`, `main-utils.js`
- Test files use the `.test.js` suffix co-located with the source: `main-utils.test.js`, `desktop-capture.test.js`
- Vue components use PascalCase: `TitleBar.vue`, `SideBar.vue`, `SettingsModal.vue`, `HelpModal.vue`
- Vue views use PascalCase: `Home.vue`, `Worker.vue`

**Functions:**
- Use camelCase: `normalizeWindowHandle`, `findSourceByWindowTitle`, `buildScreenshotFileKey`
- Prefix boolean-returning functions with `is`: `isPlainObject`, `isExternalWindowSource`
- Prefix normalizer functions with `normalize`: `normalizeCaptureBounds`, `normalizeWindowTitle`, `normalizeFileKey`
- Prefix builder functions with `build` or `create`: `buildTrackFilePart`, `createScreenshotErrorPayload`, `createReshadeConfigError`
- Prefix finder functions with `find`: `findSourceByWindowHandles`, `findSourceByKnownIracingTitle`

**Variables:**
- Use camelCase: `takingScreenshot`, `workerReady`, `cancelReshadeWait`
- Constants use camelCase (not UPPER_SNAKE): `const fallbackIracingTitles`, `const appId`
- Exception: process-level constants use UPPER_SNAKE: `IRACING_PROCESS_NAME`, `THUMBNAIL_CONCURRENCY`, `EMPTY_IMAGE`

**Vue component names:**
- Use PascalCase in component definitions: `name: 'Home'`, `name: 'App'`
- Use PascalCase in templates: `<TitleBar />`, `<SideBar />`, `<SettingsModal />`

## Code Style

**Formatting (Prettier):**
- Config: `.prettierrc`
- Semicolons: always (`"semi": true`)
- Quotes: single (`"singleQuote": true`)
- Tab width: 3 spaces (`"tabWidth": 3`)
- Indentation: tabs (`"useTabs": true`)
- Trailing commas: ES5 (`"trailingComma": "es5"`)

**Linting (ESLint):**
- Config: `.eslintrc.js`
- Extends: `plugin:vue/recommended`, `standard`
- Parser: default (with Vue plugin)
- Key rules:
  - Semicolons required: `semi: ['error', 'always']`
  - No debugger in production: `'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off'`
  - Generator star spacing off: `'generator-star-spacing': 'off'`
- Run: `npm run lint` (auto-fixes with `--fix`)
- Run: `npm run prettier`

## Import Organization

**Main process CommonJS pattern (follow this order):**
1. Node.js built-in modules (`path`, `os`, `fs`, `events`, `child_process`)
2. Third-party packages (`electron`, `electron-updater`, `irsdk-node`, `read-ini-file`, `sharp`)
3. Local modules (relative paths: `./iracing-sdk`, `../utilities/config`)

Example from `src/main/index.js`:
```javascript
const { productName, build } = require('../../package.json');
const { autoUpdater } = require('electron-updater');
const remoteMain = require('@electron/remote/main');
const { app, BrowserWindow, screen, ... } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const irsdk = require('./iracing-sdk');
const { resizeIracingWindow, getIracingWindowDetails } = require('./window-utils');
const { normalizeWindowHandle, ... } = require('../utilities/desktop-capture');
const { isPlainObject, ... } = require('./main-utils');
```

**Renderer ESM pattern:**
1. CSS/SCSS imports
2. Vue and framework imports
3. Third-party imports
4. Local component imports

Example from `src/renderer/main.js`:
```javascript
import 'bulma-pro/bulma.sass';
import Vue from 'vue';
import App from './App.vue';
import router from './router';
import 'buefy/dist/buefy.css';
import './assets/style/animations.scss';
```

**Path aliases:** None configured. All imports use relative paths.

## Error Handling

**Main process pattern - structured error payloads:**
Use `createScreenshotErrorPayload()` from `src/main/main-utils.js` to build consistent error objects with `message`, `stack`, `source`, `context`, `meta`, and `diagnostics` fields.

```javascript
// From src/main/index.js
function reportScreenshotError(errorLike, defaults = {}) {
  const payload = createScreenshotErrorPayload(errorLike, {
    ...defaults,
    diagnostics: mergePlainObjects(defaults.diagnostics, {
      main: getMainScreenshotDiagnostics()
    })
  });
  const logFile = writeScreenshotErrorLog(payload);
  const rendererPayload = { ...payload, logFile };
  console.error('Screenshot error:', rendererPayload.message);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('screenshot-error', rendererPayload);
  }
  return rendererPayload;
}
```

**Worker process (renderer) error pattern:**
Similar structured payloads via `createScreenshotErrorPayload()` in `src/renderer/views/Worker.vue`, always with `source: 'worker'`.

**General patterns:**
- Use try/catch with `console.log(error)` or `console.error(error)` for non-critical failures
- Return `undefined` or `null` for graceful failure (e.g., `src/main/window-utils.js`)
- Use `Error` subclass with `.meta` property for domain errors: `createReshadeConfigError()` in `src/main/main-utils.js`
- Write errors to a log file at `userData/logs/screenshot-errors.log`

**Defensive input handling pattern:**
Functions normalize and validate inputs, returning safe defaults for null/undefined:
```javascript
function normalizeWindowHandle(windowHandle) {
  return String(windowHandle || '').trim();
}

function normalizeCaptureBounds(bounds) {
  if (!bounds || typeof bounds !== 'object' || Array.isArray(bounds)) {
    return null;
  }
  // ...validate and return
}
```

## Logging

**Framework:** `console` (no logging library)

**Patterns:**
- `console.log(error)` for non-critical caught errors (file operations, thumbnail generation)
- `console.error('Screenshot error:', message)` for screenshot failures
- `console.error(result.stderr.trim())` for PowerShell stderr
- `console.time()` / `console.timeEnd()` for performance timing in the worker (screenshot pipeline)
- `console.log()` for informational messages like capture source matching

**Rule:** Use `console.error` for actual errors that affect functionality. Use `console.log` for informational messages and non-critical failures. Use `console.time`/`console.timeEnd` for performance-sensitive operations.

## Comments

**When to comment:**
- Section dividers in test files use horizontal rules:
  ```javascript
  // ---------------------------------------------------------------------------
  // functionName
  // ---------------------------------------------------------------------------
  describe('functionName', () => { ... });
  ```
- Inline comments for non-obvious logic:
  ```javascript
  // 511 = all flags set (1+2+4+8+16+32+64+128+256)
  ```
- `// allow async-await` and `// allow debugger during development` in config files
- `// dynamically set application title to current view` for explaining side effects

**JSDoc:** Not used. No JSDoc or TSDoc annotations in the codebase.

**TODO comments:** One found in `src/renderer/store/index.js`:
```javascript
// TODO: Enable when deploy
// plugins: [createPersistedState()]
```

## Function Design

**Size:** Functions are generally small and focused (5-30 lines). Larger functions (like `fullscreenScreenshot` in `Worker.vue`) handle complete async workflows.

**Parameters:**
- Use destructuring with defaults: `function buildScreenshotFileKey({ weekendInfo = {}, driverName = 'Driver', count = 0 } = {})`
- Use default parameter values: `function trimWrappedQuotes(value = '')`
- Variadic with rest: `function mergePlainObjects(...objects)`

**Return values:**
- Return `null` for "not found" or "invalid input" (e.g., `normalizeCaptureBounds`, `findSourceByWindowHandles`)
- Return `undefined` for "nothing available" in PowerShell bridge functions (`src/main/window-utils.js`)
- Return structured objects with consistent shapes: `{ folder, rawFolder, basePath, remappedFrom }`

## Module Design

**Exports pattern (CommonJS):**
All exports are explicit named exports at the bottom of the file:
```javascript
module.exports = {
  normalizeWindowHandle,
  normalizeWindowTitle,
  normalizeCaptureBounds,
  // ...
};
```

**Barrel files:** One barrel file at `src/renderer/store/modules/index.js` that auto-imports Vuex modules via `require.context`.

**Singleton pattern:** `src/main/iracing-sdk.js` uses a module-level singleton:
```javascript
let instance = null;
module.exports = {
  getInstance() {
    if (!instance) {
      instance = new IRacingBridge();
    }
    return instance;
  }
};
```

## Configuration Pattern

**App configuration:** `src/utilities/config.js` uses `electron-store` with a JSON schema for type-safe defaults. It provides different interfaces depending on process type:
- **Main process:** Direct `electron-store` instance with `.get()` / `.set()` / `.onDidChange()`
- **Renderer process:** IPC proxy that uses `ipcRenderer.sendSync()` to communicate with main

**Config access:** Always via `config.get('key')` and `config.set('key', value)`. The main process handles IPC bridging in `src/main/index.js` via `ipcMain.on('config:get')` and `ipcMain.on('config:set')`.

## Vue Component Patterns

**Component definition:** Use `Vue.extend({})` for typed components (e.g., `src/renderer/views/Home.vue`, `src/renderer/App.vue`) or plain object exports for simpler ones (e.g., `src/renderer/components/Settings.vue`, `src/renderer/views/Worker.vue`).

**Template style:** Use Buefy components (`b-modal`, `b-carousel`, `b-tag`) with Bulma CSS classes (`columns`, `is-gapless`, `column`).

**Inline styles:** Commonly used directly in templates (e.g., `style="margin-top: 0px; height: 100vh;"`). Scoped styles are used in some components (`<style scoped>`).

**IPC in components:** Import `ipcRenderer` from electron using CommonJS `require()` inside `<script>` tags, then use in `mounted()` lifecycle hooks.

---

*Convention analysis: 2026-03-28*
