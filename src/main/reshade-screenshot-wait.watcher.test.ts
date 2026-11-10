// The ReShade wait when its fs.watch watcher fails (the folder removed or made
// unreachable mid-wait). Only fs.watch is replaced, with a watcher the test can
// fail on demand; everything else is the real filesystem.
import { EventEmitter } from 'events';
import * as os from 'os';
import * as path from 'path';

type FakeWatcher = EventEmitter & { close: () => void; closed: boolean };
const watchers = vi.hoisted(() => [] as FakeWatcher[]);
vi.mock('fs', async (importOriginal) => {
	const real = await importOriginal<typeof import('fs')>();
	return {
		...real,
		watch: vi.fn(() => {
			const watcher = Object.assign(new EventEmitter(), {
				closed: false,
				close() {
					watcher.closed = true;
				},
			});
			watchers.push(watcher);
			return watcher;
		}),
	};
});
vi.mock('../utilities/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

const fs = await import('fs');
const { waitForReshadeScreenshot } = await import('./reshade-screenshot-wait');

let folder: string;
beforeEach(() => {
	watchers.length = 0;
	folder = fs.mkdtempSync(path.join(os.tmpdir(), 'reshade-watcher-'));
});
afterEach(() => {
	fs.rmSync(folder, { recursive: true, force: true });
});

// Regression: the watcher had no 'error' listener, so a watcher error was an
// 'error' event with no listener — an uncaught exception in the main process.
test('a watcher error closes the watcher and the poller still finds the shot', async () => {
	const wait = waitForReshadeScreenshot(folder, {
		pollMs: 20,
		settle: { intervalMs: 10 },
	});
	await vi.waitFor(() => expect(watchers).toHaveLength(1));

	expect(() =>
		watchers[0].emit('error', new Error('EPERM: operation not permitted'))
	).not.toThrow();
	expect(watchers[0].closed).toBe(true);

	fs.writeFileSync(path.join(folder, 'shot.png'), Buffer.alloc(64, 1));
	expect(path.basename(await wait)).toBe('shot.png');
});
