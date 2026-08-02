<template>
	<div class="long-exposure">
		<div class="long-exposure__header">
			<span class="label" style="margin-bottom: 0">Long Exposure</span>
			<span v-if="backend" class="long-exposure__backend">{{
				backend
			}}</span>
		</div>

		<!-- Availability / prerequisite banners. A long exposure integrates over a
		     window of PAST replay frames, so a live session has nothing to
		     integrate over — this is a prerequisite, not an error. -->
		<o-notification
			v-if="!available"
			class="sidebar-tooltip"
			variant="warning"
			aria-close-label="Close message"
			size="small"
		>
			Long exposure is unavailable on this machine{{
				unavailableReason ? ': ' + unavailableReason : '.'
			}}
		</o-notification>

		<o-notification
			v-else-if="!inReplay"
			class="sidebar-tooltip"
			variant="info"
			aria-close-label="Close message"
			size="small"
		>
			Open a replay and scrub to the moment you want. The exposure ends
			<strong>on</strong> that frame.
		</o-notification>

		<!-- Long exposure accumulates on the GPU via the native WGC path, which is
		     independent of the still-capture backend. Worth saying out loud, because
		     a ReShade user reasonably expects their stills setting to apply here. -->
		<o-notification
			v-if="available && reshade && !disableTooltips"
			class="sidebar-tooltip"
			variant="info"
			aria-close-label="Close message"
			size="small"
		>
			Long exposure captures natively and does not use ReShade, so ReShade
			effects will not appear in the result.
		</o-notification>

		<template v-if="available">
			<o-field label="Shutter">
				<o-select v-model="shutter" expanded :disabled="busy">
					<option
						v-for="stop in shutterOptions"
						:key="stop.key"
						:value="stop.key"
					>
						{{ stop.label }}
					</option>
				</o-select>
			</o-field>

			<o-field label="Playback speed">
				<o-select v-model="playbackSpeed" expanded :disabled="busy">
					<option :value="0">Auto (from sample target)</option>
					<option v-for="d in playbackDivisors" :key="d" :value="d">
						{{ d === 1 ? '1x (real time)' : '1/' + d }}
					</option>
				</o-select>
			</o-field>

			<o-field v-if="playbackSpeed === 0" label="Target samples">
				<o-input
					v-model="targetSamples"
					type="number"
					min="1"
					max="8192"
					:disabled="busy"
				/>
			</o-field>

			<!-- The single most useful thing this panel shows: what the current
			     settings will actually produce, and how long the user will wait for
			     it. Slow-motion playback trades patience for sample count, so that
			     cost should never be a surprise. -->
			<p v-if="plan" class="sidebar-target-hint">
				<span class="sidebar-target-hint__value">
					~{{ plan.predictedSamples }} samples
				</span>
				<span class="sidebar-target-hint__render">
					· at {{ speedLabel }} ·
					{{ formatDuration(plan.predictedWallClockSeconds) }}
				</span>
				<br />
				<!-- A sub-replay-frame exposure spans one frame but only exposes for
				     part of it, so a frame count alone would misdescribe the fast half
				     of the ladder. Show the window it actually opens for. -->
				<span class="sidebar-target-hint__render">
					frames {{ plan.startFrame }} → {{ plan.anchorFrame }} ({{
						windowLabel
					}})
				</span>
			</p>

			<o-field label="Weighting">
				<o-select v-model="weighting" expanded :disabled="busy">
					<option value="box">Box (even)</option>
					<option value="linear">Linear (sharp at the end)</option>
					<option value="ease">Ease (sharper head, long tail)</option>
				</o-select>
			</o-field>

			<o-field class="settings-toggle-row sidebar-toggle-row">
				<o-switch
					id="long-exposure-supersample-switch"
					v-model="supersample"
					:rounded="false"
					:disabled="busy"
					class="settings-light-switch"
				/>
				<label
					for="long-exposure-supersample-switch"
					class="settings-toggle-row__text"
				>
					<span class="label" style="margin-bottom: 0px"
						>2× Supersample</span
					>
				</label>
			</o-field>

			<!-- The trade users won't guess: 2x supersample is 4x the pixels, which
			     roughly halves iRacing's frame rate and therefore halves the sample
			     count. Fewer samples means larger per-sample displacement, which shows
			     up as a ladder of discrete ghosts on fast objects — a STRUCTURED
			     artefact the eye reads as a defect. The aliasing supersampling removes
			     is unstructured, and the motion blur already hides much of it. So on
			     moving subjects, samples usually beat pixels. -->
			<o-notification
				v-if="supersample && !disableTooltips"
				class="sidebar-tooltip"
				variant="warning"
				aria-close-label="Close message"
				size="small"
			>
				Supersampling roughly halves the sample count, which makes fast
				objects break into visible ghosts. Turn it off for moving subjects;
				keep it for static ones.
			</o-notification>

			<!-- Optical-flow interpolation. Shown only where the hardware can
			     actually do it: offering a control that silently does nothing is
			     worse than not offering it. The base feature is never gated on
			     this. -->
			<o-field v-if="interpolationSupported" label="Frame interpolation">
				<o-select v-model="interpolation" expanded :disabled="busy">
					<option :value="1">Off</option>
					<option :value="2">2× (one in-between)</option>
					<option :value="4">4× (three in-betweens)</option>
					<option :value="8">8× (seven in-betweens)</option>
				</o-select>
			</o-field>

			<!-- The honest trade. Interpolation adds GPU work to every captured
			     frame, and our budget is one iRacing present. If we get slower than
			     the sim presents, we start dropping REAL samples to manufacture
			     synthetic ones — a net loss. The sidecar records both counts so it
			     can be checked rather than assumed. -->
			<o-notification
				v-if="
					interpolationSupported && interpolation > 1 && !disableTooltips
				"
				class="sidebar-tooltip"
				variant="warning"
				aria-close-label="Close message"
				size="small"
			>
				Interpolation invents frames between the real ones to smooth the
				streak. It costs GPU time per frame, so check the saved shot's real
				sample count against the same shot with it off — if that number
				drops, it is buying invented samples with real ones.
			</o-notification>

			<!-- Asked for on hardware that can't do it: say so rather than showing
			     a control that quietly does nothing. -->
			<o-notification
				v-if="
					!interpolationSupported &&
					interpolationReason &&
					!disableTooltips
				"
				class="sidebar-tooltip"
				variant="info"
				aria-close-label="Close message"
				size="small"
			>
				Frame interpolation needs an NVIDIA Turing or newer GPU
				{{ adapter ? `(this capture runs on ${adapter})` : '' }}. Everything
				else about long exposure works as normal.
			</o-notification>

			<o-field label="Tonemap">
				<o-select v-model="tonemap" expanded :disabled="busy">
					<option value="none">None</option>
					<option value="reinhard">Reinhard</option>
					<option value="aces">ACES</option>
				</o-select>
			</o-field>

			<o-field label="Exposure compensation (EV)">
				<o-input
					v-model="exposureCompensation"
					type="number"
					step="0.25"
					min="-6"
					max="6"
					:disabled="busy"
				/>
			</o-field>

			<!-- Applied BEFORE accumulation, unlike exposure compensation which is
			     applied after. That ordering is the entire point: it is what makes a
			     bright light deposit energy faster than a dull one, the way a sensor
			     does. Needs no particular GPU. -->
			<o-field label="Highlight recovery (stops)">
				<o-input
					v-model="highlightRecovery"
					type="number"
					step="0.5"
					min="0"
					max="8"
					:disabled="busy"
				/>
			</o-field>

			<o-notification
				v-if="Number(highlightRecovery) === 0 && !disableTooltips"
				class="sidebar-tooltip"
				variant="info"
				aria-close-label="Close message"
				size="small"
			>
				iRacing hands us an image whose highlights are already clipped, so a
				headlight and a white wall arrive equally bright and a light that
				sweeps past leaves a dull grey trail. Raising this expands
				near-clipped values before they are averaged, so bright sources burn
				in faster — the way they do on film. Try 3–5 stops.
			</o-notification>

			<o-field label="Output">
				<o-select v-model="outputFormat" expanded :disabled="busy">
					<option value="png16">16-bit PNG master + preview</option>
					<option value="png">PNG (8-bit)</option>
					<option value="jpeg">JPEG</option>
					<option value="webp">WebP</option>
				</o-select>
			</o-field>

			<!-- Re-shoot reuses the STORED anchor rather than the live cursor, so
			     adjusting settings after a rejected shot captures the same moment. -->
			<o-notification
				v-if="pinnedAnchor !== null && !busy"
				class="sidebar-tooltip"
				variant="info"
				aria-close-label="Close message"
				size="small"
			>
				Re-shooting frame <strong>{{ pinnedAnchor }}</strong
				>.
				<a class="sidebar-vram-switch" @click="releaseAnchor"
					>Use current frame</a
				>
			</o-notification>

			<o-button
				variant="primary"
				icon-left="camera"
				expanded
				:loading="busy"
				:disabled="!canCapture"
				style="margin-top: 0.5rem"
				@click="capture"
			>
				{{ busy ? progressLabel : 'Capture Long Exposure' }}
			</o-button>

			<o-button
				v-if="busy"
				variant="danger"
				expanded
				size="small"
				style="margin-top: 0.35rem"
				@click="abort"
			>
				Cancel
			</o-button>

			<!-- Achieved sampling, reported after every shot. This is what JRT's
			     pair-blend QA view conveys, as a number instead of an eyeball test. -->
			<div v-if="lastResult" class="long-exposure__result">
				<p
					v-if="lastResult.ok && lastResult.stats"
					class="sidebar-target-hint"
				>
					<span class="sidebar-target-hint__value">
						{{ lastResult.stats.accepted }} samples
					</span>
					<span class="sidebar-target-hint__render">
						· evenness {{ Math.round(lastResult.stats.evenness * 100) }}%
						<template v-if="lastResult.stats.duplicatesRejected">
							· {{ lastResult.stats.duplicatesRejected }} duplicates
							rejected
						</template>
					</span>
				</p>
				<o-notification
					v-for="(warning, index) in lastResult.warnings"
					:key="'lw-' + index"
					class="sidebar-tooltip"
					variant="warning"
					aria-close-label="Close message"
					size="small"
				>
					{{ warning }}
				</o-notification>
				<o-notification
					v-if="!lastResult.ok"
					class="sidebar-tooltip"
					variant="danger"
					aria-close-label="Close message"
					size="small"
				>
					{{ lastResult.message }}
				</o-notification>
			</div>
		</template>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import config from '../../utilities/config';
