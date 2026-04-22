# Phase 5: Babel Package Renames - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Retire the two deprecated Babel package names — `babel-runtime` 6.x and `babel-eslint` 10.x — so `.eslintrc.js` references `@babel/eslint-parser` as `parserOptions.parser` and `package.json` carries no deprecated Babel names. Clears deprecation warnings before Phase 6's ESLint flat-config migration starts. Scope is limited to `package.json`, `package-lock.json`, and `.eslintrc.js` — no Babel runtime tooling changes, no ESLint flat-config work, no TypeScript changes, no Vue-ecosystem parser changes, no `bot/` workspace touches.

**In scope:**
- Remove `babel-runtime` 6.x from `dependencies` (no replacement installed — see D-01 rationale)
- Remove `babel-eslint` 10.x from `devDependencies`, install `@babel/eslint-parser` (latest `^7.x`, ESLint-7 compatible line) in its place
- Wire `@babel/eslint-parser` in `.eslintrc.js` via `parserOptions.parser`
- Regenerate `package-lock.json` via `npm install --legacy-peer-deps`
- Capture pre-swap lint baseline (count + per-rule breakdown) as an in-phase artifact for post-swap delta evidence

**Out of scope:**
- Installing `@babel/runtime` or `@babel/plugin-transform-runtime` (babel-runtime is unused; adding the canonical name without the transform-runtime plugin would be identical dead weight — see D-01)
- Changing `.babelrc` (no new presets, no new plugins, no `useBuiltIns` flip)
- Top-level `parser:` in `.eslintrc.js` (would override `plugin:vue/recommended`'s `vue-eslint-parser` and break SFC `<template>` linting — see D-03)
- ESLint 7 → 9 upgrade, flat config migration (Phase 6)
- `eslint-config-prettier` 9 → 10, `plugin:prettier/recommended` full wiring (Phase 6 FMT-01/FMT-02)
- TypeScript 3.8 → 5.7 and `@typescript-eslint/*` 2.25 → 8.x (Phase 7)
- `--legacy-peer-deps` removal (Phase 7 LINT-03 — the typescript-eslint@2 vs eslint@7 peer conflict is unchanged by this phase)
- `bot/` package.json (already healthy; no deprecated Babel names present)
- `@babel/preset-env` targets, `@babel/preset-typescript` options, `@babel/plugin-proposal-*` plugin renames (none of those rename in this phase)
- Vue-ecosystem parsers (`eslint-plugin-vue` 6, `vue-eslint-parser` 7) — deferred to v2.0 per `.planning/PROJECT.md` and `.planning/REQUIREMENTS.md` §"Out of Scope"

</domain>

<decisions>
## Implementation Decisions

### BABEL-01 interpretation — `babel-runtime` treatment

- **D-01:** **Drop `babel-runtime` entirely.** Scout of the codebase shows zero imports of `babel-runtime` or `babel/runtime` in `src/` or `_scripts/`, and `.babelrc` does not list `@babel/plugin-transform-runtime` (the only plugin that would make the runtime package do anything). Installing `@babel/runtime` as a literal rename would add the canonical name but deliver identical dead weight. Removing the dep entirely is the minimum-scope resolution consistent with the "clear deprecation warnings" phase goal.
- **D-02:** **Record D-01 as a deliberate minimum-scope interpretation of BABEL-01.** BABEL-01's wording "`babel-runtime` 6.x replaced with `@babel/runtime` — all import sites updated, no references to the deprecated name remain" is satisfied by absence: there are no import sites to update, and zero deprecated-name references remain after removal. ROADMAP SC1's grep (`grep -r "babel-runtime\|babel-eslint" package.json src/ _scripts/`) returns only `@babel/eslint-parser` matches. This follows v1.3 Phase 4 Pitfall 4's "minimum-scope derogation philosophy" (see `.planning/STATE.md` §Accumulated Context). No ROADMAP or REQUIREMENTS edits required — the deviation is captured here and cited in the commit body for downstream archaeology.

### BABEL-02 interpretation — `babel-eslint` and parser wiring

- **D-03:** **Install `@babel/eslint-parser` and wire as `parserOptions.parser`** in `.eslintrc.js`, simultaneously removing `babel-eslint` from `devDependencies`. Nesting under `parserOptions.parser` (not top-level `parser:`) is load-bearing: `plugin:vue/recommended` adds `vue-eslint-parser` as the top-level parser, and `vue-eslint-parser` delegates `<script>` block parsing to `parserOptions.parser`. A top-level `parser:` override would break Vue SFC `<template>` linting. Wiring as `parserOptions.parser` matches the idiomatic pattern every Vue-2 + Babel ESLint config uses.
- **D-04:** **Note:** the current `.eslintrc.js` has no `parser` field at all. `babel-eslint` is declared in `devDependencies` but not wired — `plugin:vue/recommended`'s `vue-eslint-parser` has been delegating to ESLint's default `espree` parser for `<script>` blocks. Wiring `@babel/eslint-parser` per D-03 makes the parser explicit for the first time. This is a functional config change, not a pure rename; the pre/post lint baseline diff (D-07) exists to surface the impact.

### `@babel/eslint-parser` configuration

- **D-05:** **Default config — inherit `.babelrc`.** No `parserOptions.requireConfigFile` flag, no inline `babelOptions` in `.eslintrc.js`. `@babel/eslint-parser` auto-loads `.babelrc` (presets: `@babel/env` targeting Electron 41.0, `@babel/typescript`; plugins: `@babel/proposal-class-properties`, `@babel/proposal-object-rest-spread`). Rationale: single-source-of-truth between build-time parsing and lint-time parsing — lint sees what Babel's transpiler sees, including `.ts` typescript-preset parsing and class-property syntax. This is the lowest-surface-area approach.
- **D-06:** **Version pin**: follow v1.3's caret pattern (Phase 3 FA caret, Phase 4 Prettier caret). Expected: `@babel/eslint-parser: ^7.x` at the latest stable 7.x line — the `eslint>=7.5.0` peer range keeps compatibility with the project's `eslint@^7.10.0` pin. Planner researches the exact minor at plan time. Do NOT pin `^8.x` or later if such a line exists, since ESLint 9 peer-requirement is Phase 6's problem, not Phase 5's.

### Verification — lint baseline handling

- **D-07:** **Pre/post baseline-diff pattern** (v1.3 Phase 4 carryover). Capture a `05-01-BASELINE.md` artifact in commit 1's phase dir containing: pre-swap `npm run lint` count + per-rule breakdown + per-file top-offenders snippet. Cite this baseline in commit 2's body with a one-line delta summary (e.g., "net lint count: 1873 → 1879 (+6, all attributable to @babel/eslint-parser surfacing class-property nodes in `src/utilities/*.ts` that espree parsed as generic expressions)"). Accept parser-attributable deltas as long as the post-swap NET count stays ≤1881 (v1.3 baseline ceiling). Non-parser-attributable deltas are treated as in-phase bugs to fix before the commit lands.
- **D-08:** **SC3 interpretation**: Phase 5 SC3 reads "lint count within v1.3 baseline band (≤1881)". The word "band" is load-bearing — allows deltas in either direction as long as NET stays at or below 1881. A drop (parser catches fewer things than espree did) is also acceptable without further justification.

### Commit shape — D-04 two-commit bisect pattern

- **D-09:** **ROADMAP SC5 locks the D-04 two-commit shape.** Commit 1 = `chore(deps): rename babel packages` (`package.json` + `package-lock.json` only — installs `@babel/eslint-parser`, removes `babel-runtime` and `babel-eslint`; NO config edits yet; captures baseline in commit body + `05-01-BASELINE.md`). Commit 2 = content commit updating `.eslintrc.js` `parserOptions.parser` wiring. Rationale for two commits even though BABEL-01 has no "import-site update" counterpart: bisect between HEAD and the `chore(deps)` commit cleanly isolates "npm install breakage" (e.g., peer-deps shift, lockfile corruption) from "parser swap lint behavior change". Same D-04/D-07 pattern as Phase 3 (`ae2627b` + `b5ecc32`) and Phase 4 (`62f7abc` + `1082d7d` + `e0e4923`).
- **D-10:** **No `--no-verify`, no `Co-Authored-By:` footer** in either commit. Pre-commit hooks run normally. Commits are authored by the human git user only (see user memory `feedback_no_coauthor.md`).
- **D-11:** **`git add` must NOT use `-A` or `.`** — the untracked `bot/docs/community-guide.md` at the repo root must stay unstaged (same rule as Phases 3 and 4). Stage paths explicitly by name: commit 1 stages `package.json` + `package-lock.json` + the baseline artifact via `git add -f .planning/phases/05-babel-package-renames/05-01-BASELINE.md`; commit 2 stages `.eslintrc.js` only.

### npm install strategy

- **D-12:** **`--legacy-peer-deps` flag remains required** for this phase's `npm install`. The pre-existing `@typescript-eslint/eslint-plugin@2.34.0` vs `eslint@^7.10.0` peer conflict is orthogonal to BABEL-01/BABEL-02 and is scheduled for Phase 7 (LINT-03). Do not treat a `--legacy-peer-deps` requirement as a Phase 5 defect. Do not attempt to resolve the peer conflict in this phase.

### Claude's Discretion

- **Exact version pins** for `@babel/eslint-parser` (caret-resolved at plan time; expected to land on latest stable 7.x line).
- **Whether commit 1 also auto-updates peer-adjacent dev deps** if `npm install --legacy-peer-deps` produces a wider `package-lock.json` churn than expected. Prefer minimum-churn: if the lockfile produces non-Babel-adjacent edits (e.g., transitive ESLint plugin version shifts), route to user before landing commit 1.
- **Whether to run `npm run lint --fix`** after wiring the new parser in commit 2. Prefer NOT to — this phase is a rename/wire, not a lint sweep. If any auto-fixable warnings surface that are truly parser-attributable, note them in the baseline-delta summary instead of fixing them in-phase.
- **Baseline artifact file name** — `05-01-BASELINE.md` is suggested (matches Phase 4's `04-01-BASELINE.md` naming). Planner may pick a different number if plan breakdown warrants it.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope and requirements
- `.planning/PROJECT.md` — v1.4 goal + Out-of-Scope list (Vue-ecosystem ESLint plugins, Jest→Vitest deferred to v2.0)
- `.planning/REQUIREMENTS.md` §BABEL-01, §BABEL-02 — acceptance criteria for this phase's two requirements
- `.planning/ROADMAP.md` §"Phase 5: Babel Package Renames" — Goal, Depends-on (nothing; first v1.4 phase), Success Criteria (5 items), D-04 commit shape lock
- `.planning/STATE.md` §"Accumulated Context" — minimum-scope derogation philosophy (v1.3 Phase 4 carryover; directly cited by D-02), `--legacy-peer-deps` constraint, v1.3 lint baseline of 1881

### Prior-phase patterns directly reused here
- `.planning/milestones/v1.3-phases/03-font-awesome-v6-upgrade/03-CONTEXT.md` §D-04 — two-commit `chore(deps):` + content-commit bisect pattern (Phase 5 reuses in D-09)
- `.planning/milestones/v1.3-phases/04-prettier-3-reformat/04-CONTEXT.md` §D-07, §D-11 — three-commit variant with pre-change baseline artifact; Phase 5's `05-01-BASELINE.md` pattern is directly modeled on Phase 4's `04-01-BASELINE.md`
- `.planning/milestones/v1.3-phases/04-prettier-3-reformat/04-CONTEXT.md` §Established Patterns — `--legacy-peer-deps` as standing workaround, `core.autocrlf` line-ending note, `.planning/` gitignore + `git add -f` requirement, no Co-Authored-By rule

### Dependency analysis (original audit that seeded the milestone)
- `.planning/notes/dependency-analysis-2026-04.md` §"TIER 1 — Critical" — `babel-runtime` 6.26.0 + `babel-eslint` 10.1.0 both flagged as "renamed/deprecated"; original rationale for pairing them into a single phase

### Code reference points (files the plan will touch)
- `.eslintrc.js` — the ESLint config. Currently has `extends: ['plugin:vue/recommended', 'standard', 'prettier']`, `parserOptions: { ecmaVersion: 2018, sourceType: 'module' }`. D-03 adds `parser: '@babel/eslint-parser'` inside `parserOptions`.
- `.babelrc` — Babel config inherited by `@babel/eslint-parser` per D-05. Presets: `@babel/env` targeting Electron 41.0, `@babel/typescript`. Plugins: `@babel/proposal-class-properties`, `@babel/proposal-object-rest-spread`. Not edited in this phase.
- `package.json` §"dependencies" (line 51: `"babel-runtime": "^6.26.0"` — removed) and §"devDependencies" (line 78: `"babel-eslint": "^10.1.0"` — removed; new entry `"@babel/eslint-parser"` added in alphabetical position)
- `package-lock.json` — regenerated by `npm install --legacy-peer-deps`; minimum-churn expected (two removals + one install on an ESLint-7-era tree)
- `_scripts/webpack.main.config.js` line 27 (`loader: 'babel-loader'`) and `_scripts/webpack.renderer.config.js` line 33 (`use: 'babel-loader'`) — NOT edited in this phase; documented here so the planner doesn't touch them (babel-loader is not renamed; it's healthy at its current pin)

### External docs (researcher should verify at plan time)
- `@babel/eslint-parser` package page: `https://www.npmjs.com/package/@babel/eslint-parser` — peer range, latest stable 7.x minor
- `@babel/eslint-parser` migration guide from `babel-eslint`: `https://github.com/babel/babel/blob/main/eslint/babel-eslint-parser/README.md` — `parserOptions.requireConfigFile` and `babelOptions` semantics
- Babel 7 `@babel/runtime` docs (context only, not installed per D-01): `https://babeljs.io/docs/babel-runtime` — confirms `@babel/runtime` is inert without `@babel/plugin-transform-runtime`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **v1.3 Phase 4's `04-01-BASELINE.md` pattern** — directly transferable to Phase 5's pre-parser-swap lint baseline artifact. Same file naming convention (`05-01-BASELINE.md`), same body shape (count + per-rule breakdown), same commit-body citation pattern.
- **Two-commit D-04 bisect shape** — proven on master twice (Phase 3 `ae2627b`/`b5ecc32`, Phase 4 `62f7abc`/`1082d7d`/`e0e4923`). Reuses without modification for Phase 5's chore(deps) + content pair.
- **Existing `.eslintrc.js` `parserOptions` block** (lines 15–18) — the insertion point for D-03's `parser: '@babel/eslint-parser'` line. Already has `ecmaVersion` and `sourceType` keys — adding `parser` matches the existing shape.

### Established Patterns
- **Caret pins on dependency bumps** — Phase 3 (`@fortawesome/*` at `^6.7.2`, `@fortawesome/vue-fontawesome` at `^2`), Phase 4 (`prettier` at `^3.3.3`). D-06 follows the same pattern for `@babel/eslint-parser`.
- **`.planning/` gitignore + `git add -f` for in-phase artifacts** — applies to `05-01-BASELINE.md`. Phase 3 and Phase 4 both shipped baseline/bundle-diff artifacts this way.
- **No Co-Authored-By footers, no `--no-verify`, explicit `git add <path>` (never `-A` or `.`)** — enforced across v1.3 Phase 3 and Phase 4; inherited by D-10/D-11.
- **`--legacy-peer-deps` is the standing `npm install` flag** — doesn't get "fixed" until Phase 7 LINT-03 (after ESLint 9 + typescript-eslint 8 land and clear both peer conflicts).
- **`bot/` is out of scope for v1.4 tooling phases** — Phase 4 D-01 declared `bot/` out of scope for the Prettier glob; Phase 5 inherits this: `bot/package.json` has no `babel-runtime` or `babel-eslint` and is not touched here.

### Integration Points
- `.eslintrc.js` `parserOptions` block (15–18) — single edit site for D-03.
- `package.json` `dependencies` (45–64) — remove line 51 (`babel-runtime`).
- `package.json` `devDependencies` (69+) — remove line 78 (`babel-eslint`), insert `@babel/eslint-parser` in alphabetical position just before the existing `"@babel/plugin-proposal-class-properties"` line... actually alphabetical places it just after `@babel/core` and before the proposal plugins — planner confirms exact insertion index against the current file.
- `package-lock.json` — regenerated by `npm install --legacy-peer-deps`; no direct edits.
- `.babelrc` — inherited but NOT edited per D-05.
- `_scripts/webpack.*.config.js` — untouched; `babel-loader` stays at its healthy pin.

### Out of Scope (deliberately)
- `bot/` — no deprecated Babel names; not in scope (same rule Phase 4 D-01 established for `bot/` workspace).
- `src/**/*` source code — no imports of `babel-runtime` to update (zero-grep confirmed); D-01 drops the dep with no source touches.
- `.babelrc` — not edited (D-05 decision to inherit, not override).
- Top-level `parser:` in `.eslintrc.js` — would break Vue SFC template linting (D-03 rationale).

</code_context>

<specifics>
## Specific Ideas

- **Mirror Phase 4's baseline-artifact pattern byte-for-byte in spirit.** `05-01-BASELINE.md` should contain: (a) the exact `npm run lint` command + stdout's total count, (b) a per-rule frequency table (top 20 rules by count), (c) a per-file hotspot list (files with ≥50 warnings), (d) timestamp + commit SHA of the pre-swap tree. Commit 2's body then cites a one-line delta summary pointing at this file.
- **Commit messages should follow the repo's conventional-commits pattern.** Expected subjects: commit 1 `chore(deps): rename babel packages` (SC5's exact wording); commit 2 candidate `refactor(eslint): wire @babel/eslint-parser via parserOptions.parser` — mirrors Phase 3's `refactor(icons):` shape. Planner picks the exact scope token.
- **Automated-first verification, same as Phase 4 D-11:** `npm install --legacy-peer-deps` succeeds → `npm run lint` count ≤1881 → `npm run test` 256/256 → `npm run pack:renderer` compiles cleanly. No per-view manual UAT required for a parser rename (Phase 3 D-05's 4-view UAT was specific to visual icon changes and does not apply here).

</specifics>

<deferred>
## Deferred Ideas

- **`@babel/runtime` + `@babel/plugin-transform-runtime` wiring** — not needed today (D-01). If a future phase pulls in a library that expects `@babel/runtime` helpers or if bundle-size optimization becomes a priority, revisit at that time. Not currently tracked for v1.4 or v2.0.
- **`--legacy-peer-deps` removal** — Phase 7 LINT-03. Peer conflicts that force this flag (`typescript-eslint@2` vs `eslint@7`, `eslint-plugin-prettier@5` vs `eslint@7`) both clear naturally in Phases 6 and 7.
- **ESLint flat-config migration** — Phase 6 (LINT-01, LINT-02). This phase deliberately keeps legacy `.eslintrc.js` in effect so the parser swap is the only variable.
- **`eslint-config-prettier` 9 → 10 + `plugin:prettier/recommended` full wiring** — Phase 6 (FMT-01, FMT-02). v1.3 Phase 4's minimum-scope `eslint-config-prettier`-only wiring carries forward unchanged through Phase 5.
- **`@babel/preset-env` targets refresh, `@babel/preset-typescript` options audit** — not in scope for v1.4; Electron 41 target is stable. Would be a v2.0 consideration if bundler switches to Vite.
- **Vue-ecosystem parser upgrades** (`vue-eslint-parser` 7 → 9, `eslint-plugin-vue` 6 → 9) — v2.0 (must match Vue major per `.planning/REQUIREMENTS.md` §"Out of Scope" and §"Future Requirements").
- **Prettier expansion to `bot/`** — v1.3 Phase 4's deferred idea; not picked up in v1.4 per REQUIREMENTS scope.
- **Updating ROADMAP SC1's grep wording** to read "returns zero babel-runtime/babel-eslint matches; @babel/eslint-parser is referenced in .eslintrc.js" — user chose to record the interpretation in CONTEXT.md instead of editing the roadmap (D-02). Roadmap wording stays as-is; this phase's commit body cites D-02 for downstream archaeology.

</deferred>

---

*Phase: 05-babel-package-renames*
*Context gathered: 2026-04-21*
