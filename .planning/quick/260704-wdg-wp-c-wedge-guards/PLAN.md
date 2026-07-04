---
type: quick
slug: wdg-wp-c-wedge-guards
created: 2026-07-04
kind: code
source: obs/code-quality audit — WP-C, plan-checked SOUND_WITH_FIXES
depends_on: WP-A (3dbf80f, log.error/log.warn), WP-B (9230ad1, unhandledRejection net)
findings_closed: [cq-iracing-sdk#1, cq-main-index#1, cq-main-index#2]
---

# WP-C: Kill the permanent-wedge paths

Three places where a **single throw silently and irrecoverably disables a
subsystem** with zero `app.log` trace. WP-C makes each one self-heal. Depends on
WP-A's `log.error`/`log.warn`.

## Tasks

1. **`src/main/iracing-sdk.ts` — self-healing poll loop (`cq-iracing-sdk#1`).**
   `IRacingBridge.start()` runs a floating, unguarded `while (loopActive)` poll
   launched from the constructor with **no `.catch`**. Any native `irsdk-node`
   throw (`IsSimRunning`/`startSDK`/`waitForData`/`getTelemetry`) rejects the
   promise and exits the loop while `loopActive` stays `true`, so the re-entrancy
   guard makes `start()` a **permanent no-op** — iRacing is never re-detected
   until app restart, no log line. Fix:
   - Add `createLogger('iracing-sdk')`.
   - Constructor `this.start()` → `.catch(...)` so the floating promise can never
     reject unhandled.
   - Per-iteration `try/catch`: on a throw, log `error`, drop `connected` (so
     recovery re-runs `startSDK` + re-emits `Connected`), emit `Disconnected`,
     bounded linear backoff `min(500 * consecutiveErrors, 5000)`, continue.
   - Outer `try { while } finally { loopActive = false }` so a later `start()`
     can restart instead of the loop staying dead with `loopActive` stuck true.
   - `log.info` on connect + disconnect transitions. **Do NOT** log the 16 ms
     `'update'` emit (would flood `app.log` — writes are sync `appendFileSync`).

2. **`src/main/index.ts` — non-ReShade capture branch guard (`cq-main-index#1`).**
   The getUserMedia/native branch has no `try/catch` and armed the watchdog too
   late (only inside the `useNativeCapture` sub-branch), so a
   `desktopCapturer.getSources` rejection on the primary path latches
   `takingScreenshot = true` forever → every later capture rejected
   `already-taking-screenshot`. Fix:
   - Arm `armCaptureWatchdog()` **immediately after `takingScreenshot = true;`**
     so every path (native, getUserMedia, ReShade) is watchdog-covered from the
     instant the latch flips — this is the only recovery for a **hung** (never
     rejecting) `resizeIracingWindowAsync`, which no `try/catch` can catch.
   - Wrap the non-ReShade branch interior in `try/catch` →
     `restoreScreenshotState(); reportScreenshotError(error, { context:
     'resize-screenshot:capture', meta: { request: data } });` + trailing
     `return;` (load-bearing: stops a caught error falling through into the
     ReShade path).

3. **`src/main/index.ts` — guard the recovery-path fs write (`cq-main-index#2`).**
   `reportScreenshotError` calls sync `mkdirSync`/`appendFileSync` (via
   `writeScreenshotErrorLog`) unguarded; invoked from the two `setTimeout`
   recovery callbacks (watchdog, disconnect-abort) a disk error (ENOSPC/EACCES)
   becomes a **process-killing uncaught exception during recovery**. Fix: wrap
   the call in `try/catch` (log-and-continue); `logFile` becomes
   `string | undefined`.

## Plan-check correction folded in (SOUND_WITH_FIXES) — ReShade double-report race

Arming the watchdog before the branch split makes it cover the ReShade path too.
`waitForReshadeScreenshot`'s own timeout is **also 30000 ms** and the watchdog's
clock starts ~0.5–1 s earlier (UI-hide wait + resize await run between the arm
and the wait), so on a genuine ReShade timeout the **watchdog fires first**,
emitting the misleading *"the capture worker did not respond"* (ReShade uses no
worker) **and** the ReShade catch then fires a **second** report. Resolution
(keep watchdog coverage — the resize await needs the hang net):

- **Extend the ReShade `try` upward** to wrap `const id = await
  resizeIracingWindowAsync(...)` + the `id === undefined` check, so a resize
  **rejection** on the ReShade path recovers immediately (not after 35 s).
- **`clearPendingReshadeWait()` in `restoreScreenshotState()`** so any recovery
  path (watchdog, disconnect-abort) cancels a lingering ReShade wait (also frees
  the orphaned `fs.watch`/poller/timeout).
- **`wasCapturing` guard on the ReShade catch** — capture `takingScreenshot`
  before `restoreScreenshotState()`, only `reportScreenshotError` if it was still
  true → guarantees no duplicate report if another path already recovered.
- **`CAPTURE_WATCHDOG_MS` 30000 → 35000** (strictly > the ReShade 30000 wait) so
  a genuine ReShade timeout's **accurate** message wins: the reshade catch's
  `restoreScreenshotState()` → `clearCaptureWatchdog()` cancels the watchdog
  before it can fire. The 35 s net still catches a truly hung resize.

Other folded corrections: compile gate is **`npm run type-check`** (electron-vite
`pack`/`build` strip types and won't catch the `logFile` change); the
`iracing-sdk.test.ts` mock must supply a **constructable** `IRacingSDK` (instance
methods + static async `IsSimRunning`) **and** the `CameraState` named export, or
construction throws before the loop runs.

## Verify

- `npm run type-check` — clean.
- `npm test` — full suite green + new `src/main/iracing-sdk.test.ts` self-heal
  test (fake timers; assert no `unhandledRejection`, `log.error` once, `Connected`
  re-emitted after a throw, `loopActive` stays true).
- Manual repros (documented in SUMMARY) for `cq-main-index#1`/`#2`.

## Files

- `src/main/iracing-sdk.ts` (modify)
- `src/main/iracing-sdk.test.ts` (new)
- `src/main/index.ts` (modify)
