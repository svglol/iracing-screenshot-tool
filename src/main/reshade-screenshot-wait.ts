// Waiting for ReShade to drop a screenshot into its folder.
//
// In ReShade mode the app does not grab a frame itself: it resizes iRacing, the
// user presses ReShade's own screenshot key, and this watches ReShade's output
// folder for the file that appears. Moved out of index.ts (where it could not be
// tested) with its matching rules unchanged:
//
//   - only .bmp/.jpg/.jpeg/.png files count;
//   - a file already in the folder when the wait began counts only if it is then
//     rewritten (newer mtime or a different size);
//   - a new file counts if its mtime is no more than a second before the wait
//     began (clock granularity on the write);
//   - the newest candidate wins, once its size and mtime hold still for one poll.
//
// What changed is cancellation. It used to be a module-level callback that the
// wait registered only AFTER its first directory read, so an abort arriving during
// that read was lost and the wait ran its full 30 s; and a late registration could
// overwrite the callback of a newer wait. Now each wait takes its own AbortSignal,
// honoured at every point. The watcher also gets an 'error' listener — without
// one, a watcher error (the folder removed mid-wait) was an uncaught exception.

import * as fs from 'fs';
import * as path from 'path';
import { normalizeFileKey } from './main-utils';
import { createLogger } from '../utilities/logger';

const log = createLogger('reshade-wait');

const SUPPORTED_EXTENSIONS = new Set(['.bmp', '.jpeg', '.jpg', '.png']);

export const RESHADE_WAIT_TIMEOUT_MS = 30000;
export const RESHADE_TIMEOUT_MESSAGE =
	'Timed out waiting for a ReShade screenshot';

export interface ReshadeFileInfo {
	fullPath: string;
	key: string;
	mtimeMs: number;
	size: number;
}

export async function listReshadeScreenshotFiles(
	folder: string
): Promise<ReshadeFileInfo[]> {
	let entries: fs.Dirent[] = [];

	try {
		entries = await fs.promises.readdir(folder, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return [];
		}

		throw error;
	}

	const files: ReshadeFileInfo[] = [];

	for (const entry of entries) {
		if (!entry.isFile()) {
			continue;
		}

		const fullPath = path.join(folder, entry.name);
		const extension = path.extname(entry.name).toLowerCase();

		if (!SUPPORTED_EXTENSIONS.has(extension)) {
			continue;
		}

		try {
			const stats = await fs.promises.stat(fullPath);
			files.push({
				fullPath,
				key: normalizeFileKey(fullPath),
				mtimeMs: stats.mtimeMs,
				size: stats.size,
			});
		} catch (error) {
			log.warn('ReShade screenshot stat failed', {
				fullPath,
				error: (error as Error)?.message || String(error),
			});
		}
	}

	return files;
}

export async function findLatestReshadeScreenshot(
	folder: string,
	baselineFiles: Map<string, ReshadeFileInfo>,
	startedAt: number
): Promise<ReshadeFileInfo | null> {
	const files = await listReshadeScreenshotFiles(folder);
	const candidates = files.filter((file) => {
		const previous = baselineFiles.get(file.key);

		if (!previous) {
			return file.mtimeMs >= startedAt - 1000;
		}

		return file.mtimeMs > previous.mtimeMs || file.size !== previous.size;
	});

	candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
	return candidates[0] || null;
}

export interface SettleOptions {
	attempts?: number;
	intervalMs?: number;
	// Stop early (the wait was cancelled or already finished).
	stopped?: () => boolean;
}

