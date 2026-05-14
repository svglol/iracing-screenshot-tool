---
phase: 11-eslint-vue-cleanup
plan: 01
subsystem: lint-stack
tags: [eslint, neostandard, eslint-plugin-vue, vue-eslint-parser, flat-config, bisect, dep-swap]
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - eslint.config.js
autonomous: true
requirements: [LINT-04, LINT-05, LINT-06, LINT-07, LINT-08]
dependency-graph:
  requires:
    - eslint@^9.39.4 (root; neostandard peer ^9.0.0 + eslint-plugin-vue@10 peer ^8.57.0||^9.0.0||^10.0.0 both satisfied)
    - "@babel/eslint-parser@^7.28.6 (KEEP — primary parser for .js/.vue until Phase 12)"
    - prettier@^3.3.3 (formatter; prettierRecommended stays LAST config entry)
    - "typescript-eslint@^8.59.0 (KEEP — tseslint.config() helper retained for **/*.ts scoping)"
  provides:
    - neostandard@^0.13.0 (flat-config-native standard; bundles eslint-plugin-n + eslint-plugin-promise + @stylistic/eslint-plugin)
    - eslint-plugin-vue@^10.9.0 (Vue 3-first; flat/recommended is the Vue 3 alias in v10)
    - vue-eslint-parser@^10.4.0 (flat-config-native; accepts parser object reference vs v7 string-hack)
    - eslint.config.js (rewritten — no FlatCompat, no fixupConfigRules, no legacy plugins)
  affects:
    - npm run lint (new rule stack; count must stay ≤1881 band; 734 baseline)
    - npm install (ERESOLVE clean, no --legacy-peer-deps — LINT-03 gate preserved)
tech-stack:
  added:
    - neostandard@^0.13.0
  removed:
    - eslint-config-standard@^14.1.1 (D-11-01)
    - eslint-plugin-import@^2.22.1 (D-11-05 — subsumed by neostandard bundle)
    - eslint-plugin-node@^11.1.0 (D-11-05 — subsumed; neostandard bundles eslint-plugin-n)
    - eslint-plugin-promise@^4.2.1 (D-11-05 — subsumed; neostandard bundles eslint-plugin-promise@^7)
    - eslint-plugin-standard@^4.0.1 (D-11-05 — dead package, ESLint 7 era)
    - "@eslint/compat@^2.0.5 (D-11-04 — fixupConfigRules shim retired)"
    - "@eslint/eslintrc@^3.3.5 (D-11-04 — FlatCompat retired)"
  bumped:
    - eslint-plugin-vue@^9.33.0 → ^10.9.0 (D-11-02)
    - vue-eslint-parser@^7.0.0 → ^10.4.0 (D-11-03 + supersede; v9 would fail eslint-plugin-vue@10 peer dep `^10.0.0`)
  unchanged:
    - eslint, "@babel/eslint-parser", "@babel/core", "@typescript-eslint/eslint-plugin", "@typescript-eslint/parser", typescript-eslint, eslint-config-prettier, eslint-plugin-prettier, globals
  patterns:
    - "Flat-config entry order preserved: ignores → neostandard → eslint-plugin-vue flat/recommended → languageOptions+rules → .vue override → tseslint.config for **/*.ts → prettierRecommended LAST"
    - "neostandard `noStyle: true` defers ALL formatting rules to prettier (D-11-07)"
    - "eslint-plugin-vue@10 flat/recommended IS the Vue 3 set (Vue-2 variants explicitly prefixed flat/vue2-*)"
    - "vue-eslint-parser@10 takes parser as object reference — retires v7 string-hack (Pitfall 6 in old config)"
must_haves:
  truths:
    - "`npm install` exits 0 with zero ERESOLVE and no --legacy-peer-deps (LINT-03 gate preserved)"
    - "`npm run lint` completes without internal crash (exit 0 or 1, not ≥2); problem count ≤ 1881"
    - "`npm test` reports 256/256 passing under Vitest (unchanged from Phase 10 close)"
    - "`grep -c 'FlatCompat\\|fixupConfigRules' eslint.config.js` returns 0"
    - "`grep -cE 'neostandard|eslint-plugin-vue|vue-eslint-parser' eslint.config.js` returns ≥3"
    - "`npm ls eslint-config-standard eslint-plugin-import eslint-plugin-node eslint-plugin-promise eslint-plugin-standard @eslint/compat @eslint/eslintrc` reports all 7 absent from tree"
    - "D-11-09 bisect chain: 2 content commits (chore(deps) + refactor(lint)) + 1 docs SUMMARY commit"
  artifacts:
    - path: "package.json"
      provides: "devDeps delta applied (7 removes + 1 add + 2 bumps)"
      contains: "\"neostandard\":"
    - path: "package-lock.json"
      provides: "regenerated lock; all removed packages absent from resolved tree"
    - path: "eslint.config.js"
      provides: "flat-config-native 7-entry composition per D-11-06"
      contains: "neostandard"
      does_not_contain: "FlatCompat"
  key_links:
    - from: "eslint.config.js entry 2"
      to: "neostandard({ noStyle: true })"
      pattern: "\\.\\.\\.neostandard\\("
    - from: "eslint.config.js entry 3"
      to: "eslint-plugin-vue flat/recommended"
      pattern: "configs\\['flat/recommended'\\]"
    - from: "eslint.config.js entry 5 (.vue parser override)"
      to: "vue-eslint-parser with object-ref parser"
      pattern: "parser: babelParser"
    - from: "eslint.config.js entry 7"
      to: "prettierRecommended LAST"
      pattern: "prettierRecommended$"
