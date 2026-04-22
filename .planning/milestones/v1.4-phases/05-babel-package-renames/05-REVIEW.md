---
phase: 05-babel-package-renames
reviewed: 2026-04-21T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - package.json
  - .eslintrc.js
  - .eslintignore
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 5: Code Review Report

**Reviewed:** 2026-04-21
**Depth:** standard
**Files Reviewed:** 3
**Status:** clean

## Summary

Phase 5 (Babel Package Renames) modifies three configuration files to swap the deprecated `babel-runtime` and `babel-eslint` packages for the canonical `@babel/eslint-parser`, and wires the new parser into ESLint via `parserOptions.parser` (per D-03). A new minimum-scope `.eslintignore` is added to exclude the out-of-scope `bot/` workspace and generated `dist/` output from the lint sweep.

All three files pass review with no Critical, Warning, or Info findings. The diff is strictly scoped: no unrelated edits, no version-range regressions, and every change maps to a documented directive from `05-CONTEXT.md`.

### Per-file verification

**`package.json`** — dep-swap hygiene clean:
- `babel-runtime` removed from `dependencies` stanza (was line 51) — correct stanza; this was a production dep and is now gone.
- `babel-eslint` removed from `devDependencies` stanza (was line 78) — correct stanza.
- `@babel/eslint-parser: ^7.28.6` added in `devDependencies` at line 70, in correct alphabetical position between `@babel/core` (line 69) and `@babel/plugin-proposal-class-properties` (line 71). Lexicographic ordering `core < eslint-parser < plugin-proposal-class-properties` holds.
- Caret range `^7.28.6` matches D-06 guidance (latest stable 7.x, keeps `eslint>=7.5.0` peer compatible with the project's `eslint@^7.10.0`). No `^8.x` pin that would collide with the ESLint 9 peer requirement deferred to Phase 6.
- No unrelated edits: diff shows only the three lines touched (`-babel-runtime`, `+@babel/eslint-parser`, `-babel-eslint`). All other dependency pins, scripts, build config, jest config, and metadata fields are byte-identical to the baseline at `0709130`.
- JSON parses cleanly (validated via `node -e "JSON.parse(...)"`).

**`.eslintrc.js`** — parser wiring correct:
- Single addition at line 16: `parser: '@babel/eslint-parser'` placed *inside* the `parserOptions` block (lines 15-19), not at the top level. This honors D-03 — a top-level `parser:` field would override `plugin:vue/recommended`'s `vue-eslint-parser` and break `<template>` linting in Vue SFCs. The nested placement makes `@babel/eslint-parser` the `<script>`-block parser while leaving `vue-eslint-parser` as the outer SFC parser.
- No `requireConfigFile` key and no `babelOptions` key present — honors D-05 (inherit `.babelrc`; do not duplicate Babel configuration in the ESLint config).
- Syntactic validity confirmed via `node --check .eslintrc.js`.
- Existing `ecmaVersion: 2018` and `sourceType: 'module'` keys preserved in their original order; the new `parser` line is inserted as the first key of the object, matching the shape referenced in `05-CONTEXT.md` line 113.

**`.eslintignore`** — minimum-scope, correct formatting:
- Contains exactly two lines: `bot/` and `dist/`. No over-broad patterns (e.g. no `node_modules/`, `**/*.min.js`, or catch-all globs) — minimum-scope honored.
- Byte-level inspection (`od -c`): `b o t / \n d i s t / \n` — LF line endings, no leading whitespace, no trailing whitespace on either line, trailing newline present after the final entry.
- `bot/` exclusion aligns with the v1.3 workspace-boundary pattern (same rule Phase 4 D-01 established); `dist/` exclusion keeps webpack output out of the lint sweep.

### Scope compliance

Diff against `0709130` confirms the change set is exactly:
- `package.json`: one removal from `dependencies`, one removal + one addition in `devDependencies` (net -1 dep, -0 devDeps, +1 devDep = net -1 line on dev + -1 on prod).
- `.eslintrc.js`: one line added.
- `.eslintignore`: new file, two lines.

No source code under `src/`, no webpack configs under `_scripts/`, no `.babelrc`, and no `bot/` files were modified — matching the `<out_of_scope>` list in the phase context.

---

_Reviewed: 2026-04-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
