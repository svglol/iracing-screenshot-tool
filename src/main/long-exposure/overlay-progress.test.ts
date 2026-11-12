import {
	longExposureBarMotion,
	RESOLVE_ALLOWANCE_SECONDS,
	SEEK_ALLOWANCE_SECONDS,
} from './overlay-progress';

// One pass: 1.5 s seek + 3 s warm-up + 10 s exposure, then 1.5 s resolve.
const timing = { warmUpSeconds: 3, exposureSeconds: 10 };
const position = SEEK_ALLOWANCE_SECONDS + 3;
const perPass = position + 10;

describe('longExposureBarMotion', () => {
	test('a single pass is laid out seek+warm-up, exposure, resolve', () => {
		const total = perPass + RESOLVE_ALLOWANCE_SECONDS;
		expect(
			longExposureBarMotion({ phase: 'warming', pass: 0, passes: 1, timing })
		).toEqual({ from: 0, to: position / total, ms: position * 1000 });
		const half = longExposureBarMotion({
			phase: 'accumulating',
			pass: 0,
			passes: 1,
			progress: 0.5,
			timing,
		});
		expect(half?.from).toBeCloseTo((position + 5) / total);
		expect(half?.to).toBeCloseTo(perPass / total);
		expect(half?.ms).toBe(5000);
		expect(
			longExposureBarMotion(
				{ phase: 'resolving' },
				{ phase: 'accumulating', passes: 1, timing }
			)
		).toEqual({
			from: perPass / total,
			to: 1,
			ms: RESOLVE_ALLOWANCE_SECONDS * 1000,
		});
	});

	test('each segment starts where the previous one ends, so the bar never jumps', () => {
		const passes = 3;
		const segments = [];
		for (let pass = 0; pass < passes; pass += 1) {
			segments.push(
				longExposureBarMotion({ phase: 'seeking', pass, passes, timing })
			);
			segments.push(
				longExposureBarMotion({
					phase: 'accumulating',
					pass,
					passes,
					progress: 0,
					timing,
				})
			);
		}
		segments.push(
			longExposureBarMotion(
				{ phase: 'resolving' },
				{ phase: 'accumulating', pass: 2, passes, timing }
			)
		);
		expect(segments[0]?.from).toBe(0);
		for (let i = 1; i < segments.length; i += 1) {
			expect(segments[i]?.from).toBeCloseTo(segments[i - 1]?.to ?? -1);
		}
		expect(segments[segments.length - 1]?.to).toBe(1);
	});

	test('time left in a pass is measured from when it started, not from frame steps', () => {
		const at = (progress: number, elapsedMs: number) =>
			longExposureBarMotion(
				{ phase: 'accumulating', pass: 0, passes: 1, progress, timing },
				null,
				elapsedMs
			)?.ms;
		// The reported fraction sits on one replay frame while time passes.
		expect(at(0.25, 2500)).toBe(7500);
		expect(at(0.25, 2700)).toBe(7300);
		// Overrunning the plan leaves nothing to glide rather than going negative.
		expect(at(0.9, 12000)).toBe(0);
	});

	test('a finished pass has nothing left to glide', () => {
		const done = longExposureBarMotion({
			phase: 'accumulating',
			pass: 1,
			passes: 2,
			progress: 1,
			timing,
		});
		expect(done?.from).toBeCloseTo(done?.to ?? -1);
		expect(done?.ms).toBe(0);
	});

	test('no timing yet, or a phase with no place on the bar, gives nothing', () => {
		expect(longExposureBarMotion({ phase: 'resolving' })).toBeNull();
		expect(
			longExposureBarMotion(
				{ phase: 'restoring' },
				{ phase: 'seeking', timing }
			)
		).toBeNull();
	});
});
