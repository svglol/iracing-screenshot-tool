'use strict';

const { FlatCompat } = require('@eslint/eslintrc');
const { fixupConfigRules } = require('@eslint/compat');
const globals = require('globals');
const babelParser = require('@babel/eslint-parser');
const vueParser = require('vue-eslint-parser');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const tseslint = require('typescript-eslint');

const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
	// 1. Global ignores (replaces .eslintignore; must be standalone per research Pitfall 2)
	//    bot/** — Phase 5 D-01 + D-17 (bot/ owns its own lint tooling; v1.4 root lint stack excludes it)
	//    dist/** — Phase 5 Rule-2 + D-18 (generated webpack bundle output; lint-excluded for hygiene)
	//    node_modules/** + build/** — conventional excludes
	//    .planning/** + .tools/** + .tmp-inspect/** — dotfile dirs auto-ignored by ESLint 7 default
	//      but NOT by ESLint 9 flat config. Rule-2 auto-add to preserve D-09/D-10 scope parity with
	//      06-01-BASELINE.md (722-count denominator was captured with ESLint 7's default dotfile
	//      ignoring — these dirs hold planning docs, electron-builder tool caches, and inspected
	//      tarball extracts respectively; none are source code).
	{
		ignores: [
			'bot/**',
			'dist/**',
			'node_modules/**',
			'build/**',
			'.planning/**',
			'.tools/**',
			'.tmp-inspect/**',
		],
	},

	// 2. Legacy extends chain via FlatCompat + @eslint/compat fixupConfigRules.
	//    D-01 Amendment (2026-04-22) — eslint-plugin-vue bumped 6 → 9 during 06-02 execution because
	//    v6 crashed under ESLint 9 via removed codePath.currentSegments API. @eslint/compat
	//    fixupConfigRules wraps the FlatCompat-loaded rules so the other legacy plugins
	//    (eslint-plugin-node@11, eslint-plugin-promise@4, @typescript-eslint@2 via eslint-config-standard)
	//    get ESLint-7-API shims (context.getScope, context.getAncestors, context.getDeclaredVariables,
	//    context.markVariableAsUsed, context.parserServices) delegating to the modern sourceCode.*
	//    equivalents without upgrading those plugins (D-01 intent preserved for non-vue plugins).
	//    - plugin:vue/recommended (from eslint-plugin-vue@^9.33.0 — Vue 2 rule set preserved)
	//    - standard (from eslint-config-standard@14.1.1; pulls in node/promise/import plugins)
	//    D-07 (Phase 7): 'prettier' removed from chain; prettierRecommended (entry 6) handles
	//    prettier-vs-lint disables natively via eslint-config-prettier@10 bundled inside it.
	...fixupConfigRules(
		compat.extends('plugin:vue/recommended', 'standard')
		// D-07 (Phase 7): 'prettier' dropped from this chain. prettierRecommended
		// (last entry) handles prettier-vs-lint disables natively via bundled
		// eslint-config-prettier@10. Dropping the duplicate keeps the config lean
		// and eliminates one FlatCompat-mediated legacy coupling.
	),

	// 3. Native languageOptions + 4-rule overrides (D-02 — preserves every legacy .eslintrc.js rule verbatim)
	//    languageOptions.globals replaces legacy env: { browser: true, es6: true } + globals: {...}
	//    languageOptions.parser replaces legacy parserOptions.parser string
	//    languageOptions.parserOptions merges legacy ecmaVersion/sourceType + explicit requireConfigFile
	{
		files: ['**/*.{js,ts,vue}'],
		languageOptions: {
			globals: {
				...globals.browser, // replaces env: { browser: true }
				...globals.es2015, // replaces env: { es6: true } — es6 maps to es2015 in globals pkg
				//   (NOT globals.es2017 which would duplicate Atomics/SharedArrayBuffer)
				Atomics: 'readonly',
				SharedArrayBuffer: 'readonly',
			},
			parser: babelParser,
			parserOptions: {
				ecmaVersion: 2018,
				sourceType: 'module',
				requireConfigFile: true, // inherit .babelrc per Phase 5 D-05 carryover
			},
		},
		rules: {
			// allow async-await
			'generator-star-spacing': 'off',
			semi: ['error', 'always'],
			// allow debugger during development
			'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
		},
	},

	// 4. Vue SFC parser override — vue-eslint-parser@7 delegates <script> to parserOptions.parser as STRING
	//    (research Pitfall 6 HIGH RISK: v7's parseScript checks `typeof parserOptions.parser === 'string'`
	//    and falls back to espree if not a string. MUST use the string '@babel/eslint-parser' here,
	//    NOT the imported babelParser symbol from above.)
	{
		files: ['**/*.vue'],
		languageOptions: {
			parser: vueParser,
			parserOptions: {
				parser: '@babel/eslint-parser', // STRING — required by vue-eslint-parser@7 (Pitfall 6)
				ecmaVersion: 2018,
				sourceType: 'module',
				requireConfigFile: true,
			},
		},
	},

	// 5. typescript-eslint 8 native flat-config entry — scoped to .ts files only
	//    (D-06: use native exports, NOT FlatCompat; D-08: files: ['**/*.ts'] scope;
	//     D-09: @typescript-eslint/parser for .ts files inside the helper).
	//    tseslint.config() helper is MANDATORY here — it propagates files: ['**/*.ts']
	//    into every inner config in the extends array, INCLUDING the recommended set's
	//    base config which would otherwise set languageOptions.parser globally and
	//    break @babel/eslint-parser for every .js and .vue file (research Pitfall 1).
	//    Project has ZERO .ts files at v1.4 close (D-08) so these rules stay dormant
	//    until a .ts file is added post-v1.4. Using non-type-checked recommended
	//    (not recommendedTypeChecked) — type-checked variant needs parserOptions.project
	//    and invokes the TS compiler API per file, which is overkill for dormant rules.
	...tseslint.config({
		files: ['**/*.ts'],
		extends: [tseslint.configs.recommended],
	}),

	// 6. Prettier full integration (FMT-01 — supersedes v1.3 Phase 4 Pitfall 4 minimum-scope derogation)
	//    MUST be LAST entry so eslint-config-prettier's disables (bundled in prettierRecommended from v10)
	//    win any format-vs-lint conflicts from the 'standard' or 'vue/recommended' chains above.
	//    Adds prettier/prettier: 'error' rule — format drift surfaces as ESLint errors.
	prettierRecommended,
];
