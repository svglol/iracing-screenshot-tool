---
phase: 05-babel-package-renames
verified: 2026-04-21T00:00:00Z
status: passed
score: 5/5 Success Criteria verified; 2/2 Requirements satisfied; 12/12 locked decisions honored
overrides_applied: 0
re_verification: null
---

# Phase 5: Babel Package Renames — Verification Report

**Phase Goal (from ROADMAP.md):** Retire the two deprecated Babel package names (`babel-runtime`, `babel-eslint`) so the lint config and runtime imports reference the canonical `@babel/*` scope, clearing deprecation warnings before the flat-config migration starts.
**Verified:** 2026-04-21
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Phase 5 Success Criteria)

| # | Truth (Success Criterion) | Status | Evidence |
|---|---|---|---|
| SC1 | `grep -r "babel-runtime\|babel-eslint" package.json src/ _scripts/` returns only `@babel/eslint-parser` refs (zero deprecated-name matches) | VERIFIED | Grep across `package.json`, `src/`, `_scripts/` for `babel-runtime|babel-eslint` (bare names): **0 matches**. Only surviving match is `"@babel/eslint-parser": "^7.28.6"` in package.json line 70. |
| SC2 | `npm install --legacy-peer-deps` succeeds; new packages resolved and old names removed from `package.json` + `package-lock.json` | VERIFIED | `npm ls @babel/eslint-parser` → `@babel/eslint-parser@7.28.6`; `npm ls babel-eslint` → `(empty)`; `npm ls babel-runtime` → `(empty)`. `node_modules/@babel/eslint-parser/` exists; `node_modules/babel-{runtime,eslint}/` absent. `package.json` has no `babel-runtime` or `babel-eslint` entries. Install landed via `eef6a7a` (84-line lockfile churn, all Babel-adjacent per 05-01-SUMMARY). |
| SC3 | `npm run lint` runs against `.eslintrc.js` using `@babel/eslint-parser` and produces count ≤1881 | VERIFIED | Re-ran `npx eslint --ext .js,.ts,.vue ./ --no-fix`: **`✖ 722 problems (719 errors, 3 warnings)`** — well within v1.3 baseline 1881 band ceiling (D-08). Zero `Parsing error` / `Cannot find module` lines (parser loads cleanly). D-03 wiring verified: `parser: '@babel/eslint-parser'` at `.eslintrc.js:16` inside `parserOptions` block. No top-level `parser:`. No `requireConfigFile` / `babelOptions` (D-05). |
| SC4 | `npm run test` passes 256/256 | VERIFIED | `npm test` → `Test Suites: 5 passed, 5 total; Tests: 256 passed, 256 total`. |
| SC5 | Phase lands as D-04 shape: `chore(deps): rename babel packages` + content commit for parser reference | VERIFIED (extended) | Chain: `eef6a7a` chore(deps): rename babel packages + `e52bbf9` chore(lint): narrow scope + `656aa8a` chore(lint): exclude dist/ + `74e112f` refactor(eslint): wire @babel/eslint-parser via parserOptions.parser. Extension from 2 → 4 content commits is justified (see §Commit-Shape Expansion below). D-09 content-commit contract honored — `74e112f` stages `.eslintrc.js` ONLY. Zero `Co-Authored-By` across all 6 phase-5 commits; no `--no-verify` evidence. |

