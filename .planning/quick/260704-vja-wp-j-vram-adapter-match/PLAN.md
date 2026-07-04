---
type: quick
slug: vja-wp-j-vram-adapter-match
created: 2026-07-04
kind: code
source: obs/code-quality audit — WP-J, plan-checked SOUND_WITH_FIXES
depends_on: WP-A
findings_closed: [cq-capture-path#1, cq-capture-path#4]
---

# WP-J: VRAM adapter-matching + PDH NEW_DATA

`vram-utils.ts` fed the OOM predictor a global-max `used` combined with a
largest-adapter `total` — never adapter-matched.

## Tasks
1. **`cq-capture-path#1`** — multi-GPU `used`/`total` mismatch clamped freeBytes
   to 0 and over-warned. → `readUsed` returns per-instance `{instanceName,bytes}`;
   pure `selectUsedInstance(instances, total)` excludes over-total (foreign)
   adapters, returns busiest-plausible, falls back to global busiest; getVramInfo
   `log.warn`s on mismatch.
2. **`cq-capture-path#4`** — PDH loop dropped CStatus 1 (NEW_DATA), silently
   nulling `used`. → pure `isValidPdhStatus` accepts 0 and 1.

## Plan-check corrections folded (SOUND_WITH_FIXES)
- Added a hoisted `vi.mock('../utilities/logger')` to vram-utils.test.ts — the new
  module-top `createLogger` eagerly runs `init()`, which throws under vitest and
  broke collection. **Single coordinated copy** for WP-E to reuse.
- Scoped this edit to the used-selection block + the mismatch `log.warn` only;
  left the `console.error` lines (317/335/345) for WP-E's conversion.
- Swapped the planned `koffi.decode(szName)` for an enumeration-index label —
  dereferencing a 64-bit BigInt address via koffi is unverified and could fault
  the process on the real FFI path (the name only feeds the diagnostic).

## Verify
- `npm run type-check` clean; `npm test` — new pure suites (isValidPdhStatus,
  selectUsedInstance incl. dual-dGPU false-positive repro); win32 FFI smoke green.

## Files
- `src/main/vram-utils.ts`, `src/main/vram-utils.test.ts`.

## Coordination (two-package files)
`vram-utils.ts` + `vram-utils.test.ts` are ALSO edited by WP-E (console.error→log
conversion). WP-J owns the `vi.mock` guard + the `createLogger` import + the
selection/mismatch logic; WP-E reuses the import (don't re-add) and converts the
console.error lines. No `index.ts` edits. Follow-up: true LUID join via DXGI
(CreateDXGIFactory1→EnumAdapters1→GetDesc1) — out of scope (COM vtable risk).
