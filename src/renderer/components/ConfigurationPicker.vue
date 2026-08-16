<template>
	<div class="config-picker">
		<span class="config-picker__heading">{{
			$t('graphicsProfiles.activeHeading')
		}}</span>
		<span class="config-picker__name" :title="fullLabel">{{ chipName }}</span>
		<span v-if="activeState === 'modified'" class="config-picker__badge">{{
			$t('graphicsProfiles.badge.modified')
		}}</span>
		<button
			type="button"
			class="config-picker__open"
			:title="$t('graphicsProfiles.title')"
			@click="showProfiles = true"
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
// Writers of that ini elsewhere in the renderer (the config editor's save)
// announce themselves on the window as 'renderer-ini-changed', and this
// picker does the same after a profile is applied — that one event name is
// the whole cross-page sync contract.
import GraphicsProfilesModal from './GraphicsProfilesModal.vue';
import { INI_CHANGED_EVENT } from '../ini-events';

const { ipcRenderer } = require('electron');

export default {
	name: 'ConfigurationPicker',
	components: { GraphicsProfilesModal },
	data() {
		return {
			showProfiles: false,
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
		ipcRenderer.on('iracing-connected', this.onIracingChange);
		ipcRenderer.on('iracing-disconnected', this.onIracingChange);
		window.addEventListener(INI_CHANGED_EVENT, this.onIniChanged);
		void this.refresh();
	},
	beforeUnmount() {
		ipcRenderer.removeListener('iracing-connected', this.onIracingChange);
		ipcRenderer.removeListener('iracing-disconnected', this.onIracingChange);
		window.removeEventListener(INI_CHANGED_EVENT, this.onIniChanged);
	},
	methods: {
		async refresh() {
			const snapshot = await ipcRenderer.invoke('profiles:list');
			this.activeExists = snapshot.activeExists;
			this.activeName = snapshot.active.name;
			this.activeState = snapshot.active.state;
			this.activeDifferences = snapshot.activeDifferences;
		},
		onApplied() {
			void this.refresh();
			// Tell the pages (the config editor) the ini changed under them.
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
