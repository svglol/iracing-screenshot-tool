import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	main: {
		plugins: [externalizeDepsPlugin()],
		build: {
			rollupOptions: {
				external: [
					'electron',
					'@electron/remote',
					'electron-updater',
					'irsdk-node',
					'sharp',
				],
			},
			commonjsOptions: {
				include: [/node_modules/, /src\//],
				transformMixedEsModules: true,
			},
		},
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src'),
				src: resolve(__dirname, 'src'),
			},
		},
		define: {
			__static: JSON.stringify(
				resolve(__dirname, 'static').replace(/\\/g, '\\\\')
			),
			'process.env.PRODUCT_NAME': JSON.stringify('iRacing Screenshot Tool'),
		},
	},
	renderer: {
		root: resolve(__dirname, 'src/renderer'),
		plugins: [vue()],
		build: {
			rollupOptions: {
				external: ['electron', '@electron/remote', 'sharp'],
			},
		},
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src'),
				src: resolve(__dirname, 'src'),
			},
		},
		css: {
			preprocessorOptions: {
				scss: {
					loadPaths: [resolve(__dirname, 'node_modules')],
					// Custom importer bypasses sass-embedded's package-exports check
					// for @oruga-ui/theme-bulma's `dist/scss/*` subpath — the exports
					// map key `./dist/scss/*.scss` requires a trailing `.scss` that
					// sass-embedded strips during resolution (Phase 8 Plan 03 scar tissue
					// carried forward — webpack's sass-loader bypassed exports entirely
					// via loadPaths, but Vite's sass integration enforces exports first).
					importers: [
						{
							findFileUrl(url) {
								if (url.startsWith('@oruga-ui/theme-bulma/')) {
									const rel = url.replace(
										'@oruga-ui/theme-bulma/',
										''
									);
									const absPath = resolve(
										__dirname,
										'node_modules/@oruga-ui/theme-bulma',
										rel
									);
									return new URL(
										`file:///${absPath.replace(/\\/g, '/')}`
									);
								}
								return null;
							},
						},
					],
				},
			},
		},
		define: {
			__static: JSON.stringify('/static'),
			'process.env.PRODUCT_NAME': JSON.stringify('iRacing Screenshot Tool'),
			__VUE_OPTIONS_API__: 'true',
			__VUE_PROD_DEVTOOLS__: 'false',
		},
	},
});
