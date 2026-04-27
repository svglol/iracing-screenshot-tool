---
slug: user-capture-res-regression
status: fix_applied_v2
trigger: "Reports of users having screenshots taken at monitor resolution (initial resolution) rather than at the selected capture resolution."
created: 2026-04-27
updated: 2026-04-27
---

# Debug Session: user-capture-res-regression

## Symptoms

<!-- DATA_START -->
- **expected**: In normal (no-ReShade) capture mode, the saved screenshot should be at the user-selected upscaled capture resolution.
- **actual**: Saved screenshot is at the original / native monitor resolution instead. Reported by end users in the field.
- **error**: None reported by users — capture completes silently at wrong resolution.
- **timeline**: Reports come from users on a build that should already include the prior fix (commit `3f5ff3c`, first shipped in **v2.1.0** released 2026-04-14). Disambiguating answers from the orchestrator's symptom-gathering: build = newer (post-fix), capture mode = Normal (no ReShade), no specific user-side patterns reported (multi-monitor / specific resolutions / fresh-launch vs after switching are all unknown).
- **reproduction**: Not specified by users. Likely: launch app, choose any non-native upscaled resolution in normal (no-ReShade) mode, take a screenshot, observe output dimensions are the monitor's native resolution rather than the selected target.
<!-- DATA_END -->

## Initial Context for Investigator

This is the **same symptom class** as the previously-investigated session `.planning/debug/resolved/capture-resolution-no-reshade.md` (resolved 2026-04-13 → marked resolved 2026-04-27 by the user, never confirmed via human verification). Read that file first — it contains a deep evidence trail and identifies the original race condition.

Key facts the investigator should anchor on:

