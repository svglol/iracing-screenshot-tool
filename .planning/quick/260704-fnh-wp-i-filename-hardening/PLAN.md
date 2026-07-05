---
type: quick
slug: fnh-wp-i-filename-hardening
created: 2026-07-04
kind: code
source: obs/code-quality audit — WP-I, plan-checked SOUND_WITH_FIXES
depends_on: WP-A
findings_closed: [cq-utilities#1, cq-utilities#2, cq-utilities#3, cq-utilities#4, cq-utilities#5]
---

# WP-I: Harden the sole filename sanitizer + kill dead module

`resolveFilenameFormat` (filenameFormat.ts) is the ONE sanitizer both capture
backends use; it stripped only diacritics + the 9 Windows-unsafe chars.

## Tasks
1. **`cq-utilities#1`** — control/NUL bytes survived (NUL crashes sharp;
   tab/newline corrupts the name). → strip `/[\x00-\x1F\x7F]/g` **before** the
   empty check.
2. **`cq-utilities#2`** — all-empty custom format returned `''` (degenerate
   `.jpg`). → fallback to `FALLBACK_FORMAT`, Unicode-aware, only when no
   `{counter}`.
3. **`cq-utilities#3`** — reserved device names emitted bare. → exact-whole-name
   guard prefixes `_`.
4. **`cq-utilities#4`** — `buildUniqueScreenshotName` `String.replace('{counter}')`
   filled only the first. → `split/join`.
5. **`cq-utilities#5`** — dead `screenshot-name.ts` (imported-unused in Worker.vue)
   misdirected reviewers. → deleted module + test + the dead import (delete, not
   rewire — `sanitizeFilePart` collapses spaces and would break the
   `Monza-Bob Smith` contract).

## Plan-check corrections folded (SOUND_WITH_FIXES)
- **Unicode emptiness check** `/[\p{L}\p{N}]/u` (ASCII `[a-z0-9]` would silently
  discard CJK/Cyrillic track/driver names). Matches memory note.
- Gate is `npm run type-check` (vue-tsc); pack only smoke-proves the deleted
  module has no importer.

## Verify
- `npm run type-check` clean; `npm test` — new locking tests (control chars,
  reserved names, empty fallback, CJK preserved, multi-counter); existing
  space-preserving contract intact.
- grep `screenshot-name`/`buildScreenshotFileKey` → zero hits.

## Files
- `filenameFormat.ts`, `screenshot-output.ts` (+ their tests),
  `Worker.vue` (import removal), **deleted** `screenshot-name.ts` + `.test.ts`.

## Coordination
Worker.vue edit is ONLY the dead-import deletion (isolated top-of-`<script>`
hunk); other Worker.vue-touching WPs (D done; E/K) don't reference screenshot-name.
No `index.ts` edits.
