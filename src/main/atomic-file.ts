// Shared write-safety primitives for files another program owns.
//
// Extracted from iracing-profiles-store so the config-editor store can reuse
// them without sharing (and competing for) the profiles feature's backup
// rotation. Semantics are exactly the originals':
//
//   - writes are staged in the destination's own directory and renamed into
//     place, so a crash leaves the original intact plus a stray temp file,
//     never a truncated ini;
//   - backups are ISO-stamped so lexical order is chronological order, and
//     each backups directory prunes itself to its own MAX_BACKUPS.

import * as fs from 'fs';
import * as path from 'path';

/** Suffix for the staging file used to make writes atomic. */
export const TEMP_SUFFIX = '.iRST-tmp';

/** How many backups a backups directory retains before pruning the oldest. */
export const MAX_BACKUPS = 10;

export function ensureDir(dir: string): void {
	fs.mkdirSync(dir, { recursive: true });
}

/**
 * Replace `destination` with `bytes` without ever leaving a half-written file.
 *
 * Staged in the same directory so the rename stays on one volume — a
 * cross-volume rename degrades to a copy and loses the atomicity that is the
 * entire point.
 */
export function writeAtomic(destination: string, bytes: Buffer): void {
	const temp = destination + TEMP_SUFFIX;
	try {
		fs.writeFileSync(temp, bytes);
		fs.renameSync(temp, destination);
	} catch (error) {
		try {
			fs.unlinkSync(temp);
		} catch {
			// Nothing staged, or already gone.
		}
		throw error;
	}
}

/**
 * Preserve a file into `backupsDir` as `<baseName>.<iso-stamp>.ini` before it
 * is overwritten. Returns false when there was nothing to preserve (no source
 * file). A FAILURE to write the backup propagates — the caller decides whether
 * losing the safety net should abort the operation.
 */
export function backupFile(
	sourcePath: string,
	backupsDir: string,
	baseName: string
): boolean {
	let bytes: Buffer;
	try {
		bytes = fs.readFileSync(sourcePath);
	} catch {
		// Nothing to preserve.
		return false;
	}

	ensureDir(backupsDir);
	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	fs.writeFileSync(path.join(backupsDir, `${baseName}.${stamp}.ini`), bytes);
	pruneBackups(backupsDir);
	return true;
}

export function pruneBackups(
	backupsDir: string,
	maxBackups: number = MAX_BACKUPS
): void {
	try {
		const files = fs
			.readdirSync(backupsDir)
			.filter((file) => file.toLowerCase().endsWith('.ini'))
			.sort();
		// Names are ISO-stamped, so lexical order is chronological order.
		for (const stale of files.slice(
			0,
			Math.max(0, files.length - maxBackups)
		)) {
			fs.unlinkSync(path.join(backupsDir, stale));
		}
	} catch {
		// Pruning is housekeeping — never fail a write over it.
	}
}
