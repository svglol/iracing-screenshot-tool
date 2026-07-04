---
type: quick-summary
slug: lgf-wp-a-logger-foundation
status: complete
date: 2026-07-04
commit: 3dbf80f
source: obs/code-quality audit — WP-A (keystone)
findings_closed: [obs-logging#1, obs-logging#2, obs-logging#3, obs-logging#5, obs-logging#6, obs-logging#7]
---

# WP-A: Logger foundation — COMPLETE

Hardened `src/utilities/logger.ts`, the app's only persistent field-diagnostic
surface (`{userData}/logs/app.log`, JSON-lines), as the **keystone** of the audit
remediation plan. Every downstream observability package routes failures through
`log.warn`/`log.error`, so those levels had to land first. Single source-file
change + a new pure-helper test suite. `+~190 / -~20` on `logger.ts`, new
`logger.test.ts` (10 tests).

## What changed

| Finding | Change |
|---------|--------|
| `obs-logging#1` | `Logger` interface + `createLogger` gain `warn()`/`error()` (stamp `entry.level` `WARN`/`ERROR`), **ungated** by `_isDebug`. Only `debug()` stays gated. Failures are now recorded and greppable by level in packaged builds, not byte-for-byte identical to routine `INFO` noise. |
| `obs-logging#2` | Rotation routed through pure, exported `sliceToLineBoundary()` + `computeRotatedBuffer()`: the retained tail starts after the first `\n`, and the `[TRUNCATED]` marker is written as a **valid JSON line**. A per-line `JSON.parse` reader no longer chokes on the first two lines of a rotated log. |
| `obs-logging#3` | Exported `normalizeLogData()` (top-level `Error` → `{name,message,stack,code}`) + `serializeEntry()` (Error-normalizing replacer → WeakSet circular retry → `dataError` fallback). An `Error` no longer serializes to `'{}'`, a circular payload no longer throws-and-drops the whole line — the `ts/level/proc/msg` line is **always** emitted. |
| `obs-logging#5` | Mid-session rotation: `_approxSize` seeded from the file size in `init()`, incremented by appended byte length in `writeLine`, re-checks `rotateLogIfNeeded` when it crosses `LOG_ROTATION_LIMIT`. A multi-hour endurance session no longer grows `app.log` unbounded past the 5 MB cap. No per-line `statSync`. |
| `obs-logging#6` | `mkdirSync` moved to `init()`; `writeLine` retries `mkdirSync`+append once on failure, then latches `_loggingDegraded` and `console.error`s **exactly once** — the failure of file logging is now itself observable rather than silently swallowed every line. `appendFileSync` kept (no cached fd: in-place `writeFileSync` rotation would invalidate a held handle — see Risk). |
| `obs-logging#7` | Exported `redactPaths(line, homeDir?)` masks the resolved home prefix (both raw and JSON-escaped `\\` forms) at the single write choke point; `_homeDir` resolved once in `init()` via `os.homedir()`, replaced with `<home>`. |

## Plan-check corrections folded in (WP-A was SOUND_WITH_FIXES)

1. **Compile gate** — used `npm run type-check` (vue-tsc --noEmit), **not** `npm run pack` (electron-vite/esbuild strips types and would not have caught an interface break).
2. **Test-file ownership** — WP-A **owns** `src/utilities/logger.test.ts` (pure-helper tests). WP-M must place its electron-mocking `init()`/on-disk-rotation suite at a distinct path (`logger.integration.test.ts`) or append — **flagged for WP-M's plan**.
3. **`_homeDir` plumbing** — added `_homeDir: string | null` module state, set in `init()`, passed to `redactPaths` from `writeLine` (the original sketch referenced `homeDir` with no in-scope source).

## Verification

- `npm run type-check` → clean (additive interface change; no existing `info()`/`debug()` call site breaks).
- `npm test` → **326/326 across 12 files** (adds `logger.test.ts`, +10 tests; zero regressions).
- `logger.test.ts` proves the fixes directly: rotated buffer is fully line-parseable incl. the marker (`obs-logging#2`); `serializeEntry` survives `Error` + circular without dropping `msg` (`obs-logging#3`); `redactPaths` masks the prefix in raw + escaped forms (`obs-logging#7`).

## Risk notes / deliberate scope-downs

- **`obs-logging#6` scoped down from the finding's full "cache an fd / createWriteStream" recommendation.** Rotation rewrites `app.log` in place via `writeFileSync`, which would invalidate a held write stream/fd (writes to a detached inode). Kept `appendFileSync` (append mode re-resolves the path each call, tolerant of the rewrite) + moved `mkdirSync` to `init()` + one-shot degraded fallback. This closes the silent-total-loss hole without the fd/rotation hazard. An in-memory ring buffer / UI log export is left as a future item.
- **Truncation marker changed** from the bare `[TRUNCATED]` token to a valid JSON line (the intended `obs-logging#2` fix). Grepped the repo for the literal `[TRUNCATED]` token — no external tooling depends on it.
- **Mid-session byte counter is approximate** (counts appended bytes, resets to `LOG_KEEP_TAIL` after rotation). Worst case rotates slightly early/late — harmless.
- **`redactPaths` uses `<home>`** (via `os.homedir()`) for broader username coverage than the userData-only option the sketch also allowed.

## Follow-ups unblocked

WP-A is the dependency for **WP-B, WP-C, WP-E, WP-F, WP-G** (all consume `log.warn`/`log.error`). Recommended next: **WP-B** (process-level crash nets) and **WP-C** (the permanent-wedge guards) per the plan's critical path `A → C → G`.

**Note for WP-M:** do not `Write`-create `logger.test.ts` (WP-A now owns it); use `logger.integration.test.ts` for the electron-mocking init/rotation suite, or append.
