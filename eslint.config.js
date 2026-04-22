'use strict';

const globals = require('globals');
const babelParser = require('@babel/eslint-parser');
const tseslintParser = require('@typescript-eslint/parser');
const vueParser = require('vue-eslint-parser');
const vuePlugin = require('eslint-plugin-vue');
const neostandard = require('neostandard');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const tseslint = require('typescript-eslint');

module.exports = [
	// 1. Global ignores — UNCHANGED from Phase 11.
	//    bot/** owns its own lint tooling (Phase 5 D-01 + D-17); dist/out/build are generated
	//    bundler output (Phase 9); .planning/.tools/.tmp-inspect hold non-source artifacts.
	{
		ignores: [
			'bot/**',
			'dist/**',
			'out/**',
			'node_modules/**',
			'build/**',
			'.planning/**',
			'.tools/**',
			'.tmp-inspect/**',
		],
	},

	// 2. Neostandard flat-config (D-11-01 / D-11-07) — replaces the v1.4-era compat bridge.
	//    `noStyle: true` defers ALL stylistic rules to prettier (entry 8) so there are no
	//    prettier-vs-neostandard format conflicts.
	...neostandard({ noStyle: true }),

	// 3. eslint-plugin-vue@10 flat/recommended (D-11-02 / D-11-08) — Vue 3 recommended ruleset.
	//    In v10, `flat/recommended` IS the Vue 3 variant; Vue-2 variants are `flat/vue2-*`.
	...vuePlugin.configs['flat/recommended'],

	// 4. typescript-eslint PRIMARY for .ts/.vue (Phase 12 D-12-03 / REQ TS-04).
	//    Inverts the Phase 11 relationship: was babelParser primary + tseslint scoped to .ts;
	//    now tseslintParser primary for .ts/.vue; babelParser scoped to _scripts/ (entry 6).
	//
	//    NOTE: `parserOptions.project: './tsconfig.json'` deliberately OMITTED — enables
	//    type-aware rules (@typescript-eslint/no-unsafe-* family) which 10x-amplifies lint
	//    count. Type-aware rules are a v2.1 candidate; Phase 12 scope is parser swap only.
	...tseslint.config({
		files: ['**/*.{ts,vue}'],
		extends: [tseslint.configs.recommended],
		languageOptions: {
			parser: tseslintParser,
			parserOptions: {
				ecmaVersion: 2022,
				sourceType: 'module',
				extraFileExtensions: ['.vue'],
			},
			globals: {
				...globals.browser,
				...globals.es2021,
				Atomics: 'readonly',
				SharedArrayBuffer: 'readonly',
			},
		},
		rules: {
			'generator-star-spacing': 'off',
			semi: ['error', 'always'],
			'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
		},
	}),

	// 5. Vue SFC parser override — vueParser outer, tseslintParser inner (was babelParser inner in Phase 11).
	{
		files: ['**/*.vue'],
		languageOptions: {
			parser: vueParser,
			parserOptions: {
				parser: tseslintParser,
				ecmaVersion: 2022,
				sourceType: 'module',
				extraFileExtensions: ['.vue'],
			},
		},
	},

	// 6. @babel/eslint-parser SCOPED to _scripts/ (D-12-03) — retains babelParser for
	//    _scripts/build-dev.js + release.js. NSIS installer.nsh is not JS; lint ignores naturally.
	{
		files: ['_scripts/**/*.js'],
		languageOptions: {
			parser: babelParser,
			parserOptions: {
				ecmaVersion: 2018,
				sourceType: 'module',
				requireConfigFile: true,
			},
			globals: {
				...globals.node,
			},
		},
		rules: {
			'generator-star-spacing': 'off',
			semi: ['error', 'always'],
		},
	},

	// 7. Root-level .js/.mjs/.cjs files (eslint.config.js itself, vitest.config.mjs,
	//    electron.vite.config.mjs) — espree default parser. No babel transforms needed.
	{
		files: ['*.{js,mjs,cjs}'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				...globals.node,
			},
		},
		rules: {
			'generator-star-spacing': 'off',
			semi: ['error', 'always'],
		},
	},

	// 8. Prettier integration (FMT-01) — MUST be LAST so eslint-config-prettier's disables
	//    (bundled in prettierRecommended) win any format-vs-lint conflict. `noStyle: true`
	//    in entry 2 already reduces the contention surface.
	prettierRecommended,
];
