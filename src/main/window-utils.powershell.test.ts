// The async PowerShell fallback of resizeIracingWindowAsync, with child_process
// mocked. The platform is forced off win32 so the koffi path is skipped on every
// OS, Windows CI included — this is the path a machine without koffi runs.
import { EventEmitter } from 'events';

type FakeChild = EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
const children = vi.hoisted(() => [] as FakeChild[]);
vi.mock('child_process', () => ({
	spawnSync: vi.fn(() => ({ status: 1, stdout: '', stderr: '' })),
	spawn: vi.fn(() => {
		const child = Object.assign(new EventEmitter(), {
			stdout: new EventEmitter(),
			stderr: new EventEmitter(),
		});
		children.push(child);
		return child;
	}),
}));
vi.mock('../utilities/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

const realPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
beforeAll(() => {
	Object.defineProperty(process, 'platform', { value: 'linux' });
});
afterAll(() => {
	Object.defineProperty(process, 'platform', realPlatform);
});

const { resizeIracingWindowAsync } = await import('./window-utils');

beforeEach(() => {
	vi.useFakeTimers();
	children.length = 0;
});
afterEach(() => {
	vi.useRealTimers();
});

describe('resizeIracingWindowAsync PowerShell fallback', () => {
	test('resolves the window handle PowerShell prints', async () => {
		const resize = resizeIracingWindowAsync(1920, 1080, 0, 0);
		children[0].stdout.emit('data', '4242\r\n');
		children[0].emit('close', 0);
		await expect(resize).resolves.toBe(4242);
	});

	test('treats a failed run as "window not found"', async () => {
		const resize = resizeIracingWindowAsync(1920, 1080, 0, 0);
		children[0].emit('close', 1);
		await expect(resize).resolves.toBeUndefined();
	});

	// Regression: the promise settled only on 'close', which waits for every
	// holder of the stdio pipes — and Add-Type's compiler, a grandchild, is not
	// killed by the spawn timeout. A capture's resize could then never resolve.
	test('settles even when the child never closes', async () => {
		let settled = false;
		const resize = resizeIracingWindowAsync(1920, 1080, 0, 0).then((id) => {
			settled = true;
			return id;
		});
		await vi.advanceTimersByTimeAsync(15_000);
		expect(settled).toBe(false);
		await vi.advanceTimersByTimeAsync(2_000);
		await expect(resize).resolves.toBeUndefined();
	});
});
