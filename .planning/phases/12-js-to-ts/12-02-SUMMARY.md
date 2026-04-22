---
phase: 12-js-to-ts
plan: 02
subsystem: typescript
tags: [typescript, git-mv, src-main, electron-ipc, dual-scope-tsc, any-transitional]

dependency-graph:
  requires:
    - "Plan 12-01 (src/utilities/*.ts + @types/node@^24 + tsconfig types/skipLibCheck)"
    - "electron 41.2.2 (bundled .d.ts — process.type, BrowserWindow, ipcMain, DesktopCapturerSource)"
    - "irsdk-node 4.4.0 (now typed — contrary to plan prediction; @ts-expect-error retired from utils)"
  provides:
    - "src/main/*.ts (7 files typed, blame-preserved through 6 of 7 renames via git mv)"
    - "src/main/main-utils.ts retires the Plan 12-01 hoisted-require workaround (clean ESM import from '../utilities/desktop-capture')"
    - "Dual-scope-safe process.type pattern: `(process as { type?: string }).type === 'renderer'` — compiles under both src/utilities-only scope (no electron) AND src/main scope (electron extends Process)"
    - "Loose DesktopCaptureSourceLike = any in desktop-capture.ts + DesktopSourceLike = any in main-utils.ts — accepts test literals with extra props AND Electron's DesktopCapturerSource (no index signature)"
  affects:
    - "Plan 12-03 (src/renderer/*.js → .ts) — renderer consumers of config.ts + logger.ts inherit the process.type cast pattern; any cast issues resolved upstream"
    - "Plan 12-04 (Vue SFCs) — no direct dep"
    - "Plan 12-05 (tsconfig expansion + parser swap) — `include` expansion to `src/**/*` now safe for src/main/; no latent process.type friction"

tech-stack:
  added: []
  patterns:
    - "ES import from 'irsdk-node' (typed upstream now — @ts-expect-error dropped from iracing-sdk.ts and iracing-sdk-utils.ts; budget saved 2 slots)"
    - "CommonJS interop preserved via dual `module.exports = {...}` + ESM `export` on iracing-sdk.ts — index.ts's `import * as irsdk from './iracing-sdk'; irsdk.getInstance()` works cleanly"
    - "Pragmatic `any` on irsdk-node SDK bridge (IRacingBridge.sdk + Consts.CameraState) per D-12-08"
    - "`(process as { type?: string }).type` cast — replaces 3 Plan 12-01 `@ts-expect-error` sites; the cast is compatible with BOTH electron-extended and plain NodeJS.Process shapes"
    - "Loose source-like types (`any` alias + lint-disable) in place of index signatures that incompatibly widened DesktopCapturerSource"
    - "Electron IPC payload signatures: `event, payload: unknown` or narrowly-typed shape objects (screenshotKeybind-change, config:set) — narrow inside body"

key-files:
  created:
    - ".planning/phases/12-js-to-ts/12-02-SUMMARY.md"
  renamed:
    - "src/main/index.js → index.ts (75% similarity — rename-detected)"
    - "src/main/iracing-sdk.js → iracing-sdk.ts (50% similarity — rename-detected, on the threshold)"
    - "src/main/iracing-sdk-utils.js → iracing-sdk-utils.ts (D+A — fell below 50% threshold; git log --follow still walks pre-rename history via explicit .js path argument)"
    - "src/main/main-utils.js → main-utils.ts (57% similarity — rename-detected)"
    - "src/main/window-utils.js → window-utils.ts (88% similarity — rename-detected)"
    - "src/main/iracing-sdk-utils.test.js → iracing-sdk-utils.test.ts (99% — consumes CRLF carry-forward, naturalizes to LF)"
    - "src/main/main-utils.test.js → main-utils.test.ts (99% similarity — rename-detected)"
  modified:
    - "src/utilities/config.ts (Rule 3: replaced @ts-expect-error on process.type with structural cast)"
    - "src/utilities/logger.ts (Rule 3: same cast — 2 sites)"
    - "src/utilities/desktop-capture.ts (Rule 3: DesktopCaptureSourceLike → any for DesktopCapturerSource compat)"

