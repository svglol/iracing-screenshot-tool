<template>
	<div class="modal-card">
		<header class="modal-card-head">
			<p class="modal-card-title settings-title">
				{{ $t('settings.title') }}
			</p>
		</header>
		<section class="modal-card-body settings-body">
			<div class="settings-layout">
				<aside class="settings-meta">
					<span class="heading">{{
						$t('settings.version', { version: toolVersion })
					}}</span>
					<span class="heading"
						><a @click="$emit('changelog')">{{
							$t('settings.changelog')
						}}</a></span
					>
					<span class="heading"
						><a @click="openLogsFolder">{{
							$t('settings.openLogsFolder')
						}}</a></span
					>
					<!-- Somewhere to ASK. The updater is otherwise entirely passive,
					     so a user who wanted to know whether they were current had no
					     way to find out short of opening GitHub. -->
					<span class="heading"
						><a @click="checkForUpdates">{{
							$t('settings.checkForUpdates')
						}}</a></span
					>
					<span class="heading settings-meta__update">{{
						updateStatus
					}}</span>
				</aside>

				<div class="settings-form">
					<o-field :label="$t('settings.language')">
						<o-select v-model="locale" expanded>
							<!-- Each language named in ITSELF. Someone looking for their
							     language in a list they cannot otherwise read still
							     recognises its endonym; "Czech" helps nobody who needs it. -->
							<option
								v-for="option in localeOptions"
								:key="option.code"
								:value="option.code"
							>
								{{ option.name }}
							</option>
						</o-select>
					</o-field>
					<span class="description">{{
						$t('settings.languageDescription')
					}}</span>
					<hr />
					<o-field :label="$t('settings.screenshotFolder')" />

					<o-field addons class="settings-inline-field">
						<o-input
							expanded
							disabled
							type="text"
							:model-value="screenshotFolder"
						/>
						<p class="control">
							<o-button
								class="button is-primary settings-action"
								@click="openFolderDialog"
							>
								{{ $t('settings.selectFolder') }}
							</o-button>
						</p>
					</o-field>
					<hr />
					<o-field :label="$t('settings.screenshotKeybind')" />
					<o-field addons class="settings-inline-field">
						<o-input
							expanded
							disabled
							type="text"
							:model-value="screenshotKeybind"
						/>
						<p class="control">
							<o-button
								class="button is-primary settings-action"
								:loading="bindingKey"
								@click="bindScreenshotKeybind"
							>
								{{ $t('settings.editBind') }}
							</o-button>
						</p>
					</o-field>
					<hr />
					<o-field class="settings-toggle-row">
						<o-switch
							id="settings-custom-filename-format-switch"
							v-model="customFilenameFormat"
							:rounded="false"
							class="settings-light-switch"
						/>
						<label
							for="settings-custom-filename-format-switch"
							class="settings-toggle-row__text"
						>
							<span class="label" style="margin-bottom: 0px">{{
								$t('settings.customFilenameFormat')
							}}</span>
							<span class="description">{{
								$t('settings.customFilenameFormatDescription')
							}}</span>
						</label>
					</o-field>
					<div v-if="customFilenameFormat">
						<o-field>
							<span class="description">{{
								$t('settings.filenameFieldsHint')
							}}</span>
						</o-field>

						<o-field>
							<o-input
								v-model="filenameFormat"
								type="text"
								placeholder="{track}-{driver}-{counter}"
								style="width: 100%"
							/>
							<p class="control">
								<o-button
									class="button is-light"
									style="width: 80px"
									@click="filenameFormat = defaultFormat"
								>
									{{ $t('settings.reset') }}
								</o-button>
							</p>
						</o-field>

						<o-field>
							<span class="description"
								>{{ $t('settings.preview') }}
								<strong style="color: #fff">{{
									filenamePreview
								}}</strong></span
							>
						</o-field>

						<div
							v-for="group in fieldGroups"
							:key="group.key"
							style="margin-bottom: 0.5rem"
						>
							<span
								class="description"
								style="display: block; margin-bottom: 0.25rem"
								>{{ group.name }}</span
							>
							<div class="field is-grouped is-grouped-multiline">
								<div
									v-for="field in group.fields"
									:key="field.token"
									class="control"
								>
									<o-tag
										variant="primary"
										style="cursor: pointer"
										@click="insertField(field.token)"
									>
										{{ $t(field.labelKey) }}
									</o-tag>
								</div>
							</div>
						</div>
					</div>

					<hr />
					<o-field :label="$t('settings.outputFormat')">
						<o-select v-model="outputFormat">
							<option value="jpeg">
								{{ $t('settings.formatJpeg') }}
							</option>
							<option value="png">
								{{ $t('settings.formatPng') }}
							</option>
							<option value="webp">
								{{ $t('settings.formatWebp') }}
							</option>
						</o-select>
					</o-field>
					<hr />
					<o-field class="settings-toggle-row">
						<o-switch
							id="settings-disable-tooltips-switch"
							v-model="disableTooltips"
							:rounded="false"
							class="settings-light-switch"
						/>
						<label
							for="settings-disable-tooltips-switch"
							class="settings-toggle-row__text"
						>
							<span class="label" style="margin-bottom: 0px">{{
								$t('settings.disableTooltips')
							}}</span>
							<span class="description">{{
								$t('settings.disableTooltipsDescription')
							}}</span>
						</label>
					</o-field>
					<hr />
					<o-field class="settings-toggle-row">
						<o-switch
							id="settings-crop-top-left-switch"
							v-model="cropTopLeft"
							:rounded="false"
							class="settings-light-switch"
						/>
						<label
							for="settings-crop-top-left-switch"
							class="settings-toggle-row__text"
						>
							<span class="label" style="margin-bottom: 0px">{{
								$t('settings.cropTopLeft')
							}}</span>
							<span class="description">{{
								$t('settings.cropTopLeftDescription')
							}}</span>
						</label>
					</o-field>
					<hr />
					<o-field class="settings-toggle-row">
						<o-switch
							id="settings-manual-window-restore-switch"
							v-model="manualWindowRestore"
							:rounded="false"
							class="settings-light-switch"
						/>
						<label
							for="settings-manual-window-restore-switch"
							class="settings-toggle-row__text"
						>
							<span class="label" style="margin-bottom: 0px">{{
								$t('settings.manualWindowRestore')
							}}</span>
							<span class="description">{{
								$t('settings.manualWindowRestoreDescription')
							}}</span>
						</label>
					</o-field>
					<div v-if="manualWindowRestore">
						<div class="columns settings-grid">
							<div class="column">
								<o-field :label="$t('settings.left')">
									<o-input v-model="screenLeft" type="number" />
								</o-field>
							</div>
							<div class="column">
								<o-field :label="$t('settings.top')">
									<o-input v-model="screenTop" type="number" />
								</o-field>
							</div>
						</div>
						<div class="columns settings-grid">
							<div class="column">
								<o-field :label="$t('settings.width')">
									<o-input
										v-model="screenWidth"
										type="number"
										min="1080"
										max="10320"
									/>
								</o-field>
							</div>
							<div class="column">
								<o-field :label="$t('settings.height')">
									<o-input
										v-model="screenHeight"
										type="number"
										min="720"
										max="10320"
									/>
								</o-field>
							</div>
						</div>
						<o-button
							variant="info"
							icon-left="expand-arrows-alt"
							expanded
							:disabled="!iracingOpen"
							style="margin-top: 0.5rem"
							@click="restoreNow"
						>
							{{ $t('settings.restoreNow') }}
						</o-button>
					</div>
					<hr />
					<o-field class="settings-toggle-row">
						<o-switch
							id="settings-native-capture-switch"
							v-model="nativeCapture"
							:rounded="false"
							:disabled="!nativeCaptureSupported"
							class="settings-light-switch"
						/>
						<label
							for="settings-native-capture-switch"
							class="settings-toggle-row__text"
						>
							<span class="label" style="margin-bottom: 0px">{{
								$t('settings.nativeCapture')
							}}</span>
							<span
								class="description"
								:class="{
									'description--warning': nativeCaptureProblem,
								}"
							>
								{{ nativeCaptureDescription }}
							</span>
						</label>
					</o-field>
					<hr />
					<o-field class="settings-toggle-row">
						<o-switch
							id="settings-reshade-switch"
							v-model="reshade"
							:rounded="false"
							class="settings-light-switch"
						/>
						<label
							for="settings-reshade-switch"
							class="settings-toggle-row__text"
						>
							<span class="label" style="margin-bottom: 0px">{{
								$t('settings.reshade')
							}}</span>
						</label>
					</o-field>
					<span class="description">
						{{ $t('settings.reshadeDescription') }}
					</span>
					<o-field :label="$t('settings.reshadeIni')" />

					<o-field addons class="settings-inline-field">
						<o-input
							expanded
							disabled
							type="text"
							:model-value="reshadeFile"
						/>
						<p class="control">
							<o-button
								:disabled="!reshade"
								class="button is-primary settings-action"
								@click="openReshadeDialog"
							>
								{{ $t('settings.selectFile') }}
							</o-button>
						</p>
					</o-field>
				</div>
			</div>
		</section>
	</div>
