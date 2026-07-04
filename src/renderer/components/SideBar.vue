<template>
	<div style="padding: 1rem; padding-top: 0.5rem">
		<o-field label="Resolution">
			<o-select v-model="resolution" expanded placeholder="Resolution">
				<option
					v-for="option in items"
					:key="option"
					:value="option"
					:style="optionStyle(option)"
				>
					{{ option }}
				</option>
			</o-select>
		</o-field>

		<p v-if="vramStatusText" class="sidebar-vram-status">
			<span
				class="sidebar-vram-status__dot"
				:class="'is-' + vramAssessment.tier"
			></span>
			{{ vramStatusText }}
		</p>

		<o-field v-if="resolution === 'Custom'" label="Width">
			<o-input v-model="customWidth" type="number" min="0" max="10000" />
		</o-field>

		<o-field v-if="resolution === 'Custom'" label="Height">
			<o-input v-model="customHeight" type="number" min="0" max="10000" />
		</o-field>

		<p v-if="outputDimensions" class="sidebar-target-hint">
			Output:
			<span class="sidebar-target-hint__value"
				>{{ outputDimensions.width }} × {{ outputDimensions.height }}</span
			>
			<span v-if="crop" class="sidebar-target-hint__render"
				>· renders at {{ targetDimensions.width }} ×
				{{ targetDimensions.height }}</span
			>
		</p>

		<!-- #10: exclusive-fullscreen warning. iRacing in exclusive fullscreen
		     makes any DWM-based grab come back black (DWM bypass) — this applies to
		     BOTH the desktopCapturer path and the #11 WGC native path (WGC is also a
		     DWM-composition capture and can't capture true exclusive fullscreen), so
		     the warning must show in either mode. Shown regardless of disableTooltips
		     — a hard-failure safety signal, like the VRAM banner — and only when the
		     state is attributed to iRacing (foreground). Hidden ONLY in ReShade mode:
		     ReShade captures the back buffer via injection, so it works in exclusive
		     fullscreen (no black capture). -->
		<o-notification
			v-if="exclusiveFullscreen && !reshade"
			class="sidebar-tooltip"
			variant="danger"
			aria-close-label="Close message"
			size="small"
			style="
				background-color: rgba(0, 0, 0, 0.3) !important;
				margin-top: 0.5rem;
				margin-bottom: 0.5rem;
			"
		>
			iRacing is in <strong>exclusive fullscreen</strong> — screenshots will
			capture black. In iRacing set <strong>Display &gt; Full Screen</strong>
			to OFF (Borderless or Windowed) to enable capture.
		</o-notification>

		<!-- Live, measurement-driven VRAM warning. Shown regardless of
		     disableTooltips: unlike the informational tips this is a safety
		     signal that a capture may OOM-crash iRacing, and it also fires on the
		     hotkey path where the user never opens the sidebar. -->
		<o-notification
			v-if="showDynamicVramWarning"
			class="sidebar-tooltip"
			:variant="vramAssessment.tier === 'risk' ? 'danger' : 'warning'"
			aria-close-label="Close message"
			size="small"
			style="
				background-color: rgba(0, 0, 0, 0.3) !important;
				margin-top: 0.5rem;
				margin-bottom: 0.5rem;
			"
		>
			<template v-if="vramAssessment.tier === 'risk'">
				{{ resolution }} needs about
				{{ formatVram(vramAssessment.deltaBytes) }} more VRAM but only
				{{ formatVram(vramAssessment.freeBytes) }} is free — iRacing will
				likely run out of memory and crash.
			</template>
			<template v-else>
				{{ resolution }} leaves little VRAM headroom ({{
					formatVram(vramAssessment.freeBytes)
				}}
				free) and may crash on heavy track/car combinations.
			</template>
			<a
				v-if="safeResolutionLabel && safeResolutionLabel !== resolution"
				class="sidebar-vram-switch"
				@click="applySafeResolution"
			>
				Switch to {{ safeResolutionLabel }}
			</a>
		</o-notification>

		<!-- Static fallback tip: only when we CANNOT measure VRAM (tier unknown),
		     so the dynamic warning above never double-fires with it. -->
		<o-notification
			v-if="showStaticVramWarning"
			class="sidebar-tooltip"
			variant="warning"
			aria-close-label="Close message"
			size="small"
			style="
				background-color: rgba(0, 0, 0, 0.3) !important;
				margin-top: 0.5rem;
				margin-bottom: 0.5rem;
			"
		>
			High resolutions may crash iRacing if you run out of VRAM. Certain
			track/car combinations will require more VRAM
		</o-notification>

		<o-field class="settings-toggle-row sidebar-toggle-row">
			<o-switch
				id="sidebar-crop-watermark-switch"
				v-model="crop"
				:rounded="false"
				class="settings-light-switch"
			/>
			<!-- Label is a real <label for="…"> bound to the switch's input id so
			     clicking anywhere on the text toggles the switch (matches the
			     pre-3.0.0 Buefy slot-based affordance). Without this, only the
			     58×26 switch graphic was clickable and users hitting the label
			     got no response — the silent regression that shipped with v3.0.0
			     (commit 5419d2c restructured slot text to a sibling div). -->
			<label
				for="sidebar-crop-watermark-switch"
				class="settings-toggle-row__text"
			>
				<span class="label" style="margin-bottom: 0px">Crop Watermark</span>
			</label>
		</o-field>

		<o-notification
			v-if="crop && !disableTooltips"
			class="sidebar-tooltip"
			variant="info"
			aria-close-label="Close message"
			size="small"
			style="
				background-color: rgba(0, 0, 0, 0.3) !important;
				margin-top: 0.5rem;
				margin-bottom: 0.5rem;
			"
		>
			With this option, the final picture is slightly zoomed in. Regions near
			the borders of the screen will be cut off.
		</o-notification>

		<o-field class="settings-toggle-row sidebar-toggle-row">
			<o-switch
				id="sidebar-keep-aspect-ratio-switch"
				v-model="keepAspectRatio"
				:rounded="false"
				class="settings-light-switch"
			/>
			<label
				for="sidebar-keep-aspect-ratio-switch"
				class="settings-toggle-row__text"
			>
				<span class="label" style="margin-bottom: 0px"
					>Keep Aspect Ratio</span
				>
			</label>
		</o-field>

		<o-notification
			v-if="keepAspectRatio && !disableTooltips"
			class="sidebar-tooltip"
			variant="info"
			aria-close-label="Close message"
			size="small"
			style="
				background-color: rgba(0, 0, 0, 0.3) !important;
				margin-top: 0.5rem;
				margin-bottom: 0.5rem;
			"
		>
			The screenshot height is adjusted so the final image matches your
			monitor's aspect ratio (e.g. 21:9 ultrawide), instead of the default
			16:9. The selected resolution sets the width.
		</o-notification>

		<o-button
			variant="primary"
			icon-left="camera"
			expanded
			:loading="takingScreenshot"
			:disabled="!iracingOpen || takingScreenshot"
			style="margin-top: 0.5rem"
			@click="takeScreenshot"
		>
			Screenshot
		</o-button>

		<o-notification
			v-for="(warning, index) in configWarnings"
			:key="'cw-' + index"
			class="sidebar-tooltip"
			variant="warning"
			aria-close-label="Close message"
			size="small"
			style="
				background-color: rgba(0, 0, 0, 0.3) !important;
				margin-top: 0.5rem;
				margin-bottom: 0.5rem;
			"
		>
			{{ warning }}
		</o-notification>

		<o-notification
			v-if="reshade && !disableTooltips"
			class="sidebar-tooltip"
			variant="danger"
			aria-close-label="Close message"
			size="small"
			style="
				background-color: rgba(0, 0, 0, 0.3) !important;
				margin-top: 0.5rem;
				margin-bottom: 0.5rem;
			"
		>
			After pressing the screenshot button in the iRacing Screenshot Tool,
			you will need to press the keybind for taking a screenshot for ReShade
		</o-notification>
	</div>