import {
	PLAYBACK_DIVISORS,
	SHUTTER_LADDER,
} from '../../utilities/long-exposure/exposure-math';
import { useOruga } from '@oruga-ui/oruga-next';
const { ipcRenderer } = require('electron');

// How often to re-poll backend availability and the live replay cursor. The
// cursor is what the anchor is read from, so this also keeps the window preview
// honest as the user scrubs.
const AVAILABILITY_POLL_MS = 1000;

// Mirrors ResolvedPlan / the capture IPC reply. Declared locally rather than
// imported so the renderer doesn't pull main-process modules into its bundle.
interface CapturePlan {
	windowFrames: number;
	effectiveExposureSeconds: number;
	// True when the shutter is faster than one replay frame, so the window opens
	// partway through frame `startFrame` rather than on its boundary.
	isSubFrameWindow: boolean;
	startFrame: number;
	anchorFrame: number;
	playbackDivisor: number;
	predictedSamples: number;
	predictedWallClockSeconds: number;
}

interface CaptureResult {
	ok: boolean;
	message: string | null;
	warnings: string[];
	stats?: {
		accepted: number;
		duplicatesRejected: number;
		evenness: number;
	};
}

export default defineComponent({
	name: 'LongExposurePanel',
	props: {
		// Whether the still-capture path is set to ReShade. Used ONLY to explain
		// that long exposure ignores it — never to gate the feature.
		reshade: { type: Boolean, default: false },
	},
	data() {
		return {
			available: false,
			unavailableReason: null as string | null,
			backend: null as string | null,
			// Optical-flow interpolation support, reported independently of the
			// compute backend. Null until the first poll answers.
			interpolationSupported: false,
			interpolationReason: null as string | null,
			adapter: null as string | null,
			inReplay: false,
			liveAnchor: null as number | null,
			replayFrameNumEnd: null as number | null,
			sessionNum: null as number | null,
			frameRate: null as number | null,
			externallyBusy: false,
			disableTooltips: config.get('disableTooltips'),

			shutter: config.get('longExposureShutter'),
			playbackSpeed: config.get('longExposurePlaybackSpeed'),
			targetSamples: String(config.get('longExposureTargetSamples')),
			supersample: config.get('longExposureSupersample') === 2,
			interpolation: config.get('longExposureInterpolation'),
			weighting: config.get('longExposureWeighting'),
			tonemap: config.get('longExposureTonemap'),
			exposureCompensation: String(
				config.get('longExposureExposureCompensation')
			),
			highlightRecovery: String(
				config.get('longExposureHighlightRecovery')
			),
			outputFormat: config.get('longExposureFormat'),

			// Set once a shot has been taken, so adjusting parameters and shooting
			// again captures the SAME moment rather than wherever the cursor is now.
			pinnedAnchor: null as number | null,
			capturing: false,
			progress: null as { phase: string; accepted?: number } | null,
			lastResult: null as CaptureResult | null,

			plan: null as CapturePlan | null,
			pollTimer: null as ReturnType<typeof setInterval> | null,
			previewToken: 0,
			// Hoisted so beforeUnmount can removeListener it (same pattern as
			// Home.vue's onScreenshotResponse).
			onProgress: null as
				| ((event: unknown, update: { phase: string }) => void)
				| null,
		};
	},
	computed: {
		shutterOptions() {
			return SHUTTER_LADDER;
		},
		playbackDivisors() {
			return PLAYBACK_DIVISORS;
		},
		busy(): boolean {
			return this.capturing;
		},
		canCapture(): boolean {
			return (
				this.available &&
				this.inReplay &&
				!this.capturing &&
				!this.externallyBusy
			);
		},
		speedLabel(): string {
			if (!this.plan) return '';
			return this.plan.playbackDivisor === 1
				? '1x'
				: `1/${this.plan.playbackDivisor}`;
		},
		// What the window actually opens for. A shutter faster than one replay frame
		// exposes for part of a single frame, so reporting "1 replay frame" there
		// would describe the seek rather than the exposure.
		windowLabel(): string {
			if (!this.plan) return '';
			if (this.plan.isSubFrameWindow) {
				return `${(this.plan.effectiveExposureSeconds * 1000).toFixed(1)} ms within one replay frame`;
			}
			return `${this.plan.windowFrames} replay frames`;
		},
		progressLabel(): string {
			if (!this.progress) return 'Working…';
			switch (this.progress.phase) {
				case 'seeking':
					return 'Seeking…';
				case 'accumulating':
					return `Exposing… ${this.progress.accepted ?? 0} samples`;
				case 'resolving':
					return 'Developing…';
				case 'restoring':
					return 'Restoring replay…';
				default:
					return 'Working…';
			}
		},
		// Everything the main process needs to execute the shot. Building this in
		// one place means the preview and the capture can never disagree about what
		// the current settings mean.
		recipe(): Record<string, unknown> {
			const anchor = this.pinnedAnchor ?? this.liveAnchor;
			return {
				...(anchor === null ? {} : { anchorFrame: anchor }),
				...(this.sessionNum === null
					? {}
					: { sessionNum: this.sessionNum }),
				shutter: this.shutter,
				playbackSpeed: this.playbackSpeed === 0 ? null : this.playbackSpeed,
				targetSamples:
					this.playbackSpeed === 0
						? parseInt(this.targetSamples, 10) || 240
						: null,
				supersample: this.supersample ? 2 : 1,
				// Sent as 1 unless the hardware actually supports it, so a value
				// persisted on a previous GPU cannot silently ride along.
				interpolationFactor: this.interpolationSupported
					? this.interpolation
					: 1,
				weighting: this.weighting,
				tonemap: this.tonemap,
				exposureCompensation: parseFloat(this.exposureCompensation) || 0,
				highlightRecovery: parseFloat(this.highlightRecovery) || 0,
				outputFormat: this.outputFormat,
			};
		},
	},
	watch: {
		shutter(value) {
			config.set('longExposureShutter', value);
			void this.refreshPreview();
		},
		playbackSpeed(value) {
			config.set('longExposurePlaybackSpeed', Number(value));
			void this.refreshPreview();
		},
		targetSamples(value) {
			const n = parseInt(value, 10);
			if (Number.isFinite(n)) {
				config.set('longExposureTargetSamples', n);
			}
			void this.refreshPreview();
		},
		supersample(value) {
			config.set('longExposureSupersample', value ? 2 : 1);
			void this.refreshPreview();
		},
		interpolation(value) {
			config.set('longExposureInterpolation', Number(value));
			// Affects VRAM, not the sample-count prediction, so refresh the preview
			// to keep the pre-flight honest.
			void this.refreshPreview();
		},
		weighting(value) {
			config.set('longExposureWeighting', value);
		},
		tonemap(value) {
			config.set('longExposureTonemap', value);
		},
		exposureCompensation(value) {
			const n = parseFloat(value);
			if (Number.isFinite(n)) {
				config.set('longExposureExposureCompensation', n);
			}
		},
		highlightRecovery(value) {
			const n = parseFloat(value);
			if (Number.isFinite(n)) {
				config.set('longExposureHighlightRecovery', n);
			}
		},
		outputFormat(value) {
			config.set('longExposureFormat', value);
		},
		liveAnchor() {
			// The window preview is anchored on the cursor, so scrubbing has to
			// refresh it — otherwise the frame range shown is stale.
			if (this.pinnedAnchor === null) {
				void this.refreshPreview();
			}
		},
	},
	mounted() {
		this.onProgress = (_event: unknown, update: { phase: string }) => {
			this.progress = update;
		};
		ipcRenderer.on('long-exposure:progress', this.onProgress);

		void this.poll();
		this.pollTimer = setInterval(
			() => void this.poll(),
			AVAILABILITY_POLL_MS
		);
	},
	beforeUnmount() {
		if (this.pollTimer) {
			clearInterval(this.pollTimer);
		}
		if (this.onProgress) {
			ipcRenderer.removeListener('long-exposure:progress', this.onProgress);
		}
	},
	methods: {
		async poll() {
			try {
				const status = await ipcRenderer.invoke(
					'long-exposure:availability'
				);
				this.available = status.available;
				this.unavailableReason = status.reason;
				this.backend = status.backend;
				this.adapter = status.adapter ?? null;
				// Absent (older addon) is treated exactly like unsupported: the
				// control stays hidden and shots are taken without interpolation.
				this.interpolationSupported =
					status.interpolation?.available === true;
				this.interpolationReason = status.interpolation?.reason ?? null;
				this.inReplay = status.inReplay;
				this.liveAnchor = status.anchorFrame;
				this.replayFrameNumEnd = status.replayFrameNumEnd;
				this.sessionNum = status.sessionNum;
				this.frameRate = status.frameRate;
				// Don't let the main process's own busy flag fight our local latch
				// while OUR capture is the thing making it busy.
				this.externallyBusy = status.busy && !this.capturing;
			} catch {
				// Main is not ready yet; the next tick will pick it up.
				this.available = false;
			}
		},
		async refreshPreview() {
			const token = ++this.previewToken;
			try {
				const result = await ipcRenderer.invoke(
					'long-exposure:preview',
					this.recipe
				);
				// Drop a stale reply so rapid parameter changes can't show an
				// out-of-order preview.
				if (token === this.previewToken) {
					this.plan = result.plan;
				}
			} catch {
				this.plan = null;
			}
		},
		formatDuration(seconds: number): string {
			if (!Number.isFinite(seconds)) return '';
			if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
			return `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`;
		},
		releaseAnchor() {
			this.pinnedAnchor = null;
			void this.refreshPreview();
		},
		async capture() {
			if (!this.canCapture) {
				return;
			}
			// Pin the anchor for the whole shot AND for any re-shoot, so changing
			// parameters afterwards never silently moves the moment.
			const anchor = this.pinnedAnchor ?? this.liveAnchor;
			this.pinnedAnchor = anchor;
			this.capturing = true;
			this.progress = { phase: 'seeking' };
			this.lastResult = null;

			try {
				const result = await ipcRenderer.invoke(
					'long-exposure:capture',
					this.recipe
				);
				this.lastResult = result;
				if (result.ok) {
					useOruga().notification.open({
						message: `Long exposure saved — ${result.stats.accepted} samples`,
						variant: 'success',
					});
				} else {
					useOruga().notification.open({
						message: result.message || 'Long exposure failed',
						variant: 'danger',
					});
				}
			} catch (error) {
				this.lastResult = {
					ok: false,
					message: (error as Error)?.message || String(error),
					warnings: [],
				};
			} finally {
				this.capturing = false;
				this.progress = null;
			}
		},
		async abort() {
			await ipcRenderer.invoke('long-exposure:abort');
		},
	},
});
</script>

<style scoped>
.long-exposure {
	margin-top: 1rem;
	padding-top: 0.75rem;
	border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.long-exposure__header {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	margin-bottom: 0.5rem;
}

.long-exposure__backend {
	font-size: 0.68rem;
	color: rgba(255, 255, 255, 0.4);
	font-variant-numeric: tabular-nums;
}

.long-exposure__result {
	margin-top: 0.5rem;
}
</style>
