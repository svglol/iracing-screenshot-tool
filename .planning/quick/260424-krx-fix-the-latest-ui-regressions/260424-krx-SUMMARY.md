---
phase: 260424-krx
plan: 01
type: audit
verdict: zero-regressions
tags: [vite, import-audit, renderer, utilities]
---

# Quick Task 260424-krx: UI Regression Audit Summary

**One-liner:** Independent re-audit of renderer + utilities import patterns confirms zero Anti-pattern A/B regressions; v2.0 import conventions are clean post-34c899e.

**Date:** 2026-04-24
**HEAD at audit start:** `34c899e`
**HEAD at audit end:** `34c899e` (no source commits — audit-only outcome)

---

## 1. Audit Scope

Four grep scans were run, two anti-pattern patterns × two directory paths:

| Scan | Pattern | Path |
|------|---------|------|
| A1 | `require\(` | `src/renderer` |
| A2 | `require\(` | `src/utilities` |
| B1 | `^import .* from '(fs\|path\|os\|child_process\|crypto\|util\|stream\|events\|http\|https\|url\|zlib\|net\|tls\|buffer)'` | `src/renderer` |
| B2 | same as B1 | `src/utilities` |

Renderer external list (from `electron.vite.config.mjs` line 44):
`['electron', '@electron/remote', 'sharp']`

Main external list (lines 13-19):
`['electron', '@electron/remote', 'electron-updater', 'irsdk-node', 'sharp']`

---

## 2. Raw Grep Output

### Scan A1 — `require\(` in `src/renderer`

```
src/renderer/views/Worker.vue:18:const { ipcRenderer } = require('electron');
src/renderer/views/Worker.vue:19:const fs = require('fs');
src/renderer/views/Worker.vue:20:const path = require('path');
src/renderer/views/Worker.vue:21:const sharp = require('sharp');
src/renderer/views/Home.vue:146:const { ipcRenderer, clipboard, shell, nativeImage } = require('electron');
src/renderer/views/Home.vue:147:const sizeOf = require('image-size');
src/renderer/views/Home.vue:148:const fs = require('fs');
src/renderer/views/Home.vue:149:const path = require('path');
src/renderer/views/Home.vue:150:const sharp = require('sharp');
src/renderer/main.ts:79:	const { ipcRenderer } = require('electron');
src/renderer/components/HelpModal.vue:89:const { shell } = require('electron');
src/renderer/components/ChangelogModal.vue:26:const { ipcRenderer } = require('electron');
src/renderer/components/ChangelogModal.vue:27:const fs = require('fs');
src/renderer/components/PromoCard.vue:21:const { shell } = require('electron');
src/renderer/components/Settings.vue:67:const { shell, ipcRenderer } = require('electron');
src/renderer/components/Settings.vue:68:const fs = require('fs');
src/renderer/components/SettingsModal.vue:270:const { ipcRenderer } = require('electron');
src/renderer/components/SideBar.vue:121:const { ipcRenderer } = require('electron');
src/renderer/components/SideBar.vue:122:const fs = require('fs');
src/renderer/components/TitleBar.vue:35:const { ipcRenderer } = require('electron');
```

### Scan A2 — `require\(` in `src/utilities`

```
src/utilities/logger.ts:1:// Use typed `require(...)` for Node built-ins so Vite's renderer target does
src/utilities/logger.ts:6:const fs: typeof import('fs') = require('fs');
src/utilities/logger.ts:7:const path: typeof import('path') = require('path');
src/utilities/logger.ts:27:		const { ipcRenderer } = require('electron');
src/utilities/logger.ts:32:	const { app } = require('electron');
src/utilities/logger.ts:41:		const { ipcRenderer } = require('electron');
src/utilities/logger.ts:45:	const { app } = require('electron');
src/utilities/config.ts:1:const { ipcRenderer } = require('electron');
src/utilities/config.ts:2:const Store = require('electron-store');
src/utilities/config.ts:3:const fs = require('fs');
src/utilities/config.ts:4:const path = require('path');
src/utilities/config.ts:5:const homedir: string = require('os').homedir();
src/utilities/config.ts:160:		const { app } = require('electron');
src/utilities/iracing-config-checks.ts:5:const fs: typeof import('fs') = require('fs');
src/utilities/iracing-config-checks.ts:6:const path: typeof import('path') = require('path');
src/utilities/iracing-config-checks.ts:7:const os: typeof import('os') = require('os');
src/utilities/iracing-config-checks.test.ts:5:const fs = require('fs');
```

### Scan B1 — ES import of Node built-ins in `src/renderer`

```
No matches found
```

### Scan B2 — ES import of Node built-ins in `src/utilities`

```
No matches found
```

---

## 3. Classification Table

### Anti-pattern A hits (require() calls)

