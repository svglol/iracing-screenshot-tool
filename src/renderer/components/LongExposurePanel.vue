<template>
	<div class="long-exposure" :class="{ 'is-collapsed': collapsed }">
		<!-- The whole panel folds. Long exposure is a replay-only mode with a dozen
		     parameters sitting directly under the everyday still-capture controls, so
		     leaving it open by default makes the sidebar read as cluttered to someone
		     who only came for a screenshot. Folded it is one row that still says what
		     it would shoot. -->
		<button
			type="button"
			class="long-exposure__header"
			:aria-expanded="!collapsed"
			aria-controls="long-exposure-body"
			@click="toggleCollapsed"
		>
			<span
				class="long-exposure__chevron"
				:class="{ 'is-open': !collapsed }"
				aria-hidden="true"
			>
				<font-awesome-icon icon="chevron-right" />
			</span>
			<span class="label" style="margin-bottom: 0">Long Exposure</span>
			<!-- No status text on the right. It carried the compute backend when
			     open ("d3d11-compute") and the panel state when folded ("needs a
			     replay"), neither of which is something to read every time the
			     sidebar is on screen: the backend is a diagnostic that belongs in the
			     sidecar and the log, and the prerequisite already has a banner
			     inside that says it in a sentence. -->
		</button>

		<div v-show="!collapsed" id="long-exposure-body">
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

				<!-- Everything below is tuning: it has a default that is right for
				     almost every shot, and leaving it all on screen buried the four
				     controls that decide the picture. Folded, but NOT silent — the
				     summary names anything currently set away from its default, because
				     a forgotten 8 passes is an eightfold wait, and that is exactly the
				     trap a disclosure like this sets. -->
				<button
					type="button"
					class="long-exposure__advanced"
					:aria-expanded="advancedOpen"
					aria-controls="long-exposure-advanced"
					@click="toggleAdvanced"
				>
					<span
						class="long-exposure__chevron"
						:class="{ 'is-open': advancedOpen }"
						aria-hidden="true"
					>
						<font-awesome-icon icon="chevron-right" />
					</span>
					<span>Advanced</span>
					<span
						class="long-exposure__summary"
						:class="{ 'is-modified': advancedModified.length > 0 }"
					>
						{{ advancedSummary }}
					</span>
				</button>

				<div v-show="advancedOpen" id="long-exposure-advanced">
					<o-field label="Weighting">
						<o-select v-model="weighting" expanded :disabled="busy">
							<option value="box">Box (even)</option>
							<option value="linear">Linear (sharp at the end)</option>
							<option value="ease">
								Ease (sharper head, long tail)
							</option>
						</o-select>
					</o-field>

					<!-- The 2x Supersample switch was REMOVED 2026-08-03. It was 4x the
			     pixels, which roughly halved iRacing's frame rate and therefore the
			     sample count — and fewer samples on a moving subject means larger
			     per-sample displacement, i.e. a ladder of discrete ghosts, a
			     STRUCTURED artefact the eye reads as a defect. The aliasing it
			     removed is unstructured and the motion blur already hides most of
			     it, so it lost the trade it existed to make. Pick a higher
			     Resolution instead; that control now works. -->

					<!-- Optical-flow interpolation. Shown only where the hardware can
			     actually do it: offering a control that silently does nothing is
			     worse than not offering it. The base feature is never gated on
			     this. -->
					<o-field
						v-if="interpolationSupported"
						label="Frame interpolation"
					>
						<o-select v-model="interpolation" expanded :disabled="busy">
							<option :value="1">Off</option>
							<option :value="2">2× (one in-between)</option>
							<option :value="4">4× (three in-betweens)</option>
							<option :value="8">8× (seven in-betweens)</option>
						</o-select>
					</o-field>

					<!-- Passes sit next to interpolation because they are ALTERNATIVES,
			     not companions: both buy sample density, one with GPU time we may
			     not have and one with wall clock we always do. Needs no particular
			     hardware, so unlike interpolation it is always offered. -->
					<o-field label="Passes">
						<o-select v-model="passes" expanded :disabled="busy">
							<option :value="1">1 (single pass)</option>
							<option :value="2">2× — twice the wait</option>
							<option :value="4">4× — four times the wait</option>
							<option :value="8">8× — eight times the wait</option>
						</o-select>
					</o-field>

					<!-- Bracketing sits with Passes because both change what ONE capture
			     yields — but in opposite directions: passes spend more wall clock on
			     the same picture, bracketing spends more VRAM on more pictures for
			     the same wait. Costs no extra time at all, which is why it is worth
			     offering to anyone unsure which shutter they wanted. -->
					<o-field class="settings-toggle-row">
						<o-switch
							id="long-exposure-bracket-switch"
							v-model="bracket"
							:rounded="false"
							class="settings-light-switch"
							:disabled="busy"
						/>
						<label
							for="long-exposure-bracket-switch"
							class="settings-toggle-row__text"
						>
							<span class="label" style="margin-bottom: 0px"
								>Bracket shutters</span
							>
						</label>
					</o-field>

					<!-- Applied BEFORE accumulation. That ordering is the entire point: it
			     is what makes a bright light deposit energy faster than a dull one,
			     the way a sensor does. Needs no particular GPU.

			     This used to carry a banner recommending 3-5 stops whenever the value
			     was 0 — i.e. permanently, since 0 is the default. A tip that fires on
			     the default state is a nag, not guidance. The default stays 0, where
			     it is exactly identity. -->
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
				</div>
			</template>
		</div>

		<!-- OUTSIDE the fold, deliberately. Everything above is how to configure a
		     shot, and folding that away is the whole point of the disclosure —
		     but TAKING the shot is not configuration, and a user who folded the
		     panel to keep the sidebar tidy still wants to press the button.

		     Cancel and the progress phase come with it rather than staying
		     behind: a capture drives the user's replay cursor for minutes, and
		     nothing that touches their cursor may run with its stop button folded
		     away. That invariant used to be met by force-unfolding the panel on
		     every press, which now would undo the fold the user just chose.

		     The notice card is deliberately NOT gated on `available` — the sentence
		     explaining why the button is missing is the one notice that has to
		     survive when everything else is hidden. -->
		<NoticeCard :notices="notices" />

		<template v-if="available">
			<o-button
				variant="primary"
				icon-left="camera"
				expanded
				:loading="busy"
				:disabled="!canCapture"
				style="margin-top: 0.5rem"
				@click="capture"
			>
				{{ busy ? progressLabel : 'Long Exposure' }}
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

			<!-- No shot summary here any more. The panel used to forecast samples,
		     duration, window, size and format — first as a run-on paragraph among
		     the controls, then as a card under this button — and the size and
		     format halves of it were answering a question the sidebar's own
		     "Output: W × H (FORMAT)" line already answers for both capture modes.
		     The panel is controls, the button, and the notices above it. -->
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
import { plannedSinkCount } from '../../utilities/long-exposure/accumulator-sinks';
import { useOruga } from '@oruga-ui/oruga-next';
import NoticeCard, { type Notice } from './NoticeCard.vue';
const { ipcRenderer } = require('electron');

// How often to re-poll backend availability and the live replay cursor. The
// cursor is what the anchor is read from, so this also keeps the window preview
// honest as the user scrubs.
const AVAILABILITY_POLL_MS = 1000;

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
	components: { NoticeCard },
	props: {
		// Whether the still-capture path is set to ReShade. Used ONLY to explain
		// that long exposure ignores it — never to gate the feature.
		reshade: { type: Boolean, default: false },
	},
	data() {
		return {
			available: false,
			unavailableReason: null as string | null,
			// True only when the machine is capable and the High-Fidelity Capture
			// toggle is the sole thing standing in the way — i.e. the one refusal the
			// user can clear with a switch. Distinct from `!available`, which also
			// covers a machine that cannot run the compute backend at all.
			needsNativeCapture: false,
			// Optical-flow interpolation support, reported independently of the
			// compute backend. Null until the first poll answers.
			interpolationSupported: false,
			interpolationReason: null as string | null,
			adapter: null as string | null,
			// Whether the sim is giving us a replay position to anchor on. NOT
			// "the user has a replay open" — iRacing writes its replay buffer
			// continuously, so a live session reports one too and long exposure
			// works there. False means no telemetry at all.
			hasReplayData: false,
			liveAnchor: null as number | null,
			externallyBusy: false,
			disableTooltips: config.get('disableTooltips'),
			collapsed: config.get('longExposureCollapsed') !== false,
			advancedOpen: config.get('longExposureAdvancedOpen') === true,

			shutter: config.get('longExposureShutter'),
			playbackSpeed: config.get('longExposurePlaybackSpeed'),
			targetSamples: String(config.get('longExposureTargetSamples')),
			interpolation: config.get('longExposureInterpolation'),
			passes: config.get('longExposurePasses'),
			bracket: config.get('longExposureBracket') === true,
			weighting: config.get('longExposureWeighting'),
			highlightRecovery: String(config.get('longExposureHighlightRecovery')),
			// validatePlan's verdict on the CURRENT settings, from the same call the
			// capture makes. Shown before the shot rather than after it, and now the
			// ONLY thing the preview call is read for — the plan it also returns fed
			// the shot summary, which is gone.
			previewWarnings: [] as string[],
			previewErrors: [] as string[],

			capturing: false,
			progress: null as {
				phase: string;
				accepted?: number;
				// Zero-based, and only sent on a multi-pass capture.
				pass?: number;
				passes?: number;
			} | null,
			lastResult: null as CaptureResult | null,

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
				this.hasReplayData &&
				!this.capturing &&
				!this.externallyBusy
			);
		},
		// Whether interpolation is going to run for the shot as currently configured:
		// asked for, supported by the hardware, and not overridden by bracketing.
		//
		// Bracketing wins because the two cannot share the native session's retained
		// -frame state — `executeRecipe` forces the factor to 1 whenever more than one
		// sink is planned. The sink count comes from `plannedSinkCount`, the same
		// helper the capture plans from and validatePlan warns from, so the panel
		// cannot advertise interpolation for a shot that will not use it.
		interpolationWillRun(): boolean {
			return (
				this.interpolationSupported &&
				Number(this.interpolation) > 1 &&
				plannedSinkCount({
					bracket: this.bracket === true,
					shutterKey: this.shutter,
				}) === 1
			);
		},
		// Which advanced settings are away from their default, named the way the user
		// would recognise them.
		//
		// The point of the disclosure is that these have defaults that are right for
		// almost every shot. The risk it introduces is that a value left set from a
		// previous session — 8 passes is an eightfold wait — becomes invisible. So
		// the folded row names them rather than merely counting.
		advancedModified(): string[] {
			const active: string[] = [];
			if (this.weighting !== 'box') {
				active.push(this.weighting);
			}
			if (this.interpolationSupported && Number(this.interpolation) > 1) {
				active.push(`${this.interpolation}× interpolation`);
			}
			// Named rather than counted, and for the sharpest version of the reason
			// this disclosure names anything: a forgotten 8 here is an eightfold wait.
			if (Number(this.passes) > 1) {
				active.push(`${this.passes} passes`);
			}
			if (this.bracket) {
				active.push('bracketed');
			}
			const recovery = parseFloat(this.highlightRecovery);
			if (Number.isFinite(recovery) && recovery !== 0) {
				active.push(`${recovery} stop recovery`);
			}
			return active;
		},
		// How many controls the fold is hiding. Interpolation is only rendered on
		// hardware that can do it, so the count has to agree with what is actually
		// in there. Weighting, passes, highlight recovery, and interpolation where it
		// is offered.
		advancedCount(): number {
			return this.interpolationSupported ? 5 : 4;
		},
		// Every notice this panel raises, as data for the single NoticeCard: the
		// availability banner, the tuning notes that used to sit inside Advanced,
		// the pre-flight verdict, and the outcome of the last shot. NoticeCard
		// sorts by severity, so a hard refusal always leads regardless of order here.
		//
		// Hoisting the Advanced notes out of the fold is deliberate. They describe
		// settings that are ON, and the panel already argues a forgotten 8 passes
		// must stay visible — one bullet in a shared card costs far less room than
		// the three stacked banners they replace, so there is no longer a reason to
		// hide them behind a chevron.
		notices(): Notice[] {
			const notices: Notice[] = [];

			// Long exposure cannot run. Two very different reasons, and conflating them
			// is the difference between a fix and a dead end.
			//
			// The setting case comes FIRST because it is the actionable one: the
			// machine is capable and a single switch stands in the way. Long exposure
			// accumulates through the native WGC path no matter which backend stills
			// use, so High-Fidelity Capture is a hard prerequisite here — telling this
			// user their machine is "unavailable" would be both false and unhelpful.
			//
			// The panel stays mounted either way. Only the controls and the button are
			// gated on `available` (see the template); the notice below is what remains,
			// which is the whole reason NoticeCard sits outside that gate.
			if (this.needsNativeCapture) {
				notices.push({
					level: 'warning',
					text: 'Long exposure needs High-Fidelity Capture (WGC), which is currently off. Turn it on in Settings to enable long exposure.',
				});
				return notices;
			}
			// The compute backend could not be built on this machine. A prerequisite
			// rather than a mistake the user made, which is why it is a warning and not
			// a danger.
			if (!this.available) {
				notices.push({
					level: 'warning',
					text: `Long exposure is unavailable on this machine${
						this.unavailableReason ? ': ' + this.unavailableReason : '.'
					}`,
				});
				// Nothing below applies when the feature cannot run at all.
				return notices;
			}

			// Pre-flight: the SAME validatePlan results the capture would report
			// afterwards, shown while they can still change the decision. Gated on
			// having a replay position — without telemetry the preview resolves
			// against frame 0 and truthfully reports a window reaching past the start
			// of the tape, which describes a shot nobody is taking.
			if (this.hasReplayData) {
				this.previewErrors.forEach((problem) => {
					notices.push({ level: 'danger', text: problem });
				});
				this.previewWarnings.forEach((warning) => {
					notices.push({ level: 'warning', text: warning });
				});
			}

			// Outcome of the last shot.
			if (this.lastResult && !this.lastResult.ok) {
				notices.push({
					level: 'danger',
					text: this.lastResult.message || 'Long exposure failed',
				});
			}
			if (this.lastResult) {
				this.lastResult.warnings.forEach((warning) => {
					notices.push({ level: 'warning', text: warning });
				});
			}

			if (this.disableTooltips) {
				return notices;
			}

			// Interpolation adds GPU work to every captured frame against a budget of
			// one iRacing present. Slower than the sim presents and we drop REAL
			// samples to manufacture synthetic ones — a net loss, and one the sidecar
			// records both halves of so it can be checked rather than assumed.
			//
			// Both of the interpolation notices below are gated on it actually being
			// going to run: a bracket takes the shot without it, and advice about a
			// setting that is inert sends the user to tune something that cannot
			// affect the result. The accurate "these two cannot both run" message
			// comes from validatePlan, through previewWarnings above.
			if (this.interpolationWillRun) {
				notices.push({
					level: 'warning',
					text:
						'Interpolation invents frames between the real ones to smooth the ' +
						"streak. It costs GPU time per frame, so check the saved shot's " +
						'real sample count against the same shot with it off — if that ' +
						'number drops, it is buying invented samples with real ones.',
				});
			}

			// Both on is the worst of the trade, and validatePlan says so too — this
			// is the same fact stated where the controls are.
			if (Number(this.passes) > 1 && this.interpolationWillRun) {
				notices.push({
					level: 'warning',
					text:
						'Passes and interpolation compete for the same per-frame budget. ' +
						'With both on, each pass captures fewer real frames — turning ' +
						'interpolation off usually makes the better shot for the same wait.',
				});
			}

			if (Number(this.passes) > 1) {
				notices.push({
					level: 'info',
					text:
						'Each pass replays the same moment and catches frames the others ' +
						'missed, so the streak gets smoother rather than brighter. Best on ' +
						'fast shutters, where a single pass collects only a handful of samples.',
				});
			}

			// Asked for on hardware that can't do it: say so, rather than showing a
			// control that quietly does nothing.
			if (!this.interpolationSupported && this.interpolationReason) {
				notices.push({
					level: 'info',
					text:
						'Frame interpolation needs an NVIDIA Turing or newer GPU' +
						`${this.adapter ? ` (this capture runs on ${this.adapter})` : ''}. ` +
						'Everything else about long exposure works as normal.',
				});
			}

			// Accumulation always runs through the native WGC + D3D11 compute path,
			// independent of the still-capture backend — worth saying out loud,
			// because a ReShade user reasonably expects their stills setting to apply.
			if (this.reshade) {
				notices.push({
					level: 'info',
					text:
						'Long exposure captures natively and does not use ReShade, so ' +
						'ReShade effects will not appear in the result.',
				});
			}

			return notices;
		},
		advancedSummary(): string {
			if (this.advancedOpen) {
				return '';
			}
			return this.advancedModified.length > 0
				? this.advancedModified.join(', ')
				: `${this.advancedCount} defaults`;
		},
		// Multi-pass re-seeks between passes, so without the pass number the progress
		// line would appear to restart part-way through and read as a fault.
		passLabel(): string {
			const total = this.progress?.passes ?? 0;
			const current = this.progress?.pass;
			if (total > 1 && typeof current === 'number') {
				return ` (pass ${current + 1} of ${total})`;
			}
			return '';
		},
		progressLabel(): string {
			if (!this.progress) return 'Working…';
			switch (this.progress.phase) {
				case 'seeking':
					return `Seeking…${this.passLabel}`;
				case 'accumulating':
					return `Exposing… ${this.progress.accepted ?? 0} samples${this.passLabel}`;
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
			return {
				// anchorFrame and sessionNum are deliberately absent, so main reads
				// the live cursor when it handles the call. The anchor is therefore
				// whatever the replay is parked on at the instant Capture is pressed,
				// not a frame pinned by an earlier shot — scrub, press, and you get
				// where you scrubbed to.
				//
				// It is still fixed for the DURATION of a capture: main reads the
				// cursor once, writes it into the recipe, and every seek, the window
				// and the restore use that one value. Only the choice of anchor moved
				// from the renderer to the press.
				shutter: this.shutter,
				playbackSpeed: this.playbackSpeed === 0 ? null : this.playbackSpeed,
				targetSamples:
					this.playbackSpeed === 0
						? parseInt(this.targetSamples, 10) || 240
						: null,
				// Sent as 1 unless the hardware actually supports it, so a value
				// persisted on a previous GPU cannot silently ride along.
				interpolationFactor: this.interpolationSupported
					? this.interpolation
					: 1,
				// Unlike interpolation this needs no particular hardware, so it is sent
				// as chosen. An addon build too old to run passes degrades to one and
				// says so in the outcome's warnings.
				passes: Number(this.passes) || 1,
				// Every stop at or faster than the chosen shutter, from one capture.
				bracket: this.bracket === true,
				weighting: this.weighting,
				highlightRecovery: parseFloat(this.highlightRecovery) || 0,
				// outputFormat, exposureCompensation and tonemap are deliberately
				// absent. Main resolves the format from the still-capture setting so
				// there is one place to set it, and an omitted field takes the default
				// there — which is exactly what "follow Settings" has to mean. Sending
				// them from here would let a stale panel value win over Settings, or
				// keep applying a tonemap no control can turn off any more.
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
		interpolation(value) {
			config.set('longExposureInterpolation', Number(value));
			// Affects VRAM, not the sample-count prediction, so refresh the preview
			// to keep the pre-flight honest.
			void this.refreshPreview();
		},
		bracket(value) {
			config.set('longExposureBracket', value === true);
			// Changes the VRAM pre-flight by the number of stops, which is the one
			// thing that can refuse the shot outright — so the verdict has to refresh.
			void this.refreshPreview();
		},
		passes(value) {
			config.set('longExposurePasses', Number(value));
			// Multiplies the predicted wait and sample count, which is the whole cost
			// of the setting — the preview must not keep quoting one pass.
			void this.refreshPreview();
		},
		weighting(value) {
			config.set('longExposureWeighting', value);
		},
		highlightRecovery(value) {
			const n = parseFloat(value);
			if (Number.isFinite(n)) {
				config.set('longExposureHighlightRecovery', n);
			}
		},
		liveAnchor() {
			// validatePlan's verdict is anchored on the cursor, and the cursor is
			// what a press would capture — so scrubbing has to re-run it. Chief among
			// those verdicts: an anchor closer to the start of the tape than the
			// exposure window is long, which is a refusal that must appear as the
			// user scrubs INTO it, not only when they change a parameter.
			void this.refreshPreview();
		},
	},
	mounted() {
		this.onProgress = (_event: unknown, update: { phase: string }) => {
			this.progress = update;
		};
		ipcRenderer.on('long-exposure:progress', this.onProgress);

		void this.poll();
		this.pollTimer = setInterval(() => {
			void this.poll();
		}, AVAILABILITY_POLL_MS);

		// No outputFormat subscription here any more. It existed to refresh the
		// preview so the panel's format line stayed current; the sidebar's Output
		// line names the format now, and it subscribes for itself.
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
		toggleCollapsed() {
			this.collapsed = !this.collapsed;
			config.set('longExposureCollapsed', this.collapsed);
		},
		toggleAdvanced() {
			this.advancedOpen = !this.advancedOpen;
			config.set('longExposureAdvancedOpen', this.advancedOpen);
		},
		async poll() {
			try {
				const status = await ipcRenderer.invoke(
					'long-exposure:availability'
				);
				this.available = status.available;
				this.unavailableReason = status.reason;
				this.needsNativeCapture = status.needsNativeCapture === true;
				this.adapter = status.adapter ?? null;
				// Absent (older addon) is treated exactly like unsupported: the
				// control stays hidden and shots are taken without interpolation.
				this.interpolationSupported =
					status.interpolation?.available === true;
				this.interpolationReason = status.interpolation?.reason ?? null;
				this.hasReplayData = status.hasReplayData;
				this.liveAnchor = status.anchorFrame;
				// Don't let the main process's own busy flag fight our local latch
				// while OUR capture is the thing making it busy.
				this.externallyBusy = status.busy && !this.capturing;
			} catch {
				// Main is not ready yet; the next tick will pick it up. Clear the hint
				// too — offering a switch to flip on the strength of a failed poll
				// would be guessing.
				this.available = false;
				this.needsNativeCapture = false;
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
				// out-of-order verdict.
				if (token === this.previewToken) {
					this.previewWarnings = result.validation?.warnings ?? [];
					this.previewErrors = result.validation?.errors ?? [];
				}
			} catch {
				// A failed preview must not leave a stale verdict on screen claiming
				// something about settings it was never asked about.
				this.previewWarnings = [];
				this.previewErrors = [];
			}
		},
		async capture() {
			if (!this.canCapture) {
				return;
			}
			// The anchor is NOT chosen here. The recipe omits it, so main reads the
			// replay cursor as it handles this call — the moment of the press, not a
			// value polled up to a second ago and not a frame pinned by an earlier
			// shot. Main then fixes it in the recipe for the whole capture.
			//
			// The panel is NOT unfolded for the duration any more. That existed to
			// keep Cancel, the progress phase and the sample count reachable while a
			// capture drove the user's replay cursor; all three now live outside the
			// fold, so the same guarantee holds without overriding a fold the user
			// chose — which, for a button that is deliberately pressable while
			// collapsed, would undo the thing they asked for on every press.
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

/* A real <button>, so the fold is keyboard-reachable and screen readers get the
   expanded state — but styled back down to the label row it replaced. */
.long-exposure__header {
	display: flex;
	align-items: baseline;
	gap: 0.45rem;
	width: 100%;
	margin-bottom: 0.5rem;
	padding: 0;
	background: none;
	border: none;
	color: inherit;
	font: inherit;
	text-align: left;
	cursor: pointer;
}

.long-exposure__header:focus-visible {
	outline: 1px solid rgba(255, 255, 255, 0.4);
	outline-offset: 2px;
}

/* Collapsed, the header is followed by the capture button's own top margin (or,
   where long exposure is unavailable, by nothing at all) — so its bottom margin
   would either double the gap or read as a stray one. */
.long-exposure.is-collapsed .long-exposure__header {
	margin-bottom: 0;
}

.long-exposure__chevron {
	display: inline-flex;
	width: 0.7rem;
	font-size: 0.7rem;
	color: rgba(255, 255, 255, 0.5);
	transition: transform 0.15s ease;
}

.long-exposure__chevron.is-open {
	transform: rotate(90deg);
}

/* The Advanced disclosure. Same affordance as the panel header, one step quieter:
   it is a group of tuning controls, not a feature. */
.long-exposure__advanced {
	display: flex;
	align-items: baseline;
	gap: 0.45rem;
	width: 100%;
	margin: 0.35rem 0 0.5rem;
	padding: 0;
	background: none;
	border: none;
	color: rgba(255, 255, 255, 0.65);
	font: inherit;
	font-size: 0.78rem;
	text-align: left;
	cursor: pointer;
}

.long-exposure__advanced:hover {
	color: rgba(255, 255, 255, 0.85);
}

.long-exposure__advanced:focus-visible {
	outline: 1px solid rgba(255, 255, 255, 0.4);
	outline-offset: 2px;
}

/* Pushed right, and allowed to shrink rather than wrap the header onto a second
   line — the summary is the least important thing in the row. */
.long-exposure__summary {
	margin-left: auto;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 0.68rem;
	color: rgba(255, 255, 255, 0.45);
	font-variant-numeric: tabular-nums;
}

/* Something in there is not at its default. Bright enough to be noticed while
   scanning past, not bright enough to look like a warning. */
.long-exposure__summary.is-modified {
	color: rgba(255, 255, 255, 0.75);
}
</style>
