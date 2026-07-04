---
type: quick-summary
slug: fnh-wp-i-filename-hardening
status: complete
date: 2026-07-04
commit: 3b14666
source: obs/code-quality audit — WP-I
depends_on: WP-A
findings_closed: [cq-utilities#1, cq-utilities#2, cq-utilities#3, cq-utilities#4, cq-utilities#5]
---

# WP-I: Harden the sole filename sanitizer + kill dead module — COMPLETE

`resolveFilenameFormat` is the ONE sanitizer both capture backends use (main
index.ts + renderer Worker.vue via buildUniqueScreenshotName).

| Finding | Change |
|---------|--------|
| `cq-utilities#1` | Control/NUL bytes survived — a NUL crashes the sharp write (`ERR_INVALID_ARG_VALUE`), a tab/newline corrupts the on-disk name. Added a `/[\x00-\x1F\x7F]/g` strip **before** the empty check (so an all-control-char name collapses and triggers the fallback). |
| `cq-utilities#2` | An all-empty custom format returned `''` → degenerate bare `.jpg`. Added an all-empty fallback to `FALLBACK_FORMAT`, **Unicode-aware** (`\p{L}/\p{N}`) and only when there's no explicit `{counter}` (so a bare `{counter}` format is preserved). |
| `cq-utilities#3` | Windows reserved device names (CON/NUL/COM1..) were emitted bare. Exact-whole-name guard prefixes `_` (`CONWAY`/`CON-{counter}` left alone, matching the OS rule). |
| `cq-utilities#4` | `buildUniqueScreenshotName` expanded `{counter}` via `String.replace` (first occurrence only), leaving a literal `{counter}` in a two-counter format. Switched to `split('{counter}').join(...)`. |
| `cq-utilities#5` | The control-char-safe `sanitizeFilePart` in `screenshot-name.ts` was **dead** (imported-unused in Worker.vue, referenced only by its own test) and misdirected reviewers into thinking control chars were handled. Deleted the module + its ~340-line test + the dead Worker.vue import. Delete (not rewire): full delegation to `sanitizeFilePart` isn't behaviour-preserving — it collapses spaces to `_`, breaking the existing `Monza-Bob Smith-{counter}` contract. |

## Plan-check corrections folded (SOUND_WITH_FIXES)
- **Unicode emptiness check** — used `/[\p{L}\p{N}]/u`, not ASCII `[a-z0-9]`,
  which would silently discard a CJK/Cyrillic track or driver name under a
  counterless custom format (a real regression the Latin-only fixtures wouldn't
  catch). Added a CJK-preservation test. Matches project memory.
- Compile gate is `npm run type-check` (vue-tsc), not pack/tsc; pack only
  smoke-proves the deleted module has no remaining importer.

## Verification
- `npm run type-check` → clean (exit 0) — also proves no dangling import to the
  deleted module.
- `npm test` → **303/303 across 13 files** (was 342/14: −screenshot-name.test.ts's
  ~35 cases, +7 new). New locking tests: control-char strip, reserved-name prefix,
  reserved-lookalike left alone, empty→fallback, bare-`{counter}` preserved, CJK
  preserved, multi-`{counter}` (`Daytona-0-0`). Existing `Monza-Bob Smith-{counter}`
  / `Autodromo Nazionale Monza-Smith, B-7-{counter}` stay green (proves spaces are
  still preserved — the fix did NOT route through sanitizeFilePart).
- `grep screenshot-name / buildScreenshotFileKey` → **zero** hits.

## Coordination
Worker.vue edit is ONLY the dead-import deletion (isolated top-of-`<script>` hunk).
No `index.ts` edits. filenameFormat.ts / screenshot-output.ts owned solely by WP-I.

## Progress
Done: A, B, C, G, L, H, D, I (8/13). Remaining: J (VRAM adapter-matching), E
(native-stack observability + index.ts), F (WGC diagnostics + Rust), K (Electron
security), M (test infra).
