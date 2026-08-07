// Pure auto-update decision cores, extracted from index.ts for the same reason as
// capture-decisions.ts: index.ts pulls electron/sharp/koffi/irsdk at module scope
// and cannot load under vitest. No I/O, no module state, no electron — index.ts
// owns the autoUpdater wiring and calls these for every decision it makes.
//
// In utilities/ rather than main/ because the RENDERER shares it, the same way it
// shares shot-recipe.ts: TitleBar phrases its tooltip with describeUpdate and
// decides whether to render at all with shouldShowUpdateBadge. One copy of the
// wording means the title bar and the Settings line can never disagree about what
// the app is doing.
//
// Background: until this landed the app checked once at startup, downloaded ~114 MB
// silently while the user might be on track, and reported the result as an untitled
// green arrow that clicking quit the app instantly. Each function below is one of
// those behaviours made explicit and testable.

// Where a pending update has got to. `idle` covers both "not checked yet" and
// "checked, nothing newer" — `checkedAt` distinguishes them.
export type UpdatePhase =
	| 'idle'
	| 'checking'
	| 'available'
	| 'downloading'
	| 'downloaded'
	| 'error';

export interface UpdateState {
	phase: UpdatePhase;
	// The version being offered, downloaded or ready. Null when there is nothing to
	// name. electron-updater hands us `info.version` without the leading 'v'.
	version: string | null;
	// Download progress, 0-100, null unless a download is running.
	percent: number | null;
	// Already phrased for display; null unless `phase === 'error'`.
	error: string | null;
	// When the last check RESOLVED (not when it started), epoch ms. Null before the
	// first one completes. Drives both the re-check debounce and the "you're up to
	// date" wording, which must not claim freshness we never established.
	checkedAt: number | null;
}

// A capture in flight is the one thing that makes an update action unsafe, so the
// callers pass it in rather than each re-deriving `longExposureActive || takingScreenshot`.
export interface UpdateBusyInput {
	busy: boolean;
}

export function initialUpdateState(): UpdateState {
	return {
		phase: 'idle',
		version: null,
		percent: null,
		error: null,
		checkedAt: null,
	};
}

// electron-updater's ProgressInfo.percent is a float and, on a resumed or
// mis-reported transfer, can land outside 0-100. Clamped here so no consumer has to
// defend against a 103%-wide progress bar.
export function clampPercent(raw: unknown): number | null {
	if (typeof raw !== 'number' || !Number.isFinite(raw)) {
		return null;
	}
	return Math.max(0, Math.min(100, Math.round(raw)));
}

export type UpdateEvent =
	| { type: 'checking' }
	| { type: 'available'; version: string | null }
	| { type: 'not-available'; version: string | null }
	| { type: 'download-started' }
	| { type: 'progress'; percent: unknown }
	| { type: 'downloaded'; version: string | null }
	| { type: 'error'; message: string };

// The state machine. Every autoUpdater event in index.ts routes through here, so
// the transitions are locked by tests instead of being spread across seven
// listeners that each mutate a shared object.
export function applyUpdateEvent(
	state: UpdateState,
	event: UpdateEvent,
	nowMs: number
): UpdateState {
	switch (event.type) {
		case 'checking':
			// Version is deliberately preserved: a re-check while an update is already
			// staged must not blank the label the title bar is showing.
			return { ...state, phase: 'checking', error: null };

		case 'available':
			return {
				...state,
				phase: 'available',
				version: event.version,
				percent: null,
				error: null,
				checkedAt: nowMs,
			};

		case 'not-available':
			return {
				...state,
				phase: 'idle',
				version: null,
				percent: null,
				error: null,
				checkedAt: nowMs,
			};

		case 'download-started':
			return { ...state, phase: 'downloading', percent: 0, error: null };

		case 'progress':
			return {
				...state,
				phase: 'downloading',
				percent: clampPercent(event.percent),
				error: null,
			};

		case 'downloaded':
			return {
				...state,
				phase: 'downloaded',
				version: event.version ?? state.version,
				percent: 100,
				error: null,
				checkedAt: nowMs,
			};

		case 'error':
			// A DOWNLOADED update outranks a later failure. Without this, one flaky
			// re-check six hours after a successful download would replace a ready
			// install with an error badge — and the bits are still on disk, so the
			// user would be told the update failed while it sits waiting to install
			// on quit (autoInstallOnAppQuit is electron-updater's default).
			if (state.phase === 'downloaded') {
				return state;
			}
			return {
				...state,
				phase: 'error',
				percent: null,
				error: event.message,
			};

		default:
			return state;
	}
}

// Policy: at most one check per this window, however many times we are asked.
export const UPDATE_RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

