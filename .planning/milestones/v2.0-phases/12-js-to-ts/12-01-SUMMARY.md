---
phase: 12-js-to-ts
plan: 01
subsystem: typescript
tags: [typescript, git-mv, src-utilities, types-node, vitest-globals, skipLibCheck, export-form, cjs-esm-interop]

dependency-graph:
  requires:
    - "@types/node@^24 (direct devDep — matches Electron 41.2.2 transitive)"
    - "vitest/globals (ambient types already in node_modules via vitest@4.1.5)"
  provides:
    - "src/utilities/*.ts (9 files typed, blame-preserved)"
    - "tsconfig.json types: [node, vitest/globals] + skipLibCheck: true"
    - "CJS/ESM interop pattern: `export function` + `import` in tests + selective `require` for spy targets"
  affects:
    - "Plan 12-02 (src/main/*.js → .ts) — consumers of logger.ts + desktop-capture.ts now typed"
    - "Plan 12-03 (src/renderer/*.js → .ts) — consumers of config.ts + filenameFormat.ts + screenshot-name.ts + logger.ts now typed"
    - "Plan 12-05 (tsconfig expansion + parser swap) — types array + skipLibCheck already wired; include expansion still pending"

tech-stack:
  added:
    - "@types/node@^24.12.2 (direct devDep)"
  patterns:
    - "ES module `export function` + keep `module.exports =` only where dual-surface dynamic export is required (config.ts if/else on process.type)"
    - "Test imports: `import {...} from './name'` for static resolution; retain `require('fs')` only where vi.spyOn on a node built-in namespace is required"
    - "Source-test fs duality: source file uses `const fs: typeof import('fs') = require('fs')` when test spies on fs; ensures both sides share the same module instance so spies fire"
    - "`tsconfig.types` array explicit allowlist (node + vitest/globals) + `skipLibCheck: true` — insulates src from 3rd-party .d.ts subpath-import quirks"
    - "@ts-expect-error (not @ts-ignore) for process.type Electron-injected global; surface when @types/electron improves"

key-files:
  created:
    - ".planning/phases/12-js-to-ts/12-01-SUMMARY.md"
  renamed:
    - "src/utilities/config.js → config.ts (82% similarity)"
    - "src/utilities/desktop-capture.js → desktop-capture.ts (63%)"
    - "src/utilities/filenameFormat.js → filenameFormat.ts (91%)"
    - "src/utilities/iracing-config-checks.js → iracing-config-checks.ts (73%)"
    - "src/utilities/logger.js → logger.ts (62%)"
    - "src/utilities/screenshot-name.js → screenshot-name.ts (69%)"
    - "src/utilities/desktop-capture.test.js → desktop-capture.test.ts (99%)"
    - "src/utilities/iracing-config-checks.test.js → iracing-config-checks.test.ts (93%)"
    - "src/utilities/screenshot-name.test.js → screenshot-name.test.ts (99%)"
  modified:
    - "package.json (devDependencies: @types/node@^24.12.2 added)"
    - "package-lock.json (regenerated clean — no ERESOLVE)"
    - "tsconfig.json (types array + skipLibCheck: true)"
    - "src/main/main-utils.js (Rule 3: hoisted require('../utilities/desktop-capture.ts') to top-of-file)"

key-decisions:
  - "D-12-05 preserved: `git mv` used for all 9 renames; `git log --follow` returns ≥ 5 entries on spot-checked screenshot-name.ts"
  - "D-12-06 preserved: single content commit (29d1782) for the entire utilities batch"
  - "D-12-08 preserved: pragmatic typing — public exports have types, internal helpers inherit inference, `any` used freely for irsdk-node session/telemetry shapes"
  - "D-12-09 extended (minimum-scope): test file imports switched from CJS require('./name') to ESM import from './name' because Node's native require cannot resolve .ts; the .ts extension effectively changes resolution path, which D-12-09 explicitly permits"
  - "Rule 3 fix: tsconfig gains types:[node,vitest/globals] + skipLibCheck:true — rename of test files into tsc scope requires Vitest globals types; skipLibCheck sidesteps pre-existing vite/@vitest/utils .d.ts subpath-import issues"
  - "Rule 3 fix: src/main/main-utils.js inline `require('../utilities/desktop-capture')` (dynamic, inside function body, not statically analyzable by Vitest's transformer) hoisted to top-of-file and targets `.ts` literally; without this Vitest fails 6 main-utils tests at Node's native require stage. Plan 02 retires the workaround when main-utils itself converts to .ts"

