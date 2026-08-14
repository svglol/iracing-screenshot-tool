<template>
	<div class="modal-card profiles-card">
		<header class="modal-card-head profiles-head">
			<p class="modal-card-title profiles-title">
				{{ $t('graphicsProfiles.title') }}
			</p>
			<button type="button" class="delete" @click="$emit('close')" />
		</header>

		<section class="modal-card-body profiles-body">
			<!-- v-html because the copy carries inline <b> emphasis on the one rule
			     that matters (switch while the sim is closed). Catalogue text, not
			     user input — same reasoning as HelpModal. -->
			<!-- eslint-disable-next-line vue/no-v-html -->
			<p class="description" v-html="$t('graphicsProfiles.description')"></p>

			<!-- The single most important thing on this screen. iRacing rewrites its
			     graphics config from memory when it exits, so a swap made while it is
			     running is silently undone — and the user would not find out until the
			     next launch. Apply is disabled below; this says why. -->
			<div v-if="iracingRunning" class="profiles-banner is-blocking">
				<font-awesome-icon :icon="['fas', 'triangle-exclamation']" />
				<span>{{ $t('graphicsProfiles.iracingRunning') }}</span>
			</div>

			<div class="profiles-active">
				<span class="heading">{{
					$t('graphicsProfiles.activeHeading')
				}}</span>
				<span class="profiles-active__value">{{ activeLabel }}</span>
			</div>

			<div v-if="feedback" class="profiles-banner" :class="feedbackClass">
				<span>{{ feedback }}</span>
			</div>

			<!-- Nothing is auto-discovered from the iRacing folder, so a first-run
			     user has an empty list and needs telling where profiles come from. -->
			<div v-if="!loading && profiles.length === 0" class="profiles-empty">
				<p>{{ $t('graphicsProfiles.empty.title') }}</p>
				<p class="description">{{ $t('graphicsProfiles.empty.body') }}</p>
			</div>

			<ul v-else class="profiles-list">
				<li
					v-for="profile in profiles"
					:key="profile.name"
					class="profiles-row"
					:class="{
						'is-active': profile.name === activeName,
						'is-duplicate': profile.name === duplicateHighlight,
					}"
					:data-profile-name="profile.name"
				>
					<div class="profiles-row__main">
						<span class="profiles-row__name">{{ profile.name }}</span>
						<span
							v-if="profile.name === activeName"
							class="profiles-row__badge"
							>{{ activeBadge }}</span
						>
						<span
							v-if="!profile.valid"
							class="profiles-row__badge is-danger"
						>
							{{ $t('graphicsProfiles.invalidProfile') }}
						</span>
						<span
							v-else-if="profile.warnings.includes('autoCfgIncomplete')"
							class="profiles-row__badge is-warning"
						>
							{{ $t('graphicsProfiles.warnings.autoCfgIncomplete') }}
						</span>
					</div>

					<!-- Delete asks first. Everything else here is recoverable from a
					     backup; removing a profile someone spent an evening tuning is
					     the one action worth a speed bump, even with the recycle bin. -->
					<div
						v-if="
							pending.mode === 'delete' &&
							pending.target === profile.name
						"
						class="profiles-row__actions"
					>
						<span class="profiles-confirm">{{
							$t('graphicsProfiles.prompt.deleteConfirm', {
								name: profile.name,
							})
						}}</span>
						<o-button class="button is-small" @click="cancelPending">
							{{ $t('graphicsProfiles.actions.cancel') }}
						</o-button>
						<o-button
							class="button is-small is-danger"
							:loading="busy === profile.name"
							@click="confirmDelete(profile.name)"
						>
							{{ $t('graphicsProfiles.actions.delete') }}
						</o-button>
					</div>

					<div
						v-else-if="
							pending.mode === 'rename' &&
							pending.target === profile.name
						"
						class="profiles-row__actions"
					>
						<o-input
							v-model="nameInput"
							class="profiles-name-input"
							size="small"
							:placeholder="
								$t('graphicsProfiles.prompt.namePlaceholder')
							"
							@keyup.enter="confirmRename(profile.name)"
						/>
						<o-button class="button is-small" @click="cancelPending">
							{{ $t('graphicsProfiles.actions.cancel') }}
						</o-button>
						<o-button
							class="button is-small is-primary"
							:loading="busy === profile.name"
							@click="confirmRename(profile.name)"
						>
							{{ $t('graphicsProfiles.actions.save') }}
						</o-button>
					</div>

					<div v-else class="profiles-row__actions">
						<o-button
							class="button is-small is-primary"
							:disabled="iracingRunning || !profile.valid"
							:loading="busy === profile.name"
							@click="apply(profile.name)"
						>
							{{ $t('graphicsProfiles.actions.apply') }}
						</o-button>
						<o-button
							class="button is-small"
							:disabled="!activeExists"
							@click="overwrite(profile.name)"
						>
							{{ $t('graphicsProfiles.actions.overwrite') }}
						</o-button>
						<o-button
							class="button is-small"
							@click="startRename(profile.name)"
						>
							{{ $t('graphicsProfiles.actions.rename') }}
						</o-button>
						<o-button
							class="button is-small"
							@click="exportProfile(profile.name)"
						>
							{{ $t('graphicsProfiles.actions.export') }}
						</o-button>
						<o-button
							class="button is-small is-danger is-outlined"
							@click="startDelete(profile.name)"
						>
							{{ $t('graphicsProfiles.actions.delete') }}
						</o-button>
					</div>
				</li>
			</ul>

			<div v-if="pending.mode === 'save'" class="profiles-savebar">
				<o-input
					v-model="nameInput"
					class="profiles-name-input"
					:placeholder="$t('graphicsProfiles.prompt.namePlaceholder')"
					@keyup.enter="confirmSave"
				/>
				<o-button class="button" @click="cancelPending">
					{{ $t('graphicsProfiles.actions.cancel') }}
				</o-button>
				<o-button
					class="button is-primary"
					:loading="saving"
					@click="confirmSave"
				>
					{{ $t('graphicsProfiles.actions.save') }}
				</o-button>
			</div>
		</section>

		<footer class="modal-card-foot profiles-foot">
			<o-button
				class="button is-primary"
				:disabled="!activeExists"
				@click="startSave"
			>
				{{ $t('graphicsProfiles.actions.saveCurrent') }}
			</o-button>
			<o-button class="button" @click="importFromDisk">
				{{ $t('graphicsProfiles.actions.import') }}
			</o-button>
			<o-button class="button" @click="openFolder">
				{{ $t('graphicsProfiles.actions.openFolder') }}
			</o-button>
		</footer>
	</div>