user_setup: []
---

<objective>
Close Phase 11 (ESLint/Vue ecosystem cleanup). Retire the v1.4-era FlatCompat + fixupConfigRules bridge now that every ESLint plugin in the chain has a flat-config-native major. Swap `eslint-config-standard@14` for `neostandard@0.13.0`, bump `eslint-plugin-vue` 9.33 → 10.9 and `vue-eslint-parser` 7.0 → 10.4, uninstall five now-redundant plugins plus the two shim packages. Rewrite `eslint.config.js` to the canonical 7-entry flat-config-native shape from D-11-06.

Purpose: Closes LINT-04 / LINT-05 / LINT-06 / LINT-07 / LINT-08 in one bisectable landing. Closes v2.0 milestone-level success criterion #8 (no FlatCompat shim). Unblocks Phase 12 with a clean flat-config foundation.

Output: package.json + package-lock.json + eslint.config.js modified; two content commits preserving D-11-09 bisect shape (`chore(deps)` + `refactor(lint)`) + one `docs(11-01)` SUMMARY commit.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/11-eslint-vue-cleanup/11-CONTEXT.md
@.planning/phases/10-jest-to-vitest/10-01-SUMMARY.md
@eslint.config.js
@package.json

<deviations_from_context>
**D-11-03 + ROADMAP + REQUIREMENTS said `vue-eslint-parser@^9.x`. This plan uses `^10.4.0` instead. Why:**

`npm view eslint-plugin-vue@10.9.0 peerDependencies` (run 2026-04-22) returns `{ ..., 'vue-eslint-parser': '^10.0.0' }`. D-11-02 locks eslint-plugin-vue@^10, and v10's peer-dep is a hard `^10.0.0` — v9 would ERESOLVE (or silently coexist via transitive resolution and crash at parse time). `vue-eslint-parser@10.4.0` is v9's direct successor in the same maintainer family, flat-config native, retires the Pitfall 6 string-hack identically to v9, and satisfies the v10 plugin peer. LINT-05 wording ("`vue-eslint-parser` 7 → 9") is preserved in spirit — parser bumped from 7 to current in-family latest, flat-config native, string-hack retired. The ">= 9" quality bar is exceeded.

No other CONTEXT decisions deviated. `noStyle: true` (A6) confirmed via tarball extract `grep noStyle neostandard-0.13.0/lib/main.js` — exact option name. `flat/recommended` (A2) confirmed via `eslint-plugin-vue-10.9.0/dist/configs/index.js` — the configs object exports `flat/recommended` as the Vue 3 alias; Vue-2 variants explicitly prefixed `flat/vue2-*`.
</deviations_from_context>

<baseline>
- `npm run lint` → **734 problems (731 errors, 3 warnings)** (2026-04-22; unchanged across Phases 8-10 per Phase 10 SUMMARY).
- `npm test` → **256/256** under Vitest 4.1.5.
- `(cd bot && npm test)` → **294/294** under Jest 29 (bot is OUT OF SCOPE).

**Lint-count budget:**
- Hard ceiling: 1881 (v1.4 band).
- Flag threshold: if post-Phase-11 count > 1034 (baseline + 300), surface in SUMMARY + propose optional Plan 11-02 rule-disables per D-11-09 2b. Do NOT disable rules inside this plan unless count > 1881 (blocks close).
</baseline>

<interfaces>
<!-- Empirically verified 2026-04-22 via `npm pack` + tarball inspection. -->

**neostandard@0.13.0 (index.d.ts):**
```typescript
declare function neostandard(options?: NeostandardOptions): import("eslint").Linter.Config[];
// Returns ARRAY — spread with ...neostandard(...).
// Options supported: noStyle?: boolean; semi?: boolean; ts?: boolean; globals?: string[]; ignores?: string[]; env?: string[]
// Use { noStyle: true } only. `semi` stays false; entry 4 already sets `semi: ['error', 'always']`.
```

**eslint-plugin-vue@10.9.0 (dist/configs/index.js):**
```javascript
const configs = {
  recommended: <vue3-recommended>,
  'flat/recommended': <vue3-flat-recommended>,          // ← this plan uses this
  'flat/essential': ..., 'flat/strongly-recommended': ...,
  'flat/vue2-recommended': ..., ...                     // Vue-2 variants explicitly prefixed
};
```
Returns ARRAY — spread with `...vuePlugin.configs['flat/recommended']`.

**vue-eslint-parser@10.4.0:** peer `eslint: '>=6.0.0'`. Accepts `parserOptions.parser` as an OBJECT reference (not string). The whole point of the bump over v7.
```javascript
// Old (v7 — Pitfall 6 string-hack):
languageOptions: { parser: vueParser, parserOptions: { parser: '@babel/eslint-parser' } }
// New (v10 — this plan):
languageOptions: { parser: vueParser, parserOptions: { parser: babelParser } }  // imported module object
```

