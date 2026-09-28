<template>
	<div class="config-picker">
		<span class="config-picker__heading">{{
			$t('graphicsProfiles.activeHeading')
		}}</span>
		<!-- Quick switch: the name opens a menu of stored profiles, so switching
		     does not need the dialog. The sliders button beside it still opens
		     the dialog for everything else. -->
		<div ref="switcher" class="config-picker__switcher">
			<button
				ref="toggle"
				type="button"
				class="config-picker__toggle"
				:title="fullLabel"
				aria-haspopup="menu"
				:aria-expanded="menuOpen ? 'true' : 'false'"
				@click="toggleMenu"
				@keydown.down.prevent="openMenu"
				@keydown.esc="closeMenu()"
			>
				<span class="config-picker__name">{{ chipName }}</span>
				<font-awesome-icon
					class="config-picker__caret"
					:icon="['fas', 'chevron-down']"
				/>
			</button>

			<div
				v-if="menuOpen"
				class="config-picker__menu"
				role="menu"
				:aria-label="$t('graphicsProfiles.title')"
				@keydown="onMenuKeydown"
			>
				<!-- Same guard as the dialog: iRacing writes its in-memory settings
				     back over the file when it exits, so a switch now is undone. -->
				<p v-if="iracingRunning" class="config-picker__note is-blocking">
					<font-awesome-icon :icon="['fas', 'triangle-exclamation']" />
					<span>{{ $t('graphicsProfiles.iracingRunning') }}</span>
				</p>
				<p v-if="profiles.length === 0" class="config-picker__note">
					{{ $t('graphicsProfiles.empty.title') }}
				</p>
				<button
					v-for="profile in profiles"
					:key="profile.name"
					type="button"
					class="config-picker__item"
					role="menuitemradio"
					:aria-checked="profile.name === activeName ? 'true' : 'false'"
					:disabled="!canLoad(profile)"
					:data-profile-name="profile.name"
					@click="apply(profile.name)"
				>
					<span class="config-picker__check">
						<font-awesome-icon
							v-if="profile.name === activeName"
							:icon="['fas', 'check']"
						/>
					</span>
					<span class="config-picker__item-name">{{ profile.name }}</span>
					<span
						v-if="
							profile.name === activeName && activeState === 'modified'
						"
						class="config-picker__badge"
						>{{ $t('graphicsProfiles.badge.modified') }}</span
					>
				</button>
			</div>
		</div>
		<span v-if="activeState === 'modified'" class="config-picker__badge">{{
			$t('graphicsProfiles.badge.modified')
		}}</span>
		<button
			type="button"
			class="config-picker__open"
			:title="$t('graphicsProfiles.title')"
			@click="openDialog"
		>
			<font-awesome-icon :icon="['fas', 'sliders']" />
		</button>

		<o-modal
			v-model:active="showProfiles"
			has-modal-card
			trap-focus
			:can-cancel="false"
			aria-role="dialog"
			aria-modal
		>
			<GraphicsProfilesModal @close="closeDialog" @applied="onApplied" />
		</o-modal>
	</div>
</template>

<script lang="ts">
// The always-present configuration picker in the title bar: which stored
// profile the live rendererDX11Monitor.ini currently matches, plus the way
// into the Graphics Profiles dialog from anywhere in the app.
//
// Any writer of that ini in the renderer announces itself on the window as
// 'renderer-ini-changed'; this picker does so after a profile is applied and
// listens for the same — that one event name is the whole cross-page sync
// contract.
import { useOruga } from '@oruga-ui/oruga-next';
import GraphicsProfilesModal from './GraphicsProfilesModal.vue';
import { INI_CHANGED_EVENT } from '../ini-events';

const { ipcRenderer } = require('electron');

interface ProfileEntry {
	name: string;
	valid: boolean;
}

// The apply errors worth phrasing specifically; anything else reads as ioError,
// matching GraphicsProfilesModal's errorText.
const APPLY_ERRORS = [
	'profileNotFound',
	'iracingRunning',
	'invalidIni',
	'noActiveConfig',
	'ioError',
];

