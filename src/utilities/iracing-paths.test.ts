import {
	resolveIracingFolder,
	getIracingFolder,
	getRendererIniPath,
	getDocumentsDir,
	resetDocumentsDirCache,
	rendererModeFromFileName,
	rendererIniFileName,
	rendererIniPathForMode,
	splitRendererMode,
	RENDERER_INI_NAME,
	RENDERER_LEGACY_MODE,
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

describe('renderer display modes', () => {
	afterEach(() => {
		resetDocumentsDirCache();
	});

	test('extracts the mode from each per-mode filename', () => {
		expect(rendererModeFromFileName('rendererDX11Monitor.ini')).toBe(
			'Monitor'
		);
		expect(rendererModeFromFileName('rendererDX11Oculus.ini')).toBe('Oculus');
		expect(rendererModeFromFileName('rendererDX11OpenVR.ini')).toBe('OpenVR');
		expect(rendererModeFromFileName('rendererDX11OpenXR.ini')).toBe('OpenXR');
	});

	test('the suffix-less legacy file gets its own pseudo-mode', () => {
		expect(rendererModeFromFileName('rendererDX11.ini')).toBe(
			RENDERER_LEGACY_MODE
		);
	});

	test('non-renderer files are rejected', () => {
		expect(rendererModeFromFileName('app.ini')).toBeNull();
		expect(rendererModeFromFileName('core.ini')).toBeNull();
		expect(
			rendererModeFromFileName('rendererDX11Monitor.ini.bak')
		).toBeNull();
		expect(rendererModeFromFileName('rendererDX9Monitor.ini')).toBeNull();
	});

	test('prefix and extension match case-insensitively, mode keeps its casing', () => {
		expect(rendererModeFromFileName('RENDERERDX11monitor.INI')).toBe(
			'monitor'
		);
	});

	test('splitRendererMode separates a custom config from its base mode', () => {
		expect(splitRendererMode('Monitor - Screenshot')).toEqual({
			base: 'Monitor',
			custom: 'Screenshot',
		});
		expect(splitRendererMode('OpenXR - Racing')).toEqual({
			base: 'OpenXR',
			custom: 'Racing',
		});
		// The name keeps everything after the first separator, dashes included.
		expect(splitRendererMode('Monitor - A - B')).toEqual({
			base: 'Monitor',
			custom: 'A - B',
		});
		// Base matching is case-insensitive, casing is preserved.
		expect(splitRendererMode('monitor - shots')).toEqual({
			base: 'monitor',
			custom: 'shots',
		});
	});

	test('splitRendererMode leaves base and unrecognized modes whole', () => {
		expect(splitRendererMode('Monitor')).toEqual({
			base: 'Monitor',
			custom: null,
		});
		expect(splitRendererMode(RENDERER_LEGACY_MODE)).toEqual({
			base: RENDERER_LEGACY_MODE,
			custom: null,
		});
		// A separator without a known base mode in front is not a custom config.
		expect(splitRendererMode('Something - X')).toEqual({
			base: 'Something - X',
			custom: null,
		});
		// A separator with nothing after it is not a custom config either.
		expect(splitRendererMode('Monitor - ')).toEqual({
			base: 'Monitor - ',
			custom: null,
		});
	});

	test('rendererIniFileName is the inverse of rendererModeFromFileName', () => {
		for (const mode of ['Monitor', 'Oculus', 'OpenVR', 'OpenXR']) {
			expect(rendererModeFromFileName(rendererIniFileName(mode))).toBe(mode);
		}
		expect(rendererIniFileName(RENDERER_LEGACY_MODE)).toBe(
			'rendererDX11.ini'
		);
	});

	test("the Monitor mode path equals the profiles feature's active ini path", () => {
		expect(rendererIniPathForMode('Monitor', 'D:\\iR')).toBe(
			getRendererIniPath('D:\\iR')
		);
	});
});