**typescript-eslint@^8.59.0 (UNCHANGED from v1.4 Phase 7):** `tseslint.config({ files: ['**/*.ts'], extends: [tseslint.configs.recommended] })` — helper MANDATORY to scope parser to `.ts` without a global override.
</interfaces>

<scope_gate>
**`bot/**` is OUT OF SCOPE.** Pre-existing dirty: 21 modified files in `bot/**` + untracked `bot/docs/community-guide.md`. Phase 11 MUST NOT stage any `bot/**` file.

**`src/renderer/main.js` PascalCase-rename carry-forward (unstaged per STATE)** — do NOT stage. Even if new Vue 10 rules surface lint warnings on SFCs, source fixes are NOT Phase 11 scope — that's Phase 12 or a follow-up.

**Pre-existing unstaged files (leave alone):** `bot/**`, `.tmp-inspect/**` (deletions), `src/main/iracing-sdk-utils.test.js`, `src/renderer/main.js`, untracked `bot/docs/community-guide.md`. Phase 11 touches only 3 files: `package.json`, `package-lock.json`, `eslint.config.js`.

**Explicit `git add <path>` MANDATORY** — never `git add .` or `git add -A`.
</scope_gate>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Swap ESLint ecosystem dependencies + install clean</name>
  <files>package.json, package-lock.json</files>

  <read_first>
- `package.json` devDependencies block — identify 7 entries to remove + 3 entries to bump.
- Confirm baseline: `npm run lint 2>&1 | tail -3` should report `734 problems`. If different, STOP and surface the drift.
  </read_first>

  <action>
Apply 7-dep delta to `package.json.devDependencies` in one sweep, run `npm install` once.

**Remove (7):** `eslint-config-standard`, `eslint-plugin-import`, `eslint-plugin-node`, `eslint-plugin-promise`, `eslint-plugin-standard`, `@eslint/compat`, `@eslint/eslintrc` (per D-11-01, D-11-04, D-11-05).

**Add (1):** `neostandard: ^0.13.0` (D-11-01).

**Bump (2):** `eslint-plugin-vue: ^9.33.0 → ^10.9.0` (D-11-02); `vue-eslint-parser: ^7.0.0 → ^10.4.0` (D-11-03 + see <context>/deviations).

**Keep unchanged:** `@babel/eslint-parser`, `@babel/core`, `@typescript-eslint/*`, `typescript-eslint`, `eslint`, `eslint-config-prettier`, `eslint-plugin-prettier`, `globals`, everything else.

Edit `package.json` in one pass. Match surrounding indentation (tabs). Run `npm install` ONCE.

**Expected:** exit 0, zero ERESOLVE, no `--legacy-peer-deps` flag (LINT-03 gate). Net ~1 package added + several removed.

**If ERESOLVE:** STOP. Capture full error via `npm ls --all 2>&1 | head -30`. Do NOT use `--legacy-peer-deps` (would regress LINT-03). Surface root cause before changing the plan approach.

**Interim lint check (DO NOT fix):** `npm run lint` at this HEAD will crash because `eslint.config.js` still requires just-uninstalled `@eslint/compat` + `@eslint/eslintrc`. Expected. Config rewrite is Task 2. Record the crash line in notes; do NOT run `npm run lint --fix`. Verification uses `npm ls` + package.json checks, not lint.
  </action>

  <verify>
    <automated>
      node -e "const d=require('./package.json').devDependencies; const rm=['eslint-config-standard','eslint-plugin-import','eslint-plugin-node','eslint-plugin-promise','eslint-plugin-standard','@eslint/compat','@eslint/eslintrc']; const add=['neostandard']; const kept=['@babel/eslint-parser','eslint','eslint-config-prettier','eslint-plugin-prettier','globals','typescript-eslint','vue-eslint-parser','eslint-plugin-vue']; for(const k of rm) if(d[k]){console.error('FAIL still present:',k);process.exit(1)} for(const k of add) if(!d[k]){console.error('FAIL missing:',k);process.exit(1)} for(const k of kept) if(!d[k]){console.error('FAIL kept-dep missing:',k);process.exit(1)} if(!/\\^?10\\./.test(d['eslint-plugin-vue']))throw'eslint-plugin-vue not v10'; if(!/\\^?10\\./.test(d['vue-eslint-parser']))throw'vue-eslint-parser not v10'; console.log('package.json dep-delta PASS');"
      npm ls eslint-config-standard eslint-plugin-import eslint-plugin-node eslint-plugin-promise eslint-plugin-standard @eslint/compat @eslint/eslintrc 2>&1 | grep -qE '(empty|not found)' && echo "removed-deps PASS" || (echo "FAIL: removed pkg still in tree"; exit 1)
      npm ls neostandard 2>&1 | grep -q 'neostandard@0\\.13' && echo "neostandard install PASS" || (echo "FAIL: neostandard missing or wrong version"; exit 1)
    </automated>
  </verify>

  <acceptance_criteria>
