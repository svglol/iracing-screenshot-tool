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
			variant="warning"
			aria-close-label="Close message"
			size="small"
			style="
				background-color: rgba(0, 0, 0, 0.3) !important;
				margin-top: 0.5rem;
				margin-bottom: 0.5rem;
				color: yellow;
			"
		>
			<strong>
				High resolutions may crash iRacing if you run out of VRAM. Certain
				track/car combinations will require more VRAM</strong
			>
		</o-notification>

		<o-switch
			v-model="crop"
			dense
			style="padding-top: 0.5rem; padding-bottom: 0.5rem"
		>
			Crop Watermark
		</o-switch>

		<o-notification
			v-if="crop && !disableTooltips"
			variant="info"
			aria-close-label="Close message"
			size="small"
			style="
				background-color: rgba(0, 0, 0, 0.3) !important;
				margin-top: 0.5rem;
				margin-bottom: 0.5rem;
				color: yellow;
			"
		>
			<strong
				>Shrink iRacing UI to as small as possible with Ctrl+PgDwn before
				taking screenshot</strong
			>
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
			variant="warning"
			aria-close-label="Close message"
			size="small"
			style="
				background-color: rgba(0, 0, 0, 0.3) !important;
				margin-top: 0.5rem;
				margin-bottom: 0.5rem;
				color: yellow;
			"
		>
			<strong>{{ warning }}</strong>
		</o-notification>

		<o-notification
			v-if="reshade && !disableTooltips"
			variant="danger"
			aria-close-label="Close message"
			size="small"
			style="
				background-color: rgba(0, 0, 0, 0.3) !important;
				margin-top: 0.5rem;
				margin-bottom: 0.5rem;
				color: yellow;
			"
		>
			<strong
				>After pressing the screenshot button in the iRacing Screenshot
				Tool, you will need to press the keybind for taking a screenshot for
				ReShade</strong
			>
		</o-notification>
	</div>
</template>

<script lang="ts">
import config from '../../utilities/config';
import { checkIracingConfig } from '../../utilities/iracing-config-checks';
const { ipcRenderer } = require('electron');
const fs = require('fs');

export default {
	props: ['screenshot'],
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
				// $oruga is not in Vue's ComponentCustomProperties augmentation
				// (Oruga 0.13 ships partial TS support — D-12-08). v2.1 candidate.
				(this as any).$oruga.notification.open({
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
			// $oruga not typed — see note above.
			(this as any).$oruga.notification.open({
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
			this.$emit('click', {
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
.message.is-warning .message-body {
	color: #ffdd57 !important;
}

.control-label {
	font-weight: 700;
}

.message.is-info .message-body {
	color: rgb(50, 152, 220) !important;
}
</style>
