---
type: quick-summary
slug: pcn-wp-b-crash-nets
status: complete
date: 2026-07-04
commit: 9230ad1
source: obs/code-quality audit — WP-B
depends_on: WP-A (3dbf80f)
findings_closed: [obs-error-visibility#1, obs-lifecycle-telemetry#5]
---

# WP-B: Process-level crash safety nets — COMPLETE

Installed the crash safety nets that were **entirely absent** from `src/` — an
unhandled main-process throw/rejection, a GPU/utility-process death, or a
renderer crash previously produced no `app.log` line and the app died or wedged
silently. Additive; `src/main/index.ts` only (`+~70`). Depends on WP-A's new
`log.error`/`log.warn` (landed in `3dbf80f`).

## What changed

| Finding | Change |
|---------|--------|
| `obs-error-visibility#1` | Module-scope `process.on('uncaughtException')` + `process.on('unhandledRejection')` + `app.on('child-process-gone')` registered right after `remoteMain.initialize()`, all logging via `log.error` with message/stack (or `type`/`reason`/`exitCode` for child processes). `child-process-gone` captures **GPU-process OOM** distinctly from a renderer JS crash — a first-class failure mode for this VRAM-heavy app. Handlers are **non-fatal** (no re-throw/exit). |
| `obs-lifecycle-telemetry#5` | `attachRenderProcessDiagnostics(win, label)` helper wires `render-process-gone` (ERROR + `reason`/`exitCode`), `unresponsive` (WARN), `responsive` (INFO), and `did-fail-load` (ERROR, filtering sub-frames + `ERR_ABORTED`/-3). Called on **both** windows right after `remoteMain.enable`. Worker `render-process-gone` also flips `workerReady=false`; worker `did-finish-load`/`closed` now log the `workerReady` transitions — so the `worker-not-ready` capture rejection (index.ts:925) finally has a logged root cause. |

## Plan-check corrections folded in (WP-B was SOUND_WITH_FIXES)

1. **Compile gate** — used `npm run type-check` (vue-tsc --noEmit), **not** `npm run build` (which is the most expensive path *and* esbuild strips types so it wouldn't catch a wrong handler signature anyway).
2. **Not purely "log-only"** — the worker `render-process-gone` handler intentionally flips `workerReady=false` (a capture-flow state correction). On a pure renderer crash `closed` never fires, so without this the gate stays stale-true and the next capture is dispatched to a dead worker and hangs until the 30s watchdog; with it, the capture is rejected immediately with a logged crash cause. Documented as intentional in code comment + risk note.

## Behavior-change flag (from the risk assessment)

Registering `uncaughtException`/`unhandledRejection` handlers **suppresses Node/Electron's default crash-and-exit** — the app now keeps running (possibly degraded) after an uncaught throw instead of terminating. This is the intended trade: observability **and** the capture watchdog / disconnect-abort recovery paths (cq-main-index#2's theme) rely on the process surviving a timer-callback `fs` throw. If the team later prefers fail-fast, log-then-`process.exit(1)` for `uncaughtException` only (leave `unhandledRejection` log-only).

## Verification

- `npm run type-check` → **clean** (new Electron handler signatures compile).
- `npm test` → **326/326 across 12 files** (no regressions). No unit test added: the Electron event wiring isn't unit-testable in-process and the payload shaping is trivial inline — per the plan, manual repros are the verification.
- **Manual repros** (for QA on a Windows box, not run here):
  - `workerWindow.webContents.forcefullyCrashRenderer()` → expect `app.log` `"level":"ERROR"` `Renderer process gone {window:"worker", reason:...}`, then a subsequent screenshot's `Screenshot rejected {reason:"worker-not-ready"}` now has the crash line as its explanation.
  - Navigate any webContents to `chrome://gpucrash` → expect `Child process gone {type:"GPU", reason:...}`.
  - Temporarily add `Promise.reject(new Error('wp-b-test'))` at module top, `npm run dev` → expect `Unhandled promise rejection in main process` with message+stack, app does **not** die. Remove after.

## Coordination note (for WP-K)

WP-B deliberately left both `webPreferences` blocks untouched and added a
standalone `attachRenderProcessDiagnostics` helper called right after each
`remoteMain.enable`. WP-K (Electron hardening) can add `setWindowOpenHandler` /
`will-navigate` guards inside that same helper or as an adjacent call without a
merge collision.

## Follow-ups unblocked

Per the plan's critical path **A → C → G**, next is **WP-C** (permanent-wedge
guards: the `iracing-sdk.ts` poll loop + the non-ReShade capture latch + the
`reportScreenshotError` fs-throw guard). WP-C also depends only on WP-A.