**Score:** 5/5 Success Criteria verified.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `.eslintrc.js` | `parser: '@babel/eslint-parser'` nested in `parserOptions`; no top-level `parser:`; no `requireConfigFile`; no `babelOptions` | VERIFIED | Line 16: `    parser: '@babel/eslint-parser',` inside `parserOptions` block (lines 15-19). Grep for `^\s*parser:` returns exactly 1 hit (the one inside parserOptions). Grep for `requireConfigFile|babelOptions` returns 0 hits. |
| `.eslintignore` | `bot/` + `dist/` exclusions | VERIFIED | 2-line file: `bot/` and `dist/`. Staged by `e52bbf9` (bot/) + `656aa8a` (dist/). |
| `package.json` | `@babel/eslint-parser: ^7.28.6` in devDeps alphabetical position; no `babel-runtime`; no `babel-eslint` | VERIFIED | Line 70: `"@babel/eslint-parser": "^7.28.6",`. Zero bare `babel-runtime` / `babel-eslint` matches. |
| `package-lock.json` | Regenerated via `npm install --legacy-peer-deps`; `@babel/eslint-parser` resolved at 7.28.6 with SHA-512 integrity | VERIFIED | `node_modules/@babel/eslint-parser/package.json` reports `7.28.6`. 84-line churn documented in 05-01-SUMMARY.md (all Babel-adjacent, within ~100-line Pitfall 8 threshold). |
| `05-01-BASELINE.md` | Pre-swap count + per-rule top-20 + per-file hotspots + timestamp + pre-swap SHA + Addendum for new 712 src+_scripts denominator | VERIFIED | Original body: 1881 count, 9 distinct rules table, 12 hotspot files, timestamp 2026-04-22T07:36:23Z, parent SHA `5fd3c8d`. Addendum (2026-04-22T07:52:48Z): 712 src+_scripts-only count + top-5 rules + 4 hotspot files + rationale for scope narrowing. Committed in `eef6a7a` (body) + `e52bbf9` (addendum). |
| `05-01-SUMMARY.md` | Frontmatter + narrative covering chore(deps) commit | VERIFIED | Documents 3 staged paths, 84-line lockfile churn, 256/256 tests, D-10/D-11 compliance, 2 documented minor deviations. Landed in `6ffe1d6`. |
| `05-02-SUMMARY.md` | Frontmatter + narrative covering refactor(eslint) commit + Option A derogation | VERIFIED | Documents four-commit chain, Option A user-checkpoint ratification, Rule 2 auto-fix for dist/, +10 delta vs new 712 denominator, all 5 SCs proven. Landed in `15bebd6`. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `.eslintrc.js parserOptions.parser` | `node_modules/@babel/eslint-parser` | vue-eslint-parser delegation chain | VERIFIED | String `'@babel/eslint-parser'` at line 16; package exists on-disk at 7.28.6. Lint runs with zero parse errors across src/ + _scripts/. |
| `@babel/eslint-parser` | `.babelrc` | default `requireConfigFile: true` | VERIFIED | No `requireConfigFile` override in `.eslintrc.js`; `.babelrc` unchanged from pre-phase (presets: @babel/env, @babel/typescript; plugins: proposal-class-properties, proposal-object-rest-spread). Lint inherits per D-05. |
| `package.json` (devDependencies) | `package-lock.json` | `npm install --legacy-peer-deps` | VERIFIED | Lockfile regenerated; `npm ls @babel/eslint-parser` resolves cleanly. No ERESOLVE/EBADENGINE errors recorded in plan 05-01 execution. |
| Commit `74e112f` (body) | `05-01-BASELINE.md` | citation | VERIFIED | Commit body contains: "see 05-01-BASELINE.md Addendum per-rule breakdown" + "Within D-08 band vs. new src+_scripts-only baseline (712 per 05-01-BASELINE.md Addendum 2026-04-22)". |
| Commit `eef6a7a` (body) | `05-01-BASELINE.md` | citation | VERIFIED | Commit body cites "Pre-swap lint baseline captured in .planning/phases/05-babel-package-renames/05-01-BASELINE.md" with explicit count `1881`. |

### Requirements Coverage

| Requirement | Description | Source Plan | Status | Evidence |
|---|---|---|---|---|
| BABEL-01 | `babel-runtime` 6.x replaced (minimum-scope interpretation per D-01/D-02: retired, no @babel/runtime replacement) | 05-01 | SATISFIED | Zero import sites in `src/` + `_scripts/` (grep); no `package.json` entry; `node_modules/babel-runtime/` absent. SC1 grep clean. Transitive `core-js@2.6.11` + `regenerator-runtime@0.11.1` also retired per 05-01-SUMMARY. |
| BABEL-02 | `babel-eslint` retired; `@babel/eslint-parser` installed and wired in ESLint config | 05-01 + 05-02 | SATISFIED | `babel-eslint` absent from package.json + node_modules; `@babel/eslint-parser@7.28.6` installed; `.eslintrc.js` line 16 wires `parser: '@babel/eslint-parser'` inside `parserOptions` (D-03); Vue SFC `<template>` delegation chain intact (0 template parse errors on Home/SettingsModal/TitleBar canary lint). |

