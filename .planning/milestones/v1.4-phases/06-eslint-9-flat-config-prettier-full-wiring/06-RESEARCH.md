# Phase 6: ESLint 9 Flat Config + Prettier Full Wiring - Research

**Researched:** 2026-04-22
**Domain:** ESLint 9 flat config migration, FlatCompat bridge, eslint-plugin-prettier wiring
**Confidence:** HIGH (core stack verified via npm registry + source inspection); MEDIUM (vue-eslint-parser@7 delegation fallback pattern — see Pitfall 6)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use `@eslint/eslintrc` `FlatCompat` as the legacy bridge. Load `eslint-config-standard@14`, `plugin:vue/recommended` (eslint-plugin-vue@6), and `@typescript-eslint@2` rule sets UNCHANGED via FlatCompat. Do NOT upgrade these plugins (Phase 7 / v2.0 scope).
- **D-02:** Preserve every rule from `.eslintrc.js` verbatim through FlatCompat + inline `rules:` block. `env: { browser: true, es6: true }` → `languageOptions.globals: { ...globals.browser, ...globals.es2015 }`. `parserOptions` → `languageOptions`.
- **D-03:** Wire `plugin:prettier/recommended` at the END of the extends chain. `prettier/prettier` fires as `error` severity (default). Supersedes v1.3 Phase 4 Pitfall 4 minimum-scope derogation.
- **D-04:** Migrate `.eslintignore` patterns into `ignores: ['bot/**', 'dist/**', 'node_modules/**', 'build/**']` at the top of the flat config array. Delete `.eslintignore` in the content commit.
- **D-05:** Remove `--ext .js,.ts,.vue` from `npm run lint`. Add `files: ['**/*.{js,ts,vue}']` glob in config. New script: `"lint": "eslint --fix ./"`.
- **D-06:** Keep `--fix` in `npm run lint`.
- **D-07:** `eslint-config-prettier` bumps 9 → 10 (caret).
- **D-08:** `eslint-plugin-prettier` stays at 5.x (caret). Already installed at `^5.2.1`.
- **D-09:** Capture `06-01-BASELINE.md` at pre-migration HEAD in commit 1. Pre-migration denominator: **722** (src+_scripts scope, @babel/eslint-parser, legacy rc).
- **D-10:** Post-migration parity band: **≤ 722 + `prettier/prettier` delta** (delta ≤ 20 expected). SC2 ceiling: 1881. Non-prettier-attributable regression is a migration bug.
- **D-11:** SC2 "every rule re-enabled or deliberately retired" satisfied by D-02 (no retirements).
- **D-12:** Two-commit minimum shape: commit 1 = `chore(deps): eslint 9 + eslint-config-prettier 10`; commit 2 = `refactor(eslint): migrate to flat config with full prettier wiring`. Optional 3rd commit if scope-control addendum needed.
- **D-13:** No `--no-verify`, no `Co-Authored-By:` footer.
- **D-14:** `git add` must NOT use `-A` or `.`. Stage explicit paths.
- **D-15:** `--legacy-peer-deps` remains required. D-15 LINT-03 contradiction resolved via Option 1: `--legacy-peer-deps` persists past v1.4. Vue plugin conflict stays until v2.0.
- **D-16:** `npm install --legacy-peer-deps` during plan execution.
- **D-17:** `bot/` stays excluded → `ignores: ['bot/**', ...]`.
- **D-18:** `dist/` stays excluded → `ignores: ['dist/**', ...]`.

### Claude's Discretion

- Exact version pins for `eslint` (^9.x latest stable), `eslint-config-prettier` (^10.x), `@eslint/eslintrc` (^3.x), `globals` (^15.x or ^16.x).
- Exact shape of FlatCompat usage — single merged or three separate compat.extends() entries.
- How to handle the "broken-window" interval between commit 1 and commit 2.
- `npm run lint` script edit timing (commit 1 vs commit 2).
- Whether `06-01-BASELINE.md` captures both `./` full scope and files-glob-scoped count.

### Deferred Ideas (OUT OF SCOPE)

- Jest globals for `.test.js` files (~693 `no-undef` firings).
- `eslint-plugin-standard@4` removal.
- `eslint-config-standard` 14 → 17+ / `neostandard` migration.
- `--legacy-peer-deps` removal (v2.0 per D-15 Option 1 resolution).
- `eslint-plugin-vue` 6 → 9 + `vue-eslint-parser` 7 → 9 (v2.0).
- TypeScript 5 / typescript-eslint 8 (Phase 7).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LINT-01 | ESLint upgraded from 7.10 to 9.x | §Standard Stack: eslint@9.39.4 verified via npm registry |
| LINT-02 | Lint configuration migrated from legacy `.eslintrc.js` to flat `eslint.config.js` (parity verified against v1.3 baseline lint count of 1881) | §Architecture Patterns: FlatCompat bridge pattern; §Common Pitfalls: Pitfalls 1–7 covering all migration risks |
| FMT-01 | `eslint-plugin-prettier` wired via `plugin:prettier/recommended` for full rule integration | §Standard Stack: `eslint-plugin-prettier/recommended` direct CJS import confirmed; §Code Examples |
| FMT-02 | `eslint-config-prettier` upgraded from 9 to 10 | §Standard Stack: 10.1.8 verified; §State of the Art: v10 change summary |
</phase_requirements>

---

## Summary

Phase 6 migrates the project's ESLint configuration from ESLint 7.10 + legacy `.eslintrc.js` (rc-format) to ESLint 9.39.4 + `eslint.config.js` (flat format), bumps `eslint-config-prettier` 9 → 10, and wires `eslint-plugin-prettier` via `plugin:prettier/recommended` for full rule integration. The migration uses the `@eslint/eslintrc` `FlatCompat` bridge to load all existing legacy extends chains (standard, plugin:vue/recommended, @typescript-eslint@2 rule sets) without upgrading any of them — they remain at their current pinned versions and are loaded through the compatibility shim.

