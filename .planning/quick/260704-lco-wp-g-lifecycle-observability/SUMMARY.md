---
type: quick-summary
slug: lco-wp-g-lifecycle-observability
status: complete
date: 2026-07-04
commit: b247897
source: obs/code-quality audit — WP-G
depends_on: WP-A (3dbf80f), WP-C (4c2e253)
findings_closed: [obs-lifecycle-telemetry#1, obs-lifecycle-telemetry#2, obs-lifecycle-telemetry#3, obs-lifecycle-telemetry#4, obs-error-visibility#3]
---

# WP-G: lifecycle + environment + auto-update observability — COMPLETE

**Observability-only** (critical path A→C→**G** — the last of the critical path).
Made the iRacing lifecycle, the startup self-heal heartbeat, auto-update, and a
startup environment baseline visible in the sole persistent field log
(`{userData}/logs/app.log`). Every change is an additive `log.*` call or a
`.catch()` reusing existing fail-open helpers — **no capture/lifecycle behaviour
changes**.

## What changed

| Finding | Change |
|---------|--------|
| `obs-lifecycle-telemetry#4` | An `Environment` line right after `App started` reusing `getCaptureBackendDiagnostics()` (internally fail-open over WGC/VRAM FFI) + `serializeDisplay` → one durable line pinning version/channel/platform/arch/electron/node + `captureBackend` (nativeCapture, wgcAvailable, vram.adapterName) + `displays.count/primary`, so a field report carries the GPU/VRAM/display/backend context without the user re-deriving it. |
| `obs-lifecycle-telemetry#1` | Connect/disconnect is now a clean **two-layer record**: `iracing-sdk.ts` logs low-level `SDK startSDK`/`SDK stopSDK`; the `index.ts` `iracing.on('Connected'/'Disconnected')` handlers log the app-facing transition, with `midCapture: takingScreenshot` on disconnect (the VRAM-exhaustion-during-capture signature). A `_hadTelemetry` latch emits `iRacing telemetry first available` **once per connection** — the authoritative "data is flowing" edge, distinct from the Connected transition (which fires a beat earlier at startSDK). |
| `obs-lifecycle-telemetry#3` | The `request-iracing-status` heartbeat logs only the **false→true edge** (via a new `lastIracingStatusReply` module var), making the startup-race self-heal (`07f8182`) traceable without flooding `app.log` on every renderer poll. |
| `obs-lifecycle-telemetry#2` == `obs-error-visibility#3` | Replaced the lone `autoUpdater.on('update-downloaded')` listener with the full set (`checking-for-update`/`update-available`/`update-not-available`/`error`/`update-downloaded`) and added `.catch()` to `checkForUpdates()`. `error` + the rejection log at **ERROR** so field triage can filter them (previously this whole path was silent + a floating promise). The `update-available` `webContents.send` side effect is preserved. |

## Plan-check corrections folded in (SOUND_WITH_FIXES)

1. **`_hadTelemetry` declared as a class field** — `strict: true` makes an
   undeclared `this._hadTelemetry` a TS2339 build break (not gated by the
   loosened noImplicitAny). Declared in the class body + initialized `false` in
   the constructor.
2. **Latch true only, cleared solely on disconnect** — a momentary falsy
   `getTelemetry()` mid-connection must not re-fire the edge; the two disconnect
   branches (not-running + self-heal catch) reset it, nothing else.
3. **SDK-vs-handler wording split** — reworded WP-C's provisional `iRacing
   connected`/`iRacing disconnected` at the SDK emit sites to the low-level `SDK
   startSDK`/`SDK stopSDK`, keeping the semantic transition in the index.ts
   handlers, so there aren't two near-identical lifecycle lines per event.
4. **`log.error` dependency on WP-A** — landed (`3dbf80f`), so the ERROR-level
   auto-update lines compile and serialize at `level:'ERROR'`.

## Verification

- `npm run type-check` → **clean** (exit 0; new class field declared).
- `npm test` → **330/330 across 13 files** (329 prior + 1 new). Updated
  `iracing-sdk.test.ts`: the clean-start assertion now checks `SDK startSDK` (the
  new low-level line), and a new case asserts `iRacing telemetry first available`
  fires **exactly once** across many frames (the `_hadTelemetry` latch holds).
- **Manual repro** (verification of record for the Electron-main side effects;
  QA on a Windows box): tail `app.log` → one `Environment` line with non-empty
  captureBackend + displays on launch; `SDK startSDK` → `iRacing connected` →
  `iRacing telemetry first available` → one `iRacing status poll edge {ready:true}`
  on iRacing start; `iRacing disconnected {midCapture:false}` on quit; with a 404
  update feed under `NODE_ENV=production`, `Auto-update checking` then an
  ERROR-level `Auto-update error`/`checkForUpdates failed` and **no**
  unhandledRejection.

## Coordination notes (shared file `src/main/index.ts`)

- The `Environment` line, status-poll edge, and Connected/Disconnected logs were
  **appended** into the existing `app.on('ready')` body (not a rewrap), so other
  ready-handler WPs slot in without collision.
- WP-G **owns** the auto-update observability block (`obs-lifecycle-telemetry#2`
  == `obs-error-visibility#3`); a global `unhandledRejection` handler belongs at
  module top (WP-B already added one there) — no collision.
- `getCaptureBackendDiagnostics()`/`buildMainScreenshotDiagnostics()` are reused
  **read-only** by the Environment line; the obs-capture-diagnostics WPs may edit
  their internals freely.

## Milestone

WP-A → WP-C → **WP-G** completes the audit's **critical path**. Remaining packages
(D, E, F, H, I, J, K, L, M) are independent of it. Next natural targets: WP-E/WP-F
(route the ~41 discarded `console.*` calls through the logger) or WP-D.
