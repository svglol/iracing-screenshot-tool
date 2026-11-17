import { describe, expect, it } from 'vitest';
import * as path from 'path';
import {
	FOLDER_CACHE_DIR,
	SOURCE_MARKER,
	ensureThumbnailDir,
	folderCrumbs,
	folderSortTime,
	galleryThumbnailPath,
	isInsideFolder,
	mergeGalleryEntries,
	samePath,
	type GalleryFolderEntry,
} from './gallery-paths';

const root = path.resolve('/shots/Screenshots');
const cache = path.resolve('/appdata/Cache');
const grid = path.join(root, 'Daytona grid 2026-11-17_19-04-36');
const grid2 = path.join(root, 'Daytona grid 2026-11-17_19-05-07');

describe('galleryThumbnailPath', () => {
	it('keeps the existing flat layout for the screenshot folder itself', () => {
		expect(
			galleryThumbnailPath(
				cache,
				root,
				path.join(root, 'Daytona-GNG B-0.jpg')
			)
		).toBe(path.join(cache, 'Daytona-GNG B-0.webp'));
	});

	it('gives the same file name in two grid folders two different thumbnails', () => {
		const a = galleryThumbnailPath(
			cache,
			root,
			path.join(grid, 'Daytona-GNG B-0.jpg')
		);
		const b = galleryThumbnailPath(
			cache,
			root,
			path.join(grid2, 'Daytona-GNG B-0.jpg')
		);
		expect(a).not.toBe(b);
		expect(a).not.toBe(path.join(cache, 'Daytona-GNG B-0.webp'));
		expect(path.dirname(path.dirname(a))).toBe(
			path.join(cache, FOLDER_CACHE_DIR)
		);
	});

	it('is stable for the same folder however it is spelled', () => {
		const a = galleryThumbnailPath(cache, root, path.join(grid, 'x.jpg'));
		const b = galleryThumbnailPath(
			cache,
			root + path.sep,
			path.join(grid, '..', path.basename(grid), 'x.png')
		);
		expect(a).toBe(b);
	});
});

describe('isInsideFolder / samePath', () => {
	it('accepts the root and anything under it, nothing beside it', () => {
		expect(isInsideFolder(root, root)).toBe(true);
		expect(isInsideFolder(root, grid)).toBe(true);
		expect(isInsideFolder(root, path.dirname(root))).toBe(false);
		// A sibling that merely shares the prefix.
		expect(isInsideFolder(root, root + ' old')).toBe(false);
		expect(samePath(root + path.sep, root)).toBe(true);
	});
});

describe('folderCrumbs', () => {
	it('is just the root at the root', () => {
		expect(folderCrumbs(root, root)).toEqual([
			{ label: 'Screenshots', path: root },
		]);
	});

	it('walks down from the root', () => {
		const deep = path.join(grid, 'picks');
		expect(folderCrumbs(root, deep).map((c) => c.label)).toEqual([
			'Screenshots',
			path.basename(grid),
			'picks',
		]);
		expect(folderCrumbs(root, deep).at(-1)?.path).toBe(deep);
	});

	it('never leaves the root', () => {
		expect(folderCrumbs(root, path.dirname(root))).toHaveLength(1);
	});
});

describe('ensureThumbnailDir', () => {
	function memFs() {
		const files = new Map<string, string>();
		const dirs = new Set<string>();
		return {
			files,
			dirs,
			mkdirSync: ((p: string) => {
				dirs.add(p);
			}) as never,
			existsSync: ((p: string) => files.has(p)) as never,
			writeFileSync: ((p: string, data: string) => {
				files.set(p, data);
			}) as never,
		};
	}

	it('marks a keyed folder with its source, and leaves the root cache bare', () => {
		const fs = memFs();
		const dir = ensureThumbnailDir(fs, cache, root, grid);
		expect(fs.files.get(path.join(dir, SOURCE_MARKER))).toBe(grid);
		expect(ensureThumbnailDir(fs, cache, root, root)).toBe(cache);
		expect(fs.files.size).toBe(1);
	});
});

describe('mergeGalleryEntries', () => {
	const folder = (
		name: string,
		coverModified: number | null,
		modified = 0
	): GalleryFolderEntry => ({
		fullPath: `C:/Shots/${name}`,
		name,
		cover: coverModified === null ? null : `C:/Shots/${name}/a.jpg`,
		coverModified,
		modified,
	});

	it('places each folder by its newest image, among the images', () => {
		const merged = mergeGalleryEntries(
			[
				{ name: 'new.jpg', modified: 500 },
				{ name: 'mid.jpg', modified: 300 },
				{ name: 'old.jpg', modified: 100 },
			],
			[folder('grid A', 400, 9999), folder('grid B', 200)]
		);
		expect(
			merged.map((m) => (m.kind === 'image' ? m.entry.name : m.entry.name))
		).toEqual(['new.jpg', 'grid A', 'mid.jpg', 'grid B', 'old.jpg']);
	});

	it('places a folder without images by its own time', () => {
		const merged = mergeGalleryEntries(
			[{ name: 'a.jpg', modified: 300 }],
			[folder('empty', null, 400)]
		);
		expect(merged.map((m) => m.kind)).toEqual(['folder', 'image']);
		expect(folderSortTime(folder('empty', null, 400))).toBe(400);
	});

	it('puts the image first on a tie', () => {
		const merged = mergeGalleryEntries(
			[{ name: 'a.jpg', modified: 300 }],
			[folder('f', 300)]
		);
		expect(merged.map((m) => m.kind)).toEqual(['image', 'folder']);
	});
});
