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
import config from '../../utilities/config';
import { checkIracingConfig } from '../../utilities/iracing-config-checks';
import { useOruga } from '@oruga-ui/oruga-next';
const { ipcRenderer } = require('electron');
const fs = require('fs');

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
			const escapedMessage = this.escapeHtml(error.message);
			const escapedLogFile = this.escapeHtml(error.logFile);
			const logHint = escapedLogFile
				? `<br><small>Log: ${escapedLogFile}</small>`
				: '';
			useOruga().notification.open({
				message: `Screenshot failed: ${escapedMessage}${logHint}`,
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
		this.customWidth = config.get('customWidth');
		this.customHeight = config.get('customHeight');
		this.resolution = config.get('resolution');
		this.reshade = config.get('reshade');
	},
	updated() {
		config.set('crop', this.crop);
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
		escapeHtml(value) {
			return String(value || '')
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;');
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
		takeScreenshot() {
			let w = 0;
			let h = 0;

			switch (this.resolution) {
				case '1080p':
					w = 1920;
					h = 1080;
					break;
				case '2k':
					w = 2560;
					h = 1440;
					break;
				case '4k':
					w = 3840;
					h = 2160;
					break;
				case '5k':
					w = 5120;
					h = 2880;
					break;
				case '6k':
					w = 6400;
					h = 3600;
					break;
				case '7k':
					w = 7168;
					h = 4032;
					break;
				case '8k':
					w = 7680;
					h = 4320;
					break;
				case 'Custom':
					w = parseInt(this.customWidth, 10);
					h = parseInt(this.customHeight, 10);
					break;
				default:
					w = 1920;
					h = 1080;
			}

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
