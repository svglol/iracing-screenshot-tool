// The ReShade folder wait, on a real filesystem with real timers (shortened).
// Characterises the matching rules carried over from index.ts, and pins the
// cancellation contract that replaced its module-level callback.
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
	RESHADE_TIMEOUT_MESSAGE,
	findLatestReshadeScreenshot,
	listReshadeScreenshotFiles,
	waitForFileToSettle,
	waitForReshadeScreenshot,
} from './reshade-screenshot-wait';

vi.mock('../utilities/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

const FAST = { pollMs: 20, settle: { attempts: 12, intervalMs: 20 } };

let folder: string;
beforeEach(() => {
	folder = fs.mkdtempSync(path.join(os.tmpdir(), 'reshade-wait-'));
});
afterEach(() => {
	fs.rmSync(folder, { recursive: true, force: true });
});

const write = (name: string, bytes = 64) =>
	fs.writeFileSync(path.join(folder, name), Buffer.alloc(bytes, 1));
const later = (ms: number, fn: () => void) => setTimeout(fn, ms);

describe('listReshadeScreenshotFiles', () => {
	test('lists only image files ReShade writes, with size and mtime', async () => {
		write('a.png');
		write('b.JPG');
		write('c.bmp');
		write('notes.txt');
		fs.mkdirSync(path.join(folder, 'sub.png'));
		const names = (await listReshadeScreenshotFiles(folder))
			.map((file) => path.basename(file.fullPath))
			.sort();
		expect(names).toEqual(['a.png', 'b.JPG', 'c.bmp']);
	});

	test('treats a missing folder as empty', async () => {
		expect(
			await listReshadeScreenshotFiles(path.join(folder, 'missing'))
		).toEqual([]);
	});
});

describe('findLatestReshadeScreenshot', () => {
	test('ignores a file with an old mtime that was not in the baseline', async () => {
		write('copied-in.png');
		const old = (Date.now() - 60_000) / 1000;
		fs.utimesSync(path.join(folder, 'copied-in.png'), old, old);
		expect(
			await findLatestReshadeScreenshot(folder, new Map(), Date.now())
		).toBeNull();
	});
});

describe('waitForFileToSettle', () => {
	test('returns once size and mtime hold still', async () => {
		write('done.png');
		await expect(
			waitForFileToSettle(path.join(folder, 'done.png'), {
				intervalMs: 5,
			})
		).resolves.toBeUndefined();
	});

	// Characterisation: an empty file never "settles", and after the attempts
	// run out the wait gives up quietly (the worker then rejects the image).
	test('gives up quietly on a file that stays empty', async () => {
		write('empty.png', 0);
		await expect(
			waitForFileToSettle(path.join(folder, 'empty.png'), {
				attempts: 3,
				intervalMs: 5,
			})
		).resolves.toBeUndefined();
	});

	test('rethrows when the file cannot be read on the last attempt', async () => {
		await expect(
			waitForFileToSettle(path.join(folder, 'gone.png'), {
				attempts: 2,
				intervalMs: 5,
			})
		).rejects.toThrow(/ENOENT/);
	});
});

describe('waitForReshadeScreenshot', () => {
	test('resolves the screenshot ReShade writes after the wait began', async () => {
		const wait = waitForReshadeScreenshot(folder, FAST);
		later(60, () => write('ReShade 2026-10-26 10-00-00.png'));
		expect(path.basename(await wait)).toBe('ReShade 2026-10-26 10-00-00.png');
	});

	test('ignores files that were already there and unsupported ones, then times out', async () => {
		write('older.png');
		const wait = waitForReshadeScreenshot(folder, {
			...FAST,
			timeoutMs: 250,
		});
		later(40, () => write('readme.txt'));
		await expect(wait).rejects.toThrow(RESHADE_TIMEOUT_MESSAGE);
	});

	test('accepts a pre-existing file that ReShade rewrites', async () => {
		write('fixed-name.png', 64);
		const wait = waitForReshadeScreenshot(folder, FAST);
		later(60, () => write('fixed-name.png', 128));
		expect(path.basename(await wait)).toBe('fixed-name.png');
	});

	test('creates the folder when it does not exist yet', async () => {
		const missing = path.join(folder, 'not-yet');
		const wait = waitForReshadeScreenshot(missing, FAST);
		later(60, () =>
			fs.writeFileSync(path.join(missing, 'shot.bmp'), Buffer.alloc(64, 1))
		);
		expect(path.basename(await wait)).toBe('shot.bmp');
	});

	describe('cancellation', () => {
		test('an already-aborted signal rejects at once with its reason', async () => {
			const controller = new AbortController();
			controller.abort(new Error('Screenshot recovery'));
			await expect(
				waitForReshadeScreenshot(folder, {
					...FAST,
					signal: controller.signal,
				})
			).rejects.toThrow('Screenshot recovery');
		});

		// Regression: cancellation used to be registered only after the baseline
		// directory read, so an abort during it was dropped and the wait ran its
		// whole timeout with its watcher and poller alive.
		test('an abort during the initial directory read still stops the wait', async () => {
			const controller = new AbortController();
			const started = Date.now();
			const wait = waitForReshadeScreenshot(folder, {
				...FAST,
				timeoutMs: 10_000,
				signal: controller.signal,
			});
			controller.abort(new Error('Screenshot recovery'));
			await expect(wait).rejects.toThrow('Screenshot recovery');
			expect(Date.now() - started).toBeLessThan(2000);
		});

		test('an abort while watching rejects with the reason given', async () => {
			const controller = new AbortController();
			const wait = waitForReshadeScreenshot(folder, {
				...FAST,
				timeoutMs: 10_000,
				signal: controller.signal,
			});
			later(60, () => controller.abort(new Error('Application closing')));
			await expect(wait).rejects.toThrow('Application closing');
		});

		test('a plain abort() rejects with the platform AbortError', async () => {
			const controller = new AbortController();
			const wait = waitForReshadeScreenshot(folder, {
				...FAST,
				timeoutMs: 10_000,
				signal: controller.signal,
			});
			later(40, () => controller.abort());
			await expect(wait).rejects.toMatchObject({ name: 'AbortError' });
		});
	});
});