export default {
	name: 'ConfigurationPicker',
	components: { GraphicsProfilesModal },
	data() {
		return {
			showProfiles: false,
			menuOpen: false,
			profiles: [] as ProfileEntry[],
			iracingRunning: false,
			// Profile name whose load is in flight; blocks a double switch.
			applying: null as string | null,
			onDocumentPointer: null as ((event: Event) => void) | null,
			activeExists: false,
			activeName: null as string | null,
			activeState: 'unknown',
			activeDifferences: null as number | null,
			// Hoisted so beforeUnmount can remove exactly these listeners.
			onIracingChange: null as (() => void) | null,
			onIniChanged: null as (() => void) | null,
		};
	},
	computed: {
		chipName(): string {
			if (!this.activeExists) {
				return this.$t('graphicsProfiles.picker.missing');
			}
			if (this.activeName) {
				return this.activeName;
			}
			return this.$t('graphicsProfiles.picker.unknown');
		},
		// The tooltip carries the sentence the chip has no room for — the same
		// wording the dialog's active row uses.
		fullLabel(): string {
			if (!this.activeExists) {
				return this.$t('graphicsProfiles.active.missing');
			}
			if (this.activeState === 'clean') {
				return this.$t('graphicsProfiles.active.clean', {
					name: this.activeName,
				});
			}
			if (this.activeState === 'modified') {
				return this.activeDifferences === null
					? this.$t('graphicsProfiles.active.modifiedUnknownCount', {
							name: this.activeName,
						})
					: this.$t('graphicsProfiles.active.modified', {
							name: this.activeName,
							count: this.activeDifferences,
						});
			}
			return this.$t('graphicsProfiles.active.unknown');
		},
	},
	mounted() {
		this.onIracingChange = () => {
			// iRacing exiting is the moment it rewrites the ini — the active
			// profile may have just drifted to "modified".
			void this.refresh();
		};
		this.onIniChanged = () => {
			void this.refresh();
		};
		// Any press outside the switcher closes the menu, the way a native one
		// would. Capture phase, so a handler that stops propagation cannot keep
		// it open.
		this.onDocumentPointer = (event: Event) => {
			const switcher = this.$refs.switcher as HTMLElement | undefined;
			if (
				this.menuOpen &&
				switcher &&
				!switcher.contains(event.target as Node)
			) {
				this.menuOpen = false;
			}
		};
		ipcRenderer.on('iracing-connected', this.onIracingChange);
		ipcRenderer.on('iracing-disconnected', this.onIracingChange);
		window.addEventListener(INI_CHANGED_EVENT, this.onIniChanged);
		document.addEventListener('mousedown', this.onDocumentPointer, true);
		void this.refresh();
	},
	beforeUnmount() {
		ipcRenderer.removeListener('iracing-connected', this.onIracingChange);
		ipcRenderer.removeListener('iracing-disconnected', this.onIracingChange);
		window.removeEventListener(INI_CHANGED_EVENT, this.onIniChanged);
		document.removeEventListener('mousedown', this.onDocumentPointer, true);
	},
	methods: {
		async refresh() {
			const snapshot = await ipcRenderer.invoke('profiles:list');
			this.activeExists = snapshot.activeExists;
			this.activeName = snapshot.active.name;
			this.activeState = snapshot.active.state;
			this.activeDifferences = snapshot.activeDifferences;
			this.profiles = snapshot.profiles || [];
			this.iracingRunning = !!snapshot.iracingRunning;
		},
		// Same rules as the dialog's Load button: not while iRacing runs, not a
		// file that is not a graphics config, and not the profile the live
		// config already matches exactly. A MODIFIED match stays loadable,
		// because loading it restores the stored version.
		canLoad(profile: ProfileEntry): boolean {
			if (this.iracingRunning || !profile.valid || this.applying) {
				return false;
			}
			return !(
				this.activeState === 'clean' && profile.name === this.activeName
			);
		},
		toggleMenu() {
			if (this.menuOpen) {
				this.closeMenu();
			} else {
				void this.openMenu();
			}
		},
		async openMenu() {
			if (this.menuOpen) {
				return;
			}
			this.menuOpen = true;
			// Profiles may have been added, renamed or deleted since the last
			// refresh, and iRacing may have started.
			await this.refresh();
			this.$nextTick(() => this.focusItem(0));
		},
		closeMenu(returnFocus = false) {
			this.menuOpen = false;
			if (returnFocus) {
				(this.$refs.toggle as HTMLElement | undefined)?.focus();
			}
		},
		menuItems(): HTMLElement[] {
			return Array.from(
				this.$el.querySelectorAll(
					'.config-picker__item:not([disabled])'
				) as NodeListOf<HTMLElement>
			);
		},
		focusItem(index: number) {
			const items = this.menuItems();
			if (items.length === 0) {
				return;
			}
			const wrapped = (index + items.length) % items.length;
			items[wrapped].focus();
		},
		// Arrow keys move through the enabled items and wrap; Escape and Tab
		// close, Escape handing focus back to the name.
		onMenuKeydown(event: KeyboardEvent) {
			const items = this.menuItems();
			const current = items.indexOf(document.activeElement as HTMLElement);
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				this.focusItem(current + 1);
			} else if (event.key === 'ArrowUp') {
				event.preventDefault();
				this.focusItem(current - 1);
			} else if (event.key === 'Home') {
				event.preventDefault();
				this.focusItem(0);
			} else if (event.key === 'End') {
				event.preventDefault();
				this.focusItem(items.length - 1);
			} else if (event.key === 'Escape') {
				event.preventDefault();
				this.closeMenu(true);
			} else if (event.key === 'Tab') {
				this.closeMenu();
			}
		},
		async apply(name: string) {
			this.applying = name;
			try {
				const result = await ipcRenderer.invoke('profiles:apply', name);
				if (result && result.ok) {
					// Carries the restart caveat: the switch only takes effect at
					// iRacing's next launch.
					useOruga().notification.open({
						message: this.$t('graphicsProfiles.feedback.loaded', {
							name,
						}),
						variant: 'success',
						duration: 5000,
					});
					this.closeMenu(true);
					this.onApplied();
				} else {
					const code = result && result.error;
					useOruga().notification.open({
						message: this.$t(
							'graphicsProfiles.errors.' +
								(APPLY_ERRORS.includes(code) ? code : 'ioError')
						),
						variant: 'danger',
						duration: 6000,
					});
					await this.refresh();
				}
			} finally {
				this.applying = null;
			}
		},
		openDialog() {
			this.menuOpen = false;
			this.showProfiles = true;
		},
		onApplied() {
			void this.refresh();
			// Tell anything else showing ini state that it changed underneath.
			window.dispatchEvent(new Event(INI_CHANGED_EVENT));
		},
		closeDialog() {
			this.showProfiles = false;
			// Renames and save-as change the active name without an 'applied'.
			void this.refresh();
		},
	},
};
</script>

