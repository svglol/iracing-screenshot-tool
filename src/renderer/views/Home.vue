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
			<SideBar v-on:click="screenshot" />
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
							<b-tag type="is-info">{{ resolution }}</b-tag>
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
									@click="deleteFile"
									v-shortkey="['del']"
									@shortkey="deleteFile"
									v-show="false"
									><font-awesome-icon :icon="['fas', 'trash']"
								/></a>
							</li>
							<li>
								<a @click="openFolder" v-show="false"
									><font-awesome-icon :icon="['fas', 'folder']"
								/></a>
							</li>
							<li>
								<a
									v-shortkey="['ctrl', 'c']"
									@shortkey="copy"
									@click="copy"
									v-show="false"
									><font-awesome-icon :icon="['fas', 'copy']"
								/></a>
							</li>
							<li>
								<a @click="openExternally" v-show="false"
									><font-awesome-icon
										:icon="['fas', 'up-right-from-square']"
								/></a>
							</li>
						</ul>
					</div>
				</div>

				<b-carousel
					:animated="'fade'"
					:arrow="false"
					:autoplay="false"
					:has-drag="false"
					indicator-custom
					:indicator-inside="false"
					v-model="selected"
					id="carousel"
				>
					<b-carousel-item v-for="(item, i) in items" :key="i">
						<figure class="al image" :draggable="false">
							<img
								:draggable="false"
								v-lazy="getViewerImageUrl(items[i], i)"
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
					</b-carousel-item>
					<template slot="indicators" slot-scope="props">
						<figure class="al image" :draggable="false">
							<img
								:draggable="false"
								v-lazy="getImageUrl(items[props.i])"
								@click="selectImage(items[props.i].file)"
								style="
									max-height: 70px;
									object-fit: contain;
									height: 70px;
								"
								@contextmenu.prevent.stop="
									handleClick($event, items[props.i])
								"
							/>
						</figure>
					</template>
				</b-carousel>

				<vue-simple-context-menu
					:elementId="'myUniqueId'"
					:options="options"
					:ref="'vueSimpleContextMenu'"
					@option-clicked="optionClicked"
				/>
			</div>
		</div>
	</div>
</template>

<script>
import SideBar from '../components/SideBar.vue';
import PromoCard from '../components/PromoCard.vue';
import Settings from '../components/Settings.vue';
import Vue from 'vue';

const { ipcRenderer, clipboard, shell, nativeImage } = require('electron');
const sizeOf = require('image-size');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const userDataPath = ipcRenderer.sendSync('app:getPath-sync', 'userData');
const config = require('../../utilities/config');
const EMPTY_IMAGE =
	'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const THUMBNAIL_CONCURRENCY = 4;

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

async function cleanupThumbnailCache(entries) {
	try {
		const keep = new Set(
			entries.map((entry) => normalizeComparePath(entry.thumbFsPath))
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

export default Vue.extend({
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
			this.$buefy.notification.open({
				message: `${this.fileName} copied to clipboard`,
				type: 'is-dark',
			});
		},
		openFolder() {
			shell.showItemInFolder(toFsPath(this.currentURL));
		},
		async deleteFile() {
			await this.removeItem(this.currentURL);
		},
		handleClick(event, item) {
			this.$refs.vueSimpleContextMenu.showMenu(event, item);
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
				this.$delete(this.items, index);
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
		async createMissingThumbnails(items, loadId) {
			const queue = items.filter((item) => item.thumb === EMPTY_IMAGE);
			const workerCount = Math.min(THUMBNAIL_CONCURRENCY, queue.length);

			const workers = Array.from({ length: workerCount }, async () => {
				while (queue.length > 0) {
					const item = queue.shift();

					if (!item) {
						return;
					}

					try {
						await ensureThumbnail(item.sourcePath, item.thumbFsPath);
					} catch (error) {
						console.log(error);
						continue;
					}

					if (loadId !== this.galleryLoadId) {
						return;
					}

					this.$set(item, 'thumb', item.thumbDisplayPath);
				}
			});

			await Promise.all(workers);
		},
		async loadGallery() {
			const loadId = this.galleryLoadId + 1;
			this.galleryLoadId = loadId;
			this.items = [];
			this.setSelectionFromItems();

			const entries = (await listGalleryEntries()).map((entry) => {
				const thumbFsPath = getThumbnailPath(entry.fullPath);
				const thumbDisplayPath = toDisplayPath(thumbFsPath);
				const hasThumbnail = fs.existsSync(thumbFsPath);

				return {
					file: toDisplayPath(entry.fullPath),
					thumb: hasThumbnail ? thumbDisplayPath : EMPTY_IMAGE,
					thumbDisplayPath,
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
				this.$nextTick(() => this.bindCarouselScroll());
			}

			void cleanupThumbnailCache(entries);
			void this.createMissingThumbnails(entries, loadId);
		},
		bindCarouselScroll() {
			if (this.carouselScrollBound) {
				return;
			}

			const indicator = document.querySelector('.carousel-indicator');
			const carousel = document.getElementById('carousel');
			if (!indicator || !carousel) {
				return;
			}

			carousel.addEventListener(
				'wheel',
				(event) => {
					const delta = Math.max(-1, Math.min(1, -(event.deltaY || 0)));
					indicator.scrollLeft += delta * 400;
				},
				{ passive: true }
			);

			this.carouselScrollBound = true;
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

			if (item.thumb === EMPTY_IMAGE) {
				void ensureThumbnail(filePath, thumbPath)
					.then(() => {
						this.$set(item, 'thumb', item.thumbDisplayPath);
					})
					.catch((error) => {
						console.log(error);
					});
			}

			this.$nextTick(() => {
				const indicator = document.querySelector('.carousel-indicator');
				if (indicator) {
					indicator.scrollLeft = 0;
				}
				this.bindCarouselScroll();
			});
		});

		void this.loadGallery();

		config.onDidChange('screenshotFolder', (newValue) => {
			dir = normalizeFolder(newValue);
			void this.loadGallery();
		});
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
	},
});
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
.indicator-item {
	flex: 0 0 calc(100vh / 6) !important;
	margin-left: 0.25rem;
	margin-right: 0.25rem;
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

.carousel .carousel-indicator.has-custom {
	overflow-x: scroll !important;
	margin-top: auto;
	background-color: rgba(0, 0, 0, 0.2);
	scroll-behavior: smooth;
}

.indicator-item {
	padding-right: 0.5rem;
}

.is-active img {
	filter: drop-shadow(0 -2px 0 #ec202a) drop-shadow(0 2px 0 #ec202a)
		drop-shadow(-2px 0 0 #ec202a) drop-shadow(2px 0 0 #ec202a);
}

.indicator-item img:hover {
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
