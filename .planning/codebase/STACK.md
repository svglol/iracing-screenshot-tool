# Technology Stack

*Generated: 2026-03-28 | Focus: tech*

## Languages

**Primary:**
- JavaScript (ES2018+) - All application code, main process, renderer, utilities

**Secondary:**
- TypeScript - Type checking only (no emit); `tsconfig.json` scoped to `src/utilities` with `allowJs: true`
- SCSS/Sass - Renderer stylesheets (`src/renderer/assets/style/`)
- PowerShell - Inline scripts for Windows window management (`src/main/window-utils.js`)
- NSIS - Windows installer customization (`_scripts/installer.nsh`)

## Runtime

**Environment:**
- Electron `^41.0.0` (Chromium-based desktop runtime)
- Node.js `24.12.0` (specified in `.nvmrc`)

**Package Manager:**
- npm (configured in `.npmrc` with `registry=https://registry.npmjs.org/`, proxy disabled)
- Lockfile: `package-lock.json` present (26,691 lines)

## Frameworks

**Core:**
- Vue `^2.7.16` - UI framework (Options API, Single File Components)
- Vue Router `^3.6.5` - Client-side routing (`src/renderer/router/index.js`)
- Vuex (imported in `src/renderer/store/index.js`) - State management (minimal usage, persisted state commented out)
- Buefy `^0.9.29` - Vue 2 component library built on Bulma
- Bulma `^0.9.4` / Bulma Pro `^0.1.8` - CSS framework

**Testing:**
- Jest `^25.3.0` - Test runner and assertions
  - Config: inline via `package.json` scripts (no standalone `jest.config.js`)
  - Run: `npm test` (passWithNoTests enabled)

**Build/Dev:**
- Webpack `^5.105.4` - Module bundler (two configs: main + renderer)
- Webpack CLI `^6.0.1`
- Webpack Dev Server `^5.2.3` - Development server on port 9080
- Babel `^7.9.0` - JavaScript/TypeScript transpilation
- electron-builder `^26.8.1` - Packaging and distribution
- `@electron/rebuild` `^4.0.3` - Native module rebuilding for Electron

## Key Dependencies

**Critical (runtime):**
- `irsdk-node` `^4.4.0` - iRacing SDK bindings (native C++ addon via `@irsdk-node/native` with node-gyp)
- `sharp` `^0.34.5` - High-performance image processing (resize, crop, format conversion)
- `@electron/remote` `^2.1.3` - Cross-process Electron module access
- `electron-store` `^5.1.1` - Persistent JSON configuration store (`src/utilities/config.js`)
- `electron-updater` `^6.8.3` - Auto-update from GitHub releases

**Image/File:**
- `image-size` `^0.8.3` - Read image dimensions without loading full file (used in `Home.vue`)
- `read-ini-file` `^3.0.0` - Parse ReShade `.ini` configuration files

**UI:**
- `@fortawesome/fontawesome-svg-core` `^1.2.28` + `@fortawesome/vue-fontawesome` `^0.1.9` - Icon system
- `vue-lazyload` `^1.3.3` - Lazy image loading in gallery
- `vue-markdown-plus` `^2.0.17` - Markdown rendering (changelog/help)
- `vue-shortkey` `^3.1.7` - Keyboard shortcut bindings
- `vue-simple-context-menu` `^3.1.10` - Right-click context menus
- `v-click-outside` `^3.0.1` - Click-outside directive

**Infrastructure:**
- `babel-runtime` `^6.26.0` - Babel polyfill helpers
- `deepmerge` `^4.2.2` - Deep object merge (dev dependency)

## Configuration

**Babel (`.babelrc`):**
- Presets: `@babel/env` targeting Electron 41.0, `@babel/typescript`
- Plugins: `@babel/proposal-class-properties`, `@babel/proposal-object-rest-spread`

**ESLint (`.eslintrc.js`):**
- Extends: `plugin:vue/recommended`, `standard`
- Semicolons required (`semi: ['error', 'always']`)
- Parser: defaults (vue-eslint-parser for `.vue` files)

**Prettier (`.prettierrc`):**
- Semicolons: `true`
- Single quotes: `true`
- Tab width: `3`
- Trailing comma: `es5`
- Tabs: `true`

