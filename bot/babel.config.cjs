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
	]
};
