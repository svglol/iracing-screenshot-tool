// Where the overlay's progress bar should be during a long exposure, and where
// it should glide to next.
//
// Progress updates arrive in bursts: none at all while a pass seeks and warms
// up, then many while it accumulates. A bar that only moves on updates sits
// still, then leaps. But the plan says how long each part of a pass should take,
// so every update can instead hand the overlay a segment: start HERE, move
// linearly to THERE over this long. The next update re-aims it, so an estimate
// that runs slow or fast is corrected rather than accumulated.
//
// The whole capture is laid out on one 0..1 line, weighted by predicted wall
// clock:
//
//   pass 0: [position][exposure] pass 1: [position][exposure] ... [resolve]
//
// "position" is the seek plus the effects warm-up. The warm-up is predicted by
// the plan; the seek is not, so it gets a measured allowance (per-pass overhead
// was ~1.4 s on the dev machine; see the long-exposure wall-clock notes).

import type { LongExposureProgressUpdate } from './capture-session';

export const SEEK_ALLOWANCE_SECONDS = 1.5;
// The readback and resolve, before the window is handed back.
export const RESOLVE_ALLOWANCE_SECONDS = 1.5;

export interface BarMotion {
	// 0..1, where the bar is now.
	from: number;
	// 0..1, where it should arrive, and in how many milliseconds. `to === from`
	// with `ms === 0` means "hold still".
	to: number;
	ms: number;
}

// `previous` is the last per-pass update seen: 'resolving' carries neither the
// timing nor the pass count, so it borrows both.
//
// Null when there is nothing to show (no timing yet, or a phase the bar has no
// place for). The caller then leaves the bar as it is.
//
// `phaseElapsedMs` is how long this pass has been accumulating. When given, the
// time left is the plan's exposure minus that, rather than worked out from the
// reported fraction: the fraction moves in whole replay frames (a quarter of a
// second apart in slow motion), so time left read off it stands still between
// frames and the bar's speed would pulse with every re-aim.
export function longExposureBarMotion(
	update: LongExposureProgressUpdate,
	previous: LongExposureProgressUpdate | null = null,
	phaseElapsedMs: number | null = null
): BarMotion | null {
	const timing = update.timing ?? previous?.timing;
	if (!timing) {
		return null;
	}
	const asked = update.passes ?? previous?.passes;
	const passes = typeof asked === 'number' && asked > 0 ? asked : 1;
	const pass = Math.min(
		passes - 1,
		Math.max(0, typeof update.pass === 'number' ? update.pass : 0)
	);
	const position = SEEK_ALLOWANCE_SECONDS + Math.max(0, timing.warmUpSeconds);
	const exposure = Math.max(0, timing.exposureSeconds);
	const perPass = position + exposure;
	const total = passes * perPass + RESOLVE_ALLOWANCE_SECONDS;
	const at = (seconds: number) => Math.min(1, Math.max(0, seconds / total));
	const passStart = pass * perPass;

	switch (update.phase) {
		case 'seeking':
		case 'warming':
			return {
				from: at(passStart),
				to: at(passStart + position),
				ms: Math.round(position * 1000),
			};
		case 'accumulating': {
			const p =
				typeof update.progress === 'number' &&
				Number.isFinite(update.progress)
					? Math.min(1, Math.max(0, update.progress))
					: 0;
			const left =
				typeof phaseElapsedMs === 'number' &&
				Number.isFinite(phaseElapsedMs)
					? Math.max(0, exposure * 1000 - phaseElapsedMs)
					: (1 - p) * exposure * 1000;
			return {
				from: at(passStart + position + p * exposure),
				to: at(passStart + perPass),
				ms: Math.round(left),
			};
		}
		case 'resolving':
			return {
				from: at(passes * perPass),
				to: 1,
				ms: Math.round(RESOLVE_ALLOWANCE_SECONDS * 1000),
			};
		default:
			return null;
	}
}
