---
type: quick-summary
slug: vja-wp-j-vram-adapter-match
status: complete
date: 2026-07-04
commit: cac48b7
source: obs/code-quality audit — WP-J
depends_on: WP-A
findings_closed: [cq-capture-path#1, cq-capture-path#4]
---

# WP-J: VRAM adapter-matching + PDH NEW_DATA — COMPLETE

| Finding | Change |
|---------|--------|
| `cq-capture-path#1` | `used` was the global-max Dedicated Usage across ALL adapters, `total` the largest-memory adapter — never matched. On a multi-GPU box `used` could come from a busier foreign card, so assessVram's `freeBytes = max(0, total - used)` clamped to 0 and **over-warned**. `readUsed` now returns per-instance `{instanceName, bytes}`; new pure `selectUsedInstance(instances, total)` excludes any instance whose usage exceeds `total` (provably a foreign adapter — a card can't use more dedicated VRAM than it has) and returns the busiest of the rest, falling back to the global busiest when total is unknown. `getVramInfo` `log.warn`s when the attributed instance isn't the global busiest, so a residual dual-dGPU mismatch is diagnosable. |
| `cq-capture-path#4` | The PDH loop accepted only CStatus 0 (VALID_DATA) and dropped 1 (NEW_DATA), which would silently null out `readUsed` and disable the guardrail if a driver reported NEW_DATA on the single collect. New pure `isValidPdhStatus` accepts both. |

## Plan-check corrections folded (SOUND_WITH_FIXES)
- **Logger mock (verification-breaking fix)** — the new module-top
  `createLogger('vram-utils')` eagerly runs `init()` → `require('electron').app.
  getPath()`, which throws under vitest and would fail vram-utils.test.ts at
  **collection**. Added a hoisted `vi.mock('../utilities/logger')`; single
  coordinated copy so WP-E reuses it rather than adding a second.
- **Scope discipline** — limited this edit to the used-selection block + the
  mismatch `log.warn`; left the `console.error` lines (317/335/345) untouched for
  WP-E's console→logger conversion (avoids a redundant-edit conflict).
- **koffi.decode swapped out** — the plan wanted the szName LPWSTR decoded via
  `koffi.decode(namePtr, 'str16')`, but dereferencing a 64-bit **BigInt** address
  through koffi is unverified and could fault the process on the real FFI path
  (which the win32 smoke test exercises on this box). The name only feeds the
  diagnostic, so I label by enumeration index (`instance-${i}`) — crash-free,
  core fix intact. The true LUID join needs DXGI (flagged follow-up).

## Verification
- `npm run type-check` → clean (exit 0; caught + fixed a leftover inline
  `readUsed(): number` annotation on the concrete impl).
- `npm test` → **311/311 across 13 files** (+8). New pure tests:
  `isValidPdhStatus` (0/1 accepted, 2/0xC0000000 rejected); `selectUsedInstance`
  (empty→null, single, busiest-of-many, **over-total foreign excluded** = the
  dual-dGPU false-positive repro proving free=18GB not 0, unknown-total→global
  busiest, all-over-total→global busiest). The **win32 FFI smoke tests still pass
  on this box** — confirming the logger mock + the new `UsedInstance[]` return
  shape work end-to-end through real koffi.

## Coordination (two-package files)
`vram-utils.ts` + `vram-utils.test.ts` are also edited by **WP-E**. WP-J owns the
`vi.mock` guard, the `createLogger` import, and the selection/mismatch logic; WP-E
must **reuse** the import (not re-add) and convert the `console.error` lines. No
`index.ts` edits.

## Progress
Done: A, B, C, G, L, H, D, I, J (9/13). Remaining: E (native-stack observability +
index.ts), F (WGC diagnostics + Rust), K (Electron security), M (test infra).
