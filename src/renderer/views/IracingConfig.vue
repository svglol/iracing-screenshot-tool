<template>
	<div class="iracing-config">
		<header class="iracing-config__header">
			<span class="iracing-config__title">{{ $t('iniEditor.title') }}</span>
			<div v-if="modes.length > 0" class="iracing-config__mode">
				<label
					class="iracing-config__mode-label"
					for="iracing-config-mode"
					>{{ $t('iniEditor.mode.label') }}</label
				>
				<o-select
					id="iracing-config-mode"
					:model-value="mode"
					size="small"
					@update:model-value="switchMode"
				>
					<option
						v-for="entry in modes"
						:key="entry.mode"
						:value="entry.mode"
					>
						{{ modeLabel(entry.mode) }}
					</option>
				</o-select>
			</div>
		</header>

		<!-- Hand-rolled tablist, not <o-tabs>: the Tabs plugin is deliberately
		     unregistered and an unregistered Oruga component silently renders
		     nothing (the HelpModal precedent). -->
		<div
			class="iracing-config__tabs"
			role="tablist"
			:aria-label="$t('iniEditor.title')"
		>
			<button
				v-for="(tab, index) in tabs"
				:key="tab"
				type="button"
				role="tab"
				class="iracing-config__tab"
				:class="{ 'is-active': activeTab === tab }"
				:aria-selected="activeTab === tab"
				:tabindex="activeTab === tab ? 0 : -1"
				@click="activeTab = tab"
				@keydown.left.prevent="stepTab(index, -1)"
				@keydown.right.prevent="stepTab(index, 1)"
			>
				{{ $t('iniEditor.tabs.' + tab) }}
			</button>
		</div>

		<NoticeCard :notices="notices" />

		<div v-if="loaded" class="iracing-config__content-stack">
			<MonitorLayout
				v-if="activeTab === 'monitor'"
				:displays="displays"
				:primary-id="primaryId"
				:window-rect="windowRect"
			/>
			<div v-if="activeTab === 'graphics'" class="iracing-config__pair">
				<o-switch
					:model-value="pairReplay"
					@update:model-value="setPairReplay"
				>
					{{ $t('iniEditor.replayScope.label') }}
				</o-switch>
			</div>
			<div class="iracing-config__content">
				<div
					v-for="(column, columnIndex) in columns"
					:key="columnIndex"
					class="iracing-config__col"
				>
					<section
						v-for="group in column"
						:key="group.id"
						class="iracing-config__group"
					>
						<span class="iracing-config__group-title">{{
							$t('iniEditor.groups.' + group.id)
						}}</span>
						<SettingField
							v-for="setting in group.settings"
							:key="idOf(setting)"
							:setting="setting"
							:value="bufferValues[idOf(setting)] || ''"
							:missing="missing.includes(idOf(setting))"
							:locked="iracingRunning"
							:dirty="idOf(setting) in edits"
							@update="onUpdate"
						/>
					</section>
				</div>
			</div>
		</div>

		<div class="iracing-config__folder">
			<span class="iracing-config__folder-label">{{
				$t('iniEditor.folder.label')
			}}</span>
			<span class="iracing-config__folder-path" :title="folder">{{
				folder
			}}</span>
			<o-tag v-if="!folderOverride" size="small">{{
				$t('iniEditor.folder.autoDetected')
			}}</o-tag>
			<o-button size="small" @click="browseFolder">
				{{ $t('iniEditor.actions.browse') }}
			</o-button>
			<o-button v-if="folderOverride" size="small" @click="clearFolder">
				{{ $t('iniEditor.folder.reset') }}
			</o-button>
		</div>

		<footer v-if="dirtyCount > 0" class="iracing-config__savebar">
			<span class="iracing-config__savebar-count">{{
				$t('iniEditor.state.dirty', { count: dirtyCount })
			}}</span>
			<o-button
				variant="primary"
				:disabled="!canSave"
				:loading="saving"
				@click="save"
			>
				{{ $t('iniEditor.actions.save') }}
			</o-button>
			<o-button :disabled="saving" @click="discard">
				{{ $t('iniEditor.actions.discard') }}
			</o-button>
		</footer>
	</div>
