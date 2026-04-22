---
phase: 05-babel-package-renames
plan: 01
subsystem: dependencies
tags: [babel, eslint-parser, npm-deps, lockfile, lint-baseline]
requires: [BABEL-01, BABEL-02]
provides:
  - "package.json with @babel/eslint-parser ^7.28.6 installed in alphabetical devDep position"
  - "package-lock.json regenerated with SHA-512 integrity for @babel/eslint-parser fetch"
  - ".planning/phases/05-babel-package-renames/05-01-BASELINE.md (pre-swap lint baseline: 1881)"
affects:
  - "commit 2 (plan 05-02) will wire @babel/eslint-parser via parserOptions.parser"
  - "milestone lint delta citation (D-08 band: post-swap ≤ 1881)"
tech-stack:
  added: ["@babel/eslint-parser@7.28.6", "@nicolo-ribaudo/eslint-scope-5-internals@5.1.1-v1 (transitive)"]
  removed: ["babel-runtime@6.26.0", "babel-eslint@10.1.0", "core-js@2.6.11 (transitive)", "regenerator-runtime@0.11.1 (transitive)"]
  patterns: ["D-09 two-commit bisect (chore(deps) + content); v1.3 Phase 3/4 carryover"]
key-files:
  created:
    - .planning/phases/05-babel-package-renames/05-01-BASELINE.md
    - .planning/phases/05-babel-package-renames/05-01-SUMMARY.md
  modified:
    - package.json
    - package-lock.json
decisions:
  - "D-01 honored: babel-runtime dropped with no @babel/runtime replacement (zero import sites; .babelrc has no transform-runtime plugin)"
  - "D-02 honored: BABEL-01 minimum-scope interpretation — deprecated-name absence satisfies the requirement"
  - "D-06 honored: @babel/eslint-parser pinned at ^7.28.6 (latest stable 7.x; eslint@^7.10.0 satisfies peer ^7.5.0 || ^8 || ^9)"
  - "D-09 honored: this commit is purely dependency-layer; no config/source edits — commit 2 (plan 05-02) adds the .eslintrc.js parser wiring"
  - "D-10 honored: no --no-verify, no Co-Authored-By footer"
  - "D-11 honored: explicit 3-path staging (git add -f on baseline); bot/docs/community-guide.md stayed untracked; pre-existing .planning/PROJECT.md and src/*.vue modifications stayed unstaged"
  - "D-12 honored: npm install --legacy-peer-deps used; 0 ERESOLVE/EBADENGINE errors"
metrics:
  duration_minutes: ~12
  completed_date: 2026-04-22
  tasks_completed: 3
  files_changed: 3
  commits: 1
---

# Phase 5 Plan 1: Babel Package Renames — chore(deps) Commit Summary

One-liner: Retired deprecated `babel-runtime@6.26.0` and `babel-eslint@10.1.0`, installed `@babel/eslint-parser@^7.28.6` in pure dependency-layer commit paired with a pre-swap lint baseline (1881) for D-08 band acceptance in commit 2.

## What was built

Commit 1 of the D-09 two-commit bisect pair for Phase 5. Purely a dependency-layer change with zero `.eslintrc.js`, `.babelrc`, `src/`, `_scripts/`, or `bot/` edits — by design, so that a future `git bisect` between HEAD and this commit isolates "npm install breakage / peer-deps shift / lockfile corruption" from "parser swap lint behavior change" in plan 05-02's commit 2.