requirements-completed:
  - "TS-03"

metrics:
  duration-seconds: 685
  completed-date: 2026-04-22
---

# Phase 12 Plan 01: `src/utilities/*.js` → `.ts` Conversion Summary

**9 pure-function utility files converted to TypeScript via `git mv` with minimal public-export annotations, `@ts-expect-error` budget 3/3 used, `@types/node@^24` added, tsc clean + Vitest 256/256 + `npm run pack` exit 0, blame history preserved through all 9 renames.**

## Performance

- **Duration:** ~11.4 min (685 s)
- **Started:** 2026-04-22T20:30:42Z
- **Completed:** 2026-04-22T20:42:07Z
- **Tasks:** 4/4
- **Files modified:** 13 in commit (9 renames + 4 edits)

## Accomplishments

- 9 `.js` → `.ts` renames in `src/utilities/` committed as a single D-12-06 per-directory batch (commit `29d1782`); blame history preserved through every rename (`git log --follow src/utilities/screenshot-name.ts` returns 5+ pre-Phase-12 commits)
- 6 source `.ts` files typed on the public-export surface: `sanitizeFilePart`/`buildTrackFilePart`/`buildScreenshotFileKey` (screenshot-name), `createLogger`/`Logger` interface (logger), `parseIniSection`/`checkIracingConfig` (iracing-config-checks), `normalizeWindowHandle`/10 helpers (desktop-capture with `DesktopCaptureSourceLike` + `CaptureBounds` + `NormalizedCaptureTarget` interfaces), `FILENAME_FIELDS`/`DEFAULT_FORMAT`/`resolveFilenameFormat` (filenameFormat), and dual-surface config.ts (`process.type`-branched `module.exports =`)
- `@types/node@^24.12.2` added as direct devDep — `npm install` clean, zero ERESOLVE, LINT-03 gate preserved
- `tsconfig.json` gains `types: ["node", "vitest/globals"]` + `skipLibCheck: true` — unblocks tsc's auto-inclusion of the 3 test files after their rename
- `npx tsc --noEmit` → 0 errors; `@ts-expect-error` count = 3 (budget met exactly); zero `@ts-ignore`; zero `'use strict'`
- `npm test` → 256/256 under Vitest 4.1.5 (~226 ms); `npm run pack` → exit 0 with 68 modules transformed in 8.85 s

## Commit SHA