key-decisions:
  - "D-12-05 preserved: `git mv` used for all 7 renames; 6 of 7 detected as R; `git log --follow src/main/index.ts` returns 54 entries (deep history preserved)"
  - "D-12-06 preserved: single content commit (a22879a) for the entire src/main batch"
  - "D-12-08 preserved: `any` used for irsdk-node SDK bridge + electron-store config + DesktopSourceLike where Electron's exact type clashes with test literals"
  - "D-12-09 extended same as 12-01: test file imports switched from CJS require('./name') to ESM import from './name' because Node's native require cannot resolve .ts; the .ts extension change triggers D-12-09's 'update imports if relative paths change' permission"
  - "Plan prediction obsolete: irsdk-node has types published upstream (verified via `npx tsc --noEmit -p tsconfig.main-check.json` post-rename). The 2 @ts-expect-error slots reserved for `irsdk-node untyped import` were returned to budget. Phase 13 can confirm and update ROADMAP."
  - "Plan prediction obsolete on `process.type`: electron's own types (via DefinitelyTyped @types/node merge OR electron's bundled .d.ts) now satisfy process.type. Plan 12-01's @ts-expect-error on config.ts/logger.ts became 'unused directive' errors once src/main was added to scope. Fix: replace @ts-expect-error with structural cast that works in both scopes."

requirements-completed:
  - "TS-03"

metrics:
  duration-seconds: 621
  completed-date: 2026-04-22
---

# Phase 12 Plan 02: `src/main/*.js` → `.ts` Conversion Summary

**7 Electron-main-process files (5 source + 2 test, 1152-line `index.ts` included) converted to TypeScript via `git mv` + minimal public-export/IPC-payload annotations. 3 of 5 budgeted `@ts-expect-error` used — well under. Plan 12-01 hoisted-require workaround retired cleanly. tsc green under both utilities-only and main-expanded scope. Vitest 256/256. `npm run pack` exit 0.**

## Performance

- **Duration:** ~10.4 min (621 s)
- **Started:** 2026-04-22T21:46:18Z
- **Completed:** 2026-04-22T21:56:38Z
- **Tasks:** 4/4
- **Files modified in commit:** 11 (7 renames + 4 edits — 3 in src/utilities/ as Rule 3 blocking fixes)

## Accomplishments

- 7 `.js` → `.ts` renames in `src/main/` committed as a single D-12-06 per-directory batch (commit `a22879a`); blame preserved for 6 of 7 files via git's rename detection; the 7th (`iracing-sdk-utils`) fell below 50% similarity threshold due to heavy ES-export-form refactor — pre-rename history reachable via `git log --follow -- src/main/iracing-sdk-utils.js`.
- 5 source `.ts` files typed on public-export + module-level state surfaces: `flattenTelemetry`/`normalizeTelemetryValue`/`decodeCameraState` (iracing-sdk-utils), `IRacingBridge` class + `getInstance` (iracing-sdk; `sdk: any` per D-12-08 for untyped SDK internals), `getIracingWindowDetails`/`resizeIracingWindow*` + `IRacingWindowDetails` interface (window-utils), 17 exports with structured interfaces `Bounds`/`SerializedDisplay`/`ReshadeScreenshotFolder`/etc. (main-utils), and the big one: 1152-line `index.ts` with module-level state (`width: number`, `mainWindow: BrowserWindow | null`, etc.), typed IPC payloads (`event, data: {width: number; height: number; ...}`), and `async function waitForReshadeScreenshot` internals typed with `ReshadeFileInfo` + `fs.FSWatcher` + `NodeJS.Timeout`.
- **Plan 12-01 hoisted-require workaround retired:** `main-utils.ts` now has a clean `import { normalizeCaptureBounds } from '../utilities/desktop-capture'` at top of file. The `require('../utilities/desktop-capture.ts')` literal-.ts hack was only needed while main-utils was still `.js`; now it's `.ts` and Vite/tsc handle resolution natively.
- **CRLF carry-forward naturalized:** `iracing-sdk-utils.test.ts` now LF-only going forward (verified via `file` command).
- `npx tsc --noEmit -p tsconfig.main-check.json` → 0 errors across 17 files (6 utilities + 7 main + 4 test).
- `npx tsc --noEmit` (default `include: ["src/utilities"]`) → 0 errors — Rule 3 cast fix works in both scopes.
- `npm test` → 256/256 under Vitest 4.1.5 (~222-233 ms).
- `npm run pack` → exit 0, 68 modules transformed, 10.20s — electron-vite picked up `src/main/index.ts` automatically without config tweak (as the plan predicted).