</template>

<script lang="ts">
// Deliberately no utilities/config import (same reason as
// GraphicsProfilesModal: it constructs its store at import time and would make
// this view unmountable in a test) — the two persisted scalars go through the
// raw sync IPC the config shim itself uses.
import { defineComponent } from 'vue';
import { useOruga } from '@oruga-ui/oruga-next';
import NoticeCard, { type Notice } from '../components/NoticeCard.vue';
import SettingField from '../components/iracing-config/SettingField.vue';
import MonitorLayout from '../components/iracing-config/MonitorLayout.vue';
import {
	SETTINGS,
	settingId,
	findSetting,
	validateValue,
	type SettingDescriptor,
} from '../../utilities/iracing-settings-schema';
import {
	RENDERER_LEGACY_MODE,
	splitRendererMode,
} from '../../utilities/iracing-paths';
import { INI_CHANGED_EVENT } from '../ini-events';

const { ipcRenderer } = require('electron');

interface SettingGroup {
	id: string;
	settings: SettingDescriptor[];
}

export default defineComponent({
	name: 'IracingConfig',
	components: { NoticeCard, SettingField, MonitorLayout },
	data() {
		return {
			modes: [] as Array<{ mode: string; fileName: string }>,
			mode: '',
			folder: '',
			folderOverride: '',
			values: {} as Record<string, string>,
			missing: [] as string[],
			mtimeMs: 0,
			fileName: '',
			// Only ids whose buffer value differs from disk live here.
			edits: {} as Record<string, string>,
			loaded: false,
			loadError: '',
			saving: false,
			iracingRunning: false,
			stale: false,
			activeTab: 'monitor',
			tabs: ['monitor', 'graphics'],
			pairReplay: true,
			displays: [] as Array<{
				id: number;
				bounds: { x: number; y: number; width: number; height: number };
				scaleFactor: number;
				rotation: number;
				internal: boolean;
			}>,
			primaryId: -1,
			// Hoisted so beforeUnmount can remove exactly these listeners.
			onIracingStatus: null as
				| ((event: unknown, ready: boolean) => void)
				| null,
			onIracingChange: null as (() => void) | null,
			onWindowFocus: null as (() => void) | null,
			onIniChanged: null as (() => void) | null,
		};
	},
	computed: {
		bufferValues(): Record<string, string> {
			return { ...this.values, ...this.edits };
		},
		groups(): SettingGroup[] {
			const groups: SettingGroup[] = [];
			for (const setting of SETTINGS) {
				if (setting.tab !== this.activeTab) {
					continue;
				}
				let group = groups.find((g) => g.id === setting.group);
				if (!group) {
					group = { id: setting.group, settings: [] };
					groups.push(group);
				}
				group.settings.push(setting);
			}
			return groups;
		},
		// The active tab's groups packed into two columns by cumulative field
		// count, so neither column ends much longer than the other.
		columns(): SettingGroup[][] {
			const columns: SettingGroup[][] = [[], []];
			const heights = [0, 0];
			for (const group of this.groups) {
				const target = heights[0] <= heights[1] ? 0 : 1;
				columns[target].push(group);
				heights[target] += group.settings.length + 1;
			}
			return columns;
		},
		dirtyCount(): number {
			return Object.keys(this.edits).length;
		},
		invalidCount(): number {
			return Object.entries(this.edits).filter(([id, value]) => {
				const setting = findSetting(id);
				return !setting || !validateValue(setting, value);
			}).length;
		},
		canSave(): boolean {
			return (
				this.dirtyCount > 0 &&
				this.invalidCount === 0 &&
				!this.iracingRunning &&
				!this.stale &&
				!this.saving
			);
		},
		windowRect(): {
			x: number;
			y: number;
			width: number;
			height: number;
		} | null {
			const v = this.bufferValues;
			const fullscreen = v['Display/fullScreen'] === '1';
			const x = Number(v['Display/windowedXPos']);
			const y = Number(v['Display/windowedYPos']);
			const width = Number(
				fullscreen
					? v['Display/fullScreenWidth']
					: v['Display/windowedWidth']
			);
			const height = Number(
				fullscreen
					? v['Display/fullScreenHeight']
					: v['Display/windowedHeight']
			);
			if (![x, y, width, height].every(Number.isFinite) || width <= 0) {
				return null;
			}
			return { x, y, width, height };
		},
		notices(): Notice[] {
			const notices: Notice[] = [];
			if (this.iracingRunning) {
				notices.push({
					level: 'warning',
					text: this.$t('iniEditor.state.simRunning'),
				});
			}
			if (this.stale) {
				notices.push({
					level: 'warning',
					text: this.$t('iniEditor.state.stale'),
					action: {
						label: this.$t('iniEditor.actions.reload'),
						run: () => this.reloadFromDisk(),
					},
				});
			}
			if (this.modes.length === 0 && !this.loaded) {
				notices.push({
					level: 'info',
					text: this.$t('iniEditor.state.noModes', {
						folder: this.folder,
					}),
				});
			} else if (this.loadError) {
				notices.push({
					level: 'danger',
					text: this.$t('iniEditor.state.loadFailed'),
				});
			}
			return notices;
		},
	},
	async mounted() {
		this.onIracingStatus = (_event, ready: boolean) => {
			this.iracingRunning = Boolean(ready);
		};
		this.onIracingChange = () => {
			ipcRenderer.send('request-iracing-status', '');
			// iRacing exiting is the moment it rewrites every ini.
			void this.checkStale();
		};
		this.onWindowFocus = () => {
			void this.checkStale();
		};
		// The profiles dialog (title-bar picker) rewrote the ini in-app — no
		// focus event will fire for that.
		this.onIniChanged = () => {
			void this.checkStale();
		};
		ipcRenderer.on('iracing-status', this.onIracingStatus);
		ipcRenderer.on('iracing-connected', this.onIracingChange);
		ipcRenderer.on('iracing-disconnected', this.onIracingChange);
		window.addEventListener('focus', this.onWindowFocus);
		window.addEventListener(INI_CHANGED_EVENT, this.onIniChanged);
		ipcRenderer.send('request-iracing-status', '');
		this.pairReplay =
			ipcRenderer.sendSync('config:get', 'iniEditorPairReplay') !== false;

		try {
			const layout = await ipcRenderer.invoke('iracing-config:displays');
			this.displays = layout.displays;
			this.primaryId = layout.primaryId;
		} catch {
			// The visual is decoration; the editor works without it.
		}

		await this.refreshModes();
	},
	beforeUnmount() {
		ipcRenderer.removeListener('iracing-status', this.onIracingStatus);
		ipcRenderer.removeListener('iracing-connected', this.onIracingChange);
		ipcRenderer.removeListener('iracing-disconnected', this.onIracingChange);
		window.removeEventListener('focus', this.onWindowFocus);
		window.removeEventListener(INI_CHANGED_EVENT, this.onIniChanged);
	},
	beforeRouteLeave(
		_to: unknown,
		_from: unknown,
		next: (ok?: boolean) => void
	) {
		if (
			this.dirtyCount > 0 &&
			!window.confirm(
				this.$t('iniEditor.state.discardConfirm', {
					count: this.dirtyCount,
				})
			)
		) {
			next(false);
			return;
		}
		next();
	},
	methods: {
		idOf(setting: SettingDescriptor): string {
			return settingId(setting);
		},
		stepTab(index: number, delta: number) {
			const next = (index + delta + this.tabs.length) % this.tabs.length;
			this.activeTab = this.tabs[next];
		},
		setPairReplay(value: boolean) {
			this.pairReplay = Boolean(value);
			ipcRenderer.sendSync('config:set', {
				key: 'iniEditorPairReplay',
				value: this.pairReplay,
			});
		},
		modeLabel(mode: string): string {
			// Mode names are iRacing's own (Monitor, OpenXR, …) and stay
			// untranslated like every other product name; only the Legacy
			// pseudo-mode is ours to word. A custom config
			// (`rendererDX11Monitor - Screenshot.ini`) is listed by its bare
			// name, exactly as iRacing's own config switcher shows it.
			if (mode === RENDERER_LEGACY_MODE) {
				return this.$t('iniEditor.mode.legacy');
			}
			const { custom } = splitRendererMode(mode);
			return custom ?? mode;
		},
		async refreshModes() {
			this.folderOverride = ipcRenderer.sendSync(
				'config:get',
				'iracingFolder'
			);
			const result = await ipcRenderer.invoke('iracing-config:modes');
			this.modes = result.modes || [];
			this.folder = result.folder || '';

			const remembered = ipcRenderer.sendSync('config:get', 'iniEditorMode');
			const available = this.modes.map((entry) => entry.mode);
			const chosen = available.includes(remembered)
				? remembered
				: available[0] || '';
			if (chosen) {
				await this.loadMode(chosen);
			} else {
				this.loaded = false;
				this.mode = '';
			}
		},
		async loadMode(mode: string) {
			this.mode = mode;
			this.edits = {};
			this.stale = false;
			this.loadError = '';
			const result = await ipcRenderer.invoke('iracing-config:read', {
				mode,
			});
			if (!result.ok) {
				this.loaded = false;
				this.loadError = result.error;
				return;
			}
			this.values = result.values;
			this.missing = result.missing;
			this.mtimeMs = result.mtimeMs;
			this.fileName = result.fileName;
			this.loaded = true;
		},
		async switchMode(mode: string) {
			if (mode === this.mode) {
				return;
			}
			if (
				this.dirtyCount > 0 &&
				!window.confirm(
					this.$t('iniEditor.state.discardConfirm', {
						count: this.dirtyCount,
					})
				)
			) {
				// Re-render snaps the select back to the current mode.
				this.$forceUpdate();
				return;
			}
			ipcRenderer.sendSync('config:set', {
				key: 'iniEditorMode',
				value: mode,
			});
			await this.loadMode(mode);
		},
		onUpdate(id: string, raw: string) {
			if (raw === (this.values[id] ?? '')) {
				delete this.edits[id];
			} else {
				this.edits[id] = raw;
			}
		},
		discard() {
			this.edits = {};
		},
		async reloadFromDisk() {
			await this.loadMode(this.mode);
		},
		// The file changed under the editor (iRacing exit, a restored backup).
		// With no local edits the fresh state is simply adopted; with edits the
		// user decides via the stale notice.
		async checkStale() {
			if (!this.loaded || !this.mode) {
				return;
			}
			const result = await ipcRenderer.invoke('iracing-config:read', {
				mode: this.mode,
			});
			if (!result.ok || result.mtimeMs === this.mtimeMs) {
				return;
			}
			if (this.dirtyCount === 0) {
				this.values = result.values;
				this.missing = result.missing;
				this.mtimeMs = result.mtimeMs;
			} else {
				this.stale = true;
			}
		},
		async save() {
			if (!this.canSave) {
				return;
			}
			this.saving = true;
			try {
				const edits = Object.entries(this.edits).map(([id, value]) => ({
					id,
					value,
				}));
				const result = await ipcRenderer.invoke('iracing-config:save', {
					mode: this.mode,
					edits,
					expectedMtimeMs: this.mtimeMs,
					pairReplay: this.pairReplay,
				});
				if (result.ok) {
					useOruga().notification.open({
						message: this.$t('iniEditor.state.saved', {
							file: this.fileName,
						}),
						variant: 'success',
					});
					await this.loadMode(this.mode);
					// The active-profile state may have just drifted to
					// "modified" — tell the title-bar picker.
					window.dispatchEvent(new Event(INI_CHANGED_EVENT));
					return;
				}
				if (result.error === 'staleFile') {
					this.stale = true;
					return;
				}
				const known = [
					'iracingRunning',
					'validationFailed',
					'keyNotFound',
					'fileNotFound',
					'ioError',
				];
				useOruga().notification.open({
					message: this.$t(
						'iniEditor.errors.' +
							(known.includes(result.error) ? result.error : 'ioError')
					),
					variant: 'danger',
				});
			} finally {
				this.saving = false;
			}
		},
		async browseFolder() {
			const result = await ipcRenderer.invoke('dialog:showOpen', {
				properties: ['openDirectory'],
				defaultPath: this.folder,
			});
			const picked = result?.filePaths?.[0];
			if (!picked || result.canceled) {
				return;
			}
			ipcRenderer.sendSync('config:set', {
				key: 'iracingFolder',
				value: picked,
			});
			await this.refreshModes();
		},
		async clearFolder() {
			ipcRenderer.sendSync('config:set', {
				key: 'iracingFolder',
				value: '',
			});
			await this.refreshModes();
		},
	},
});
</script>

