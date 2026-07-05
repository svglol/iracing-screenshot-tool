---
type: quick
slug: pcn-wp-b-crash-nets
created: 2026-07-04
kind: code
source: obs/code-quality audit — WP-B, plan-checked SOUND_WITH_FIXES
depends_on: WP-A (uses log.error()/log.warn())
---

# WP-B: Process-level crash safety nets

Today there are **no** crash safety nets anywhere in `src/` — an unhandled
main-process throw/rejection, a GPU/utility-process death, or a renderer crash
produces no `app.log` line; the app dies or wedges silently. WP-B installs them
so those failures become durable `ERROR` lines. Additive, `src/main/index.ts`
only. Closes `obs-error-visibility#1` and `obs-lifecycle-telemetry#5`.

## Tasks

1. **Module-scope process nets** — register `process.on('uncaughtException')`,
   `process.on('unhandledRejection')`, and `app.on('child-process-gone')` at load
   (after `remoteMain.initialize()`), all logging via `log.error`. Log-only /
   **non-fatal** so the capture watchdog + disconnect-abort recovery paths keep
   running. `child-process-gone` captures GPU-process OOM distinctly from a
   renderer JS crash. (`obs-error-visibility#1`)

2. **`attachRenderProcessDiagnostics(win, label)` helper** — wire
   `render-process-gone` (ERROR, incl. `reason`/`exitCode`), `unresponsive` (WARN),
   `responsive` (INFO), and `did-fail-load` (ERROR, filtering sub-frames +
   `ERR_ABORTED`/-3). For the **worker**, `render-process-gone` also flips
   `workerReady = false`. (`obs-lifecycle-telemetry#5`)

3. **Wire both windows** — `log.info` window creation; call the helper right after
   each `remoteMain.enable(...)`; add `log.info` to the worker `did-finish-load`
   (`workerReady:true`) and `closed` (`workerReady:false`) transitions so the
   `worker-not-ready` capture rejection (index.ts:925) finally has a logged cause.

## Plan-check corrections folded in (SOUND_WITH_FIXES)

1. Compile gate is **`npm run type-check`** (vue-tsc --noEmit), NOT `npm run build`
   (which is the most expensive path AND esbuild strips types). Manual repros carry
   the real verification value.
2. **Not purely "log-only":** the worker `render-process-gone` handler intentionally
   flips `workerReady = false` (a capture-flow state correction). On a pure renderer
   crash `closed` never fires, so without this the gate stays stale-true and the next
   capture is dispatched to a dead worker and hangs until the 30s watchdog; with it,
   the capture is rejected immediately with a logged crash cause — the explicit
   intent of `obs-lifecycle-telemetry#5`.

## Coordination (shared file `src/main/index.ts`)

WP-B adds a standalone helper + calls it right after each `remoteMain.enable`,
and does **not** touch `webPreferences` — so the later security WP (WP-K) can add
its `setWindowOpenHandler`/`will-navigate` guards inside the same helper or as an
adjacent call without collision. Worker `did-finish-load`/`closed` are WP-B-owned.

## Verify

- `npm run type-check` — new Electron handler signatures compile; additive.
- `npm test` — full suite still green (no test surface for the wiring; payload
  shaping is trivial inline).
- Manual repros (documented in SUMMARY): `forcefullyCrashRenderer()` on the worker
  → `Renderer process gone {window:'worker'}` + subsequent `worker-not-ready` now
  has a cause; `chrome://gpucrash` → `Child process gone {type:'GPU'}`.

## Files

- `src/main/index.ts` (modify)
