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
							<o-tag
								v-if="totalSourceCount > items.length"
								variant="warning"
								style="margin-left: 0.5rem"
							>
								Showing {{ items.length }} of {{ totalSourceCount }}
							</o-tag>
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

				<o-carousel
					id="carousel"
					v-model="selected"
					:arrows="false"
					:autoplay="false"
					:dragable="false"
					:indicator-inside="false"
				>
					<o-carousel-item v-for="(item, i) in items" :key="i">
						<figure class="al image" :draggable="false">
							<img
								v-lazy="getViewerImageUrl(items[i], i)"
								:draggable="false"
								style="
									max-height: calc(100vh - 41px - 24px - 95px);
									object-fit: contain;
									padding: 1rem;
								"
								@contextmenu.prevent.stop="
									handleClick($event, items[i])
								"
							/>
						</figure>
					</o-carousel-item>
					<template #indicator="props">
						<figure class="al image" :draggable="false">
							<img
								v-lazy="getImageUrl(items[props.index])"
								:draggable="false"
								style="
									max-height: 70px;
									object-fit: contain;
									height: 70px;
								"
								@click="selectImage(items[props.index].file)"
								@contextmenu.prevent.stop="
									handleClick($event, items[props.index])
								"
							/>
						</figure>
					</template>
				</o-carousel>

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
// Cap to the most recent N. Sized to match the visible thumbnail strip
// (5 thumbs each side of an active center → 11 total) so the rendered set
// equals the visible set: the active item sits dead center when there are
// 11+ items, with symmetric flanks. Cached thumbs for items beyond the cap
// stay on disk (cleanup uses the full source dir, not the capped items).
// Bump this constant if you want a wider browse-back window in the gallery —
// each unit costs one carousel-item + one indicator-item Vue child component.
const MAX_GALLERY_ITEMS = 11;

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
		return { entries: [], totalCount: 0 };
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

	const sorted = entries
		.filter(Boolean)
		.filter((entry) => entry.extension === '.png')
		.sort((a, b) => b.modified - a.modified);

	return {
		entries: sorted.slice(0, MAX_GALLERY_ITEMS),
		totalCount: sorted.length,
	};
}

