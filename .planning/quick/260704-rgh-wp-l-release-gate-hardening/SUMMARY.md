---
type: quick-summary
slug: rgh-wp-l-release-gate-hardening
status: complete
date: 2026-07-04
commit: f5742f0
source: obs/code-quality audit — WP-L
depends_on: none
findings_closed: [cq-release-desktopcap#1, cq-release-desktopcap#2, cq-release-desktopcap#3]
---

# WP-L: Release-pipeline hardening — COMPLETE

Three confined fixes in `_scripts/release.js` + `package.json`; independent of the app.

| Finding | Change |
|---------|--------|
| `cq-release-desktopcap#1` | Push/GitHub-release failures were swallowed with a warning while release.js printed "Released successfully" and exited 0. Both catch blocks now record into `publishFailures[]`; after temp-file cleanup, a non-empty list prints the failures and `fail()`s (exit 1). The message notes the local commit+tag already exist so the operator retries the remote steps, not the whole (committed) bump. |
| `cq-release-desktopcap#3` | The commit/tag/installer uploads fanned out to EVERY configured remote (incl. personal forks). New pure `resolveRemotes(requested, available)` + `parseReleaseArgs(argv)` in `_scripts/release-helpers.js` default to `origin`, validate `--remote` **before** the expensive build (fail-fast), and never silently publish to a fork. |
| `cq-release-desktopcap#2` | `npm test` = `vitest run --passWithNoTests` passed the release gate even if the suite globbed to zero specs. Dropped the flag from `test` + `test:coverage`; `test:watch` left lenient for local use. |

## Plan-check corrections folded (SOUND_WITH_FIXES)
- **Dead test glob** — `include: ['src/**']` would never collect a `_scripts/**`
  test, so the resolveRemotes unit test would silently not run. Added
  `_scripts/**/*.test.{js,ts}` to `vitest.config.mjs`.
- **Arg-parse hardening** — `parseReleaseArgs` consumes the `--remote <value>`
  token so `--remote origin patch` correctly picks `patch` as the bump.
- **Testability** — helper extracted to a CommonJS sibling module so `node
  _scripts/release.js` can `require` it AND vitest can import it without running
  release.js's top-level side effects.

## Verification
- `node -c _scripts/release.js` → OK; `require('./_scripts/release-helpers')` loads
  (exports `resolveRemotes`, `parseReleaseArgs`).
- `npm run type-check` clean; full suite **339/339 across 14 files** (+9 new
  `release-helpers.test.js` cases — resolveRemotes default/known/unknown/no-origin/
  de-dup + parseReleaseArgs positional/flag-value/comma-split/repeat).
- **Zero-spec gate proof**: `npx vitest run --dir _scripts/nonexistent-dir` exits
  **1** (the old `--passWithNoTests` exited 0).
- Manual publish-failure repro documented (throwaway `badremote` → exit 1 with
  the failure list); not run here (no real publish).

## Behavior change
release.js now exits non-zero on partial/total publish failure and on a zero-spec
test run. The `fail()` after publish fires **after** the version commit+tag are
made locally, so `git checkout package.json` will NOT revert them (committed) —
the message calls this out.
