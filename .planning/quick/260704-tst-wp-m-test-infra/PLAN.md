---
type: quick
slug: tst-wp-m-test-infra
created: 2026-07-04
kind: code
source: obs/code-quality audit — WP-M (LAST), plan-checked SOUND_WITH_FIXES
depends_on: WP-A, WP-C, WP-D, WP-F, WP-H (all landed)
findings_closed: [cq-tests#1, cq-tests#2, cq-tests#3, cq-tests#4]
---

# WP-M: cover the untested load-bearing surfaces + enable renderer tests

The final package. The suite tested only pure utility modules; the four load-bearing
surfaces the audit flagged were untested. WP-M closes all four. WP-F/WP-C were
observability-only and did NOT perform the #2/#3 source extractions the plan had
tentatively assigned them, so WP-M owns those edits outright — and since those WPs
are already committed, there is no merge collision to coordinate.

## Tasks
1. **`cq-tests#1`** — NEW `logger.integration.test.ts`: init() dir resolution +
   creation, JSON-lines writeLine format, level gating (debug suppressed unless
   isDebug; warn/error always emit — WP-A), startup rotation of an over-5MB log to a
   valid `[TRUNCATED]` marker + bounded tail. The pure helpers stay in
   `logger.test.ts` (WP-A owns it).
2. **`cq-tests#2`** — NEW pure `capture-decisions.ts`: `decideCaptureBackend` +
   `classifyWgcResult`, extracted from the un-importable index.ts; wire index.ts to
   call them; NEW `capture-decisions.test.ts`.
3. **`cq-tests#3`** — add `__setWgcApiForTests` seam to `wgc-capture.ts`; extend
   `wgc-capture.test.ts` with the `lastNativeFailureReason` state machine.
4. **`cq-tests#4`** — make the harness renderer-capable: `plugins:[vue()]` in
   vitest.config.mjs + devDeps `happy-dom` + `@vue/test-utils`; NEW
   `renderer-harness.test.ts` mounts a trivial SFC fixture.

## Plan-check corrections folded (SOUND_WITH_FIXES)
- **vitest 4 dropped `environmentMatchGlobs`** → renderer tests opt into a DOM via a
  per-file `// @vitest-environment happy-dom` docblock; env stays `node` by default.
- **logger.integration electron mock:** logger.ts resolves its dir via a NATIVE
  `require('electron')` (the deliberately-un-rewritten `const x = require(...)`
  pattern), which `vi.mock` — intercepting only the transformed import graph — CANNOT
  reach (empirically confirmed: `app` came back undefined). Fixed by planting an
  electron stub in Node's require cache via `createRequire(import.meta.url)`, which
  the native require returns; `vi.resetModules()` per case resets the init latch and
  does not clear Node's require cache, so one install survives every re-import.
- **Full-mount is a trap:** renderer-harness.test.ts mounts a NEW dependency-free
  fixture (`SmokeProbe.vue`), NOT Worker.vue/SideBar.vue (module-scope require of
  config/fs/sharp). Harness-capable is the deliverable, not blind coverage of them.
- **Extraction ownership:** WP-F/WP-C didn't extract, so WP-M made the index.ts
  edits itself; the wiring is behavior-preserving (the native-decision site is inside
  the non-ReShade branch, so `reshade:false`; classifyWgcResult reproduces the exact
  outcome/reason mutations and keeps WP-F's log lines).

## Verify
- `npm run type-check` clean; `npx vitest run` **329/329 across 16 files** (+17);
  `npm run pack` green (the capture-decisions import bundles; renderer still 87
  modules — the fixture is test-only).

## Files
- NEW: `src/main/capture-decisions.ts` + `.test.ts`,
  `src/utilities/logger.integration.test.ts`, `src/renderer/renderer-harness.test.ts`,
  `src/renderer/__fixtures__/SmokeProbe.vue`.
- EDIT: `src/main/index.ts` (extraction wiring), `src/main/wgc-capture.ts` (seam),
  `src/main/wgc-capture.test.ts` (state machine), `vitest.config.mjs`, `package.json`
  (+ `package-lock.json`).

## Completes the remediation plan
WP-M is the last of 13. Full plan status: A,B,C,G,L,H,D,I,J,E,F,M complete; K Stage 0
complete with Stages 1-3 (contextIsolation preload migration / CSP / code-signing)
deferred to separate independently-testable PRs. The renderer harness this WP enables
is the prerequisite for testing WP-K's future contextIsolation migration.
