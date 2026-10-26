// @vitest-environment happy-dom
//
// The capture worker's message contract with main, on a real filesystem and real
// sharp. Only the Electron boundary (ipcRenderer), the settings store and the
// logger are stubbed.
//
// Two rules are pinned here:
//   - every screenshot-finished / screenshot-error carries the captureId main sent
//     with the request, so main restores only the capture the message belongs to;
//   - once the shot is on disk, a failed follow-up (thumbnail, removing ReShade's
//     copy) is logged, not reported as a failed screenshot.
//
// The getUserMedia capture itself (OffscreenCanvas, MediaStream) is not exercised:
// happy-dom implements neither.
//
// NOTE ON THE ELECTRON STUB: Worker.vue resolves ipcRenderer via a NATIVE
// `require('electron')`, which vi.mock cannot reach, so the stub is planted in
// Node's require cache — the approach TitleBar.test.ts documents.
import { createRequire } from 'module';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { mount } from '@vue/test-utils';
import sharp from 'sharp';

const nodeRequire = createRequire(import.meta.url);

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'worker-test-'));
const userData = path.join(tmpRoot, 'userData');
const screenshotDir = path.join(tmpRoot, 'out');
const reshadeDir = path.join(tmpRoot, 'reshade');
fs.mkdirSync(userData, { recursive: true });
fs.mkdirSync(reshadeDir, { recursive: true });

const settings: Record<string, unknown> = {
	screenshotFolder: screenshotDir,
	outputFormat: 'png',
	customFilenameFormat: false,
	crop: false,
	cropTopLeft: false,
};
vi.mock('../../utilities/config', () => ({
	default: { get: (key: string) => settings[key] },
}));

const logged = vi.hoisted(() => ({
	warn: vi.fn(),
}));
vi.mock('../../utilities/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
		warn: logged.warn,
	}),
}));

const listeners = new Map<string, (...args: unknown[]) => void>();
const send = vi.fn();
const ipcRendererStub = {
	on(channel: string, handler: (...args: unknown[]) => void) {
		listeners.set(channel, handler);
	},
	removeListener(channel: string) {
		listeners.delete(channel);
	},
	send,
	sendSync(channel: string) {
		return channel === 'app:getPath-sync' ? userData : undefined;
	},
	invoke: vi.fn(),
};
const electronId = nodeRequire.resolve('electron');
nodeRequire.cache[electronId] = {
	id: electronId,
	filename: electronId,
	loaded: true,
	exports: { ipcRenderer: ipcRendererStub },
} as unknown as NodeModule;

// Imported AFTER the stub is planted — the worker captures ipcRenderer at module
// scope, so a later install would be too late.
const { default: Worker } = await import('./Worker.vue');

function emit(channel: string, payload: unknown): void {
	const handler = listeners.get(channel);
	if (!handler) {
		throw new Error(`worker registered no listener for ${channel}`);
	}
	handler({}, payload);
}

function sentOn(channel: string): unknown[] {
	return send.mock.calls.filter((c) => c[0] === channel).map((c) => c[1]);
}

async function writeReshadeImage(name: string): Promise<string> {
	const file = path.join(reshadeDir, name);
	await sharp({
		create: {
			width: 320,
			height: 200,
			channels: 3,
			background: { r: 200, g: 120, b: 40 },
		},
	})
		.png()
		.toFile(file);
	return file;
}

function clearOutput(): void {
	fs.rmSync(screenshotDir, { recursive: true, force: true });
	fs.rmSync(path.join(userData, 'Cache'), { recursive: true, force: true });
}

beforeAll(() => {
	mount(Worker);
});

beforeEach(() => {
	send.mockClear();
	logged.warn.mockClear();
	clearOutput();
});

afterAll(() => {
	fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('Worker capture-id echo', () => {
	test('a request it cannot run reports its error with the request’s captureId', () => {
		emit('screenshot-request', {
			width: 1920,
			height: 1080,
			crop: false,
			windowID: undefined,
			captureId: 3,
		});
		expect(sentOn('screenshot-error')).toEqual([
			expect.objectContaining({
				captureId: 3,
				context: 'worker:screenshot-request',
			}),
		]);
	});

	test('a failed ReShade save reports its error with the captureId main sent', async () => {
		const notAnImage = path.join(reshadeDir, 'broken.png');
		fs.writeFileSync(notAnImage, 'not a png');
		emit('screenshot-reshade', { file: notAnImage, captureId: 9 });

		await vi.waitFor(() => {
			expect(sentOn('screenshot-error')).toHaveLength(1);
		});
		expect(sentOn('screenshot-error')[0]).toEqual(
			expect.objectContaining({
				captureId: 9,
				context: 'save-reshade-image',
			})
		);
		expect(sentOn('screenshot-response')).toEqual([]);
	});
});

describe('Worker ReShade save', () => {
	test('saves the shot, removes ReShade’s copy, writes a thumbnail and notifies', async () => {
		const source = await writeReshadeImage('reshade-ok.png');
		emit('screenshot-reshade', { file: source, captureId: 4 });

		await vi.waitFor(() => {
			expect(sentOn('screenshot-response')).toHaveLength(1);
		});
		const saved = sentOn('screenshot-response')[0] as string;
		expect(path.dirname(saved)).toBe(screenshotDir);
		expect(fs.existsSync(saved)).toBe(true);
		expect(fs.existsSync(source)).toBe(false);
		const thumb = path.join(
			userData,
			'Cache',
			`${path.basename(saved, path.extname(saved))}.webp`
		);
		expect(fs.existsSync(thumb)).toBe(true);
		expect(sentOn('screenshot-error')).toEqual([]);
	});

	// Regression: a thumbnail failure used to surface as "Screenshot failed" for a
	// shot that was already on disk, and skipped the gallery notification.
	test('a thumbnail failure after the save is logged, not reported as a failed shot', async () => {
		const source = await writeReshadeImage('reshade-thumb-fails.png');
		// No session info has been sent, so the first free name is the fallback
		// iRacingScreenshotTool-0. Make its thumbnail path unwritable by occupying
		// it with a directory.
		fs.mkdirSync(
			path.join(userData, 'Cache', 'iRacingScreenshotTool-0.webp'),
			{
				recursive: true,
			}
		);
		emit('screenshot-reshade', { file: source, captureId: 6 });

		await vi.waitFor(() => {
			expect(sentOn('screenshot-response')).toHaveLength(1);
		});
		const saved = sentOn('screenshot-response')[0] as string;
		expect(path.basename(saved)).toBe('iRacingScreenshotTool-0.png');
		expect(fs.existsSync(saved)).toBe(true);
		expect(sentOn('screenshot-error')).toEqual([]);
		expect(logged.warn).toHaveBeenCalledWith(
			'Thumbnail failed — screenshot still saved',
			expect.anything()
		);
	});
});
