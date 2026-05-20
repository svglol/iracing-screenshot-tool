<template>
	<div style="padding: 1rem; padding-top: 0.5rem">
		<o-field label="Resolution">
			<o-select v-model="resolution" expanded placeholder="Resolution">
				<option v-for="option in items" :key="option" :value="option">
					{{ option }}
				</option>
			</o-select>
		</o-field>

		<o-field v-if="resolution === 'Custom'" label="Width">
			<o-input v-model="customWidth" type="number" min="0" max="10000" />
		</o-field>

		<o-field v-if="resolution === 'Custom'" label="Height">
			<o-input v-model="customHeight" type="number" min="0" max="10000" />
		</o-field>

		<p v-if="targetDimensions" class="sidebar-target-hint">
			Target:
			<span class="sidebar-target-hint__value"
				>{{ targetDimensions.width }} ×
				{{ targetDimensions.height }}</span
			>
		</p>

		<o-notification
			v-if="
				(resolution == '4k' ||
					resolution == '5k' ||
					resolution == '6k' ||
					resolution == '7k' ||
					resolution == '8k') &&
				!disableTooltips
			"
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
			With this option, the final picture is slightly zoomed in. Regions
			near the borders of the screen will be cut off.
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
			After pressing the screenshot button in the iRacing Screenshot
			Tool, you will need to press the keybind for taking a screenshot for
			ReShade
		</o-notification>
	</div>
</template>

<script lang="ts">
import { defineComponent, h } from 'vue';
import config from '../../utilities/config';
import { checkIracingConfig } from '../../utilities/iracing-config-checks';
import { useOruga } from '@oruga-ui/oruga-next';
const { ipcRenderer } = require('electron');
const fs = require('fs');

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

function getResolutionDimensions(label: string): { width: number; height: number } {
	switch (label) {
		case '1080p': return { width: 1920, height: 1080 };
		case '2k': return { width: 2560, height: 1440 };
		case '4k': return { width: 3840, height: 2160 };
		case '5k': return { width: 5120, height: 2880 };
		case '6k': return { width: 6400, height: 3600 };
		case '7k': return { width: 7168, height: 4032 };
		case '8k': return { width: 7680, height: 4320 };
		default: return { width: 1920, height: 1080 };
	}
}

export default {
	props: ['screenshot'],
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
			configWarnings: checkIracingConfig(),
		};
	},
	computed: {
		disabled() {
			return this.iracingOpen;
		},
		// {width, height} for the active resolution preset, or null when
		// Custom is selected with empty/invalid inputs (so we suppress the
		// hint instead of rendering "NaN x NaN").
		baseTargetDimensions() {
			if (this.resolution === 'Custom') {
				const w = parseInt(this.customWidth, 10);
				const h = parseInt(this.customHeight, 10);
				if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
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
	},
	created() {
		ipcRenderer.send('request-iracing-status', '');

		ipcRenderer.on('hotkey-screenshot', (event, arg) => {
			if (this.iracingOpen && !this.takingScreenshot) {
				this.takeScreenshot();
			}
		});

		ipcRenderer.on('iracing-status', (event, arg) => {
			this.iracingOpen = arg;
		});

		ipcRenderer.on('iracing-connected', (event, arg) => {
			this.iracingOpen = true;
		});

		ipcRenderer.on('iracing-disconnected', (event, arg) => {
			this.iracingOpen = false;
		});

		ipcRenderer.on('screenshot-response', (event, arg) => {
			this.restoreCursorAfterCapture();
			if (fs.existsSync(arg)) {
				this.takingScreenshot = false;
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
	},
	mounted() {
		this.crop = config.get('crop');
		this.keepAspectRatio = config.get('keepAspectRatio');
		this.customWidth = config.get('customWidth');
		this.customHeight = config.get('customHeight');
		this.resolution = config.get('resolution');
		this.reshade = config.get('reshade');
	},
	updated() {
		config.set('crop', this.crop);
		config.set('keepAspectRatio', this.keepAspectRatio);
		config.set('reshade', this.reshade);
		if (!isNaN(parseInt(this.customWidth))) {
			config.set('customWidth', parseInt(this.customWidth));
		}
		if (!isNaN(parseInt(this.customHeight))) {
			config.set('customHeight', parseInt(this.customHeight));
		}
		config.set('resolution', this.resolution);
	},
	methods: {
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
		takeScreenshot() {
			// targetDimensions already accounts for Keep Aspect Ratio when on,
			// or returns the preset/custom values as-is. Fall back to 1080p if
			// Custom is selected with empty inputs (matches the legacy default
			// branch in the previous switch-based implementation).
			const target = this.targetDimensions || { width: 1920, height: 1080 };
			let w = target.width;
			let h = target.height;

			const targetWidth = w;
			const targetHeight = h;

			const cropTopLeft = config.get('cropTopLeft');
			if (this.crop && cropTopLeft) {
				// Legacy: expand 3% so cropping bottom-right removes watermark
				w += Math.ceil(w * 0.03);
				h += Math.ceil(h * 0.03);
			} else if (this.crop) {
				// Default: expand 6% so cropping 3% from each side removes watermark
				w += Math.ceil(w * 0.06);
				h += Math.ceil(h * 0.06);
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