</template>

<script lang="ts">
import config from '../../utilities/config';
import { version } from '../../../package.json';
import {
	FILENAME_FIELDS,
	DEFAULT_FORMAT,
	type FilenameField,
} from '../../utilities/filenameFormat';
import { getLocale, SUPPORTED_LOCALES } from '../../utilities/i18n';
import { applyLocale } from '../i18n';
import {
	describeUpdate,
	initialUpdateState,
} from '../../utilities/update-decisions';
const { ipcRenderer, shell } = require('electron');
const path = require('path');

export default {
	data() {
		return {
			// `|| getLocale()` so the dropdown always has a selected row. Main
			// resolves and persists `locale` before the window is created, so the
			// config read normally wins — but an empty string would render a picker
			// with nothing highlighted, which reads as "no language set".
			locale: config.get('locale') || getLocale(),
			localeOptions: SUPPORTED_LOCALES,
			screenshotFolder: config.get('screenshotFolder'),
			screenshotKeybind: config.get('screenshotKeybind'),
			bindingKey: false,
			cropTopLeft: config.get('cropTopLeft'),
			disableTooltips: config.get('disableTooltips'),
			screenWidth: config.get('defaultScreenWidth'),
			screenHeight: config.get('defaultScreenHeight'),
			screenTop: config.get('defaultScreenTop'),
			screenLeft: config.get('defaultScreenLeft'),
			manualWindowRestore: config.get('manualWindowRestore'),
			toolVersion: version,
			reshade: config.get('reshade'),
			reshadeFile: config.get('reshadeFile'),
			nativeCapture: config.get('nativeCapture'),
			// Set from the main process in created(); assume supported until told
			// otherwise so the toggle isn't briefly disabled on a capable machine.
			nativeCaptureSupported: true,
			// Main's sentence explaining an unsupported verdict — which Windows
			// floor was missed. Null while supported, or if the query failed.
			nativeCaptureReason: null,
			// Set when the OS advertises support but the trial capture on toggle-on
			// did not come back. Not a refusal (see the native-capture-verify
			// handler), so the switch stays on and this explains what we saw.
			nativeCaptureWarning: null,
			// Capture works, but this OS build made us give something up — today
			// only the cursor suppression, below Win10 2004. Not a problem, so it
			// reads as an ordinary note appended to the description.
			nativeCaptureCaveat: null,
			// Guards the nativeCapture watcher against the write it performs itself
			// when it reverts a refused toggle, which would otherwise re-enter.
			nativeCaptureReverting: false,
			customFilenameFormat: config.get('customFilenameFormat'),
			filenameFormat: config.get('filenameFormat'),
			outputFormat: config.get('outputFormat'),
			filenameFields: FILENAME_FIELDS,
			defaultFormat: DEFAULT_FORMAT,
			iracingOpen: false,
			// Mirrors main's update state so the status line stays live while the
			// modal is open — it shows download percent as it climbs, not a frozen
			// answer from whenever the modal was first created.
			update: {
				...initialUpdateState(),
				busy: false,
				currentVersion: version,
			},
			// A one-off message from update:check that the state cannot express
			// (today: "only runs in an installed build"). Cleared by the next state
			// broadcast so it can't linger past its truth.
			updateNotice: null,
		};
	},
	computed: {
		filenamePreview() {
			const examples = {
				'{track}': 'Daytona',
				'{trackFull}': 'Daytona International Speedway',
				'{trackCity}': 'Daytona Beach',
				'{trackCountry}': 'USA',
				'{trackType}': 'road course',
				'{driver}': 'Max Verstappen',
				'{driverAbbrev}': 'M. Verstappen',
				'{driverInitials}': 'MV',
				'{team}': 'Red Bull Racing',
				'{carNumber}': '1',
				'{car}': 'MCL36',
				'{carFull}': 'McLaren MCL36',
				'{carClass}': 'GTP',
				'{iRating}': '5231',
				'{sessionType}': 'Race',
				'{sessionName}': 'RACE',
				'{lap}': '12',
				'{date}': '2026-04-03',
				'{time}': '14-30-00',
				'{datetime}': '2026-04-03_14-30-00',
				'{counter}': '0',
			};
			let preview = this.filenameFormat || '';
			for (const [token, value] of Object.entries(examples)) {
				preview = preview.split(token).join(value);
			}
			const extMap = { jpeg: '.jpg', png: '.png', webp: '.webp' };
			return preview + (extMap[this.outputFormat] || '.jpg');
		},
		// Grouped for display, with the group heading translated. Keyed by the
		// UNtranslated category key so the v-for key is stable across a language
		// change (and so two languages that happen to translate two categories the
		// same way cannot collide).
		fieldGroups(): {
			key: string;
			name: string;
			fields: FilenameField[];
		}[] {
			const order: string[] = [];
			const grouped: Record<string, FilenameField[]> = {};
			for (const field of this.filenameFields as FilenameField[]) {
				if (!grouped[field.categoryKey]) {
					grouped[field.categoryKey] = [];
					order.push(field.categoryKey);
				}
				grouped[field.categoryKey].push(field);
			}
			return order.map((key) => ({
				key,
				name: this.$t(key),
				fields: grouped[key],
			}));
		},
		// The same sentence the title-bar tooltip uses, from the same helper, so the
		// two places that talk about updates cannot drift apart.
		updateStatus() {
			// describeUpdate phrases through the core's module-level `t`, which Vue
			// cannot observe. Touching $locale is what re-runs this computed when
			// the language changes — otherwise the line would keep the wording it
			// had when it was last invalidated for some other reason.
			void this.$locale;
			return (
				this.updateNotice ??
				describeUpdate(
					this.update,
					this.update.currentVersion,
					this.update.busy
				)
			);
		},
		// Whether the description is reporting a problem rather than describing the
		// feature, which is the only thing the warning styling keys off.
		nativeCaptureProblem() {
			return (
				!this.nativeCaptureSupported || this.nativeCaptureWarning !== null
			);
		},
		nativeCaptureDescription() {
			// Main names the specific reason. The old text here hard-coded
			// "Requires Windows 10 (1903)", which was both the wrong floor and the
			// wrong shape — the floor now comes from the machine, not this string.
			if (!this.nativeCaptureSupported) {
				return (
					this.nativeCaptureReason ||
					this.$t('settings.nativeCaptureUnavailable')
				);
			}
			if (this.nativeCaptureWarning) {
				return this.nativeCaptureWarning;
			}
			const base = this.$t('settings.nativeCaptureDescription');
			// A caveat means it works but gives something up, so it reads as an
			// addition to the description rather than replacing it.
			return this.nativeCaptureCaveat
				? `${base} ${this.nativeCaptureCaveat}`
				: base;
		},
	},
	watch: {
		// Adopt the language in THIS window immediately, then persist. The write
		// makes main re-language itself and broadcasts to every window, including
		// this one — applyLocale is idempotent, so the echo is harmless, and doing
		// it here as well means the picker never lags its own selection.
		locale(value) {
			const resolved = applyLocale(value);
			if (config.get('locale') !== resolved) {
				config.set('locale', resolved);
			}
		},
		outputFormat() {
			config.set('outputFormat', this.outputFormat);
		},
		customFilenameFormat() {
			config.set('customFilenameFormat', this.customFilenameFormat);
		},
		filenameFormat() {
			if (config.get('filenameFormat') !== this.filenameFormat) {
				config.set('filenameFormat', this.filenameFormat);
			}
		},
		screenshotFolder() {
			let folder = this.screenshotFolder;
			if (config.get('screenshotFolder') !== folder) {
				if (folder.slice(-1) !== '\\') {
					folder += '\\';
					this.screenshotFolder = folder;
				}
				config.set('screenshotFolder', folder);
			}
		},
		cropTopLeft() {
			config.set('cropTopLeft', this.cropTopLeft);
		},
		disableTooltips() {
			config.set('disableTooltips', this.disableTooltips);
		},
		reshade() {
			config.set('reshade', this.reshade);
		},
		// Turning this ON pre-flights the capture path instead of taking the user's
		// word for it. Before this check, an unsupported machine accepted the switch
		// and only revealed the problem during an actual capture — silently for
		// stills (they fall back to getUserMedia) and, for a long exposure, as a
		// "no frames to capture" error minutes into the shot, because that path has
		// no fallback at all. sendSync, so the revert lands in the same tick and the
		// switch never visibly settles in the on position.
		nativeCapture() {
			if (this.nativeCaptureReverting) {
				return;
			}
			if (!this.nativeCapture) {
				this.nativeCaptureWarning = null;
				config.set('nativeCapture', false);
				return;
			}

			let check = null;
			try {
				check = ipcRenderer.sendSync('native-capture-verify');
			} catch {
				// Query unavailable — fail open and let the capture paths' own
				// fallbacks handle it, exactly as they did before this check existed.
				check = null;
			}

			if (check && check.supported === false) {
				this.nativeCaptureSupported = false;
				this.nativeCaptureReason = check.message || null;
				this.nativeCaptureWarning = null;
				this.nativeCaptureReverting = true;
				this.nativeCapture = false;
				this.$nextTick(() => {
					this.nativeCaptureReverting = false;
				});
				config.set('nativeCapture', false);
				return;
			}

			this.nativeCaptureCaveat = check?.caveat ?? null;
			this.nativeCaptureWarning =
				check && check.verified === false
					? this.$t('settings.nativeCaptureUnverified')
					: null;
			config.set('nativeCapture', true);
		},
		manualWindowRestore() {
			config.set('manualWindowRestore', this.manualWindowRestore);
		},
		reshadeFile() {
			const file = this.reshadeFile;
			if (config.get('reshadeFile') !== file) {
				config.set('reshadeFile', file);
			}
		},
		// Persist the manual-restore geometry on edit (cq-renderer-settings-ui#1).
		// This replaces the old beforeUnmount() persistence, which never fired under
		// the v-show Oruga modal (the component stays mounted for the app lifetime),
		// silently losing ultrawide/Surround geometry on restart. config.set (not
		// ipcRenderer.send) is what index.ts reads at startup; sending here would
		// live-resize iRacing on every keystroke — that stays on Restore Now.
		screenWidth() {
			const value = parseInt(this.screenWidth, 10);
			if (value >= 1080 && value <= 10320) {
				config.set('defaultScreenWidth', value);
			}
		},
		screenHeight() {
			const value = parseInt(this.screenHeight, 10);
			if (value >= 720 && value <= 10320) {
				config.set('defaultScreenHeight', value);
			}
		},
		screenLeft() {
			if (this.screenLeft !== '') {
				config.set('defaultScreenLeft', parseInt(this.screenLeft, 10));
			}
		},
		screenTop() {
			if (this.screenTop !== '') {
				config.set('defaultScreenTop', parseInt(this.screenTop, 10));
			}
		},
	},
	created() {
		// Reflect whether the WGC native-capture path actually loaded on this
		// machine (addon present + every OS floor its session settings need).
		// Fail-open to supported if the query is unavailable for any reason.
		try {
			const support = ipcRenderer.sendSync('native-capture-support');
			this.nativeCaptureSupported = support?.supported !== false;
			this.nativeCaptureReason = support?.message ?? null;
			this.nativeCaptureCaveat = support?.caveat ?? null;
		} catch {
			this.nativeCaptureSupported = true;
			this.nativeCaptureReason = null;
			this.nativeCaptureCaveat = null;
		}

		ipcRenderer.send('request-iracing-status', '');

		ipcRenderer.on('iracing-status', (event, arg) => {
			this.iracingOpen = arg;
		});

		ipcRenderer.on('iracing-connected', () => {
			this.iracingOpen = true;
		});

		ipcRenderer.on('iracing-disconnected', () => {
			this.iracingOpen = false;
		});

		// Not removed on unmount on purpose: under the v-show Oruga modal this
		// component stays mounted for the app lifetime (see the screenWidth watcher
		// note above), so created() runs once and this is a single listener, not a
		// leak per open.
		ipcRenderer.on('update:state', (event, state) => {
			this.update = state;
			this.updateNotice = null;
		});
		ipcRenderer
			.invoke('update:state')
			.then((state) => {
				this.update = state;
			})
			.catch(() => {
				// Main not ready; the broadcast will catch us up.
			});
	},
	methods: {
		async checkForUpdates() {
			this.updateNotice = null;
			try {
				const result = await ipcRenderer.invoke('update:check');
				if (result?.state) {
					this.update = result.state;
				}
				if (result?.reason) {
					this.updateNotice = result.reason;
				}
			} catch (error) {
				this.updateNotice = this.$t('settings.updateCheckFailed', {
					message: (error as Error)?.message || String(error),
				});
			}
		},
		restoreNow() {
			const w = parseInt(this.screenWidth, 10);
			const h = parseInt(this.screenHeight, 10);
			// Live-resize iRacing now (what the button is for)…
			ipcRenderer.send('defaultScreenWidth', w);
			ipcRenderer.send('defaultScreenHeight', h);
			ipcRenderer.send('defaultScreenLeft', parseInt(this.screenLeft, 10));
			ipcRenderer.send('defaultScreenTop', parseInt(this.screenTop, 10));
			// …and persist, so a value left untouched since load (no watcher fired)
			// is still saved when Restore Now is clicked (cq-renderer-settings-ui#1).
			if (w >= 1080 && w <= 10320) {
				config.set('defaultScreenWidth', w);
			}
			if (h >= 720 && h <= 10320) {
				config.set('defaultScreenHeight', h);
			}
			if (this.screenLeft !== '') {
				config.set('defaultScreenLeft', parseInt(this.screenLeft, 10));
			}
			if (this.screenTop !== '') {
				config.set('defaultScreenTop', parseInt(this.screenTop, 10));
			}
		},
		openFolderDialog() {
			ipcRenderer
				.invoke('dialog:showOpen', {
					defaultPath: config.get('screenshotFolder'),
					properties: ['openDirectory'],
				})
				.then((result) => {
					if (!result.canceled) {
						this.screenshotFolder = result.filePaths[0];
					}
				})
				.catch((err) => {
					console.log(err);
				});
		},
		openLogsFolder() {
			const userData = ipcRenderer.sendSync('app:getPath-sync', 'userData');
			shell.openPath(path.join(userData, 'logs'));
		},
		openReshadeDialog() {
			ipcRenderer
				.invoke('dialog:showOpen', {
					defaultPath: config.get('reshadeFile'),
					properties: ['openFile'],
				})
				.then((result) => {
					if (!result.canceled) {
						this.reshadeFile = result.filePaths[0];
					}
				})
				.catch((err) => {
					console.log(err);
				});
		},
		bindScreenshotKeybind() {
			const keys = [];
			const keysReleased = [];
			this.bindingKey = true;

			const onKeyDown = (e) => {
				if (!this.bindingKey) {
					window.removeEventListener('keydown', onKeyDown);
					return;
				}

				if (!keys.includes(e.key)) {
					keys.push(e.key);
					this.screenshotKeybind = keys.join('+');
				}
			};

			const onKeyUp = (e) => {
				if (!this.bindingKey) {
					window.removeEventListener('keyup', onKeyUp);
					return;
				}

				if (!keys.includes(e.key)) {
					keys.push(e.key);
					this.screenshotKeybind = keys.join('+');
				}

				keysReleased.push(e.key);
				if (keysReleased.length === keys.length) {
					this.bindingKey = false;
					ipcRenderer.send('screenshotKeybind-change', {
						newValue: this.screenshotKeybind,
						oldValue: config.get('screenshotKeybind'),
					});
					config.set('screenshotKeybind', this.screenshotKeybind);
					window.removeEventListener('keyup', onKeyUp);
					window.removeEventListener('keydown', onKeyDown);
				}
			};

			window.addEventListener('keydown', onKeyDown);
			window.addEventListener('keyup', onKeyUp);
		},
		insertField(token) {
			this.filenameFormat = (this.filenameFormat || '') + token;
		},
	},
};
</script>