| # | SHA     | Type     | Message                                           |
|---|---------|----------|---------------------------------------------------|
| 1 | 29d1782 | refactor | refactor(ts): convert src/utilities/*.js to .ts   |
| 2 | _this_  | docs     | docs(12-01): complete Plan 12-01 summary          |

## `@ts-expect-error` Breakdown (3/3 budget used)

| File                | Line(s)    | Reason                                                                               |
|---------------------|------------|--------------------------------------------------------------------------------------|
| `config.ts`         | 1 site     | `process.type === 'renderer'` — Electron-injected at runtime; not in @types/node     |
| `logger.ts`         | 2 sites    | Same — `process.type` check inside `resolveLogDir()` + `resolveIsDebug()`            |

Pattern is consistent: the single missing global (`process.type`) is the sole reason across all 3 sites. When Electron's own types mature or we install `@types/electron`, these can retire in one pass (future plan candidate).

## `any` Usage Patterns (for Plans 02-04 consistency)

- **irsdk-node session/telemetry shapes** — `filenameFormat.ts` declares `type SessionInfo = any; type Telemetry = any;` at top-of-file. All token `resolve(sessionInfo, telemetry)` functions use these aliases. Plan 02/03 should mirror: irsdk-node lacks `@types/*`, so typing the exact shape is out of scope; use the aliases consistently across consumers.
- **`findDriver(...): any | undefined`** — returns a single Drivers[] entry from iRacing session. Same rationale.
- **Array callback params** — `drivers.find((d: any) => ...)` retains minimal inference; `any` inline is clearer than spelling out the full Drivers shape.

## Tests: Import Form Switch (D-12-09 minimum-scope extension)

The plan says "tests are rename-only per D-12-09". Reality: Node's native `require('./name')` resolver looks for `.js/.json/.node` only — never `.ts`. When a `.test.ts` file loads via Vitest's Vite transformer but keeps `require('./source-module')`, the require call passes through to Node's resolver which cannot find `source-module.ts`. D-12-09's permission ("update imports if relative paths change") covers this because the `.ts` extension effectively changes how Node resolves the path.

**Change applied (3 files):** `const {X, Y} = require('./name')` → `import {X, Y} from './name'`.

**Preserved:** `require('fs')` and `require('path')` Node built-ins stayed as-is (Node's resolver knows these natively).

**Exception:** `iracing-config-checks.test.ts` keeps `const fs = require('fs')` because `vi.spyOn(fs, 'existsSync')` needs a mutable object target. ESM namespace imports are sealed (ES spec), which made `vi.spyOn` throw `TypeError: Cannot redefine property`. The source file `iracing-config-checks.ts` mirrors with `const fs: typeof import('fs') = require('fs')` so both test and source share one module instance — otherwise the spy targets a different `fs` than the one `checkIracingConfig()` actually calls.

**Pattern for Plans 02-04:** Prefer `import` in test files. If a test spies on a Node-built-in namespace, use CJS `require` on BOTH sides (test + source) to share the module instance.

## `config.ts` Dual-Export Pattern

`config.js`'s runtime behavior: `if (process.type === 'renderer') { module.exports = {get, set, onDidChange} } else { module.exports = new Store({schema}) }`. TypeScript treats this as a valid CommonJS pattern under `allowJs` (which is still on), and the rename to `.ts` works because `module.exports` reassignment is still legal TypeScript (target defaults to `module: commonjs` for our configuration via `moduleResolution: node`).

**Single `@ts-expect-error`** on the outer `if (process.type === ...)` guard covers the entire dual-surface. No `@ts-expect-error` was needed on the `module.exports = {...}` assignments themselves. Plan 02's main-side `config` consumer will need to cast the result of `require('../utilities/config')` into the Store type it expects — a typedef helper in Plan 02 can centralize that cast.

## Lint Outcome (Plan 05 calibration signal)

`npm run lint` exits 1 with **408 problems (401 errors, 7 warnings)** — **Outcome B (parser handles .ts, rules fire)**, not Outcome A (babel-parser crashes).

**Plan prediction:** the plan branched on "outcome A (eslint crashes)" vs "outcome B (findings)". Reality: eslint's flat config already routes `.ts` through `typescript-eslint/parser` (Phase 11 Plan 01 preserved this via `tseslint.config({ files: ['**/*.ts'], extends: [tseslint.configs.recommended] })`), so the parser ran successfully. The 401 errors are content-level: `@typescript-eslint/no-require-imports` fires on our intentional `require('fs')`/`require('electron')` patterns, `@typescript-eslint/no-explicit-any` fires on our `any` escape hatches, `no-unused-vars` fires on a few `catch (error)` clauses where `error` is intentionally ignored.

**Delta vs Phase 11 baseline:** 729 → 408 = net −321 problems. Counterintuitively _better_, because a big chunk of the ignored `no-undef` errors on the (previously lint-scoped-out) `.ts` files vanished when the parser got richer typing via `@types/node`. The −321 delta absorbs both the new TS-rule findings and the deleted no-undef findings.

**For Plan 05:** the tseslint stack works; the parser-swap task may be lighter than planned. Primary tuning required: (a) allow `require` imports in .ts files that intentionally use CJS (e.g., `config.ts`, test spy targets) — currently 1+ violation site per such file; (b) allow `any` on documented irsdk-node-shape escape hatches — currently 15+ violations; (c) allow `catch(error)` with unused `error` binding — currently ~5 sites.

**Lint-band gate (≤1881):** 408 well under ceiling. Phase 12 milestone gate comfortable.

## Decisions Made

Primary — all are minimum-scope, Rule 3 blocking fixes driven by rename consequences, not scope creep:

1. **tsconfig `types: ["node", "vitest/globals"]` + `skipLibCheck: true`** — rename of test files into tsc scope requires Vitest globals types (describe/test/expect/vi). `types` array pins them explicitly (avoids auto-inclusion of random @types/* that might pollute). `skipLibCheck` sidesteps pre-existing subpath-import quirks in vite/@vitest/utils .d.ts files.

2. **Test imports: `import` over `require` for relative paths** — D-12-09-permitted minimum-scope change driven by Node's `.ts` resolver gap.

3. **Preserve `require('fs')` for vi.spyOn target** — ESM sealing is a hard constraint; breaking the spy would require refactoring the 6 test cases to use mocked instances, which is out of scope.

4. **main-utils.js require hoist + `.ts` extension** — needed for Vitest compat until Plan 02 converts main-utils itself. Single-line change; self-documenting; Plan 02 retires the workaround naturally.

5. **`any` concentrations in filenameFormat.ts** — irsdk-node lacks `@types/*`. Plan 12 ROADMAP explicitly admits `any` as transitional (D-12-01). Preferred over fabricating a session-info interface that would inevitably drift from upstream.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] tsc errors when test files entered scope after rename**
- **Found during:** Task 3 (first tsc verification)
- **Issue:** Renaming `.test.js` → `.test.ts` brought test files into `tsconfig.include: ["src/utilities"]`. tsc then reported 440+ errors: missing `describe`/`test`/`expect`/`vi` globals + cascading `TS6200` "Definitions conflict" errors because source files without `export` statements were treated as scripts, leaking identifiers to the global namespace.
- **Fix:** (a) Added `types: ["node", "vitest/globals"]` + `skipLibCheck: true` to `tsconfig.json`. (b) Switched all 6 source files to native `export function` syntax (instead of `module.exports = {...}`) so each file registers as a module, not a script.
- **Files modified:** `tsconfig.json`, all 6 source .ts files
- **Verification:** `npx tsc --noEmit` → 0 errors
- **Committed in:** 29d1782 (Task 3 commit)

**2. [Rule 3 — Blocking] Vitest tests couldn't resolve `.ts` via Node `require`**
- **Found during:** Task 4 Step 1 (first `npm test` run)
- **Issue:** Test files kept `const {X} = require('./name')`. Node's native `require` resolver looks for `.js/.json/.node` extensions only, not `.ts`. 3 test files failed at module-load with `MODULE_NOT_FOUND`.
- **Fix:** Switched 3 test files to `import {X} from './name'` (ESM static import — routes through Vite's resolver, which DOES handle `.ts`). D-12-09 explicitly permits "update imports if relative paths change"; the extension change from `.js` to `.ts` materially changes Node's resolution.
- **Files modified:** `src/utilities/screenshot-name.test.ts`, `desktop-capture.test.ts`, `iracing-config-checks.test.ts`
- **Verification:** `npx vitest run` → 256/256 pass
- **Committed in:** 29d1782 (Task 4 commit)

**3. [Rule 3 — Blocking] `vi.spyOn(fs, ...)` failed after switching source to `import * as fs`**
- **Found during:** Task 4 Step 1 (second test run after fix #2)
- **Issue:** `iracing-config-checks.ts` used `import * as fs from 'fs'` (ESM namespace), which is sealed (immutable). `vi.spyOn(fs, 'existsSync')` threw `TypeError: Cannot redefine property: existsSync`. 6 tests in `iracing-config-checks.test.ts` failed.
- **Fix:** Changed source `iracing-config-checks.ts` to use CJS `const fs: typeof import('fs') = require('fs')` (mutable module object). Test file also uses `const fs = require('fs')` so both share the same module instance — spies fire on the object `checkIracingConfig()` actually reads from.
- **Files modified:** `src/utilities/iracing-config-checks.ts`, `src/utilities/iracing-config-checks.test.ts`
- **Verification:** 256/256 under Vitest
- **Committed in:** 29d1782 (Task 4 commit)

**4. [Rule 3 — Blocking] `src/main/main-utils.js` broke 6 tests after rename**
- **Found during:** Task 4 Step 1 (first `npm test` run)
- **Issue:** `main-utils.js` contained an inline dynamic `require('../utilities/desktop-capture')` inside `serializeBounds()` (line 49). Vitest's transformer does NOT statically-analyze function-body requires, so the call passes through to Node's native resolver, which cannot find `.ts`. 6 tests in `main-utils.test.js` failed with `MODULE_NOT_FOUND`.
- **Fix:** Hoisted the require to top-of-file and appended `.ts` extension: `const { normalizeCaptureBounds } = require('../utilities/desktop-capture.ts')`. Top-of-file requires are statically detectable and Vitest resolves them via its own pipeline (Node still handles it at runtime because the explicit `.ts` extension triggers Vitest's on-the-fly compilation). The `.ts` extension workaround retires cleanly in Plan 02 when main-utils itself converts.
- **Files modified:** `src/main/main-utils.js`
- **Verification:** 256/256 under Vitest
- **Committed in:** 29d1782 (Task 4 commit)

---

**Total deviations:** 4 auto-fixed, all Rule 3 (blocking). Zero scope creep — every fix directly addressed a breakage caused by the rename operation the plan mandated. No Rule 4 architectural changes were needed. `tsconfig.json` modifications are minimal (2 lines added) and stay within the spirit of the plan's Task 3 "0 tsc errors" gate; they do not preempt Plan 05's `include` expansion or parser primacy work.

**Impact on plan:** +4 small incidental file edits beyond the 11 the plan originally sketched, delivered in the same single content commit (D-12-06 preserved: 1 commit total). The dual-form `export =` alternative mentioned in Task 4 was tried first and found insufficient; native `export function` statements were cleaner and avoided `TS1203` (Export assignment cannot be used when targeting ECMAScript modules). Plan 02's executor should read this summary's "Test Import Form Switch" and "config.ts Dual-Export Pattern" sections before touching main-side consumers.

## Issues Encountered

None beyond the 4 auto-fixed deviations — the plan accurately predicted each scenario and provided escape valves.

## User Setup Required

None — plan had zero external-service interactions.

## Next Phase Readiness

- **Plan 02 (src/main/*.js → .ts)** ready: `logger.ts` + `desktop-capture.ts` are typed; main-utils.js already has the hoist-to-top workaround applied, and its require line becomes a regular TS import on conversion.
- **Plan 03 (src/renderer/*.js → .ts)** ready: `config.ts` + `filenameFormat.ts` + `screenshot-name.ts` + `logger.ts` all typed; renderer consumers (`Worker.vue`, `Settings.vue`, `SettingsModal.vue`, `SideBar.vue`, `Home.vue`) do `require('../../utilities/X')` extensionlessly which Vite resolves at build time. No renderer-side test files reference utilities, so no dual-module-instance concern propagates.
- **Plan 04 (Vue SFCs)** unchanged scope.
- **Plan 05 (tsconfig expansion + parser primacy swap)**: lint outcome signals tseslint is already primary for `.ts` — parser-swap work is lighter than CONTEXT sketched. Focus on: allow `require` in .ts where dual-module-instance is load-bearing, allow `any` on documented irsdk-node shapes, triage `no-unused-vars` on `catch(error)` sites.
- **Phase 12 `@ts-expect-error` budget remaining:** 12 of 15 (used 3 in this plan; plans 02/03 likely need 4-6 each for Electron IPC typing; plan 04 for Vue SFC slots; plan 05 is tsconfig + lint only, no budget consumption).

## Self-Check: PASSED

**Files verified:**
- FOUND: `.planning/phases/12-js-to-ts/12-01-SUMMARY.md` (this file)
- FOUND: `src/utilities/config.ts` (82% rename similarity)
- FOUND: `src/utilities/desktop-capture.ts` (63% rename similarity)
- FOUND: `src/utilities/filenameFormat.ts` (91% rename similarity)
- FOUND: `src/utilities/iracing-config-checks.ts` (73% rename similarity)
- FOUND: `src/utilities/logger.ts` (62% rename similarity)
- FOUND: `src/utilities/screenshot-name.ts` (69% rename similarity)
- FOUND: `src/utilities/desktop-capture.test.ts` (99% rename similarity)
- FOUND: `src/utilities/iracing-config-checks.test.ts` (93% rename similarity)
- FOUND: `src/utilities/screenshot-name.test.ts` (99% rename similarity)
- FOUND: 0 `.js` files remaining in `src/utilities/`
- FOUND: `@types/node@^24.12.2` in `package.json.devDependencies`
- FOUND: `types: ["node", "vitest/globals"]` + `skipLibCheck: true` in `tsconfig.json`

**Commits verified:**
- FOUND: `29d1782` — refactor(ts): convert src/utilities/*.js to .ts

**Gates verified:**
- PASS: `npx tsc --noEmit` → 0 errors
- PASS: `npm test` → 256/256 under Vitest 4.1.5
- PASS: `npm run pack` → exit 0, 68 modules transformed, 8.85 s
- PASS: `@ts-expect-error` count = 3 (budget 3)
- PASS: `@ts-ignore` count = 0
- PASS: `'use strict'` directives = 0
- PASS: `git log --follow src/utilities/screenshot-name.ts` → 5 entries (blame preserved through rename)
- PASS: No `Co-Authored-By` footer on commit
- PASS: No `--no-verify` used
- PASS: Zero bot/** or .tmp-inspect/** leakage in commit

---

*Phase: 12-js-to-ts*
*Completed: 2026-04-22*