// Wait until two consecutive stats agree on a non-zero size and mtime. Gives up
// quietly after `attempts` — the caller then reads whatever is there, exactly as
// before — and rethrows only if the file still cannot be stat'ed on the last try.
export async function waitForFileToSettle(
	filePath: string,
	{
		attempts = 12,
		intervalMs = 250,
		stopped = () => false,
	}: SettleOptions = {}
): Promise<void> {
	let previousStats: { size: number; mtimeMs: number } | null = null;

	for (let index = 0; index < attempts && !stopped(); index += 1) {
		try {
			const stats = await fs.promises.stat(filePath);

			if (
				previousStats &&
				stats.size > 0 &&
				stats.size === previousStats.size &&
				stats.mtimeMs === previousStats.mtimeMs
			) {
				return;
			}

			previousStats = {
				size: stats.size,
				mtimeMs: stats.mtimeMs,
			};
		} catch (error) {
			if (index === attempts - 1) {
				throw error;
			}
		}

		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}
}

export interface ReshadeWaitOptions {
	timeoutMs?: number;
	// Cancels the wait, which rejects with the signal's reason when that is an
	// Error (abort() alone gives the platform's AbortError).
	signal?: AbortSignal;
	// How often the folder is re-scanned in case the watcher misses an event.
	pollMs?: number;
	settle?: Omit<SettleOptions, 'stopped'>;
}

function abortError(signal: AbortSignal): Error {
	return signal.reason instanceof Error
		? signal.reason
		: new Error('Screenshot cancelled');
}

export async function waitForReshadeScreenshot(
	folder: string,
	{
		timeoutMs = RESHADE_WAIT_TIMEOUT_MS,
		signal,
		pollMs = 500,
		settle,
	}: ReshadeWaitOptions = {}
): Promise<string> {
	if (signal?.aborted) {
		throw abortError(signal);
	}

	fs.mkdirSync(folder, { recursive: true });

	const baselineFiles = new Map<string, ReshadeFileInfo>(
		(await listReshadeScreenshotFiles(folder)).map((file) => [file.key, file])
	);
	// The baseline read is an await: an abort that arrived during it must still
	// stop the wait here, not 30 s from now.
	if (signal?.aborted) {
		throw abortError(signal);
	}
	const startedAt = Date.now();

	return new Promise<string>((resolve, reject) => {
		let settled = false;
		let scanInFlight = false;
		let watcher: fs.FSWatcher | undefined;
		let poller: NodeJS.Timeout | undefined;
		let timeoutId: NodeJS.Timeout | undefined;

		const onAbort = (): void => {
			finish(reject, abortError(signal as AbortSignal));
		};

		const finish = <T>(callback: (value: T) => void, value: T): void => {
			if (settled) {
				return;
			}

			settled = true;

			if (watcher) {
				watcher.close();
			}

			if (poller) {
				clearInterval(poller);
			}

			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			signal?.removeEventListener('abort', onAbort);

			callback(value);
		};

		const scan = async (): Promise<void> => {
			if (settled || scanInFlight) {
				return;
			}

			scanInFlight = true;

			try {
				const candidate = await findLatestReshadeScreenshot(
					folder,
					baselineFiles,
					startedAt
				);

				if (candidate) {
					await waitForFileToSettle(candidate.fullPath, {
						...settle,
						stopped: () => settled,
					});
					finish(resolve, candidate.fullPath);
				}
			} catch (error) {
				finish(reject, error as Error);
			} finally {
				scanInFlight = false;
			}
		};

		try {
			watcher = fs.watch(folder, () => {
				void scan();
			});
		} catch (error) {
			finish(reject, error as Error);
			return;
		}
		// The poller below keeps scanning, so a broken watcher only costs latency.
		watcher.on('error', (error) => {
			log.warn('ReShade folder watcher failed — polling only', {
				folder,
				error: (error as Error)?.message || String(error),
			});
			watcher?.close();
		});

		poller = setInterval(() => {
			void scan();
		}, pollMs);

		timeoutId = setTimeout(() => {
			finish(reject, new Error(RESHADE_TIMEOUT_MESSAGE));
		}, timeoutMs);

		signal?.addEventListener('abort', onAbort, { once: true });
		void scan();
	});
}
