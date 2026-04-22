# Phase 11: ESLint/Vue Ecosystem Cleanup — Context

**Gathered:** 2026-04-22
**Status:** Ready for planning
**Mode:** Auto-generated (`--auto`) — recommended defaults selected per gray area.

<domain>
## Phase Boundary

Modernize the ESLint ecosystem now that Vue 3 + Vite + Vitest are in place. Concretely:
1. `eslint-plugin-vue` 9.33 → 10.x (v10 adds Vue 3 first-class rules)
2. `vue-eslint-parser` 7 → 9 (native flat-config compatible — retires Pitfall 6 `parser: 'string'` hack)
3. `eslint-config-standard` 14 → `neostandard` (flat-config native; `eslint-config-standard` 14 is abandoned; ESLint-9-era rulesets live in the neostandard fork)
4. Remove `@eslint/compat fixupConfigRules` shim + `@eslint/eslintrc FlatCompat` — with all plugins upgraded, no legacy-API wrapping needed
5. Retire four dead/superseded plugins: `eslint-plugin-import@2` (subsumed by neostandard via `eslint-plugin-import-x`), `eslint-plugin-node@11` (replace with `eslint-plugin-n` if needed), `eslint-plugin-promise@4` (either keep at latest or drop — rules likely redundant with neostandard), `eslint-plugin-standard@4` (no-op — retired when standard migrates)
6. `eslint.config.js` rewrites to flat-config-native composition (no FlatCompat, no fixupConfigRules)

**In scope:** `eslint.config.js`, package.json ESLint devDependencies, any `.prettierrc*` if still present.

**Out of scope:** TypeScript migration (Phase 12); actual code fixes for new lint warnings; lint count tuning (the ≤1881 band is the ceiling; decrease is nice-to-have).

</domain>

<carryforward>
## Prior Decisions Carried Forward

From v1.4 + Phase 8-10:
- D-04/D-09-10/D-10-10 bisect discipline: dep swaps commit separately from content
- No `Co-Authored-By`, no `--no-verify`, explicit `git add <path>`
- `bot/**` pre-existing dirty untouched; `bot/` has its own lint config (separate)
- LINT-03: `npm install` clean with zero ERESOLVE, no `--legacy-peer-deps`
- Lint band ≤1881 — current is 734 (well under) — goal is stay under
- No breaking config changes to `.vue` SFC parsing (Vue 3 SFCs compile clean per Phase 8 close)

From current `eslint.config.js`:
- Flat-config entry order: ignores → extends → native languageOptions → `.vue` override → tseslint scoped config → `prettierRecommended` LAST
- `@babel/eslint-parser` is primary for `.js/.vue`; `@typescript-eslint/parser` scoped to `**/*.ts` via `tseslint.config()` helper
- 3 rule overrides: `generator-star-spacing: off`, `semi: ['error', 'always']`, `no-debugger: conditional`
- `globals.browser` + `globals.es2015` + explicit Atomics/SharedArrayBuffer

</carryforward>

<decisions>
## Implementation Decisions

### D-11-01 — ruleset migration: `eslint-config-standard@14` → `neostandard@^x`
**Rationale:** `eslint-config-standard` 17 does exist but `neostandard` is the explicit flat-config successor (same maintainers recommend it). Drop-in `neostandard()` factory function takes options (`{ noStyle: true }` to defer formatting to prettier which we already wire via `prettierRecommended`). Neostandard bundles `eslint-plugin-import-x`, `eslint-plugin-n`, `eslint-plugin-promise` — so all three legacy plugins can be deleted.

### D-11-02 — `eslint-plugin-vue@10`
**Rationale:** v10 is Vue-3-first and flat-config native; current `plugin:vue/recommended` ruleset continues to work. Dogmatic Vue 3 rules (e.g., `vue/multi-word-component-names` — we already have PascalCase component refs post-Phase 8) enforced by default. If new warnings flood lint output, disable specific rules in entry 3 (the rule-overrides block).

### D-11-03 — `vue-eslint-parser@9`
**Rationale:** Current v7 forces the `parser: '@babel/eslint-parser'` string-hack (Pitfall 6 in existing config). v9 accepts a direct parser object reference — cleaner config.

