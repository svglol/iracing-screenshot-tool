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

			// `require()` is the deliberate convention here, not an oversight.
			// Renderer SFCs pull electron in through it (this app still runs with
			// nodeIntegration; the contextIsolation migration is tracked separately),
			// and in utilities/logger.ts + utilities/config.ts it is load-bearing:
			// those modules are stubbed in vitest by planting into Node's
			// require.cache, which only works while the call really is a require().
			// Rewriting them to `import` would break the test suite.
			'@typescript-eslint/no-require-imports': 'off',

			// `void somePromise()` is the codebase's explicit "fire and forget, I
			// know this is floating" marker. allowAsStatement keeps the rule's real
			// job — catching `void` in an expression position — while permitting it.
			'no-void': ['error', { allowAsStatement: true }],

			// Timer handles declared up front, read by a cleanup closure defined
			// before them, then assigned once when the watch actually starts, cannot
			// be const — the read precedes the assignment. ignoreReadBeforeAssign is
			// the option for exactly that shape.
			'prefer-const': ['error', { ignoreReadBeforeAssign: true }],

			// `const { data, ...rest } = entry` is the standard way to build an
			// object minus one key — the binding is meant to be discarded, and
			// ignoreRestSiblings is the option that exists for it. argsIgnorePattern
			// keeps an explicit `_unused` parameter available where a callback's
			// signature is fixed by its caller.
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					ignoreRestSiblings: true,
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],

			// TODO: 21 sites, mostly IPC payloads and Electron event objects that
			// need real interface definitions. Downgraded rather than silenced so the
			// count stays visible; promote back to 'error' once they are typed.
			'@typescript-eslint/no-explicit-any': 'warn',

			// Home.vue, Worker.vue and Settings.vue are established route/view names
			// that appear in the router config and in user-facing docs. Renaming them
			// to satisfy a naming convention is churn with no benefit.
			'vue/multi-word-component-names': 'off',
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

	// 6b. Vitest globals for the _scripts test files. Entry 6 gives _scripts/**/*.js
	//     only `globals.node`, so describe/test/expect read as undefined there — the
	//     src/**/*.test.ts files never showed this because typescript-eslint turns
	//     no-undef off for TS (the compiler already checks it).
	{
		files: ['_scripts/**/*.test.js'],
		languageOptions: {
			globals: {
				describe: 'readonly',
				it: 'readonly',
				test: 'readonly',
				expect: 'readonly',
				vi: 'readonly',
				suite: 'readonly',
				beforeAll: 'readonly',
				afterAll: 'readonly',
				beforeEach: 'readonly',
				afterEach: 'readonly',
			},
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
