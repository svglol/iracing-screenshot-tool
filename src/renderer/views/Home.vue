<template>
	<div class="columns is-gapless" style="margin-top: 0px; height: 100vh">
		<div
			class="column is-2 shadow"
			style="
				background-color: rgba(0, 0, 0, 0.5);
				display: flex;
				flex-direction: column;
				min-width: 240px;
				max-width: 240px;
			"
		>
			<SideBar @screenshot="screenshot" />
			<div class="sidebar-footer">
				<PromoCard class="sidebar-promo" />
				<Settings />
			</div>
		</div>

		<div class="column">
			<div v-if="currentURL !== ''">
				<div
					class="columns is-gapless"
					style="
						margin-bottom: 0.15rem;
						background-color: rgba(0, 0, 0, 0.2);
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
							<span style="font-weight: bold">{{ fileName }}</span>
							<o-tag variant="info">{{ resolution }}</o-tag>
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
					</figure>

					<div
						class="gallery-virtual__strip"
						@wheel.prevent="onStripWheel"
					>
						<figure
							v-for="(item, i) in visibleItems"
							:key="item.file"
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
import Settings from '../components/Settings.vue';
import config from '../../utilities/config';
import { useOruga } from '@oruga-ui/oruga-next';

const { ipcRenderer, clipboard, shell, nativeImage } = require('electron');
const sizeOf = require('image-size');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const userDataPath = ipcRenderer.sendSync('app:getPath-sync', 'userData');
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

let dir = normalizeFolder(config.get('screenshotFolder'));

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

function getThumbnailPath(filePath) {
	const fileName = path.parse(filePath).name;
	return path.join(getCacheDir(), `${fileName}.webp`);
}

