---
type: quick
slug: nso-wp-e-native-observability
created: 2026-07-04
kind: code
source: obs/code-quality audit — WP-E, autonomous execution
depends_on: WP-A (logger warn/error levels), WP-J (vram-utils vi.mock + createLogger import)
findings_closed: [obs-capture-diagnostics#2, obs-error-visibility#3, obs-error-visibility#4]
---

# WP-E: Native-stack observability

The native capture stack (WGC addon, koffi `window-utils`, koffi `vram-utils`)
plus the config/ReShade paths swallowed failures into bare `console.log`/
`console.error` or dropped them silently. A fallback from WGC→getUserMedia, a
`SetWindowPos` no-op, a VRAM FFI miss, or a corrupt-config reset left no
diagnostic trail — the audit's WEAK observability verdict for the native layer.

## Tasks
1. **`obs-capture-diagnostics#2`** — a bare `wgcAvailable:false` was a dead end.
   → `wgc-capture.ts` gains `wgcUnavailableReason`, set in all five
   `createWgcApi()` null branches (bad platform / addon missing / ABI unexpected /
   OS unsupported / isSupported threw), cleared on success. New self-initializing
   `getWgcUnavailableReason()` forces `getWgcApi()` so the reason is populated
   regardless of call order. Surfaced in `getCaptureBackendDiagnostics()` via a
   guarded IIFE (never throws into the diagnostics object).
2. **`obs-error-visibility#3`** — native/FFI faults went to console or nowhere.
   → `window-utils.ts`: logger added; `GetWindowRect` failure now `log.warn` +
   throws `IracingWindowUnresolvedError` (both callers already handle it);
   `SetWindowPos` failure captured via a new `GetLastError` kernel32 binding +
   `log.warn`; koffi-load / PowerShell-stderr(×2) / JSON-parse / async-spawn /
   async-close faults converted from console to `log.warn`/`log.error`.
   `vram-utils.ts`: 3 `console.error` → `log.warn` (FFI unavailable / total read /
   used read). `wgc-capture.ts`: `captureWindow` fallback → `log.warn`.
   `index.ts`: `listReshadeScreenshotFiles` stat `console.log(error)` → `log.warn`
   with `{fullPath, error}`.
3. **`obs-error-visibility#4`** — a corrupt `config.json` was wiped silently.
   → `config.ts` logs `.error('config.json corrupt; …')` BEFORE `unlink`, via a
   lazy `require('../utilities/logger')` so the renderer-side import of config.ts
   never triggers logger `init()`. `main-utils.ts`: ReShade folder-remap
   `console.log` → `log.info('ReShade screenshot folder remapped', {from,to})`.

## Verify
- `npm run type-check` clean.
- `npx vitest run` — 312/312 across 13 files; new `getWgcUnavailableReason`
  invariant test (reason===null iff `isWgcAvailable()`).

## Files
- `src/main/wgc-capture.ts`, `src/main/wgc-capture.test.ts`,
  `src/main/window-utils.ts`, `src/main/window-utils.test.ts`,
  `src/main/vram-utils.ts`, `src/main/main-utils.ts`, `src/main/main-utils.test.ts`,
  `src/utilities/config.ts`, `src/main/index.ts`.

## Coordination (two-package files)
- `vram-utils.ts` — WP-J owns the `vi.mock` guard + `createLogger` import + the
  selection/mismatch logic; WP-E **reused** that import (did not re-add) and
  converted only the three `console.error` lines. ✅
- `index.ts` — also touched by WP-F (WGC diagnostics) and WP-K (Electron
  security). WP-E's edits are limited to the import line, the
  `wgcUnavailableReason` diagnostics field, and the ReShade stat `log.warn`.
- Logger `vi.mock` added to `window-utils.test.ts`, `main-utils.test.ts`,
  `wgc-capture.test.ts` (module-top `createLogger` throws under vitest);
  `vram-utils.test.ts` already had it from WP-J.

## Deferred to WP-F
The WGC *capture-time* diagnostics defeat (the primary-scenario finding) and the
Rust `lib.rs` side are WP-F. WP-E is observability-only for the JS/koffi layer —
no capture-flow behavior changes beyond the new `IracingWindowUnresolvedError`
throw on `GetWindowRect` failure (both callers already fall back).