**TypeScript (`tsconfig.json`):**
- Target: `esnext`
- `allowJs: true`, `noEmit: true`, `strict: true`
- Scope: `include: ["src/utilities"]` only
- Purpose: Type checking only; Babel handles actual transpilation

**Webpack:**
- Main process config: `_scripts/webpack.main.config.js`
  - Entry: `src/main/index.js`
  - Target: `electron-main`
  - Externals: `electron`, `@electron/remote`, `electron-updater`, `irsdk-node`, `sharp`
  - Loaders: `babel-loader` (js/ts), `node-loader` (.node files)
  - Output: `dist/main.js` (commonjs2)
- Renderer config: `_scripts/webpack.renderer.config.js`
  - Entry: `src/renderer/main.js`
  - Target: `electron-renderer`
  - Externals: `electron`, `@electron/remote`, `sharp`
  - Loaders: `babel-loader`, `vue-loader`, `sass-loader`, `css-loader`, `url-loader`, `file-loader`
  - Output: `dist/renderer.js` (commonjs2)
  - Plugins: `HtmlWebpackPlugin`, `VueLoaderPlugin`, `MiniCssExtractPlugin`
- Path aliases in both configs: `@` and `src` -> `src/`

**Application Config (runtime):**
- `electron-store` with JSON schema validation (`src/utilities/config.js`)
- Stored at: `%APPDATA%/iRacing Screenshot Tool/config.json`
- Key settings: resolution, crop, screenshot folder, keybind, ReShade integration, window position

**Environment Variables:**
- `NODE_ENV` - development/production mode
- `PRODUCT_NAME` - injected via webpack DefinePlugin
- `ELECTRON_DISABLE_SECURITY_WARNINGS` - set to `false` in main process
- `RENDERER_REMOTE_DEBUGGING` - set when using `--remote-debug` flag

## Build System

**Build Pipeline:**
1. `rebuild:electron` - Run `electron-builder install-app-deps` then `electron-rebuild -f --which-module irsdk-node,sharp`
2. `pack` - Parallel webpack builds for main + renderer (`pack:main` + `pack:renderer`)
3. `build:dir` - Package with electron-builder (unpacked directory)
4. Full build: `npm run build` chains all three steps via `npm-run-all`

**Dev Pipeline (`npm run dev`):**
1. Rebuild native modules for Electron
2. `dev-runner` (`_scripts/dev-runner.js`):
   - Starts webpack-dev-server for renderer on port 9080
   - Watches + rebuilds main process with webpack
   - Spawns Electron process, auto-restarts on main process changes

**Dev Build (`npm run build:dev`):**
- Uses `_scripts/build-dev.js` to create versioned dev builds
- Version format: `{version}+{gitShortHash}`
- Output: `build/dev/{devVersion}/`

**Distribution Targets (Windows only):**
- NSIS installer
- Portable executable
- Configured in `package.json` `build.win.target`
- Code signing disabled (`signAndEditExecutable: false`)

**postinstall Hook:**
- Automatically runs `electron-builder-install` then `electron-rebuild` after `npm install`
- Rebuilds `irsdk-node` and `sharp` native modules against Electron's Node.js version

## Platform Requirements

**Development:**
- Windows (required - iRacing SDK is Windows-only, PowerShell scripts for window management)
- Node.js 24.12.0 (per `.nvmrc`)
- npm (not yarn - no `yarn.lock`)
- Visual Studio Build Tools (for native module compilation via node-gyp)
- Python (required by node-gyp for building native modules)

**Production:**
- Windows only (iRacing is Windows-exclusive)
- No external runtime requirements (Electron bundles Node.js + Chromium)
- iRacing must be installed and running for screenshot functionality

## Version Constraints

- `irsdk-node` requires Node >= 18 (`engines` in its package.json)
- `@irsdk-node/native` ships prebuilds for `win32-x64` and `win32-arm64`
- `sharp` ships platform-specific prebuilt binaries; rebuilt for Electron via `@electron/rebuild`
- Vue 2.7.x is the final Vue 2 release; Vue 3 migration would require replacing Buefy, vue-router v3, vuex, and all Vue 2-specific plugins
- Electron 41.x uses Chromium ~134 and Node ~22

---

*Stack analysis: 2026-03-28*