- [ ] package.json devDependencies: `neostandard` present at `^0.13.x`; `eslint-plugin-vue` at `^10.x`; `vue-eslint-parser` at `^10.x`
- [ ] package.json devDependencies: zero entries for the 7 removed packages
- [ ] `npm install` exit 0, no ERESOLVE, no `--legacy-peer-deps`
- [ ] `npm ls` reports all 7 removed packages absent from the resolved tree
- [ ] `package-lock.json` regenerated; staged alongside `package.json` for Task 3 commit 1
- [ ] `git status --short` shows only `package.json` + `package-lock.json` as modified (plus pre-existing carry-forward in bot/, .tmp-inspect/, src/ test file, src/renderer/main.js — unchanged)
  </acceptance_criteria>

  <done>
package.json + package-lock.json reflect Task 1 delta; resolver tree clean. Do NOT commit yet — commits happen in Task 3 after config rewrite. Lint crash at this HEAD is EXPECTED (config still references uninstalled shims).
  </done>
</task>

<task type="auto">
  <name>Task 2: Rewrite eslint.config.js to flat-config-native canonical shape (D-11-06)</name>
  <files>eslint.config.js</files>

  <read_first>
- Current `eslint.config.js` (125 lines). Note entry 2 (FlatCompat + fixupConfigRules, ~lines 36-54) and entry 4 (`.vue` string-parser hack, ~lines 86-101) — both disappear.
- CONTEXT §D-11-06 canonical shape.
- <interfaces> above for the require() targets.
  </read_first>

  <action>
Overwrite `eslint.config.js` with the D-11-06 canonical shape. Use `Write` tool (full rewrite is cleaner to review than sequential edits).

**Target (7 entries):**

```javascript
'use strict';

const globals = require('globals');
const babelParser = require('@babel/eslint-parser');
const vueParser = require('vue-eslint-parser');
const vuePlugin = require('eslint-plugin-vue');
const neostandard = require('neostandard');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const tseslint = require('typescript-eslint');

module.exports = [
	// 1. Global ignores — UNCHANGED from v1.4 Phase 6 / Phase 10 close
	{
		ignores: [
			'bot/**', 'dist/**', 'out/**', 'node_modules/**',
			'build/**', '.planning/**', '.tools/**', '.tmp-inspect/**',
		],
	},

	// 2. Neostandard flat-config (D-11-01/D-11-07) — replaces FlatCompat + fixupConfigRules +
	//    eslint-config-standard@14 + eslint-plugin-import@2 + eslint-plugin-node@11 +
	//    eslint-plugin-promise@4 + eslint-plugin-standard@4.
	//    `noStyle: true` defers ALL formatting rules to prettier (entry 7).
	...neostandard({ noStyle: true }),

	// 3. eslint-plugin-vue@10 flat/recommended (D-11-02/D-11-08) — Vue 3 recommended ruleset.
	//    v10's `flat/recommended` IS the Vue 3 variant (Vue-2 prefixed `flat/vue2-*`). Returns ARRAY.
	...vuePlugin.configs['flat/recommended'],

	// 4. Native languageOptions + 3-rule overrides for .js/.ts/.vue (preserves v1.4 Phase 6 D-02)
	{
		files: ['**/*.{js,ts,vue}'],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.es2015,
				Atomics: 'readonly',
				SharedArrayBuffer: 'readonly',
			},
			parser: babelParser,
			parserOptions: {
				ecmaVersion: 2018,
				sourceType: 'module',
				requireConfigFile: true,
			},
		},
		rules: {
			'generator-star-spacing': 'off',
			semi: ['error', 'always'],
			'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
		},
	},

	// 5. Vue SFC parser override (D-11-03) — vue-eslint-parser@10 takes parserOptions.parser as OBJECT.
	//    Pre-Phase-11 v7 required the STRING '@babel/eslint-parser' (Pitfall 6 in old config). Retired.
	{
		files: ['**/*.vue'],
		languageOptions: {
			parser: vueParser,
			parserOptions: {
				parser: babelParser,
				ecmaVersion: 2018,
				sourceType: 'module',
				requireConfigFile: true,
			},
		},
	},

	// 6. typescript-eslint 8 scoped to .ts (UNCHANGED from v1.4 Phase 7).
	//    tseslint.config() helper is MANDATORY — without it, tseslint.configs.recommended sets
	//    languageOptions.parser globally and overrides @babel/eslint-parser for .js/.vue
	//    (v1.4 Phase 6 Pitfall 1). Zero .ts files at Phase 11 open; rules stay dormant until Phase 12.
	...tseslint.config({
		files: ['**/*.ts'],
		extends: [tseslint.configs.recommended],
	}),

	// 7. Prettier integration (FMT-01) — MUST be LAST so eslint-config-prettier disables win
	//    any format-vs-lint conflict. noStyle: true in entry 2 further reduces contention.
	prettierRecommended,
];
```

**Style:** TABS (match current convention). ~135-150 lines total. Each entry keeps a short decision-ID comment.

**Forbidden symbols:** `FlatCompat`, `fixupConfigRules`, `@eslint/compat`, `@eslint/eslintrc`, `compat.extends`, and the STRING `'@babel/eslint-parser'` in any `parserOptions.parser` slot.

