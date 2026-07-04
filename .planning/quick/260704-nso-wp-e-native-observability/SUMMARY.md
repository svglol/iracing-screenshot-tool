---
type: quick-summary
slug: nso-wp-e-native-observability
status: complete
date: 2026-07-04
commit: 35d7f61
source: obs/code-quality audit — WP-E
depends_on: WP-A, WP-J
findings_closed: [obs-capture-diagnostics#2, obs-error-visibility#3, obs-error-visibility#4]
---

# WP-E: Native-stack observability — COMPLETE

| Finding | Change |
|---------|--------|
| `obs-capture-diagnostics#2` | A capture that fell back to getUserMedia recorded only `wgcAvailable:false` with no cause. `wgc-capture.ts` now holds `wgcUnavailableReason`, set to a concrete string in each of the five `createWgcApi()` null branches (`non-Windows platform` / `addon missing / ABI mismatch: …` / `addon ABI unexpected` / `OS unsupported (needs Win10 1903+)` / `isSupported() threw: …`) and cleared to `null` on success. New **self-initializing** `getWgcUnavailableReason()` calls `getWgcApi()` first, so the invariant `reason===null ⟺ isWgcAvailable()` holds regardless of read order. `getCaptureBackendDiagnostics()` surfaces it through a guarded IIFE that returns `null` rather than throwing into the diagnostics object. |
| `obs-error-visibility#3` | Native/FFI faults were console-only or silent. **`window-utils.ts`**: `GetWindowRect` failure → `log.warn` + `throw IracingWindowUnresolvedError` (both `getIracingWindowDetails` callers already catch and fall back); `SetWindowPos` failure now captured via a new `GetLastError` kernel32 binding and `log.warn`ed with the last-error code; koffi-load, PowerShell-stderr (×2), JSON-parse, async spawn/close faults converted console→`log.warn`/`log.error`. **`vram-utils.ts`**: 3 `console.error`→`log.warn` (FFI unavailable / total read failed / used read failed). **`wgc-capture.ts`**: `captureWindow` fallback→`log.warn`. **`index.ts`**: `listReshadeScreenshotFiles` stat `console.log(error)`→`log.warn` with `{fullPath, error}`. |
| `obs-error-visibility#4` | A corrupt `config.json` was deleted with no record. `config.ts` now logs `.error('config.json corrupt; deleting and resetting to defaults', {error})` **before** the `unlink`, via a lazy `require('../utilities/logger')` inside the catch so config.ts's renderer-side import never triggers logger `init()`. `main-utils.ts` ReShade folder remap `console.log`→`log.info` with `{from,to}`. |

## Verification
- `npm run type-check` → clean (exit 0).
- `npx vitest run` → **312/312 across 13 files** (+1 vs WP-J's 311). New
  `getWgcUnavailableReason` invariant test asserts the biconditional
  (`reason===null` ⟺ `isWgcAvailable()`) and that the reason is a non-empty
  diagnostic string when unavailable — robust across platforms (under vitest the
  electron `app` shim is absent, so `createWgcApi`'s addon require() fails and WGC
  reports unavailable-with-a-reason, still satisfying the invariant). The **win32
  FFI smoke tests still pass on this box** — the new `window-utils`/`vram-utils`
  loggers and the `GetWindowRect`-throws path work through real koffi.

## Coordination folded
- **`vram-utils.ts` (with WP-J)** — reused WP-J's `createLogger` import + `vi.mock`
  guard; converted only the three `console.error` lines. No duplicate import.
- **Test mocks** — added the hoisted `vi.mock('../utilities/logger')` to
  `window-utils.test.ts`, `main-utils.test.ts`, `wgc-capture.test.ts` (each gained
  a module-top `createLogger` that throws under vitest at collection).
- **`index.ts` scope** — limited to the `getWgcUnavailableReason` import, the
  `wgcUnavailableReason` diagnostics field, and the ReShade stat `log.warn`; left
  the WGC capture-time diagnostics for WP-F and the Electron-security surface for
  WP-K.

## Progress
Done: A, B, C, G, L, H, D, I, J, E (10/13). Remaining: **F** (WGC capture-time
diagnostics + native `lib.rs` Rust — cargo build), **K** (Electron security),
**M** (test infra — LAST, depends on A/F/C/D/H).
