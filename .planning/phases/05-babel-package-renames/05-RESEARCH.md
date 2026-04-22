# Phase 5: Babel Package Renames - Research

**Researched:** 2026-04-21
**Domain:** ESLint parser swap + npm dependency cleanup (deprecated → canonical Babel scope) on a Vue 2 + Electron 41 + ESLint 7 stack
**Confidence:** HIGH (every load-bearing claim verified against npm registry, installed `node_modules/`, and official Babel/Vue docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 — Drop `babel-runtime` entirely.** Zero import sites; `.babelrc` does not list `@babel/plugin-transform-runtime`; installing `@babel/runtime` would be identical dead weight.
- **D-02 — D-01 recorded as deliberate minimum-scope interpretation of BABEL-01.** No ROADMAP/REQUIREMENTS edits; deviation cited in commit body.
- **D-03 — Install `@babel/eslint-parser` and wire as `parserOptions.parser`** (NOT top-level `parser:` — `vue-eslint-parser` from `plugin:vue/recommended` delegates `<script>` parsing to `parserOptions.parser`).
- **D-04 — Current `.eslintrc.js` has no `parser` field.** `<script>` blocks have been delegating to `espree`. Wiring `@babel/eslint-parser` makes the parser explicit for the first time. This is a functional config change, not a pure rename.
- **D-05 — Default `@babel/eslint-parser` config — inherit `.babelrc`.** No `parserOptions.requireConfigFile`, no inline `babelOptions`. Single source of truth between build and lint parsing.
- **D-06 — `@babel/eslint-parser: ^7.x`, latest stable 7.x line, ESLint-7 compatible.** No `^8.x`. Researcher confirms exact pin (see §Standard Stack).
- **D-07 — Pre/post baseline-diff pattern.** Capture `05-01-BASELINE.md` artifact in commit 1's phase dir (count + per-rule + per-file). Cite in commit 2's body with one-line delta summary.
- **D-08 — SC3 "band" semantics.** Lint count ≤ 1881 NET; deltas in either direction acceptable.
- **D-09 — Two-commit shape (D-04 bisect pattern locked).** Commit 1 = `chore(deps): rename babel packages` (`package.json` + `package-lock.json` + `05-01-BASELINE.md` only; NO config edits). Commit 2 = `.eslintrc.js` `parserOptions.parser` wiring.
- **D-10 — No `--no-verify`, no `Co-Authored-By:` footer** in either commit. Pre-commit hooks run normally.
- **D-11 — `git add` must NOT use `-A` or `.`** Untracked `bot/docs/community-guide.md` MUST stay unstaged. Stage paths explicitly. Baseline artifact needs `git add -f .planning/phases/05-babel-package-renames/05-01-BASELINE.md`.
- **D-12 — `--legacy-peer-deps` flag remains required.** Pre-existing `@typescript-eslint/eslint-plugin@2.34.0` vs `eslint@^7.10.0` peer conflict is orthogonal; resolution scheduled for Phase 7 (LINT-03).

### Claude's Discretion

- Exact version pin for `@babel/eslint-parser` (caret-resolved at plan time; expected to land on latest stable 7.x line).
- Whether commit 1 also auto-updates peer-adjacent dev deps if `npm install --legacy-peer-deps` produces a wider `package-lock.json` churn than expected. Prefer minimum-churn; if non-Babel-adjacent edits surface, route to user before landing commit 1.
- Whether to run `npm run lint --fix` after wiring the new parser in commit 2. Prefer NOT to (rename/wire phase, not a lint sweep). Auto-fixable parser-attributable warnings → note in delta summary, do not fix in-phase.
- Baseline artifact file name — `05-01-BASELINE.md` suggested (matches Phase 4's `04-01-BASELINE.md`).

### Deferred Ideas (OUT OF SCOPE)

- `@babel/runtime` + `@babel/plugin-transform-runtime` wiring — not needed (D-01).
- `--legacy-peer-deps` removal — Phase 7 LINT-03.
- ESLint flat-config migration — Phase 6 (LINT-01, LINT-02).
- `eslint-config-prettier` 9 → 10 + `plugin:prettier/recommended` full wiring — Phase 6 (FMT-01, FMT-02).
- `@babel/preset-env` targets refresh, `@babel/preset-typescript` options audit — not in scope for v1.4.
- Vue-ecosystem parser upgrades (`vue-eslint-parser` 7 → 9, `eslint-plugin-vue` 6 → 9) — v2.0 (must match Vue major).
- Prettier expansion to `bot/` — v1.3 deferred; not picked up in v1.4.
- Updating ROADMAP SC1's grep wording — user chose to record interpretation in CONTEXT.md instead.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BABEL-01 | `babel-runtime` 6.x replaced with `@babel/runtime` — all import sites updated, no references to the deprecated name remain | Verified: ZERO import sites of `babel-runtime` or `babel/runtime` in `src/` or `_scripts/` (grep confirmed). `.babelrc` does NOT list `@babel/plugin-transform-runtime` — without that plugin, `@babel/runtime` would be inert dead weight. D-01 satisfies BABEL-01 by absence: zero import sites + zero deprecated-name references after removal. ROADMAP SC1's grep returns only `@babel/eslint-parser` matches post-phase. |
| BABEL-02 | `babel-eslint` 10.x replaced with `@babel/eslint-parser` — ESLint config updated to use the new parser | Verified: latest stable `@babel/eslint-parser@7.28.6` (published 3 months ago) declares `eslint: "^7.5.0 \|\| ^8.0.0 \|\| ^9.0.0"` peer + `@babel/core: "^7.11.0"` peer. Project has `eslint@7.32.0` and `@babel/core@7.29.0` installed — both satisfy. Wiring as `parserOptions.parser` (D-03) inherits `.babelrc` (D-05) for single-source-of-truth between build and lint parsing. `vue-eslint-parser`'s top-level `parser` (set by `plugin:vue/base` extends chain) stays in place for SFC `<template>` linting. |

</phase_requirements>

## Summary

This phase swaps two deprecated Babel package names for their canonical `@babel/*` equivalents on a stack that is unusually well-positioned for the change. The Phase-5-specific findings:

1. **The `@babel/eslint-parser` ecosystem is mature and stable on the 7.x line.** Latest stable is `7.28.6` (published ~3 months ago, 2026-01); peer-dep range `eslint: ^7.5.0 || ^8.0.0 || ^9.0.0` cleanly accepts the project's `eslint@^7.10.0`. The 7.x line has remained uninterrupted across 35+ minor releases since 7.0 (released 2020); no breaking changes have been introduced for the simple `parserOptions.parser` use case. **Recommended pin: `^7.28.6`** (caret on latest stable, matching v1.3 Phase 4's `prettier: ^3.3.3` carryover pattern). Phase 6's ESLint 9 migration will not require an `@babel/eslint-parser` rev — the same `^7.x` range covers all three ESLint majors (7, 8, 9).

2. **Lockfile churn is minimum-possible — and net-NEGATIVE on transitive depth.** `babel-eslint@10.1.0`'s 6 transitive deps (`@babel/code-frame`, `@babel/parser`, `@babel/traverse`, `@babel/types`, `eslint-visitor-keys@1`, `resolve`) are ALL already-present at the project's existing `@babel/core@7.29.0` major. `@babel/eslint-parser`'s 3 deps (`semver@^6`, `eslint-visitor-keys@^2.1.0`, `@nicolo-ribaudo/eslint-scope-5-internals@5.1.1-v1`) — the first two are already in `node_modules`; only `@nicolo-ribaudo/eslint-scope-5-internals` (1.7 KB unpacked) is genuinely new. Removing `babel-runtime@6.26.0` drops `core-js@2.6.11` and `regenerator-runtime@0.11.1` from the tree entirely (both nested under `babel-runtime/node_modules/` — no other consumers). **Expected lockfile diff: 2 top-level removals + 1 top-level install + ~5 transitive removals + 1 transitive add.**

3. **The lint-delta surface is far smaller than the CONTEXT.md hypothesis suggested.** D-07 mentioned class-property syntax as the canonical "AST nodes espree skipped that `@babel/eslint-parser` will surface." Reality check on this codebase: there are **ZERO `.ts` files** in `src/` or `_scripts/` (despite `eslint --ext .js,.ts,.vue` and `.babelrc` listing `@babel/typescript`). There are **ZERO class-property declarations** in the codebase — the one class definition (`src/main/iracing-sdk.js:9 IRacingBridge`) initializes all fields inside the constructor (the standard ES2015 pattern, not a class field). The `.babelrc` plugin `@babel/proposal-class-properties` is configured but unused. The `.babelrc` plugin `@babel/proposal-object-rest-spread` IS exercised (multiple `...rest` spreads in `src/main/index.js`, `src/utilities/`) — but rest/spread is ES2018, already supported by `parserOptions.ecmaVersion: 2018` + espree. **Realistic delta range: ±0 to ±10 lint counts.** A zero-delta result is the expected outcome; small positive deltas (e.g., +2 to +6 from minor scope-analysis differences in `no-unused-vars`/`no-undef`) are the historically-documented `@babel/eslint-parser` known behaviors and are parser-attributable. Large deltas (>±20) would be a research-time miss and warrant pause.

4. **Vue SFC delegation chain is intact and verified.** The `plugin:vue/recommended` extends chain (`recommended` → `strongly-recommended` → `essential` → `base`) sets `parser: require.resolve('vue-eslint-parser')` at the top level (verified by reading `node_modules/eslint-plugin-vue/lib/configs/base.js`). `vue-eslint-parser@7.0.0`'s `index.js:581-585` then resolves `parserOptions.parser` — using `require(parserOptions.parser)` if set as a string, else falling back to `require("espree")`. So today, `<script>` blocks ARE going through espree (D-04 confirmed by source). After Phase 5: through `@babel/eslint-parser`. Vue `<template>` blocks remain handled by `vue-eslint-parser` itself. The delegation chain is well-documented and idiomatic.

**Primary recommendation:** Pin `@babel/eslint-parser: ^7.28.6` in `devDependencies` (alphabetical insertion immediately after `@babel/core` at current line 70, before `@babel/plugin-proposal-class-properties` at line 71 — verified). Wire in `.eslintrc.js` `parserOptions` as `parser: '@babel/eslint-parser'` (single new key alongside existing `ecmaVersion: 2018, sourceType: 'module'`). Do not pass `requireConfigFile`, `babelOptions`, `allowImportExportEverywhere`, or any other parser option — D-05's `.babelrc` inheritance is the lowest-surface-area approach and matches the documented happy path.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `.vue` file orchestration | `vue-eslint-parser` (top-level `parser`, set by `plugin:vue/base` extends chain) | — | Reads SFC structure, hands `<template>` to its own templating analyzer, hands `<script>` to `parserOptions.parser`. |
| `<template>` block lint | `vue-eslint-parser` template AST | `eslint-plugin-vue` rules | Template directives, `v-if`/`v-for`, attribute ordering all checked by `vue/*` rules. NOT in this phase's scope. |
| `<script>` block parse (Vue SFC) | `@babel/eslint-parser` (post-phase) | `.babelrc` (presets/plugins inherited via D-05) | Currently espree per D-04; Phase 5 swaps. |
| `.js` file parse | `@babel/eslint-parser` (post-phase) | `.babelrc` (presets/plugins inherited via D-05) | Currently espree (the project has no top-level `parser:` field today). |
| `.ts` file parse | n/a in practice (zero `.ts` files in `src/` or `_scripts/`) | `eslint --ext .ts` matches zero files | The `--ext .ts` flag is harmless dead config. `.babelrc`'s `@babel/typescript` preset would handle `.ts` files IF any existed. |
| Build-time JS/TS transform | `babel-loader` (webpack) → `.babelrc` presets/plugins | `@babel/core@7.29.0` | NOT touched in this phase per CONTEXT.md (`_scripts/webpack.*.config.js` line 27/33). |
| Lint config declaration | `.eslintrc.js` (legacy `eslintrc` format, ESLint 7) | `extends: ['plugin:vue/recommended', 'standard', 'prettier']` | Single edit site for D-03. Flat config migration is Phase 6. |
| npm dep declaration | `package.json` `dependencies` (line 51 removal) + `devDependencies` (line 78 removal + new alphabetical insert near top) | `package-lock.json` regenerated by `npm install --legacy-peer-deps` | D-09 commit 1 owns this layer. |
| Lint-baseline artifact | `.planning/phases/05-babel-package-renames/05-01-BASELINE.md` (gitignored, force-added) | `git add -f` per D-11 | Phase artifact, captured in commit 1, cited from commit 2 body. |

## Standard Stack

### Core — exact version to pin

| Library | Target Pin | Latest Available 2026-04-21 | Published | ESLint 7 compat | Source |
|---------|------------|------------------------------|-----------|------------------|--------|
| `@babel/eslint-parser` | `^7.28.6` | `7.28.6` (latest stable 7.x) | 2026-01 (~3 months ago) | ✅ peer `eslint: "^7.5.0 \|\| ^8.0.0 \|\| ^9.0.0"` accepts project's `eslint@7.32.0` | [VERIFIED: `npm view @babel/eslint-parser version` + `peerDependencies` 2026-04-21] |

**`8.0.0-rc.3` exists** as `next` dist-tag but is explicitly excluded by D-06 — Phase 5 stays on the 7.x line. The `next-eslint-9: 7.24.5-pre.1` dist-tag is a one-off pre-release for ESLint 9 compat verification and is NOT a candidate (D-06 rejects pre-release pins; the regular 7.x line covers ESLint 9 anyway via the standard peer range).

**Caret rationale (matches v1.3 Phase 3 + Phase 4 pattern):** `^7.28.6` permits patch + minor backports within the 7.x line. Concretely, `npm install` will resolve to whatever 7.x is latest at install time (today: 7.28.6 itself). The peer range has been stable across the 7.x line — every minor release from 7.24.x through 7.28.x declares the same `eslint: "^7.5.0 || ^8.0.0 || ^9.0.0"` and `@babel/core: "^7.11.0"`. No regression risk from caret-resolution drift within 7.x.

### Removal targets

| Library | Currently Pinned | Action | Reason |
|---------|-----------------|--------|--------|
| `babel-runtime` | `^6.26.0` (`dependencies` line 51) | **REMOVE** (no replacement) | D-01: zero import sites; `.babelrc` does not list `@babel/plugin-transform-runtime`. Installing `@babel/runtime` as canonical name would be identical dead weight. |
| `babel-eslint` | `^10.1.0` (`devDependencies` line 78) | **REMOVE** (replaced by `@babel/eslint-parser`) | D-03 + BABEL-02. Package was installed but NOT wired into `.eslintrc.js` (D-04 confirmed: no `parser:` field today). Deprecated upstream — npm view shows literal "DEPRECATED!! - babel-eslint is now @babel/eslint-parser." |

### Insertion site (verified against current package.json)

`package.json` `devDependencies` block currently ordered (lines 70–79):

```
"@babel/core": "^7.9.0",                              // line 70
"@babel/plugin-proposal-class-properties": "^7.8.3",  // line 71
"@babel/plugin-proposal-object-rest-spread": "^7.9.0",// line 72
"@babel/preset-env": "^7.9.0",                        // line 73
"@babel/preset-typescript": "^7.9.0",                 // line 74
"@electron/rebuild": "^4.0.3",                        // line 75
"@typescript-eslint/eslint-plugin": "^2.25.0",        // line 76
"@typescript-eslint/parser": "^2.25.0",               // line 77
"babel-eslint": "^10.1.0",                            // line 78 — REMOVE
"babel-loader": "^8.1.0",                             // line 79
```

Alphabetical insertion of `@babel/eslint-parser` lands **between line 70 (`@babel/core`) and line 71 (`@babel/plugin-proposal-class-properties`)**:

```
"@babel/core": "^7.9.0",
"@babel/eslint-parser": "^7.28.6",                    // NEW INSERT
"@babel/plugin-proposal-class-properties": "^7.8.3",
```

`e` < `p` alphabetically — verified with `LC_ALL=C` ordering convention. Matches the existing convention in this file (already alphabetical within the `@babel/*` cluster).

**No version pin changes** to other dependencies (`@babel/core`, `@babel/preset-env`, etc.). The phase only modifies the three lines documented above.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `^7.28.6` (caret on latest stable 7.x) | Exact `7.28.6` pin (no caret) | Loses backports. Not aligned with v1.3 Phase 3/4 caret convention. |
| `^7.28.6` | `^7.24.5-pre.1` (`next-eslint-9` tag) | Pre-release; explicitly out of scope. ESLint 9 isn't this phase's problem. |
| `^7.28.6` | `^8.0.0-rc.3` (`next` tag) | D-06 rejects 8.x. Pre-release. |
| `^7.28.6` | Pin to a 7.24.x or earlier "known-stable-on-eslint-7" point | No evidence of regression on the latest 7.x. Older pin = stale security & older `@babel/parser` peer alignment. Skip. |
| Inherit `.babelrc` (D-05 happy path) | Inline `babelOptions` in `.eslintrc.js` | Dual-source-of-truth; would diverge from build-time Babel parsing. D-05 explicitly rejects. |
| Inherit `.babelrc` | `requireConfigFile: false` | Allows linting files outside Babel's config scope. Not needed here — every `.js`/`.vue` `<script>` in `src/` and `_scripts/` is already in scope of the root `.babelrc`. D-05 explicitly rejects. |

### Installation command

```bash
# Removes babel-runtime (deps), removes babel-eslint (devDeps), adds @babel/eslint-parser (devDeps).
# --legacy-peer-deps required per D-12 (orthogonal typescript-eslint@2 ↔ eslint@7 peer conflict, Phase 7 problem).
npm install --save-dev --legacy-peer-deps @babel/eslint-parser@^7.28.6
npm uninstall --save --legacy-peer-deps babel-runtime
npm uninstall --save-dev --legacy-peer-deps babel-eslint
```

**Or, equivalently, edit `package.json` by hand and run a single `npm install --legacy-peer-deps`** — this is the pattern v1.3 Phases 3 and 4 used (cleaner single lockfile diff). Recommended approach for the planner: **hand-edit `package.json` then single `npm install --legacy-peer-deps`** so commit 1's diff shows the exact 3-line `package.json` shape clearly.

**Version verification command (pre-commit sanity):**

```bash
npm ls @babel/eslint-parser   # expect: @babel/eslint-parser@7.28.6
npm ls babel-eslint           # expect: empty / "(empty)"
npm ls babel-runtime          # expect: empty / "(empty)"
```

## Architecture Patterns

### System Architecture Diagram

```
                                     ┌──────────────────────────────┐
                                     │       npm run lint           │
                                     │   (eslint --ext .js,.ts,.vue)│
                                     └──────────────┬───────────────┘
                                                    │
                                ┌───────────────────┼────────────────────┐
                                │                   │                    │
                          .js files            .vue files            .ts files
                                │                   │              (zero matches)
                                ▼                   ▼                    │
                  ┌──────────────────────┐  ┌──────────────────┐        ▼
                  │  parser RESOLVED:    │  │ vue-eslint-parser│  (no-op)
                  │ @babel/eslint-parser │  │  (top-level via  │
                  │  (post-phase)        │  │ plugin:vue/base) │
                  │                      │  └────────┬─────────┘
                  │  (currently: espree, │           │
                  │   D-04 confirmed)    │     parses SFC structure
                  └──────────┬───────────┘     ┌─────┴─────┐
                             │                 │           │
                             │           <template>     <script>
                             │                 │           │
                             │                 ▼           ▼
                             │          template AST    delegate to
                             │          ┌─────────┐    parserOptions.parser
                             │          │ vue/*   │           │
                             │          │ rules   │           ▼
                             │          └─────────┘   ┌──────────────────────┐
                             │                        │ @babel/eslint-parser │
                             │                        │  (post-phase)        │
                             │                        │  (currently: espree, │
                             │                        │   per index.js:585)  │
                             │                        └──────────┬───────────┘
                             │                                   │
                             └───────────────┬───────────────────┘
                                             ▼
                                  ┌──────────────────────┐
                                  │    .babelrc          │
                                  │  - @babel/env        │
                                  │    (target: electron │
                                  │     41.0)            │
                                  │  - @babel/typescript │
                                  │  - @babel/proposal-  │
                                  │    class-properties  │
                                  │  - @babel/proposal-  │
                                  │    object-rest-spread│
                                  │                      │
                                  │ (inherited per D-05; │
                                  │  no edits this phase)│
                                  └──────────┬───────────┘
                                             ▼
                                       ESTree-compliant AST
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │   ESLint rules  │
                                    │ (standard +     │
                                    │  vue/* +        │
                                    │  prettier)      │
                                    └─────────────────┘
```

### Pattern 1: Vue SFC `<script>` block delegation via `parserOptions.parser`

**What:** When a top-level `parser` is `vue-eslint-parser` (set by extending `plugin:vue/recommended`), `<script>` blocks are NOT parsed by `vue-eslint-parser` itself — they're delegated to whatever `parserOptions.parser` resolves to. If unset, vue-eslint-parser falls back to requiring `"espree"`.

**When to use:** Every Vue SFC in a project where the build pipeline uses Babel (so lint-time parsing should match build-time parsing).

**Verified behavior** (from `node_modules/vue-eslint-parser/index.js:581-585`):

```javascript
const parser = typeof parserOptions.parser === "string"
    ? require(parserOptions.parser)
    : require("espree");
```

**Idiomatic `.eslintrc.js` config** (post-phase target):

```javascript
// Source: eslint.vuejs.org/user-guide + verified against installed vue-eslint-parser@7.0.0 source
module.exports = {
  extends: [
    'plugin:vue/recommended',  // sets parser: 'vue-eslint-parser' via base.js
    'standard',
    'prettier',
  ],
  parserOptions: {
    parser: '@babel/eslint-parser',  // NEW — D-03
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  // ... rest unchanged
};
```

**Why NOT top-level `parser: '@babel/eslint-parser'`:** Would override `vue-eslint-parser`. Result: `<template>` blocks would fail to parse (Babel doesn't understand SFC top-level structure), `vue/*` rules would fire false errors on every `.vue` file. This is the exact failure mode D-03 prevents.

### Pattern 2: `.babelrc` inheritance via `requireConfigFile: true` (default)

**What:** When `@babel/eslint-parser` runs, it resolves the project's Babel config the same way `@babel/core` does: walk upward from the file being linted, find `.babelrc` / `babel.config.js` / `package.json#babel`, merge per Babel's resolution rules.

**When to use:** Always — unless you explicitly want to lint files outside any Babel config scope (e.g., a `bot/` workspace with no `.babelrc` of its own when linting from the repo root). Not this phase's situation: every file in `src/` and `_scripts/` is already in scope of the root `.babelrc`.

**Implication for this phase:** The presets/plugins listed in the project's `.babelrc` (`@babel/env`, `@babel/typescript`, `@babel/proposal-class-properties`, `@babel/proposal-object-rest-spread`) are what `@babel/eslint-parser` will use to parse. The lint will see the same syntax surface the build sees. **No `.eslintrc.js` `babelOptions` needed.**

### Pattern 3: D-04 two-commit bisect shape (carryover from v1.3 Phase 3 + Phase 4)

**What:** Split a dep-bump phase into (a) `chore(deps):` commit modifying only `package.json` + `package-lock.json` (+ phase artifact), and (b) `refactor(...)` / `format:` content commit modifying source/config. Bisecting between HEAD and `chore(deps)` cleanly isolates "npm install broke something" from "config/source change broke something."

**When to use:** Every dep-bump phase that pairs an install with a config/code change. v1.3 Phase 3 (`ae2627b` chore(deps) + `b5ecc32` refactor(icons)) and Phase 4 (`62f7abc` fix + `1082d7d` chore(deps) + `e0e4923` format) both proved this pattern on master.

**Phase 5 instantiation:**

```
commit 1: chore(deps): rename babel packages
  files staged (D-11 explicit):
    - package.json                                          (3 line edits: -2 deprecated, +1 canonical)
    - package-lock.json                                     (regenerated)
    - .planning/phases/05-babel-package-renames/05-01-BASELINE.md  (force-added, D-11)
  body cites:
    - D-01 minimum-scope rationale for babel-runtime drop
    - D-02 BABEL-01 derogation (ROADMAP wording stays as-is)
    - pre-swap lint count (the baseline number itself)

commit 2: refactor(eslint): wire @babel/eslint-parser via parserOptions.parser
  files staged (D-11 explicit):
    - .eslintrc.js                                          (1 line insert in parserOptions)
  body cites:
    - 05-01-BASELINE.md path
    - one-line lint delta (e.g., "1879 → 1881 (+2, parser-attributable)")
    - D-04 explanation: parser was implicit espree, now explicit @babel/eslint-parser
```

### Anti-Patterns to Avoid

- **Top-level `parser: '@babel/eslint-parser'` in `.eslintrc.js`** — Overrides `vue-eslint-parser`. Breaks all `.vue` `<template>` linting. D-03 explicitly rejects.
- **`parserOptions.requireConfigFile: false`** — Disables `.babelrc` discovery; would force inline `babelOptions` config; creates dual-source-of-truth between build and lint parsing. D-05 explicitly rejects.
- **Inline `parserOptions.babelOptions: { presets, plugins }`** — Same dual-source-of-truth problem. D-05 explicitly rejects.
- **Single combined commit** (deps + config in one commit) — Defeats D-09's bisect shape. Cannot isolate "install broke something" from "parser swap broke something."
- **`git add -A` or `git add .`** — Stages the untracked `bot/docs/community-guide.md`. D-11 explicitly rejects.
- **`--no-verify`** — Skips pre-commit hooks. D-10 explicitly rejects.
- **Co-Authored-By footer** — User memory `feedback_no_coauthor.md`. D-10 explicitly rejects.
- **Running `npm run lint --fix` in commit 2** — Out of scope for a parser swap. CONTEXT discretion item explicitly prefers NOT.
- **Editing `.babelrc`** — D-05 explicitly rejects (no preset/plugin renames in this phase).
- **Editing `_scripts/webpack.*.config.js`** — Out of scope. `babel-loader` is healthy at its current pin and not deprecated.
- **Installing `@babel/runtime`** — D-01 explicitly rejects. Without `@babel/plugin-transform-runtime` it's dead weight.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Parsing modern JS syntax (ES2018+ rest/spread, optional chaining, nullish coalescing) under ESLint | A custom espree fork with manually-enabled syntax flags | `@babel/eslint-parser` — inherits `.babelrc` presets, automatically supports every Babel-parseable syntax | espree's syntax surface is ECMAScript-spec-only; Babel parser's surface is "spec + every shipped/proposed plugin." Hand-rolling syntax detection in espree fails for class properties, decorators, etc. |
| Verifying lint-vs-build parser parity | A pre-commit hook that re-parses every file with both parsers and diffs | Use `@babel/eslint-parser` with `requireConfigFile: true` (default, D-05) | The whole point of `@babel/eslint-parser` is parser parity; any custom diff approach reinvents the same logic. |
| Bisecting "did the dep bump break something or did the config edit break something?" | A bespoke commit-splitting script | The D-04/D-09 two-commit pattern (proven twice on master in v1.3) | `git bisect` works natively against atomic conventional commits. No tooling needed. |
| Capturing pre/post lint baseline for regression evidence | A custom JSON lint-output diff tool | `npm run lint > baseline.txt` + manual count + per-rule grep into `05-01-BASELINE.md` | The baseline is human-read evidence in a commit body. Tooling overhead is unjustified for two phases in a 14-day milestone. |
| Vue SFC structure parsing | A regex-based `<script>` block extractor | `vue-eslint-parser` (already in devDeps via `eslint-plugin-vue@6.2.2` peer) | SFC parsing has Vue-specific semantics (`<script setup>`, lang attribute handling, nested templates) that regex cannot do correctly. |

**Key insight:** Phase 5 is a 1-line config edit + 3-line `package.json` edit + lockfile regen. The temptation to over-engineer (e.g., custom Babel-version negotiation, pre-flight parser-compatibility scripts, lint-diff tools) should be resisted — the install + edit + verify loop is < 5 minutes, and the bisect shape (D-09) is the safety net.

## Runtime State Inventory

> Required because this phase is a rename/dep-cleanup. Every category answered explicitly per researcher contract.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | None — verified by inspection of `src/` (no DB schemas reference `babel-runtime` or `babel-eslint`; the project's only persistent storage is `electron-store` for user prefs which contains no Babel-related keys, and the ChromaDB/Mem0/n8n-style runtime stores from the rename-checklist do not exist in this project). | None. |
| **Live service config** | None — verified by inspection. Project has no n8n/Datadog/Tailscale/Cloudflare-Tunnel-style external config that would embed Babel package names. The Discord bot in `bot/` has its own `package.json` which CONTEXT.md confirms has no `babel-runtime` or `babel-eslint` references. | None. |
| **OS-registered state** | None — verified by inspection. The Electron app's `electron-builder` packaging in `package.json` `build.files` does NOT reference Babel package names. `installer.nsh` (NSIS) doesn't reference Babel. No Windows Task Scheduler / launchd / systemd registrations for this desktop app. | None. |
| **Secrets and env vars** | None — verified by grep. No `.env` references, no SOPS keys, no CI/CD env-var names contain "babel-runtime" or "babel-eslint". The project's only env vars are `NODE_ENV` and `PRODUCT_NAME` (set by webpack DefinePlugin). | None. |
| **Build artifacts / installed packages** | **YES — `node_modules/` contains stale state that must be regenerated.** Specifically: `node_modules/babel-runtime/` (with nested `core-js@2.6.11` and `regenerator-runtime@0.11.1`) and `node_modules/babel-eslint/` will be deleted when commit 1's `npm install --legacy-peer-deps` runs. The lockfile regeneration handles this automatically; no manual cleanup needed. **However:** if any developer has a stale `node_modules/` from before commit 1 lands, they MUST run `npm install --legacy-peer-deps` to converge — running ESLint with stale `node_modules/babel-eslint/` present but `package.json` referencing `@babel/eslint-parser` would produce a "Cannot find module '@babel/eslint-parser'" parser-load failure. | Document in commit 1's body: "Re-run `npm install --legacy-peer-deps` to converge `node_modules/`." |

**The canonical question:** *After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?* Answer for Phase 5: **only `node_modules/`** — which `npm install` cleans up automatically. No external runtime state, no OS registrations, no databases, no service configs.

## Common Pitfalls

### Pitfall 1: Wiring `parser:` at top level instead of `parserOptions.parser`

**What goes wrong:** Top-level `parser: '@babel/eslint-parser'` overrides `vue-eslint-parser`. `<template>` blocks fail to parse — `@babel/eslint-parser` is a JS parser, not an SFC parser, so it sees `<template>...</template>` as invalid JSX-ish syntax and emits parse errors on every `.vue` file in the repo.

**Why it happens:** `@babel/eslint-parser`'s docs example shows `parser: "@babel/eslint-parser"` at top level (because the docs assume a non-Vue project). Easy to copy-paste literally into a Vue project.

**How to avoid:** D-03 explicit. The wiring goes inside `parserOptions`. Reference `eslint.vuejs.org/user-guide/` "If you want to use custom parsers... you have to use the parserOptions.parser option."

**Warning signs:** First `npm run lint` after the swap reports parse errors on every `.vue` file (typically "Unexpected token <" or "Unexpected token <template").

### Pitfall 2: Forgetting `git add -f` for the gitignored baseline artifact

**What goes wrong:** Commit 1 stages `package.json` + `package-lock.json` cleanly, but `.planning/phases/05-babel-package-renames/05-01-BASELINE.md` doesn't make it into the commit (because `.planning/` is in `.gitignore`). Commit 2's body then references a file that doesn't exist in git history — confusing for archaeology.

**Why it happens:** Standard `git add path/to/file` respects `.gitignore`. Need `git add -f` to override.

**How to avoid:** D-11 explicit. Plan tasks must use `git add -f .planning/phases/05-babel-package-renames/05-01-BASELINE.md`. v1.3 Phases 3 and 4 had this exact pattern (`03-01-BASELINE.md`, `04-01-BASELINE.md`).

**Warning signs:** `git status` after `git add -f` shows the file as staged. `git log --name-only` for commit 1 shows the artifact path. If absent, the force-add was missed.

### Pitfall 3: Accidentally staging `bot/docs/community-guide.md` via `git add -A` or `.`

**What goes wrong:** Commit 1 or commit 2 includes the unrelated untracked file. Phase 5's commits stop being clean atomic dep-rename commits — they pick up an unrelated documentation draft. v1.3 Phases 3 and 4 both successfully avoided this by explicit `git add <path>`. Phase 5 must inherit the rule.

**Why it happens:** Muscle memory. `git add .` is a one-character command; `git add path/to/file path/to/another/file` is verbose.

**How to avoid:** D-11 explicit. Stage paths by name only. Pre-commit verification: `git status` should show ONLY the intended files in the "Changes to be committed" section.

**Warning signs:** `git status` after `git add` shows `bot/docs/community-guide.md` in the staged section. Unstage with `git restore --staged bot/docs/community-guide.md` before committing.

### Pitfall 4: `--legacy-peer-deps` omitted on `npm install`

**What goes wrong:** Plain `npm install` fails with `ERESOLVE` errors due to the pre-existing `@typescript-eslint/eslint-plugin@2.34.0` ↔ `eslint@^7.10.0` peer conflict. The phase appears blocked; the planner attempts to resolve the typescript-eslint conflict in-phase; scope explodes.

**Why it happens:** The `--legacy-peer-deps` flag isn't documented in `package.json` — it's a tribal-knowledge flag.

**How to avoid:** D-12 explicit. Every install command in the plan MUST include `--legacy-peer-deps`. Phase 7 (LINT-03) is where this flag is removed; not Phase 5.

**Warning signs:** `npm install` output includes `npm error code ERESOLVE` or `peer eslint@"^X.0.0" from @typescript-eslint/...`. Re-run with `--legacy-peer-deps`.

### Pitfall 5: Lint-delta misattribution — treating parser-attributable deltas as bugs

**What goes wrong:** Post-swap lint count is +2 to +6 above baseline. Plan-checker or human reviewer flags as a regression; phase blocks on a non-issue.

**Why it happens:** D-04 confirmed `<script>` blocks were going through espree. Switching to `@babel/eslint-parser` changes the parser's scope analysis (see [babel/babel#11995](https://github.com/babel/babel/issues/11995) — `no-unused-vars` and `no-undef` have known small false-positive/false-negative differences vs. espree). Small deltas are EXPECTED, not regressions.

**How to avoid:** D-08 explicit ("band" semantics — ≤1881 NET, deltas in either direction acceptable). Commit 2's body MUST cite the per-rule delta breakdown so reviewers can verify deltas are confined to scope-analysis rules (`no-unused-vars`, `no-undef`) rather than spreading to e.g. `vue/*` or `prettier/*` rules (which would indicate the parser-swap broke something orthogonal).

**Warning signs:** Post-swap delta is large (>±20) or appears in non-scope-analysis rules. Pause, investigate per-rule breakdown.

### Pitfall 6: Stale `node_modules/babel-eslint/` after commit 1 lands

**What goes wrong:** Developer has commit 1 (or even commit 2) on disk but skipped `npm install` between pulling commits. `package.json` no longer lists `babel-eslint`, but `node_modules/babel-eslint/` still exists. Most things work — until something tries to resolve `babel-eslint` (e.g., a stale tooling cache, an editor's ESLint extension caching the old config), and then "Cannot find module 'babel-eslint'" surfaces from an unexpected place.

**Why it happens:** `npm install` is not automatic on `git pull`. Developers who don't notice `package-lock.json` changes won't run it.

**How to avoid:** Commit 1's body MUST instruct: "Run `npm install --legacy-peer-deps` after pulling this commit to converge `node_modules/`."

**Warning signs:** Editor/IDE ESLint integration shows "Cannot find module 'babel-eslint'" or "Cannot find module '@babel/eslint-parser'" after pulling. Solution: `rm -rf node_modules && npm install --legacy-peer-deps` (full nuke + reinstall).

### Pitfall 7: Lint count shifts unexpectedly because `eslint --fix` is a side effect of `npm run lint`

**What goes wrong:** v1.3 Phase 4 already documented this (in `04-01-BASELINE.md` lines 12–14): `npm run lint` runs `eslint --fix`, which can auto-fix some warnings on a working tree. If the baseline is captured AFTER an unintentional `--fix` modified files, the baseline number is artificially low and the post-swap count looks higher than it should.

**Why it happens:** The `lint` script in `package.json` line 135 is literally `eslint --fix --ext .js,.ts,.vue ./`. Running it modifies files.

**How to avoid:** Capture the baseline on a clean working tree (`git status` shows no unstaged modifications). After capturing the count, revert any auto-fixes the linter applied (`git restore .`) so commit 1's diff scope stays at exactly 3 paths (package.json + package-lock.json + 05-01-BASELINE.md). Or, alternative: capture baseline by running `npx eslint --ext .js,.ts,.vue ./` (without `--fix`) — same count, no side effects.

**Warning signs:** `git status` after running the baseline command shows unexpected modifications under `src/`. Revert before committing.

### Pitfall 8: `package-lock.json` peer-dep churn beyond the documented 3-line shape

**What goes wrong:** `npm install --legacy-peer-deps` produces a `package-lock.json` diff that includes more than the expected (a) babel-eslint removal, (b) babel-runtime + core-js@2 + regenerator-runtime@0.11 removal, (c) @babel/eslint-parser + @nicolo-ribaudo/eslint-scope-5-internals install. Extra churn might be: `eslint-visitor-keys` hoisting changes, transitive `semver` deduplication, etc.

**Why it happens:** npm's lockfile-resolution algorithm sometimes opportunistically dedupes transitive deps when the resolve table changes.

**How to avoid:** CONTEXT.md Claude's Discretion item explicitly handles this: "if the lockfile produces non-Babel-adjacent edits (e.g., transitive ESLint plugin version shifts), route to user before landing commit 1." Plan task should compare `package-lock.json` diff to the expected shape and flag deviations to user before commit.

**Warning signs:** `git diff --stat package-lock.json` shows >100 lines changed. The expected diff is ~50–80 lines (a few package entries removed, a few added, transitive entries shifted).

## Code Examples

### Example 1: Final `.eslintrc.js` shape (post-phase, commit 2)

```javascript
// Source: D-03 + D-05; verified against eslint.vuejs.org/user-guide and installed vue-eslint-parser@7.0.0 source
module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: [
    'plugin:vue/recommended',
    'standard',
    'prettier',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    parser: '@babel/eslint-parser',  // NEW — D-03; inherits .babelrc per D-05
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: [
    'vue',
  ],
  rules: {
    // allow async-await
    'generator-star-spacing': 'off',
    semi: ['error', 'always'],
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
  },
};
```

**Diff vs. current `.eslintrc.js`:**

```diff
   parserOptions: {
+    parser: '@babel/eslint-parser',
     ecmaVersion: 2018,
     sourceType: 'module'
   },
```

A single-line insertion at line 16 (between `parserOptions: {` and `ecmaVersion: 2018`). Note: alphabetical ordering inside `parserOptions` would put `ecmaVersion`, `parser`, `sourceType` — but the existing `.eslintrc.js` already orders `ecmaVersion`, `sourceType` non-alphabetically (it follows the docs-example convention of `parser` first, then options). Recommended: insert `parser:` as the FIRST key inside `parserOptions` so the visual hierarchy matches the standard "parser, then its options" pattern.

### Example 2: `package.json` `dependencies` diff (commit 1)

```diff
@@ dependencies @@
         "@fortawesome/vue-fontawesome": "^2.0.10",
-        "babel-runtime": "^6.26.0",
         "buefy": "^0.9.29",
```

### Example 3: `package.json` `devDependencies` diff (commit 1)

```diff
@@ devDependencies @@
         "@babel/core": "^7.9.0",
+        "@babel/eslint-parser": "^7.28.6",
         "@babel/plugin-proposal-class-properties": "^7.8.3",
         ...
         "@typescript-eslint/parser": "^2.25.0",
-        "babel-eslint": "^10.1.0",
         "babel-loader": "^8.1.0",
```

### Example 4: `05-01-BASELINE.md` recommended structure (modeled on Phase 4's `04-01-BASELINE.md`)

```markdown
# Phase 5 — Pre-parser-swap Lint Baseline

**Captured:** {YYYY-MM-DD HH:MM UTC}
**Parent commit (pre-swap HEAD):** {short SHA — capture before staging commit 1}
**Devtool versions at capture:** eslint@7.32.0, babel-eslint@10.1.0 (installed but UNWIRED — see D-04), parser_actually_used: espree@6.2.1 (vue-eslint-parser delegated to espree per D-04)
**File count in eslint glob:** {count via `npx eslint --ext .js,.ts,.vue ./ --no-fix --format json | jq '. | length'`}
**Tooling state:** unchanged from pre-phase; no `npm install` performed yet.

## Baseline metrics

- **Pre-swap lint count (warnings + errors):** {N}
  - Captured via: `npx eslint --ext .js,.ts,.vue ./ --no-fix 2>&1 | grep -cE '^\s+[0-9]+:[0-9]+\s+(warning|error)'`
  - This count is the denominator for D-08 acceptance: post-swap NET count must be ≤ 1881 (v1.3 baseline ceiling), with ±direction tolerance.
  - Captured WITHOUT `--fix` to avoid the side-effect documented in v1.3 Phase 4 Pitfall 7.

- **Per-rule frequency table (top 20 rules by count):**

  | Rule | Count |
  |------|-------|
  | (e.g., `no-unused-vars`) | {N} |
  | ... | ... |

  Captured via: `npx eslint --ext .js,.ts,.vue ./ --no-fix --format json 2>/dev/null | jq -r '[.[] | .messages[] | .ruleId] | group_by(.) | map({rule: .[0], count: length}) | sort_by(.count) | reverse | .[0:20] | .[] | "\(.rule)\t\(.count)"'`

- **Per-file hotspots (files with ≥50 warnings+errors):**

  | File | Count |
  |------|-------|
  | (e.g., `src/main/index.js`) | {N} |
  | ... | ... |

  Captured via: `npx eslint --ext .js,.ts,.vue ./ --no-fix --format json 2>/dev/null | jq -r '.[] | select((.messages | length) >= 50) | "\(.filePath)\t\(.messages | length)"'`

## D-08 acceptance denominator

- Post-swap lint count must satisfy: `post_count ≤ 1881` (v1.3 baseline ceiling, NET).
- Parser-attributable delta direction is acceptable per D-08 ("band" semantics).

## Parser-swap functional verification (post-commit-2 evidence)

- `.vue` SFC `<template>` blocks STILL lint via `vue-eslint-parser` (delegation chain intact). Verified by: `npx eslint --ext .vue src/renderer/views/Home.vue --no-fix` exits without parse errors.
- `.vue` SFC `<script>` blocks now go through `@babel/eslint-parser`. Verified by: same command — script-block lint output is present.
- `.js` files now go through `@babel/eslint-parser`. Verified by: `npx eslint src/main/index.js --no-fix` exits without parse errors.
- No `.ts` files exist in `src/` or `_scripts/`; the `--ext .ts` flag matches zero files (Phase 5 RESEARCH §Architectural Responsibility Map).
```

**Recommended tweaks vs. Phase 4's baseline structure:** Add the per-rule frequency table and per-file hotspot list (Phase 4's baseline only captured the global count + `prettier --check` failing-file count). The per-rule breakdown is load-bearing for Pitfall 5 — it lets the reviewer confirm the post-swap delta is concentrated in scope-analysis rules (`no-unused-vars`, `no-undef`) rather than spread across orthogonal rule categories.

### Example 5: Commit 1 message template

```
chore(deps): rename babel packages

Drop deprecated babel-runtime 6.26.0 (zero import sites; .babelrc does
not list @babel/plugin-transform-runtime — installing @babel/runtime
would be identical dead weight per D-01).

Replace babel-eslint 10.1.0 with @babel/eslint-parser ^7.28.6 (latest
stable 7.x; eslint peer ^7.5.0 || ^8.0.0 || ^9.0.0 accepts project's
eslint@7.32.0).

BABEL-01: minimum-scope interpretation (D-02). Zero deprecated-name
references remain after removal.
BABEL-02: parser swap config edit lands in next commit (D-09 bisect
shape).

Pre-swap lint baseline captured in
.planning/phases/05-babel-package-renames/05-01-BASELINE.md:
- Pre-swap count (warnings + errors): {N}
- Captured via espree (vue-eslint-parser default per D-04)

Re-run `npm install --legacy-peer-deps` after pulling this commit to
converge node_modules.

Refs: D-01, D-02, D-09, D-11, D-12 (CONTEXT.md)
```

### Example 6: Commit 2 message template

```
refactor(eslint): wire @babel/eslint-parser via parserOptions.parser

D-03: parserOptions.parser (NOT top-level parser:) so vue-eslint-parser
from plugin:vue/recommended remains the SFC orchestrator and continues
to delegate <script> blocks to the inner parser.

D-04: prior to this commit, babel-eslint was in devDependencies but not
wired in .eslintrc.js — vue-eslint-parser was delegating <script>
parsing to espree (verified at vue-eslint-parser/index.js:581-585).
This commit makes the parser explicit for the first time.

D-05: inherits .babelrc presets/plugins (no requireConfigFile flag, no
inline babelOptions). Single source of truth between build and lint
parsing.

Lint delta: {pre} → {post} ({+/-N}, parser-attributable to
@babel/eslint-parser scope analysis differing from espree on
no-unused-vars/no-undef — see 05-01-BASELINE.md per-rule breakdown).

Within v1.3 baseline band per D-08 (≤1881 NET).

Refs: D-03, D-04, D-05, D-08, 05-01-BASELINE.md
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `babel-runtime` (6.x) for runtime helpers | `@babel/runtime` + `@babel/plugin-transform-runtime` (7.x scoped) | 2018 (Babel 7 release) | This project uses NEITHER (D-01) — so the rename is satisfied by removal, not by adopting the canonical name. |
| `babel-eslint` (10.x) standalone parser | `@babel/eslint-parser` (7.x, monorepo'd) | 2020-07 (announcement: babeljs.io/blog/2020/07/13/the-state-of-babel-eslint) | Brings parser parity with build-time Babel. Requires `@babel/core` peer (already present at 7.29.0). |
| `parser:` at top level of `.eslintrc.js` | `parserOptions.parser:` when a higher-priority orchestrator parser exists (e.g., `vue-eslint-parser`, `@typescript-eslint/parser` for `.vue` projects, `jsonc-eslint-parser` for `.json`) | Vue-2 + babel pattern documented since vue-eslint-parser 5.x (2019) | This project never wired the top-level `parser:` (D-04) — Phase 5 is the first time the parser is made explicit. |
| `eslintrc` config format | Flat config (`eslint.config.js`) | ESLint 9 default (2024-04) | Phase 6 problem. Phase 5 stays on `.eslintrc.js`. |

**Deprecated/outdated:**
- `babel-runtime`: deprecated upstream since Babel 7 release (2018); npm view shows no explicit "DEPRECATED" tag (it just stopped receiving updates). Last published 2017.
- `babel-eslint`: explicitly deprecated upstream — npm view shows "DEPRECATED!! - babel-eslint is now @babel/eslint-parser. This package will no longer receive updates." Last published 2020-07.
- `core-js@2.6.11` (transitive of babel-runtime): emits npm install-time warning "core-js@2 has been deprecated. Please consider migrating to core-js@3." Removing babel-runtime cleans this warning.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The lint delta from swapping espree → `@babel/eslint-parser` will be small (±0 to ±10), confined to scope-analysis rules (`no-unused-vars`, `no-undef`). | Summary (point 3), Pitfalls 5 | If a larger delta surfaces (>±20 or spread across orthogonal rules like `vue/*` or `prettier/*`), the parser swap may have a non-trivial behavioral impact. Mitigation: D-08's "band" semantics + Pitfall 5's per-rule breakdown evidence in commit 2's body lets the reviewer adjudicate. The 05-01-BASELINE.md per-rule table is the diagnostic tool. | [ASSUMED] — based on documented `@babel/eslint-parser` behavior in [babel/babel#11995](https://github.com/babel/babel/issues/11995) and the codebase audit (no class fields, no `.ts` files, no decorators, only ES2018 rest/spread which espree already supports). Empirical verification happens at install time. |
| A2 | `npm install --legacy-peer-deps` will produce a minimum-churn `package-lock.json` diff (~50–80 lines: 2 top-level removals, 1 install, ~5 transitive removals, 1 transitive add). | Standard Stack, Pitfall 8 | If npm opportunistically dedupes more transitive deps (e.g., a different `semver` minor version becomes top-level), the diff could exceed 100 lines. Routing to user per CONTEXT.md Claude's Discretion item is the mitigation. | [ASSUMED] — based on transitive dep analysis of installed `node_modules/` (every `babel-eslint` transitive dep is already-present at the project's `@babel/core@7.29.0` version; only `@nicolo-ribaudo/eslint-scope-5-internals` is genuinely new, 1.7 KB). Actual lockfile diff is observable post-install. |
| A3 | `vue-eslint-parser@7.0.0` (the actually-installed version, despite `^7.0.0` in package.json) correctly delegates `<script>` blocks to `parserOptions.parser` when set as a string. | Architecture Patterns Pattern 1 | If 7.0.0 has a delegation bug fixed in a later 7.x patch, post-swap `<script>` linting could fail. Mitigation: `npm install --legacy-peer-deps` will resolve `vue-eslint-parser` to the latest 7.x within the `^7.0.0` caret (today: 7.11.0). | [VERIFIED: read `node_modules/vue-eslint-parser/index.js:581-585` source — delegation logic is `typeof parserOptions.parser === "string" ? require(parserOptions.parser) : require("espree")`. Behavior is correct in installed version.] |
| A4 | The `eslint --ext .ts` flag in `package.json` script line 135 matches zero files, so `@babel/preset-typescript` parsing is moot in practice. | Architectural Responsibility Map, Summary (point 3) | If a `.ts` file is added in this phase or between baseline capture and commit 2, the parsing surface widens unexpectedly. Mitigation: explicit grep in plan task verifies "no `.ts` files added during phase". | [VERIFIED: `find src/ _scripts/ -name '*.ts' -not -path '*/node_modules/*'` returns zero matches as of 2026-04-21.] |
| A5 | The `@babel/eslint-parser@^7.28.6` caret will resolve to 7.28.6 itself today (latest stable). The peer range across all 7.x minors is uniform (verified for 7.24.5, 7.25.9, 7.27.5, 7.28.4, 7.28.6). | Standard Stack | If npm's resolution unexpectedly picks an older 7.x with a different peer range, ESLint 7 compat could break. Low risk — npm prefers latest within caret. | [VERIFIED: `npm view @babel/eslint-parser@<version> peerDependencies` for 4 versions across the 7.x line — all declare identical `eslint: "^7.5.0 \|\| ^8.0.0 \|\| ^9.0.0"` and `@babel/core: "^7.11.0"`.] |
| A6 | Removing `babel-runtime` removes `core-js@2.6.11` and `regenerator-runtime@0.11.1` from `node_modules/` entirely (no other consumers). | Summary (point 2), Runtime State Inventory | If a transitive consumer of `core-js@2` or `regenerator-runtime@0.11` exists that the audit missed, removal would surface as a runtime "Cannot find module" failure. | [VERIFIED: `find node_modules -name 'core-js' -type d` returns only `node_modules/babel-runtime/core-js` and `node_modules/babel-runtime/node_modules/core-js` — both nested under babel-runtime, no other consumers. Same for `regenerator-runtime`.] |
| A7 | The post-swap `npm run pack:renderer` build will succeed (babel-loader still works after babel-runtime removal). | Validation Architecture (Bundle/build validation) | If anything in the renderer bundle was implicitly pulling babel-runtime helpers via webpack auto-resolution, the build would fail. Low risk — D-01 grep confirmed zero import sites; without `@babel/plugin-transform-runtime` in `.babelrc`, the Babel pipeline does not inject runtime helper imports. | [VERIFIED via grep: zero `babel-runtime` or `babel/runtime` imports in `src/` or `_scripts/`. Webpack does not auto-resolve runtime helpers without the plugin.] |
| A8 | The currently-existing `bot/docs/community-guide.md` untracked file remains untracked and unrelated to Phase 5. | Pitfall 3 | If the file is accidentally relevant to this phase (it isn't — it's bot documentation, out of scope per CONTEXT.md), excluding it would be wrong. | [VERIFIED: `bot/` workspace is OUT OF SCOPE per CONTEXT.md `<deferred>`. The file is a bot-deployment doc draft.] |

**Risk summary:** Of 8 assumptions, A3/A4/A5/A6/A7/A8 are VERIFIED (filesystem inspection or registry query). A1/A2 are ASSUMED — both with empirical verification points (lint count + lockfile diff observable at install time, before commits land). No assumption is both ASSUMED AND has no recovery path.

## Open Questions (RESOLVED)

1. **Does `eslint-config-standard@14.1.1` have any rules that interact differently under `@babel/eslint-parser` vs. espree?**
   - What we know: `eslint-config-standard@14.1.1` is the actual installed version. Its rule set is largely AST-shape-independent (style rules: indentation, quotes, semicolons, etc.). The few scope-analysis rules it inherits (`no-unused-vars`, `no-undef`) are precisely the rules where `@babel/eslint-parser` is documented to differ.
   - What's unclear: Whether any vendor-specific `eslint-plugin-standard@4.0.1` rules surface unexpectedly under the new parser.
   - RESOLVED: Treat any non-standard-rule delta as a Pitfall 5 misattribution — the per-rule breakdown in `05-01-BASELINE.md` is the diagnostic. Plans honor this via the commit-2 body delta-citation step (plan 02 task 2 step 4 + task 3 step 1).

2. **Will `eslint-plugin-prettier@5.2.1` behave identically under `@babel/eslint-parser`?**
   - What we know: `eslint-plugin-prettier@5.2.1` is a wrapper around Prettier itself. Prettier has its own parser and does NOT use ESLint's parser AST. So `eslint-plugin-prettier`'s output should be parser-independent.
   - What's unclear: Whether `eslint-plugin-prettier`'s violation reporting (line/column metadata) shifts when wrapped in a different ESLint parser's location output.
   - RESOLVED: In the lint-delta noise floor (likely zero impact). Plan 02 task 2 step 4 treats any new `prettier/prettier` violations as investigable-but-non-blocking (consistent with D-08 band semantics).

3. **Should the plan capture the PRE-`npm install` package-lock.json shape as a sanity diff target?**
   - What we know: Phase 4's plan didn't do this. The lockfile diff was observed live at install time.
   - What's unclear: Whether a "before" snapshot of `package-lock.json` (perhaps in `05-01-BASELINE.md` as `wc -l package-lock.json` + first-10-line hash) would help adjudicate Pitfall 8 churn.
   - RESOLVED: NOT needed. `git diff package-lock.json` after `npm install` already shows the churn shape; pre-snapshot would be redundant. Plan 01 task 2 step 6 routes unexpected churn to user pre-commit (Pitfall 8 gate).

4. **Is there a risk that running `npm install --legacy-peer-deps` regenerates `package-lock.json` with a NEWER `vue-eslint-parser` (e.g., 7.11.0 instead of currently-installed 7.0.0) that has subtly different `parserOptions.parser` delegation behavior?**
   - What we know: Currently installed is `7.0.0`; `^7.0.0` caret would resolve to latest 7.x (7.11.0 today). The delegation logic (verified A3) is in 7.0.0; whether it changed in 7.x patches is unverified.
   - What's unclear: Whether vue-eslint-parser 7.11.0 has any breaking change relative to 7.0.0 in `parserOptions.parser` handling.
   - RESOLVED: vue-eslint-parser is in maintenance mode (latest is 10.x for Vue 3). 7.x patches are bugfixes only. Treat as low risk; if `<script>` parse errors appear post-swap, pin `vue-eslint-parser` to the previously-installed exact version (7.0.0) as a recovery move. Plan 02 task 2 step 2 (lint all 4 Vue views as Pitfall 1 canary) surfaces any regression before commit 2 lands.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | All npm operations | ✓ | (system Node — project doesn't pin via `engines`) | — |
| npm | `npm install`, `npm view`, `npm ls` | ✓ | Same as Node | — |
| `git` | All commit operations (D-09, D-10, D-11) | ✓ | system git | — |
| Internet access to `registry.npmjs.org` | Resolving `@babel/eslint-parser@^7.28.6` and `package-lock.json` regen | ✓ | (verified by `npm view @babel/eslint-parser` succeeding during research) | If registry unreachable: phase blocked. No offline mirror available. |
| `eslint` 7.x runtime | `npm run lint` validation | ✓ | 7.32.0 (installed) | — |
| `@babel/core` 7.x runtime | `@babel/eslint-parser` peer requirement | ✓ | 7.29.0 (installed; satisfies `^7.11.0` peer) | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

**Note on Windows-specific concerns:** Project is Windows-only (CONTEXT.md `## Constraints`). All bash commands in the plan should use forward slashes for paths and avoid `find -exec` patterns that hit MSYS path-translation quirks (the `command -v` check above already navigated this). `git` line-ending normalization (`core.autocrlf = true`) is established (Phase 4 D-04 carryover) — no `.gitattributes` change in this phase.

## Validation Architecture

> Nyquist validation enabled by default (`.planning/config.json` absent — treat as enabled per researcher contract).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 (main repo, via `npm run jest` / `npm test`) |
| Config file | `package.json` `"jest"` block (root); `bot/package.json` (out of scope) |
| Quick run command | `npm test` (uses `--passWithNoTests`) |
| Full suite command | `npm run jest:coverage` |
| Linter check | `npm run lint` (note: runs `eslint --fix` as side effect; for baseline capture use `npx eslint --ext .js,.ts,.vue ./ --no-fix`) |
| Renderer build check | `npm run pack:renderer` |
| Main build check | `npm run pack:main` |
| Combined build | `npm run pack` (parallel main + renderer) |
| Estimated runtime | ~30s lint (no fix) + ~5s jest + ~60s pack:renderer + ~30s pack:main → ~2 min full automated gate |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BABEL-01 | `babel-runtime` removed from `package.json` `dependencies` | static | `! grep -q '"babel-runtime"' package.json` | ✅ existing |
| BABEL-01 | `babel-runtime` removed from `node_modules/` after `npm install` | static | `! test -d node_modules/babel-runtime` | ✅ existing (verified after install) |
| BABEL-01 | Zero `babel-runtime` import sites remain | static | `! grep -rn "babel-runtime\|babel/runtime" src/ _scripts/` returns 0 lines | ✅ existing (verified pre-phase) |
| BABEL-01 | `core-js@2` and `regenerator-runtime@0.11` no longer in `node_modules/` (transitive cleanup) | static | `! find node_modules -path '*core-js/package.json' -exec grep -l '"version": "2\.' {} +` returns empty | ✅ |
| BABEL-02 | `babel-eslint` removed from `package.json` `devDependencies` | static | `! grep -q '"babel-eslint"' package.json` | ✅ existing |
| BABEL-02 | `@babel/eslint-parser` present in `package.json` `devDependencies` at `^7.28.6` (or compatible 7.x caret) | static | `grep -cE '"@babel/eslint-parser":\s*"\^7\.' package.json` returns 1 | ✅ |
| BABEL-02 | `.eslintrc.js` `parserOptions.parser` is `'@babel/eslint-parser'` | static | `grep -cE "parser:\s*'@babel/eslint-parser'" .eslintrc.js` returns 1 | ✅ |
| BABEL-02 | `.eslintrc.js` does NOT have a top-level `parser:` field | static | `! grep -E "^\s*parser:" .eslintrc.js \| grep -v "parserOptions\|^\s*//"` returns no matches | ✅ |
| BABEL-02 | `npm install --legacy-peer-deps` succeeds | smoke | `npm install --legacy-peer-deps 2>&1 \| tee /tmp/npm-install.log; ! grep -E "(ERESOLVE\|EBADENGINE)" /tmp/npm-install.log` | ✅ |
| BABEL-02 | `npm run lint` post-swap succeeds (parser loads, no parse errors) | static | `npx eslint --ext .js,.ts,.vue ./ --no-fix 2>&1 \| grep -cE "(Parsing error\|Cannot find module)"` returns 0 | ✅ |
| BABEL-02 | Post-swap lint count ≤ 1881 (D-08 band) | static | `count=$(npx eslint --ext .js,.ts,.vue ./ --no-fix 2>&1 \| grep -cE '^\s+[0-9]+:[0-9]+\s+(warning\|error)'); [ "$count" -le 1881 ]` | ✅ |
| BABEL-02 | `.vue` `<template>` blocks STILL parse (delegation chain intact) | static | `npx eslint --ext .vue src/renderer/views/Home.vue src/renderer/components/Settings.vue --no-fix 2>&1 \| grep -cE "(Parsing error.*template\|Unexpected token <)"` returns 0 | ✅ |
| BABEL-02 | `.vue` `<script>` blocks now go through `@babel/eslint-parser` (verified by parsing class-syntax-using file or rest/spread) | static | `npx eslint src/main/iracing-sdk.js --no-fix 2>&1` exits 0 (or with only style warnings, no parse errors) | ✅ |
| BABEL-02 | `npm test` 256/256 passes (no Babel-runtime helper regressions) | unit | `npm test` exits 0; `npm test 2>&1 \| grep -E "Tests:.*256 passed"` returns 1 line | ✅ |
| BABEL-02 | `npm run pack:renderer` compiles cleanly (babel-loader still works post-babel-runtime removal) | smoke | `npm run pack:renderer 2>&1 \| grep -cE "(ERROR\|Module not found.*babel-runtime)"` returns 0 | ✅ |
| BABEL-02 | `npm run pack:main` compiles cleanly (babel-loader main bundle) | smoke | `npm run pack:main 2>&1 \| grep -cE "(ERROR\|Module not found.*babel-runtime)"` returns 0 | ✅ |
| BABEL-01 + BABEL-02 (combined) | ROADMAP SC1 grep: only renamed `@babel/eslint-parser` references remain | static | `grep -rn "babel-runtime\|babel-eslint" package.json src/ _scripts/ 2>&1 \| grep -vE "@babel/eslint-parser" \| wc -l` returns 0 | ✅ |
| BABEL-01 + BABEL-02 (commit shape D-09) | Two commits land: `chore(deps):` + content commit | static | `git log --oneline HEAD~2..HEAD \| grep -cE "^[a-f0-9]+ (chore\(deps\):\|refactor\(eslint\):)"` returns 2 | ✅ |
| BABEL-01 + BABEL-02 (artifact D-07) | `05-01-BASELINE.md` exists in commit 1 | static | `git show --name-only HEAD~1 \| grep -q "05-01-BASELINE.md"` (commit 1 SHA dependent) | ✅ |
| BABEL-01 + BABEL-02 (artifact D-07) | `05-01-BASELINE.md` contains pre-swap count | static | `grep -cE "Pre-swap lint count" .planning/phases/05-babel-package-renames/05-01-BASELINE.md` returns ≥ 1 | ✅ |
| BABEL-01 + BABEL-02 (no Co-Authored-By per D-10) | Neither commit has Co-Authored-By footer | static | `git log --format="%B" HEAD~2..HEAD \| grep -ci "Co-Authored-By"` returns 0 | ✅ |
| BABEL-01 + BABEL-02 (clean staging per D-11) | `bot/docs/community-guide.md` NOT in either commit | static | `git log --name-only HEAD~2..HEAD \| grep -c "bot/docs/community-guide.md"` returns 0 | ✅ |

### Sampling Rate

- **Per task commit (within commit 1 or commit 2):** quick gate — `npx eslint --ext .js,.ts,.vue ./ --no-fix` + `npm test` (~35s combined). Commit-1 task does not yet run lint via the new parser (parser swap is commit 2); commit-1 lint runs against the existing config (still espree-effective via D-04). Commit-2 task runs lint via the new `@babel/eslint-parser` for the first time.
- **Per wave merge (only one wave in this phase — both commits are in the same wave per D-09):** full sequence — `npm install --legacy-peer-deps` (post-package.json edit) → lint (no-fix) → test → pack:main + pack:renderer (~3 minutes).
- **Phase gate (before `/gsd-verify-work`):** full automated gate green + lint count ≤1881 confirmed via per-rule baseline diff + 05-01-BASELINE.md committed and citable.

### Wave 0 Gaps

- [ ] `.planning/phases/05-babel-package-renames/05-01-BASELINE.md` — does NOT yet exist; created by the first task in commit 1 (capture pre-swap baseline before staging package.json edits).
- [ ] No new test files needed — Phase 5 is a config swap; existing 256 jest tests are the regression net. Their continued green status is the test-suite acceptance signal.
- [ ] No framework install needed — Jest, ESLint, all Babel scoped packages are already installed. The phase only adds `@babel/eslint-parser`.
- [ ] `.gitignore` is already in place excluding `.planning/` — `git add -f` per D-11 handles the baseline artifact.

*Existing test infrastructure covers all phase requirements; only the baseline-artifact creation is a Wave-0 prerequisite.*

## Security Domain

> `security_enforcement` config absent — treat as enabled per researcher contract. ASVS analysis applied to phase scope.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | NO | Phase touches no auth code or auth deps. |
| V3 Session Management | NO | Phase touches no session code. |
| V4 Access Control | NO | Phase touches no access-control code. |
| V5 Input Validation | NO | Phase touches no user-input handling. The parser change is at the dev-time lint layer, not runtime input. |
| V6 Cryptography | NO | Phase touches no crypto code or crypto deps. |
| V14 Configuration | YES (marginally) | The npm install regen + `package-lock.json` change is a software supply-chain touch point. Standard control: integrity verification via `package-lock.json` checked into git, exactly as done by D-09 commit 1. No additional control needed. |

### Known Threat Patterns for npm dependency changes

| Pattern | STRIDE | Standard Mitigation | Applies to Phase 5? |
|---------|--------|---------------------|---------------------|
| Typosquatting / dependency confusion | Spoofing | Verify package source against official registry; pin exact major.minor.patch where critical | YES — but mitigated: `@babel/eslint-parser` is a well-known, npm-organization-scoped package (`@babel/`). Typosquatting risk for a `@babel/*` scoped package is near-zero (npm reserves the scope). |
| Malicious package update (publish-time compromise) | Tampering | `package-lock.json` integrity SHA-512 hashes checked at install time | YES — handled automatically by npm. The `package-lock.json` regenerated by commit 1 will include the new package's integrity hash; subsequent `npm install` invocations verify against this hash. |
| Transitive dep version drift introducing CVE | Information disclosure / Denial of service | npm audit, dependabot | YES — verified: `@babel/eslint-parser@7.28.6` has 3 transitive deps (`semver@^6`, `eslint-visitor-keys@^2.1.0`, `@nicolo-ribaudo/eslint-scope-5-internals@5.1.1-v1`); none have known CVEs. Removing `babel-runtime` REMOVES `core-js@2.6.11` and `regenerator-runtime@0.11.1` — both unmaintained, both known to emit npm install-time deprecation warnings. **Net security impact of the phase: positive** (cleaner supply chain, fewer deprecated transitive deps). |
| Lockfile poisoning (CI-only) | Tampering | Review lockfile diffs in code review | YES — Pitfall 8 already addresses this: if lockfile churn exceeds expected shape, route to user before commit. |

**Net security posture impact:** **Positive.** Removing `babel-runtime` retires the deprecated `core-js@2` and `regenerator-runtime@0.11` transitive deps. The new `@babel/eslint-parser` is a maintained, scope-protected, official Babel package. No new attack surface introduced.

## Sources

### Primary (HIGH confidence)
- npm registry: `npm view @babel/eslint-parser version` → 7.28.6 (verified 2026-04-21)
- npm registry: `npm view @babel/eslint-parser@<version> peerDependencies` for versions 7.24.5, 7.25.9, 7.27.5, 7.28.4, 7.28.6 → all uniformly declare `eslint: "^7.5.0 \|\| ^8.0.0 \|\| ^9.0.0"` and `@babel/core: "^7.11.0"` (verified 2026-04-21)
- npm registry: `npm view @babel/eslint-parser@7.28.6 dependencies` → `{ semver: "^6.3.1", eslint-visitor-keys: "^2.1.0", "@nicolo-ribaudo/eslint-scope-5-internals": "5.1.1-v1" }` (verified 2026-04-21)
- npm registry: `npm view babel-eslint@10.1.0` → DEPRECATED tag literal "DEPRECATED!! - babel-eslint is now @babel/eslint-parser. This package will no longer receive updates." (verified 2026-04-21)
- npm registry: `npm view @nicolo-ribaudo/eslint-scope-5-internals` → 1.7 KB unpacked, single dep `eslint-scope: 5.1.1` (verified 2026-04-21)
- Installed source: `node_modules/vue-eslint-parser@7.0.0/index.js:581-585` — delegation logic confirmed (`typeof parserOptions.parser === "string" ? require(parserOptions.parser) : require("espree")`)
- Installed source: `node_modules/eslint-plugin-vue@6.2.2/lib/configs/base.js` — confirms top-level `parser: require.resolve('vue-eslint-parser')` is set by the `plugin:vue/base` extends chain reachable from `plugin:vue/recommended` via `recommended → strongly-recommended → essential → base`
- Installed source: `node_modules/eslint@7.32.0/package.json` — confirms ESLint 7.32.0 satisfies `@babel/eslint-parser`'s `eslint: "^7.5.0"` peer
- Installed source: `node_modules/@babel/core@7.29.0/package.json` — confirms `@babel/core@7.29.0` satisfies `@babel/eslint-parser`'s `@babel/core: "^7.11.0"` peer
- Codebase grep: `grep -rn "babel-runtime\|babel-eslint" package.json src/ _scripts/` → only the two `package.json` lines (51, 78); zero `src/` or `_scripts/` matches (verified 2026-04-21 — confirms D-01)
- Codebase grep: `find src/ _scripts/ -name '*.ts' -not -path 'node_modules/*'` → empty (verified 2026-04-21 — confirms zero `.ts` files in scope)
- File inspection: `.eslintrc.js` lines 15–18 confirm no top-level `parser:` field (D-04 verified)
- File inspection: `.babelrc` confirms presets `[@babel/env, @babel/typescript]` and plugins `[@babel/proposal-class-properties, @babel/proposal-object-rest-spread]` — no `@babel/plugin-transform-runtime` (D-01 verified)
- File inspection: `node_modules/babel-runtime/node_modules/{core-js,regenerator-runtime}/package.json` confirms `core-js@2.6.11` and `regenerator-runtime@0.11.1` are nested under `babel-runtime/` only (no other consumers)
- Babel official docs (CITED: babeljs.io/docs/babel-eslint-parser via WebFetch 2026-04-21) — confirmed `requireConfigFile`, `babelOptions`, `sourceType`, `ecmaFeatures.globalReturn`, `allowImportExportEverywhere` options + behavior

### Secondary (MEDIUM confidence)
- eslint-plugin-vue user guide (CITED: eslint.vuejs.org/user-guide/) — "If you want to use custom parsers such as @babel/eslint-parser or @typescript-eslint/parser, you have to use the parserOptions.parser option instead of the parser option" — confirms D-03 idiom
- vue-eslint-parser README (CITED: github.com/vuejs/vue-eslint-parser README §parserOptions.parser) — "You can use parserOptions.parser property to specify a custom parser to parse `<script>` tags" + "If the parserOptions.parser is false, the vue-eslint-parser skips parsing `<script>` tags completely" — confirms delegation semantics
- The State of babel-eslint blog post (CITED: babeljs.io/blog/2020/07/13/the-state-of-babel-eslint) — confirms 2020-07 deprecation of `babel-eslint` and the move to `@babel/eslint-parser` in the babel/babel monorepo
- Known GitHub issue (CITED: github.com/babel/babel/issues/11995) — `@babel/eslint-parser` `no-unused-vars` and `no-undef` known false-positive/false-negative differences vs. espree, justifying Pitfall 5's "small lint delta is expected"
- v1.3 Phase 4 archived RESEARCH.md / `04-01-BASELINE.md` (file inspection) — baseline artifact format precedent (file naming, body shape)
- v1.3 Phase 3 commit pair `ae2627b` + `b5ecc32` and Phase 4 commits `62f7abc` + `1082d7d` + `e0e4923` (git log) — D-04/D-09 two-commit bisect shape precedent

### Tertiary (LOW confidence — unverified, non-load-bearing)
- WebSearch result claiming "v11 changes some AST node types to match espree v6" — does NOT apply to `@babel/eslint-parser@7.x`; the v11 reference is to legacy `babel-eslint@11.0.0-beta` which never shipped stable. Discarded.

## Project Constraints (from CLAUDE.md)

No project-level `CLAUDE.md` exists at the repo root (`./CLAUDE.md` not found). Project conventions are derived from `.planning/PROJECT.md`, `.planning/STATE.md`, and CONTEXT.md `<canonical_refs>`. The user's auto-memory rule "No co-author in commits" (referenced in CONTEXT.md D-10) IS in effect and is treated with the same authority as a CLAUDE.md directive.

## Metadata

**Confidence breakdown:**
- Standard stack version pin (`@babel/eslint-parser@^7.28.6`): HIGH — verified via direct npm registry queries for version, peerDependencies, and dependencies, cross-referenced across 4 different 7.x minor versions to confirm peer-range stability.
- Architecture (Vue SFC delegation chain): HIGH — verified by reading installed `vue-eslint-parser/index.js` source AND `eslint-plugin-vue/lib/configs/base.js` source. Not relying on docs alone.
- Pitfalls (esp. Pitfall 5 lint-delta): MEDIUM-HIGH — based on documented `@babel/eslint-parser` known behavior + codebase audit (no class fields, no `.ts` files, no decorators). Empirical verification at install time confirms or refutes A1.
- Lockfile churn estimate (A2): MEDIUM — based on transitive dep analysis of installed `node_modules/`. Empirically verifiable post-install. CONTEXT.md Claude's Discretion item handles divergence.
- Validation Architecture: HIGH — every command is runnable against the existing test/lint/pack infrastructure; no new tooling needed.
- Security Domain: HIGH — phase scope is dev-time tooling only; no runtime security surface affected.

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days — `@babel/eslint-parser` 7.x line is stable; the only invalidation risk is npm registry-side metadata changes, which would surface immediately at `npm install` time)

## RESEARCH COMPLETE
