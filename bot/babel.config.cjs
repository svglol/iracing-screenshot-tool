'use strict';

// Only applied under Jest — the bot runtime uses native ESM directly.
// Jest 25 cannot parse native ESM, so we transpile test files to CJS.
module.exports = {
	presets: [
		[
			'@babel/preset-env',
			{
				targets: { node: 'current' }
			}
		]
	],
	// `import.meta.url` is used by entrypoint / loader modules to resolve
	// paths relative to the current file. Babel's CJS transform has no native
	// equivalent, so rewrite it to `require('url').pathToFileURL(__filename)`
	// under Jest only. The bot runtime is native ESM; this plugin only runs
	// here because babel is only invoked by babel-jest.
	plugins: ['babel-plugin-transform-import-meta']
};
