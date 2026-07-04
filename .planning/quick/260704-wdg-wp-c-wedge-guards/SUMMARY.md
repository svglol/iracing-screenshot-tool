---
type: quick-summary
slug: wdg-wp-c-wedge-guards
status: complete
date: 2026-07-04
commit: 4c2e253
source: obs/code-quality audit — WP-C
depends_on: WP-A (3dbf80f), WP-B (9230ad1)
findings_closed: [cq-iracing-sdk#1, cq-main-index#1, cq-main-index#2]
---

# WP-C: Kill the permanent-wedge paths — COMPLETE

Eliminated the three paths where a **single throw silently and irrecoverably
disabled a subsystem** with zero `app.log` trace. Each now self-heals. Depends on
WP-A's `log.error`/`log.warn` and benefits from WP-B's `unhandledRejection` net.

## What changed

| Finding | Change |
|---------|--------|
| `cq-iracing-sdk#1` | `IRacingBridge.start()` was a floating, unguarded `while (loopActive)` poll from the constructor with **no `.catch`** — a native `irsdk-node` throw exited the loop while `loopActive` stayed `true`, making `start()` a **permanent no-op** (iRacing never re-detected until app restart). Now: **per-iteration `try/catch`** self-heals (drops connection so recovery re-runs `startSDK` + re-emits `Connected`, emits `Disconnected`, bounded linear backoff `min(500 * n, 5000)`ms, continues); **outer `try/finally`** always resets `loopActive` so a later `start()` can restart; **`.catch`** on the constructor call; `log.info` connect/disconnect + `log.error` on the self-heal. The 16 ms `update` emit is deliberately **not** logged (would flood the sync `appendFileSync` log). |
| `cq-main-index#1` | The non-ReShade capture branch had **no `try/catch`** and armed the watchdog too late, so a `desktopCapturer.getSources` rejection on the primary getUserMedia path latched `takingScreenshot = true` forever (every later capture rejected `already-taking-screenshot`). Now `armCaptureWatchdog()` fires the **instant `takingScreenshot` flips** — before the branch split, so it also nets a **hung** (never-rejecting) `resizeIracingWindowAsync`, which no `try/catch` can recover — and the branch is wrapped in `try/catch` → `restoreScreenshotState()` + `reportScreenshotError(..., 'resize-screenshot:capture')` + trailing `return`. |
| `cq-main-index#2` | `reportScreenshotError`'s sync `mkdirSync`/`appendFileSync` (via `writeScreenshotErrorLog`) ran unguarded; called from the watchdog and disconnect-abort `setTimeout` callbacks, a disk error (ENOSPC/EACCES) became a **process-killing uncaught exception during recovery**. Now wrapped in `try/catch` (log-and-continue); `logFile` is `string \| undefined`. |

## Plan-check correction folded in — ReShade double-report race (SOUND_WITH_FIXES)

Arming the watchdog before the branch split makes it cover the ReShade path,
whose own `waitForReshadeScreenshot` timeout is **also 30000 ms**. The watchdog
starts ~0.5–1 s earlier (UI-hide wait + resize await run between the arm and the
wait), so on a genuine ReShade timeout it **fired first** with the misleading
*"the capture worker did not respond"* (ReShade uses no worker) **and** the
ReShade catch then reported a **second** time. Resolved with four coordinated
changes (watchdog coverage kept — the resize await needs the hang net):

1. **Extended the ReShade `try` upward** over `const id = await
   resizeIracingWindowAsync(...)` + the `id === undefined` check → a resize
   **rejection** now recovers immediately instead of after the 35 s net.
2. **`clearPendingReshadeWait()` in `restoreScreenshotState()`** → any recovery
   path (watchdog, disconnect-abort) cancels a lingering ReShade wait, freeing
   its `fs.watch`/poller/timeout and stopping a late second report at the source.
3. **`wasCapturing` guard on the ReShade catch** → `reportScreenshotError` only
   if `takingScreenshot` was still true when the error hit; a prior recovery
   can't produce a duplicate report.
4. **`CAPTURE_WATCHDOG_MS` 30000 → 35000** (strictly > the ReShade 30000 wait) →
   a genuine ReShade timeout wins its own race; the reshade catch's
   `restoreScreenshotState()` → `clearCaptureWatchdog()` cancels the watchdog
   before 35 s, so the **accurate** message survives. The 35 s net still catches
   a truly hung resize on any path.

Other folded corrections: compile gate is **`npm run type-check`** (electron-vite
`pack`/`build` strip types); the `iracing-sdk.test.ts` mock supplies a
**constructable** `IRacingSDK` (instance methods + static async `IsSimRunning`)
**and** the `CameraState` named export, or construction throws before the loop.

## Verification

- `npm run type-check` → **clean**.
- `npm test` → **329/329 across 13 files** (326 prior + 3 new). New
  `src/main/iracing-sdk.test.ts`: (a) no `unhandledRejection` escapes a native
  throw, (b) the throw is `log.error`'d exactly once with `consecutiveErrors: 1`,
  (c) the loop reconnects (`Connected` re-emitted, `startSDK` called), (d)
  `loopActive` stays true; plus a clean-start transition test and a
  finally-releases-`loopActive` restart test.
- **Manual repros** (for QA on a Windows box, not run here):
  - `cq-main-index#1`: disable High-Fidelity capture (forces getUserMedia), make
    `desktopCapturer.getSources` reject, trigger a capture → `app.log` shows the
    `resize-screenshot:capture` error, window restores, a second capture is
    accepted. Leave it as a **hang** instead → the 35 s watchdog restores.
  - `cq-main-index#2`: make the userData logs dir read-only so `appendFileSync`
    throws, force the watchdog/disconnect-abort path → `log.error('Failed to
    write screenshot error log')` is attempted and recovery completes without
    crashing.
  - ReShade race: force a ReShade timeout → **one** error, the accurate *"Timed
    out waiting for a ReShade screenshot"* (not the watchdog's worker message).

## Coordination notes (shared file `src/main/index.ts`)

- `reportScreenshotError`: WP-C **only** wraps the `writeScreenshotErrorLog`
  call; other WPs touching its diagnostics assembly must keep that wrap.
- Capture handler: `armCaptureWatchdog()` at the latch + the non-ReShade
  `try/catch`. `obs-capture-diagnostics#1`'s WGC-fallback/black-frame log lines
  belong **inside** the new try block — re-nest, don't append after it. Do **not**
  add a second `armCaptureWatchdog()`; the `useNativeCapture` call is a re-arm.
- `iracing-sdk.ts`: `obs-lifecycle-telemetry#1` (connect/disconnect logging)
  should build on this rewrite's `log.info('iRacing connected'/'iRacing
  disconnected')` + the `createLogger` import rather than re-adding them.

## Behavior-change flags

- `CAPTURE_WATCHDOG_MS` is now **35 s** (was 30 s) for all paths — a benign
  safety-net delay; the primary recovery on both branches is now the immediate
  `try/catch`.
- Registering the `.catch` + inner self-heal means a native `irsdk-node` fault no
  longer kills detection — the bridge **keeps polling** and reconnects.

## Follow-ups

Critical path **A → C → G** — next is **WP-G**. The remaining packages (D, E, F,
H, I, J, K, L, M) are independent of the wedge fixes. WP-A + WP-B + WP-C together
close the **foundation + both wedge fixes** — a natural milestone.