<style scoped>
.iracing-config {
	height: calc(100vh - var(--titlebar-height, 24px));
	overflow-y: auto;
	padding: 1rem 1.25rem 4.5rem;
	color: white;
}

.iracing-config__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	margin-bottom: 0.75rem;
}

.iracing-config__title {
	font-size: 1.15rem;
	font-weight: 700;
}

.iracing-config__mode {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.iracing-config__mode-label {
	font-size: 0.85rem;
	color: rgba(255, 255, 255, 0.7);
}

.iracing-config__tabs {
	display: flex;
	gap: 0.25rem;
	margin-bottom: 0.75rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.iracing-config__tab {
	background: none;
	border: none;
	border-bottom: 2px solid transparent;
	color: rgba(255, 255, 255, 0.65);
	padding: 0.4rem 0.9rem;
	cursor: pointer;
	font-size: 0.9rem;
}

.iracing-config__tab:hover {
	color: rgba(255, 255, 255, 0.9);
}

.iracing-config__tab.is-active {
	color: white;
	border-bottom-color: #ec202a;
	font-weight: 600;
}

.iracing-config__content {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	gap: 1rem;
	margin-top: 0.75rem;
}

.iracing-config__content-stack {
	margin-top: 0.75rem;
}

.iracing-config__pair {
	color: rgba(255, 255, 255, 0.85);
}

.iracing-config__col {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	min-width: 0;
}

.iracing-config__group {
	padding: 0.75rem 0.9rem;
	background-color: rgba(0, 0, 0, 0.25);
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 6px;
}

.iracing-config__group-title {
	display: block;
	font-weight: 700;
	margin-bottom: 0.35rem;
}

.iracing-config__folder {
	display: flex;
	align-items: center;
	gap: 0.6rem;
	margin-top: 1rem;
	font-size: 0.85rem;
	color: rgba(255, 255, 255, 0.7);
}

.iracing-config__folder-path {
	max-width: 28rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: rgba(255, 255, 255, 0.85);
}

.iracing-config__savebar {
	position: fixed;
	left: var(--nav-rail-width, 48px);
	right: 0;
	bottom: 0;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 0.6rem;
	padding: 0.6rem 1.25rem;
	background-color: rgba(0, 0, 0, 0.6);
	border-top: 1px solid rgba(255, 255, 255, 0.1);
	backdrop-filter: blur(4px);
}

.iracing-config__savebar-count {
	margin-right: auto;
	color: rgba(255, 255, 255, 0.8);
	font-size: 0.9rem;
}
</style>
