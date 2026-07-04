---
type: quick-summary
slug: wgd-wp-f-wgc-diagnostics
status: complete
date: 2026-07-04
commit: f0aaccc
source: obs/code-quality audit — WP-F
depends_on: WP-A
findings_closed: [obs-capture-diagnostics#1, obs-capture-diagnostics#3, obs-capture-diagnostics#4, cq-capture-path#3]
---

# WP-F: WGC/VRAM failure-time diagnostics — durable + honest — COMPLETE

The headline finding of the branch. The diagnostics added in `e7ce73c` were
defeated in their primary scenario; WP-F makes them durable and truthful without
touching the capture/fallback control flow.

| Finding | Change |
|---------|--------|
| `obs-capture-diagnostics#1` | A WGC→getUserMedia fallback that then SUCCEEDED left no record — the snapshot serialized only via `reportScreenshotError`, which fires on a *reported* error, so H1(timeout/no-frame)-vs-H2(alloc/black) was unrecoverable from `app.log`. Now the single fallback funnel (the point ALL fallback variants pass through, BEFORE `dispatchWorkerCapture`) emits `log.warn('WGC fell back to getUserMedia', {fallbackReason, grabElapsedMs, frameDims, outcome})` — independent of downstream success, so a getUserMedia win can't erase the evidence. The interior no-frame branch adds a `log.warn` (with native reason + grab timing); the black-frame branch is upgraded `log.info`→`log.warn` + `{grabElapsedMs, frameDims}`. The two lines per no-frame/black-frame event (interior + funnel) are intentional and documented in-code. |
| `obs-capture-diagnostics#3` | The OOM-disconnect error read `getVramInfo()` LIVE, after iRacing had already freed its VRAM (reportScreenshotError only fires once `iracing.telemetry` is null), so it showed ample free and argued against the very VRAM hypothesis it asserted. New module var `captureStartVram` is sampled (fully try/catch-guarded) at capture start and reset in `resetWgcAttemptDiagnostics`; `getCaptureBackendDiagnostics` now returns `vramAtCaptureStart` next to the live `vram` (both kept — additive). Per plan-check: it is a pre-RESIZE baseline (sampled before the window grows to capture resolution), so it proves iRacing was using VRAM before exit — it does NOT capture the high-res allocation peak; the comment says so rather than overclaiming H2. |
| `obs-capture-diagnostics#4` | A disconnect during the ~settle window recorded `wgcOutcome:'not-attempted'` (the reset value), and the `'aborted'` return produced no log. Widened `WgcAttemptDiagnostics.outcome` with an in-progress `'attempted'` marker set BEFORE the settle delay in `captureAndSaveViaWgc`, so a mid-settle disconnect attributes the failure to WGC; split the caller's combined `if (saved||aborted) return` so `'aborted'` emits `log.info('WGC capture aborted mid-flight', {grabElapsedMs})` (a correlation breadcrumb — the abort is already reported by the disconnect/watchdog path). |
| `cq-capture-path#3` | `native/wgc-capture/src/lib.rs` `recv_timeout`'s `Err(_)` arm collapsed `Timeout` and `Disconnected` into "WGC capture timed out", so a worker-thread panic (tx dropped → `Disconnected`, returns immediately with grabElapsedMs≈0) was mislabeled a slow timeout — contradicting the JS-recorded timing. Added `use std::sync::mpsc::RecvTimeoutError;` and split the arm into `::Timeout` ("WGC capture timed out") and `::Disconnected` ("WGC worker exited without result (panic?)"). |

## Native rebuild (step 11 — load-bearing)
The prebuilt `native/wgc-capture.node` is what runs; the lib.rs edit ships ONLY if
it is rebuilt. Plan-check corrected the mechanics (no napi build script — plain
cdylib): `cargo build --release` in `native/wgc-capture` (**5.84s** incremental,
**no unused-import warning** → `RecvTimeoutError` is actually used), then copied
`target/release/wgc_capture.dll` → `native/wgc-capture.node` and committed the
binary (git tracks it as modified: `Bin 439296 → 439296`, same size, new content).

## Verification
- `npm run type-check` → clean (the widened `outcome` union is additive; the return
  type `WgcCaptureOutcome` = `saved|fallback|aborted` is a SEPARATE type, unchanged).
- `npx vitest run` → **312/312 across 13 files** (unchanged — WP-F is
  observability-only; no unit surface). `wgc-capture.test.ts` smoke + the
  `getWgcUnavailableReason` invariant both pass against the REBUILT `.node`,
  confirming the N-API ABI survived the rebuild.
- Manual repros (verification of record — the runtime side effects need a live
  capture; lib.rs is native Windows-only): (1) force a WGC fallback that then saves
  via getUserMedia → grep `WGC fell back to getUserMedia` with payload; (2) kill
  iRacing.exe mid-capture → `screenshot-errors.log` shows `vramAtCaptureStart` with
  non-trivial `usedBytes` distinct from the freed live `vram`; (3) kill iRacing
  during the settle → `wgcOutcome:'attempted'` + `WGC capture aborted mid-flight`;
  (4) temp `panic!` in the worker closure, rebuild → thrown reason is `WGC worker
  exited without result (panic?)` with grabElapsedMs≈0, not the timeout string;
  (5) regression: a normal nativeCapture save + a normal getUserMedia save both
  still save and restore.

## Coordination
`src/main/index.ts` is shared with WP-C/WP-E. Merged additively: kept WP-E's
`wgcUnavailableReason` field alongside the new `vramAtCaptureStart`; placed the
VRAM snapshot AFTER WP-C's `armCaptureWatchdog()` so the watchdog still arms the
instant the latch flips. `lib.rs` is WP-F-exclusive.

## Progress
Done: A, B, C, G, L, H, D, I, J, E, F (11/13). Remaining: **K** (Electron security —
webPreferences / navigation guards), **M** (renderer + electron-mock test infra +
logger.integration.test.ts — LAST, depends on A/F/C/D/H).
