---
type: quick
slug: wgd-wp-f-wgc-diagnostics
created: 2026-07-04
kind: code
source: obs/code-quality audit — WP-F, plan-checked SOUND_WITH_FIXES
depends_on: WP-A (log.warn for the degraded-path lines)
findings_closed: [obs-capture-diagnostics#1, obs-capture-diagnostics#3, obs-capture-diagnostics#4, cq-capture-path#3]
---

# WP-F: WGC/VRAM failure-time diagnostics — durable + honest

The whole reason the `fix/wgc-capture-diagnostics` branch exists. The branch's own
diagnostics (commit `e7ce73c`) were defeated in their primary scenario: they
serialized only via `reportScreenshotError`, so the common WGC→getUserMedia-**success**
fallback persisted nothing; the OOM VRAM snapshot was read live AFTER iRacing exits
(ample free); a Rust worker panic was mislabeled "WGC capture timed out". All four
fixes are observability-only — the capture/fallback control flow is unchanged.

## Tasks
1. **`obs-capture-diagnostics#1`** (steps 6-8) — the WGC fallback record was lost when
   getUserMedia then succeeded. → `log.warn('WGC fell back to getUserMedia', {...full
   lastWgcAttempt})` at the single funnel point (fires BEFORE `dispatchWorkerCapture`),
   plus interior `log.warn`s in the no-frame and black-frame branches (black-frame
   upgraded `info`→`warn` + dims). Double line per event is intentional (interior
   precision + funnel durability).
2. **`obs-capture-diagnostics#3`** (steps 2-4) — the OOM VRAM read was post-exit-freed.
   → new module var `captureStartVram` sampled (guarded) at capture start, reset in
   `resetWgcAttemptDiagnostics`, surfaced as `vramAtCaptureStart` in
   `getCaptureBackendDiagnostics` alongside the live `vram`.
3. **`obs-capture-diagnostics#4`** (steps 1,5,6) — a disconnect mid-settle recorded
   `not-attempted`; `aborted` was write-only. → widen `WgcAttemptDiagnostics.outcome`
   with `'attempted'` set before the settle; `log.info` the `aborted` return.
4. **`cq-capture-path#3`** (steps 9-11, `native/wgc-capture/src/lib.rs`) — the
   `recv_timeout` `Err(_)` arm collapsed Timeout + Disconnected. → split into
   `RecvTimeoutError::Timeout` ("WGC capture timed out") and `::Disconnected`
   ("WGC worker exited without result (panic?)"). Rebuilt the addon.

## Plan-check corrections folded (SOUND_WITH_FIXES)
- **Step 11 native build (load-bearing):** no napi/@napi-rs build script exists — the
  crate is a plain cdylib. Corrected mechanics: `cargo build --release` in
  `native/wgc-capture`, then copy `target/release/wgc_capture.dll` →
  `native/wgc-capture.node` and commit the binary (target/ is gitignored). Verified
  with the win32 smoke test.
- **Step 3 VRAM timing:** `vramAtCaptureStart` is sampled at L1155 (capture start),
  which is a pre-RESIZE baseline — it proves iRacing was consuming VRAM before exit,
  it does NOT capture the high-res allocation peak. Comment reworded to not overclaim.
- **Step 8 duplicate line:** the no-frame branch already assigns `fallbackReason`;
  only the new `log.warn` was added (not a second assignment). The intentional
  double-log (funnel + interior) is documented in-code.

## Verify
- `cargo build --release` clean (5.84s incremental, no unused-import warning →
  `RecvTimeoutError` is used).
- Rebuilt `native/wgc-capture.node` loads: `wgc-capture.test.ts` smoke + invariant
  both green (N-API ABI intact).
- `npm run type-check` clean (the widened union is additive; no exhaustive switch
  keys off it). `npx vitest run` 312/312.
- Manual repros are the verification of record for the runtime side effects (lib.rs
  is native Windows-only; the fallback/VRAM/abort paths need a live capture) — listed
  in SUMMARY.

## Files
- `src/main/index.ts` (steps 1-8), `native/wgc-capture/src/lib.rs` (steps 9-10),
  `native/wgc-capture.node` (rebuilt binary, step 11).

## Coordination (index.ts region ownership)
WP-F owns the WGC-diagnostics scaffolding (`WgcAttemptDiagnostics` +
`resetWgcAttemptDiagnostics`, `getCaptureBackendDiagnostics` return, `captureAndSaveViaWgc`,
the `useNativeCapture` caller branch, the capture-start VRAM snapshot). Merged
additively with WP-E's `wgcUnavailableReason` field (both kept) and landed inside
WP-C's `armCaptureWatchdog()` guard (VRAM snapshot placed AFTER the watchdog arms so
arming stays immediate). `lib.rs` is WP-F-exclusive. Remaining after WP-F: WP-K
(Electron security), WP-M (test infra — LAST).