### D-11-04 — Remove FlatCompat + fixupConfigRules
**Rationale:** Every plugin in the chain is now flat-config native (vue@10, neostandard). `@eslint/eslintrc` FlatCompat and `@eslint/compat` fixupConfigRules are no longer load-bearing — both can be uninstalled. Removing them lets `eslint.config.js` use native `import` semantics throughout.

### D-11-05 — Plugin retirements (4 deps)
**Remove:**
- `eslint-plugin-import@2` — replaced by `eslint-plugin-import-x` (bundled inside neostandard)
- `eslint-plugin-node@11` — replaced by `eslint-plugin-n` (bundled inside neostandard)
- `eslint-plugin-promise@4` — bundled inside neostandard; remove explicit pin
- `eslint-plugin-standard@4` — dead package (ESLint 7 era); neostandard doesn't need it
- `@eslint/compat` — no longer needed (D-11-04)
- `@eslint/eslintrc` — no longer needed (D-11-04)

**Keep (unchanged):**
- `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` + `typescript-eslint` (Phase 12 fodder)
- `@babel/eslint-parser` + `@babel/core` (primary parser for `.js/.vue` until Phase 12)
- `eslint-config-prettier` (bundled inside `eslint-plugin-prettier/recommended`)
- `eslint-plugin-prettier` (prettierRecommended)
- `globals`

