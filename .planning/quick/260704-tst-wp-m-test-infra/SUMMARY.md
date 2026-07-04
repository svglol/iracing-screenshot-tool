---
type: quick-summary
slug: tst-wp-m-test-infra
status: complete
date: 2026-07-04
commit: 1d9fb4e
source: obs/code-quality audit — WP-M (LAST)
depends_on: WP-A, WP-C, WP-D, WP-F, WP-H
findings_closed: [cq-tests#1, cq-tests#2, cq-tests#3, cq-tests#4]
---

# WP-M: cover the untested load-bearing surfaces + enable renderer tests — COMPLETE

The final package of the 13-WP remediation. The suite tested only pure utility
modules; the four surfaces the audit flagged as un-tested and load-bearing are now
covered. **+17 tests (312 → 329 across 16 files.)**

| Finding | Change |
|---------|--------|
| `cq-tests#1` | `logger.ts` — the sole persistent field-diagnostic surface — had no tests for its stateful path. NEW `logger.integration.test.ts`: init() resolves + creates the logs dir; `writeLine` emits valid JSON-lines with ts/level/proc/msg/data; a bare `Error` payload is structured (not `{}`); level gating (`debug()` suppressed in a packaged build, emitted when unpackaged; `warn`/`error` always emit — WP-A levels); startup rotation of a pre-seeded >5MB `app.log` down to a valid `[TRUNCATED]` marker + a ≤1MB tail where every retained line parses and the freshly-written line survives. The pure rotation/serializer/redaction helpers remain covered by `logger.test.ts` (WP-A owns that file). |
| `cq-tests#2` | index.ts (1900+ lines, top-level electron/sharp/koffi/irsdk imports) is un-importable under vitest, so its backend-fallback decision was untested. NEW pure `capture-decisions.ts`: `decideCaptureBackend({reshade,nativeCapture,wgcAvailable}) → 'reshade'\|'wgc'\|'getUserMedia'` and `classifyWgcResult(kind, nativeReason) → {outcome,fallbackReason}`. index.ts calls them where it inlined the same expressions — behavior-preserving (the native-decision call sits inside the `if(!reshade)` branch so `reshade:false`; classifyWgcResult reproduces the exact no-frame/black outcome+reason mutations and keeps WP-F's log lines). NEW `capture-decisions.test.ts` table-tests both (reshade-wins, wgc-only-when-both-true, getUserMedia otherwise; no-frame carries native reason else default, black is a fixed marker). |
| `cq-tests#3` | `wgc-capture.ts`'s `lastNativeFailureReason` state machine was untested (its test file was a native-ABI smoke test that never imported the module logic). Added a test-only `__setWgcApiForTests(api)` seam (injects a fake addon / null / undefined without a real .node) and extended `wgc-capture.test.ts` with a state-machine describe: reason set to the unavailable string when api is null, set to the thrown `Error.message` on a grab throw, reset to null after a successful grab, and a per-grab throw does NOT null the session addon cache (`getWgcApi()` still returns the injected addon). |
| `cq-tests#4` | NO Vue component could be tested (vitest pinned `environment:'node'`, no plugin-vue, no DOM env / test-utils). Added `plugins:[vue()]` to vitest.config.mjs (compiles .vue; env stays node, renderer tests opt into `happy-dom` via a per-file docblock since vitest 4 dropped `environmentMatchGlobs`) + devDeps `happy-dom@^20.10.6` + `@vue/test-utils@^2.4.11`. NEW `renderer-harness.test.ts` mounts a trivial dependency-free `__fixtures__/SmokeProbe.vue`, proving plugin-vue + happy-dom + @vue/test-utils work end-to-end. Deliberately NOT a full-mount of Worker.vue/SideBar.vue (module-scope `require` of config/fs/sharp — the documented trap); harness-capable is the deliverable. |

## Plan-check corrections folded (SOUND_WITH_FIXES)
- **logger electron mock** — the biggest catch. `logger.ts` resolves its dir via a
  NATIVE `require('electron')` (the un-rewritten `const x = require(...)` pattern used
  throughout this codebase so Vite doesn't shim node built-ins). `vi.mock('electron')`
  intercepts only the transformed import graph, so it did NOT apply — the first draft
  failed 5/5 with `app` undefined (real electron's module export is a path string).
  Fixed by planting an electron stub in Node's require cache via
  `createRequire(import.meta.url).cache[require.resolve('electron')]`, which the native
  require returns; `vi.resetModules()` resets the init latch but not Node's require
  cache, so one install survives every dynamic re-import.
- **vitest 4** — used a per-file `// @vitest-environment happy-dom` docblock
  (environmentMatchGlobs is gone); node stays the default env.
- **Extraction ownership** — WP-F/WP-C were observability-only and didn't extract, so
  WP-M made the index.ts edits; already-committed, no collision.

## Verification
- `npm run type-check` → clean (the extraction import + the new .vue fixture both
  type-check under vue-tsc).
- `npx vitest run` → **329/329 across 16 files** (+17: capture-decisions 6, wgc
  state-machine 4, logger.integration 5, renderer-harness 2). The happy-dom env spins
  up (vitest reports a non-zero `environment` time now).
- `npm run pack` → electron-vite build **green** (main index.js 112.94 kB — the
  capture-decisions module inlined; renderer still 87 modules — the fixture is
  test-only, nothing in the app imports it).

## Progress — REMEDIATION PLAN COMPLETE
**13/13 work packages executed.** Fully complete: A, B, C, G, L, H, D, I, J, E, F, M.
WP-K: Stage 0 complete (remove @electron/remote #2 + nav-lock #3); Stages 1-3
(contextIsolation preload migration #1, CSP, code-signing #4) deferred to separate
independently-testable PRs — they need live Electron-runtime verification the
`vue-tsc`+`vitest` gates cannot provide, and a code-signing certificate. The renderer
harness WP-M just enabled is the prerequisite for testing that future migration.
