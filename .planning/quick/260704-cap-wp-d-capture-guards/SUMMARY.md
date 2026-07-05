---
type: quick-summary
slug: cap-wp-d-capture-guards
status: complete
date: 2026-07-04
commit: 3580db5
source: obs/code-quality audit — WP-D
depends_on: WP-A (3dbf80f)
findings_closed: [cq-renderer-capture-views#1, cq-renderer-capture-views#3, cq-release-desktopcap#4]
---

# WP-D: Capture-path abort/in-flight guards + anchored source match — COMPLETE

Three defensive fixes; plan-checked **SOUND** (no corrections needed).

| Finding | Change |
|---------|--------|
| `cq-renderer-capture-views#1` | Worker.vue honored `captureAborted` at every stream/handoff boundary but NOT once encoding started, so a late abort during a slow high-res encode still ran `convertToBlob`/`renderThumbnailBlob` and called `saveImage`, emitting `screenshot-finished` + `screenshot-response` → main forwarded a **"ghost" screenshot** into the gallery/clipboard even after reporting the capture as timed-out/failed. Added a `captureAborted` re-check right before the `encodeAndDeliver` callback handoff AND as the first statement of `saveImage` (belt-and-suspenders). |
| `cq-renderer-capture-views#3` | The `screenshot-request` handler overwrote shared module-level state (`windowID`/`crop`/`captureBounds`/`targetWidth/Height`) and reset `captureAborted` with no in-flight guard, trusting main's `takingScreenshot` latch as the sole serializer; a stray/duplicate request would corrupt an active capture and defeat its abort. Added a `captureInFlight` boolean: a second request while one is active is `log.warn`'d + dropped; the flag is set **after** the `windowID===undefined` early-return (so a rejected request never latches it) and cleared via `fullscreenScreenshot().finally()` (async, never rejects, so `.finally` always runs). |
| `cq-release-desktopcap#4` | `desktop-capture.ts` `findSourceByWindowTitle`'s bidirectional interior-substring fallback (`a.includes(b) || b.includes(a)`) could mis-select any external window whose title merely **shared** a substring with the iRacing title (e.g. a "Toyota" window for "iRacing.com Simulator - Toyota @ Daytona"), returning the first enumeration hit. Replaced with an anchored (prefix) scan that prefers the **longest** (most-specific) match and ignores titles shorter than `MIN_FUZZY_MATCH_LENGTH` (5). |

## Verification
- `npm run type-check` → clean (exit 0).
- `npm test` → **342/342 across 14 files** (+3). New `desktop-capture.test.ts`
  cases: interior-substring-only source rejected (returns null where the old
  `.includes` would have picked it), longest anchored source wins, trivially
  short source titles ignored. All **9 pre-existing** `findSourceByWindowTitle`
  tests stay green (the "partial inclusion" ones are prefix-anchored cases —
  hand-traced before the rewrite).
- Manual repros (QA/dev box, not run here): temporary delay before the encode
  callback + `abort-capture` (or kill iRacing to fire the disconnect/watchdog) →
  `app.log` "Capture aborted after encode — skipping delivery", NO new file, NO
  ghost gallery/clipboard entry; two back-to-back `screenshot-request` → one
  "Duplicate screenshot-request ignored — capture already in flight" warn and the
  first capture completes correctly; a normal single capture still fires
  `screenshot-finished`/`screenshot-response` (flags are no-ops on the happy path).

## Deferred (documented, out of the SOUND-validated plan)
Worker.vue's `mounted()` registers **5** `ipcRenderer.on` listeners with no
`beforeUnmount` teardown (the Worker.vue half of `cq-renderer-capture-views#2`
that WP-H flagged for this WP). The **dangerous** consequence — a double
`screenshot-request` registration running two concurrent captures — is now
neutralized by the `captureInFlight` guard, and the production Worker window
mounts once and never unmounts (the pure listener-accumulation leak is HMR/dev
-only). A full teardown was intentionally left out of this plan's validated scope;
revisit if a Worker remount path is ever introduced.

## Milestone / next
Done: A, B, C, G, L, H, D. WP-D is a **hard dependency of WP-M**. Remaining:
WP-I (filename path), WP-J (VRAM adapter-matching), WP-E (native-stack
observability + index.ts), WP-F (WGC diagnostics + Rust), WP-K (Electron
security), WP-M (test infra — needs A/F/C/D/H).