## Commit SHA

| # | SHA     | Type     | Message                                           |
|---|---------|----------|---------------------------------------------------|
| 1 | a22879a | refactor | refactor(ts): convert src/main/*.js to .ts        |
| 2 | _this_  | docs     | docs(12-02): complete Plan 12-02 summary          |

## `@ts-expect-error` Breakdown (3/5 budget used)

| File          | Line     | Reason                                                                                        |
|---------------|----------|-----------------------------------------------------------------------------------------------|
| `index.ts`    | ~86      | `process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = false` — legacy boolean assignment (env vars typed `string\|undefined`) |
| `index.ts`    | ~316     | `global.__static = ...` — legacy Vue-CLI static-assets bridge — Phase 13 removes              |
| `index.ts`    | ~341     | `global.__static = ...` — same, dev-mode branch                                               |

**Plan-predicted slots retired:**
- `iracing-sdk-utils.ts` / `iracing-sdk.ts`: "irsdk-node untyped" — upstream has types; no directive needed. Net -2 from plan.
- `index.ts`: `BrowserWindow.addDevToolsExtension` — code doesn't actually call it directly (`vue-devtools` does via try/catch internals); no directive needed. `vue-devtools` itself: require returns `any`, no error. Net -2 from plan.

## `any` Usage Patterns (carry-forward for Plans 03-04)

- **irsdk-node SDK bridge (iracing-sdk.ts):** `sdk: any; Consts: { CameraState: any }` — SDK internals opaque. Plan 03 doesn't import irsdk directly; Plan 04 might touch via telemetry store. Stay consistent.
- **electron-store config (index.ts):** `let config: any` — electron-store v5's dynamic schema typing is unwieldy. Plan 03 renderer callers use the `get(key)` / `set(key, value)` shim from `config.ts` which returns `unknown`; renderer code can narrow.
- **resize-screenshot IPC payload (index.ts:640):** `async (event, data: any) => {...}` — the shape `{width, height, targetWidth, targetHeight, crop, cropTopLeft, ...}` is wider than index.ts cares to spell out; inline `any` is cleaner than a 10-field interface that would immediately rot.
- **DesktopSourceLike / DesktopCaptureSourceLike:** `type X = any` aliases in main-utils.ts + desktop-capture.ts — deliberate loose shape for test literals + Electron's DesktopCapturerSource. Plan 03 shouldn't touch these helpers.

## Dual-Scope `process.type` Pattern

**Problem:** Plan 12-01 annotated `config.ts` and `logger.ts` with `@ts-expect-error — process.type is Electron-injected at runtime`. This was correct when the tsc scope was `src/utilities` only (plain `@types/node` has no `process.type`). But once Plan 12-02 adds `src/main/` to scope, Electron's own types (loaded transitively via `import from 'electron'`) extend `NodeJS.Process` to include `type`. The @ts-expect-error becomes an "unused directive" error — tsc's strictest self-check.

**Fix:** replace the directive with a structural cast:
```typescript
if ((process as { type?: string }).type === 'renderer') { ... }
```

This compiles cleanly in both:
- **Utilities-only scope** (no electron types loaded): `process` is `NodeJS.Process`; the cast narrows to `{ type?: string }` which is a structural subset — legal.
- **Main-expanded scope** (electron types loaded): `process` already has `type: string | undefined`; the cast is idempotent — also legal.

Applied in 3 sites: `config.ts:106`, `logger.ts:18`, `logger.ts:30`.

**For Plan 05:** when tsconfig `include` expands to `src/**/*`, this cast stays — no further @ts-expect-error cleanup needed for these sites.

## DesktopSourceLike Type Dilemma

**Problem:** Plan 12-01's `DesktopCaptureSourceLike` used `{ id?: unknown; name?: unknown; display_id?: unknown; [key: string]: unknown }`. The index signature `[key: string]: unknown` means "any string key maps to an unknown value". But `Electron.DesktopCapturerSource` has concrete types like `thumbnail: NativeImage`, `appIcon: NativeImage | null`, which clash — `NativeImage` is NOT assignable to `unknown` in TypeScript's strict excess-property check (despite `unknown` being the top type in most contexts; index signatures are invariant).

**Fix:** type alias to `any`:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DesktopCaptureSourceLike = any;
```

