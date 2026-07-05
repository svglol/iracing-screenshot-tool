---
type: quick
slug: cap-wp-d-capture-guards
created: 2026-07-04
kind: code
source: obs/code-quality audit — WP-D, plan-checked SOUND
depends_on: WP-A (log.warn/info)
findings_closed: [cq-renderer-capture-views#1, cq-renderer-capture-views#3, cq-release-desktopcap#4]
---

# WP-D: Capture-path abort/in-flight guards + anchored source match

Three defensive fixes in the renderer capture path + the shared source resolver.

## Tasks
1. **`cq-renderer-capture-views#1`** — Worker.vue delivered a frame even after a
   late abort during encode. → re-check `captureAborted` before the
   `encodeAndDeliver` callback handoff AND as the first statement of `saveImage`.
2. **`cq-renderer-capture-views#3`** — the `screenshot-request` handler overwrote
   shared capture state with no in-flight guard. → `captureInFlight` boolean;
   duplicate request `log.warn`'d + dropped; set after the windowID early-return,
   cleared via `fullscreenScreenshot().finally()`.
3. **`cq-release-desktopcap#4`** — `findSourceByWindowTitle`'s bidirectional
   interior-substring fallback mis-selected any window sharing a substring. →
   anchored (prefix) scan, longest-wins, `MIN_FUZZY_MATCH_LENGTH` guard. + 3 tests.

## Verify
- `npm run type-check` clean; `npm test` — 3 new desktop-capture cases + all 9
  pre-existing `findSourceByWindowTitle` tests green.
- Manual (QA): temporary delay before the encode callback + `abort-capture` →
  "Capture aborted after encode — skipping delivery", no file, no ghost gallery
  entry; two back-to-back `screenshot-request` → one "Duplicate … ignored" warn.

## Files
- `src/renderer/views/Worker.vue`, `src/utilities/desktop-capture.ts`,
  `src/utilities/desktop-capture.test.ts`.

## Deferred (documented, not in plan)
Worker.vue's `mounted()` registers 5 `ipcRenderer.on` listeners with no
`beforeUnmount` teardown (the Worker.vue half of `cq-renderer-capture-views#2`
handed off by WP-H). The **dangerous** consequence — double `screenshot-request`
→ concurrent captures — is now neutralized by the `captureInFlight` guard, and
the production Worker window mounts once and never unmounts (leak is HMR/dev-only).
A full teardown was left out of this SOUND-validated plan; revisit if a Worker
remount path is ever added.