</template>

<script lang="ts">
import { defineComponent, h } from 'vue';
import config from '../../utilities/config';
import { checkIracingConfig } from '../../utilities/iracing-config-checks';
import {
	assessVram,
	largestSafeResolution,
	formatVramGiB,
} from '../../utilities/vram-prediction';
import { useOruga } from '@oruga-ui/oruga-next';
const { ipcRenderer } = require('electron');
const fs = require('fs');

// How often to re-poll live GPU VRAM from main (koffi FFI). Cheap; keeps the
// headroom colouring fresh as iRacing loads liveries/tracks.
const VRAM_POLL_INTERVAL_MS = 4000;

// How often to re-poll iRacing connection status until it is first detected.
// Closes a startup race: the poll bridge can emit its single 'Connected' event
// before this renderer's IPC listeners exist, and the one-shot status query can
// reply false while telemetry is still populating — either miss would otherwise
// leave the capture button disabled until the app (or iRacing) is restarted. The
// poll stops the moment iRacing is detected; steady-state connect/disconnect is
// driven by the events.
const IRACING_STATUS_POLL_INTERVAL_MS = 1500;

// Quantise live VRAM usage to the sidebar's display precision (0.1 GB) before
// storing it. usedBytes is a raw, constantly-jittering system-wide gauge; without
// this, every poll would land in a new value, reassign vramInfo, and re-render —
// even while idle. Rounding to the shown precision means the reactive graph only
// re-evaluates when a user-visible number actually changes.
const VRAM_USAGE_QUANTUM_BYTES = 0.1 * 1024 ** 3;