**After rewrite, run smoke tests (MANDATORY — v1.4 Phase 6 D-01 Amendment lesson: research alone is NOT enough for plugin-runtime compatibility):**

```
npx eslint --no-eslintrc --config eslint.config.js --print-config src/renderer/main.js 2>&1 | head -5
npx eslint --no-eslintrc --config eslint.config.js --print-config src/renderer/components/Home.vue 2>&1 | head -5
```

Both MUST NOT crash. If either throws `TypeError: ... is not a function`, STOP (likely cause: an eslint-plugin-vue@10 rule calling a removed ESLint-API surface). Capture the stack trace and surface before committing.

**Then run the full `npm run lint 2>&1 | tail -5`. Record final count:**
- ≤ 1034 → proceed to Task 3 cleanly.
- 1035-1881 → proceed; SUMMARY flags optional Plan 11-02 per D-11-09 2b.
- \> 1881 → STOP. Surface top-5 rule offenders (`npm run lint 2>&1 | grep -oE '[a-z-]+/[a-z-]+$' | sort | uniq -c | sort -rn | head -5`) before deciding between (a) rule-disable block in entry 4 or (b) abort.
  </action>

  <verify>
    <automated>
      grep -cE 'FlatCompat|fixupConfigRules|@eslint/compat|@eslint/eslintrc' eslint.config.js | grep -q '^0$' && echo "forbidden-symbol PASS" || (grep -E 'FlatCompat|fixupConfigRules|@eslint/compat|@eslint/eslintrc' eslint.config.js; echo "FAIL: forbidden symbols present"; exit 1)
      grep -q "require('neostandard')" eslint.config.js && grep -q "require('eslint-plugin-vue')" eslint.config.js && grep -q "require('vue-eslint-parser')" eslint.config.js && echo "required-imports PASS" || (echo "FAIL: missing required imports"; exit 1)
      grep -q '\\.\\.\\.neostandard(' eslint.config.js && grep -q "flat/recommended" eslint.config.js && echo "spread-pattern PASS" || (echo "FAIL: neostandard/flat-recommended spread missing"; exit 1)
      grep -A4 "files:.*vue" eslint.config.js | grep -q 'parser: babelParser' && echo "vue-parser-object-ref PASS" || (echo "FAIL: .vue block does not use parser: babelParser"; exit 1)
      npx eslint --no-eslintrc --config eslint.config.js --print-config package.json > /dev/null 2>&1 && echo "config-resolves PASS" || (npx eslint --no-eslintrc --config eslint.config.js --print-config package.json 2>&1 | head -20; echo "FAIL: eslint config crashes on print-config"; exit 1)
      npm run lint > /tmp/lint-out.txt 2>&1; code=$?; if [ $code -ge 2 ]; then tail -20 /tmp/lint-out.txt; echo "FAIL: lint exited $code (internal error)"; exit 1; fi; tail -3 /tmp/lint-out.txt; echo "lint-run-no-crash PASS (exit $code)"
      count=$(tail -3 /tmp/lint-out.txt | grep -oE '[0-9]+ problems' | head -1 | grep -oE '[0-9]+'); if [ -z "$count" ]; then echo "FAIL: could not parse lint count"; exit 1; fi; if [ "$count" -gt 1881 ]; then echo "FAIL: lint count $count > 1881"; exit 1; fi; echo "lint-count-band PASS ($count ≤ 1881)"
      npm test 2>&1 | tail -3 | grep -q '256 passed' && echo "vitest-256 PASS" || (echo "FAIL: vitest regression"; exit 1)
    </automated>
  </verify>

  <acceptance_criteria>
- [ ] `eslint.config.js` contains zero `FlatCompat`, zero `fixupConfigRules`, zero `@eslint/compat`, zero `@eslint/eslintrc`
- [ ] Requires: `neostandard`, `eslint-plugin-vue`, `vue-eslint-parser` (plus kept: `@babel/eslint-parser`, `globals`, `eslint-plugin-prettier/recommended`, `typescript-eslint`)
- [ ] Exports an array with 7 top-level entries in the D-11-06 order
- [ ] `.vue` entry uses `parser: babelParser` (object), NOT `'@babel/eslint-parser'` (string)
- [ ] `npm run lint` exits 0 or 1 (not ≥2); problem count ≤ 1881
- [ ] `npm test` → 256/256
- [ ] Only `eslint.config.js` modified by this task (verify `git status --short`)
- [ ] Lint-count observation recorded for Task 3 commit message body
  </acceptance_criteria>

  <done>
`eslint.config.js` rewritten. ESLint resolves config; lint within ≤1881 band; tests green. Ready for Task 3.
  </done>
</task>

<task type="auto">
  <name>Task 3: Land two commits (chore(deps) + refactor(lint)) and write SUMMARY</name>
  <files>.planning/phases/11-eslint-vue-cleanup/11-01-SUMMARY.md</files>

  <read_first>
- `.planning/phases/10-jest-to-vitest/10-01-SUMMARY.md` — reuse format for SUMMARY.
- `git log --oneline -10` — confirm HEAD matches Phase 10 close (`909915f` or later).
- `git status --short` — should show only `package.json`, `package-lock.json`, `eslint.config.js` as modified (plus pre-existing carry-forward).
  </read_first>

  <action>
