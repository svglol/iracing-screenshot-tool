import { CaptureState } from './capture-state';

function setup() {
	const restoreSim = vi.fn();
	return { restoreSim, state: new CaptureState(restoreSim) };
}

describe('CaptureState', () => {
	test('starts free and unmodified', () => {
		const { state } = setup();
		expect(state.active).toBeNull();
		expect(state.simModified).toBe(false);
		expect(state.busy).toBe(false);
	});

	test('begin claims the sim and marks it modified', () => {
		const { state } = setup();
		const ticket = state.begin('still');
		expect(ticket).toEqual({ id: expect.any(Number), kind: 'still' });
		expect(state.active).toBe(ticket);
		expect(state.simModified).toBe(true);
		expect(state.busy).toBe(true);
		expect(state.holds(ticket)).toBe(true);
	});

	test('a second capture is refused while one holds the sim, whatever its kind', () => {
		const { state } = setup();
		const first = state.begin('long-exposure');
		expect(state.begin('still')).toBeNull();
		expect(state.begin('long-exposure')).toBeNull();
		expect(state.active).toBe(first);
	});

	describe('still capture', () => {
		test('restore puts the sim back once and ends the capture', () => {
			const { state, restoreSim } = setup();
			const ticket = state.begin('still');
			state.restore();
			expect(restoreSim).toHaveBeenCalledTimes(1);
			expect(state.holds(ticket)).toBe(false);
			expect(state.busy).toBe(false);
		});

		test('a repeated restore is a no-op', () => {
			const { state, restoreSim } = setup();
			state.begin('still');
			state.restore();
			state.restore();
			expect(restoreSim).toHaveBeenCalledTimes(1);
		});

		test('each capture gets a fresh id, so an old ticket never matches the next one', () => {
			const { state } = setup();
			const first = state.begin('still');
			state.restore();
			const second = state.begin('still');
			expect(second.id).not.toBe(first.id);
			expect(state.holds(first)).toBe(false);
			expect(state.holds(second)).toBe(true);
		});
	});

	describe('long exposure', () => {
		// Regression: the window restore inside executeRecipe used to flip the only
		// busy flag, so a still capture could start while the long exposure was
		// still writing its files — and the long exposure's final cleanup then
		// restored iRacing out from under that still.
		test('restoring its window does not release the sim: a still is refused until end()', () => {
			const { state, restoreSim } = setup();
			const longExposure = state.begin('long-exposure');
			state.restore();
			expect(restoreSim).toHaveBeenCalledTimes(1);
			expect(state.simModified).toBe(false);
			expect(state.busy).toBe(true);
			expect(state.begin('still')).toBeNull();

			expect(state.end(longExposure)).toBe(true);
			expect(restoreSim).toHaveBeenCalledTimes(1);
			expect(state.busy).toBe(false);
			expect(state.begin('still')).not.toBeNull();
		});

		test('end restores the sim when nothing restored it earlier', () => {
			const { state, restoreSim } = setup();
			const longExposure = state.begin('long-exposure');
			state.end(longExposure);
			expect(restoreSim).toHaveBeenCalledTimes(1);
			expect(state.busy).toBe(false);
		});
	});

	describe('late continuations and stale worker messages', () => {
		// index.ts gates every late continuation and worker message with
		// `if (holds(id)) restore`; these pin the two halves of that rule.
		test('an aborted capture no longer holds once the next one has begun', () => {
			const { state } = setup();
			const aborted = state.begin('still');
			state.restore(); // watchdog / disconnect abort
			const next = state.begin('still');

			expect(state.holds(aborted)).toBe(false);
			expect(state.holds(aborted.id)).toBe(false);
			expect(state.holds(next)).toBe(true);
			expect(state.simModified).toBe(true);
		});

		test('the current capture holds by bare id, as echoed by the worker', () => {
			const { state, restoreSim } = setup();
			const ticket = state.begin('still');
			expect(state.holds(ticket.id)).toBe(true);
			state.restore();
			expect(restoreSim).toHaveBeenCalledTimes(1);
			expect(state.holds(ticket.id)).toBe(false);
		});

		test('a stale end cannot release the capture that replaced it', () => {
			const { state, restoreSim } = setup();
			const stale = state.begin('long-exposure');
			state.end(stale);
			const current = state.begin('long-exposure');
			restoreSim.mockClear();
			expect(state.end(stale)).toBe(false);
			expect(state.active).toBe(current);
			expect(restoreSim).not.toHaveBeenCalled();
		});

		test('missing or malformed ids never match', () => {
			const { state } = setup();
			state.begin('still');
			expect(state.holds(undefined)).toBe(false);
			expect(state.holds(null)).toBe(false);
			expect(state.holds('1' as unknown as number)).toBe(false);
			expect(state.end(null)).toBe(false);
			expect(state.busy).toBe(true);
		});

		test('nothing matches while the sim is free', () => {
			const { state } = setup();
			expect(state.holds(1)).toBe(false);
			expect(state.end(1)).toBe(false);
		});
	});

	describe('a restore that throws', () => {
		// The flag used to flip only after the resize and camera calls, so a throw
		// there latched the app busy until restart: every later capture refused.
		test('still leaves the app free, and the error reaches the caller', () => {
			const restoreSim = vi.fn(() => {
				throw new Error('SetWindowPos failed');
			});
			const state = new CaptureState(restoreSim);
			state.begin('still');
			expect(() => state.restore()).toThrow('SetWindowPos failed');
			expect(state.busy).toBe(false);
			expect(state.begin('still')).not.toBeNull();
		});

		test('end still releases a long exposure', () => {
			const restoreSim = vi.fn(() => {
				throw new Error('SetWindowPos failed');
			});
			const state = new CaptureState(restoreSim);
			const longExposure = state.begin('long-exposure');
			expect(() => state.end(longExposure)).toThrow('SetWindowPos failed');
			expect(state.busy).toBe(false);
		});
	});
});