<style scoped>
hr {
	margin: 0;
	margin-top: 0.25rem;
	margin-bottom: 0.25rem;
	height: 1px;
	background-color: rgba(255, 255, 255, 0.2);
}

.description {
	font-size: 0.8rem;
	color: #aaaaaa;
}

/* The description doubles as the failure text for High-Fidelity Capture, so a
   refusal reads as one rather than as ordinary help text. */
.description--warning {
	color: #ffb86c;
}

.modal-card {
	width: 100%;
	max-width: none;
	/* Fill the host exactly. 100vh was right when this card was a full-screen
	   modal; as a page it overshot the wrapper by the title bar's height and
	   pinned a permanent 41px scrollbar on the page. */
	height: 100%;
}

.modal-card-head {
	background-color: rgba(0, 0, 0, 0.2);
	border-bottom: 0;
}

.settings-title {
	color: white;
	font-weight: 700;
}

.settings-body {
	background-color: transparent;
	padding: 0 !important;
}

.settings-layout {
	max-width: 980px;
	margin: 0 auto;
	padding: 1rem 2rem 2rem;
	display: grid;
	grid-template-columns: 160px minmax(0, 1fr);
	gap: 2.5rem;
	align-items: start;
}

.settings-meta {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	padding-top: 0.5rem;
	text-align: right;
}

