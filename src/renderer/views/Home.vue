<template>
	<!-- The view fills the space under the title bar. A bare 100vh here
	     overshoots by that bar: the app-shell (and the nav rail stretching
	     with it) then runs past the window bottom. -->
	<div
		class="columns is-gapless"
		style="
			margin-top: 0px;
			height: calc(100vh - var(--titlebar-height, 24px));
		"
	>
		<div
			class="column is-2 shadow"
			style="
				background-color: rgba(0, 0, 0, 0.5);
				display: flex;
				flex-direction: column;
				min-width: 240px;
				max-width: 240px;
				min-height: 0;
			"
		>
			<!-- The controls scroll, the footer does not. `html` is overflow:hidden
			     and this column is pinned to the view height, so without a scroll
			     region here anything taller than the window is not merely cut off —
			     it is unreachable. Expanding the long-exposure panel could put its
			     own Capture button past the bottom edge with no way to reach it. -->
			<div class="sidebar-scroll">
				<SideBar @screenshot="screenshot" />
			</div>
			<div class="sidebar-footer">
				<PromoCard class="sidebar-promo" />
			</div>

			<!-- Auto-opened after an update. Hosted here (not on the Settings
			     page) because Home is the view that is mounted at startup. -->
			<o-modal
				v-model:active="showChangelog"
				has-modal-card
				trap-focus
				:can-cancel="false"
				aria-role="dialog"
				aria-modal
			>
				<ChangelogModal @close="showChangelog = false" />
			</o-modal>
		</div>

		<div class="column">
			<div v-if="showGallery" class="gallery-column">
				<div
					class="columns is-gapless"
					style="
						margin-bottom: 0.15rem;
						background-color: rgba(0, 0, 0, 0.2);
						flex-shrink: 0;
					"
				>
					<div class="column is-9">
						<div
							class="control"
							style="
								padding-top: 0.5rem;
								padding-bottom: 0.5rem;
								padding-left: 0.5rem;
							"
						>
							<div style="font-weight: bold">{{ fileName }}</div>
							<div
								v-if="imageMeta"
								style="
									font-size: 0.7rem;
									font-weight: 300;
									letter-spacing: 0.06em;
									line-height: 1.2;
									color: var(--bulma-primary);
								"
							>
								{{ imageMeta }}
							</div>
						</div>
					</div>
					<div class="column" style="margin-left: 5rem">
						<ul
							class="toolbar"
							style="
								padding-right: 0.5rem;
								padding-top: 0.25rem;
								padding-bottom: 0.25rem;
							"
						>
							<li>
								<a
									v-show="false"
									v-shortkey="['del']"
									@click="deleteFile"
									@shortkey="deleteFile"
									><font-awesome-icon :icon="['fas', 'trash']"
								/></a>
							</li>
							<li>
								<a v-show="false" @click="openFolder"
									><font-awesome-icon :icon="['fas', 'folder']"
								/></a>
							</li>
							<li>
								<a
									v-show="false"
									v-shortkey="['ctrl', 'c']"
									@shortkey="copy"
									@click="copy"
									><font-awesome-icon :icon="['fas', 'copy']"
								/></a>
							</li>
							<li>
								<a v-show="false" @click="openExternally"
									><font-awesome-icon
										:icon="['fas', 'up-right-from-square']"
								/></a>
							</li>
						</ul>
					</div>
				</div>

				<!-- Folder navigation. Only shown where there is somewhere to go, so a
				     flat screenshot folder looks exactly as before. -->
				<nav
					v-if="showFolderBar"
					class="gallery-folders"
					:aria-label="$t('gallery.folders.label')"
				>
					<button
						type="button"
						class="gallery-folders__icon-btn"
						:disabled="atRoot"
						:title="$t('gallery.folders.up')"
						:aria-label="$t('gallery.folders.up')"
						@click="goUpFolder"
					>
						<font-awesome-icon :icon="['fas', 'arrow-up']" />
					</button>

					<ol class="gallery-folders__crumbs">
						<li
							v-for="(crumb, i) in crumbs"
							:key="crumb.path"
							class="gallery-folders__crumb"
						>
							<font-awesome-icon
								v-if="i > 0"
								class="gallery-folders__sep"
								:icon="['fas', 'chevron-right']"
								aria-hidden="true"
							/>
							<span
								v-if="i === crumbs.length - 1"
								class="gallery-folders__current"
								aria-current="location"
								:title="crumb.path"
								>{{ crumb.label }}</span
							>
							<button
								v-else
								type="button"
								class="gallery-folders__crumb-btn"
								:title="crumb.path"
								@click="openGalleryFolder(crumb.path)"
							>
								{{ crumb.label }}
							</button>
						</li>
					</ol>

					<div
						v-if="subfolders.length > 0"
						ref="folderMenu"
						class="gallery-folders__menu"
						@keydown="onFolderMenuKey"
					>
						<button
							ref="folderMenuButton"
							type="button"
							class="gallery-folders__menu-btn"
							aria-haspopup="menu"
							:aria-expanded="folderMenuOpen ? 'true' : 'false'"
							@click="toggleFolderMenu"
						>
							<font-awesome-icon :icon="['fas', 'folder']" />
							<span>{{
								$t('gallery.folders.subfolders', {
									count: String(subfolders.length),
								})
							}}</span>
							<font-awesome-icon
								class="gallery-folders__caret"
								:class="{ 'is-open': folderMenuOpen }"
								:icon="['fas', 'chevron-down']"
								aria-hidden="true"
							/>
						</button>
						<ul
							v-if="folderMenuOpen"
							class="gallery-folders__list"
							role="menu"
							:aria-label="$t('gallery.folders.subfoldersLabel')"
						>
							<li
								v-for="folder in subfolders"
								:key="folder.fullPath"
								role="none"
							>
								<button
									type="button"
									role="menuitem"
									class="gallery-folders__item"
									:title="folder.name"
									@click="openGalleryFolder(folder.fullPath)"
								>
									<font-awesome-icon
										:icon="['fas', 'folder']"
										aria-hidden="true"
									/>
									<span>{{ folder.name }}</span>
								</button>
							</li>
						</ul>
					</div>

					<button
						v-if="!atRoot"
						type="button"
						class="gallery-folders__restore"
						:title="rootFolder"
						@click="restoreRootFolder"
					>
						<font-awesome-icon :icon="['fas', 'house']" />
						<span>{{ $t('gallery.folders.backToRoot') }}</span>
					</button>
				</nav>

				<div id="carousel" class="gallery-virtual">
					<figure
						class="gallery-virtual__preview"
						:draggable="false"
						@contextmenu.prevent.stop="
							activeItem && handleClick($event, activeItem)
						"
					>
						<img
							v-if="activeItem"
							:src="activeItem.file"
							:draggable="false"
						/>
						<div v-else class="gallery-empty">
							<font-awesome-icon
								class="gallery-empty__icon"
								:icon="['fas', 'images']"
								aria-hidden="true"
							/>
							<p>{{ $t('gallery.folders.empty') }}</p>
							<button
								v-if="!atRoot"
								type="button"
								class="gallery-folders__restore"
								@click="restoreRootFolder"
							>
								<font-awesome-icon :icon="['fas', 'house']" />
								<span>{{ $t('gallery.folders.backToRoot') }}</span>
							</button>
						</div>
					</figure>

					<div
						class="gallery-virtual__strip"
						@wheel.prevent="onStripWheel"
					>
						<template v-for="(item, i) in visibleItems" :key="item.key">
							<!-- A folder: its newest image under its name; opens on click. -->
							<figure
								v-if="item.kind === 'folder'"
								class="gallery-virtual__thumb gallery-virtual__thumb--folder"
								role="button"
								tabindex="0"
								:data-folder-path="item.folderPath"
								:title="item.name"
								:aria-label="
									$t('gallery.folders.open', { name: item.name })
								"
								:draggable="false"
								@click="selectIndex(windowStart + i)"
								@keydown.enter.prevent="selectIndex(windowStart + i)"
								@keydown.space.prevent="selectIndex(windowStart + i)"
								@contextmenu.prevent.stop
							>
								<img
									v-if="item.thumb"
									v-lazy="getImageUrl(item)"
									:draggable="false"
									alt=""
								/>
								<div v-else class="gallery-virtual__folder-blank">
									<font-awesome-icon
										:icon="['fas', 'folder']"
										aria-hidden="true"
									/>
								</div>
								<figcaption class="gallery-virtual__folder-name">
									<font-awesome-icon
										:icon="['fas', 'folder']"
										aria-hidden="true"
									/>
									<span>{{ item.name }}</span>
								</figcaption>
							</figure>
							<figure
								v-else
								class="gallery-virtual__thumb"
								:class="{
									'gallery-virtual__thumb--active':
										windowStart + i === selected,
								}"
								:draggable="false"
								@click="selectIndex(windowStart + i)"
								@contextmenu.prevent.stop="handleClick($event, item)"
							>
								<img v-lazy="getImageUrl(item)" :draggable="false" />
							</figure>
						</template>
					</div>
				</div>

				<vue-simple-context-menu
					:ref="'vueSimpleContextMenu'"
					:element-id="'myUniqueId'"
					:options="options"
					@option-clicked="optionClicked"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import SideBar from '../components/SideBar.vue';