// Oruga 0.13's notification `message` prop is plain string only — HTML is
// rendered as text. Use the `component` prop to inject rich content instead.
const ScreenshotErrorContent = defineComponent({
	name: 'ScreenshotErrorContent',
	props: {
		message: { type: String, required: true },
		logFile: { type: String, default: '' },
	},
	setup(props) {
		return () =>
			h('div', null, [
				h('div', null, props.message),
				props.logFile
					? h(
							'div',
							{
								class: 'screenshot-error-log',
							},
							['Log: ', h('code', null, props.logFile)]
						)
					: null,
			]);
	},
});

function getResolutionDimensions(label: string): {
	width: number;
	height: number;
} {
	switch (label) {
		case '1080p':
			return { width: 1920, height: 1080 };
		case '2k':
			return { width: 2560, height: 1440 };
		case '4k':
			return { width: 3840, height: 2160 };
		case '5k':
			return { width: 5120, height: 2880 };
		case '6k':
			return { width: 6400, height: 3600 };
		case '7k':
			return { width: 7168, height: 4032 };
		case '8k':
			return { width: 7680, height: 4320 };
		default:
			return { width: 1920, height: 1080 };
	}
}

export default {
	// Declare 'screenshot' as a custom emit. Previously used 'click', which in
	// Vue 3 is treated as a NATIVE DOM event unless explicitly declared —
	// native clicks from child elements (e.g. <o-select> dropdown) bubbled
	// through SideBar's root and fired the parent's @click with a MouseEvent
	// instead of the width/height payload, producing `undefined` in the main-
	// process PowerShell SetWindowPos call.
	emits: ['screenshot'],
	data() {
		return {
			items: ['1080p', '2k', '4k', '5k', '6k', '7k', '8k', 'Custom'],
			resolution: '1080p',
			crop: true,
			keepAspectRatio: false,
			customWidth: '0',
			customHeight: '0',
			iracingOpen: false,
			takingScreenshot: false,
			disableTooltips: config.get('disableTooltips'),
			reshade: config.get('reshade'),
			cropTopLeft: config.get('cropTopLeft'),
			configWarnings: checkIracingConfig(),
			// Live GPU VRAM from main (null until first poll / unavailable).
			vramInfo: null,
			vramTimer: null,
			// Startup connection-detection poll; cleared once iRacing is first
			// detected (see handleIracingConnected) or on unmount.
			iracingStatusTimer: null,
			// #10: true when iRacing is in exclusive fullscreen (capture → black).
			exclusiveFullscreen: false,
		};
	},
	computed: {
		// {width, height} for the active resolution preset, or null when
		// Custom is selected with empty/invalid inputs (so we suppress the
		// hint instead of rendering "NaN x NaN").
		baseTargetDimensions() {
			if (this.resolution === 'Custom') {
				const w = parseInt(this.customWidth, 10);
				const h = parseInt(this.customHeight, 10);
				if (
					!Number.isFinite(w) ||
					!Number.isFinite(h) ||
					w <= 0 ||
					h <= 0
				) {
					return null;
				}
				return { width: w, height: h };
			}
			return getResolutionDimensions(this.resolution);
		},
		// Final user-facing target. When Keep Aspect Ratio is on and the
		// stored screen dimensions look valid, scale height to match the
		// native aspect ratio while preserving the chosen width. Falls back
		// to the base preset if the screen is unknown or already matches.
		targetDimensions() {
			const base = this.baseTargetDimensions;
			if (!base) return null;
			return this.applyAspectRatio(base);
		},
		// Dimensions of the SAVED image. iRacing renders at targetDimensions
		// (the selected resolution); when Crop Watermark is on, the watermark is
		// cropped off so the file ends up slightly smaller. Mirrors the crop math
		// in takeScreenshot so the hint matches what is actually written to disk.
		outputDimensions() {
			const base = this.targetDimensions;
			if (!base) return null;
			if (!this.crop) return base;
			const factor = this.cropTopLeft ? 0.03 : 0.06;
			return {
				width: base.width - Math.ceil(base.width * factor),
				height: base.height - Math.ceil(base.height * factor),
			};
		},
		// Preset resolutions (excluding Custom) with the SAME aspect-adjusted
		// {width,height} the banner and capture use, for per-option VRAM colouring
		// and the safe-resolution picker — so all four assess identical pixels.
		presetList() {
			return this.items
				.filter((label) => label !== 'Custom')
				.map((label) => ({
					label,
					dimensions: this.applyAspectRatio(
						getResolutionDimensions(label)
					),
				}));
		},
		// iRacing's current window size (physical px) is the delta baseline; null
		// when unknown/iRacing closed → the predictor assumes no growth.
		baselineDims() {
			const cw = this.vramInfo && this.vramInfo.currentWindow;
			return cw && cw.width > 0 && cw.height > 0 ? cw : null;
		},
		// VRAM assessment for the currently selected resolution.
		vramAssessment() {
			return assessVram(
				this.vramInfo,
				this.targetDimensions || { width: 0, height: 0 },
				this.baselineDims
			);
		},
		// Largest preset that still assesses 'safe' (for the one-click suggestion).
		safeResolutionLabel() {
			const safe = largestSafeResolution(
				this.presetList,
				this.vramInfo,
				this.baselineDims
			);
			return safe ? safe.label : null;
		},
		// "NVIDIA … : 18.6 GB free of 22.5 GB" — shown when a real reading exists.
		vramStatusText() {
			const info = this.vramInfo;
			if (
				!info ||
				!(info.totalBytes > 0) ||
				info.usedBytes == null ||
				this.vramAssessment.freeBytes == null
			) {
				return '';
			}
			const name = info.adapterName ? `${info.adapterName}: ` : '';
			return `${name}${formatVramGiB(
				this.vramAssessment.freeBytes
			)} free of ${formatVramGiB(info.totalBytes)}`;
		},
		// Dynamic VRAM warning replaces the static one whenever we can predict.
		showDynamicVramWarning() {
			const tier = this.vramAssessment.tier;
			return tier === 'caution' || tier === 'risk';
		},
		// Static "high-res may crash" note only when we CANNOT predict (fail-open).
		showStaticVramWarning() {
			return (
				this.vramAssessment.tier === 'unknown' &&
				(this.resolution === '4k' ||
					this.resolution === '5k' ||
					this.resolution === '6k' ||
					this.resolution === '7k' ||
					this.resolution === '8k') &&
				!this.disableTooltips
			);
		},
	},
	created() {
		ipcRenderer.send('request-iracing-status', '');

		// Self-healing startup poll. The one-shot query above and the single
		// 'Connected' event can BOTH be missed at startup: the poll bridge emits
		// Connected before these listeners are attached (and before the window /
		// renderer exist), and the one-shot query can reply false while telemetry
		// is still populating. With no retry, iracingOpen would stay false and the
		// capture button disabled until a restart. Re-poll until iRacing is first
		// detected, then stop (handleIracingConnected) and let the connect /
		// disconnect events drive steady state.
		this.iracingStatusTimer = setInterval(() => {
			ipcRenderer.send('request-iracing-status', '');
		}, IRACING_STATUS_POLL_INTERVAL_MS);

		ipcRenderer.on('hotkey-screenshot', (event, arg) => {
			if (this.iracingOpen && !this.takingScreenshot) {
				this.takeScreenshot();
			}
		});

		ipcRenderer.on('iracing-status', (event, arg) => {
			if (arg) {
				this.handleIracingConnected();
			} else {
				this.iracingOpen = false;
			}
		});

		ipcRenderer.on('iracing-connected', (event, arg) => {
			this.handleIracingConnected();
		});

		ipcRenderer.on('iracing-disconnected', (event, arg) => {
			this.iracingOpen = false;
			// Clear the fullscreen warning at once — iRacing is gone, so any
			// "exclusive fullscreen" banner is now stale (don't wait for the poll).
			this.exclusiveFullscreen = false;
		});

		ipcRenderer.on('screenshot-response', (event, arg) => {
			this.restoreCursorAfterCapture();
			// Always clear the capture latch on a completion reply. If we only
			// cleared it inside the fs.existsSync() branch, a 'saved' response
			// whose file can't be found (moved/renamed/AV-quarantined between the
			// write and this check) would leave takingScreenshot stuck true and
			// the capture button permanently disabled. File existence only gates
			// the success toast, never the latch.
			this.takingScreenshot = false;
			if (fs.existsSync(arg)) {
				const file = arg
					.split(/[\\/]/)
					.pop()
					.split('.')
					.slice(0, -1)
					.join('.');
				// Oruga 0.13: programmatic interfaces live on `_programmatic`,
				// not directly on the Oruga instance. useOruga() returns the
				// _programmatic map, so useOruga().notification === $oruga._programmatic.notification.
				useOruga().notification.open({
					message: file + ' saved successfully',
					variant: 'success',
				});
			}
		});

		ipcRenderer.on('screenshot-error', (event, arg) => {
			this.restoreCursorAfterCapture();
			this.takingScreenshot = false;
			const error = this.normalizeScreenshotError(arg);
			useOruga().notification.open({
				component: ScreenshotErrorContent,
				props: {
					message: `Screenshot failed: ${error.message}`,
					logFile: error.logFile,
				},
				variant: 'danger',
				duration: 10000,
				queue: false,
			});
			ipcRenderer.send('request-iracing-status', '');
		});

		config.onDidChange('disableTooltips', (newValue, oldValue) => {
			this.disableTooltips = newValue;
		});

		config.onDidChange('reshade', (newValue, oldValue) => {
			this.reshade = newValue;
		});

		config.onDidChange('cropTopLeft', (newValue) => {
			this.cropTopLeft = newValue;
		});
	},
	mounted() {
		this.crop = config.get('crop');
		this.keepAspectRatio = config.get('keepAspectRatio');
		this.customWidth = config.get('customWidth');
		this.customHeight = config.get('customHeight');
		this.resolution = config.get('resolution');
		this.reshade = config.get('reshade');
		// Start polling: one immediate read plus a light interval so the VRAM
		// colouring tracks liveries/track loads and the exclusive-fullscreen
		// warning stays current. Both share one timer, cleared on unmount.
		this.refreshVramInfo();
		this.refreshFullscreenState();
		this.vramTimer = setInterval(() => {
			this.refreshVramInfo();
			this.refreshFullscreenState();
		}, VRAM_POLL_INTERVAL_MS);
	},
	beforeUnmount() {
		if (this.vramTimer) {
			clearInterval(this.vramTimer);
			this.vramTimer = null;
		}
		this.stopIracingStatusPoll();
	},
	// Persist each config-backed field only when IT actually changes
	// (cq-renderer-settings-ui#2). The old updated() hook re-ran all six blocking
	// sendSync 'config:set' writes on EVERY reactive change (VRAM poll,
	// takingScreenshot latch, notifications) — a write storm on idle re-renders.
	// The config.get(...)!==value guard also stops mounted()'s config→field copy
	// and the reshade onDidChange round-trip from writing the same value back.
	watch: {
		crop(value) {
			if (config.get('crop') !== value) {
				config.set('crop', value);
			}
		},
		keepAspectRatio(value) {
			if (config.get('keepAspectRatio') !== value) {
				config.set('keepAspectRatio', value);
			}
		},
		reshade(value) {
			if (config.get('reshade') !== value) {
				config.set('reshade', value);
			}
		},
		resolution(value) {
			if (config.get('resolution') !== value) {
				config.set('resolution', value);
			}
		},
		customWidth(value) {
			const n = parseInt(value);
			if (!isNaN(n) && config.get('customWidth') !== n) {
				config.set('customWidth', n);
			}
		},
		customHeight(value) {
			const n = parseInt(value);
			if (!isNaN(n) && config.get('customHeight') !== n) {
				config.set('customHeight', n);
			}
		},
	},
	methods: {
		// Mark iRacing connected and fire the one-time on-connect refreshes.
		// Called from the 'iracing-connected' event AND the self-healing status
		// poll, so a connection recovered after a missed event still primes the
		// VRAM baseline and the exclusive-fullscreen warning. Idempotent: the
		// refreshes only fire on the false→true edge, and the startup poll is
		// stopped once we've latched on.
		handleIracingConnected() {
			const wasOpen = this.iracingOpen;
			this.iracingOpen = true;
			this.stopIracingStatusPoll();
			if (!wasOpen) {
				// iRacing's window now exists → refresh immediately so its current
				// size becomes the delta baseline for the prediction, and so the
				// exclusive-fullscreen warning reflects the freshly-connected sim.
				this.refreshVramInfo();
				this.refreshFullscreenState();
			}
		},
		stopIracingStatusPoll() {
			if (this.iracingStatusTimer) {
				clearInterval(this.iracingStatusTimer);
				this.iracingStatusTimer = null;
			}
		},
		normalizeScreenshotError(payload) {
			if (
				payload &&
				typeof payload === 'object' &&
				!Array.isArray(payload)
			) {
				return {
					message: payload.message || 'Unknown screenshot error',
					logFile: payload.logFile || '',
				};
			}

			return {
				message: String(payload || 'Unknown screenshot error'),
				logFile: '',
			};
		},
		hideCursorDuringCapture() {
			document.body.style.cursor = 'none';
		},
		restoreCursorAfterCapture() {
			document.body.style.cursor = 'auto';
		},
		// Apply the Keep Aspect Ratio height adjustment to a base {width,height}.
		// Off (or unknown screen size) → returned unchanged. Shared by
		// targetDimensions (selected resolution / capture) AND the per-option
		// colouring + safe-resolution picker, so the option colours, the safe
		// suggestion, the warning banner, and the actual capture all assess the
		// same pixel count. Without this, on a non-16:9 monitor an option's colour
		// could contradict its own banner and "switch to safe" could land on a
		// warned resolution.
		applyAspectRatio(base) {
			if (!base) return base;
			if (!this.keepAspectRatio) return base;
			const sw = parseInt(config.get('defaultScreenWidth'), 10);
			const sh = parseInt(config.get('defaultScreenHeight'), 10);
			if (!sw || !sh) return base;
			const adjustedHeight = Math.round((base.width * sh) / sw);
			if (!Number.isFinite(adjustedHeight) || adjustedHeight <= 0) {
				return base;
			}
			return { width: base.width, height: adjustedHeight };
		},
		// Pull the latest VRAM reading from main (koffi FFI). Best-effort: on
		// error we keep the previous reading so a transient failure doesn't wipe
		// the colouring (and assessVram already fails open on a null reading).
		// Each IPC call returns a fresh object, so we quantise the jittery usage
		// and only reassign when a UI-relevant field changed — otherwise the poll
		// would re-render every tick.
		refreshVramInfo() {
			ipcRenderer
				.invoke('get-vram-info')
				.then((info) => {
					const next = this.quantizeVramReading(info);
					if (!this.vramSignatureChanged(next)) return;
					this.vramInfo = next;
				})
				.catch(() => {
					/* keep last reading */
				});
		},
		// Round the live usage to the displayed 0.1 GB precision so sub-bucket
		// jitter doesn't churn the reactive graph (see VRAM_USAGE_QUANTUM_BYTES).
		quantizeVramReading(info) {
			if (!info || info.usedBytes == null) {
				return info || null;
			}
			return {
				...info,
				usedBytes:
					Math.round(info.usedBytes / VRAM_USAGE_QUANTUM_BYTES) *
					VRAM_USAGE_QUANTUM_BYTES,
			};
		},
		// Poll iRacing's exclusive-fullscreen state (koffi, main-side). Only
		// reassign when the warning boolean flips so — like the VRAM poll — a
		// steady state doesn't re-render needlessly.
		refreshFullscreenState() {
			ipcRenderer
				.invoke('get-iracing-fullscreen-state')
				.then((state) => {
					const next = !!(state && state.exclusiveFullscreen);
					if (next !== this.exclusiveFullscreen) {
						this.exclusiveFullscreen = next;
					}
				})
				.catch(() => {
					/* keep last value */
				});
		},
		// True when the incoming reading differs from the current one in any field
		// that affects the sidebar (total/used/source/adapter/window baseline).
		vramSignatureChanged(next) {
			const prev = this.vramInfo;
			if (!prev || !next) return prev !== next;
			const pw = prev.currentWindow || {};
			const nw = next.currentWindow || {};
			return (
				prev.totalBytes !== next.totalBytes ||
				prev.usedBytes !== next.usedBytes ||
				prev.source !== next.source ||
				prev.adapterName !== next.adapterName ||
				pw.width !== nw.width ||
				pw.height !== nw.height
			);
		},
		// Predicted headroom tier for a preset label (Custom is never coloured).
		// Uses the aspect-adjusted dimensions so an option's colour matches the
		// warning banner it would produce once selected.
		optionTier(label) {
			if (label === 'Custom') return 'unknown';
			return assessVram(
				this.vramInfo,
				this.applyAspectRatio(getResolutionDimensions(label)),
				this.baselineDims
			).tier;
		},
		// Inline colour for a resolution <option>. Chromium honours `color` on
		// <option>; caution=amber, risk=red, safe/unknown keep the default.
		optionStyle(label) {
			const tier = this.optionTier(label);
			if (tier === 'caution') return { color: '#ffdd57' };
			if (tier === 'risk') return { color: '#ff6b6b' };
			return {};
		},
		// One-click fix: jump to the largest preset that still assesses safe.
		applySafeResolution() {
			if (this.safeResolutionLabel) {
				this.resolution = this.safeResolutionLabel;
			}
		},
		// Template helper (imported fns aren't accessible in the template scope).
		formatVram(bytes) {
			return formatVramGiB(bytes);
		},
		takeScreenshot() {
			// targetDimensions already accounts for Keep Aspect Ratio when on,
			// or returns the preset/custom values as-is. Fall back to 1080p if
			// Custom is selected with empty inputs (matches the legacy default
			// branch in the previous switch-based implementation).
			const target = this.targetDimensions || { width: 1920, height: 1080 };

			// iRacing's window is resized to EXACTLY the selected resolution —
			// never larger — so its DX11 framebuffer/VRAM cost is bounded by the
			// chosen resolution. The watermark is removed by cropping INWARD from
			// the captured frame (targetWidth/targetHeight below), so the saved
			// image ends up slightly smaller than the nominal resolution. The old
			// approach expanded the window 6%/3% and cropped back to the full
			// nominal size, forcing iRacing to render ~12% more pixels at exactly
			// the high resolutions where it OOM-crashes.
			const w = target.width;
			const h = target.height;

			// Crop output = render size minus the watermark margin. Worker.vue
			// extracts a (targetWidth x targetHeight) region from the w x h frame.
			let targetWidth = w;
			let targetHeight = h;

			const cropTopLeft = config.get('cropTopLeft');
			if (this.crop && cropTopLeft) {
				// Legacy: crop 3% off the bottom-right corner to remove the watermark
				targetWidth = w - Math.ceil(w * 0.03);
				targetHeight = h - Math.ceil(h * 0.03);
			} else if (this.crop) {
				// Default: crop 3% from each side (6% total) to remove the watermark
				targetWidth = w - Math.ceil(w * 0.06);
				targetHeight = h - Math.ceil(h * 0.06);
			}
			this.takingScreenshot = true;
			this.$emit('screenshot', {
				width: w,
				height: h,
				targetWidth,
				targetHeight,
				crop: this.crop,
				cropTopLeft,
			});
			this.hideCursorDuringCapture();
		},
	},
};
</script>