| File:Line | Form | Module | Classification | Action |
|-----------|------|--------|---------------|--------|
| src/renderer/views/Worker.vue:18 | `require('electron')` | electron | INTENTIONAL: electron — renderer external per config line 44; Electron Node integration resolves at runtime | none |
| src/renderer/views/Worker.vue:19 | `require('fs')` | fs | INTENTIONAL: node-builtin — Anti-pattern B fix form (typed-require); Node built-in resolved by Electron's Node integration | none |
| src/renderer/views/Worker.vue:20 | `require('path')` | path | INTENTIONAL: node-builtin — same rationale as fs above | none |
| src/renderer/views/Worker.vue:21 | `require('sharp')` | sharp | INTENTIONAL: externalized — in renderer external list (config line 44); native Node module | none |
| src/renderer/views/Home.vue:146 | `require('electron')` | electron | INTENTIONAL: electron | none |
| src/renderer/views/Home.vue:147 | `require('image-size')` | image-size | INTENTIONAL: node-native — Node-native binary module; runtime CJS require() resolved by Electron's Node integration; not a Vite-bundleable pure-JS module; plan explicitly classifies as intentional (plan background §3) | none |
| src/renderer/views/Home.vue:148 | `require('fs')` | fs | INTENTIONAL: node-builtin | none |
| src/renderer/views/Home.vue:149 | `require('path')` | path | INTENTIONAL: node-builtin | none |
| src/renderer/views/Home.vue:150 | `require('sharp')` | sharp | INTENTIONAL: externalized | none |
| src/renderer/main.ts:79 | `require('electron')` | electron | INTENTIONAL: electron | none |
| src/renderer/components/HelpModal.vue:89 | `require('electron')` | electron | INTENTIONAL: electron | none |
| src/renderer/components/ChangelogModal.vue:26 | `require('electron')` | electron | INTENTIONAL: electron | none |
| src/renderer/components/ChangelogModal.vue:27 | `require('fs')` | fs | INTENTIONAL: node-builtin | none |
| src/renderer/components/PromoCard.vue:21 | `require('electron')` | electron | INTENTIONAL: electron | none |
| src/renderer/components/Settings.vue:67 | `require('electron')` | electron | INTENTIONAL: electron | none |
| src/renderer/components/Settings.vue:68 | `require('fs')` | fs | INTENTIONAL: node-builtin | none |
| src/renderer/components/SettingsModal.vue:270 | `require('electron')` | electron | INTENTIONAL: electron | none |
| src/renderer/components/SideBar.vue:121 | `require('electron')` | electron | INTENTIONAL: electron | none |
| src/renderer/components/SideBar.vue:122 | `require('fs')` | fs | INTENTIONAL: node-builtin | none |
| src/renderer/components/TitleBar.vue:35 | `require('electron')` | electron | INTENTIONAL: electron | none |
| src/utilities/logger.ts:1 | comment text containing `require(` | — | OUT-OF-SCOPE: comment, not an actual require call; part of intentional-pattern documentation | none |
| src/utilities/logger.ts:6 | `require('fs')` | fs | INTENTIONAL: node-builtin — typed-require form per 34c899e convention | none |
| src/utilities/logger.ts:7 | `require('path')` | path | INTENTIONAL: node-builtin — typed-require form | none |
| src/utilities/logger.ts:27 | `require('electron')` | electron | INTENTIONAL: electron | none |
| src/utilities/logger.ts:32 | `require('electron')` | electron | INTENTIONAL: electron | none |
| src/utilities/logger.ts:41 | `require('electron')` | electron | INTENTIONAL: electron | none |
| src/utilities/logger.ts:45 | `require('electron')` | electron | INTENTIONAL: electron | none |
| src/utilities/config.ts:1 | `require('electron')` | electron | INTENTIONAL: electron | none |
| src/utilities/config.ts:2 | `require('electron-store')` | electron-store | INTENTIONAL: node-native — native Electron ecosystem module; CJS runtime require; plan explicitly classifies as intentional (plan background §3) | none |
| src/utilities/config.ts:3 | `require('fs')` | fs | INTENTIONAL: node-builtin | none |
| src/utilities/config.ts:4 | `require('path')` | path | INTENTIONAL: node-builtin | none |
| src/utilities/config.ts:5 | `require('os').homedir()` | os | INTENTIONAL: node-builtin | none |
| src/utilities/config.ts:160 | `require('electron')` | electron | INTENTIONAL: electron | none |
| src/utilities/iracing-config-checks.ts:5 | `require('fs')` | fs | INTENTIONAL: vi.spyOn-target — typed-require; both sides share same module instance for `vi.spyOn(fs, ...)` to fire correctly on sealed ESM namespace imports | none |
| src/utilities/iracing-config-checks.ts:6 | `require('path')` | path | INTENTIONAL: node-builtin — typed-require form | none |
| src/utilities/iracing-config-checks.ts:7 | `require('os')` | os | INTENTIONAL: node-builtin — typed-require form | none |
| src/utilities/iracing-config-checks.test.ts:5 | `require('fs')` | fs | INTENTIONAL: vi.spyOn-target (test file) — must share module instance with the code under test; Vitest runs in Node, not Vite renderer | none |

