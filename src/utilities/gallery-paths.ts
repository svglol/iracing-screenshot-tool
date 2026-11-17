// Gallery paths shared by the renderer (Home.vue) and main (the WGC save path):
// where a screenshot's thumbnail lives, and which folders the gallery may browse.
//
// THUMBNAILS. The screenshot folder's own files keep the cache layout they have
// always had, `<cache>/<name>.webp`, so existing caches stay valid. A file in a
// subfolder gets `<cache>/folders/<key>/<name>.webp`, keyed by its folder. Without
// that, two folders holding the same name — every capture grid writes
// `Daytona-GNG B-0.jpg` into its own folder, and the screenshot folder may hold
// one too — share one thumbnail, and the gallery shows the wrong picture.
//
// Each keyed folder carries a SOURCE_MARKER file naming the folder it belongs to,
// so a cache whose folder was deleted can be found and pruned.

const path: typeof import('path') = require('path');
const crypto: typeof import('crypto') = require('crypto');

export const FOLDER_CACHE_DIR = 'folders';
export const SOURCE_MARKER = 'source.txt';

// Windows paths compare without case; resolve first so `a\b\..\c` and `a\c` agree.
export function comparablePath(p: string): string {
	const resolved = path.resolve(p);
	const trimmed =
		resolved.length > path.parse(resolved).root.length
			? resolved.replace(/[\\/]+$/, '')
			: resolved;
	return process.platform === 'win32' ? trimmed.toLowerCase() : trimmed;
}

export function samePath(a: string, b: string): boolean {
	return comparablePath(a) === comparablePath(b);
}

// True when `candidate` is `root` or somewhere below it.
export function isInsideFolder(root: string, candidate: string): boolean {
	const r = comparablePath(root);
	const c = comparablePath(candidate);
	if (c === r) {
		return true;
	}
	const prefix = r.endsWith(path.sep) ? r : r + path.sep;
	return c.startsWith(prefix);
}

export function folderCacheKey(folder: string): string {
	return crypto
		.createHash('sha1')
		.update(comparablePath(folder))
		.digest('hex')
		.slice(0, 16);
}

// The cache directory for thumbnails of files directly in `folder`.
export function thumbnailDirFor(
	cacheDir: string,
	rootDir: string,
	folder: string
): string {
	return samePath(folder, rootDir)
		? cacheDir
		: path.join(cacheDir, FOLDER_CACHE_DIR, folderCacheKey(folder));
}

export function galleryThumbnailPath(
	cacheDir: string,
	rootDir: string,
	filePath: string
): string {
	return path.join(
		thumbnailDirFor(cacheDir, rootDir, path.dirname(filePath)),
		`${path.parse(filePath).name}.webp`
	);
}

// Create the thumbnail directory for `folder` and, for a keyed one, its marker.
export function ensureThumbnailDir(
	fs: Pick<typeof import('fs'), 'mkdirSync' | 'existsSync' | 'writeFileSync'>,
	cacheDir: string,
	rootDir: string,
	folder: string
): string {
	const dir = thumbnailDirFor(cacheDir, rootDir, folder);
	fs.mkdirSync(dir, { recursive: true });
	if (dir !== cacheDir) {
		const marker = path.join(dir, SOURCE_MARKER);
		if (!fs.existsSync(marker)) {
			fs.writeFileSync(marker, path.resolve(folder), 'utf8');
		}
	}
	return dir;
}

export interface Crumb {
	label: string;
	path: string;
}

// The breadcrumb from the screenshot folder down to `folder`. A folder outside
// the root yields just the root.
export function folderCrumbs(rootDir: string, folder: string): Crumb[] {
	const root = path.resolve(rootDir);
	const crumbs: Crumb[] = [{ label: path.basename(root) || root, path: root }];
	if (!isInsideFolder(root, folder) || samePath(root, folder)) {
		return crumbs;
	}
	let current = root;
	for (const segment of path
		.relative(root, path.resolve(folder))
		.split(path.sep)
		.filter(Boolean)) {
		current = path.join(current, segment);
		crumbs.push({ label: segment, path: current });
	}
	return crumbs;
}

// A subfolder as the thumbnail strip shows it: its newest image is the cover,
// and that image's time is where the folder sits among the images.
export interface GalleryFolderEntry {
	fullPath: string;
	name: string;
	// The newest image directly inside, or null when there is none.
	cover: string | null;
	coverModified: number | null;
	// The folder's own modification time, for a folder with no images.
	modified: number;
}

export function folderSortTime(folder: GalleryFolderEntry): number {
	return folder.coverModified ?? folder.modified;
}

export type GalleryStripEntry<I> =
	| { kind: 'image'; entry: I; time: number }
	| { kind: 'folder'; entry: GalleryFolderEntry; time: number };

// Images and folders in one list, newest first: an image by its own time, a
// folder by its newest image's. On a tie the image comes first.
export function mergeGalleryEntries<I extends { modified: number }>(
	images: readonly I[],
	folders: readonly GalleryFolderEntry[]
): GalleryStripEntry<I>[] {
	const merged: GalleryStripEntry<I>[] = [
		...images.map((entry) => ({
			kind: 'image' as const,
			entry,
			time: entry.modified,
		})),
		...folders.map((entry) => ({
			kind: 'folder' as const,
			entry,
			time: folderSortTime(entry),
		})),
	];
	return merged.sort(
		(a, b) =>
			b.time - a.time ||
			(a.kind === b.kind ? 0 : a.kind === 'image' ? -1 : 1)
	);
}
