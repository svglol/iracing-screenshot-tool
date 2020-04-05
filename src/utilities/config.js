'use strict';
const Store = require('electron-store');

module.exports = new Store({
	defaults: {
		resolution: {
			type: 'string',
			default: '1080p'
		},
		crop: {
			type: 'boolean',
			default: true
		},
		customWidth: {
			type: 'number',
			default: 1920
		},
		customHeight: {
			type: 'number',
			default: 1080
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
