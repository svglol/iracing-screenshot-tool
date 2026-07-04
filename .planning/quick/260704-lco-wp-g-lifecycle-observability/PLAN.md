---
type: quick
slug: lco-wp-g-lifecycle-observability
created: 2026-07-04
kind: code
source: obs/code-quality audit — WP-G, plan-checked SOUND_WITH_FIXES
depends_on: WP-A (3dbf80f, log.error/warn), WP-C (4c2e253, createLogger in iracing-sdk.ts)
findings_closed: [obs-lifecycle-telemetry#1, obs-lifecycle-telemetry#2, obs-lifecycle-telemetry#3, obs-lifecycle-telemetry#4, obs-error-visibility#3]
---

# WP-G: iRacing lifecycle + environment + auto-update observability

**Observability-only** (critical path A→C→**G**). Makes the iRacing lifecycle, the
startup self-heal heartbeat, auto-update, and a startup environment baseline
visible in the sole persistent field log (`{userData}/logs/app.log`). Every change
is an additive `log.*` call or a `.catch()` reusing existing fail-open helpers —
no capture/lifecycle behaviour changes.

## Tasks

1. **Env baseline (`obs-lifecycle-telemetry#4`)** — an `Environment` line right
   after `App started`, reusing `getCaptureBackendDiagnostics()` (internally
   fail-open over WGC/VRAM FFI) + `serializeDisplay`, so a field report carries
   GPU/VRAM/display/backend/version/channel context without the user re-deriving
   it. Cannot throw out of `app.on('ready')`.
2. **Connect/disconnect two-layer record (`obs-lifecycle-telemetry#1`)** —
   `iracing-sdk.ts` logs low-level `SDK startSDK`/`SDK stopSDK` (reworded from
   WP-C's provisional `iRacing connected`/`iRacing disconnected`); the `index.ts`
   `iracing.on('Connected'/'Disconnected')` handlers log the app-facing
   transition, with `midCapture: takingScreenshot` on disconnect (the
   VRAM-exhaustion-during-capture signature). Plus a `_hadTelemetry` latch →
   `iRacing telemetry first available` once per connection.
3. **Status-poll edge (`obs-lifecycle-telemetry#3`)** — the
   `request-iracing-status` heartbeat logs only the false→true edge (via a new
   `lastIracingStatusReply` module var), so the startup-race self-heal (07f8182)
   is traceable without flooding `app.log` on every poll.
4. **Auto-update (`obs-lifecycle-telemetry#2` == `obs-error-visibility#3`, one
   defect)** — replace the lone `update-downloaded` listener with the full set
   (`checking-for-update`/`update-available`/`update-not-available`/`error`/
   `update-downloaded`) and add `.catch()` to `checkForUpdates()`; `error` +
   rejection log at ERROR. Preserve the `update-available` `webContents.send`.

## Plan-check corrections folded in (SOUND_WITH_FIXES)

1. **`_hadTelemetry` declared as a class field** (`strict: true` → accessing an
   undeclared `this._hadTelemetry` is TS2339, not gated by the loosened
   noImplicitAny). Declared in the class body + initialized in the constructor.
2. **Latch true only, never cleared on a null frame** — a momentary falsy
   `getTelemetry()` mid-connection must not re-fire the edge; `_hadTelemetry` is
   cleared *solely* in the two disconnect branches.
3. **SDK-vs-handler wording split** — finding #1 wants logging at both the
   iracing-sdk emit sites AND the index.ts handlers; to avoid two near-identical
   lines per event, the SDK layer is low-level (`SDK startSDK`/`SDK stopSDK`) and
   the index.ts layer is the semantic transition. WP-G owns this split
   (reworks WP-C's provisional lines).
4. **`log.error` requires WP-A** — landed (`3dbf80f`), so the ERROR-level
   auto-update lines compile and serialize at `level:'ERROR'`.

## Verify

- `npm run type-check` — clean (additive; new class field declared).
- `npm test` — full suite green + a new `iracing-sdk.test.ts` case asserting the
  telemetry edge fires exactly once across many frames (`_hadTelemetry` latch).
- Manual repro is the **verification of record** for the Electron-main side
  effects (tail `app.log`): one `Environment` line with non-empty captureBackend
  + displays on launch; `SDK startSDK` → `iRacing connected` → `iRacing telemetry
  first available` → one `iRacing status poll edge {ready:true}` on iRacing start;
  `iRacing disconnected {midCapture:false}` on quit; with a 404 update feed under
  NODE_ENV=production, an `Auto-update checking` then an ERROR-level `Auto-update
  error`/`checkForUpdates failed` and no unhandledRejection.

## Files

- `src/main/iracing-sdk.ts` (modify) — `_hadTelemetry` field + edge + reworded
  SDK lines.
- `src/main/index.ts` (modify) — env baseline, status edge, lifecycle handlers,
  auto-update listeners.
- `src/main/iracing-sdk.test.ts` (modify) — reword assertion + telemetry-edge test.

## No vitest for the index.ts side effects

The Environment/lifecycle/auto-update changes are Electron-main side effects over
`app`/`screen`/`autoUpdater` singletons; a meaningful test needs the electron
mock infra that is net-new (WP-M). Per the plan, manual repro is the verification
of record; the `iracing-sdk.ts` telemetry-edge latch is unit-tested.
