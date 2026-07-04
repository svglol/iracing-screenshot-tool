import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
	// Compile .vue SFCs so renderer tests can import/mount them (cq-tests#4). Only
	// affects .vue transformation; .ts test files are untouched.
	plugins: [vue()],
	test: {
		globals: true,
		// Node is the default env (main-process + pure-utility tests). Renderer tests
		// opt into a DOM via a per-file `// @vitest-environment happy-dom` docblock
		// (vitest 4 dropped environmentMatchGlobs; per-file docblocks are the
		// supported replacement).
		environment: 'node',
		include: ['src/**/*.test.{js,ts}', '_scripts/**/*.test.{js,ts}'],
		exclude: [
			'node_modules/**',
			'.tools/**',
			'dist/**',
			'build/**',
			'out/**',
			'bot/**',
		],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov'],
			exclude: [
				'node_modules/**',
				'.tools/**',
				'dist/**',
				'build/**',
				'out/**',
				'bot/**',
				'**/*.test.js',
				'**/*.config.*',
			],
		},
	},
});