import PromoCard from '../components/PromoCard.vue';
import ChangelogModal from '../components/ChangelogModal.vue';
import config from '../../utilities/config';
import {
	FOLDER_CACHE_DIR,
	SOURCE_MARKER,
	ensureThumbnailDir,
	folderCrumbs,
	galleryThumbnailPath,
	isInsideFolder,
	mergeGalleryEntries,
	samePath,
	thumbnailDirFor,
	type GalleryFolderEntry,
} from '../../utilities/gallery-paths';
import { useOruga } from '@oruga-ui/oruga-next';
import { version, repository } from '../../../package.json';

const { ipcRenderer, clipboard, shell, nativeImage } = require('electron');
const sizeOf = require('image-size');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const userDataPath = ipcRenderer.sendSync('app:getPath-sync', 'userData');

// Startup changelog plumbing, moved here from the old sidebar Settings
// toolbar when its entries became rail pages: Home is the view mounted at
// startup, so it owns "fetch the releases and surface the changelog once
// after an update".
const changelogFile = userDataPath + '\\releases.json';
const changelogApiUrl = `https://api.github.com/repos/${getRepositorySlug(repository)}/releases`;

function getRepositorySlug(repo) {
	const fallback = 'svglol/iracing-screenshot-tool';
	const raw = typeof repo === 'string' ? repo : repo?.url;

	if (!raw) {
		return fallback;
	}

	const slug = raw
		.replace(/^git\+/, '')
		.replace(/^https?:\/\/github\.com\//i, '')
		.replace(/^git@github\.com:/i, '')
		.replace(/^github:/i, '')
		.replace(/\.git$/i, '')
		.replace(/^\/+/, '')
		.trim();

	return slug || fallback;
}

const EMPTY_IMAGE =
	'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const THUMBNAIL_CONCURRENCY = 4;
const THUMB_GEN_RADIUS = 50;
// Window of items rendered in the bottom thumbnail strip. The full items
// array is unbounded — virtualization slices a window of this size around
// the active selection so the DOM stays small while all items remain
// reachable via wheel/click navigation. 5 thumbs each side of the active
// center, symmetric for any selected position not near the start/end edges.
const VISIBLE_WINDOW_SIZE = 11;
// Image extensions the gallery treats as screenshots. Must stay in sync with
// FORMAT_MAP in Worker.vue (the formats this app writes: .jpg/.png/.webp) and
// listReshadeScreenshotFiles in main/index.ts (ReShade can drop .bmp/.jpeg
// alongside our own output). Restricting to .png alone caused users on the
// default outputFormat ('jpeg' → .jpg) to see an empty/under-populated gallery.
const SUPPORTED_GALLERY_EXTENSIONS = new Set([
	'.bmp',
	'.jpeg',
	'.jpg',
	'.png',
	'.webp',
]);

// The configured screenshot folder, and the folder the gallery is showing — the
// root or any folder below it. Both keep a trailing separator.
let rootDir = normalizeFolder(config.get('screenshotFolder'));
let dir = rootDir;

function normalizeFolder(folder) {
	const resolved = path.resolve(folder || '.');
	return resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
}

function toDisplayPath(filePath) {
	return filePath.replace(/\\/g, '/');
}

function toFsPath(filePath) {
	return path.normalize(filePath.replace(/\//g, path.sep));
}

function ensureDirectory(targetDir) {
	fs.mkdirSync(targetDir, { recursive: true });
}

function getCacheDir() {
	return path.join(userDataPath, 'Cache');
}

// Folder-aware, and shared with main's WGC save path (gallery-paths.ts): the
// root's thumbnails stay where they always were, a subfolder's are keyed by it.
function getThumbnailPath(filePath) {
	return galleryThumbnailPath(getCacheDir(), rootDir, filePath);
}

function copyImageToClipboard(filePath) {
	const image = nativeImage.createFromPath(filePath);
	if (!image.isEmpty()) {
		clipboard.writeImage(image);
	}
}

// How many folders Backspace can walk back through.
const MAX_FOLDER_HISTORY = 50;

// Whether a key event is going into something the user types in, where
// Backspace deletes text and must not navigate.
function isTextEntry(target: EventTarget | null): boolean {
	const el = target as HTMLElement | null;
	if (!el || !el.tagName) {
		return false;
	}
	if (el.isContentEditable) {
		return true;
	}
	const tag = el.tagName.toLowerCase();
	if (tag === 'textarea' || tag === 'select') {
		return true;
	}
	if (tag !== 'input') {
		return false;
	}
	const type = (el as HTMLInputElement).type.toLowerCase();
	return ![
		'button',
		'checkbox',
		'radio',
		'range',
		'submit',
		'reset',
		'color',
		'file',
		'image',
	].includes(type);
}

function normalizeComparePath(filePath) {
	return path.normalize(filePath).toLowerCase();
}

async function ensureThumbnail(sourceFile, thumbFile) {
	if (fs.existsSync(thumbFile)) {
		return;
	}

	await sharp(sourceFile)
		.resize(1280, 720, {
			fit: 'contain',
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		})
		.toFile(thumbFile);
}

// A subfolder's newest image (the cover its strip tile shows), or null.
async function newestImageIn(folder) {
	let names = [];
	try {
		names = await fs.promises.readdir(folder);
	} catch (error) {
		console.log(error);
		return null;
	}
	const stamped = await Promise.all(
		names
			.filter((name) =>
				SUPPORTED_GALLERY_EXTENSIONS.has(path.extname(name).toLowerCase())
			)
			.map(async (name) => {
				const fullPath = path.join(folder, name);
				try {
					const stats = await fs.promises.stat(fullPath);
					return stats.isFile()
						? { fullPath, modified: stats.mtimeMs }
						: null;
				} catch {
					return null;
				}
			})
	);
	let newest = null;
	for (const entry of stamped) {
		if (entry && (!newest || entry.modified > newest.modified)) {
			newest = entry;
		}
	}
	return newest;
}

// The images (newest first) and the subfolders of the folder being shown —
// each subfolder with its newest image, and sorted by it, newest first.
async function listGalleryEntries() {
	if (samePath(dir, rootDir)) {
		// The screenshot folder may not exist yet on a first run; a subfolder that
		// is gone is NOT recreated — the caller falls back to the root.
		ensureDirectory(dir);
	}
	ensureDirectory(getCacheDir());
	ensureThumbnailDir(fs, getCacheDir(), rootDir, dir);

	let dirents = [];

	try {
		dirents = await fs.promises.readdir(dir, { withFileTypes: true });
	} catch (error) {
		console.log(error);
		return { images: [], folders: [], missing: true };
	}

	const entries = await Promise.all(
		dirents.map(async (dirent) => {
			const fullPath = path.join(dir, dirent.name);
			const isFolder = dirent.isDirectory();
			const extension = path.extname(dirent.name).toLowerCase();
			if (!isFolder && !SUPPORTED_GALLERY_EXTENSIONS.has(extension)) {
				return null;
			}
			try {
				const stats = await fs.promises.stat(fullPath);
				return {
					fullPath,
					name: dirent.name,
					isFolder,
					modified: stats.mtimeMs,
				};
			} catch (error) {
				console.log(error);
				return null;
			}
		})
	);

	const present = entries
		.filter(Boolean)
		.sort((a, b) => b.modified - a.modified);
	const folders: GalleryFolderEntry[] = await Promise.all(
		present
			.filter((entry) => entry.isFolder)
			.map(async ({ fullPath, name, modified }) => {
				const cover = await newestImageIn(fullPath);
				return {
					fullPath,
					name,
					cover: cover ? cover.fullPath : null,
					coverModified: cover ? cover.modified : null,
					modified,
				};
			})
	);
	return {
		images: present.filter((entry) => !entry.isFolder),
		folders: mergeGalleryEntries([], folders).map((m) => m.entry),
		missing: false,
	};
}

// One image in the strip (and the preview).
function imageItem(filePath) {
	const thumbFsPath = getThumbnailPath(filePath);
	return {
		kind: 'image',
		key: filePath,
		file: toDisplayPath(filePath),
		// Always start blank; ensureWindowThumbnails fills in cached or
		// freshly-resized thumbs for items in the active window. For already-
		// cached items, ensureThumbnail returns early without doing sharp work,
		// so cached thumbs surface near-instantly once the window includes them.
		thumb: EMPTY_IMAGE,
		thumbDisplayPath: toDisplayPath(thumbFsPath),
		thumbFsPath,
		sourcePath: filePath,
	};
}

// A subfolder in the strip: its newest image as the cover (thumbnailed into
// that folder's own cache, where the folder will look for it once opened), or
// just a folder icon when it holds no images. Clicking it opens it.
function folderItem(folder: GalleryFolderEntry) {
	const thumbFsPath = folder.cover ? getThumbnailPath(folder.cover) : null;
	return {
		kind: 'folder',
		key: `folder:${folder.fullPath}`,
		file: '',
		name: folder.name,
		folderPath: folder.fullPath,
		thumb: thumbFsPath ? EMPTY_IMAGE : null,
		thumbDisplayPath: thumbFsPath ? toDisplayPath(thumbFsPath) : null,
		thumbFsPath,
		sourcePath: folder.cover,
	};
}

async function cleanupThumbnailCache(folder) {
	// Build the keep set from ALL source images in the folder (every extension
	// the gallery surfaces — not just .png — so thumbs for .jpg/.webp
	// screenshots aren't garbage-collected on every load). The cache is
	// decoupled from the visible window: thumbs for items currently outside the
	// strip's window are still valid and useful as the user navigates further
	// into the gallery. Only THIS folder's thumbnail directory is swept — other
	// folders' thumbnails live elsewhere and are left alone.
	try {
		const thumbDir = thumbnailDirFor(getCacheDir(), rootDir, folder);
		const dirFiles = await fs.promises.readdir(folder);
		const keep = new Set(
			dirFiles
				.filter((fileName) =>
					SUPPORTED_GALLERY_EXTENSIONS.has(
						path.extname(fileName).toLowerCase()
					)
				)
				.map((fileName) =>
					normalizeComparePath(
						getThumbnailPath(path.join(folder, fileName))
					)
				)
		);

		const cacheFiles = await fs.promises.readdir(thumbDir);

		await Promise.all(
			cacheFiles.map(async (fileName) => {
				if (path.extname(fileName).toLowerCase() !== '.webp') {
					return;
				}

				const fullPath = path.join(thumbDir, fileName);
				if (!keep.has(normalizeComparePath(fullPath))) {
					await fs.promises.unlink(fullPath);
				}
			})
		);

		if (samePath(folder, rootDir)) {
			await pruneOrphanFolderCaches();
		}
	} catch (error) {
		console.log(error);
	}
}

// Drop the thumbnail directories of folders that no longer exist (a deleted
// grid folder), found through the marker each one carries.
async function pruneOrphanFolderCaches() {
	const base = path.join(getCacheDir(), FOLDER_CACHE_DIR);
	let keys = [];
	try {
		keys = await fs.promises.readdir(base);
	} catch {
		return;
	}
	await Promise.all(
		keys.map(async (key) => {
			const cacheFolder = path.join(base, key);
			let source = '';
			try {
				source = (
					await fs.promises.readFile(
						path.join(cacheFolder, SOURCE_MARKER),
						'utf8'
					)
				).trim();
			} catch {
				source = '';
			}
			if (source && fs.existsSync(source)) {
				return;
			}
			try {
				await fs.promises.rm(cacheFolder, { recursive: true, force: true });
			} catch (error) {
				console.log(error);
			}
		})
	);
}

export default {
	name: 'Home',
	components: { SideBar, PromoCard, ChangelogModal },
	data() {
		return {
			showChangelog: false,
			items: [],
			currentURL: '',
			fileName: '',
			resolution: '',
			fileSize: '',
			selected: 0,
			galleryLoadId: 0,
			// Mirrors of the module-level `rootDir` / `dir`, for the template.
			rootFolder: rootDir,
			currentFolder: dir,
			subfolders: [] as { fullPath: string; name: string }[],
			folderMenuOpen: false,
			onDocumentPointer: null as ((event: Event) => void) | null,
			// Where Backspace goes: the folders left, most recent last, each with the
			// image that was selected there.
			folderHistory: [] as { folder: string; file: string | null }[],
			onGalleryKey: null as ((event: KeyboardEvent) => void) | null,
			// False while another page is showing — Home is kept alive, so its
			// listeners outlive the visit.
			galleryVisible: true,
			generatingThumbs: new Set<string>(),
			// Held so beforeUnmount can tear them down — otherwise an HMR reload (or
			// any future remount) stacks duplicate 'screenshot-response' handlers
			// (N gallery unshifts per capture) and leaks the config subscription
			// (cq-renderer-capture-views#2). Declared here (not bare on `this`) so
			// vue-tsc types the assignments; Vue 3 does not proxy function values.
			onScreenshotResponse: null as
				| ((event: unknown, filePath: string) => void)
				| null,
			configFolderDisposer: null as (() => void) | null,
		};
	},
	computed: {
		imageMeta(): string {
			return [this.resolution, this.fileSize].filter(Boolean).join(' · ');
		},
		// A computed rather than a data field so the context menu re-labels itself
		// when the language changes — data() runs once per instance and this
		// component is never remounted.
		options(): { name: string; slug: string }[] {
			return [
				{ name: this.$t('gallery.menu.openExternally'), slug: 'external' },
				{ name: this.$t('gallery.menu.openFolder'), slug: 'folder' },
				{ name: this.$t('gallery.menu.copy'), slug: 'copy' },
				{ name: this.$t('gallery.menu.delete'), slug: 'delete' },
			];
		},
		// The image in the preview. The strip also holds folders; the selection
		// never rests on one, but an index that does shows nothing.
		activeItem(): any | null {
			const item = this.items[this.selected];
			return item && item.kind !== 'folder' ? item : null;
		},
		atRoot(): boolean {
			return samePath(this.currentFolder, this.rootFolder);
		},
		crumbs(): { label: string; path: string }[] {
			return folderCrumbs(this.rootFolder, this.currentFolder);
		},
		// The folder bar appears only where there is somewhere to go: inside a
		// subfolder, or at a root that has some. A flat screenshot folder looks
		// exactly as it always has.
		showFolderBar(): boolean {
			return !this.atRoot || this.subfolders.length > 0;
		},
		showGallery(): boolean {
			return this.currentURL !== '' || this.showFolderBar;
		},
		windowStart(): number {
			if (this.items.length === 0) return 0;
			const ws = Math.min(VISIBLE_WINDOW_SIZE, this.items.length);
			const half = Math.floor(ws / 2);
			const ideal = this.selected - half;
			return Math.max(0, Math.min(ideal, this.items.length - ws));
		},
		visibleItems(): any[] {
			if (this.items.length === 0) return [];
			const ws = Math.min(VISIBLE_WINDOW_SIZE, this.items.length);
			return this.items.slice(this.windowStart, this.windowStart + ws);
		},
	},
	watch: {
		currentURL() {
			if (this.currentURL === '') {
				this.fileName = '';
				this.resolution = '';
				this.fileSize = '';
				return;
			}

			this.fileName = this.currentURL
				.split(/[\\/]/)
				.pop()
				.split('.')
				.slice(0, -1)
				.join('.');
			try {
				const dimensions = sizeOf(toFsPath(this.currentURL));
				this.resolution = `${dimensions.width}x${dimensions.height}`;
			} catch (error) {
				console.log(error);
				this.resolution = '';
			}
			try {
				const stats = fs.statSync(toFsPath(this.currentURL));
				this.fileSize =
					stats.size < 1024 * 1024
						? `${Math.round(stats.size / 1024)} KB`
						: `${(stats.size / (1024 * 1024)).toFixed(1)} MB`;
			} catch (error) {
				console.log(error);
				this.fileSize = '';
			}
		},
		// Keep the filename-bar / preview name in sync when the active index
		// changes via thumbnail click, wheel-step on the strip, or programmatic
		// updates (e.g. screenshot-response setting selected = 0).
		selected(newIndex: number) {
			const item = this.items[newIndex];
			if (item && item.file && this.currentURL !== item.file) {
				this.currentURL = item.file;
			}
			void this.ensureWindowThumbnails(newIndex, this.galleryLoadId);
		},
	},
	mounted() {
		// Hoist to an instance field so beforeUnmount can removeListener it.
		this.onScreenshotResponse = async (_event, filePath: string) => {
			if (!fs.existsSync(filePath)) {
				return;
			}

			// A shot saved somewhere other than the folder on show (a capture grid
			// writes into its own folder; a plain shot lands in the root while a
			// subfolder is open): go to its folder, so the shot just taken is the
			// one on screen — as it always has been.
			const fileFolder = path.dirname(filePath);
			if (
				!samePath(fileFolder, dir) &&
				isInsideFolder(rootDir, fileFolder)
			) {
				copyImageToClipboard(filePath);
				await this.openGalleryFolder(fileFolder, filePath);
				return;
			}

			ensureDirectory(getCacheDir());
			const item = imageItem(filePath);
			if (fs.existsSync(item.thumbFsPath)) {
				item.thumb = item.thumbDisplayPath;
			}

			this.items.unshift(item);
			copyImageToClipboard(filePath);
			this.selected = 0;
			this.currentURL = toDisplayPath(filePath);

			void this.ensureWindowThumbnails(0, this.galleryLoadId);
		};
		ipcRenderer.on('screenshot-response', this.onScreenshotResponse);

		void this.loadGallery();

		// electron-store's onDidChange returns an unsubscribe fn — hold it to unsub.
		this.configFolderDisposer = config.onDidChange(
			'screenshotFolder',
			(newValue) => {
				// A new screenshot folder starts the gallery over at its top.
				rootDir = normalizeFolder(newValue);
				dir = rootDir;
				this.rootFolder = rootDir;
				this.currentFolder = dir;
				this.folderHistory = [];
				this.closeFolderMenu();
				void this.loadGallery();
			}
		);

		// The folder menu closes on any press outside it, and on Escape.
		this.onDocumentPointer = (event: Event) => {
			if (!this.folderMenuOpen) {
				return;
			}
			if (event instanceof KeyboardEvent) {
				if (event.key === 'Escape') {
					this.closeFolderMenu(true);
				}
				return;
			}
			const menu = this.$refs.folderMenu as HTMLElement | undefined;
			if (menu && !menu.contains(event.target as Node)) {
				this.closeFolderMenu();
			}
		};
		document.addEventListener('pointerdown', this.onDocumentPointer);
		document.addEventListener('keydown', this.onDocumentPointer);

		// Backspace: back to the folder the gallery came from, like a browser's
		// Back. Never while typing, and never from another page.
		this.onGalleryKey = (event: KeyboardEvent) => {
			if (
				event.key !== 'Backspace' ||
				event.defaultPrevented ||
				event.altKey ||
				event.ctrlKey ||
				event.metaKey ||
				event.shiftKey ||
				!this.galleryVisible ||
				!this.showGallery ||
				isTextEntry(event.target)
			) {
				return;
			}
			if (this.folderHistory.length === 0 && this.atRoot) {
				return;
			}
			event.preventDefault();
			void this.goBackFolder();
		};
		document.addEventListener('keydown', this.onGalleryKey);

		// First launch lands on the Help page; an updated version surfaces the
		// changelog once. (Moved from the old sidebar Settings toolbar.)
		const firstTime = config.get('firstTime');
		if (firstTime) {
			config.set('firstTime', false);
			void this.$router.push('/help');
		}
		const configVersion = config.get('version');
		const showChangelogOnLoad =
			configVersion !== '' && configVersion !== version && !firstTime;
		config.set('version', version);
		void this.loadReleases(showChangelogOnLoad);
	},
	beforeUnmount() {
		if (this.onScreenshotResponse) {
			ipcRenderer.removeListener(
				'screenshot-response',
				this.onScreenshotResponse
			);
		}
		this.configFolderDisposer?.();
		if (this.onDocumentPointer) {
			document.removeEventListener('pointerdown', this.onDocumentPointer);
			document.removeEventListener('keydown', this.onDocumentPointer);
		}
		if (this.onGalleryKey) {
			document.removeEventListener('keydown', this.onGalleryKey);
		}
	},
	activated() {
		this.galleryVisible = true;
	},
	deactivated() {
		this.galleryVisible = false;
		this.closeFolderMenu();
	},
	methods: {
		async loadReleases(showChangelogOnLoad) {
			try {
				const response = await fetch(changelogApiUrl);
				const body = await response.text();
				const releases = JSON.parse(body);
				if (Array.isArray(releases)) {
					fs.writeFileSync(changelogFile, body);
					if (showChangelogOnLoad) {
						this.showChangelog = true;
					}
				}
			} catch (error) {
				console.log(error);
			}
		},
		getImageUrl(item) {
			return item ? item.thumb : EMPTY_IMAGE;
		},
		screenshot(data) {
			ipcRenderer.send('resize-screenshot', data);
		},
		// Show `folder` (the screenshot folder or one below it), optionally with
		// `selectFile` selected; otherwise its newest image. The folder left is
		// remembered for Backspace unless `remember` is false (going back itself,
		// or falling back from a folder that vanished).
		async openGalleryFolder(
			folder: string,
			selectFile: string | null = null,
			remember = true
		) {
			const target = path.resolve(folder);
			if (!isInsideFolder(rootDir, target)) {
				return;
			}
			if (remember && !samePath(target, dir)) {
				this.folderHistory.push({
					folder: dir,
					file: this.currentURL ? toFsPath(this.currentURL) : null,
				});
				if (this.folderHistory.length > MAX_FOLDER_HISTORY) {
					this.folderHistory.shift();
				}
			}
			this.closeFolderMenu();
			dir = normalizeFolder(target);
			this.currentFolder = dir;
			this.currentURL = selectFile ? toDisplayPath(selectFile) : '';
			this.selected = 0;
			await this.loadGallery();
		},
		goUpFolder() {
			if (this.atRoot) {
				return;
			}
			void this.openGalleryFolder(path.dirname(path.resolve(dir)));
		},
		restoreRootFolder() {
			void this.openGalleryFolder(rootDir);
		},
		// Back to the folder the gallery came from, with the image that was
		// selected there, and the tile that was clicked focused so it is clear
		// where you are. Nothing to go back to: up one folder.
		async goBackFolder() {
			const left = path.resolve(dir);
			let entry = this.folderHistory.pop();
			// Skip folders deleted or renamed since, and the one already on show.
			while (
				entry &&
				(!fs.existsSync(entry.folder) ||
					!isInsideFolder(rootDir, entry.folder) ||
					samePath(entry.folder, dir))
			) {
				entry = this.folderHistory.pop();
			}
			if (entry) {
				await this.openGalleryFolder(
					entry.folder,
					entry.file && fs.existsSync(entry.file) ? entry.file : null,
					false
				);
			} else if (!this.atRoot) {
				await this.openGalleryFolder(
					path.dirname(path.resolve(dir)),
					null,
					false
				);
			} else {
				return;
			}
			await this.$nextTick();
			const tile = Array.from(
				document.querySelectorAll<HTMLElement>('[data-folder-path]')
			).find((el) => samePath(el.dataset.folderPath ?? '', left));
			tile?.focus();
		},
		toggleFolderMenu() {
			this.folderMenuOpen = !this.folderMenuOpen;
			if (this.folderMenuOpen) {
				void this.$nextTick(() => {
					const first = (
						this.$refs.folderMenu as HTMLElement | undefined
					)?.querySelector('[role="menuitem"]') as HTMLElement | null;
					first?.focus();
				});
			}
		},
		closeFolderMenu(returnFocus = false) {
			if (!this.folderMenuOpen) {
				return;
			}
			this.folderMenuOpen = false;
			if (returnFocus) {
				(this.$refs.folderMenuButton as HTMLElement | undefined)?.focus();
			}
		},
		// Arrow keys move through the open folder menu.
		onFolderMenuKey(event: KeyboardEvent) {
			if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
				return;
			}
			event.preventDefault();
			const items = Array.from(
				(this.$refs.folderMenu as HTMLElement).querySelectorAll(
					'[role="menuitem"]'
				)
			) as HTMLElement[];
			const at = items.indexOf(document.activeElement as HTMLElement);
			const next =
				event.key === 'ArrowDown'
					? Math.min(items.length - 1, at + 1)
					: Math.max(0, at - 1);
			items[next]?.focus();
		},
		// A click in the strip: an image is selected, a folder is opened.
		selectIndex(absIdx: number) {
			const item = this.items[absIdx];
			if (!item) return;
			if (item.kind === 'folder') {
				void this.openGalleryFolder(item.folderPath);
				return;
			}
			this.selected = absIdx;
		},
		// The wheel steps from image to image, over any folders between them.
		onStripWheel(event: WheelEvent) {
			const step = (event.deltaY || 0) > 0 ? 1 : -1;
			for (
				let next = this.selected + step;
				next >= 0 && next < this.items.length;
				next += step
			) {
				if (this.items[next].kind !== 'folder') {
					this.selected = next;
					return;
				}
			}
		},
		// The image nearest `index` (itself, then outwards, later ones first), or
		// -1 when the strip holds no images.
		nearestImageIndex(index: number): number {
			for (let d = 0; d < this.items.length; d++) {
				for (const i of [index + d, index - d]) {
					if (this.items[i] && this.items[i].kind !== 'folder') {
						return i;
					}
				}
			}
			return -1;
		},
		openExternally() {
			shell.openPath(toFsPath(this.currentURL));
		},
		copy() {
			copyImageToClipboard(toFsPath(this.currentURL));
			// Oruga 0.13: programmatic interfaces live on `_programmatic`,
			// not the Oruga instance directly. useOruga() returns _programmatic.
			useOruga().notification.open({
				message: this.$t('gallery.copiedToClipboard', {
					name: this.fileName,
				}),
				variant: 'dark',
			});
		},
		openFolder() {
			shell.showItemInFolder(toFsPath(this.currentURL));
		},
		async deleteFile() {
			await this.removeItem(this.currentURL);
		},
		handleClick(event, item) {
			// vue-simple-context-menu exposes showMenu at runtime but lacks TS typing.
			(this.$refs.vueSimpleContextMenu as any).showMenu(event, item);
		},
		async optionClicked(event) {
			switch (event.option.slug) {
				case 'copy':
					copyImageToClipboard(toFsPath(event.item.file));
					break;
				case 'external':
					shell.openPath(toFsPath(event.item.file));
					break;
				case 'folder':
					shell.showItemInFolder(toFsPath(event.item.file));
					break;
				case 'delete':
					await this.removeItem(event.item.file);
					break;
				default:
					break;
			}
		},
		async removeItem(filePath) {
			try {
				await fs.promises.unlink(toFsPath(filePath));
			} catch (error) {
				console.log(error);
				return;
			}

			const index = this.items.findIndex(
				(item) => item.kind !== 'folder' && item.file === filePath
			);
			if (index !== -1) {
				this.items.splice(index, 1);
			}
			this.currentURL = '';
			this.setSelectionFromItems();
		},
		setSelectionFromItems() {
			if (this.items.length === 0) {
				this.selected = 0;
				this.currentURL = '';
				return;
			}

			const currentIndex = this.currentURL
				? this.items.findIndex(
						(item) =>
							item.kind !== 'folder' && item.file === this.currentURL
					)
				: -1;
			if (currentIndex !== -1) {
				this.selected = currentIndex;
				return;
			}

			const clamped = Math.max(
				0,
				Math.min(this.selected, this.items.length - 1)
			);
			const image = this.nearestImageIndex(clamped);
			// Only folders here: no image to show, the strip still lists them.
			this.selected = image === -1 ? clamped : image;
			this.currentURL = image === -1 ? '' : this.items[image].file;
		},
		async ensureWindowThumbnails(centerIndex: number, loadId: number) {
			if (this.items.length === 0) {
				return;
			}
			const radius = THUMB_GEN_RADIUS;
			const start = Math.max(0, centerIndex - radius);
			const end = Math.min(this.items.length, centerIndex + radius + 1);

			const queue: any[] = [];
			for (let i = start; i < end; i++) {
				const item = this.items[i];
				if (!item || item.thumb !== EMPTY_IMAGE) continue;
				if (this.generatingThumbs.has(item.thumbFsPath)) continue;
				this.generatingThumbs.add(item.thumbFsPath);
				queue.push(item);
			}

			if (queue.length === 0) {
				return;
			}

			const workerCount = Math.min(THUMBNAIL_CONCURRENCY, queue.length);
			const workers = Array.from({ length: workerCount }, async () => {
				while (queue.length > 0) {
					const item = queue.shift();
					if (!item) {
						return;
					}
					try {
						if (item.kind === 'folder') {
							ensureThumbnailDir(
								fs,
								getCacheDir(),
								rootDir,
								item.folderPath
							);
						}
						await ensureThumbnail(item.sourcePath, item.thumbFsPath);
						if (loadId !== this.galleryLoadId) {
							return;
						}
						item.thumb = item.thumbDisplayPath;
					} catch (error) {
						console.log(error);
					} finally {
						this.generatingThumbs.delete(item.thumbFsPath);
					}
				}
			});

			await Promise.all(workers);
		},
		async loadGallery() {
			const loadId = this.galleryLoadId + 1;
			this.galleryLoadId = loadId;
			// The image to land on, if one was asked for (openGalleryFolder with a
			// file): the reset below clears currentURL before the listing is in.
			const wantedURL = this.currentURL;
			this.items = [];
			this.generatingThumbs.clear();
			this.setSelectionFromItems();

			const folder = dir;
			const listing = await listGalleryEntries();
			if (loadId !== this.galleryLoadId) {
				return;
			}
			if (listing.missing && !samePath(folder, rootDir)) {
				// The folder was deleted or renamed from outside: back to the root.
				void this.openGalleryFolder(rootDir, null, false);
				return;
			}
			this.subfolders = listing.folders;

			// Images and folders in one strip, newest first; a folder sits where
			// its newest image would.
			const entries = mergeGalleryEntries(
				listing.images,
				listing.folders
			).map((m) =>
				m.kind === 'folder'
					? folderItem(m.entry)
					: imageItem(m.entry.fullPath)
			);

			if (loadId !== this.galleryLoadId) {
				return;
			}

			this.items = entries;
			if (wantedURL && this.currentURL === '') {
				const wantedIndex = entries.findIndex(
					(entry) => entry.kind !== 'folder' && entry.file === wantedURL
				);
				if (wantedIndex !== -1) {
					this.selected = wantedIndex;
				}
			}
			this.setSelectionFromItems();

			if (this.items.length !== 0) {
				void this.ensureWindowThumbnails(this.selected, loadId);
			}

			// Defer cleanup off the initial-paint critical path. Guard against
			// stale folder switches via loadId.
			setTimeout(() => {
				if (loadId === this.galleryLoadId) {
					void cleanupThumbnailCache(folder);
				}
			}, 1500);
		},
	},
};
</script>

<style>
.container {
	max-width: 100vw !important;
	padding: 0px !important;
}

html {
	background-color: transparent !important;
}
body {
	background-position: center;
	background-repeat: no-repeat;
	background-size: cover;
	background: rgb(37, 37, 37) !important;
	background: linear-gradient(
		0deg,
		rgba(37, 37, 37, 1) 0%,
		rgba(61, 61, 61, 1) 100%
	);
	height: 100vh;
	color: white !important;
}
.label {
	color: white !important;
}

.toolbar {
	list-style-type: none;
	margin: 0;
	padding: 0;
	overflow: hidden;
	margin-top: 0.1rem;
}

.toolbar li {
	float: right;
	margin-left: 0.3rem;
	margin-right: 0.3rem;
	margin-top: auto;
	font-size: 1.2rem;
}

.toolbar li a {
	display: block;
	color: white;
	text-align: center;
	text-decoration: none;
}

.toolbar li a:hover {
	opacity: 0.5;
}

/* The filename bar keeps its natural height; the gallery flexes into
   whatever remains of the column. Replaces a hand-tuned
   `calc(100vh - 41px - 27px)` whose 27px under-measured the bar, so the
   gallery poked past the bottom of the view (and the nav rail). */
.gallery-column {
	height: 100%;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

/* VRT: custom virtualized gallery — replaces <o-carousel>. Only the active
   preview img + the visible window of thumbs (≤ VISIBLE_WINDOW_SIZE = 11)
   are mounted, regardless of source folder size. */
.gallery-virtual {
	flex: 1 1 auto;
	min-height: 0;
	display: flex;
	flex-direction: column;
	/* The nav rail (App.vue's --nav-rail-width) now sits left of this view. */
	max-width: calc(100vw - 240px - var(--nav-rail-width, 0px));
	overflow: hidden;
}

.gallery-virtual__preview {
	flex: 1 1 auto;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 1rem;
	overflow: hidden;
	margin: 0;
}

.gallery-virtual__preview img {
	max-width: 100%;
	max-height: 100%;
	object-fit: contain;
}

.gallery-virtual__strip {
	flex: 0 0 auto;
	display: flex;
	flex-direction: row;
	gap: 0.5rem;
	padding: 0.6rem;
	background-color: rgba(0, 0, 0, 0.45);
	border-top: 1px solid rgba(255, 255, 255, 0.08);
	box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.4);
	margin-top: auto;
}

.gallery-virtual__thumb {
	flex: 1 1 0;
	min-width: 0;
	margin: 0 4px;
	padding: 3px;
	box-sizing: border-box;
	background: transparent;
	border: 2px solid transparent;
	border-radius: 4px;
	cursor: pointer;
	overflow: hidden;
	transition:
		transform 0.18s ease,
		border-color 0.18s ease,
		box-shadow 0.18s ease;
}

.gallery-virtual__thumb img {
	display: block;
	width: 100%;
	height: auto;
	aspect-ratio: 16 / 9;
	object-fit: cover;
	transition: filter 0.18s ease;
}

.gallery-virtual__thumb:hover img {
	opacity: 0.85;
}

/* VRT-UI-03: active highlight via explicit class binding — no Oruga --active
   class, no :deep() needed. CSS targets our class on our element directly. */
.gallery-virtual__thumb--active {
	border-color: #ec202a;
	box-shadow:
		0 0 0 2px #ec202a,
		0 4px 12px rgba(236, 32, 42, 0.45);
	transform: scale(1.05);
	z-index: 1;
}

.gallery-virtual__thumb--active img {
	filter: brightness(1.08);
}

/* A folder tile: the cover image, dimmed, with the folder's name over it —
   across the whole tile and wrapping, because strip tiles are narrow and a
   grid folder's name ("Daytona grid 2026-11-17_22-42-36") is long. Same
   footprint as an image thumbnail so the strip keeps its rhythm. */
.gallery-virtual__thumb--folder {
	position: relative;
	border-color: rgba(255, 255, 255, 0.18);
	background-color: rgba(255, 255, 255, 0.04);
}

.gallery-virtual__thumb--folder img {
	filter: brightness(0.4);
}

.gallery-virtual__thumb--folder:hover {
	border-color: rgba(255, 255, 255, 0.5);
}

.gallery-virtual__thumb--folder:hover img {
	opacity: 1;
	filter: brightness(0.55);
}

.gallery-virtual__thumb--folder:focus-visible {
	outline: 2px solid #ec202a;
	outline-offset: 2px;
}

.gallery-virtual__folder-blank {
	width: 100%;
	aspect-ratio: 16 / 9;
}

.gallery-virtual__folder-name {
	position: absolute;
	inset: 3px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-end;
	padding: 0 0.3rem 0.1rem;
	color: #fff;
	font-size: 0.62rem;
	font-weight: 600;
	line-height: 1.15;
	text-align: center;
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}

.gallery-virtual__folder-name svg {
	position: absolute;
	top: 0;
	left: 1px;
	color: #f5c451;
	font-size: 0.55rem;
	filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.9));
}