### D-11-06 — `eslint.config.js` rewrite target (canonical shape)

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
  // 1. Global ignores (unchanged from current)
  {
    ignores: [
      'bot/**', 'dist/**', 'out/**', 'node_modules/**',
      'build/**', '.planning/**', '.tools/**', '.tmp-inspect/**',
    ],
  },

  // 2. Neostandard flat-config (replaces FlatCompat + fixupConfigRules + standard + import + node + promise)
  ...neostandard({ noStyle: true }),

  // 3. Vue plugin flat-config (vue/vue3-recommended or vue/recommended — latest)
  ...vuePlugin.configs['flat/recommended'],

  // 4. Native languageOptions + rule overrides for .js/.vue
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

  // 5. .vue SFC parser override (vue-eslint-parser@9 — parser object, not string)
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: babelParser,  // object reference, not string — v9 change
        ecmaVersion: 2018,
        sourceType: 'module',
        requireConfigFile: true,
      },
    },
  },

  // 6. typescript-eslint 8 scoped to .ts (unchanged)
  ...tseslint.config({
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
  }),

  // 7. Prettier full integration LAST (unchanged)
  prettierRecommended,
];
```

### D-11-07 — `neostandard({ noStyle: true })`
**Rationale:** `noStyle: true` disables all stylistic rules in neostandard — we rely on prettier for formatting. Without `noStyle`, prettier-vs-neostandard conflicts surface (semicolons, quote style, indent, etc.). `prettierRecommended` as entry 7 catches any survivors, but `noStyle` is the cleaner path.

### D-11-08 — Vue ruleset: `flat/recommended` vs `flat/vue3-recommended`
**Rationale:** `vue-plugin@10` exposes both. `flat/recommended` is a safer default (doesn't force Vue 3-specific rules like `vue/block-order` which may trigger noisy warnings). Start with `flat/recommended`; upgrade to `flat/vue3-recommended` in a follow-up if desired. Keep lint count change tractable.

### D-11-09 — Bisect shape: two commits
1. `chore(deps): swap eslint ecosystem — neostandard, vue 10, vue-parser 9; retire compat shims + dead plugins`
2. `refactor(lint): rewrite eslint.config.js for flat-config-native composition`

If lint count changes significantly and specific rules need disabling, add a 2b: `chore(lint): disable N new rules surfaced by ecosystem upgrade` (scope permitting).

### Claude's Discretion
- Exact neostandard version pinning — latest stable at plan time
- Whether to bump any `@babel/*` packages alongside (likely no — Phase 12 handles parser swap when TS becomes primary)
- Whether lint count increases are acceptable within ≤1881 ceiling (yes, but flag if >300 increase; revisit rule disables)

</decisions>

<code_context>
## Existing Code Insights

### Current ESLint-ecosystem devDeps (16 entries to prune/swap)
From package.json:
- `@babel/eslint-parser` — KEEP
- `@eslint/compat` — **REMOVE** (D-11-04)
- `@eslint/eslintrc` — **REMOVE** (D-11-04)
- `@typescript-eslint/eslint-plugin` — KEEP
- `@typescript-eslint/parser` — KEEP
- `eslint` — KEEP (bump to latest 9.x if available)
- `eslint-config-prettier` — KEEP (transitive via prettierRecommended)
- `eslint-config-standard` — **REMOVE** (D-11-01)
- `eslint-plugin-import` — **REMOVE** (D-11-05)
- `eslint-plugin-node` — **REMOVE** (D-11-05)
- `eslint-plugin-prettier` — KEEP
- `eslint-plugin-promise` — **REMOVE** (D-11-05)
- `eslint-plugin-standard` — **REMOVE** (D-11-05)
- `eslint-plugin-vue` — BUMP to ^10
- `neostandard` — **ADD**
- `typescript-eslint` — KEEP
- `vue-eslint-parser` — BUMP to ^9

Net: 5 removals + 1 addition + 2 bumps = 6-dep delta in package.json.

### `eslint.config.js` structure (9 sections, 125 lines)
Currently uses:
- FlatCompat (entry 2) — `compat.extends('plugin:vue/recommended', 'standard')` wrapped in `fixupConfigRules`
- Explicit `@babel/eslint-parser` for `.js/.vue`
- Explicit `vue-eslint-parser` + string-hack parser override for `.vue`
- `tseslint.config()` helper (entry 5) — preserved verbatim
- `prettierRecommended` LAST (entry 6)

Target structure keeps the same 7 entries but:
- Entry 2 becomes `...neostandard(...)` (native, no FlatCompat)
- Entry 3 (new) becomes `...vuePlugin.configs['flat/recommended']`
- Entry 5 drops the string-hack (v9 takes object parser)
- FlatCompat + fixupConfigRules disappear

### Integration points
- `npm run lint` → `eslint --fix ./` — unchanged command
- `prettier --write` script unchanged
- `.babelrc` + `babel.config.js` unchanged (Phase 5's Babel baseline)
- No other CI/docs reference ESLint config

</code_context>

<specifics>
## Specific Requirements (ROADMAP Phase 11 success criteria)

1. `eslint-plugin-vue` at `^10.x`; `vue-eslint-parser` at `^9.x`; `plugin:vue/vue3-recommended` (or `flat/recommended`) active
2. `eslint-config-standard` replaced by `neostandard`; flat-config-native
3. `@eslint/compat` and `fixupConfigRules` wrap removed; legacy plugins removed
4. `npm run lint` runs clean under the new stack; count in v1.4 band (≤1881)
5. `npm test` 256/256 (Vitest); builds clean

</specifics>

<deferred>
## Deferred Ideas

- Bump ESLint to 9.40+ if available — tactical dep-minor
- Adopt `vue/vue3-recommended` ruleset instead of `vue/recommended` — noisier; defer
- Adopt `@stylistic/eslint-plugin` for formatting rules instead of prettier — prettier stays canonical
- Replace `@babel/eslint-parser` with `@typescript-eslint/parser` as primary — Phase 12 scope

</deferred>

<canonical_refs>
- `.planning/phases/11-eslint-vue-cleanup/11-CONTEXT.md` (this file)
- `.planning/ROADMAP.md` §"Phase 11 (was 14): ESLint/Vue ecosystem cleanup"
- `.planning/REQUIREMENTS.md` §LINT-04..08
- `eslint.config.js` (current 125-line flat-config)
- `package.json` (devDependencies ESLint ecosystem block)
- https://github.com/neostandard/neostandard (neostandard docs)
- https://eslint.vuejs.org/user-guide/#flat-config (eslint-plugin-vue v10 flat-config docs)
- https://github.com/vuejs/vue-eslint-parser (vue-eslint-parser v9 migration)

</canonical_refs>