Land two D-11-09 content commits + one docs SUMMARY commit.

**Pre-flight scope gate (MANDATORY):**
```
git status --short | grep -vE '^ [DM?] (bot/|\.tmp-inspect/|src/main/iracing-sdk-utils\.test\.js|src/renderer/main\.js|bot/docs/community-guide\.md)' | grep -v '^$'
```
Should leave ONLY three lines: ` M package.json`, ` M package-lock.json`, ` M eslint.config.js`. If any other file appears, STOP — scope leak.

**Commit 1 — chore(deps):**
```
git add package.json package-lock.json
git diff --cached --stat        # sanity: exactly 2 files
git commit -m "$(cat <<'EOF'
chore(deps): swap eslint ecosystem — neostandard, eslint-plugin-vue 10, vue-eslint-parser 10; retire compat shims + 4 legacy plugins

Prerequisite for LINT-04/05/06/07 (commit 2 rewrites eslint.config.js); closes LINT-08 carve-out.

Removed (7): eslint-config-standard@14 (D-11-01), eslint-plugin-import@2, eslint-plugin-node@11, eslint-plugin-promise@4, eslint-plugin-standard@4 (D-11-05 — subsumed by neostandard's bundled n/promise/stylistic), @eslint/compat@2, @eslint/eslintrc@3 (D-11-04 — shim + FlatCompat retired).

Added (1): neostandard@^0.13.0 (D-11-01).
Bumped (2): eslint-plugin-vue ^9.33 → ^10.9 (D-11-02); vue-eslint-parser ^7 → ^10.4 (D-11-03 + v9→v10 per peer-dep reality — eslint-plugin-vue@10 peer requires ^10.0.0).

eslint.config.js is intentionally broken at THIS HEAD (still references FlatCompat + @eslint/compat — both just uninstalled). D-11-09 deps-only commit shape; commit 2 fixes the config.

npm install: exit 0, no ERESOLVE, no --legacy-peer-deps (LINT-03 preserved).
EOF
)"
```

**Commit 2 — refactor(lint):** (REPLACE `<COUNT>` and `<DELTA>` with actual Task 2 observations before running)
```
git add eslint.config.js
git diff --cached --stat        # sanity: exactly 1 file
git commit -m "$(cat <<'EOF'
refactor(lint): rewrite eslint.config.js for flat-config-native composition

Closes LINT-04/05/06/07 (companion to LINT-08 in commit 1). Completes v2.0 milestone criterion #8 (no FlatCompat shim).

Canonical 7-entry shape per CONTEXT D-11-06:
1. Global ignores (unchanged)
2. ...neostandard({ noStyle: true }) — replaces FlatCompat('plugin:vue/recommended','standard') + fixupConfigRules
3. ...vuePlugin.configs['flat/recommended'] — Vue 3 ruleset
4. languageOptions + 3 rule overrides (**/*.{js,ts,vue}) — globals.browser/es2015/Atomics/SharedArrayBuffer, parser: babelParser, generator-star-spacing off/semi always/no-debugger conditional
5. .vue parser override — vue-eslint-parser@10 with parser: babelParser OBJECT reference (retires v7 Pitfall 6 string-hack)
6. ...tseslint.config({ files: ['**/*.ts'], extends: [tseslint.configs.recommended] }) (unchanged from v1.4 Phase 7)
7. prettierRecommended LAST (FMT-01)

npm run lint: <COUNT> problems (<DELTA> vs 734 pre-Phase-11 baseline; <COUNT> ≤ 1881 v1.4 ceiling).
npm test: 256/256 under Vitest (unchanged).
npm install: exit 0, no ERESOLVE.

D-11-09 bisect: 2 content commits (this + prior chore(deps)). `git bisect start HEAD <pre-phase-11-SHA>` isolates dep-bump regressions (commit 1) from config-rewrite regressions (commit 2).
EOF
)"
```

**Post-commits scope gate:**
```
git log --oneline -3          # top 2 = chore+refactor; commit 3 comes later (SUMMARY)
git diff HEAD~2 --name-only | sort       # must be: eslint.config.js package-lock.json package.json
git diff HEAD~2 --name-only | grep -E '^(bot/|src/)' && echo "FAIL: scope leak" || echo "scope-gate PASS"
```

