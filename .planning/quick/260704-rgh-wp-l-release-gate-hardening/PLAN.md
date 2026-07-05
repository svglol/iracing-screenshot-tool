---
type: quick
slug: rgh-wp-l-release-gate-hardening
created: 2026-07-04
kind: code
source: obs/code-quality audit — WP-L, plan-checked SOUND_WITH_FIXES
depends_on: none
findings_closed: [cq-release-desktopcap#1, cq-release-desktopcap#2, cq-release-desktopcap#3]
---

# WP-L: Release-pipeline hardening

Three confined fixes in `_scripts/release.js` + `package.json`. Independent of the app.

## Tasks
1. **`cq-release-desktopcap#1`** — push/GitHub-release failures were swallowed and
   release.js still printed success + exited 0. Collect failures into
   `publishFailures[]`, `fail()` (exit 1) at the end; message notes the local
   commit+tag exist for manual retry.
2. **`cq-release-desktopcap#3`** — uploads fanned out to every git remote (incl.
   forks). New pure `resolveRemotes(requested, available)` + `parseReleaseArgs(argv)`
   (extracted to `_scripts/release-helpers.js`) default to `origin`, validate
   `--remote` up front before the build.
3. **`cq-release-desktopcap#2`** — `npm test` used `--passWithNoTests`, so a
   vanished suite passed the gate silently. Dropped from `test`/`test:coverage`.

## Plan-check corrections folded (SOUND_WITH_FIXES)
- vitest `include` only matched `src/**` → added `_scripts/**/*.test.{js,ts}` so
  the helper test actually runs (vitest.config.mjs).
- Arg parser skips a `--remote` value token so it isn't read as the bump.
- Helper extracted to a CommonJS sibling so `node release.js` can `require` it and
  vitest can import it without executing release.js's top-level side effects.

## Verify
- `node -c _scripts/release.js`; helper loads.
- `npm test` green + new `_scripts/release-helpers.test.js` (9 cases).
- Zero-spec proof: `npx vitest run --dir _scripts/nonexistent` exits 1 (was 0).

## Files
- `_scripts/release.js`, `_scripts/release-helpers.js` (new),
  `_scripts/release-helpers.test.js` (new), `package.json`, `vitest.config.mjs`.

## Coordination
- `package.json`: edits confined to the `scripts` block — WP-K's `build` edits are
  a disjoint region. WP-M also edits `vitest.config.mjs`; the `_scripts/**` glob
  addition is additive and WP-M (renderer env/projects) builds on it.