1. **Prior fix commit**: `3f5ff3c Fix non-ReShade capture saving at native instead of target resolution` (2026-04-13). The fix:
   - Replaced a fixed `1000ms` delay before `getUserMedia` with a retry loop that verifies stream dimensions match the requested target resolution, retrying for **up to 8 seconds**.
   - Moved the `screenshot-finished` IPC signal to after the file write completes (so the iRacing window isn't restored mid-capture).
   - Files touched: `src/renderer/views/Worker.vue` (+58/-4 lines).

2. **Reports are against builds that already contain `3f5ff3c`** (v2.1.0 or newer per user confirmation). So this is one of:
   - **Incomplete fix** — the retry loop has a path where it falls through to `getUserMedia` with a stale stream (e.g., timeout exceeded, dimension comparison off by a tolerance, wrong field read, misaligned target on multi-monitor setups).
   - **Regression** — a later commit reverted, refactored, or shadowed the retry behavior.
   - **Different code path** — the symptom can also be produced by a path that doesn't go through the retry loop at all (e.g., a fast-path, cached stream, or a worker re-mount that uses different state).

3. **Original root cause** (per resolved session): race between OS-level `SetWindowPos` (synchronous PowerShell `spawnSync`) completing and Electron's `getUserMedia` capture pipeline negotiating the new stream. If `getUserMedia` was acquired before the OS finished resizing/painting, the stream came back at the prior (native) dimensions.

4. **Fields to reconfirm in the current code**:
   - That `Worker.vue`'s `fullscreenScreenshot()` still gates `getUserMedia` on a stream-dimension match against the target.
   - That the retry loop's exit conditions (timeout, success, error) all behave correctly — does timeout silently proceed, or abort? If silent-proceed, that alone explains the field reports for users on slow machines.
   - That `OffscreenCanvas` sizing reads from the verified stream dimensions, not from `captureRect` independent of the stream.
   - That the `resize-screenshot` IPC handler in `main/index.js` still calls `resize()` BEFORE sending `screenshot-request`.
   - That no later commit (post-`3f5ff3c`) refactored the renderer to bypass the retry loop or reintroduced a race.

5. **High-priority hypotheses to test first**:
   - H1: Retry loop's 8-second timeout silently falls through to `getUserMedia` on slow machines, capturing at native resolution. (Highest prior — matches "field reports on user machines we can't reproduce locally".)
   - H2: A later commit changed the comparison logic (e.g., stream `videoWidth/videoHeight` vs target — tolerance, rounding, off-by-one).
   - H3: Multi-monitor / non-primary-display capture path uses a different code branch that lacks the retry guard.
   - H4: A second screenshot taken in quick succession reuses a stale cached `MediaStream`.

6. **Diagnostic approach** (suggested):
   - `git log --oneline 3f5ff3c..HEAD -- src/renderer/views/Worker.vue src/main/index.js` to see what changed in the capture path since the fix.
   - Read current `Worker.vue` `fullscreenScreenshot()` end-to-end — focus on retry-loop exit paths.
   - Read `main/index.js` `resize-screenshot` handler — confirm ordering and any changes to `resize()` semantics.
   - Search for any logging the user could be asked to enable (or that should be added) to confirm in-the-wild which exit path the retry is taking.

## Current Focus

- **hypothesis**: CONFIRMED — H2 (regression). Commit `af9dd43 Remove capture dimension retry loop that caused multi-second delays` (2026-04-14, ~6 minutes after `a2b9eb0`, both shipped in v2.1.0) **deleted the entire dimension-verification retry loop** introduced by `3f5ff3c` and reverted to a fixed settling delay. A subsequent optimization (`9264381`) shortened that delay to 500ms by parallelising the source enumeration; the current `HEAD` has only `await delay(200)` — five times shorter than the original buggy 1000ms. With no dimension verification, `getUserMedia` again races `SetWindowPos`, and on slow / loaded user machines the stream is acquired at native dimensions before iRacing has finished re-rendering at the requested resolution. This is exactly the original bug, structurally re-introduced.
- **test**: Reinstate a dimension-verification retry loop that compares `track.getSettings().{width,height}` to the **window** dimensions (`data.width / data.height` — the expanded values the iRacing window is actually resized to), NOT the un-expanded `targetWidth/targetHeight`. Skip the check for `kind === 'display'` captures (per the rationale of `a2b9eb0`). Keep the 200ms initial delay; allow up to 8s total wait with 300ms retry; on timeout, still proceed (don't fail the capture) but log a warning so it shows up in the renderer log channel.
- **expecting**: After fix, a non-ReShade upscaled capture on a slow machine will reliably produce output at the selected resolution; the previous "rarely matches" symptom of `af9dd43` won't recur because the comparison is now against the actual window dims, not the user-facing target dims.
- **next_action**: Awaiting field re-verification of fix v2. Fix v1 (commit `b08c489`) confirmed via field telemetry to produce correct files only via 8s brute-force timeout — v2 in working tree replaces `track.getSettings()` with a `<video>.videoWidth/videoHeight` probe that reads actual frame dims. Type-check passes; 256 vitest pass; `npm run pack` succeeds. Once a v2 build reaches an affected user, renderer logs should show "first probe matches" or 1-2 retries instead of 24-retry-timeout.

## Evidence

<!-- APPEND only - facts discovered during this investigation -->

- timestamp: 2026-04-27T00:00:00Z
  checked: git log 3f5ff3c..HEAD -- src/renderer/views/Worker.vue src/main/index.js
  found: 20 commits touch the capture-path files since the prior fix. Two are directly suspicious by their commit messages: `a2b9eb0 Skip capture dimension retry loop for display-mode captures` (2026-04-14 18:54) and `af9dd43 Remove capture dimension retry loop that caused multi-second delays` (2026-04-14 19:00, ~6 min later). Both before any release tag — both shipped together in v2.1.0 on 2026-04-14.
  implication: H2 (regression) is the likely path. Need to verify whether the retry loop is still in HEAD.

- timestamp: 2026-04-27T00:00:30Z
  checked: git show af9dd43
  found: Commit deletes 47 lines from `Worker.vue::fullscreenScreenshot` — specifically the entire dimension-verification retry loop, the `targetWidth`/`targetHeight` module variables that fed it, and the `RETRY_DELAY_MS`/`MAX_WAIT_MS`/`startTime` machinery. Replaces it with a single `await delay(1000)` before `acquireStream`. The commit message acknowledges the loop "rarely matched, causing an 8-second timeout on most captures" and concludes "1000ms settling delay which is sufficient for SetWindowPos to take effect".
  implication: The retry loop was removed because it was timing out always. The reason it was always timing out (not stated in the commit) is that it was comparing `track.getSettings()` against `targetWidth/targetHeight` — and at the time of `af9dd43`, those were the **expanded** dimensions (`width += ceil(width * 0.06)` for crop) which do NOT match the actual window size after `SetWindowPos(width, height)`. The comparison was wrong, not the loop concept. The fix taken (delete the loop) restored the original race-condition bug.

- timestamp: 2026-04-27T00:01:00Z
  checked: git show 9264381 (Run capture settling delay and source enumeration in parallel, 2026-04-14 19:15)
  found: Reduced the post-`af9dd43` settling delay from 1000ms → 500ms by running it in `Promise.all` with `desktopCapturer.getSources`. Net effect: the only thing standing between `SetWindowPos` and `getUserMedia` is now max(500ms, source-lookup-time).
  implication: Further weakens the already-insufficient settling guarantee on slow machines.

- timestamp: 2026-04-27T00:01:30Z
  checked: git show d8bc14d, bd24c65 (further capture-path optimizations)
  found: `d8bc14d` (2026-04-14 19:20) skips desktop source enumeration entirely on the fast path by passing `window:<handle>:0` directly. `bd24c65` (2026-04-14 19:25) pre-resolves the source ID in the main process during resize. Combined effect: on the fast path, the source-lookup parallel work is now ~200ms instead of 1-2s, so the actual settling time shrinks toward the bare `delay(...)` value.
  implication: Today's fast path waits **only the bare `delay(...)` value** — which has since been further trimmed (see next).

- timestamp: 2026-04-27T00:02:00Z
  checked: Current HEAD `src/renderer/views/Worker.vue::fullscreenScreenshot` (lines 382-569)
  found: The function has `await delay(200)` (line 505) as its only settling pause. There is **no** dimension-verification retry loop. There is no inspection of `track.getSettings()`. The stream returned by `getUserMedia` (line 546) is passed directly to `handleStream(stream)` (line 565), and `loadedmetadata` (line 387) reads `this.videoWidth/this.videoHeight` and feeds them to `resolveDisplayCaptureRect` and the `OffscreenCanvas` sizing (lines 398-435). Whatever dimensions the stream delivers are what the saved file gets.
  implication: Confirms the regression. The current settling guarantee is effectively `200ms + (whatever async work overlaps)`. On a slow/loaded user machine where `SetWindowPos` + iRacing repaint exceeds ~200ms, the stream comes back at the prior native dimensions and the saved file is at native resolution. This precisely reproduces the symptom users are reporting.

- timestamp: 2026-04-27T00:02:30Z
  checked: Current IPC payload from main/index.ts `resize-screenshot` handler (lines 801-816) and Worker.vue receiver (lines 580-587)
  found: Main sends `width`, `height` (the expanded-for-crop dimensions actually used to resize the window), `targetWidth`, `targetHeight` (the un-expanded user-selected dimensions, used for crop output). Worker stores `targetWidth`/`targetHeight` in module state at lines 586-587 — they are still threaded through.
  implication: A reinstated retry loop can compare `track.getSettings()` against `data.width/data.height` (the **window** dimensions — what the OS actually resized to) and the comparison will match cleanly. The original bug in `3f5ff3c`'s loop (comparing against the wrong field) does not need to recur.

- timestamp: 2026-04-27T00:03:00Z
  checked: Display-vs-window capture branching — `normalizeCaptureTarget` in src/utilities/desktop-capture.ts and Worker.vue line 516
  found: `normalizeCaptureTarget` returns `kind: 'window' | 'display'`. On the fast path, `captureTarget = { id: sourceId, kind: 'window' }` is hand-built (not normalized) at line 516; on the slow fallback path it goes through `normalizeCaptureTarget` (line 523). In both cases the kind is available. Display-mode captures should skip the dimension check (per `a2b9eb0`'s correct rationale: stream is the full display, sub-region extracted via `resolveDisplayCaptureRect`).
  implication: The reinstated retry loop must gate on `captureTarget.kind === 'window'` to avoid the false-timeout class of bug that motivated `a2b9eb0` for display mode.

- timestamp: 2026-04-27T16:34Z
  checked: Field telemetry from user run after fix v1 commit `b08c489` — capture of 2036×1145 with crop=true.
  found: Retry loop reported `streamW=10000, streamH=10000` on every iteration (24 retries over 8.122s, until `MAX_WAIT_MS` timeout). Final saved file came out at the correct cropped output (1920×1080 from 2036×1145 source, `outputWidth/outputHeight` per Canvas draw log). User confirmed "acquisition was slow but it worked".
  implication: Two new findings. (1) `track.getSettings().{width, height}` in Electron's `desktopCapturer` flow returns the constraint *bounds* (`maxWidth/maxHeight: 10000`), not the actual frame dimensions — so the comparison field is wrong, never matches, and the loop always times out. (2) The 8s timeout itself accidentally provides enough settling time that the *underlying* stream and frame data are correct by the time `handleStream` consumes them — `videoWidth/videoHeight` (read elsewhere via `loadedmetadata`) reflects the real frame size. So fix v1 produces correct files via brute force, but at 8s/capture latency. The right comparison source is `video.videoWidth/videoHeight` after the stream's `loadedmetadata` event.

- timestamp: 2026-04-27T16:50Z
  checked: Fix v2 — replaced `track.getSettings()` comparison with a `probeStreamDimensions(stream)` helper that creates a temporary `<video>` element, attaches the stream, awaits `loadedmetadata` (with a 1.5s probe-timeout), and reads `videoWidth/videoHeight`. The probe video is paused, detached (`srcObject = null`), and removed in `finally`. Same retry-loop semantics around it (300ms inter-retry, 8s total budget, proceed on timeout). Display-mode skip preserved.
  found: `npm run type-check` 0 errors; `npm test` 256/256 passing; `npm run pack` (electron-vite build) succeeds with no Vue warnings.
  implication: Field telemetry should now show either (a) the very first probe matches (loop exits immediately after the 200ms initial settle, expected on most machines) or (b) one or two retries on slow machines, with `streamW`/`streamH` reflecting actual frame dims rather than the 10000×10000 constraint cap. If `streamW/streamH` are still 10000 at HEAD after this patch, that would be a probe-implementation bug rather than a constraint-bounds artifact.

- timestamp: 2026-04-27T16:47Z
  checked: Field telemetry from packaged build `2.1.0+3854f9b` (fix v2). Capture of 1920×1080 with crop=true → window resized to 2036×1145.
  found: Probe IS reading actual frame dimensions correctly: every retry iteration logs `streamW: 2036, streamH: 1144, windowWidth: 2036, windowHeight: 1145`. Width matches exactly. Height is **off by exactly 1 pixel** — the captured frame's height is one less than the requested window height. After 8.013s timeout, capture proceeds and produces a correct 1920×1080 output (post-crop).
  implication: Strict equality fails because Windows / Chromium's screen-capture pipeline rounds odd dimensions DOWN to the nearest even (h.264 / DWM video-frame requirement). Math: `1080 + ceil(1080 * 0.06) = 1080 + 65 = 1145` (odd) → captured as 1144. Width 2036 is already even → unchanged. Affects every odd-resolution capture. The probe primitive is right — the comparison just needs a small tolerance.

- timestamp: 2026-04-27T16:55Z
  checked: Fix v3 — added `DIM_TOLERANCE = 2` and `dimsMatch(sw, sh)` predicate that returns true when both `|sw - windowWidth| <= 2` and `|sh - windowHeight| <= 2`. Replaced both the `while` condition and the post-loop `if` with `!dimsMatch(...)`. Kept everything else (probe primitive, retry budget, display-mode skip, fail-soft).
  found: `npm run type-check` 0 errors; `npm test` 256/256 passing.
  implication: With ±2 pixel tolerance, the off-by-1 from even-rounding will pass cleanly. Tolerance also covers ±1 from DWM/border artifacts and ±2 from encoders that align to multiples of 4. Expected next-build signature: first probe matches in the typical case (post-200ms settle); slow-machine case becomes 1-2 retries before match instead of 24-retry timeout.

## Eliminated Hypotheses

<!-- APPEND only - hypotheses ruled out with evidence -->

- hypothesis: H1 — Retry loop's 8-second timeout silently falls through.
  evidence: There is no retry loop at HEAD; commit `af9dd43` deleted it entirely. Cannot fall through what no longer exists.
  timestamp: 2026-04-27T00:02:00Z

- hypothesis: H3 — Multi-monitor / display-capture branch lacks the retry guard.
  evidence: Partially relevant but not the cause. The display-capture branch has correct semantics (it captures the full display and crops the sub-region — output dimensions are determined by `resolveDisplayCaptureRect` and the requested capture rect, not by `track.getSettings`). The bug is in the window-capture branch and applies to all users on it, not just multi-monitor users.
  timestamp: 2026-04-27T00:03:00Z

- hypothesis: H4 — Stale cached MediaStream reused across captures.
  evidence: Each `fullscreenScreenshot` call constructs a new stream via `getUserMedia` (line 546) and stops all tracks in `finally` (line 479). No caching observed. Symptom is reproduced on first capture, not only on repeated ones.
  timestamp: 2026-04-27T00:03:00Z

## Resolution

<!-- Populated when root cause is confirmed and fix applied -->

- root_cause: Two layered causes. (1) Commit `af9dd43` (2026-04-14, shipped in v2.1.0) deleted the dimension-verification retry loop introduced by the prior fix `3f5ff3c`, reverting the non-ReShade capture path to a fixed settling delay before `getUserMedia`. Subsequent optimization commits (`9264381`, `d8bc14d`, `bd24c65`) shortened the effective wait further; HEAD before fix v1 had only `await delay(200)`. On slow/loaded user machines, `SetWindowPos` + iRacing repaint can exceed 200ms, so `getUserMedia` acquires the stream at the prior native dimensions and the OffscreenCanvas — sized from `videoWidth/videoHeight` — produces a file at native resolution instead of the selected target. (2) The dimension-verification primitive originally chosen — `track.getSettings().{width, height}` — does not work for streams from Electron's `desktopCapturer` chromium flow: it returns the constraint bounds (`maxWidth/maxHeight: 10000`), not the actual frame dimensions. So fix v1 (commit `b08c489`) reinstated the loop with the same broken comparison primitive: every iteration timed out at 8s before producing a (correct) file via brute-force settling, as confirmed by user telemetry on 2026-04-27 16:34Z. The reliable source of actual stream dimensions in Electron's flow is `<video>.videoWidth/videoHeight` after the stream's `loadedmetadata` fires — which is exactly what `handleStream` already uses for canvas sizing.
- fix: Two iterations. **v1** (commit `b08c489`): reinstated the retry-loop scaffolding (initial 200ms settle, `acquireStream()` helper, 300ms inter-retry, 8s total budget, display-mode skip, fail-soft on timeout). Used `track.getSettings()` for the comparison — same primitive as `3f5ff3c`. Field telemetry showed the loop always times out (`getSettings()` returns 10000×10000 constraint bounds, not actual frame dims), so capture works only via brute-force 8s settling. **v2** (working tree, uncommitted): kept the v1 scaffolding; replaced the `track.getSettings()` read with a `probeStreamDimensions(stream)` helper that creates a transient `<video>`, attaches the stream, awaits `loadedmetadata` (with a 1.5s probe-timeout), and returns `videoWidth/videoHeight`. Probe video is paused, detached (`srcObject = null`), and removed in `finally`. This reads the same source of truth that `handleStream`'s canvas sizing already uses, so the comparison reliably reflects actual frame dimensions and the loop will exit immediately on the first acquire when the OS window has finished re-rendering — typical case after the 200ms initial settle.
- verification: After v2: `npm run type-check` passes (0 errors). `npm test` passes (256/256, 5 files). `npm run pack` (electron-vite build) succeeds. Awaiting field re-verification — once the v2 build reaches an affected user, the renderer-log signature should change from "24 retries → timeout" to "first probe matches" (or 1-2 retries on very slow machines). If `streamW/streamH` are still 10000 in logs after v2, that would indicate a probe-implementation bug rather than the constraint-bounds artifact that broke v1.
- files_changed: [src/renderer/views/Worker.vue]
