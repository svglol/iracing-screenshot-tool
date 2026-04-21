# Phase 4: Prettier 3 Codebase Reformat - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 04-prettier-3-reformat
**Mode:** Smart discuss (batch proposal table, user accepted all)
**Areas discussed:** Reformat scope, Version pins, ESLint-Prettier plugin bumps, Commit shape, Verification

---

## Reformat Scope (Q1)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep `{src,_scripts}/**/*.{js,ts,vue}` glob (Recommended) | Formats Electron main + renderer Vue 2.7 app + webpack build scripts. `bot/` stays Prettier-less as it was after v1.2 (ESLint-only). | ✓ |
| Also format `bot/**/*.js` | Add prettier + eslint-config-prettier@9 + eslint-plugin-prettier@5 to bot/ package.json too. Expands Phase 4 scope beyond TOOL-01. | |
| Format entire repo with unified config | Add top-level `*.cjs` / `*.js`, docs, config files. Largest diff, largest blast radius. | |

**User's choice:** Accept recommended — keep `{src,_scripts}/**/*.{js,ts,vue}` scope.
**Notes:** `bot/` is deliberately out of scope; adding Prettier there is deferred.

---

## Exact Prettier 3 Version (Q2)

| Option | Description | Selected |
|--------|-------------|----------|
| `prettier@^3.3.3` (Recommended) | Latest stable 3.3.x as of 2026-04-21; matches ROADMAP "Prettier 3.3" callout. Caret range matches Phase 3's frozen-major FA-pin pattern. | ✓ |
| `^3.2.x` (one minor behind) | More conservative; ignores any 3.3.x bug fixes. | |
| Bare `^3` (floats to 3.x latest incl. future 3.4/3.5) | Maximum forward compat; loses minor-freeze guarantee. | |
| Exact `3.3.3` (no caret) | Strictest; no security-backport float. | |

**User's choice:** Accept recommended — `prettier@^3.3.3`.

---

## ESLint-Prettier Plugin Compat Bumps (Q3)

| Option | Description | Selected |
|--------|-------------|----------|
| Bump to `eslint-config-prettier@^9.1.0` + `eslint-plugin-prettier@^5.2.1` (Recommended) | Prettier-3-compatible lines that still support ESLint 7 (matches repo's eslint@^7.10.0 pin). Bundle into same `chore(deps):` commit as the prettier bump. | ✓ |
| Try Prettier 3 without bumping plugins first | Verify `npm run lint` still works, bump only if needed. Risk: integration surfaces mid-phase. | |
| Bump to eslint-config-prettier@^10 | v10 drops ESLint 7 support — breaks on current eslint. Cascades into ESLint 9 migration (v1.4 scope). | |

**User's choice:** Accept recommended — bump to v9.1.0 + v5.2.1 in the same chore(deps) commit.

---

## Commit Shape (Q4)

| Option | Description | Selected |
|--------|-------------|----------|
| Split into two commits — `chore(deps):` + `format: prettier 3` (Recommended) | Mirrors Phase 3's D-04 bisect pattern. Bisect between HEAD and `chore(deps)` isolates "plugin/version bump broke tooling" from "Prettier 3 reformat changed how a file parses." | ✓ |
| Single `format: prettier 3` commit | Matches ROADMAP SC1 literal wording; smaller git history; loses bisect separation. | |
| Three commits (dep bump, run prettier, fix lint) | Most granular; excess for formatter reformat. | |

**User's choice:** Accept recommended — split into two commits (D-04 pattern from Phase 3).

---

## Verification Approach (Q5)

| Option | Description | Selected |
|--------|-------------|----------|
| Automated-first + light manual smoke (Recommended) | `npm run lint` same-or-fewer warnings; `npm run pack:renderer` clean; `npm run prettier -- --check` clean; one screenshot round-trip in `npm run dev`. No per-view UAT. | ✓ |
| Full manual UAT across 4 views like Phase 3 | Overkill for a formatter reformat with no visual change. | |
| Automated-only (no manual smoke) | ROADMAP SC3 requires a screenshot smoke test — cannot skip. | |

**User's choice:** Accept recommended — automated-first + one screenshot round-trip.

---

## Claude's Discretion

- Baseline metric selection (line count / file count / lint warning count) — Claude picks.
- Parser-error handling if Prettier 3 chokes on any existing source — surface, do not silently fix; route to user.
- Whether to fold `npm run lint --fix` ESLint-Prettier integration drift into commit 2.

## Deferred Ideas

- Prettier for the `bot/` workspace.
- ESLint 9 flat config + eslint-config-prettier@10 (v1.4).
- `.prettierignore` file.
- Docs / markdown / `.planning/` reformat.
- Resolving the typescript-eslint vs eslint 7 peer conflict (blocked on ESLint 9, deferred to v1.4).

---

*Phase: 04-prettier-3-reformat*
*Completed: 2026-04-21*