.settings-meta .heading a {
	text-transform: uppercase;
	font-size: 0.75rem;
	letter-spacing: 0.05em;
}

/* A sentence, not a label — it must wrap rather than run off the aside, and it
   keeps its case (the uppercase treatment above is for the links). */
.settings-meta__update {
	text-transform: none;
	letter-spacing: normal;
	font-size: 0.7rem;
	line-height: 1.3;
	opacity: 0.75;
	white-space: normal;
	margin-top: -0.25rem;
}

.settings-form {
	min-width: 0;
}

.settings-inline-field {
	margin-bottom: 0;
}

.settings-grid {
	margin-top: 0.25rem;
	margin-bottom: 0;
}

.settings-toggle-row {
	display: flex;
	align-items: center;
	gap: 0.85rem;
}

.settings-toggle-row__text {
	display: flex;
	flex-direction: column;
	min-width: 0;
	cursor: pointer;
}

/* Light-switch styling for the in-row toggles only.
   Targets Oruga theme-bulma's rendered DOM (.switch wrapper, input.check track,
   input.check::before thumb). :deep() because <o-switch> is a child component. */
:deep(.settings-light-switch.switch) {
	position: relative;
	flex-shrink: 0;
}

:deep(.settings-light-switch .check) {
	width: 58px;
	height: 26px;
	padding: 3px;
	border-radius: 4px;
	background: hsl(0, 0%, 28%);
}

