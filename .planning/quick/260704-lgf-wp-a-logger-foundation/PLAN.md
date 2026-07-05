---
type: quick
slug: lgf-wp-a-logger-foundation
created: 2026-07-04
kind: code
source: obs/code-quality audit — WP-A (keystone), plan-checked SOUND_WITH_FIXES
---

# WP-A: Logger foundation — severity levels, safe rotation, robust serialization

`src/utilities/logger.ts` is the app's only persistent field-diagnostic surface
(`{userData}/logs/app.log`, JSON-lines). It is one-dimensional and fragile.
This is the **keystone** of the remediation plan — every other observability
package routes failures through `log.warn`/`log.error`, so those levels must
land first. Closes audit findings `obs-logging#1,#2,#3,#5,#6,#7`.

## Tasks

1. **Severity levels** (`obs-logging#1`) — add `warn()`/`error()` to the `Logger`
   interface and `createLogger`, stamping `entry.level` `WARN`/`ERROR`. **Never**
   gate `warn`/`error` on `_isDebug`; only `debug()` stays gated (dropped in
   packaged builds). This is the load-bearing change every downstream package uses.

2. **Line-boundary-safe rotation** (`obs-logging#2`) — extract pure, exported
   `sliceToLineBoundary(Buffer)` and `computeRotatedBuffer(Buffer)`; the retained
   tail starts after the first `\n` and the `[TRUNCATED]` marker is written as a
   **valid JSON line**, so a per-line `JSON.parse` reader never chokes.

3. **Error/circular-safe serialization** (`obs-logging#3`) — exported
   `normalizeLogData` (top-level `Error` → `{name,message,stack,code}`) and
   `serializeEntry` (Error-normalizing replacer → WeakSet circular retry →
   final `dataError` fallback that ALWAYS emits `ts/level/proc/msg`, never drops
   the line).

4. **Mid-session rotation** (`obs-logging#5`) — seed `_approxSize` from the file
   size in `init()`, add appended byte lengths in `writeLine`, and re-check
   rotation when it crosses `LOG_ROTATION_LIMIT` (no per-line `statSync`).

5. **Hardened write path** (`obs-logging#6`) — move `mkdirSync` to `init()`;
   in `writeLine` retry `mkdirSync`+append once on failure, else set a one-shot
   `_loggingDegraded` flag + `console.error` so the failure of logging is itself
   observable. Keep `appendFileSync` (no cached fd — in-place rotation via
   `writeFileSync` would invalidate a held handle).

6. **Path redaction** (`obs-logging#7`) — exported `redactPaths(line, homeDir?)`
   masking the home prefix in both raw and JSON-escaped (`\\`) forms; derive
   `_homeDir` once in `init()`.

7. **Tests** — `src/utilities/logger.test.ts` (WP-A **owns** this path — see
   plan-check correction 2) exercising the pure helpers. No electron/fs mocking.

## Plan-check corrections folded in (SOUND_WITH_FIXES)

1. Compile gate is **`npm run type-check`** (vue-tsc --noEmit), NOT `npm run pack`
   (esbuild strips types).
2. WP-A **owns** `logger.test.ts` (pure-helper tests); WP-M's electron-mocking
   init/rotation suite must go to `logger.integration.test.ts` (flagged for WP-M).
3. Add `_homeDir: string | null` module state, set in `init()`, passed to
   `redactPaths` from `writeLine`.

## Verify

- `npm run type-check` — additive interface change, no existing call site breaks.
- `npm test` — `logger.test.ts` passes: rotated buffer is fully line-parseable,
  `serializeEntry` survives Error+circular without dropping `msg`, `redactPaths`
  masks the home prefix (raw + escaped).

## Files

- `src/utilities/logger.ts` (modify)
- `src/utilities/logger.test.ts` (new)
