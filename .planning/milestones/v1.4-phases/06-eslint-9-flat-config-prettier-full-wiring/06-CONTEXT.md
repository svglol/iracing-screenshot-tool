# Phase 6: ESLint 9 Flat Config + Prettier Full Wiring - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning
**Mode:** `--auto` (gray areas auto-resolved with recommended defaults; user may override at plan time)

<domain>
## Phase Boundary

Migrate the ESLint configuration from ESLint 7.10 + legacy `.eslintrc.js` (rc-format) to **ESLint 9.x + `eslint.config.js` (flat format)**, bump `eslint-config-prettier` 9 → 10, and wire `eslint-plugin-prettier` via `plugin:prettier/recommended` — superseding v1.3 Phase 4's Pitfall 4 minimum-scope `eslint-config-prettier`-only derogation.

Scope is limited to the root lint stack: `package.json` / `package-lock.json` (three dep bumps + one new wiring target), a new `eslint.config.js` file, the deletion of `.eslintrc.js`, and the migration of `.eslintignore` patterns into the new config's `ignores` field. The `bot/` workspace is excluded (inherits Phase 5 D-01 scope rule); `dist/` stays excluded (Phase 5 Rule-2 auto-fix carryover). No Vue-ecosystem plugin upgrades (`eslint-plugin-vue` 6 → 9 is v2.0), no typescript-eslint upgrade (Phase 7), no `eslint-config-standard` upgrade (its flat-config successor `neostandard` is v2.0 territory).

**In scope:**
- Upgrade `eslint` 7.10 → 9.x (latest stable line — planner resolves at plan time)
- Upgrade `eslint-config-prettier` 9 → 10 (FMT-02)
- Install `@eslint/eslintrc` as a devDependency — the `FlatCompat` bridge loads legacy `extends:` chains (`standard`, `plugin:vue/recommended`, `prettier`) and legacy plugin rule sets (`vue@6`, `@typescript-eslint@2`) without upgrading them
- Write `eslint.config.js` at repo root — array-export flat config using `FlatCompat` for legacy extends + native flat rules for `plugin:prettier/recommended` + inline overrides for the current 4-rule override block
- Wire `plugin:prettier/recommended` at the END of the extends chain so `eslint-config-prettier` still wins the format-vs-lint conflicts and `eslint-plugin-prettier` adds `prettier/prettier` as an error (FMT-01 — full integration)
- Migrate `.eslintignore` patterns (`bot/`, `dist/`) into `ignores: ['bot/**', 'dist/**', 'node_modules/**', 'build/**']` in `eslint.config.js`; delete `.eslintignore`
- Replace `--ext .js,.ts,.vue` in `npm run lint` with flat-config `files` globs (ESLint 9 removed the `--ext` flag entirely — SC1 hard requirement)
- Delete `.eslintrc.js` in the content commit (SC1: "legacy `.eslintrc.js` deleted or archived, no `eslintrc`-format files referenced by tooling")
- Capture pre-migration lint baseline (count + per-rule + top hotspots) as `06-01-BASELINE.md` (D-04/D-07 artifact pattern carryover)
- Cite post-migration lint delta in content commit body, with any `prettier/prettier` delta attributed to FMT-01 wiring