**Coverage:** 2/2 Phase 5 requirements SATISFIED. REQUIREMENTS.md traceability table reflects BABEL-01 (complete, eef6a7a) + BABEL-02 (complete, 74e112f). No orphaned requirements — every phase-5 plan's `requirements:` frontmatter value appears in REQUIREMENTS.md, and REQUIREMENTS.md maps no additional IDs to Phase 5.

### Locked Decisions Honored

| Decision | Description | Status | Evidence |
|---|---|---|---|
| D-01 | Drop `babel-runtime` entirely (no @babel/runtime replacement) | HONORED | `package.json` has no `@babel/runtime` entry; `node_modules/@babel/runtime/` not required (no plugin-transform-runtime in `.babelrc`). |
| D-02 | BABEL-01 minimum-scope interpretation recorded in CONTEXT | HONORED | Cited in `eef6a7a` body ("BABEL-01: minimum-scope interpretation (D-02)"). |
| D-03 | `parserOptions.parser` inside `parserOptions`, not top-level | HONORED | `.eslintrc.js` line 16 inside `parserOptions` block; grep `^\s*parser:` returns exactly 1 match (the nested one). |
| D-04 | `@babel/eslint-parser` replaces implicit espree fallback (pre-phase `babel-eslint` was installed but unwired) | HONORED | Cited in `74e112f` body: "prior to this commit, babel-eslint was in devDependencies but not wired in .eslintrc.js — vue-eslint-parser was delegating <script> parsing to espree". |
| D-05 | Inherit `.babelrc`; no `requireConfigFile`, no inline `babelOptions` | HONORED | `.babelrc` unchanged; grep for `requireConfigFile\|babelOptions` in `.eslintrc.js` returns 0. |
| D-06 | `@babel/eslint-parser` at `^7.28.6` | HONORED | `package.json` line 70; `npm ls` resolves to `7.28.6`. |
| D-07 | Pre/post baseline-diff pattern — `05-01-BASELINE.md` exists + cited from content commit | HONORED | File exists with pre-swap count + addendum; `74e112f` body cites it with delta line `712 → 722 (+10, parser-attributable ...)`. |
| D-08 | Post-swap count ≤1881 with band (either-direction) semantics | HONORED | Actual 722 ≤ 1881 (legacy ceiling) and +10 vs new 712 src+_scripts-only denominator — band-compliant. |
| D-09 | Bisect-friendly chain preserved — content commit stages `.eslintrc.js` ONLY | HONORED | `74e112f --name-only` returns single line: `.eslintrc.js`. Earlier commits are pre-conditions (`eef6a7a` package.json/lockfile/baseline; `e52bbf9` scope-narrow; `656aa8a` dist/ exclude). |
| D-10 | No `Co-Authored-By`; no `--no-verify` | HONORED | `git log eef6a7a^..HEAD --format="%B" \| grep -ci "co.?authored.?by"` → 0. Pre-commit hooks ran normally per each SUMMARY. |
| D-11 | Explicit `git add <path>`; `bot/docs/community-guide.md` + ambient mods stay unstaged | HONORED | Working tree still shows `?? bot/docs/community-guide.md` + 21 `M` entries (bot tests, bot webhook handlers, 4 src/ .vue files, .planning/PROJECT.md) — none staged in any phase-5 commit. Each commit's `--name-only` output matches its declared intent exactly. |
| D-12 | `--legacy-peer-deps` used for npm install | HONORED | Plan 05-01 execution used the flag per 05-01-SUMMARY; lockfile internally consistent (self-install succeeds without ERESOLVE per §SC2 evidence above). |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| _None_ | _n/a_ | No TODO/FIXME/HACK/placeholder/empty-handler/hardcoded-empty patterns in `.eslintrc.js` or `.eslintignore`. No stubs. The scope of Phase 5 is config-only — no new UI, no data flow. | _n/a_ | _n/a_ |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Lint runs with new parser, zero parse errors | `npx eslint --ext .js,.ts,.vue ./ --no-fix 2>&1 \| grep -cE "(Parsing error\|Cannot find module)"` | `0` | PASS |
| Lint count within band | Total line from same run | `✖ 722 problems (719 errors, 3 warnings)` | PASS (≤ 1881) |
| Vue SFC template delegation chain intact | `npx eslint --ext .vue Home.vue SettingsModal.vue TitleBar.vue --no-fix 2>&1 \| grep -cE "(Parsing error.*template\|Unexpected token <)"` | `0` | PASS |
| Test suite | `npm test` | `Tests: 256 passed, 256 total` | PASS |
| `@babel/eslint-parser` resolves to 7.28.6 | `npm ls @babel/eslint-parser` | `@babel/eslint-parser@7.28.6` | PASS |
| `babel-eslint` fully retired | `npm ls babel-eslint` | `(empty)` | PASS |
| `babel-runtime` fully retired | `npm ls babel-runtime` | `(empty)` | PASS |

