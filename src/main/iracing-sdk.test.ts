'use strict';

// ---------------------------------------------------------------------------
// IRacingBridge poll-loop self-heal (cq-iracing-sdk#1)
//
// Before WP-C, IRacingBridge.start() ran a floating, unguarded while-loop from
// the constructor with no .catch: a single native throw (IsSimRunning etc.)
// rejected the promise and exited the loop while loopActive stayed true, so the
// re-entrancy guard made start() a PERMANENT no-op — iRacing was never
// re-detected until app restart, with no app.log trace.
//
// These tests prove the loop now survives a native throw: no unhandledRejection,
// the error is logged once, and the loop keeps running and reconnects.
//
// The native addon can't load under vitest, so irsdk-node is fully mocked with a
// constructable IRacingSDK (instance methods + static async IsSimRunning) and the
// CameraState named export the constructor reads. The logger is mocked to capture
// the transition/error lines.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
	isSimRunning: vi.fn(),
	startSDK: vi.fn(),
	stopSDK: vi.fn(),
	waitForData: vi.fn(() => false),
	getSessionData: vi.fn(() => null),
	getTelemetry: vi.fn(() => null),
	broadcastUnsafe: vi.fn(),
	logInfo: vi.fn(),
	logWarn: vi.fn(),
	logError: vi.fn(),
	logDebug: vi.fn(),
}));

vi.mock('irsdk-node', () => {
	class IRacingSDK {
		startSDK = mocks.startSDK;
		stopSDK = mocks.stopSDK;
		waitForData = mocks.waitForData;
		getSessionData = mocks.getSessionData;
		getTelemetry = mocks.getTelemetry;
		broadcastUnsafe = mocks.broadcastUnsafe;
		static IsSimRunning = mocks.isSimRunning;
	}
	return {
		IRacingSDK,
		CameraState: {
			IsSessionScreen: 1,
			IsScenicActive: 2,
			CamToolActive: 4,
			UIHidden: 8,
			UseAutoShotSelection: 16,
			UseTemporaryEdits: 32,
			UseKeyAcceleration: 64,
			UseKey10xAcceleration: 128,
			UseMouseAimMode: 256,
		},
	};
});

vi.mock('../utilities/logger', () => ({
	createLogger: () => ({
		info: mocks.logInfo,
		warn: mocks.logWarn,
		error: mocks.logError,
		debug: mocks.logDebug,
	}),
}));

import { IRacingBridge } from './iracing-sdk';

// Count unhandled rejections with a plain listener (a vi.fn() mock isn't cleanly
// assignable to process.on's listener signature under vue-tsc).
let unhandledCount: number;
let unhandledListener: (reason: unknown) => void;

beforeEach(() => {
	vi.useFakeTimers();
	vi.clearAllMocks();
	mocks.waitForData.mockReturnValue(false);
	unhandledCount = 0;
	unhandledListener = () => {
		unhandledCount++;
	};
	process.on('unhandledRejection', unhandledListener);
});

afterEach(() => {
	process.off('unhandledRejection', unhandledListener);
	vi.useRealTimers();
});

// Cleanly stop an infinite bridge loop and let its finally{} run.
async function stopBridge(bridge: IRacingBridge): Promise<void> {
	bridge.loopActive = false;
	await vi.advanceTimersByTimeAsync(50);
}

describe('IRacingBridge poll-loop self-heal', () => {
	test('survives a native throw, logs it once, and reconnects', async () => {
		// First IsSimRunning throws (native fault); every call after resolves true.
		mocks.isSimRunning
			.mockRejectedValueOnce(new Error('native boom'))
			.mockResolvedValue(true);

		const bridge = new IRacingBridge();
		const connected = vi.fn();
		bridge.on('Connected', connected);

		// Flush the rejected first iteration (schedules the 500ms backoff), fire the
		// backoff, then run the recovered iteration that reconnects.
		await vi.advanceTimersByTimeAsync(600);

		// (a) the rejection never escaped as an unhandledRejection
		expect(unhandledCount).toBe(0);
		// (b) the throw was logged exactly once, with the self-heal context
		expect(mocks.logError).toHaveBeenCalledTimes(1);
		expect(mocks.logError).toHaveBeenCalledWith(
			'iRacing poll loop error — self-healing',
			expect.objectContaining({ error: 'native boom', consecutiveErrors: 1 })
		);
		// (c) the loop survived the throw and reconnected
		expect(connected).toHaveBeenCalledTimes(1);
		expect(mocks.startSDK).toHaveBeenCalled();
		// (d) the loop is still running (NOT permanently wedged)
		expect(bridge.loopActive).toBe(true);

		await stopBridge(bridge);
	});

	test('a clean start connects and logs the low-level SDK transition (no error)', async () => {
		mocks.isSimRunning.mockResolvedValue(true);

		const bridge = new IRacingBridge();
		const connected = vi.fn();
		bridge.on('Connected', connected);

		await vi.advanceTimersByTimeAsync(50);

		expect(mocks.logError).not.toHaveBeenCalled();
		expect(connected).toHaveBeenCalledTimes(1);
		// The bridge logs the low-level SDK start; the app-facing 'iRacing
		// connected' transition is logged by the index.ts handler (WP-G split).
		expect(mocks.logInfo).toHaveBeenCalledWith('SDK startSDK');
		expect(bridge.loopActive).toBe(true);

		await stopBridge(bridge);
	});

	test('logs the telemetry-first-available edge once per connection', async () => {
		mocks.isSimRunning.mockResolvedValue(true);
		// waitForData true + a non-null telemetry frame → the false->true edge.
		mocks.waitForData.mockReturnValue(true);
		mocks.getTelemetry.mockReturnValue({ CamCameraState: ['UIHidden'] });

		const bridge = new IRacingBridge();
		await vi.advanceTimersByTimeAsync(100);

		const edgeCalls = mocks.logInfo.mock.calls.filter(
			(c) => c[0] === 'iRacing telemetry first available'
		);
		// Exactly once despite many frames — the _hadTelemetry latch holds.
		expect(edgeCalls).toHaveLength(1);

		await stopBridge(bridge);
	});

	test('the outer finally releases loopActive so a later start() can restart', async () => {
		mocks.isSimRunning.mockResolvedValue(true);

		const bridge = new IRacingBridge();
		await vi.advanceTimersByTimeAsync(50);
		expect(bridge.loopActive).toBe(true);

		// Stopping the loop must reset the latch via finally{}, otherwise a restart
		// would hit the `if (loopActive) return` guard and never spin back up.
		await stopBridge(bridge);
		expect(bridge.loopActive).toBe(false);

		// A fresh start() spins the loop back up (guard no longer latched).
		const restart = bridge.start();
		await vi.advanceTimersByTimeAsync(50);
		expect(bridge.loopActive).toBe(true);

		bridge.loopActive = false;
		await vi.advanceTimersByTimeAsync(50);
		await restart;
	});
});
