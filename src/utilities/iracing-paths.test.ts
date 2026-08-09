import {
	resolveIracingFolder,
	getIracingFolder,
	getRendererIniPath,
	getDocumentsDir,
	resetDocumentsDirCache,
	RENDERER_INI_NAME,
} from './iracing-paths';

const path = require('path');
const os = require('os');

describe('resolveIracingFolder', () => {
	test('appends the iRacing folder to the documents dir', () => {
		expect(resolveIracingFolder('C:\\Users\\a\\Documents')).toBe(
			path.join('C:\\Users\\a\\Documents', 'iRacing')
		);
	});

	test('follows a redirected (OneDrive) documents dir', () => {
		// The whole reason this module exists: homedir()/Documents would have
		// produced C:\Users\a\Documents and missed the real folder entirely.
		expect(resolveIracingFolder('C:\\Users\\a\\OneDrive\\Documents')).toBe(
			path.join('C:\\Users\\a\\OneDrive\\Documents', 'iRacing')
		);
	});

	test('an override wins outright', () => {
		expect(resolveIracingFolder('C:\\Users\\a\\Documents', 'D:\\iR')).toBe(
			'D:\\iR'
		);
	});

	test('the override is used verbatim — no iRacing suffix appended', () => {
		// It names the iRacing folder itself, not its parent, so a user who points
		// it at D:\iR does not silently get D:\iR\iRacing.
		expect(resolveIracingFolder('C:\\Docs', 'D:\\iR')).not.toContain(
			path.join('iR', 'iRacing')
		);
	});

	test('an empty or whitespace override falls through to the documents dir', () => {
		const expected = path.join('C:\\Docs', 'iRacing');
		expect(resolveIracingFolder('C:\\Docs', '')).toBe(expected);
		expect(resolveIracingFolder('C:\\Docs', '   ')).toBe(expected);
	});

	test('an undefined override falls through to the documents dir', () => {
		expect(resolveIracingFolder('C:\\Docs', undefined)).toBe(
			path.join('C:\\Docs', 'iRacing')
		);
	});
});

describe('getDocumentsDir', () => {
	afterEach(() => {
		resetDocumentsDirCache();
	});

	test('falls back to homedir/Documents with no Electron host', () => {
		// Vitest runs in plain Node, so the electron lookup fails and we get the
		// conventional location — i.e. importing this module never needs Electron.
		expect(getDocumentsDir()).toBe(path.join(os.homedir(), 'Documents'));
	});

	test('memoises the lookup', () => {
		expect(getDocumentsDir()).toBe(getDocumentsDir());
	});
});

describe('getIracingFolder / getRendererIniPath', () => {
	afterEach(() => {
		resetDocumentsDirCache();
	});

	test('composes the live documents dir', () => {
		expect(getIracingFolder()).toBe(
			path.join(os.homedir(), 'Documents', 'iRacing')
		);
	});

	test('points at the active ini inside the resolved folder', () => {
		expect(getRendererIniPath('D:\\iR')).toBe(
			path.join('D:\\iR', RENDERER_INI_NAME)
		);
	});

	test('the active ini name is the one iRacing actually reads', () => {
		expect(RENDERER_INI_NAME).toBe('rendererDX11Monitor.ini');
	});
});