All behavioral spot-checks PASSED.

### Commit-Shape Expansion Assessment (SC5)

The phase originally locked a 2-content-commit D-09 shape. It landed as a **4-content-commit chain + 2 metadata commits**:

1. `eef6a7a` chore(deps): rename babel packages — commit 1 per original D-09 lock
2. `e52bbf9` chore(lint): narrow eslint scope to src + _scripts (exclude bot/) — Option A user-ratified at checkpoint (plan 05-02 execution surfaced bot/ out-of-scope files parsing under `requireConfigFile: true`; user chose Option A per plan's §Claude's Discretion scope deviation clause)
3. `656aa8a` chore(lint): exclude dist/ build output — Rule 2 auto-fix (parser correctly parsed minified webpack bundles that espree had early-aborted on, producing 21,991 non-actionable messages; dist/ was already gitignored and never source-of-truth)
4. `74e112f` refactor(eslint): wire @babel/eslint-parser via parserOptions.parser — D-09 content commit (stages `.eslintrc.js` ONLY)

Plus metadata: `6ffe1d6` docs(05-01) + `15bebd6` docs(05-02).

**Justification for extension (documented intent, not silent drift):**
- CONTEXT.md §Claude's Discretion explicitly allowed user routing when the lockfile / post-swap validation surfaced unexpected non-Babel-adjacent deltas.
- User ratified Option A at a checkpoint, selecting it over Options B (violates D-05), C (reverts parser swap), and D (absorbs 22k-line delta and mis-attributes generated-output as parser delta).
- Phase 4's three-commit chain (`62f7abc` + `1082d7d` + `e0e4923`) with a neutral pre-condition establishes the precedent; cited in STATE.md §Accumulated Context.
- D-09 content-commit contract is preserved — `74e112f` stages `.eslintrc.js` only.
- Bisect quality preserved: bisecting between master and HEAD now cleanly isolates dep-bump regressions (eef6a7a), scope-control regressions (e52bbf9/656aa8a), and parser-swap regressions (74e112f).

**Scope deviation does not drop any in-scope requirements** — BABEL-01 and BABEL-02 both land cleanly under the narrowed scope. The scope narrowing aligns `.eslintignore` with `PROJECT.md §Out-of-Scope` which already declared bot/ out of v1.4 scope; the full-repo `./`-glob in plan 05-01 was the accident, not the intent.

### Gaps Summary

No gaps identified. Every ROADMAP Phase 5 Success Criterion, every Phase 5 Requirement, and every locked decision (D-01 through D-12) has machine-verifiable evidence in the current codebase state. The phase goal — retiring the two deprecated Babel package names so lint and runtime imports reference the canonical `@babel/*` scope — is achieved: `babel-runtime` and `babel-eslint` are fully retired at every layer (package.json, lockfile, node_modules, import sites), and `@babel/eslint-parser` is both installed and wired via `parserOptions.parser` with Vue SFC `<template>` delegation intact.

The scope-narrowing deviation via `.eslintignore` is fully documented in three locations (baseline addendum, STATE.md §Accumulated Context, 05-02-SUMMARY.md deviations) and does not reduce the requirement surface; it instead formalizes the `PROJECT.md §Out-of-Scope` declaration that was already binding on v1.4.

---

_Verified: 2026-04-21_
_Verifier: Claude (gsd-verifier)_