**Write SUMMARY** at `.planning/phases/11-eslint-vue-cleanup/11-01-SUMMARY.md` following Phase 10 format:
1. Frontmatter (phase, plan, subsystem, tags, dependency-graph, tech-stack, key-files, decisions, metrics)
2. One-liner
3. What Landed (short enumerated list mirroring commit bodies)
4. D-11-09 Bisect Shape paragraph
5. Commit SHAs table (chore / refactor / docs)
6. Verification Results table (one row per must_haves.truths + v2.0 criterion #8 + LINT-03 + bot-scope-gate)
7. vue-eslint-parser v9 → v10 Deviation (ROADMAP/REQUIREMENTS/D-11-03 said ^9, peer-dep chain required ^10, 1-2 paragraphs)
8. Lint Count Delta (baseline 734 → final count → delta; if > +300, propose Plan 11-02 follow-up per D-11-09 2b)
9. REQ-IDs Closed: LINT-04/05/06/07/08
10. Self-Check PASSED (files + commits verified list)

**Commit 3 — docs SUMMARY:**
```
git add .planning/phases/11-eslint-vue-cleanup/11-01-SUMMARY.md
git commit -m "docs(11-01): complete ESLint ecosystem cleanup plan summary"
```
  </action>

  <verify>
    <automated>
      git log --oneline -3 | grep -cE '(chore\\(deps\\):|refactor\\(lint\\):|docs\\(11-01\\):)' | grep -q '^3$' && echo "commit-messages PASS" || (git log --oneline -3; echo "FAIL"; exit 1)
      git diff HEAD~3 HEAD~1 --name-only | sort | tr '\\n' ' ' | grep -q 'eslint.config.js package-lock.json package.json' && echo "bisect-files PASS" || (git diff HEAD~3 HEAD~1 --name-only; echo "FAIL: unexpected file set"; exit 1)
      git diff HEAD~3 HEAD~1 --name-only | grep -E '^(bot/|src/)' && (echo "FAIL: scope-gate leak"; exit 1) || echo "scope-gate PASS"
      test -f .planning/phases/11-eslint-vue-cleanup/11-01-SUMMARY.md && echo "summary PASS" || (echo "FAIL: SUMMARY missing"; exit 1)
      grep -q '^phase: 11-eslint-vue-cleanup$' .planning/phases/11-eslint-vue-cleanup/11-01-SUMMARY.md && grep -q '^plan: 01$' .planning/phases/11-eslint-vue-cleanup/11-01-SUMMARY.md && echo "summary-frontmatter PASS" || (echo "FAIL: SUMMARY frontmatter malformed"; exit 1)
      npm run lint > /tmp/final-lint.txt 2>&1; code=$?; if [ $code -ge 2 ]; then tail -20 /tmp/final-lint.txt; echo "FAIL: final lint crashes"; exit 1; fi; tail -3 /tmp/final-lint.txt
      npm test 2>&1 | tail -3 | grep -q '256 passed' && echo "vitest-final PASS" || (echo "FAIL: vitest regression"; exit 1)
    </automated>
  </verify>

  <acceptance_criteria>
- [ ] 2 content commits: `chore(deps): swap eslint ecosystem ...` + `refactor(lint): rewrite eslint.config.js ...`
- [ ] Commit 1 touches only package.json + package-lock.json
- [ ] Commit 2 touches only eslint.config.js
- [ ] No `Co-Authored-By` footer anywhere
- [ ] No `--no-verify` used
- [ ] `git diff HEAD~3 HEAD~1 --name-only` = exactly 3 files
- [ ] Zero `bot/**` or `src/**` files staged across all 3 commits
- [ ] SUMMARY exists with 10 sections; committed as `docs(11-01): ...`
- [ ] Post-commit `npm run lint` ≤ 1881; `npm test` 256/256
- [ ] If final lint > 1034, SUMMARY flags optional Plan 11-02 per D-11-09 2b
  </acceptance_criteria>

  <done>
Phase 11 SHIPPED. D-11-09 2-content-commit bisect chain on master + SUMMARY committed. All 5 LINT-* REQ-IDs PASS. v2.0 criterion #8 closed. `bot/**` untouched. Ready for `/gsd-transition` to Phase 12.
  </done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → root devDeps | `npm install` executes tarball postinstall scripts in local Node; malicious transitive package could run arbitrary code at install time. |
| ESLint plugin runtime → source files | Each plugin executes JS against source via ESLint API; vulnerable plugin could infinite-loop or crash lint (dev-loop only, no production surface). |
| Developer → commit history | `git commit -m` flows prose into durable history; no secrets in scope. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-11-01 | T (supply chain) | neostandard@0.13.0 + bundled plugins | mitigate | `npm audit --audit-level=high` after install must not introduce NEW high/critical findings vs Phase 10 baseline (9 total; 1 high = pre-existing `@vue/devtools-electron` chain). Surface any new findings in SUMMARY. `package-lock.json` integrity hashes enforce on future installs. |
| T-11-02 | T (supply chain) | eslint-plugin-vue@10.9.0 + vue-eslint-parser@10.4.0 | mitigate | Same `npm audit` gate; plus empirical `npx eslint --print-config` smoke test (v1.4 Phase 6 D-01 Amendment lesson — research alone insufficient for plugin compatibility). Verified in Task 2. |
| T-11-03 | D (lint DoS) | eslint-plugin-vue@10 new ruleset | mitigate | Task 2 measures full lint run pre-commit. If lint > 60s (current ~3-5s) OR exits ≥ 2 (internal crash), STOP before commit. `--print-config` catches plugin TypeErrors early. |
| T-11-04 | I (commit disclosure) | `package-lock.json` regenerated | accept | Lock files historically checked in; no secrets in devDep resolution. |
| T-11-05 | E (postinstall scripts) | `npm install` running devDep postinstall | accept | Root project has no `--ignore-scripts` (needed for electron-builder + electron-rebuild). Neostandard + eslint-plugin-vue + vue-eslint-parser are high-download maintainer-backed packages (eslint-plugin-vue is official Vue.js team; neostandard is the ESLint-9-era fork by eslint-config-standard maintainers). Risk equivalent to pre-existing posture. |
| T-11-06 | R (repudiation — bisect) | Commit shape | mitigate | D-11-09 enforces 2 content commits with `chore(deps)` / `refactor(lint)` separation. Any future regression bisect isolates cleanly. Verified via `git log --oneline -3` in Task 3 acceptance. |
| T-11-07 | S (package spoofing) | npm registry tarballs | accept | Registry publishes signed by maintainers; `package-lock.json` integrity hashes pin exact blobs. No higher assurance (Sigstore/provenance) available; out of scope for Phase 11. |

</threat_model>

<verification>

**Three phase-close gates (all must PASS):**

1. **Dep-delta:** package.json has 7 removes + 1 add + 2 bumps exactly. `npm ls` reports removed packages absent. `npm install` exits 0 with no ERESOLVE and no `--legacy-peer-deps`.
2. **Flat-config-native:** `eslint.config.js` has zero `FlatCompat` / `fixupConfigRules` / `@eslint/compat` / `@eslint/eslintrc`. Has `neostandard` + `eslint-plugin-vue` + `vue-eslint-parser` imports + spread composition per D-11-06. `.vue` parser override uses `parser: babelParser` (object).
3. **Runtime:** `npm run lint` exits 0 or 1 (not ≥ 2) with problem count ≤ 1881. `npm test` 256/256. `npm install` clean. Scope-gate: zero `bot/**` and zero `src/**` files staged across 3 Phase 11 commits.

**Close sequence:**
```
# Gate 1 (dep-delta):
npm ls eslint-config-standard eslint-plugin-import eslint-plugin-node eslint-plugin-promise eslint-plugin-standard @eslint/compat @eslint/eslintrc 2>&1 | grep -E '(empty|not found|extraneous|ERESOLVE)'
npm ls neostandard eslint-plugin-vue vue-eslint-parser 2>&1 | head -10

# Gate 2 (flat-config):
grep -cE 'FlatCompat|fixupConfigRules|@eslint/compat|@eslint/eslintrc' eslint.config.js    # must be 0
grep -cE 'neostandard|eslint-plugin-vue|vue-eslint-parser' eslint.config.js    # must be ≥ 3

# Gate 3 (runtime):
npm install 2>&1 | tail -5
npm run lint 2>&1 | tail -3
npm test 2>&1 | tail -3

# Scope-gate:
git log --oneline -3
git diff HEAD~3 HEAD~1 --name-only | sort
git diff HEAD~3 HEAD~1 --name-only | grep -cE '^(bot/|src/)'    # must be 0
```

</verification>

<success_criteria>

Phase 11 Plan 01 complete when:

- [ ] `package.json` devDependencies has Task 1 delta applied (7 removes + 1 add + 2 bumps to v10 in both cases)
- [ ] `package-lock.json` regenerated; all 7 removed packages absent from resolved tree
- [ ] `npm install` exit 0; no ERESOLVE; no `--legacy-peer-deps` (LINT-03 preserved)
- [ ] `eslint.config.js` is the D-11-06 7-entry flat-config-native composition
- [ ] `eslint.config.js` contains zero `FlatCompat` / `fixupConfigRules` / `@eslint/compat` / `@eslint/eslintrc`
- [ ] `.vue` parser override uses `parser: babelParser` (object reference)
- [ ] `npm run lint` completes without internal crash; problem count ≤ 1881
- [ ] `npm test` → 256/256 under Vitest
- [ ] `npm run build` (or `--dir` smoke) produces electron-builder artifact with no eslint/parser crashes
- [ ] D-11-09 bisect chain: 2 content commits (`chore(deps)` + `refactor(lint)`) + 1 docs SUMMARY commit
- [ ] Zero `bot/**` or `src/**` files staged across all 3 commits
- [ ] No `Co-Authored-By` in any commit; no `--no-verify` used
- [ ] REQ-IDs LINT-04/05/06/07/08 all PASS
- [ ] v2.0 milestone criterion #8 closed
- [ ] `.planning/phases/11-eslint-vue-cleanup/11-01-SUMMARY.md` exists with 10 sections
- [ ] If final lint count > 1034, SUMMARY flags Plan 11-02 candidate per D-11-09 2b

</success_criteria>

<output>

Create `.planning/phases/11-eslint-vue-cleanup/11-01-SUMMARY.md` covering:

1. Frontmatter (phase 11-eslint-vue-cleanup, plan 01, subsystem lint-stack, tags, dependency-graph, tech-stack, key-files, decisions, metrics)
2. One-liner
3. What Landed
4. D-11-09 Bisect Shape paragraph (2 content commits)
5. Commit SHAs table (chore / refactor / docs)
6. Verification Results table
7. vue-eslint-parser v9 → v10 Deviation explanation
8. Lint Count Delta
9. REQ-IDs Closed: LINT-04/05/06/07/08
10. Self-Check PASSED

SUMMARY commit lands as `docs(11-01): complete ESLint ecosystem cleanup plan summary`.

Phase 11 ships; `/gsd-transition` to Phase 12 (.js → .ts conversion).

</output>