<style scoped>
.config-picker {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	padding: 0 0.5rem;
	font-size: 11px;
	color: white;
	/* Lives inside the title bar's drag region — stay clickable. */
	-webkit-app-region: no-drag;
	user-select: none;
}

.config-picker__heading {
	color: rgba(255, 255, 255, 0.55);
}

.config-picker__switcher {
	position: relative;
}

.config-picker__toggle {
	display: flex;
	align-items: center;
	gap: 0.3rem;
	height: 20px;
	padding: 0 0.35rem;
	background: none;
	border: none;
	border-radius: 2px;
	color: inherit;
	font: inherit;
	cursor: pointer;
}

.config-picker__toggle:hover,
.config-picker__toggle[aria-expanded='true'] {
	background-color: rgba(255, 255, 255, 0.1);
}

.config-picker__toggle:focus-visible,
.config-picker__item:focus-visible {
	outline: 1px solid rgba(255, 255, 255, 0.6);
	outline-offset: -1px;
}

.config-picker__caret {
	font-size: 8px;
	opacity: 0.75;
}

/* Hangs below the 24px title bar over the page. It sits inside the picker's
   no-drag region, and the z-index clears page content and Bulma's navbar. */
.config-picker__menu {
	position: absolute;
	top: calc(100% + 4px);
	left: 0;
	z-index: 1000;
	min-width: 14rem;
	max-width: 20rem;
	padding: 4px;
	background-color: #2b2b2b;
	border: 1px solid rgba(255, 255, 255, 0.12);
	border-radius: 6px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
	font-size: 12px;
}

.config-picker__item {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	width: 100%;
	padding: 6px 8px;
	background: none;
	border: none;
	border-radius: 4px;
	color: white;
	font: inherit;
	text-align: left;
	cursor: pointer;
}

.config-picker__item:hover:not([disabled]),
.config-picker__item:focus-visible {
	background-color: rgba(255, 255, 255, 0.1);
}

/* The live profile (clean match) is disabled because loading it changes
   nothing, but it must still read as the current one — so only dim it
   partly, and keep its check mark. */
.config-picker__item[disabled] {
	cursor: default;
	opacity: 0.5;
}

.config-picker__item[aria-checked='true'][disabled] {
	opacity: 0.8;
}

.config-picker__check {
	display: inline-flex;
	justify-content: center;
	flex: 0 0 14px;
	font-size: 11px;
}

.config-picker__item-name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.config-picker__note {
	display: flex;
	gap: 0.5rem;
	margin: 0 0 4px;
	padding: 6px 8px;
	font-size: 11px;
	line-height: 1.4;
	color: rgba(255, 255, 255, 0.7);
}

.config-picker__note.is-blocking {
	border-radius: 4px;
	background: rgba(255, 183, 15, 0.15);
	color: #ffce4f;
}

.config-picker__name {
	font-weight: 600;
	max-width: 14rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.config-picker__badge {
	padding: 0 0.3rem;
	border-radius: 2px;
	background-color: rgba(236, 32, 42, 0.25);
	color: #ffb3b7;
	font-size: 10px;
	line-height: 14px;
}

.config-picker__open {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 20px;
	padding: 0;
	background: none;
	border: none;
	border-radius: 2px;
	color: rgba(255, 255, 255, 0.75);
	cursor: pointer;
}

.config-picker__open:hover {
	background-color: rgba(255, 255, 255, 0.1);
	color: white;
}
</style>