The `eslint-plugin-prettier/recommended` entry is a native flat-config object that can be `require()`'d directly — no FlatCompat needed for it. It should appear as the last entry in the config array. The `globals` npm package (v15 or v17, both CJS) provides `languageOptions.globals` replacements for the legacy `env:` field. Two new devDependencies are required: `@eslint/eslintrc@^3.3.5` and `globals@^15.15.0`.

The single highest-risk item is **`vue-eslint-parser@7`'s `parserOptions.parser` delegation in flat config** (see Pitfall 6). The installed v7 only accepts `parserOptions.parser` as a string; if FlatCompat correctly propagates the string `'@babel/eslint-parser'` from the legacy rc into `languageOptions.parserOptions.parser`, delegation works. If not, `<script>` blocks fall back to espree. This must be verified empirically in Wave 1 before the content commit lands.

The "broken-window" interval between commit 1 (ESLint 9 installed, `.eslintrc.js` still present) and commit 2 (flat config written, `.eslintrc.js` deleted) is a real issue: ESLint 9 ignores `.eslintrc.js` by default AND throws `"Invalid option '--ext'"` if the old script runs. The `--ext` removal must land in commit 1 alongside the dep bump to make `npm run lint` at least executable (it will produce no rules/warnings without a config, but won't throw a CLI error).

**Primary recommendation:** Use a single `compat.extends('plugin:vue/recommended', 'standard', 'prettier')` call to load all three legacy configs as one merged FlatCompat block, then append the native `prettierRecommended` object as the last entry. Add a native config block for `languageOptions` (globals + parser) and `rules` (4-rule overrides). Keep the global `ignores` as the first entry.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Lint rule engine | Dev tooling (ESLint 9) | — | Config-only change; no runtime tier |
| Legacy config translation | Dev tooling (@eslint/eslintrc FlatCompat) | — | Bridge layer for existing plugins |
| Format enforcement | Dev tooling (eslint-plugin-prettier) | Prettier CLI | Rules enforce, CLI reformats |
| Vue SFC template linting | Dev tooling (vue-eslint-parser@7) | eslint-plugin-vue@6 | Parser owns delegation chain |
| JS/TS script block parsing | Dev tooling (@babel/eslint-parser) | via vue-eslint-parser delegation | String-reference delegation from v7 |
| Global variable declarations | Dev tooling (globals npm package) | — | Replaces legacy env: field |
| Ignore scope control | Dev tooling (eslint.config.js ignores[]) | — | Replaces .eslintignore |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| eslint | ^9.39.4 | Lint engine | Latest stable 9.x; `maintenance` dist-tag is 9.39.4 [VERIFIED: npm registry] |
| @eslint/eslintrc | ^3.3.5 | FlatCompat bridge for legacy rc configs | Official ESLint package; only supported migration path for legacy extends chains [VERIFIED: npm registry + Context7] |
| globals | ^15.15.0 | languageOptions.globals replacement for env: | CJS-compatible; `es2017`, `browser` keys confirmed present [VERIFIED: source inspection] |
| eslint-config-prettier | ^10.1.8 | Disable conflicting ESLint format rules | v10 adds @stylistic rule support; CJS [VERIFIED: npm registry] |

> Note: ESLint 10.x (latest: 10.2.1) is NOT the target. The `maintenance` dist-tag resolves to 9.39.4 which is the highest stable 9.x release. The project's Phase 7 context requires staying on 9.x for this phase. Use `npm install eslint@"^9"` to resolve 9.39.4. [VERIFIED: npm registry dist-tags]

### Supporting (already installed, no version change)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| eslint-plugin-prettier | ^5.2.1 | Runs Prettier as ESLint rule | Already installed; 5.x peers eslint>=8 ✓; `recommended.js` is CJS flat-config object [VERIFIED: source inspection] |
| eslint-plugin-vue | ^6.2.2 | Vue SFC rules | Stays unchanged; FlatCompat bridge via compat.extends [VERIFIED: CONTEXT.md D-01] |
| vue-eslint-parser | ^7.0.0 | .vue file parser | Stays unchanged; parserOptions.parser delegation confirmed as string-only in v7 [VERIFIED: source inspection] |
| @typescript-eslint/eslint-plugin | ^2.25.0 | TS rules | Stays unchanged; no runtime ESLint version check in v2 [VERIFIED: source inspection] |
| @typescript-eslint/parser | ^2.25.0 | TS parser | Stays unchanged; no runtime ESLint version check [VERIFIED: source inspection] |
| @babel/eslint-parser | ^7.28.6 | JS/TS parser | Peers `eslint: ^7.5.0 \|\| ^8.0.0 \|\| ^9.0.0` — ESLint 9 explicitly supported [VERIFIED: npm registry] |

### New Dependencies

**Installation (commit 1, after package.json edits):**
```bash
npm install --legacy-peer-deps
```

**package.json devDependencies changes:**
```
eslint: ^7.10.0      → ^9.39.4    (bump)
eslint-config-prettier: ^9.1.0 → ^10.1.8  (bump)
@eslint/eslintrc: (new) ^3.3.5              (alphabetical: before "eslint")
globals: (new) ^15.15.0                     (alphabetical: in "g" block)
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@eslint/eslintrc` FlatCompat | `@eslint/compat` fixupConfigRules | fixupConfigRules fixes plugin API mismatches but does NOT translate rc format → flat format. FlatCompat is needed for eslintrc-format configs. Both can be combined if needed. |
| `globals@^15` | `globals@^17` | v17 latest (17.5.0) is also CJS-compatible; adds `audioWorklet` split and browser additions. Either works; v15 is more conservative. |
| `compat.extends('a', 'b', 'c')` (single call) | Three separate `compat.extends('a')`, etc. | Single call loads all three as merged FlatCompat entries; three separate calls produce three array entries but equivalent behavior. Single call is idiomatic. |

---

## Architecture Patterns

### System Architecture Diagram

```
package.json scripts
  "lint": "eslint --fix ./"
         |
         v
eslint.config.js (CJS, module.exports = [...])
         |
         +-- [0] { ignores: ['bot/**', 'dist/**', 'node_modules/**', 'build/**'] }
         |
         +-- [1..N] compat.extends('plugin:vue/recommended', 'standard', 'prettier')
         |          (FlatCompat translates rc format → flat entries)
         |          |
         |          +--> eslint-plugin-vue@6 rules loaded via FlatCompat
         |          |    └─ vue-eslint-parser@7 parses .vue files
         |          |         └─ parserOptions.parser: '@babel/eslint-parser' (string)
         |          |              └─ require('@babel/eslint-parser') → parses <script>
         |          |
         |          +--> eslint-config-standard@14 rules loaded via FlatCompat
         |          |    └─ includes eslint-plugin-node, eslint-plugin-promise, etc.
         |          |
         |          +--> prettier (eslint-config-prettier@9 via old extends chain;
         |               disabled by prettierRecommended below anyway)
         |
         +-- [N+1] { files: ['**/*.{js,ts,vue}'], languageOptions: { ... }, rules: {...} }
         |          (native flat-config entry: globals + parser + 4-rule overrides)
         |          |
         |          +--> languageOptions.globals: { ...globals.browser, ...globals.es2015,
         |          |                              Atomics: 'readonly', SharedArrayBuffer: 'readonly' }
         |          +--> languageOptions.parser: babelParser (imported symbol)
         |          +--> languageOptions.parserOptions: { ecmaVersion: 2018, sourceType: 'module' }
         |          +--> rules: { generator-star-spacing: off, semi: [error, always],
         |                       no-debugger: conditional }
         |
         +-- [N+2] prettierRecommended  (require('eslint-plugin-prettier/recommended'))
                   (LAST entry — disables format rules + adds prettier/prettier: error)
```

### Recommended Project Structure

```
repo-root/
├── eslint.config.js          # new — flat config (CJS, module.exports)
├── .eslintrc.js              # DELETED in commit 2
├── .eslintignore             # DELETED in commit 2
├── .babelrc                  # unchanged
├── .prettierrc               # unchanged
└── package.json              # two bumps + two new devDeps + lint script edit
```

### Pattern 1: Global Ignores Object (MUST be first)

**What:** A config object with ONLY `ignores` and no other keys applies globally.
**When to use:** Always first in the flat config array to prevent `.eslintignore`-style exclusions.
**Why the `**/` prefix matters:** In flat config, a bare pattern like `bot/` only ignores a directory named `bot` at the config file's directory. The `**/` prefix makes it recursive.

```javascript
// Source: ESLint migration guide (Context7 /eslint/eslint — configure/migration-guide.md)
// FIRST entry in module.exports array
{
  ignores: ['bot/**', 'dist/**', 'node_modules/**', 'build/**']
}
```

### Pattern 2: FlatCompat Setup (CJS)

**What:** Load legacy rc-format configs into flat config array.
**When to use:** For any extends entry that has no flat-config-native version at the pinned major.

```javascript
// Source: ESLint migration guide (Context7 /eslint/eslint — configure/migration-guide.md)
// CJS version — no __filename/__dirname shimming needed (available natively in CJS)
const { FlatCompat } = require('@eslint/eslintrc');
const path = require('path');

const compat = new FlatCompat({
  baseDirectory: __dirname,  // resolves plugins relative to project root
});

// Single compat.extends() call — three entries merged into FlatCompat entries
// Equivalent to the old .eslintrc.js extends: ['plugin:vue/recommended', 'standard', 'prettier']
// NOTE: 'prettier' here is eslint-config-prettier@9 (the old version from the extends chain).
// It will be superseded by prettierRecommended at the end anyway.
...compat.extends('plugin:vue/recommended', 'standard', 'prettier')
```

### Pattern 3: Native languageOptions Entry

**What:** Replaces `env:`, `globals:`, `parserOptions:` from rc format in native flat-config syntax.
**When to use:** As a separate native config entry AFTER the FlatCompat entries.

```javascript
// Source: ESLint migration guide (Context7 /eslint/eslint — configure/migration-guide.md)
// and verified against globals@15.15.0 source (module.exports = require('./globals.json'))
const globals = require('globals');
const babelParser = require('@babel/eslint-parser');

{
  files: ['**/*.{js,ts,vue}'],
  languageOptions: {
    // Replaces: env: { browser: true, es6: true }
    // es6 env = es2015 in the globals package
    globals: {
      ...globals.browser,
      ...globals.es2015,
      // Replaces: globals: { Atomics: 'readonly', SharedArrayBuffer: 'readonly' }
      Atomics: 'readonly',
      SharedArrayBuffer: 'readonly',
    },
    // Replaces: parserOptions.parser: '@babel/eslint-parser'
    // NOTE: This sets the parser for .js and .ts files natively.
    // .vue files are handled differently — see Pitfall 6.
    parser: babelParser,
    parserOptions: {
      ecmaVersion: 2018,
      sourceType: 'module',
      requireConfigFile: true,  // inherit .babelrc (Phase 5 D-05 carryover)
    },
  },
  // Replaces: rules: { 4-override block }
  rules: {
    'generator-star-spacing': 'off',
    'semi': ['error', 'always'],
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
  },
}
```

> **IMPORTANT — `env: es6` vs `globals.es2015` vs `globals.es2017`:**
> The original `.eslintrc.js` uses `env: { es6: true }`. In ESLint's legacy format, `env.es6` maps to the `es2015` globals set (BigInt64Array, SharedArrayBuffer, Symbol, etc.). The `globals` package does NOT have an `es6` key (verified by source inspection of `globals@11.12.0` installed). Use `globals.es2015`. Do NOT use `globals.es2017` — that adds `Atomics` and `SharedArrayBuffer` which are already declared explicitly in the `globals` block above. [VERIFIED: globals v15.15.0 source — keys: es2015, es2016, es2017, es2018, … no es6 key]

### Pattern 4: eslint-plugin-prettier/recommended (LAST entry)

**What:** Native flat-config object that adds `prettier/prettier: error` and disables conflicting format rules.
**When to use:** Always the LAST entry in the config array so eslint-config-prettier's disables win.

```javascript
// Source: eslint-plugin-prettier/recommended.js source inspection
// (CJS: module.exports = { name, plugins: { prettier }, rules: { ...configPrettierRules, 'prettier/prettier': 'error' } })
const prettierRecommended = require('eslint-plugin-prettier/recommended');

// Last entry:
prettierRecommended
```

No FlatCompat wrapping needed. `eslint-plugin-prettier@5.2.1` ships `recommended.js` as a native CJS flat-config object that ESLint 9 consumes directly.

### Pattern 5: Vue SFC .vue File Parser Override

**What:** Explicit parser config for `.vue` files to wire `vue-eslint-parser` as the outer parser with `@babel/eslint-parser` string reference for `<script>` delegation.
**Critical note:** `vue-eslint-parser@7` only accepts `parserOptions.parser` as a **string**. If an imported module object is passed, v7 falls back to espree. This is the delegation behavior of the installed version.

```javascript
// Source: vue-eslint-parser README (installed v7.0.0) + source inspection of parseScript()
// In flat config, vue-eslint-parser must be wired as languageOptions.parser for .vue files.
// The parserOptions.parser must be a STRING (require-able module name), not an imported module.
const vueParser = require('vue-eslint-parser');

{
  files: ['**/*.vue'],
  languageOptions: {
    parser: vueParser,              // outer parser: handles <template> block
    parserOptions: {
      parser: '@babel/eslint-parser', // MUST be STRING for vue-eslint-parser@7
      ecmaVersion: 2018,
      sourceType: 'module',
      requireConfigFile: true,       // inherit .babelrc
    },
  },
}
```

This entry should be placed AFTER the FlatCompat entries and BEFORE the prettierRecommended entry. It overrides the parser only for `.vue` files.

### Pattern 6: Complete eslint.config.js Skeleton (CJS)

```javascript
// eslint.config.js — CJS (no "type": "module" in package.json)
// Source: assembled from Context7 /eslint/eslint, source inspections, npm registry
'use strict';

const { FlatCompat } = require('@eslint/eslintrc');
const globals = require('globals');
const babelParser = require('@babel/eslint-parser');
const vueParser = require('vue-eslint-parser');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const path = require('path');

const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
  // 1. Global ignores (replaces .eslintignore)
  { ignores: ['bot/**', 'dist/**', 'node_modules/**', 'build/**'] },

  // 2. Legacy extends chain via FlatCompat
  ...compat.extends('plugin:vue/recommended', 'standard', 'prettier'),

  // 3. Native overrides: globals, parser, 4-rule block (all .js/.ts/.vue)
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
      'semi': ['error', 'always'],
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    },
  },

  // 4. Vue SFC parser override (must be after FlatCompat entries)
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: '@babel/eslint-parser', // string — vue-eslint-parser@7 requires this
        ecmaVersion: 2018,
        sourceType: 'module',
        requireConfigFile: true,
      },
    },
  },

  // 5. Prettier full integration (LAST — so eslint-config-prettier wins)
  prettierRecommended,
];
```

> **Planner note:** The exact entry ordering and merging may be adjusted during implementation. The critical invariant is: `ignores` first, `prettierRecommended` last, `.vue` parser override after FlatCompat entries.

### Anti-Patterns to Avoid

- **Spreading legacy config directly without FlatCompat:** Results in `"Config (unnamed): Key 'parserOptions': This appears to be in eslintrc format"` error. Always use `compat.extends()`. [VERIFIED: community reports, eslint-config-standard issue #411]
- **Using `ESLINT_USE_FLAT_CONFIG=false`:** This is the escape hatch for keeping eslintrc on ESLint 9, not the migration path. Do not use.
- **Passing `parserOptions.parser` as an imported module to vue-eslint-parser@7:** v7 only `require(string)`. Must pass the string `'@babel/eslint-parser'`, not the imported `babelParser` object. [VERIFIED: source inspection of parseScript() in installed node_modules]
- **Putting `ignores` in a shared config entry:** Must be a standalone object with ONLY `ignores` for global scope. If other properties exist, `ignores` only applies to that config entry. [VERIFIED: Context7 ESLint docs]
- **Using `globals.es6`:** Does not exist in globals@15. Use `globals.es2015` instead. [VERIFIED: globals v15.15.0 source keys]
- **Using `globals.es2017` for the `es6: true` mapping:** `es2017` adds `Atomics` and `SharedArrayBuffer` which are already declared explicitly; using it would create duplicate declarations with the explicit `globals` overrides, causing lint warnings.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Load legacy eslintrc-format shared config | Manual config parsing | `FlatCompat.extends()` | Handles parser resolution, plugin loading, env translation, settings merging |
| Disable conflicting format rules | Custom rule overrides | `eslint-config-prettier` (via `prettierRecommended`) | 10+ rules to disable; maintained automatically for each ESLint version |
| Run Prettier as lint rule | Custom rule | `eslint-plugin-prettier/recommended` | Handles diff formatting, severity wiring, config-prettier integration |
| Browser/ES global declarations | Inline `globals:` object | `globals` npm package | 1000+ globals; maintained per spec version |
| Translate `env:` to globals | Manual mapping | `globals.browser`, `globals.es2015` etc. | Same set ESLint uses internally; prevents mismatches |

**Key insight:** FlatCompat is a one-function solution to a genuinely hard problem — loading plugins that internally call `require(parserOptions.parser)` as strings, resolving config paths relative to the project root, and translating `env:` objects to flat globals. Building this by hand would require replicating ESLint's internal config-array-factory logic.

---

## Common Pitfalls

### Pitfall 1: The "Broken-Window" Interval

**What goes wrong:** After commit 1 (ESLint 9 installed), the old `npm run lint` script contains `--ext .js,.ts,.vue`. ESLint 9 throws `"Invalid option '--ext' - perhaps you meant '-c'?"` and exits with error code. Meanwhile, `.eslintrc.js` still exists but ESLint 9 silently ignores it — ESLint 9's default is flat config, and it will not search for `.eslintrc.*` files.

**Behavior summary:**
- ESLint 9 + `.eslintrc.js` + no `eslint.config.js` = runs with **no config** (no rules, no errors — but `--ext` flag causes immediate fatal error)
- ESLint 9 + `eslint.config.js` + `--ext` flag = immediately throws `"Invalid option '--ext'"`
- `ESLINT_USE_FLAT_CONFIG=false` re-enables rc mode — this is the escape hatch, not the migration path

**How to avoid:** The `--ext` removal MUST land in commit 1 alongside the dep bump. Without it, `npm run lint` is broken at commit 1 (ESLint 9 installed but still `--ext` flag in script). Moving the `--ext` removal into commit 1 makes commit 1 self-consistent: ESLint 9 runs, no flat config exists yet, ESLint finds no `eslint.config.js` and runs with no rules (zero findings) — this is the "acknowledged broken-window" state. The commit body should note this.

[VERIFIED: GitHub discussion #18280, ESLint migration guide]

**Warning signs:** CI fails on commit 1 if lint is part of commit gates. Document in commit body that lint is non-functional between commits 1 and 2.

### Pitfall 2: FlatCompat `ignores` Scope

**What goes wrong:** Putting `ignores` inside a FlatCompat-loaded entry or a shared config entry with other properties causes the ignores to only apply to that specific config object, not globally.

**How to avoid:** The `ignores`-only object must be the first standalone entry in the array with NO other properties. [VERIFIED: Context7 ESLint docs — configuration-files.md]

### Pitfall 3: `env:` is Silently Dropped

**What goes wrong:** ESLint 9 flat config does NOT support the `env:` key. If FlatCompat translates a legacy config entry that has `env:`, it translates it to globals via `translateESLintRC` internal function. But any native flat-config object with `env:` in it will be silently ignored or throw a validation error.

**How to avoid:** Never use `env:` in native flat-config objects. Always use `languageOptions.globals: { ...globals.browser }`. [VERIFIED: Context7 ESLint migration guide — "env property doesn't exist" in flat config]

### Pitfall 4: `plugin:vue/recommended` Plugin Registration via FlatCompat

**What goes wrong:** In legacy rc format, `plugins: ['vue']` in `.eslintrc.js` is redundant once `plugin:vue/recommended` is in `extends:` (the config block registers the plugin). In flat config, FlatCompat's `translateESLintRC` translates `plugins:` into `flatConfig.plugins: { vue: <plugin object> }`. The `plugins: ['vue']` entry in the rc config is loaded and translated. If the explicit `plugins: ['vue']` in `.eslintrc.js` is not being loaded (because we deleted `.eslintrc.js` and only load via FlatCompat's `compat.extends('plugin:vue/recommended')`), the plugin registration comes from the `plugin:vue/recommended` config itself. This is correct behavior — no explicit `plugins:` registration needed in native flat config when using FlatCompat's extends.

**How to avoid:** Do not add a separate `plugins: { vue: require('eslint-plugin-vue') }` native entry — the FlatCompat chain handles this. [VERIFIED: @eslint/eslintrc flat-compat.js source inspection — translateESLintRC handles `plugins` translation]

### Pitfall 5: `eslint-config-prettier` Loaded Twice

**What goes wrong:** The `extends: ['prettier']` in the old rc config is `eslint-config-prettier@9`. When FlatCompat loads this chain, it translates `'prettier'` → the old v9 disables. Then `prettierRecommended` (at the end) includes `eslint-config-prettier@10`'s disables. Since `prettierRecommended` is LAST, it wins — the v10 disables override the v9 disables. This is the correct behavior and produces the desired outcome (v10 disables active, `prettier/prettier: error` added).

**How to avoid:** No action required; order ensures correctness. Include both for belt-and-suspenders. [VERIFIED: eslint-plugin-prettier/recommended.js source — `const { rules } = require('eslint-config-prettier')` is the v10 version]

### Pitfall 6: `vue-eslint-parser@7` String-Only Parser Delegation (RISK: HIGH)

**What goes wrong:** `vue-eslint-parser@7`'s internal `parseScript()` function reads `parserOptions.parser`:
```javascript
const parser = typeof parserOptions.parser === "string"
    ? require(parserOptions.parser)
    : require("espree");  // FALLBACK if not a string
```
If flat config passes `parserOptions.parser` as an imported module object (not a string), v7 silently falls back to espree for `<script>` block parsing. This loses `@babel/eslint-parser` class-property syntax support and TypeScript preset support.

**Root cause:** FlatCompat's `translateESLintRC` copies `parserOptions` as-is from the rc config into `languageOptions.parserOptions`. If the legacy rc's `parserOptions.parser` was the string `'@babel/eslint-parser'`, FlatCompat preserves it as a string in `languageOptions.parserOptions.parser`. ESLint 9 then passes `languageOptions.parserOptions` as the `options` argument to `vue-eslint-parser@7`'s `parseForESLint()`. Since it's a string, `require('@babel/eslint-parser')` is called — delegation works. [VERIFIED: @eslint/eslintrc flat-compat.js source + vue-eslint-parser/index.js source]

**However:** If a native flat-config entry for `.vue` files is added with `languageOptions.parserOptions.parser: babelParser` (imported object), THAT entry's config overrides the FlatCompat-loaded config for `.vue` files. Since it's not a string, v7 falls back to espree.

**Solution:** For the `.vue` file parser override entry (Pattern 5), pass `parserOptions.parser` as the STRING `'@babel/eslint-parser'`, not the imported `babelParser` symbol. ESLint 9 does allow string values in `languageOptions.parserOptions` (it only requires `languageOptions.parser` itself to be an object).

**Empirical verification required:** After writing `eslint.config.js`, run:
```bash
npx eslint --no-fix src/renderer/views/Home.vue
```
and confirm: (a) no `"Parse error"` messages, (b) `vue/require-prop-types` rule still fires on props without types (confirms vue-eslint-parser is active for templates), (c) no espree-attributable parse errors on class syntax in `.vue` `<script>` blocks.

[VERIFIED: source inspection — HIGH confidence; empirical confirmation deferred to Wave 1]

### Pitfall 7: `@typescript-eslint@2` + `eslint-plugin-vue@6` Peer Warnings vs Runtime

**What goes wrong:** After `npm install --legacy-peer-deps eslint@^9`, npm prints peer conflict warnings for:
- `eslint-plugin-vue@6.2.2` peer: `eslint: ^5.0.0 || ^6.0.0` — conflict with eslint@9
- `@typescript-eslint/eslint-plugin@2.25.0` peer: `eslint: ^5.0.0 || ^6.0.0` — conflict
- `@typescript-eslint/parser@2.25.0` peer: `eslint: ^5.0.0 || ^6.0.0` — conflict
- `eslint-config-standard@14.1.1` peer: `eslint: >=6.2.2` — technically compatible but old
- `eslint-plugin-promise@4.2.1` peer: `eslint: >=5.16.0` — compatible
- `eslint-plugin-node@11.1.0` peer: `eslint: >=5.16.0` — compatible

**Runtime vs peer-range distinction:** Peer-range conflicts cause npm WARNINGS but do NOT prevent the package from loading. Neither `@typescript-eslint@2`'s plugin nor parser performs a runtime ESLint version check (confirmed by source inspection). `eslint-plugin-vue@6` similarly has no ESLint version assertion in its entry point. The plugins WILL load and function normally under ESLint 9 with `--legacy-peer-deps`. [VERIFIED: source inspection of all three packages in node_modules]

**Possible risk:** `eslint-plugin-standard@4` is listed as a peer of `eslint-config-standard@14` and is deprecated/no-op per CONTEXT.md. It will still load but contributes no rules. No runtime error expected. [ASSUMED based on CONTEXT.md; not source-verified in this session]

**How to handle:** Document expected peer warnings in commit 1 body. Add a note in `06-01-BASELINE.md` listing expected warnings.

---

## Code Examples

### Full eslint.config.js (verified patterns)

```javascript
// eslint.config.js — CJS (repo has no "type": "module")
// Source: assembled from [VERIFIED] sources below
'use strict';

const { FlatCompat } = require('@eslint/eslintrc');     // [VERIFIED: npm registry @eslint/eslintrc@3.3.5]
const globals = require('globals');                      // [VERIFIED: globals@15.15.0 source]
const babelParser = require('@babel/eslint-parser');     // [VERIFIED: @babel/eslint-parser peer eslint ^9]
const vueParser = require('vue-eslint-parser');          // [VERIFIED: vue-eslint-parser@7 installed]
const prettierRecommended = require('eslint-plugin-prettier/recommended'); // [VERIFIED: source inspection]
const path = require('path');

const compat = new FlatCompat({ baseDirectory: __dirname });  // [VERIFIED: Context7 ESLint docs]

module.exports = [
  // Global ignores — MUST be standalone (no other keys)
  // [VERIFIED: Context7 ESLint configuration-files.md]
  { ignores: ['bot/**', 'dist/**', 'node_modules/**', 'build/**'] },

  // Legacy extends chain via FlatCompat
  // [VERIFIED: Context7 ESLint migration-guide.md]
  ...compat.extends('plugin:vue/recommended', 'standard', 'prettier'),

  // Native config: globals (env migration) + parser + 4-rule overrides
  {
    files: ['**/*.{js,ts,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,    // replaces env: { browser: true }
        ...globals.es2015,     // replaces env: { es6: true } — es6=es2015 in globals pkg
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
      },
      parser: babelParser,
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        requireConfigFile: true,  // inherit .babelrc per Phase 5 D-05
      },
    },
    rules: {
      'generator-star-spacing': 'off',
      'semi': ['error', 'always'],
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    },
  },

  // Vue SFC parser override — string parser for vue-eslint-parser@7 compatibility
  // [VERIFIED: vue-eslint-parser@7 source parseScript() line 581]
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: '@babel/eslint-parser',  // MUST be string (not imported object)
        ecmaVersion: 2018,
        sourceType: 'module',
        requireConfigFile: true,
      },
    },
  },

  // Prettier full integration — LAST
  // [VERIFIED: eslint-plugin-prettier/recommended.js source inspection]
  prettierRecommended,
];
```

### Baseline Capture Command (pre-migration)

```bash
# Pre-migration baseline (still using .eslintrc.js + --ext flag)
# Run BEFORE any package.json changes (at pre-migration HEAD)
npx eslint --ext .js,.ts,.vue ./ --no-fix 2>&1 | grep -cE '^\s+[0-9]+:[0-9]+\s+(warning|error)'
# Captures same scope as Phase 5 (bot/ + dist/ excluded via .eslintignore)
# Expected: 722 (Phase 5 post-swap count per STATE.md)
```

### Baseline Capture Command (post-migration)

```bash
# Post-migration baseline (using eslint.config.js, no --ext)
npx eslint --no-fix ./ 2>&1 | grep -cE '^\s+[0-9]+:[0-9]+\s+(warning|error)'
# Scope controlled by ignores: ['bot/**', 'dist/**'] in flat config
# Expected: 722 + prettier/prettier delta (≤ 20 per CONTEXT.md D-10)
```

### Verification Command for Vue SFC Delegation

```bash
# Confirm vue-eslint-parser@7 is active and @babel/eslint-parser delegation works
npx eslint --no-fix src/renderer/views/Home.vue
# Pass criteria: (1) no "Parse error", (2) vue/require-prop-types rule fires if applicable
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.eslintrc.js` rc-format | `eslint.config.js` flat config | ESLint v9.0.0 (April 2024) | `.eslintrc.*` silently ignored by default; ESLint 9 only searches for `eslint.config.*` |
| `--ext .js,.ts,.vue` CLI flag | `files: ['**/*.{js,ts,vue}']` in config | ESLint v9.0.0 | Flag removed; exits with `"Invalid option '--ext'"` error code |
| `env:` key in config | `languageOptions.globals: { ...globals.browser }` | ESLint flat config (v8 beta, mandatory v9) | `env:` not valid in flat config; FlatCompat translates legacy env: entries |
| `parser: 'string'` in rc | `languageOptions.parser: importedModule` | ESLint flat config | String parser refs not valid in native flat config (only in FlatCompat-loaded entries) |
| `extends: ['prettier']` alone | `eslint-plugin-prettier/recommended` (last entry) | Phase 6 FMT-01 | Adds `prettier/prettier: error` rule; supersedes v1.3 Phase 4 Pitfall 4 minimum-scope workaround |
| `eslint-config-prettier@9` | `eslint-config-prettier@10` | FMT-02 | v10 adds `@stylistic/eslint-plugin` rule disables; same peer range (eslint >=7) |

**Deprecated/outdated:**
- `.eslintignore`: Not read by ESLint 9 flat config. Migrate to `ignores: [...]` in `eslint.config.js`.
- `eslintrc` format string config names (`"eslint:recommended"`, `"eslint:all"`): Use `@eslint/js` package in flat config. (Not used in this project — but the FlatCompat chain may encounter them if `eslint-config-standard@14` references them internally; FlatCompat handles this translation automatically.)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `eslint-plugin-standard@4` loads at runtime under ESLint 9 without errors (no version assertion in its code) | Pitfall 7 | If it throws, FlatCompat loading of `eslint-config-standard@14` would fail. Mitigation: test `npm run lint` after commit 2. |
| A2 | FlatCompat's propagation of `parserOptions.parser: '@babel/eslint-parser'` string from the legacy rc config into `languageOptions.parserOptions.parser` survives the translation and reaches vue-eslint-parser@7's `parseScript()` | Pitfall 6 | If FlatCompat strips or transforms this value, `<script>` blocks fall back to espree. Mitigation: empirical verification via Home.vue lint test in Wave 1. |
| A3 | `eslint-config-prettier@10.x` has the same ESLint >=7.0.0 peer requirement as v9 (no ESLint 9 requirement added) | Standard Stack (eslint-config-prettier) | The reason FMT-02 pairs with LINT-01 is semantic (both part of Phase 6), not a hard dependency. If v10 actually required ESLint 9, it would be a hard dependency — but this was verified as false. |

---

## Open Questions

1. **Does FlatCompat's translated `parserOptions.parser` survive as a string into vue-eslint-parser@7?**
   - What we know: FlatCompat source copies `parserOptions` fields with spread; the string value should be preserved. vue-eslint-parser@7 checks `typeof parserOptions.parser === "string"`.
   - What's unclear: Whether ESLint 9 internally processes/transforms `languageOptions.parserOptions` values before passing them to parsers.
   - Recommendation: Treat as a Wave 1 validation gate — run `npx eslint --no-fix src/renderer/views/Home.vue` after writing `eslint.config.js` and confirm no parse errors.

2. **Is `requireConfigFile: true` the correct parserOptions setting for flat config?**
   - What we know: Phase 5 D-05 established inheriting `.babelrc` without `requireConfigFile` explicitly set; the default is `true`. Flat config's `languageOptions.parserOptions` is passed to `@babel/eslint-parser` as-is.
   - What's unclear: Whether `@babel/eslint-parser`'s CJS entry point has any flat-config-specific behavior for `requireConfigFile`.
   - Recommendation: Set `requireConfigFile: true` explicitly to preserve Phase 5 D-05 semantics. If `@babel/eslint-parser` can't find `.babelrc` from the flat config context, it will throw — making the failure visible.

3. **Will `compat.extends('plugin:vue/recommended', 'standard', 'prettier')` (three args in one call) work, or does it need three separate calls?**
   - What we know: FlatCompat.extends() documentation shows it accepts multiple extends strings. The rc `extends: ['a', 'b', 'c']` pattern maps to `compat.extends('a', 'b', 'c')`.
   - What's unclear: Whether there are ordering semantics differences between single multi-arg call vs. three spread calls.
   - Recommendation: Single call is idiomatic; if issues arise, fall back to three separate `...compat.extends('plugin:vue/recommended')` etc. calls.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | @eslint/eslintrc@3 (engine: ^18.18.0 || ^20.9.0 || >=21.1.0) | ✓ | v24.12.0 | — |
| npm | Package install | ✓ | (in Node 24) | — |
| eslint@9 | To be installed | (not yet) | 9.39.4 target | — |
| @eslint/eslintrc@3 | FlatCompat | (not yet) | 3.3.5 target | — |
| globals@15 | languageOptions.globals | (v11 installed, not used) | 15.15.0 target | — |
| eslint-config-prettier@10 | prettierRecommended | (v9 installed) | 10.1.8 target | — |

**Missing dependencies with no fallback:** None — all are installable via npm with `--legacy-peer-deps`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest ^30.3.0 |
| Config file | `jest` key in `package.json` (testPathIgnorePatterns) |
| Quick run command | `npm run jest` |
| Full suite command | `npm run jest` (same — no test:ci variant) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LINT-01 | eslint --no-fix ./ runs without errors | smoke | `npx eslint --no-fix --max-warnings 9999 ./ 2>&1; echo $?` | N/A (CLI check) |
| LINT-01 | --ext flag gone from npm run lint | smoke | `grep -c "\-\-ext" package.json` → 0 | N/A (grep) |
| LINT-02 | .eslintrc.js deleted | smoke | `test ! -f .eslintrc.js && echo PASS` | N/A |
| LINT-02 | Post-migration lint count ≤ 1881 | smoke | `npx eslint --no-fix ./ 2>&1 \| grep -cE '^\s+[0-9]+:[0-9]+\s+(warning\|error)'` | N/A |
| LINT-02 | Vue SFC template linting intact | smoke | `npx eslint --no-fix src/renderer/views/Home.vue` (no parse errors) | N/A |
| FMT-01 | prettier/prettier rule active (fires on format drift) | smoke | `npm run prettier -- --check` passes | N/A |
| FMT-01 | eslint-plugin-prettier/recommended is last entry | manual | inspect eslint.config.js | ✅ Wave 2 |
| FMT-02 | eslint-config-prettier at ^10 | smoke | `npm list eslint-config-prettier` → 10.x | N/A |
| ALL | 256/256 tests pass (no runtime regression) | full | `npm run jest` | ✅ existing |

### Sampling Rate

- **Per task commit:** `npx eslint --no-fix ./ 2>&1 | tail -5` (lint summary) + `npm run jest` (full 256/256)
- **Per wave merge:** Full lint count + `npm run prettier -- --check` + `npm run jest`
- **Phase gate (pre /gsd-verify-work):** All five SC verified:
  - SC1: `test ! -f .eslintrc.js && test -f eslint.config.js`
  - SC2: lint count ≤ 1881 (and ≤ 722 + prettier delta)
  - SC3: `npm list eslint-config-prettier | grep 10` && `eslint-plugin-prettier/recommended` is last entry
  - SC4: `npm run prettier -- --check` exits 0
  - SC5: `npm run jest` 256/256

### Wave 0 Gaps

No test file creation needed — this phase has no new application code. Validation is via CLI smoke commands, not new test files.

None — existing test infrastructure covers all regression checks for this phase.

---

## Security Domain

This phase is a dev-tooling configuration change only. No runtime code paths, authentication flows, data handling, or network requests are modified. ASVS categories V2–V6 do not apply. Input validation of lint rules is enforced by ESLint itself; no custom rule implementations are written in this phase.

| ASVS Category | Applies | Rationale |
|---------------|---------|-----------|
| V2 Authentication | No | Config-only change; no auth code touched |
| V3 Session Management | No | Config-only change |
| V4 Access Control | No | Config-only change |
| V5 Input Validation | No | ESLint itself validates config schema; no app input changes |
| V6 Cryptography | No | Config-only change |

---

## Sources

### Primary (HIGH confidence)

- `npm view eslint dist-tags` — confirmed `maintenance: 9.39.4` as latest ESLint 9.x [VERIFIED: npm registry]
- `npm view @eslint/eslintrc version` — confirmed 3.3.5 [VERIFIED: npm registry]
- `npm view globals dist-tags` — confirmed 17.5.0 latest; v15.15.0 for conservative pin [VERIFIED: npm registry]
- `npm view eslint-config-prettier dist-tags` — confirmed 10.1.8 latest [VERIFIED: npm registry]
- `npm view @babel/eslint-parser peerDependencies` — confirmed `eslint: ^7.5.0 || ^8.0.0 || ^9.0.0` [VERIFIED: npm registry]
- `npm view eslint-plugin-vue@6.2.2 peerDependencies` — confirmed `eslint: ^5.0.0 || ^6.0.0` (only, no 7+) [VERIFIED: npm registry]
- `npm view @typescript-eslint/eslint-plugin@2.25.0 peerDependencies` — confirmed `eslint: ^5.0.0 || ^6.0.0` [VERIFIED: npm registry]
- `npm view "@eslint/eslintrc@3.3.5" engines` — confirmed `node: ^18.18.0 || ^20.9.0 || >=21.1.0` [VERIFIED: npm registry]
- Context7 `/eslint/eslint` — migration guide, configuration-files.md, parser.md, language-options.md [VERIFIED: Context7]
- `node_modules/@eslint/eslintrc/lib/flat-compat.js` — FlatCompat source, `translateESLintRC` function, parser string resolution [VERIFIED: source inspection]
- `node_modules/vue-eslint-parser/index.js` lines 580–588 — `parseScript()` string-only parser check [VERIFIED: source inspection]
- `node_modules/@typescript-eslint/eslint-plugin/dist/index.js` — no version assertion [VERIFIED: source inspection]
- `node_modules/@typescript-eslint/parser/dist/parser.js` — no version assertion [VERIFIED: source inspection]
- `node_modules/eslint-plugin-prettier/recommended.js` — CJS flat-config object confirmed [VERIFIED: source inspection]
- `globals@15.15.0/index.js` via unpkg — `'use strict'; module.exports = require('./globals.json')` — CJS confirmed [VERIFIED: source inspection]
- `globals@17.5.0/index.js` via unpkg — same CJS pattern [VERIFIED: source inspection]
- `globals@15.15.0/globals.json` via GitHub — key listing confirms `es2015`, `es2017`, `browser`, `jest` all present; no `es6` key [VERIFIED: source inspection]

### Secondary (MEDIUM confidence)

- GitHub discussion #18280 `--ext arg stopped working after 9.0.0` — confirmed error message `"Invalid option '--ext'"` [CITED: github.com/eslint/eslint/discussions/18280]
- ESLint v9.0.0 migration guide at eslint.org — flat config is default; eslintrc silently ignored; `ESLINT_USE_FLAT_CONFIG=false` re-enables [CITED: eslint.org/docs/latest/use/migrate-to-9.0.0]
- `eslint-plugin-prettier` GitHub README — `require('eslint-plugin-prettier/recommended')` direct import for flat config [CITED: github.com/prettier/eslint-plugin-prettier]
- `eslint-config-prettier` CHANGELOG — v10.0.0 adds `@stylistic` rule support; peer range unchanged at `eslint: >=7.0.0` [CITED: github.com/prettier/eslint-config-prettier/blob/main/CHANGELOG.md]
- `vue-eslint-parser` README (installed v7) — `parserOptions.parser` string delegation documented [CITED: node_modules/vue-eslint-parser/README.md]
- ESLint compatibility utilities blog post — `fixupConfigRules` from `@eslint/compat` for plugin API mismatches (distinct from FlatCompat, not needed for this project's plugins) [CITED: eslint.org/blog/2024/05/eslint-compatibility-utilities/]

### Tertiary (LOW confidence)

- Web search results on `eslint-config-standard@14` + FlatCompat + ESLint 9 — no confirmed working reproduction in a project with identical deps to this one; behavior inferred from FlatCompat design + source inspection [LOW — flag for Wave 1 empirical validation]

---

## Metadata

**Confidence breakdown:**
- Standard Stack (version pins): HIGH — all verified via npm registry
- Architecture (FlatCompat shape): HIGH — verified via Context7 + source inspection
- Parser delegation (vue-eslint-parser@7 string check): HIGH (source verified) + empirical validation required in Wave 1
- Pitfalls: HIGH (source-backed) + MEDIUM (community reports for eslint-config-standard@14 runtime)
- Security: N/A (config-only phase)

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (stable library ecosystem; ESLint 9.x receives regular patches but no API changes)