async function cleanupThumbnailCache() {
	// Build the keep set from ALL source PNGs in the screenshot folder, not
	// from the (capped) gallery items array. With MAX_GALLERY_ITEMS in effect,
	// the gallery only renders the most recent N — but cached thumbs for older
	// items must be preserved on disk so that raising the cap or rotating the
	// most-recent set doesn't force re-resizing 8K PNGs again.
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
			carouselScrollBound: false,
			galleryLoadId: 0,
			generatingThumbs: new Set<string>(),
			totalSourceCount: 0,
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
		// Keep the filename-bar / preview name in sync when the carousel's
		// active index changes from sources other than our explicit setters:
		// Oruga's indicator-wrapper clicks, keyboard navigation, and future
		// programmatic switchTo calls all flow through here.
		selected(newIndex: number) {
			const item = this.items[newIndex];
			if (item && item.file && this.currentURL !== item.file) {
				this.currentURL = item.file;
			}
			this.centerActiveThumb();
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
			// Maintain the gallery cap — if a new screenshot pushed us past
			// MAX_GALLERY_ITEMS, drop the oldest from the visible list.
			// Cached thumb on disk for the dropped item stays untouched
			// (cleanupThumbnailCache uses the source dir, not items array).
			if (this.items.length > MAX_GALLERY_ITEMS) {
				this.items.pop();
			}
			this.totalSourceCount += 1;
			copyImageToClipboard(filePath);
			this.selected = 0;
			this.currentURL = toDisplayPath(filePath);

			void this.ensureWindowThumbnails(0, this.galleryLoadId);

			this.$nextTick(() => {
				this.bindCarouselScroll();
			});
			this.centerActiveThumb();
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
		getViewerImageUrl(item, index) {
			if (!item) {
				return EMPTY_IMAGE;
			}

			return index === this.selected ? item.file : item.thumb;
		},
		screenshot(data) {
			ipcRenderer.send('resize-screenshot', data);
		},
		selectImage(item) {
			this.currentURL = item;
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
				this.totalSourceCount = Math.max(0, this.totalSourceCount - 1);
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

			const { entries: rawEntries, totalCount } = await listGalleryEntries();
			const entries = rawEntries.map((entry) => {
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
			this.totalSourceCount = totalCount;
			this.setSelectionFromItems();

			if (this.items.length !== 0) {
				this.$nextTick(() => this.bindCarouselScroll());
				this.centerActiveThumb();
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
		centerActiveThumb() {
			// Defer until the carousel has updated its --active class (which
			// Oruga applies during the same tick that v-model updates).
			// $nextTick ensures we query AFTER the new active item has the marker.
			this.$nextTick(() => {
				const active = document.querySelector(
					'#carousel .o-carousel__indicator-item--active'
				) as HTMLElement | null;
				if (!active) {
					return;
				}
				// inline: 'center' centers the element in the scroll container
				// and CLAMPS at start/end automatically — exactly the
				// "centered sliding window with clamped edges" semantics.
				active.scrollIntoView({
					behavior: 'smooth',
					inline: 'center',
					block: 'nearest',
				});
			});
		},
		bindCarouselScroll() {
			if (this.carouselScrollBound) {
				return;
			}

			const carousel = document.getElementById('carousel');
			const indicator = carousel?.querySelector('.o-carousel__indicators');
			if (!indicator || !carousel) {
				return;
			}

			carousel.addEventListener(
				'wheel',
				(event) => {
					const delta = Math.max(-1, Math.min(1, -(event.deltaY || 0)));
					(indicator as HTMLElement).scrollLeft += delta * 400;
				},
				{ passive: true }
			);

			this.carouselScrollBound = true;
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

/* SBM-02: Vertically (and horizontally) center the preview image inside its carousel item. */
#carousel .o-carousel__item {
	display: flex;
	align-items: center;
	justify-content: center;
}

/* SBM-03: Gallery strip container — always-visible horizontal scrollbar inherits
   the global styled scrollbar rules from main.scss (thumb = $primary,
   track = rgba(0,0,0,0.5)). Darker background + top border visually
   separates it from the preview area above. */
#carousel .o-carousel__indicators {
	overflow-x: auto;
	overflow-y: hidden;
	background-color: rgba(0, 0, 0, 0.45);
	border-top: 1px solid rgba(255, 255, 255, 0.08);
	box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.4);
	scroll-behavior: smooth;
	flex-wrap: nowrap;
	margin-top: auto;
}

/* GW3-UI-01/02: Sized so exactly 11 thumbs fit the visible strip width
   (viewport minus 240px sidebar minus the per-thumb 0.5rem horizontal margin).
   The strip itself overflows horizontally for any thumbs beyond 11; the
   selected-index watcher centers the active thumb via scrollIntoView. */
#carousel .o-carousel__indicator-item {
	flex: 0 0 calc((100vw - 240px) / 11 - 0.5rem);
	min-width: 90px;
	margin-left: 0.25rem;
	margin-right: 0.25rem;
	background: transparent;
	border: none;
	cursor: pointer;
}

#carousel .o-carousel__indicator-item img {
	width: 100%;
	height: auto;
	max-height: none !important;
	aspect-ratio: 16 / 9;
	object-fit: cover;
	transition: transform 0.2s ease, filter 0.2s ease;
}

/* GW3-UI-04: Active indicator — red drop-shadow border + subtle scale-up,
   transition smoothed via the base img rule above. */
#carousel .o-carousel__indicator-item--active img {
	filter: drop-shadow(0 -2px 0 #ec202a) drop-shadow(0 2px 0 #ec202a)
		drop-shadow(-2px 0 0 #ec202a) drop-shadow(2px 0 0 #ec202a);
	transform: scale(1.05);
}

/* SBM-03: Hover affordance on inactive thumbnails (port of Buefy-era .indicator-item img:hover). */
#carousel .o-carousel__indicator-item img:hover {
	opacity: 0.8;
}

.carousel {
	height: calc(100vh - 41px - 27px);
	display: flex;
	flex-direction: column;
	max-width: calc(100vw - 240px);
}

.sidebar-footer {
	margin-top: auto;
}

.sidebar-promo {
	margin: 0 0.75rem 0.75rem;
}
</style>