:deep(.settings-light-switch .check:before) {
	width: 24px;
	height: 20px;
	border-radius: 3px;
	background: hsl(0, 0%, 88%);
}

/* OFF / ON labels overlaid on the track. The thumb covers the inactive label,
   so the user reads the CURRENT state at a glance. */
:deep(.settings-light-switch.switch::before),
:deep(.settings-light-switch.switch::after) {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	font-size: 0.6rem;
	font-weight: 700;
	letter-spacing: 0.06em;
	pointer-events: none;
	transition: opacity 0.18s ease;
	z-index: 1;
}

/* OFF: visible by default — sits on the right half where the thumb isn't. */
:deep(.settings-light-switch.switch::after) {
	content: 'OFF';
	right: 8px;
	color: hsl(0, 0%, 75%);
	opacity: 1;
}

/* ON: hidden by default; revealed when checked (thumb has slid right). */
:deep(.settings-light-switch.switch::before) {
	content: 'ON';
	left: 8px;
	color: hsl(0, 0%, 98%);
	opacity: 0;
}

:deep(.settings-light-switch.switch:has(input.check:checked)) .check {
	background: var(--bulma-primary, #ec202a);
}

:deep(.settings-light-switch.switch:has(input.check:checked))::before {
	opacity: 1;
}

:deep(.settings-light-switch.switch:has(input.check:checked))::after {
	opacity: 0;
}

@media (max-width: 900px) {
	.settings-layout {
		grid-template-columns: 1fr;
		gap: 1.5rem;
		padding: 1rem 1.25rem 2rem;
	}

	.settings-meta {
		padding-top: 0;
	}

	.settings-action {
		width: 100%;
	}
}

@media (max-width: 640px) {
	.settings-inline-field {
		display: block;
	}

	.settings-inline-field .control {
		margin-top: 0.5rem;
	}
}
</style>