<style>
.control-label {
	font-weight: 700;
}

.sidebar-target-hint {
	margin-top: 0.25rem;
	margin-bottom: 0.25rem;
	font-size: 0.78rem;
	line-height: 1.25;
	color: rgba(255, 255, 255, 0.65);
}

.sidebar-target-hint__value {
	color: rgba(255, 255, 255, 0.9);
	font-weight: 600;
	font-variant-numeric: tabular-nums;
}

.sidebar-target-hint__render {
	color: rgba(255, 255, 255, 0.45);
	font-variant-numeric: tabular-nums;
}

.sidebar-vram-status {
	display: flex;
	align-items: center;
	margin-top: 0.25rem;
	margin-bottom: 0.25rem;
	font-size: 0.72rem;
	line-height: 1.25;
	color: rgba(255, 255, 255, 0.6);
	font-variant-numeric: tabular-nums;
}

.sidebar-vram-status__dot {
	display: inline-block;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	margin-right: 0.4rem;
	flex-shrink: 0;
	background: rgba(255, 255, 255, 0.4);
}

.sidebar-vram-status__dot.is-safe {
	background: #48c78e;
}

.sidebar-vram-status__dot.is-caution {
	background: #ffdd57;
}

.sidebar-vram-status__dot.is-risk {
	background: #ff6b6b;
}

