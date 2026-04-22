'use strict';

const globals = require('globals');
const babelParser = require('@babel/eslint-parser');
const vueParser = require('vue-eslint-parser');
const vuePlugin = require('eslint-plugin-vue');
const neostandard = require('neostandard');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const tseslint = require('typescript-eslint');

module.exports = [
	// 1. Global ignores — UNCHANGED from v1.4 Phase 6 / Phase 10 close.
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

	// 2. Neostandard flat-config (D-11-01 / D-11-07) — replaces the v1.4-era compat bridge
	//    (retired in Phase 11) plus eslint-config-standard@14 / eslint-plugin-import@2 /
	//    eslint-plugin-node@11 / eslint-plugin-promise@4 / eslint-plugin-standard@4.
	//    `noStyle: true` defers ALL stylistic rules to prettier (entry 7) so there are no
	//    prettier-vs-neostandard format conflicts.
	...neostandard({ noStyle: true }),

	// 3. eslint-plugin-vue@10 flat/recommended (D-11-02 / D-11-08) — Vue 3 recommended ruleset.
	//    In v10, `flat/recommended` IS the Vue 3 variant; Vue-2 variants are explicitly
	//    prefixed `flat/vue2-*`. Returns an ARRAY — spread with `...`.
	...vuePlugin.configs['flat/recommended'],

	// 4. Native languageOptions + 3-rule overrides for .js/.ts/.vue (preserves v1.4 Phase 6 D-02).
	//    languageOptions.globals replaces legacy env: { browser: true, es6: true } + globals: {...}
	//    parser: babelParser — primary parser for .js/.vue until Phase 12 TS migration.
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
			// allow async-await
			'generator-star-spacing': 'off',
			semi: ['error', 'always'],
			// allow debugger during development
			'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
		},
	},

	// 5. Vue SFC parser override (D-11-03) — vue-eslint-parser@10 takes parserOptions.parser
	//    as an OBJECT reference. The pre-Phase-11 v7 required the STRING '@babel/eslint-parser'
	//    (Pitfall 6 in old config). v10 retires the string-hack.
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
	//    tseslint.config() helper is MANDATORY — without it, tseslint.configs.recommended
	//    sets languageOptions.parser globally and would override @babel/eslint-parser for
	//    all .js/.vue files (v1.4 Phase 6 Pitfall 1). Zero .ts files at Phase 11 open;
	//    rules stay dormant until Phase 12.
	...tseslint.config({
		files: ['**/*.ts'],
		extends: [tseslint.configs.recommended],
	}),

	// 7. Prettier integration (FMT-01) — MUST be LAST so eslint-config-prettier's disables
	//    (bundled in prettierRecommended) win any format-vs-lint conflict. `noStyle: true`
	//    in entry 2 already reduces the contention surface.
	prettierRecommended,
];