Three atomic changes staged together:
1. `package.json` — removed `babel-runtime` from dependencies (D-01), removed `babel-eslint` from devDependencies, added `@babel/eslint-parser: ^7.28.6` in alphabetical position between `@babel/core` and `@babel/plugin-proposal-class-properties`.
2. `package-lock.json` — regenerated via `npm install --legacy-peer-deps`. Churn: 40 insertions / 44 deletions = 84 lines net (well within Pitfall 8's ~100-line threshold). All churn Babel-adjacent: added `@babel/eslint-parser` + nested `eslint-visitor-keys` + `@nicolo-ribaudo/eslint-scope-5-internals`; removed `babel-eslint`, `babel-runtime`, and `babel-runtime`'s nested `core-js@2.6.11` and `regenerator-runtime@0.11.1`.
3. `.planning/phases/05-babel-package-renames/05-01-BASELINE.md` — pre-swap lint baseline artifact captured via `npx eslint --ext .js,.ts,.vue ./ --no-fix` (NOT `npm run lint`, which applies `--fix` side effect per Pitfall 7). Staged via `git add -f` per D-11 (`.planning/` is gitignored).

## Commit landed

| Field | Value |
|-------|-------|
| SHA | `eef6a7a` |
| Subject | `chore(deps): rename babel packages` |
| Parent | `5fd3c8d` (Phase 5 state commit — pre-swap HEAD per baseline artifact) |
| Staged paths | `package.json`, `package-lock.json`, `.planning/phases/05-babel-package-renames/05-01-BASELINE.md` (exactly 3) |
| Co-Authored-By footer | absent (D-10) |
| `--no-verify` used | no (D-10; pre-commit hook ran normally) |

## Baseline captured

Pre-swap lint count: **1881 problems (1878 errors, 3 warnings)** — matches v1.3 baseline ceiling exactly.

Dominant rule breakdown (top 9, only distinct rules): `no-undef` (1818, mostly Jest globals in `.test.js` hotspots), syntax-null `(no rule)` (31 — pre-existing espree parse errors), `no-unused-expressions` (19), `no-void` (5), `vue/require-prop-types` (3), `no-unused-vars` (2), `no-new-object` (1), `no-new` (1), `no-control-regex` (1).

Hotspot concentration: 12 `.test.js` files carry ≥50 messages each (Jest-globals `no-undef` dominance). Flat-config migration in Phase 6 will decide on jest-env wiring — not a Phase 5 concern.

## Verification (all PASS)

| Check | Result |
|-------|--------|
| `babel-runtime` removed from `package.json` dependencies | PASS |
| `babel-eslint` removed from `package.json` devDependencies | PASS |
| `@babel/eslint-parser` at `^7.28.6` in alphabetical position | PASS |
| `npm install --legacy-peer-deps` exit 0, no ERESOLVE/EBADENGINE | PASS |
| `npm ls @babel/eslint-parser` → `@babel/eslint-parser@7.28.6` | PASS |
| `npm ls babel-eslint` → `(empty)` | PASS |
| `npm ls babel-runtime` → `(empty)` | PASS |
| `node_modules/@babel/eslint-parser/` exists | PASS |
| `node_modules/babel-{runtime,eslint}/` absent | PASS |
| Zero `babel-runtime\|babel/runtime` grep matches in `src/` or `_scripts/` | PASS |
| Zero `core-js@2.*` installs under `node_modules/` | PASS |
| Lockfile churn ≤ ~100 lines, all Babel-adjacent | PASS (84 lines) |
| No edits leaked to `.eslintrc.js`, `.babelrc`, `src/`, `_scripts/`, `bot/` | PASS |
| `npm test` → `Tests: 256 passed, 256 total` | PASS |
| Lint count post-install stable at 1881 (pre-swap parser still espree) | PASS |
| Commit subject exactly `chore(deps): rename babel packages` | PASS |
| Zero Co-Authored-By lines in commit body | PASS |
| Exactly 3 staged paths in HEAD commit | PASS |
| `bot/docs/community-guide.md` NOT in commit | PASS |
| Baseline artifact citable in future commit 2 body | PASS |

## Deviations from Plan

### Minor: Commit body backtick rendering

**Found during:** Task 3 (post-commit verification)
**Issue:** The inline shell-literal backticks around `npm install --legacy-peer-deps` in the commit body were escaped as `\`npm install --legacy-peer-deps\`` due to Windows bash heredoc processing. The surrounding prose still clearly communicates the re-install instruction; the escaping is cosmetic and does not affect the commit's machine-verifiable shape (subject, paths, Co-Authored-By absence, reference IDs).
**Resolution:** Not amending — per D-10 and global Git Safety Protocol, `--amend` is reserved for explicit user request. The defect is cosmetic (rendering only) and does not impact any success criterion or verification check. Logged here for archaeology; future executors on Windows should use single-quoted heredoc values without escaped backticks, or write the commit body via a file passed via `git commit -F`.

### Minor: Task 1 Pitfall 7 precondition interpretation

**Found during:** Task 1 (pre-baseline capture)
**Issue:** The plan's Task 1 step 1 says "If any `src/` or `_scripts/` file is modified, abort and notify user (Pitfall 7 contamination risk)." The working tree had 4 pre-existing `src/renderer/components/*.vue` and `src/renderer/views/Home.vue` modifications from a prior session (before Phase 5 started). These represent ambient working-tree state, not lint-`--fix` contamination.
**Resolution:** Proceeded per the executor prompt's `<critical_rules>` which explicitly acknowledged "ambient EOL churn on many `.vue` and `.test.js` files (pre-existing, not from Phase 5)" and directed the executor to keep them unstaged. Task 1's real Pitfall 7 guard is that the `--no-fix` baseline invocation does not mutate files — verified by identical `git diff --stat src/` output before and after running eslint. Baseline count of 1881 reflects the actual working-tree state and is the correct D-08 denominator for commit 2's delta.

No other deviations. All auto-fix Rule 1/2/3 triggers absent — dependency change went clean.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| _None_ | _n/a_ | No new security-relevant surface introduced. T-05-01-01 through T-05-01-04 all mitigated as planned (registry scope protection, lockfile SHA-512 integrity, net-positive CVE retirement of deprecated core-js@2/regenerator-runtime@0.11, 84-line Babel-adjacent churn within threshold). |

## Known Stubs

None. This plan adds no UI, no data flow, no placeholders — purely a dependency rename.

## Pointer to Next Plan

Commit 2 (plan 05-02, `refactor(eslint): wire @babel/eslint-parser via parserOptions.parser`) will:
1. Edit `.eslintrc.js` to add `parser: '@babel/eslint-parser'` inside the existing `parserOptions` block (D-03: nested, NOT top-level — top-level would override `plugin:vue/recommended`'s `vue-eslint-parser` and break SFC `<template>` linting).
2. Cite `05-01-BASELINE.md` in the commit body with a one-line delta summary (post-swap vs. 1881).
3. Verify parser-delegation chain is intact (`.vue` `<template>` blocks still parse via `vue-eslint-parser`; `<script>` and `.js` now go through `@babel/eslint-parser`; `.babelrc` inherited per D-05).
4. Confirm D-08 band acceptance: `post_count ≤ 1881`.

## Self-Check: PASSED

- File `.planning/phases/05-babel-package-renames/05-01-BASELINE.md`: FOUND
- File `.planning/phases/05-babel-package-renames/05-01-SUMMARY.md`: FOUND (this file)
- Commit `eef6a7a`: FOUND in `git log --oneline`
- Commit subject, staged-path list, no Co-Authored-By, 256/256 tests: all verified above.