This deliberately throws typing away at these call boundaries — per D-12-08. The functions themselves (e.g., `findSourceByWindowHandles`) read only `.id` / `.name` / `.display_id`; the typed return value of `DesktopCapturerSource | null` recaptures safety downstream. And test literals with `extra: 'ignored'` pass through as originally intended by D-12-09 (tests unchanged).

Mirror pattern in `main-utils.ts` (`DesktopSourceLike`).

**For Plans 03-04:** don't try to re-type these. If you need to introspect more fields of a desktopCapturer source in renderer code, import `Electron.DesktopCapturerSource` directly there.

## Tests: Import Form Switch (D-12-09 minimum-scope extension)

Same Rule 3 blocking fix as Plan 12-01 applied to this plan's 2 test files:
- `require('./iracing-sdk-utils')` → `import { ... } from './iracing-sdk-utils'`
- `require('./main-utils')` → `import { ... } from './main-utils'`

Plus 2 non-null assertions in `main-utils.test.ts` (lines 184, 206, 215) on `serializeDisplay(display)` calls — `serializeDisplay` returns `SerializedDisplay | null`, strict mode requires assertion. Minimal and targeted; D-12-09's "tests unchanged beyond rename" spirit preserved (logic untouched, only typing-driven access syntax added).

## iracing-sdk.ts Dual-Export Pattern

`index.ts` uses `import * as irsdk from './iracing-sdk'; const iracing = irsdk.getInstance();`. This pattern needs BOTH:
1. ESM `export function getInstance` — for tsc/ESM resolvers
2. CommonJS `module.exports = { getInstance, IRacingBridge }` — for Vite's commonjsOptions.transformMixedEsModules path at pack time

Both coexist legally under our tsconfig settings. Verified by `npm run pack` exit 0 (bundler walks both resolution paths without conflict).

## Rename-Similarity Edge Case

One of 7 files — `iracing-sdk-utils.js → iracing-sdk-utils.ts` — dropped below git's default 50% similarity threshold (shown as D+A in `git diff --cached --name-status`). Cause: converting from `module.exports = { ... }` at file bottom to inline `export function` declarations shifted enough bytes. Impact: `git log --follow src/main/iracing-sdk-utils.ts` from HEAD returns 1 entry (this commit). BUT pre-rename history is still reachable via `git log --follow -- src/main/iracing-sdk-utils.js` (4 entries walking back to pre-Phase-12). Git's rename-detection is a runtime heuristic, not a permanent metadata field — history is preserved regardless.

For Plans 03-04: avoid refactoring export-form in the same commit as the rename if preserving rename-detection matters.

## Decisions Made

Primary — all minimum-scope, driven by rename-scope consequences:

1. **Retire `@ts-expect-error` on irsdk-node imports** — the plan predicted the lib was untyped; verification showed it's typed. Net +2 to `@ts-expect-error` budget.

2. **Structural cast `(process as { type?: string })` replaces `@ts-expect-error` on `process.type`** — required by the scope expansion. Clean pattern, works in both scopes, no budget impact.

3. **`DesktopSourceLike = any` / `DesktopCaptureSourceLike = any`** — deliberate D-12-08 transitional typing. The previous `[key: string]: unknown` index signature was incompatible with Electron's `DesktopCapturerSource`. `any` is narrower-scoped than introducing conditional types at 8 call sites.

4. **Non-null assertions in main-utils.test.ts (3 sites)** — `serializeDisplay` return type is `SerializedDisplay | null`; the tests branch on known-truthy inputs and immediately read `.label` etc. `!` is the minimal fix; changing the return type would cascade across main-utils callers.

