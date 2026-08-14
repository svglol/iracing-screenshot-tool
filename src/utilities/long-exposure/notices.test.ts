import { dedupeNotices } from './notices';

// The exact sentence the field report named, and the reason this helper exists.
const SINGLE_SAMPLE =
	'This shutter is short enough that only one frame will land inside it, so the result has no motion blur. A slower playback speed or a slower shutter buys samples.';

describe('dedupeNotices', () => {
	test('collapses the plan warning the pre-flight and the outcome both carry', () => {
		// The reported bug: validatePlan's verdict reaches the panel twice — live
		// via the preview, and again via the completed capture's warnings, because
		// lastResult is not cleared when a setting changes.
		const notices = dedupeNotices([
			{ level: 'warning', text: SINGLE_SAMPLE },
			{ level: 'warning', text: SINGLE_SAMPLE },
		]);
		expect(notices).toEqual([{ level: 'warning', text: SINGLE_SAMPLE }]);
	});

	test('keeps the first occurrence, so the live pre-flight holds its position', () => {
		const notices = dedupeNotices([
			{ level: 'warning', text: 'plan warning' },
			{ level: 'info', text: 'something else' },
			{ level: 'warning', text: 'plan warning' },
		]);
		expect(notices.map((notice) => notice.text)).toEqual([
			'plan warning',
			'something else',
		]);
	});

	test('keeps the higher severity when the same text arrives at two levels', () => {
		// Errors are pushed before warnings, so first-wins gives danger.
		const notices = dedupeNotices([
			{ level: 'danger', text: 'same sentence' },
			{ level: 'warning', text: 'same sentence' },
		]);
		expect(notices).toEqual([{ level: 'danger', text: 'same sentence' }]);
	});

	test('leaves genuinely different warnings alone', () => {
		// Runtime-only outcome warnings — sample shortfall, bracket shortfall —
		// word themselves differently and must survive.
		const notices = dedupeNotices([
			{ level: 'warning', text: SINGLE_SAMPLE },
			{ level: 'warning', text: 'Only 41 of 240 samples were collected.' },
			{
				level: 'warning',
				text: 'Bracketing asked for 4 stops but 2 came back.',
			},
		]);
		expect(notices).toHaveLength(3);
	});

	test('does not merge the two deliberately distinct interpolation messages', () => {
		// The panel states the passes/interpolation trade in its own words next to
		// the controls, and validatePlan states it as a verdict. Different
		// sentences on purpose — collapsing them would lose one.
		const notices = dedupeNotices([
			{
				level: 'warning',
				text: 'Multi-pass and 4x interpolation are both on. They compete: …',
			},
			{
				level: 'warning',
				text: 'Passes and interpolation both add wall clock. …',
			},
		]);
		expect(notices).toHaveLength(2);
	});

	test('preserves order and every field of the notices it keeps', () => {
		const notices = dedupeNotices([
			{ level: 'danger', text: 'a', extra: 1 },
			{ level: 'warning', text: 'b', extra: 2 },
		]);
		expect(notices).toEqual([
			{ level: 'danger', text: 'a', extra: 1 },
			{ level: 'warning', text: 'b', extra: 2 },
		]);
	});

	test('handles an empty list', () => {
		expect(dedupeNotices([])).toEqual([]);
	});

	test('does not mutate its input', () => {
		const input = [
			{ level: 'warning', text: 'x' },
			{ level: 'warning', text: 'x' },
		];
		dedupeNotices(input);
		expect(input).toHaveLength(2);
	});
});