// How often index.ts ASKS the policy above. Deliberately much shorter than the
// interval so a machine that slept through its slot re-checks soon after waking
// rather than at the next exact multiple.
export const UPDATE_POLL_INTERVAL_MS = 30 * 60 * 1000;

export interface ShouldCheckInput {
	phase: UpdatePhase;
	checkedAt: number | null;
	nowMs: number;
	// Defaults to UPDATE_RECHECK_INTERVAL_MS; injectable for tests.
	minIntervalMs?: number;
	// A user pressing "Check for updates" bypasses the interval — but not the phase
	// guard below, because there is nothing sensible to do mid-check or mid-download.
	force?: boolean;
}

// Whether to start a check now. Called by the startup path, the poll timer, the
// window-focus hook and the Settings button, so the debounce lives in one place and
// focus cannot spam GitHub every time the user alt-tabs back from iRacing.
export function shouldCheckNow({
	phase,
	checkedAt,
	nowMs,
	minIntervalMs = UPDATE_RECHECK_INTERVAL_MS,
	force = false,
}: ShouldCheckInput): boolean {
	// Never interrupt work already in progress.
	if (phase === 'checking' || phase === 'downloading') {
		return false;
	}
	// Something is already staged and waiting on the user. Re-checking cannot
	// improve on that and would churn the title bar out from under a pending
	// decision.
	if (phase === 'available' || phase === 'downloaded') {
		return false;
	}
	if (force || checkedAt === null) {
		return true;
	}
	return nowMs - checkedAt >= minIntervalMs;
}

export interface ActionVerdict {
	allowed: boolean;
	// Why not, phrased for display. Null when allowed.
	reason: string | null;
}

// Downloading is ~114 MB. Starting that while a capture is running competes with
// iRacing for disk and bandwidth at the exact moment the user cares most, which is
// why autoDownload is off and this gate exists.
export function canStartDownload({
	phase,
	busy,
}: UpdateBusyInput & { phase: UpdatePhase }): ActionVerdict {
	if (phase === 'downloading') {
		return { allowed: false, reason: 'The update is already downloading.' };
	}
	if (phase === 'downloaded') {
		return { allowed: false, reason: 'The update is already downloaded.' };
	}
	if (phase !== 'available') {
		return { allowed: false, reason: 'There is no update to download.' };
	}
	if (busy) {
		return {
			allowed: false,
			reason: 'A capture is in progress. Try again once it finishes.',
		};
	}
	return { allowed: true, reason: null };
}

// Installing quits the app. Doing that mid-capture loses the shot — and for a long
// exposure that can be minutes of accumulated work.
export function canInstallNow({
	phase,
	busy,
}: UpdateBusyInput & { phase: UpdatePhase }): ActionVerdict {
	if (phase !== 'downloaded') {
		return { allowed: false, reason: 'No update is ready to install.' };
	}
	if (busy) {
		return {
			allowed: false,
			// Accurate, not a consolation: autoInstallOnAppQuit defaults to true, so
			// the downloaded update really does install on the next normal quit.
			reason:
				'A capture is in progress. The update will install by itself when you close the app.',
		};
	}
	return { allowed: true, reason: null };
}

// One sentence for the title-bar tooltip and the Settings line. The title bar had
// no tooltip at all: a green arrow appeared and the user was left to guess both what
// it meant and what clicking it would do.
export function describeUpdate(
	state: UpdateState,
	currentVersion: string,
	busy = false
): string {
	const version = state.version ? `v${state.version}` : 'A new version';

	switch (state.phase) {
		case 'checking':
			return 'Checking for updates…';

		case 'available':
			return busy
				? `${version} is available. A capture is in progress — you can download it once that finishes.`
				: `${version} is available. Click to download it.`;

		case 'downloading':
			return state.percent === null
				? `Downloading ${version}…`
				: `Downloading ${version} — ${state.percent}%`;

		case 'downloaded':
			return busy
				? `${version} is ready. A capture is in progress, so it will install when you close the app.`
				: `${version} is ready. Click to restart and install it.`;

		case 'error':
			return `Update check failed: ${state.error ?? 'unknown error'}`;

		case 'idle':
		default:
			// Never claim freshness we have not established — before the first check
			// resolves we genuinely do not know.
			return state.checkedAt === null
				? `Updates have not been checked yet (you're on v${currentVersion}).`
				: `You're on the latest version (v${currentVersion}).`;
	}
}

// Whether the title bar shows its update button at all. Idle and checking are
// silent: a spinner that appears every six hours to say nothing would be worse than
// the arrow it replaced. Errors stay in the log and the Settings line — an update
// check failing is not something the user asked about or can act on from here.
export function shouldShowUpdateBadge(state: UpdateState): boolean {
	return (
		state.phase === 'available' ||
		state.phase === 'downloading' ||
		state.phase === 'downloaded'
	);
}