function copyImageToClipboard(filePath) {
	const image = nativeImage.createFromPath(filePath);
	if (!image.isEmpty()) {
		clipboard.writeImage(image);
	}
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

async function listGalleryEntries() {
	ensureDirectory(dir);
	ensureDirectory(getCacheDir());

	let files = [];

	try {
		files = await fs.promises.readdir(dir);
	} catch (error) {
		console.log(error);
		return [];
	}

	const entries = await Promise.all(
		files.map(async (fileName) => {
			const fullPath = path.join(dir, fileName);
			try {
				const stats = await fs.promises.stat(fullPath);
				return {
					fullPath,
					modified: stats.mtimeMs,
					extension: path.extname(fileName).toLowerCase(),
				};
			} catch (error) {
				console.log(error);
				return null;
			}
		})
	);

	return entries
		.filter(Boolean)
		.filter((entry) => entry.extension === '.png')
		.sort((a, b) => b.modified - a.modified);
}

async function cleanupThumbnailCache() {
	// Build the keep set from ALL source PNGs in the screenshot folder. The
	// cache is decoupled from the visible window — thumbs for items currently
	// outside the strip's window are still valid and useful as the user
	// navigates further into the gallery.
	try {
		const dirFiles = await fs.promises.readdir(dir);
		const keep = new Set(
			dirFiles
				.filter(
					(fileName) => path.extname(fileName).toLowerCase() === '.png'
				)
				.map((fileName) =>
					normalizeComparePath(getThumbnailPath(path.join(dir, fileName)))
				)
		);

		const cacheFiles = await fs.promises.readdir(getCacheDir());

		await Promise.all(
			cacheFiles.map(async (fileName) => {
				if (path.extname(fileName).toLowerCase() !== '.webp') {
					return;
				}

				const fullPath = path.join(getCacheDir(), fileName);
				if (!keep.has(normalizeComparePath(fullPath))) {
					await fs.promises.unlink(fullPath);
				}
			})
		);
	} catch (error) {
		console.log(error);
	}
}

export default {
	name: 'Home',
	components: { SideBar, PromoCard, Settings },
	data() {
		return {
			items: [],
			currentURL: '',
			fileName: '',
			resolution: '',
			selected: 0,
			galleryLoadId: 0,
			generatingThumbs: new Set<string>(),
			options: [
				{
					name: 'Open Externally',
					slug: 'external',
				},
				{
					name: 'Open Folder',
					slug: 'folder',
				},
				{
					name: 'Copy',
					slug: 'copy',
				},
				{
					name: 'Delete',
					slug: 'delete',
				},
			],
		};
	},
	computed: {
		activeItem(): any | null {
			return this.items[this.selected] || null;
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
				this.resolution = `${dimensions.width} x ${dimensions.height}`;
			} catch (error) {
				console.log(error);
				this.resolution = '';
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
		ipcRenderer.on('screenshot-response', async (event, filePath) => {
			if (!fs.existsSync(filePath)) {
				return;
			}

			const thumbPath = getThumbnailPath(filePath);
			ensureDirectory(getCacheDir());
			const item = {
				file: toDisplayPath(filePath),
				thumb: fs.existsSync(thumbPath)
					? toDisplayPath(thumbPath)
					: EMPTY_IMAGE,
				thumbDisplayPath: toDisplayPath(thumbPath),
				thumbFsPath: thumbPath,
				sourcePath: filePath,
			};

			this.items.unshift(item);
			copyImageToClipboard(filePath);
			this.selected = 0;
			this.currentURL = toDisplayPath(filePath);

			void this.ensureWindowThumbnails(0, this.galleryLoadId);
		});

		void this.loadGallery();

		config.onDidChange('screenshotFolder', (newValue) => {
			dir = normalizeFolder(newValue);
			void this.loadGallery();
		});
	},
	methods: {
		getImageUrl(item) {
			return item ? item.thumb : EMPTY_IMAGE;
		},
		screenshot(data) {
			ipcRenderer.send('resize-screenshot', data);
		},
		selectIndex(absIdx: number) {
			if (absIdx < 0 || absIdx >= this.items.length) return;
			this.selected = absIdx;
		},
		onStripWheel(event: WheelEvent) {
			const delta = (event.deltaY || 0) > 0 ? 1 : -1;
			const next = Math.max(
				0,
				Math.min(this.items.length - 1, this.selected + delta)
			);
			if (next !== this.selected) {
				this.selected = next;
			}
		},
		openExternally() {
			shell.openPath(toFsPath(this.currentURL));
		},
		copy() {
			copyImageToClipboard(toFsPath(this.currentURL));
			// Oruga 0.13: programmatic interfaces live on `_programmatic`,
			// not the Oruga instance directly. useOruga() returns _programmatic.
			useOruga().notification.open({
				message: `${this.fileName} copied to clipboard`,
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

			const index = this.items.findIndex((item) => item.file === filePath);
			if (index !== -1) {
				this.items.splice(index, 1);
			}

			if (this.items.length === 0) {
				this.selected = 0;
				return;
			}

			this.selected = Math.max(
				0,
				Math.min(this.selected, this.items.length - 1)
			);
			this.currentURL = this.items[this.selected].file;
		},
		setSelectionFromItems() {
			if (this.items.length === 0) {
				this.selected = 0;
				this.currentURL = '';
				return;
			}

			const currentIndex = this.items.findIndex(
				(item) => item.file === this.currentURL
			);
			if (currentIndex !== -1) {
				this.selected = currentIndex;
				return;
			}

			this.selected = Math.max(
				0,
				Math.min(this.selected, this.items.length - 1)
			);
			this.currentURL = this.items[this.selected].file;
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
			this.items = [];
			this.generatingThumbs.clear();
			this.setSelectionFromItems();

			const entries = (await listGalleryEntries()).map((entry) => {
				const thumbFsPath = getThumbnailPath(entry.fullPath);
				return {
					file: toDisplayPath(entry.fullPath),
					// Always start blank; ensureWindowThumbnails fills in cached
					// or freshly-resized thumbs for items in the active window.
					// For already-cached items, ensureThumbnail returns early
					// without doing sharp work, so cached thumbs surface
					// near-instantly once the window includes them.
					thumb: EMPTY_IMAGE,
					thumbDisplayPath: toDisplayPath(thumbFsPath),
					thumbFsPath,
					sourcePath: entry.fullPath,
				};
			});

			if (loadId !== this.galleryLoadId) {
				return;
			}

			this.items = entries;
			this.setSelectionFromItems();

			if (this.items.length !== 0) {
				void this.ensureWindowThumbnails(this.selected, loadId);
			}

			// Defer cleanup off the initial-paint critical path. Guard against
			// stale folder switches via loadId.
			setTimeout(() => {
				if (loadId === this.galleryLoadId) {
					void cleanupThumbnailCache();
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

/* VRT: custom virtualized gallery — replaces <o-carousel>. Only the active
   preview img + the visible window of thumbs (≤ VISIBLE_WINDOW_SIZE = 11)
   are mounted, regardless of source folder size. */
.gallery-virtual {
	height: calc(100vh - 41px - 27px);
	display: flex;
	flex-direction: column;
	max-width: calc(100vw - 240px);
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
	gap: 0.25rem;
	padding: 0.4rem;
	background-color: rgba(0, 0, 0, 0.45);
	border-top: 1px solid rgba(255, 255, 255, 0.08);
	box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.4);
	margin-top: auto;
}

.gallery-virtual__thumb {
	flex: 1 1 0;
	min-width: 0;
	margin: 0;
	background: transparent;
	border: 2px solid transparent;
	border-radius: 4px;
	cursor: pointer;
	overflow: hidden;
	transition: transform 0.18s ease, border-color 0.18s ease,
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
	box-shadow: 0 0 0 2px #ec202a, 0 4px 12px rgba(236, 32, 42, 0.45);
	transform: scale(1.05);
	z-index: 1;
}

.gallery-virtual__thumb--active img {
	filter: brightness(1.08);
}

.sidebar-footer {
	margin-top: auto;
}

.sidebar-promo {
	margin: 0 0.75rem 0.75rem;
}
</style>