.sidebar-vram-switch {
	display: inline-block;
	margin-left: 0.35rem;
	font-weight: 700;
	text-decoration: underline;
	cursor: pointer;
	color: inherit;
}

/* Sidebar tooltip notifications. Namespaced via .sidebar-tooltip so global
   Oruga toasts fired from useOruga().notification.open() (screenshot saved /
   error) keep their default Bulma 1.0 look. The legacy .message.is-warning
   selectors are gone — Oruga 0.13 + Bulma 1.0 renders .notification > .media
   > .media-content, not .message > .message-body. */

.sidebar-tooltip.notification {
	padding: 0.6rem 0.85rem;
	font-size: 0.78rem;
	line-height: 1.25;
	font-weight: 400;
}

.sidebar-tooltip.notification .media {
	align-items: flex-start;
}

.sidebar-tooltip.notification .media-content {
	font-weight: 400;
	line-height: 1.25;
}

.sidebar-tooltip.notification.is-warning .media-content {
	color: #ffdd57;
}

.sidebar-tooltip.notification.is-info .media-content {
	color: rgb(50, 152, 220);
}

.sidebar-tooltip.notification.is-danger .media-content {
	color: #ff6b6b;
}

.screenshot-error-log {
	margin-top: 0.35rem;
	font-size: 0.85em;
	opacity: 0.85;
	word-break: break-all;
}

