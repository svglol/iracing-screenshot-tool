'use strict';

// ---------------------------------------------------------------------------
// voteAggregator.test.js
// ---------------------------------------------------------------------------
// Covers the 👍-reaction → debounced `votes:N` label mirror.
//
// Coalescing is proven DETERMINISTICALLY via the `_getTimerCountForTests()`
// introspection hook instead of `jest.useFakeTimers()` + microtask draining.
// Jest 25's fake-timer implementation is fragile around native-Promise
// microtasks — reading the module's internal timer map directly keeps the
// test stable across jest upgrades and avoids flakiness on slower CI.
//
// The "timer fires" test uses `delayMs: 0` and two `setImmediate` drains
// (one for the setTimeout macrotask, one for the async body) — no fake
// timers required.
// ---------------------------------------------------------------------------

jest.mock('../config.js', () => ({ __esModule: true, default: {} }));
jest.mock('../github/issues.js', () => ({
	__esModule: true,
	getIssue: jest.fn(),
	addLabels: jest.fn(),
	removeLabel: jest.fn()
}));
jest.mock('../storage/reactionSnapshots.js', () => ({
	__esModule: true,
	getSnapshot: jest.fn(),
	setSnapshot: jest.fn()
}));

import * as issues from '../github/issues.js';
import * as snapshots from '../storage/reactionSnapshots.js';
import {
	scheduleMirror,
	flushNow,
	updateVotesLabel,
	_resetForTests,
	_getTimerCountForTests
} from './voteAggregator.js';

beforeEach(() => {
	jest.clearAllMocks();
	_resetForTests();
});

afterEach(() => {
	_resetForTests();
});

// ---------------------------------------------------------------------------
// scheduleMirror — coalescing
// ---------------------------------------------------------------------------
describe('scheduleMirror coalescing', () => {
	test('three synchronous schedule calls create exactly one pending timer', () => {
		// Deterministic: inspect the internal timer map directly. Three schedules
		// for the same issueNumber must collapse to one pending timeout — proves
		// the `if (_timers.has(issueNumber)) return` guard works without relying
		// on fake timers or microtask draining.
		const fetchCount = jest.fn().mockResolvedValue(3);
		expect(_getTimerCountForTests()).toBe(0);

		scheduleMirror(42, { delayMs: 60_000, fetchCount });
		scheduleMirror(42, { delayMs: 60_000, fetchCount });
		scheduleMirror(42, { delayMs: 60_000, fetchCount });

		expect(_getTimerCountForTests()).toBe(1);
		// fetchCount is NOT called yet — the timer has not fired.
		expect(fetchCount).not.toHaveBeenCalled();
	});

	test('firing the scheduled timer calls fetchCount exactly once', async () => {
		// Use delayMs: 0 + a real-time poll — no fake timers needed. Under a
		// busy Jest runner, `setImmediate` drains alone aren't always enough
		// because the setTimeout(0) macrotask may land after several microtask
		// queues have already been flushed by the test harness itself. Polling
		// the timer map + a bounded real-time ceiling is deterministic (the
		// timer WILL fire) and still fast (single-digit ms in practice).
		const fetchCount = jest.fn().mockResolvedValue(3);
		snapshots.getSnapshot.mockReturnValue(null);
		issues.getIssue.mockResolvedValue({ labels: [] });
		issues.addLabels.mockResolvedValue({});

		scheduleMirror(42, { delayMs: 0, fetchCount });
		scheduleMirror(42, { delayMs: 0, fetchCount });
		scheduleMirror(42, { delayMs: 0, fetchCount });

		// Wait up to 500ms for the timer to fire AND the async flush body to
		// settle. Poll with 5ms sleeps — exits as soon as both conditions are
		// observed, so the typical run is a few ms.
		const deadline = Date.now() + 500;
		while (
			(_getTimerCountForTests() > 0 || fetchCount.mock.calls.length === 0) &&
			Date.now() < deadline
		) {
			await new Promise((r) => setTimeout(r, 5));
		}

		expect(fetchCount).toHaveBeenCalledTimes(1);
		expect(_getTimerCountForTests()).toBe(0); // cleared after fire
	});

	test('different issue numbers each get their own timer (no cross-coalescing)', () => {
		const fetchCount = jest.fn().mockResolvedValue(1);
		scheduleMirror(1, { delayMs: 60_000, fetchCount });
		scheduleMirror(2, { delayMs: 60_000, fetchCount });
		scheduleMirror(3, { delayMs: 60_000, fetchCount });
		expect(_getTimerCountForTests()).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// flushNow
// ---------------------------------------------------------------------------
describe('flushNow', () => {
	test('no-op when snapshot matches current count', async () => {
		snapshots.getSnapshot.mockReturnValue({ vote_count: 5 });
		const fetchCount = jest.fn().mockResolvedValue(5);
		await flushNow(42, fetchCount);
		expect(issues.getIssue).not.toHaveBeenCalled();
		expect(snapshots.setSnapshot).not.toHaveBeenCalled();
	});

	test('writes snapshot and mirrors when count differs', async () => {
		snapshots.getSnapshot.mockReturnValue({ vote_count: 3 });
		const fetchCount = jest.fn().mockResolvedValue(7);
		issues.getIssue.mockResolvedValue({ labels: [] });
		await flushNow(42, fetchCount);
		expect(issues.addLabels).toHaveBeenCalledWith(42, ['votes:7']);
		expect(snapshots.setSnapshot).toHaveBeenCalledWith(
			42,
			7,
			expect.any(Number)
		);
	});
});

// ---------------------------------------------------------------------------
// updateVotesLabel
// ---------------------------------------------------------------------------
describe('updateVotesLabel', () => {
	test('removes stale votes label before adding new', async () => {
		issues.getIssue.mockResolvedValue({
			labels: [{ name: 'feature' }, { name: 'votes:5' }]
		});
		await updateVotesLabel(42, 8);
		expect(issues.removeLabel).toHaveBeenCalledWith(42, 'votes:5');
		expect(issues.addLabels).toHaveBeenCalledWith(42, ['votes:8']);
	});

	test('no-op when existing label already matches', async () => {
		issues.getIssue.mockResolvedValue({ labels: [{ name: 'votes:5' }] });
		await updateVotesLabel(42, 5);
		expect(issues.removeLabel).not.toHaveBeenCalled();
		expect(issues.addLabels).not.toHaveBeenCalled();
	});

	test('skips addLabels when count is 0, but still removes old', async () => {
		issues.getIssue.mockResolvedValue({ labels: [{ name: 'votes:3' }] });
		await updateVotesLabel(42, 0);
		expect(issues.removeLabel).toHaveBeenCalledWith(42, 'votes:3');
		expect(issues.addLabels).not.toHaveBeenCalled();
	});
});
