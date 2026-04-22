import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/*.test.{js,ts}'],
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