.screenshot-error-log code {
	background: rgba(0, 0, 0, 0.18);
	padding: 0 0.25em;
	border-radius: 3px;
	font-size: 0.95em;
}

/* Crop Watermark toggle — same light-switch + inline-left layout as the toggles
   in SettingsModal.vue. SettingsModal's rules are scoped + :deep() so they
   don't reach here; rules are duplicated globally below. Candidate for future
   consolidation into a shared partial. */
.settings-toggle-row {
	display: flex;
	align-items: center;
	gap: 0.85rem;
}

.sidebar-toggle-row {
	padding: 0.5rem 0;
}

.settings-toggle-row__text {
	display: flex;
	flex-direction: column;
	min-width: 0;
	/* The text block is a <label for="…"> wrapping the switch's input id so
	   clicks anywhere on it toggle the switch. cursor: pointer signals that
	   affordance to users (matches the affordance Buefy's slot-based switch
	   provided pre-3.0.0). */
	cursor: pointer;
}

.settings-light-switch.switch {
	position: relative;
	flex-shrink: 0;
}

.settings-light-switch .check {
	width: 58px;
	height: 26px;
	padding: 3px;
	border-radius: 4px;
	background: hsl(0, 0%, 28%);
}

.settings-light-switch .check:before {
	width: 24px;
	height: 20px;
	border-radius: 3px;
	background: hsl(0, 0%, 88%);
}

.settings-light-switch.switch::before,
.settings-light-switch.switch::after {
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

.settings-light-switch.switch::after {
	content: 'OFF';
	right: 8px;
	color: hsl(0, 0%, 75%);
	opacity: 1;
}

.settings-light-switch.switch::before {
	content: 'ON';
	left: 8px;
	color: hsl(0, 0%, 98%);
	opacity: 0;
}

.settings-light-switch.switch:has(input.check:checked) .check {
	background: var(--bulma-primary, #ec202a);
}

.settings-light-switch.switch:has(input.check:checked)::before {
	opacity: 1;
}

.settings-light-switch.switch:has(input.check:checked)::after {
	opacity: 0;
}
</style>