5. **Dual-form `module.exports = { getInstance, IRacingBridge }` + ESM `export` on iracing-sdk.ts** — preserves `index.ts`'s `import * as irsdk from './iracing-sdk'; irsdk.getInstance()` pattern across Vite's CommonJS bridge without needing to rewrite index.ts's consumer code.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Stale `@ts-expect-error` in utilities after scope expansion**
- **Found during:** Task 2 (first `npx tsc --noEmit -p tsconfig.main-check.json` run)
- **Issue:** Plan 12-01 used `@ts-expect-error` on `process.type` checks in config.ts/logger.ts, assuming plain `@types/node` lacks it. Once src/main/*.ts entered tsc scope, electron's types (transitively loaded via `import from 'electron'` in main) extended `NodeJS.Process` to include `.type`. The 3 directives became "Unused '@ts-expect-error' directive" errors (TS2578).
- **Fix:** Replaced each directive with a structural cast `(process as { type?: string }).type`. The cast is a legal subset in both scopes — plain Process has all fields cast accesses (none, effectively), electron-extended Process also satisfies.
- **Files modified:** `src/utilities/config.ts`, `src/utilities/logger.ts`
- **Verification:** `npx tsc --noEmit` (utilities-only scope) exit 0; `npx tsc --noEmit -p tsconfig.main-check.json` (expanded scope) exit 0.
- **Committed in:** a22879a (same plan commit)

**2. [Rule 3 — Blocking] `DesktopCaptureSourceLike` index signature incompatible with `DesktopCapturerSource`**
- **Found during:** Task 2 (first tsc run)
- **Issue:** The `[key: string]: unknown` index signature on `DesktopCaptureSourceLike` forced every property to map to `unknown`. `Electron.DesktopCapturerSource`'s `thumbnail: NativeImage` and `appIcon: NativeImage | null` violate this — TypeScript rejects at 8 call sites in `index.ts` (`findSourceByWindowHandles`, `findDisplaySourceByDisplayId`, etc.).
- **Fix:** Changed type definition to `type DesktopCaptureSourceLike = any;` (with `// eslint-disable-next-line @typescript-eslint/no-explicit-any`). Mirror change in main-utils.ts's `DesktopSourceLike`.
- **Files modified:** `src/utilities/desktop-capture.ts`, `src/main/main-utils.ts`
- **Verification:** 0 errors in both tsc scopes + 256/256 test pass.
- **Committed in:** a22879a

**3. [Rule 3 — Blocking] Stale `@ts-expect-error` on irsdk-node imports**
- **Found during:** Task 2 (first tsc run)
- **Issue:** Plan stated "irsdk-node has no @types/* published". Actually it does (bundled .d.ts on npm). The two `@ts-expect-error` directives became "unused" (TS2578).
- **Fix:** Removed both directives. Kept the `(CameraState as unknown as Record<string, number>)` double-cast because the `typeof CameraState` TypeScript infers is a const enum-like object, not freely indexable — the double-cast is needed for `Object.entries(...)` to produce string keys.
- **Files modified:** `src/main/iracing-sdk-utils.ts`, `src/main/iracing-sdk.ts`
- **Verification:** 0 errors.
- **Committed in:** a22879a

**4. [Rule 3 — Blocking] Strict-null-check on `serializeDisplay` return in tests**
- **Found during:** Task 3 (tsc after test-file import switch)
- **Issue:** `serializeDisplay` returns `SerializedDisplay | null`. Three tests in main-utils.test.ts access `.label` / `.touchSupport` on the result immediately — strict mode complains (TS18047, TS2531).
- **Fix:** Three non-null assertions (`!`) at lines 184, 206, 215. Minimal — preserves D-12-09's rename-only spirit.
- **Files modified:** `src/main/main-utils.test.ts`
- **Verification:** 0 errors + 256/256 tests.
- **Committed in:** a22879a

**5. [Rule 3 — Blocking] Vitest can't resolve `.ts` via Node native require**
- **Found during:** Task 3 (test file import switch)
- **Issue:** Test files used `const { X } = require('./module-under-test')`. Node's native require doesn't resolve `.ts`. Same as Plan 12-01.
- **Fix:** Switched to `import { X } from './module-under-test'`. D-12-09 permits "update imports if relative paths change" — the `.ts` extension change triggers this permission.
- **Files modified:** `src/main/iracing-sdk-utils.test.ts`, `src/main/main-utils.test.ts`
- **Verification:** 256/256.
- **Committed in:** a22879a

---

**Total deviations:** 5 auto-fixed, all Rule 3 (blocking). Zero scope creep — every fix directly addressed a breakage or linting fail caused by the rename operation the plan mandated. No Rule 4 architectural changes. All modifications documented inline.

**Impact on plan:** +3 small file edits in src/utilities/ beyond the 7 the plan sketched, delivered in the same single content commit (D-12-06 preserved: 1 commit total). The dual-scope process.type pattern is a durable improvement that cleans up Plan 12-01 debt AND prepares for Plan 05's permanent tsconfig include expansion — a useful side effect.

## Issues Encountered

- **Plan's @ts-expect-error predictions stale:** 4 of the 5 predicted directive sites didn't materialize (irsdk-node is typed; addDevToolsExtension isn't called directly; vue-devtools returns `any`; @electron/remote typing is fine). Net: 3 actual directives vs 5 budgeted. Plan 12-03/04 executors should verify directive expectations against live tsc before reserving budget.
- **iracing-sdk-utils.ts rename detection fell below 50%:** documented above. No impact on history reachability; minor annoyance for `git log --follow` ergonomics.
- **Minor Sass deprecation warnings during `npm run pack`:** pre-existing, NOT introduced by this plan, NOT in scope. Not auto-fixed (out of scope per Rule 3 scope boundary).

## User Setup Required

None — plan had zero external-service interactions.

## Next Phase Readiness

- **Plan 12-03 (src/renderer/*.js → .ts) ready:** `config.ts` / `logger.ts` / `desktop-capture.ts` export surfaces are typed and stable. The `(process as { type?: string })` pattern applies cleanly inside renderer code too (process.type === 'renderer' path).
- **Plan 12-04 (Vue SFCs) ready:** no direct dependency on this plan's output.
- **Plan 12-05 (tsconfig expansion + parser swap) ready:** `include` expansion to `src/**/*` is now safe — no latent errors in src/main/ to flush out. Lint outcome TBD (Plan 12-01 saw 408 problems — well under the ≤1881 ceiling; this plan's additions are similarly small).
- **Phase 12 `@ts-expect-error` budget remaining:** 12 of 15 (used 3 here — 3 in index.ts legacy-bridges; retired 2 from utilities by upgrading pattern). Plans 03/04 have plenty of slack.

## Self-Check: PASSED

**Files verified:**
- FOUND: `.planning/phases/12-js-to-ts/12-02-SUMMARY.md` (this file)
- FOUND: `src/main/index.ts` (75% rename similarity)
- FOUND: `src/main/iracing-sdk.ts` (50% rename similarity — threshold)
- FOUND: `src/main/iracing-sdk-utils.ts` (D+A — below 50% threshold, documented)
- FOUND: `src/main/main-utils.ts` (57%)
- FOUND: `src/main/window-utils.ts` (88%)
- FOUND: `src/main/iracing-sdk-utils.test.ts` (99% — CRLF naturalized to LF)
- FOUND: `src/main/main-utils.test.ts` (99%)
- FOUND: 0 `.js` files remaining in `src/main/`

**Commits verified:**
- FOUND: `a22879a` — refactor(ts): convert src/main/*.js to .ts

**Gates verified:**
- PASS: `npx tsc --noEmit -p tsconfig.main-check.json` → 0 errors (temp config, then deleted)
- PASS: `npx tsc --noEmit` (default) → 0 errors — utilities-only scope still clean
- PASS: `npm test` → 256/256 under Vitest 4.1.5
- PASS: `npm run pack` → exit 0, 68 modules transformed, 10.20s (warnings pre-existing)
- PASS: `@ts-expect-error` count in src/main/*.ts = 3 (budget 5; phase running total ≤ 6 of 15)
- PASS: `@ts-ignore` count = 0
- PASS: `'use strict'` in source .ts files = 0 (still present in 2 test files per D-12-09 rename-only)
- PASS: `git log --follow src/main/index.ts` → 54 entries (blame preserved)
- PASS: `git log --follow -- src/main/iracing-sdk-utils.js` → 4 entries (pre-rename history reachable for the one similarity-missed file)
- PASS: No `Co-Authored-By` footer on commit
- PASS: No `--no-verify` used
- PASS: tsconfig.main-check.json DELETED (not committed)
- PASS: No bot/** or .tmp-inspect/** leakage in commit

---

*Phase: 12-js-to-ts*
*Completed: 2026-04-22*