**Out of scope:**
- Upgrading `eslint-plugin-vue` 6 → 9 (REQUIREMENTS §"Future Requirements" — v2.0, must match Vue major)
- Upgrading `@typescript-eslint/*` 2 → 8 (REQUIREMENTS §TS-02 — Phase 7)
- Upgrading `eslint-config-standard` 14 → 17+ or replacing with `neostandard` (scope creep; legacy `standard` stays on ESLint-7-compatible line via FlatCompat)
- Removing `eslint-plugin-standard@4` (deprecated but no-op; cleanup is v2.0 candidate, not a Phase 6 blocker)
- Removing `--legacy-peer-deps` from `npm install` workflow (REQUIREMENTS §LINT-03 — Phase 7; the `@typescript-eslint@2 vs eslint@9` and other legacy-plugin peer conflicts all clear in Phase 7, not here)
- TypeScript 3.8 → 5.7 (Phase 7 §TS-01)
- Adding jest globals / jest env for `.test.js` files (would drop ~693 `no-undef` firings but is behavioral change beyond strict flat-config parity — deferred; see `<deferred>` below for planner handoff note)
- `bot/` workspace lint configuration (Phase 5 D-01 scope rule: bot/ owns its own ecosystem; v1.4 root lint stack excludes it)
- `.babelrc` changes (Phase 5 D-05 — @babel/eslint-parser inherits `.babelrc` unchanged)
- Running `--fix` sweep across the codebase (the `--fix` flag stays in `npm run lint` as pre-existing DX, but this phase's parity check uses `--no-fix` only — no in-phase auto-fix sweep)

</domain>

<decisions>
## Implementation Decisions

### Flat config migration strategy

- **D-01:** **Use `@eslint/eslintrc` `FlatCompat` as the legacy bridge.** The current rc-config depends on three legacy-format shared configs (`eslint-config-standard@14`, `plugin:vue/recommended` from `eslint-plugin-vue@6`, `eslint-config-prettier@9/10`) and one legacy plugin rule set (`@typescript-eslint@2`). None of these have flat-config-native versions at their current pinned major. Upgrading them is Phase 7 or v2.0 scope. `FlatCompat` is the ESLint-official documented migration path for this exact situation — the `.extends()`, `.config()`, and `.plugins()` methods load legacy configs into a flat-config array item unchanged. This is the minimum-surface migration that satisfies LINT-01/LINT-02 without expanding scope into Phase 7/v2.0 territory.
  - Rationale: preserving all existing rules (SC2 parity requirement) with zero plugin major bumps.
  - Alternative considered & rejected: pure flat migration (would require upgrading 3+ plugins — out of Phase 6 scope per REQUIREMENTS §TS-02 and §Future Requirements).

### Rule parity

- **D-02:** **Preserve every rule from `.eslintrc.js` verbatim through FlatCompat + inline `rules:` block.** The 4-rule inline override block (`generator-star-spacing: off`, `semi: [error, always]`, `no-debugger` conditional, globals `Atomics`/`SharedArrayBuffer`) carries forward as a native flat-config object. The `env: { browser: true, es6: true }` block becomes `languageOptions.globals: { ...globals.browser, ...globals.es2017 }` via the `globals` npm package (also installed as a devDependency). The `parserOptions` block (including `parser: '@babel/eslint-parser'`, `ecmaVersion: 2018`, `sourceType: 'module'`) becomes `languageOptions.parser: babelParser` + `languageOptions.parserOptions: { ... }` per flat-config idiom.
  - Rationale: SC2 requires "every rule from the old `.eslintrc.js` re-enabled or deliberately retired with an entry in the decision log" — preserving verbatim is the minimum-risk path. No rules are retired in this phase.

### Prettier wiring — FMT-01 full integration

- **D-03:** **Wire `plugin:prettier/recommended` at the END of the extends chain, with `prettier/prettier` firing as `error` severity (its default).** This is the standard `plugin:prettier/recommended` behavior — `eslint-plugin-prettier` reports Prettier diffs as lint errors, and `eslint-config-prettier` (already in the chain at v1.3) continues to disable conflicting ESLint format rules. FMT-01 is the "full integration" that supersedes v1.3 Phase 4 Pitfall 4's minimum-scope `eslint-config-prettier`-only derogation.
  - Rationale: the `.prettierrc` byte-preserved through Phase 4 already matches the codebase format (lint count dropped -48 below baseline when prettier-config was wired). Any `prettier/prettier` firings post-FMT-01 would represent real format drift since 2026-04-21; planner captures delta in `06-01-BASELINE.md` + content-commit body.
  - Alternative considered: demote `prettier/prettier` to `warn`. Rejected — weakens the enforcement that REQUIREMENTS §FMT-01 calls "full integration."

### Ignores migration

- **D-04:** **Migrate `.eslintignore` patterns into `ignores: [...]` at the top of the flat config array.** ESLint 9 flat config does NOT read `.eslintignore` (it's an rc-format artifact). The `ignores` array at the config's root scope applies globally to all subsequent config entries. Entries: `bot/**`, `dist/**`, `node_modules/**`, `build/**`. Delete `.eslintignore` in the content commit (same commit as `eslint.config.js` creation).
  - Rationale: mandatory per ESLint 9 flat-config semantics; `.eslintignore` was already the v1.4 lint-scope-control mechanism (Phase 5 D-08 band denominator carryover) and must survive the migration without behavioral drift.

### Command invocation — `npm run lint` script

- **D-05:** **Remove `--ext .js,.ts,.vue` from `npm run lint`; replace with flat-config `files` globs in `eslint.config.js`.** ESLint 9 removed the `--ext` flag entirely. The flat config's default `files` glob is `**/*.js`, which excludes `.ts` and `.vue` — both must be explicitly listed. Pattern: `files: ['**/*.{js,ts,vue}']` at the top of the config array, applied via FlatCompat-mediated rule entries plus explicit native entries. New script: `"lint": "eslint --fix ./"`.
  - Rationale: mandatory for ESLint 9 compatibility (SC1).
  - Note: `--fix` stays in the script (D-06) — the flag migration is purely the `--ext` removal.

- **D-06:** **Keep `--fix` in `npm run lint`.** Pre-existing DX; consistent with the same `--fix` behavior across Phases 3–5's `npm run lint` shape. The phase's parity check uses `npx eslint --no-fix ./` (D-09) to capture unbiased counts — the end-user DX script can still auto-fix on run.

### `eslint-plugin-prettier` + `eslint-config-prettier` version choices

- **D-07:** **`eslint-config-prettier` bumps 9 → 10 (caret).** Matches REQUIREMENTS §FMT-02 exactly. v10 drops ESLint 7 support (the reason it's paired with LINT-01 in this phase). Planner resolves exact minor at plan time.
- **D-08:** **`eslint-plugin-prettier` stays at 5.x (caret).** Already installed at `^5.2.1` from the v1.3 Phase 4 footprint; 5.x peer-requires `eslint@>=8`, which LINT-01's ESLint 9 satisfies. No new dep — just wiring.

### Baseline capture + parity verification

- **D-09:** **Capture `06-01-BASELINE.md` at the pre-migration HEAD in commit 1 (the `chore(deps):` commit).** Artifact contents: (a) `npx eslint --no-fix ./` total count + summary line, (b) per-rule frequency table (top 20), (c) per-file hotspots ≥50 firings, (d) timestamp + commit SHA. Pre-migration scope is `src + _scripts` per Phase 5's `.eslintignore` (bot/ excluded + dist/ excluded) — so the pre-migration baseline denominator is **722** (Phase 5 post-parser-swap count per `.planning/STATE.md` §"Phase 5 plan 05-02 landed"). Content commit 2's body cites this baseline + a one-line delta summary.
- **D-10:** **Post-migration parity band:** the **ROADMAP SC2 ceiling is `≤ 1881`** (v1.3 historical baseline retained in REQUIREMENTS §"Success Criteria" item 2 and ROADMAP Phase 6 SC2). Internal goal: **post_count ≤ 722 + `prettier/prettier` delta** (where the `prettier/prettier` delta represents newly-surfaced format drift attributable to FMT-01's full-integration wiring). Any non-prettier-attributable delta is treated as a migration bug to fix before the content commit lands (e.g., a rule accidentally dropped by FlatCompat). `prettier/prettier` firings are expected to be ≤ 20 (codebase was reformatted end-to-end in v1.3 Phase 4 and `.prettierrc` is byte-preserved); if the delta exceeds 20, route to user for decision before landing.
- **D-11:** **SC2 "every rule re-enabled or deliberately retired with an entry in the decision log" is satisfied by D-02** — no rules are retired. If FlatCompat surfaces any rule-id mismatches (e.g., a rule renamed between `eslint-config-standard@14` and `@eslint/eslintrc@3.x`), the planner documents each as a D-## entry in this file's planning addendum.

### Commit shape — D-04/D-07 bisect pattern

- **D-12:** **Two-commit minimum shape.** Commit 1 = `chore(deps): eslint 9 + eslint-config-prettier 10` — stages `package.json`, `package-lock.json`, and `.planning/phases/06-eslint-9-flat-config-prettier-full-wiring/06-01-BASELINE.md` (via `git add -f` per `.planning/` gitignore rule). No ESLint config changes yet; `.eslintrc.js` still active (though ESLint 9 will reject it when `npm run lint` runs — the commit body acknowledges this "broken-window" interval). Commit 2 = `refactor(eslint): migrate to flat config with full prettier wiring` — stages `eslint.config.js` (new), `.eslintrc.js` (deleted), `.eslintignore` (deleted), `package.json` (if `npm run lint` script edit is needed per D-05). If the `npm run lint` script edit lands in commit 1 alongside deps, move it to commit 2 to keep the dep-bump commit config-neutral.
  - Rationale: same D-04 bisect shape proven on Phase 3 (`ae2627b`/`b5ecc32`), Phase 4 (`62f7abc` + `1082d7d` + `e0e4923`), Phase 5 (`eef6a7a` + content). Bisect between HEAD and `chore(deps):` cleanly isolates "npm install breakage" from "config migration lint behavior change."
  - Optional 3rd/4th commit allowed: if the migration surfaces a scope-control addendum (Phase 5 Option-A style — bot/ out-of-scope glob miscount, dist/ generated-output lint noise), use a `chore(lint):` pre-condition commit between `chore(deps):` and `refactor(eslint):` to land the narrow scope fix. Precedent: Phase 5's four-commit chain.

- **D-13:** **No `--no-verify`, no `Co-Authored-By:` footer.** Pre-commit hooks run normally; commits authored by the human git user only (user memory `feedback_no_coauthor.md`; Phase 5 D-10 carryover).

- **D-14:** **`git add` must NOT use `-A` or `.`.** Stage paths explicitly by name. Commit 1: `package.json` + `package-lock.json` + `git add -f .planning/phases/06-eslint-9-flat-config-prettier-full-wiring/06-01-BASELINE.md`. Commit 2: `eslint.config.js` + `.eslintrc.js` (deleted; use `git rm`) + `.eslintignore` (deleted; use `git rm`). Untracked `bot/docs/community-guide.md` at repo root stays unstaged (Phase 5 D-11 carryover).

### npm install strategy

- **D-15:** **`--legacy-peer-deps` flag remains required.** Peer conflicts: `@typescript-eslint/*@2.25` peer-requires `eslint@5||6` (breaks on 9), `eslint-plugin-vue@6.2` peer-requires `eslint@5||6||7`, `eslint-plugin-standard@4`/`eslint-plugin-node@11`/`eslint-plugin-promise@4` all peer-require `eslint@5||6||7`. All clear naturally in Phase 7 (TS-02 eliminates the typescript-eslint conflict; `eslint-plugin-vue` stays legacy per REQUIREMENTS — but its peer range ceiling at v6 is ESLint 7, which means v1.4 ends with `eslint-plugin-vue@6` on ESLint 9 via `--legacy-peer-deps` STILL required — see LINT-03 rationale below).
  - **Critical dependency check:** REQUIREMENTS §LINT-03 specifies "no remaining peer-dependency conflicts after LINT-01 + TS-02 + FMT-02." Reading Phase 6 + 7 together: Phase 6 introduces ESLint 9 (breaks `eslint-plugin-vue@6` peer). Phase 7 upgrades typescript-eslint to 8 (clears that conflict) but does NOT upgrade `eslint-plugin-vue` (v2.0 per REQUIREMENTS §Future Requirements). **This is a REQUIREMENTS contradiction that surfaces in this phase.** Planner MUST route this to user at plan time: either (a) accept that `--legacy-peer-deps` remains required after v1.4 ships (LINT-03 deferred to v2.0), (b) upgrade `eslint-plugin-vue` 6 → 9 in this phase (scope expansion into v2.0 territory), or (c) find an intermediate `eslint-plugin-vue` line with ESLint-9 peer support (if one exists). **Flagged here as a pre-plan decision; do NOT assume resolution.**

- **D-16:** **`npm install --legacy-peer-deps` during plan execution.** The Phase 6 planner runs this in a dedicated wave after `package.json` deps are edited. Same pattern as Phase 5 plan 05-01.

### Scope-control — bot/ + dist/ carryover

- **D-17:** **`bot/` stays excluded** per Phase 5's `.eslintignore` decision and PROJECT.md §Out-of-Scope. Migrate to `ignores: ['bot/**', ...]` per D-04.
- **D-18:** **`dist/` stays excluded** per Phase 5 Rule-2 auto-fix (already in `.gitignore` line 19; lint excludes the generated webpack bundle). Migrate to `ignores: ['dist/**', ...]` per D-04.

### Claude's Discretion

- **Exact version pins** for `eslint` (expected `^9.x` latest stable), `eslint-config-prettier` (`^10.x`), `@eslint/eslintrc` (`^3.x` — the flat-compat bridge), `globals` (`^15.x` or `^16.x` whichever matches ESLint 9 peer range). Planner resolves via `npm view` + peer-range cross-checks at plan time.
- **Exact shape of FlatCompat usage** — whether to use `compat.extends('standard', 'plugin:vue/recommended', 'prettier')` as a single merged config-entry or three separate entries. Planner picks based on readability + FlatCompat-idiomatic patterns. Reference: `@eslint/eslintrc` README.
- **Decision on D-15 LINT-03 contradiction** — planner routes to user before finalizing plan (MUST NOT auto-decide).
- **Whether `06-01-BASELINE.md` captures both the `./` full scope (historical, showing bot/ exclusion still holds) AND the `files`-glob-scoped count** — suggested for cross-reference with Phase 5's addendum data, but planner may ship with just the active-scope count.
- **How to handle the "broken-window" interval between commit 1 and commit 2** where `.eslintrc.js` exists but `npm run lint` fails under ESLint 9 — commit 1 body should acknowledge this, but no verification gate is blocked by it (Wave 1 verification skips `npm run lint` between commits).
- **`npm run lint` script edit timing** — if ESLint 9 refuses the legacy `--ext` flag even before config migration (i.e., commit 1's post-dep-install state), the planner moves the `--ext` removal into commit 1 to keep the `chore(deps):` commit minimally self-consistent. Otherwise the edit stays in commit 2.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope and requirements

- `.planning/PROJECT.md` — v1.4 goal + Out-of-Scope list; `plugin:prettier/recommended` full integration scheduled for v1.4 Phase 6 (FMT-01)
- `.planning/REQUIREMENTS.md` §LINT-01, §LINT-02, §FMT-01, §FMT-02 — acceptance criteria for this phase's four requirements; §LINT-03 for the Phase 7 peer-deps resolution (referenced by D-15)
- `.planning/REQUIREMENTS.md` §"Out of Scope" — confirms `eslint-plugin-vue` 6 → 9 and `vue-eslint-parser` 7 → 9 are deferred to v2.0
- `.planning/REQUIREMENTS.md` §"Future Requirements" — confirms `eslint-plugin-vue` / `vue-eslint-parser` v2.0 deferral
- `.planning/REQUIREMENTS.md` §"Success Criteria (Milestone-Level)" item 2 — `npm run lint` ceiling of 1881 (historical v1.3 baseline)
- `.planning/ROADMAP.md` §"Phase 6: ESLint 9 Flat Config + Prettier Full Wiring" — Goal, Depends-on (Phase 5), 5 Success Criteria
- `.planning/STATE.md` §"Accumulated Context" — minimum-scope derogation philosophy (cited by D-10's parity-band interpretation), Phase 5 post-swap 722 count (D-09 denominator), `.eslintignore` as v1.4 lint-scope-control mechanism (cited by D-04)

### Prior-phase patterns directly reused here

- `.planning/phases/05-babel-package-renames/05-CONTEXT.md` §D-09, §D-11 — D-04 two-commit bisect shape; Phase 6 D-12 is the direct descendant
- `.planning/phases/05-babel-package-renames/05-CONTEXT.md` §D-07, §D-08 — pre/post baseline-diff pattern; Phase 6 D-09, D-10 inherit
- `.planning/phases/05-babel-package-renames/05-01-BASELINE.md` — direct template for `06-01-BASELINE.md` artifact format
- `.planning/phases/05-babel-package-renames/05-01-BASELINE.md` §"Addendum (2026-04-22T07:52:48Z) — Scope narrowed to src + _scripts" — D-09 denominator of 722 (src+_scripts scope, @babel/eslint-parser, legacy rc) is the Phase 6 pre-migration comparison point
- `.planning/milestones/v1.3-phases/04-prettier-3-reformat/04-CONTEXT.md` §Pitfall 4 — the derogation this phase (FMT-01) supersedes; content-commit body should cite it when marking FMT-01 complete

### Dependency analysis (original audit that seeded the milestone)

- `.planning/notes/dependency-analysis-2026-04.md` §"TIER 1 — Critical" (if exists; see Phase 5 CONTEXT for rev) — ESLint 7 → 9 and eslint-config-prettier 9 → 10 were both flagged as gated by Babel renames + typescript-eslint alignment
- Phase 5 baseline addendum referenced above for the 693-firing Jest-globals `no-undef` surface that this phase deliberately does NOT address (deferred)

### Code reference points (files the plan will touch)

- `.eslintrc.js` — the 31-line legacy rc-config being migrated. Fields: `env` (browser + es6), `extends` (plugin:vue/recommended, standard, prettier), `globals` (Atomics, SharedArrayBuffer), `parserOptions` (parser: @babel/eslint-parser, ecmaVersion 2018, sourceType module), `plugins` (vue), `rules` (4-override block). **Deleted in commit 2 (D-14).**
- `.eslintignore` — 3-line ignores file (`bot/`, `dist/`, trailing newline). **Deleted in commit 2 (D-04); patterns migrate to `ignores` in `eslint.config.js`.**
- `eslint.config.js` — **new file**, repo root, created in commit 2 (D-12). Array export pattern using FlatCompat + native flat entries.
- `package.json` §"devDependencies" — lines 86 (`eslint: ^7.10.0` → `^9.x`), 87 (`eslint-config-prettier: ^9.1.0` → `^10.x`). **New entry:** `@eslint/eslintrc: ^3.x` (alphabetical insertion — before `eslint`). **New entry:** `globals: ^15.x or ^16.x` (alphabetical insertion — in the `g` block). **Not changed:** `eslint-plugin-prettier@5.2.1` (D-08), `eslint-plugin-vue@6.2.2` (v2.0 per D-01), `@typescript-eslint/*@2.25.0` (Phase 7 per D-01), `eslint-config-standard@14.1.1` (v2.0 per D-01), `eslint-plugin-import@2.22.1`, `eslint-plugin-node@11.1.0`, `eslint-plugin-promise@4.2.1`, `eslint-plugin-standard@4.0.1` (all legacy-compat via FlatCompat).
- `package.json` §"scripts" — line 134 (`"lint": "eslint --fix --ext .js,.ts,.vue ./"` → `"lint": "eslint --fix ./"` per D-05/D-06). Timing per D-05 Claude's Discretion note.
- `package-lock.json` — regenerated by `npm install --legacy-peer-deps` (D-15/D-16). Expected churn: eslint 7 → 9 transitive tree (moderate — ESLint's internal dep graph reshuffled significantly in 8/9), eslint-config-prettier 9 → 10 (minimal), @eslint/eslintrc + globals fresh installs. Planner sets Pitfall-8-style threshold at plan time.
- `.babelrc` — inherited by `@babel/eslint-parser` per Phase 5 D-05. **NOT edited in this phase.**
- `_scripts/webpack.*.config.js` — `babel-loader` untouched (Phase 5 CONTEXT §"Out of Scope"). NOT edited in this phase.

### External docs (researcher should verify at plan time)

- ESLint 9 migration guide: `https://eslint.org/docs/latest/use/migrate-to-9.0.0` — authoritative list of breaking changes between 8 and 9
- ESLint flat-config migration guide: `https://eslint.org/docs/latest/use/configure/migration-guide` — legacy rc → flat migration reference
- `@eslint/eslintrc` `FlatCompat` reference: `https://www.npmjs.com/package/@eslint/eslintrc` — the `.extends()`, `.config()`, `.plugins()` method semantics
- `eslint-plugin-prettier` `plugin:prettier/recommended` ref: `https://github.com/prettier/eslint-plugin-prettier#recommended-configuration` — exact extends chain structure
- `eslint-config-prettier` v10 changelog: `https://github.com/prettier/eslint-config-prettier/releases` — the ESLint-7-support drop note
- `globals` npm package: `https://www.npmjs.com/package/globals` — flat-config-native way to declare `languageOptions.globals` (ESLint 9 deprecated the legacy `env:` field; flat config requires explicit globals import)
- `eslint-plugin-vue@6` peer-range confirmation: `https://www.npmjs.com/package/eslint-plugin-vue/v/6.2.2` — peerDependencies `eslint: ^5.0.0 || ^6.0.0 || ^7.0.0` (documents D-15's conflict)
- `@babel/eslint-parser` flat-config usage: `https://www.npmjs.com/package/@babel/eslint-parser` §"Usage" — confirms `parser: babelParser` import pattern for flat config (vs. rc-format string parser)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **Phase 5's `05-01-BASELINE.md` Addendum pattern** — directly transferable to `06-01-BASELINE.md`. Same file-naming convention, same body structure (count + per-rule + hotspots + command-provenance), same commit-body citation pattern.
- **D-04 two-commit bisect shape** — proven on master three times (Phase 3 `ae2627b`/`b5ecc32`, Phase 4 `62f7abc`/`1082d7d`/`e0e4923`, Phase 5 `eef6a7a` + three-commit chain). Phase 6 D-12 reuses the canonical two-commit shape; the Phase 5 Option-A scope-control addendum chain pattern remains available as a fallback if migration surfaces similar scope-control issues.
- **`.eslintignore` semantics** (Phase 5 output) — already excludes `bot/` and `dist/`. D-04 migrates these unchanged into the flat-config `ignores` field.
- **`parserOptions.parser: '@babel/eslint-parser'` wiring** (Phase 5 output) — survives the flat-config migration; the parser config moves into `languageOptions.parser` as a native import (`babelParser` symbol) per the flat-config idiom. Functional behavior unchanged.

### Established Patterns

- **Caret pins on dep bumps** — Phase 3 (`@fortawesome/*` at `^6.7.2`), Phase 4 (`prettier: ^3.3.3`), Phase 5 (`@babel/eslint-parser: ^7.28.6`). D-07 follows identical pattern for `eslint: ^9.x`, `eslint-config-prettier: ^10.x`, `@eslint/eslintrc: ^3.x`, `globals: ^15.x or ^16.x`.
- **`.planning/` gitignore + `git add -f` for in-phase artifacts** — applies to `06-01-BASELINE.md` per D-14 (Phase 3 / Phase 4 / Phase 5 all shipped baseline/bundle-diff artifacts this way).
- **No `Co-Authored-By:` footer, no `--no-verify`, explicit `git add <path>` (never `-A` or `.`)** — enforced across all v1.3 and v1.4 phases; Phase 6 D-13 + D-14 inherit.
- **`--legacy-peer-deps` is the standing `npm install` flag** — doesn't get "fixed" in Phase 6 (D-15). Phase 7 LINT-03 contradiction surfaced in D-15 for pre-plan decision.
- **`bot/` out of scope for v1.4 tooling phases** (Phase 5 D-01 + `.eslintignore`) — D-17 carries forward.
- **`dist/` out of scope for lint (generated output hygiene)** (Phase 5 Rule-2 auto-fix) — D-18 carries forward.

### Integration Points

- `eslint.config.js` — **new file** at repo root. Array export with `ignores` at top-scope, FlatCompat-mediated legacy config entries, native flat-config entries for overrides and prettier/recommended.
- `.eslintrc.js` — **deleted** in commit 2 (D-14). `git rm` staging.
- `.eslintignore` — **deleted** in commit 2 (D-04/D-14). `git rm` staging.
- `package.json` `devDependencies` (lines 68–119) — two version bumps (eslint, eslint-config-prettier), two new installs (@eslint/eslintrc, globals). Alphabetical-position insertions.
- `package.json` `scripts.lint` (line 134) — rewrite per D-05/D-06. Timing (commit 1 vs commit 2) per Claude's Discretion note in D-05.
- `package-lock.json` — regenerated by `npm install --legacy-peer-deps`. No direct edits.
- `.prettierrc` (repo root) — **NOT edited** (v1.3 Phase 4 byte-preserved intentionally; Phase 6 inherits).
- `.babelrc` (repo root) — **NOT edited** (Phase 5 D-05 inherit-semantics carryover).
- `_scripts/webpack.*.config.js` — **NOT edited** (out-of-scope per PROJECT.md / Phase 5 CONTEXT).

### Out of Scope (deliberately)

- `bot/` (D-17) — has its own lint tooling, out of v1.4 scope.
- `dist/` (D-18) — generated webpack bundle output, lint-excluded for hygiene.
- `eslint-plugin-standard@4` removal (deprecated; no-op) — v2.0 candidate, not a Phase 6 blocker.
- `eslint-config-standard` 14 → 17+ or migration to `neostandard` — scope creep; legacy v14 stays via FlatCompat.
- `.test.js` Jest-globals `no-undef` surface (~693 firings per Phase 5 addendum) — deferred as a post-v1.4 ticket; adding `files: ['**/*.test.js']` overrides with `languageOptions.globals: globals.jest` would be a behavioral improvement but expands scope beyond REQUIREMENTS §LINT-02 parity. Planner documents as a "noted for later" in the phase SUMMARY.
- Any `--fix` sweep across the codebase — Phase 5 style (Rule 2 auto-fix on narrow scope change) ONLY if FlatCompat surfaces a rule-id rename that requires an `--fix` invocation in a scope-narrowed way. Default: NO in-phase `--fix` sweep.
- TypeScript 5 / typescript-eslint 8 (Phase 7).
- Vue-ecosystem plugin upgrades (v2.0).

</code_context>

<specifics>
## Specific Ideas

- **Mirror Phase 5's `05-01-BASELINE.md` Addendum shape byte-for-byte in `06-01-BASELINE.md`.** Same headers, same command-provenance block, same per-rule frequency table structure. This keeps the baseline artifact machine-comparable across phases for the v1.4 audit.
- **Commit message exact wording (per convention):**
  - Commit 1 (chore(deps)): `chore(deps): eslint 9 + eslint-config-prettier 10` — body mentions (a) `@eslint/eslintrc` + `globals` fresh installs, (b) 722 pre-migration baseline SHA reference to `06-01-BASELINE.md`, (c) `--legacy-peer-deps` acknowledgment + D-15 contradiction pointer.
  - Commit 2 (content): `refactor(eslint): migrate to flat config with full prettier wiring` — body mentions (a) `plugin:prettier/recommended` wiring per FMT-01 (supersedes v1.3 Phase 4 Pitfall 4), (b) `.eslintrc.js` and `.eslintignore` deleted, (c) post-migration lint count delta with `prettier/prettier` attribution.
  - Planner may pick different exact subject tokens (`refactor(eslint)` vs `chore(lint)` etc.); the scope keyword matters less than the chronological shape.
- **Automated-first verification (same as Phase 5):** `npm install --legacy-peer-deps` succeeds → `npm run lint` count ≤ 1881 AND post_count ≤ (722 + prettier/prettier delta expected ≤ 20) → `npm run test` 256/256 → `npm run prettier -- --check` passes (SC4). No per-view manual UAT required for a lint-config migration (Phase 3 D-05's 4-view UAT was specific to visual icon changes).
- **Verification adds a new gate for SC4**: `npm run prettier -- --check` must pass — this is new relative to Phase 5 and specifically checks FMT-01 wiring didn't accidentally reformat anything. Expected: zero changes (Phase 4 already shipped codebase in Prettier 3 format).
- **Pre-plan checkpoint for D-15 (LINT-03 contradiction):** planner MUST route to user at RESEARCH or PLAN phase before finalizing. Three options:
  1. Accept `--legacy-peer-deps` persists past v1.4 (LINT-03 → v2.0; REQUIREMENTS updated at phase completion)
  2. Upgrade `eslint-plugin-vue` 6 → 9 in Phase 6 (scope expansion; would also require `vue-eslint-parser` 7 → 9 per peer; invalidates v2.0 scope boundary)
  3. Find intermediate `eslint-plugin-vue` line (e.g., 7.x or 8.x) with ESLint 9 peer support but Vue 2 compatibility (research task — may not exist)

</specifics>

<deferred>
## Deferred Ideas

- **Jest globals for `.test.js` files** (drops ~693 `no-undef` firings surfaced in Phase 5's `05-01-BASELINE.md` Addendum). Would be a `files: ['**/*.test.js']` override in `eslint.config.js` with `languageOptions.globals: { ...globals.jest }`. Noted here for planner SUMMARY + as a post-v1.4 ticket candidate. NOT picked up in Phase 6 per strict LINT-02 parity scope.
- **`eslint-plugin-standard@4` removal** — deprecated and no-op; cleanup is v2.0 candidate (not a Phase 6 blocker; FlatCompat loads `eslint-config-standard@14` without issue even with the plugin as a legacy peer).
- **`eslint-config-standard` 14 → 17+ or `neostandard` migration** — legacy config survives Phase 6 via FlatCompat. Replacement is v2.0 (pairs with `eslint-plugin-vue` upgrade since both are Vue-ecosystem tooling).
- **`--legacy-peer-deps` removal** — REQUIREMENTS §LINT-03 schedules for Phase 7; but D-15 surfaces a contradiction that may push LINT-03 to v2.0. Pre-plan decision pending.
- **`eslint-plugin-vue` 6 → 9 + `vue-eslint-parser` 7 → 9** — v2.0 (must match Vue major per REQUIREMENTS §"Future Requirements" and PROJECT.md §Out of Scope).
- **TypeScript 3.8 → 5.7 + `@typescript-eslint/*` 2 → 8** — Phase 7 (§TS-01, §TS-02).
- **Prettier expansion to `bot/`** — inherited deferred from v1.3 Phase 4 + Phase 5 CONTEXT.
- **v1.4 final ROADMAP/REQUIREMENTS §SC2 re-wording** — if D-10's parity band (722 + prettier delta) differs meaningfully from the historical 1881 ceiling, the milestone audit MAY recommend updating REQUIREMENTS §"Success Criteria" item 2 to reflect the src+_scripts-only denominator. This is an audit-time decision, not a Phase 6 edit.

</deferred>

---

*Phase: 06-eslint-9-flat-config-prettier-full-wiring*
*Context gathered: 2026-04-22*
*Mode: --auto (autonomous mode; gray-area decisions auto-resolved with recommended defaults)*

---

## D-15 Resolution Addendum (2026-04-22)

**User selected Option 1:** Accept `--legacy-peer-deps` persists past v1.4. LINT-03 ("drop `--legacy-peer-deps`") is reworded/deferred at milestone audit time; full removal moves to v2.0 alongside the `eslint-plugin-vue` 6 → 9 and `vue-eslint-parser` 7 → 9 upgrades (scope boundary).

**Implications for Phase 6/7 planning:**
- Phase 6 keeps `--legacy-peer-deps` throughout — no change (D-15/D-16 unchanged).
- Phase 7 TS-02 still resolves the `@typescript-eslint@2 vs eslint@9` peer conflict (one of two legacy conflicts). The `eslint-plugin-vue@6 vs eslint@9` conflict remains a standing `--legacy-peer-deps` requirement through v1.4 close.
- Phase 7 LINT-03 verification changes: instead of "`npm install` succeeds without `--legacy-peer-deps`", the gate becomes "`npm install --legacy-peer-deps` produces zero new peer warnings beyond the pre-existing `eslint-plugin-vue@6 vs eslint@9` + any other Vue-ecosystem pins" + "REQUIREMENTS §LINT-03 is reworded to scope removal to v2.0" (audit-time REQUIREMENTS edit).
- Milestone audit MUST produce a REQUIREMENTS §LINT-03 re-scope entry noting the Option 1 resolution.

**No Phase 6 plan/execution changes required** — proceeding with the D-01 through D-18 decisions as captured above.

---

## D-01 Amendment (2026-04-22 — surfaced during Plan 06-02 execution)

**Finding:** `eslint-plugin-vue@6.2.2` has a HARD runtime incompatibility with ESLint 9 — not a peer-range warning. It calls `funcInfo.codePath.currentSegments.some(...)` inside `vue/require-render-return` (and other rules), but ESLint 9 removed `codePath.currentSegments` from the public API. Result: `TypeError: Cannot read properties of undefined (reading 'some')` when linting any `.js`/`.vue` file. This cannot be shimmed — the API is deep in ESLint's code-path-analysis internals.

**Research correction:** `06-RESEARCH.md §Pitfall 7` stated that `eslint-plugin-vue@6` and `@typescript-eslint@2` would "load and function under ESLint 9 with only npm peer warnings" based on entry-point inspection. That was correct at the `require()` boundary but missed the internal ESLint API usage that fails at lint time.

**User decision (Option A, 2026-04-22):** Upgrade `eslint-plugin-vue` from `^6.2.2` to `^9.x` (latest ESLint-9-compatible v9 — `^9.33.0` at time of decision). `eslint-plugin-vue@9` still targets Vue 2 + Vue 3; the Vue-2 `plugin:vue/recommended` rule set is preserved. `vue-eslint-parser` stays at `^7.0.0` (current pin — eslint-plugin-vue@9 peer-range accepts it).

**Implications for CONTEXT.md decisions:**
- **D-01 amendment:** "No plugin upgrades" in Phase 6 now has one explicit exception: `eslint-plugin-vue` 6 → 9. Rationale: D-01's intent was "don't expand scope into Phase 7/v2.0 plugin upgrades," but D-01 was premised on v6 loading under ESLint 9. With that premise broken, the minimum-surface path to honor LINT-01 (ESLint 9 runs) is the plugin bump. All other legacy plugins (`@typescript-eslint@2`, `eslint-config-standard@14`, `eslint-plugin-standard@4`, `eslint-plugin-node@11`, `eslint-plugin-promise@4`, `eslint-plugin-import@2`) stay per D-01 — they don't have the `codePath.currentSegments` crash surface.
- **D-02 rule parity:** Vue 2 rules from `plugin:vue/recommended` are preserved across v6 → v9 (`eslint-plugin-vue@9` still targets Vue 2). Some Vue 3-only rules may additionally activate — planner instructs executor to verify per-rule delta in the D-11 audit.
- **D-15 Option 1 resolution still holds:** The `eslint-plugin-vue@6 vs eslint@9` peer conflict cited in D-15 is now moot (upgrade resolves it), but `@typescript-eslint@2 vs eslint@9` still requires `--legacy-peer-deps` — so D-15's "persist past v1.4" conclusion is correct through Phase 6 (Phase 7 resolves typescript-eslint, final state TBD).
- **Package.json churn for commit 2:** ONE additional dep edit — `eslint-plugin-vue: ^6.2.2 → ^9.x`. Stage `package.json` + `package-lock.json` alongside `eslint.config.js` + `.eslintrc.js` deletion + `.eslintignore` deletion. Commit 2 now stages 5 paths (was 3). Commit message unchanged.
- **Shim workaround note:** The executor's earlier `Module._load` shim (for `eslint-plugin-vue@6`'s private-path access) and `FileContext.prototype.parserServices` shim are NO LONGER NEEDED with v9 and should be removed from `eslint.config.js` — v9 uses modern ESLint 9-compatible APIs natively.

**No other CONTEXT decisions changed.** All post-execution SC evidence and verification flow unchanged.