.gallery-virtual__folder-name span {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 3;
	max-width: 100%;
	overflow: hidden;
	overflow-wrap: anywhere;
}

/* Folder navigation bar. Same translucent band as the filename bar above it;
   every control is a real <button> with a visible focus ring. */
.gallery-folders {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: 0.5rem;
	min-height: 2.25rem;
	padding: 0.25rem 0.5rem;
	background-color: rgba(0, 0, 0, 0.2);
	border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	font-size: 0.85rem;
	position: relative;
	z-index: 2;
}

.gallery-folders button {
	font: inherit;
	color: inherit;
	background: transparent;
	border: 1px solid transparent;
	border-radius: 4px;
	cursor: pointer;
	transition:
		background-color 0.15s ease,
		border-color 0.15s ease,
		opacity 0.15s ease;
}

.gallery-folders button:hover:not(:disabled) {
	background-color: rgba(255, 255, 255, 0.08);
}

.gallery-folders button:focus-visible,
.gallery-empty button:focus-visible {
	outline: 2px solid #ec202a;
	outline-offset: 1px;
}

.gallery-folders button:disabled {
	opacity: 0.35;
	cursor: default;
}

.gallery-folders__icon-btn {
	width: 1.9rem;
	height: 1.9rem;
	flex-shrink: 0;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.gallery-folders__crumbs {
	display: flex;
	align-items: center;
	min-width: 0;
	/* Takes the free width, so the folder menu and the restore button sit at
	   the far end in a fixed spot. */
	flex: 1 1 auto;
	margin: 0;
	padding: 0;
	list-style: none;
	overflow: hidden;
}

.gallery-folders__crumb {
	display: flex;
	align-items: center;
	min-width: 0;
	flex-shrink: 1;
}

/* Earlier crumbs give up their width first; the current folder keeps its name
   for as long as it can. */
.gallery-folders__crumb:last-child {
	flex-shrink: 0.15;
}

.gallery-folders__sep {
	font-size: 0.6rem;
	opacity: 0.45;
	margin: 0 0.35rem;
	flex-shrink: 0;
}

.gallery-folders__crumb-btn,
.gallery-folders__current {
	padding: 0.2rem 0.4rem;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	min-width: 0;
}

.gallery-folders__crumb-btn {
	opacity: 0.75;
}

.gallery-folders__crumb-btn:hover {
	opacity: 1;
}

.gallery-folders__current {
	font-weight: 600;
}

.gallery-folders__menu {
	position: relative;
	flex-shrink: 0;
}

.gallery-folders__menu-btn,
.gallery-folders__restore {
	display: inline-flex;
	align-items: center;
	gap: 0.45rem;
	padding: 0.3rem 0.6rem;
	white-space: nowrap;
	border-color: rgba(255, 255, 255, 0.15) !important;
}

.gallery-folders__caret {
	font-size: 0.65rem;
	transition: transform 0.15s ease;
}

.gallery-folders__caret.is-open {
	transform: rotate(180deg);
}

.gallery-folders__list {
	position: absolute;
	top: calc(100% + 4px);
	/* The button sits at the right end of the bar: open leftwards. */
	right: 0;
	min-width: 16rem;
	max-width: 28rem;
	max-height: 50vh;
	overflow-y: auto;
	margin: 0;
	padding: 0.25rem;
	list-style: none;
	background: rgb(30, 30, 30);
	border: 1px solid rgba(255, 255, 255, 0.12);
	border-radius: 6px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
}

.gallery-folders__item {
	width: 100%;
	display: flex;
	align-items: center;
	gap: 0.55rem;
	padding: 0.45rem 0.6rem;
	text-align: left;
}

.gallery-folders__item span {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.gallery-folders__item svg {
	color: #ec202a;
	flex-shrink: 0;
}

/* Pushed to the far end; its fixed spot means it is always in the same place
   to reach for. */
.gallery-folders__restore {
	flex-shrink: 0;
}

.gallery-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.75rem;
	color: rgba(255, 255, 255, 0.7);
	text-align: center;
}

.gallery-empty p {
	margin: 0;
}

.gallery-empty__icon {
	font-size: 2.5rem;
	opacity: 0.35;
}

.gallery-empty .gallery-folders__restore {
	margin-left: 0;
	font: inherit;
	font-size: 0.85rem;
	color: inherit;
	background: transparent;
	border: 1px solid rgba(255, 255, 255, 0.15);
	border-radius: 4px;
	cursor: pointer;
}

.gallery-empty .gallery-folders__restore:hover {
	background-color: rgba(255, 255, 255, 0.08);
}

@media (prefers-reduced-motion: reduce) {
	.gallery-folders button,
	.gallery-folders__caret {
		transition: none;
	}
}

/* Takes the leftover height and scrolls inside it. `min-height: 0` is the part
   that actually does the work: a flex item defaults to min-height:auto, which
   refuses to shrink below its content, so without it the column would grow past
   the viewport again and the overflow would never trigger.

   `scrollbar-gutter: stable` reserves the 8px the scrollbar will need whether or
   not it is showing, so folding the long-exposure panel open and shut does not
   shift every control left and right by 8px. */
.sidebar-scroll {
	flex: 1 1 auto;
	min-height: 0;
	overflow-y: auto;
	overflow-x: hidden;
	scrollbar-gutter: stable;
}

/* Pinned below the scroll region: the settings gear and the promo should not be
   something you have to scroll to find. margin-top:auto still holds it down if
   the scroll region is ever removed. */
.sidebar-footer {
	flex: 0 0 auto;
	margin-top: auto;
}

.sidebar-promo {
	margin: 0 1.25rem 1rem;
}
</style>