</template>

<script lang="ts">
// Deliberately no utilities/config import. Everything this component needs about
// paths comes from the snapshot, which main resolves properly — reading the raw
// `iracingFolder` setting here would give the empty string on nearly every
// machine, since it is only ever set as an escape hatch. Keeping config out also
// keeps the module mountable in a test (it constructs an electron-store at import
// time, which throws outside Electron).
const { ipcRenderer } = require('electron');

export default {
	emits: ['close'],
	data() {
		return {
			loading: true,
			profiles: [],
			activeName: null,
			activeState: 'unknown',
			activeDifferences: null,
			activeExists: false,
			// The live config's full path, as main resolved it. Used to open the
			// import dialog where the user's hand-managed variants already live.
			activeIniPath: '',
			iracingRunning: false,
			busy: null,
			// Separate from `busy`, which is keyed by profile name: the save bar has
			// no profile of its own to key on.
			saving: false,
			// One inline flow at a time: {mode: 'save'|'rename'|'delete', target}.
			pending: { mode: null, target: null },
			nameInput: '',
			feedback: '',
			feedbackClass: '',
			// Name of the profile to shake and glow: the one that already holds the
			// configuration the user just tried to save or import.
			duplicateHighlight: '',
		};
	},
	computed: {
		activeLabel() {
			if (!this.activeExists) {
				return this.$t('graphicsProfiles.active.missing');
			}
			if (this.activeState === 'clean') {
				return this.$t('graphicsProfiles.active.clean', {
					name: this.activeName,
				});
			}
			if (this.activeState === 'modified') {
				// The count is what distinguishes "I nudged one slider" from "this is
				// a different setup entirely".
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
		activeBadge() {
			return this.activeState === 'modified'
				? this.$t('graphicsProfiles.badge.modified')
				: this.$t('graphicsProfiles.badge.active');
		},
	},
	mounted() {
		this.refresh();
		// iRacing's readiness gates Apply, so track it live rather than only at open.
		ipcRenderer.on('iracing-connected', this.handleIracingChange);
		ipcRenderer.on('iracing-disconnected', this.handleIracingChange);
	},
	beforeUnmount() {
		ipcRenderer.removeListener('iracing-connected', this.handleIracingChange);
		ipcRenderer.removeListener(
			'iracing-disconnected',
			this.handleIracingChange
		);
	},
	methods: {
		handleIracingChange() {
			this.refresh();
		},
		async refresh() {
			this.loading = true;
			try {
				const snapshot = await ipcRenderer.invoke('profiles:list');
				this.profiles = snapshot.profiles;
				this.activeName = snapshot.active.name;
				this.activeState = snapshot.active.state;
				this.activeDifferences = snapshot.activeDifferences;
				this.activeExists = snapshot.activeExists;
				this.activeIniPath = snapshot.activeIniPath;
				this.iracingRunning = snapshot.iracingRunning;
			} finally {
				this.loading = false;
			}
		},
		cancelPending() {
			this.pending = { mode: null, target: null };
			this.nameInput = '';
		},
		startSave() {
			this.clearFeedback();
			// Seed with the active profile's name so the common case — re-saving the
			// setup you are on — is one keystroke.
			this.nameInput = this.activeName || '';
			this.pending = { mode: 'save', target: null };
		},
		startRename(name) {
			this.clearFeedback();
			this.nameInput = name;
			this.pending = { mode: 'rename', target: name };
		},
		startDelete(name) {
			this.clearFeedback();
			this.pending = { mode: 'delete', target: name };
		},
		clearFeedback() {
			this.feedback = '';
			this.feedbackClass = '';
			this.duplicateHighlight = '';
		},
		report(result, successKey, params = {}) {
			if (result && result.ok) {
				this.feedback = this.$t(successKey, params);
				this.feedbackClass = 'is-success';
				return true;
			}
			// duplicateContent arrives with the name of the profile that already
			// holds these settings; the message points the user at it and the row
			// itself shakes so the eye lands on the right line.
			this.feedback = this.errorText(
				result && result.error,
				result && result.duplicateOf ? { name: result.duplicateOf } : {}
			);
			this.feedbackClass = 'is-danger';
			if (result && result.duplicateOf) {
				this.flagDuplicate(result.duplicateOf);
			}
			return false;
		},
		flagDuplicate(name) {
			// Drop the class for a frame before re-applying it, so a second refusal
			// against the SAME profile restarts the animation instead of doing
			// nothing visible.
			this.duplicateHighlight = '';
			this.$nextTick(() => {
				this.duplicateHighlight = name;
				// Safe to interpolate unescaped: profile names are Windows filenames,
				// and the two characters that could break a double-quoted attribute
				// selector — `"` and `\` — are both illegal in them.
				const row = this.$el.querySelector(`[data-profile-name="${name}"]`);
				// The row may be scrolled out of view in a long list, and a shake
				// nobody sees identifies nothing.
				if (row && typeof row.scrollIntoView === 'function') {
					row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
				}
			});
		},
		// Store and name errors arrive as codes precisely so they can be phrased in
		// the user's language here.
		errorText(code, params = {}) {
			const known = [
				'empty',
				'illegalCharacters',
				'reservedName',
				'trailingDotOrSpace',
				'tooLong',
				'duplicate',
				'profileNotFound',
				'profileExists',
				'duplicateContent',
				'noActiveConfig',
				'invalidIni',
				'iracingRunning',
				'ioError',
			];
			return known.includes(code)
				? this.$t('graphicsProfiles.errors.' + code, params)
				: this.$t('graphicsProfiles.errors.ioError');
		},
		async apply(name) {
			this.clearFeedback();
			this.busy = name;
			try {
				const result = await ipcRenderer.invoke('profiles:apply', name);
				// The success message carries the restart caveat: the swap only takes
				// effect at iRacing's next launch, and without saying so the user has
				// every reason to think it silently failed.
				this.report(result, 'graphicsProfiles.feedback.applied', { name });
				await this.refresh();
			} finally {
				this.busy = null;
			}
		},
		async confirmSave() {
			const name = this.nameInput;
			this.saving = true;
			try {
				const result = await ipcRenderer.invoke('profiles:save', { name });
				if (
					this.report(result, 'graphicsProfiles.feedback.saved', { name })
				) {
					this.cancelPending();
				}
				await this.refresh();
			} finally {
				this.saving = false;
			}
		},
		async overwrite(name) {
			this.clearFeedback();
			this.busy = name;
			try {
				const result = await ipcRenderer.invoke('profiles:save', {
					name,
					overwrite: true,
				});
				this.report(result, 'graphicsProfiles.feedback.overwritten', {
					name,
				});
				await this.refresh();
			} finally {
				this.busy = null;
			}
		},
		async confirmRename(from) {
			const to = this.nameInput;
			this.busy = from;
			try {
				const result = await ipcRenderer.invoke('profiles:rename', {
					from,
					to,
				});
				if (
					this.report(result, 'graphicsProfiles.feedback.renamed', {
						name: to,
					})
				) {
					this.cancelPending();
				}
				await this.refresh();
			} finally {
				this.busy = null;
			}
		},
		async confirmDelete(name) {
			this.busy = name;
			try {
				const result = await ipcRenderer.invoke('profiles:delete', name);
				if (
					this.report(result, 'graphicsProfiles.feedback.deleted', {
						name,
					})
				) {
					this.cancelPending();
				}
				await this.refresh();
			} finally {
				this.busy = null;
			}
		},
		async importFromDisk() {
			this.clearFeedback();
			const result = await ipcRenderer.invoke('dialog:showOpen', {
				title: this.$t('graphicsProfiles.actions.import'),
				// Open where the live config lives — that is exactly where the
				// hand-managed "rendererDX11Monitor - Racing.ini" variants sit.
				defaultPath: this.activeIniPath || undefined,
				filters: [{ name: 'iRacing config', extensions: ['ini'] }],
				properties: ['openFile'],
			});
			if (result.canceled || !result.filePaths || !result.filePaths.length) {
				return;
			}

			const sourcePath = result.filePaths[0];
			// Seed the name from the file, stripping the "rendererDX11Monitor - "
			// prefix of the convention people already use by hand.
			const base = sourcePath
				.replace(/^.*[\\/]/, '')
				.replace(/\.ini$/i, '')
				.replace(/^rendererDX11Monitor\s*-\s*/i, '');

			const imported = await ipcRenderer.invoke('profiles:import', {
				sourcePath,
				name: base,
			});
			this.report(imported, 'graphicsProfiles.feedback.imported', {
				name: base,
			});
			await this.refresh();
		},
		async exportProfile(name) {
			this.clearFeedback();
			const result = await ipcRenderer.invoke('dialog:showSave', {
				title: this.$t('graphicsProfiles.actions.export'),
				// Named for the convention iRacing users already keep by hand, so an
				// export drops straight into that workflow.
				defaultPath: `rendererDX11Monitor - ${name}.ini`,
				filters: [{ name: 'iRacing config', extensions: ['ini'] }],
			});
			if (result.canceled || !result.filePath) {
				return;
			}
			const exported = await ipcRenderer.invoke('profiles:export', {
				name,
				destinationPath: result.filePath,
			});
			this.report(exported, 'graphicsProfiles.feedback.exported', { name });
		},
		openFolder() {
			ipcRenderer.invoke('profiles:revealFolder');
		},
	},
};
</script>

<style scoped>
.profiles-card {
	width: 100%;
	max-width: 820px;
	background: rgb(37, 37, 37) !important;
}

.profiles-head,
.profiles-foot {
	background-color: rgba(0, 0, 0, 0.2);
	border-bottom: 0;
	border-top: 0;
}

.profiles-foot {
	gap: 0.5rem;
}

.profiles-title {
	color: white;
	font-weight: 700;
	margin-bottom: 0;
}

.profiles-body {
	color: #dbdbdb;
	max-height: 70vh;
}

.description {
	font-size: 0.85rem;
	opacity: 0.75;
	margin-bottom: 0.75rem;
}

.heading {
	text-transform: uppercase;
	font-size: 0.7rem;
	letter-spacing: 0.05em;
	opacity: 0.6;
}

.profiles-banner {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 0.75rem;
	border-radius: 4px;
	margin-bottom: 0.75rem;
	font-size: 0.85rem;
	background: rgba(255, 255, 255, 0.06);
}

.profiles-banner.is-blocking {
	background: rgba(255, 183, 15, 0.15);
	color: #ffce4f;
}

.profiles-banner.is-success {
	background: rgba(72, 199, 116, 0.15);
	color: #6fdc98;
}

.profiles-banner.is-danger {
	background: rgba(241, 70, 104, 0.15);
	color: #ff7b96;
}

.profiles-active {
	display: flex;
	flex-direction: column;
	margin-bottom: 0.75rem;
}

.profiles-active__value {
	font-weight: 600;
}

.profiles-empty {
	padding: 1.25rem;
	text-align: center;
	background: rgba(255, 255, 255, 0.04);
	border-radius: 4px;
}

.profiles-list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.profiles-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
	flex-wrap: wrap;
	padding: 0.55rem 0.7rem;
	border-radius: 4px;
	background: rgba(255, 255, 255, 0.04);
	margin-bottom: 0.4rem;
}

.profiles-row.is-active {
	background: rgba(255, 255, 255, 0.09);
}

/* Points at the profile that already holds the configuration the user just
   tried to save or import: a shake to catch the eye, a red glow that fades.
   The glow animates to fully transparent and holds there (forwards), so the
   class can stay on the row until the next action without leaving a lit
   border behind. The shake is gated on prefers-reduced-motion; the fading
   glow alone still identifies the row for users who opt out of motion. */
.profiles-row.is-duplicate {
	animation: duplicate-glow 1.6s ease-out forwards;
}

@media (prefers-reduced-motion: no-preference) {
	.profiles-row.is-duplicate {
		animation:
			duplicate-shake 0.5s ease,
			duplicate-glow 1.6s ease-out forwards;
	}
}

@keyframes duplicate-shake {
	0%,
	100% {
		transform: translateX(0);
	}
	20%,
	60% {
		transform: translateX(-6px);
	}
	40%,
	80% {
		transform: translateX(6px);
	}
}

@keyframes duplicate-glow {
	0% {
		box-shadow:
			0 0 0 2px rgba(241, 70, 104, 0.9),
			0 0 14px rgba(241, 70, 104, 0.55);
	}
	100% {
		box-shadow:
			0 0 0 2px rgba(241, 70, 104, 0),
			0 0 14px rgba(241, 70, 104, 0);
	}
}

.profiles-row__main {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	min-width: 0;
}

.profiles-row__name {
	font-weight: 600;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.profiles-row__badge {
	font-size: 0.65rem;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	padding: 0.1rem 0.4rem;
	border-radius: 3px;
	background: rgba(255, 255, 255, 0.15);
}

.profiles-row__badge.is-danger {
	background: rgba(241, 70, 104, 0.25);
	color: #ff7b96;
}

.profiles-row__badge.is-warning {
	background: rgba(255, 183, 15, 0.2);
	color: #ffce4f;
}

.profiles-row__actions {
	display: flex;
	align-items: center;
	gap: 0.35rem;
	flex-wrap: wrap;
}

.profiles-confirm {
	font-size: 0.8rem;
	margin-right: 0.25rem;
}

.profiles-savebar {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-top: 0.75rem;
}

.profiles-name-input {
	flex: 1;
	min-width: 10rem;
}
</style>