### Anti-pattern B hits (ES import of Node built-ins)

| File:Line | Form | Module | Classification | Action |
|-----------|------|--------|---------------|--------|
| — | — | — | ZERO HITS | none |

**Total hits inspected:** 38 (37 actual require() calls + 1 comment match)
**REGRESSION rows:** 0
**INTENTIONAL rows:** 36
**OUT-OF-SCOPE rows:** 1 (comment)

---

## 4. Fixes Applied

None. Zero REGRESSION classifications found. No source files were modified.

---

## 5. Verification

`npm run pack` (electron-vite build) exit code: **0**

Build output:
- Main: 9 modules transformed, 54.14 kB, built in 191ms
- Renderer: 85 modules transformed, built in 11.54s
  - `out/renderer/index.html` (0.38 kB)
  - `out/renderer/assets/arms_logo-CSfqq1oE.png` (26.29 kB)
  - `out/renderer/assets/index-DQCgd94O.css` (1,011.16 kB)
  - `out/renderer/assets/index-BfW2hf-A.js` (3,090.55 kB)

Warnings observed (all pre-existing, non-blocking per STATE.md):
- 7 SCSS deprecation warnings from `bulma/sass` and `src/renderer/assets/style/main.scss` (`if()` function syntax, `darken()` color function) — documented in STATE.md Blockers/Concerns as pre-existing Phase 12 carry-forward.
- `[!] preload config is missing` — pre-existing electron-vite notice (no preload script in project).

No type errors. No runtime errors. No new warnings introduced.

**Surprises:** Module count increased from 78 (Phase 13 baseline) to 85 — attributable to the two prior commits (0411a5b + 34c899e) that landed before this audit run, adding more ES import graph nodes. This is expected and not a regression.

---

## 6. Verdict

**Zero regressions — v2.0 import patterns are clean per independent re-audit.**

Both anti-pattern greps were run independently (not relying on the planner's pre-audit hypothesis). Every hit from both scans was classified. The planner's hypothesis proved correct: all require() calls in renderer and utilities scope are intentional (electron, node-built-in typed-require, or explicitly node-native modules). No ES-import-of-Node-built-in pattern exists anywhere in renderer or utilities scope.

`npm run pack` exits 0 end-to-end with no errors. The v2.0 import-pattern cleanup work (commits 0411a5b + 34c899e) is complete and verified clean.

---

## Greps Run Count

- 4 grep scans executed
- 38 hits inspected and classified (37 require() calls + 1 comment match)
- 0 regressions found
- 0 source files modified
- `npm run pack` exit status: **0**

---

## Post-Audit Addendum (2026-04-24, commit `19ee9df`)

**Audit gap caught at runtime (not by `npm run pack`):** Immediately after this
audit closed, the user reported a cascade of Vue `[Vue warn]: Failed to resolve
component: o-tag / o-carousel / o-modal / o-button / o-select / o-field /
o-input / o-notification / o-switch / o-carousel-item` warnings on app boot.

Root cause in `src/renderer/main.ts:52-66`: the file imported raw Oruga
components (`OButton`, `OModal`, …) and passed them to `oruga.use()`. Oruga's
`install()` loops the array and calls `app.use(c, {oruga})` on each, but **raw
Vue 3 components have no `.install` method** — `app.use(plainComponent)` is a
silent no-op. So `OButton`, `OModal`, etc. were never registered as globals,
even though Vite bundled them fine. The pre-existing `as any` cast in the
`.forEach` was silently masking the type mismatch.

Fix: import the **non-prefixed plugin exports** (`Button`, `Modal`, `Input`,
`Field`, `Select`, `Switch`, `Tag`, `Carousel`, `Notification`, `Dropdown`)
instead. Each plugin has a proper `install(app)` that calls
`app.component('OName', OName)`. Also dropped `OCarouselItem` — `Carousel`'s
install registers both `OCarousel` and `OCarouselItem`.

**Lesson for future audits:** `npm run pack` (Vite build) proves the module
graph resolves and the bundler doesn't choke. It does **NOT** prove that
registered globals actually reach `app.components` at runtime. The next time a
Vue-3-era plugin-registration audit is run, add one of:

- Runtime smoke test: launch Electron, grep stderr for `[Vue warn]`
- Static check: confirm every `<o-*>` / `<font-awesome-icon>` / other global
  component used in any `.vue` template has either an `app.component('Name', …)`
  call OR an `app.use(plugin)` where that plugin's `.install` is verified to
  register the component (not just a raw component import passed to `app.use`).

Commit `19ee9df` (`fix(vue3): register Oruga component plugins so <o-*>
globals resolve`) lands the fix. v2.0 is now fully clean at both build-time
AND runtime for this pattern.
