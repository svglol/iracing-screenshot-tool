'use strict';
const Store = require('electron-store');

module.exports = new Store({
	defaults: {
		resolution: {
			type: 'number',
			default: 0
		},
		crop: {
			type: 'boolean',
			default: true
		},
		customWidth: {
			type: 'number',
			default: 0
		},
		customHeight: {
			type: 'number',
			default: 0
		},
		winPosX: {
			type: 'number',
			default: 0
		},
		winPosY: {
			type: 'number',
			default: 0
		},
		winWidth: {
			type: 'number',
			default: 1280
		},
		winHeight: {
			type: 'number',
			default: 720
		}
	}
});
