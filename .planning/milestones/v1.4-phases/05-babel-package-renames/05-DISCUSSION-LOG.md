# Phase 5: Babel Package Renames - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 05-babel-package-renames
**Areas discussed:** babel-runtime treatment, babel-eslint + parser wiring, @babel/eslint-parser config flags, Lint-baseline handling

---

## babel-runtime treatment

**Question 1:** How should we handle `babel-runtime` given there are zero imports and no `@babel/plugin-transform-runtime` in `.babelrc`?

| Option | Description | Selected |
|--------|-------------|----------|
| Drop it entirely (Recommended) | Remove `babel-runtime` from `dependencies`. Zero source imports; no Babel plugin references it; genuinely dead. BABEL-01 grep satisfied by absence. | ✓ |
| Strict rename to @babel/runtime | Install `@babel/runtime`, remove `babel-runtime`. Literal rename per BABEL-01 wording, but new package equally unused (still dead weight). | |
| Rename + add @babel/plugin-transform-runtime | Install both packages, wire plugin in `.babelrc`. Idiomatic, but changes build output and expands scope. | |

**User's choice:** Drop it entirely.

**Question 2:** Dropping `babel-runtime` means Phase 5 SC1 grep is satisfied by absence. How to record the interpretation?

| Option | Description | Selected |
|--------|-------------|----------|
| Record as deliberate minimum-scope (Recommended) | Capture in CONTEXT.md that BABEL-01 is interpreted as removal. Follows v1.3 Phase 4's minimum-scope-derogation philosophy. | ✓ |
| Also update ROADMAP SC1 wording | Adjust SC1 to read "grep returns zero babel-runtime/babel-eslint matches; @babel/eslint-parser is referenced in .eslintrc.js". | |
| Reconsider — go back to literal rename | Keep strict rename for byte-for-byte SC fidelity, accept dead-weight tradeoff. | |

**User's choice:** Record as deliberate minimum-scope (Recommended).

**Notes:** Decision locked as D-01 (drop `babel-runtime`) + D-02 (record as minimum-scope derogation per v1.3 Phase 4 pattern; ROADMAP wording stays as-is).

---

## babel-eslint + parser wiring

**Question 1:** `babel-eslint` is in devDeps but `.eslintrc.js` has no `parser` field — how should BABEL-02 be resolved?

| Option | Description | Selected |
|--------|-------------|----------|
| Wire as parserOptions.parser (Recommended) | Install `@babel/eslint-parser`, remove `babel-eslint`, add `parserOptions.parser: '@babel/eslint-parser'` in `.eslintrc.js`. Correct nesting under `plugin:vue/recommended`'s `vue-eslint-parser`. | ✓ |
| Set as top-level parser | Top-level `parser:` in `.eslintrc.js`. Would override vue-eslint-parser and break SFC `<template>` linting. | |
| Drop babel-eslint without wiring a replacement | Remove `babel-eslint`, leave default espree parser in place. Deviates from BABEL-02 wording. | |

**User's choice:** Wire as parserOptions.parser (Recommended).

**Notes:** Decision locked as D-03 (`parserOptions.parser: '@babel/eslint-parser'`) + D-04 (explicit note: current config has no `parser` field, so this is the first time the parser is explicit — functional config change, not a pure rename; baseline diff per D-07 exists to surface the impact).

---

## @babel/eslint-parser config flags

**Question 1:** `@babel/eslint-parser` reads `.babelrc` by default — which config approach?

| Option | Description | Selected |
|--------|-------------|----------|
| Default — inherit .babelrc (Recommended) | No extra flags. Parser auto-loads `.babelrc` (@babel/env + @babel/typescript + class-properties + object-rest-spread). Single-source-of-truth between lint and build. | ✓ |
| requireConfigFile: false + inline babelOptions | Set `parserOptions.requireConfigFile: false` + minimal inline `babelOptions`. Decouples lint parsing from build-time `.babelrc`. | |
| requireConfigFile: false only | Parser uses internal defaults, ignores `.babelrc` entirely. Likely surfaces parser errors on class-property syntax in `.ts` source. | |

**User's choice:** Default — inherit .babelrc (Recommended).

**Notes:** Decision locked as D-05. D-06 captures the version pin expectation (caret on latest stable 7.x line, ESLint-7 peer compatible; planner confirms exact minor at plan time).

---

## Lint-baseline handling

**Question 1:** Phase 5 SC3 says `npm run lint` must stay ≤ v1.3 baseline 1881. How to handle parser-swap deltas?

| Option | Description | Selected |
|--------|-------------|----------|
| Capture pre/post diff, document deltas (Recommended) | Capture baseline in `05-01-BASELINE.md` (count + per-rule breakdown + per-file top-offenders) before the chore(deps) commit. Post-swap diff cited in commit 2 body. Accept parser-attributable deltas as long as net ≤1881. | ✓ |
| Strict ≤1881, fix any deltas in-phase | Any new warnings addressed inside Phase 5 (eslint-disable with justification or code fixes). Expands scope. | |
| Treat any delta as deviation requiring user sign-off | Pause on any count change, route to user before chore(deps) lands. Most conservative; may block on cosmetic deltas. | |

**User's choice:** Capture pre/post diff, document deltas (Recommended).

**Notes:** Decision locked as D-07 + D-08. D-08 clarifies that SC3's "band" wording allows both upward and downward deltas as long as net ≤1881.

---

## Claude's Discretion

- Exact version pin minor for `@babel/eslint-parser` (caret at latest stable 7.x line; resolved at plan time).
- Whether commit 1 also auto-updates peer-adjacent dev deps if `npm install --legacy-peer-deps` churns more than expected (route to user if lockfile produces non-Babel-adjacent edits).
- Whether to run `npm run lint --fix` after wiring the new parser in commit 2 (default: no; log parser-attributable warnings in baseline-delta instead).
- Baseline artifact file name (`05-01-BASELINE.md` suggested, matches Phase 4 naming).

## Deferred Ideas

- `@babel/runtime` + `@babel/plugin-transform-runtime` wiring — not needed today; revisit if future phase needs it.
- `--legacy-peer-deps` removal — Phase 7 LINT-03.
- ESLint 9 flat-config migration — Phase 6 (LINT-01, LINT-02).
- `eslint-config-prettier` 9 → 10 + `plugin:prettier/recommended` full wiring — Phase 6 (FMT-01, FMT-02).
- Vue-ecosystem parser upgrades (`vue-eslint-parser` 7 → 9, `eslint-plugin-vue` 6 → 9) — v2.0.
- Prettier expansion to `bot/` — v1.3 Phase 4's deferred idea; not picked up in v1.4.
- Updating ROADMAP SC1's grep wording — user chose to record interpretation in CONTEXT.md instead of editing the roadmap.
