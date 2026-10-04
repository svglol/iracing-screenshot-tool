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
			<span class="label" style="margin-bottom: 0">{{
				$t('longExposure.title')
			}}</span>
			<!-- No status text on the right. It carried the compute backend when
			     open ("d3d11-compute") and the panel state when folded ("needs a
			     replay"), neither of which is something to read every time the
			     sidebar is on screen: the backend is a diagnostic that belongs in the
			     sidecar and the log, and the prerequisite already has a banner
			     inside that says it in a sentence. -->
		</button>

		<div v-show="!collapsed" id="long-exposure-body">
			<template v-if="available">
				<o-field :label="$t('longExposure.shutter')">
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

				<o-field :label="$t('longExposure.playbackSpeed')">
					<o-select v-model="playbackSpeed" expanded :disabled="busy">
						<option :value="0">
							{{ $t('longExposure.playbackAuto') }}
						</option>
						<option v-for="d in playbackDivisors" :key="d" :value="d">
							{{
								d === 1 ? $t('longExposure.playbackRealTime') : '1/' + d
							}}
						</option>
					</o-select>
				</o-field>

				<o-field
					v-if="playbackSpeed === 0"
					:label="$t('longExposure.targetSamples')"
				>
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
					<span>{{ $t('longExposure.advanced') }}</span>
					<span
						class="long-exposure__summary"
						:class="{ 'is-modified': advancedModified.length > 0 }"
					>
						{{ advancedSummary }}
					</span>
				</button>

				<div v-show="advancedOpen" id="long-exposure-advanced">
					<!-- A segmented control rather than a dropdown: three options that are
					     SHAPES, so each button draws its curve and the choice is visible
					     without opening anything. -->
					<o-field :label="$t('longExposure.weighting')">
						<SegmentedControl
							v-model="weighting"
							name="long-exposure-weighting"
							:options="weightingOptions"
							:aria-label="$t('longExposure.weighting')"
							:disabled="busy"
						>
							<template #glyph="{ option }">
								<svg
									class="weighting-glyph"
									viewBox="0 0 28 18"
									aria-hidden="true"
								>
									<line
										class="weighting-glyph__axis"
										x1="2"
										y1="16"
										x2="26"
										y2="16"
									/>
									<polyline
										class="weighting-glyph__curve"
										:points="option.points"
									/>
								</svg>
							</template>
						</SegmentedControl>
					</o-field>

					<!-- The 2x Supersample switch was REMOVED 2026-08-03. It was 4x the
			     pixels, which roughly halved iRacing's frame rate and therefore the
			     sample count — and fewer samples on a moving subject means larger
			     per-sample displacement, i.e. a ladder of discrete ghosts, a
			     STRUCTURED artefact the eye reads as a defect. The aliasing it
			     removed is unstructured and the motion blur already hides most of
			     it, so it lost the trade it existed to make. Pick a higher
			     Resolution instead; that control now works. -->

					<!-- Passes buy sample density with wall clock: each visit to the
			     window catches a different share of iRacing's presents. Needs no
			     particular hardware, so it is always offered. Segmented so the
			     multiplier is in view the whole time — the wait it costs is the
			     tooltip, and the folded summary names anything above 1×. -->
					<o-field :label="$t('longExposure.passes')">
						<SegmentedControl
							v-model="passes"
							name="long-exposure-passes"
							:options="passOptions"
							:aria-label="$t('longExposure.passes')"
							:disabled="busy"
						/>
					</o-field>

					<!-- After Passes because it is the other control that spends wall clock
			     once per pass. It does not touch the exposure at all: it only decides
			     whether the dirt, smoke and wheel blur a seek wipes have rebuilt by
			     the time the window opens.

			     A slider in whole seconds: the cost is linear in the value (each
			     second is a second per pass), which a continuous control shows
			     better than four unevenly spaced presets did. A plain range input
			     rather than an Oruga slider — that plugin is not registered, and
			     the native control brings arrow keys and a spoken value with it. -->
					<div class="field">
						<div class="warm-up__head">
							<label for="long-exposure-warm-up" class="label">{{
								$t('longExposure.warmUp')
							}}</label>
							<output
								for="long-exposure-warm-up"
								class="warm-up__value"
								>{{ warmUpReadout }}</output
							>
						</div>
						<input
							id="long-exposure-warm-up"
							v-model.number="warmUpSeconds"
							type="range"
							class="warm-up__slider"
							min="0"
							:max="warmUpMax"
							step="1"
							:disabled="busy"
							:aria-valuetext="warmUpSpoken"
							:title="warmUpSpoken"
							:style="{ '--frac': warmUpSeconds / warmUpMax }"
						/>
						<div class="warm-up__ticks" aria-hidden="true">
							<span v-for="n in warmUpMax + 1" :key="n">{{
								n - 1
							}}</span>
						</div>
					</div>

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
							<span class="label" style="margin-bottom: 0px">{{
								$t('longExposure.bracket')
							}}</span>
						</label>
					</o-field>

					<!-- Applied BEFORE accumulation. That ordering is the entire point: it
			     is what makes a bright light deposit energy faster than a dull one,
			     the way a sensor does. Needs no particular GPU.

			     This used to carry a banner recommending 3-5 stops whenever the value
			     was 0 — i.e. permanently, since 0 is the default. A tip that fires on
			     the default state is a nag, not guidance. The default stays 0, where
			     it is exactly identity. -->
					<o-field :label="$t('longExposure.highlightRecovery')">
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
				{{ busy ? progressLabel : $t('longExposure.title') }}
			</o-button>

			<o-button
				v-if="busy"
				variant="danger"
				expanded
				size="small"
				style="margin-top: 0.35rem"
				@click="abort"
			>
				{{ $t('longExposure.cancel') }}
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
	DEFAULT_WARM_UP_SECONDS,
	PANEL_MAX_WARM_UP_SECONDS,
	panelWarmUpSeconds,
	PLAYBACK_DIVISORS,
	SHUTTER_LADDER,
	WEIGHTING_CURVES,
	weightAt,
} from '../../utilities/long-exposure/exposure-math';
import { dedupeNotices } from '../../utilities/long-exposure/notices';
import { useOruga } from '@oruga-ui/oruga-next';
import NoticeCard, { type Notice } from './NoticeCard.vue';
import SegmentedControl from './SegmentedControl.vue';
const { ipcRenderer } = require('electron');

// How often to re-poll backend availability and the live replay cursor. The
// cursor is what the anchor is read from, so this also keeps the window preview
// honest as the user scrubs.
const AVAILABILITY_POLL_MS = 1000;

// i18n key stems for each weighting curve: `<stem>` is the full label (now the
// tooltip), `<stem>Short` the button text.
const WEIGHTING_LABEL_KEYS = {
	box: 'longExposure.weightingBox',
	linear: 'longExposure.weightingLinear',
	ease: 'longExposure.weightingEase',
} as const;

// Each segment's glyph, sampled from weightAt itself rather than drawn by hand, so
// the picture on the button cannot drift from what the accumulator does. Plotted
// in the glyph's 28x18 viewBox: oldest sample on the left, anchor on the right,
// weight 1 at the top.
const GLYPH_STEPS = 12;
function weightingGlyphPoints(curve: (typeof WEIGHTING_CURVES)[number]) {
	const points: string[] = [];
	for (let i = 0; i <= GLYPH_STEPS; i++) {
		const u = i / GLYPH_STEPS;
		const x = 2 + 24 * u;
		const y = 14 - 11 * weightAt(curve, u);
		points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
	}
	return points.join(' ');
}

// The pass counts the panel offers, each paired with the full label that names
// its cost ("4× — four times the wait"), which becomes the segment's tooltip.
const PASS_CHOICES = [
	{ passes: 1, titleKey: 'longExposure.passes1' },
	{ passes: 2, titleKey: 'longExposure.passes2' },
	{ passes: 4, titleKey: 'longExposure.passes4' },
	{ passes: 8, titleKey: 'longExposure.passes8' },
] as const;

// Warm-up stops that already have a label with a note in it ("3 s (recommended)").
// Spoken and shown on hover in preference to the bare "{seconds} s".
const WARM_UP_NOTE_KEYS: Record<number, string> = {
	1: 'longExposure.warmUp1',
	3: 'longExposure.warmUp3',
	5: 'longExposure.warmUp5',
};

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
	components: { NoticeCard, SegmentedControl },
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
			passes: config.get('longExposurePasses'),
			// Normalised to what the slider can show, so what is on screen is what
			// the recipe sends.
			warmUpSeconds: panelWarmUpSeconds(
				config.get('longExposureWarmUpSeconds')
			),
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
			// The recipe that produced lastResult, serialised. The outcome's
			// warnings are validatePlan's verdict on THOSE settings, so this is what
			// tells us whether they still describe the shot the user is set up for.
			lastResultRecipe: null as string | null,

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
		weightingOptions(): {
			value: string;
			label: string;
			title: string;
			points: string;
		}[] {
			return WEIGHTING_CURVES.map((curve) => ({
				value: curve,
				label: this.$t(`${WEIGHTING_LABEL_KEYS[curve]}Short`),
				title: this.$t(WEIGHTING_LABEL_KEYS[curve]),
				points: weightingGlyphPoints(curve),
			}));
		},
		passOptions(): { value: number; label: string; title: string }[] {
			return PASS_CHOICES.map((choice) => ({
				value: choice.passes,
				label: `${choice.passes}×`,
				title: this.$t(choice.titleKey),
			}));
		},
		warmUpMax(): number {
			return PANEL_MAX_WARM_UP_SECONDS;
		},
		// The short value beside the label: "Off" or "3 s".
		warmUpReadout(): string {
			const seconds = Number(this.warmUpSeconds);
			return seconds === 0
				? this.$t('longExposure.warmUpOff')
				: this.$t('longExposure.warmUpValue', { seconds });
		},
		// What a screen reader announces and the hover shows: the readout, or the
		// noted label where that stop has one.
		warmUpSpoken(): string {
			const key = WARM_UP_NOTE_KEYS[Number(this.warmUpSeconds)];
			return key ? this.$t(key) : this.warmUpReadout;
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
				active.push(
					this.$t(`longExposure.modified.weighting_${this.weighting}`)
				);
			}
			// Named rather than counted, and for the sharpest version of the reason
			// this disclosure names anything: a forgotten 8 here is an eightfold wait.
			if (Number(this.passes) > 1) {
				active.push(
					this.$t('longExposure.modified.passes', {
						count: Number(this.passes),
					})
				);
			}
			if (this.bracket) {
				active.push(this.$t('longExposure.modified.bracketed'));
			}
			if (Number(this.warmUpSeconds) !== DEFAULT_WARM_UP_SECONDS) {
				active.push(
					Number(this.warmUpSeconds) === 0
						? this.$t('longExposure.modified.warmUpOff')
						: this.$t('longExposure.modified.warmUp', {
								seconds: Number(this.warmUpSeconds),
							})
				);
			}
			const recovery = parseFloat(this.highlightRecovery);
			if (Number.isFinite(recovery) && recovery !== 0) {
				active.push(
					this.$t('longExposure.modified.recovery', { stops: recovery })
				);
			}
			return active;
		},
		// How many controls the fold is hiding: weighting, passes, warm-up,
		// bracketing and highlight recovery.
		advancedCount(): number {
			return 5;
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
					text: this.$t('longExposure.notices.needsNativeCapture'),
				});
				return notices;
			}
			// The compute backend could not be built on this machine. A prerequisite
			// rather than a mistake the user made, which is why it is a warning and not
			// a danger.
			if (!this.available) {
				notices.push({
					level: 'warning',
					text: this.unavailableReason
						? this.$t('longExposure.notices.unavailableWithReason', {
								reason: this.unavailableReason,
							})
						: this.$t('longExposure.notices.unavailable'),
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
					text: this.lastResult.message || this.$t('longExposure.failed'),
				});
			}
			// Only while they still describe the settings on screen. These are
			// validatePlan's verdict on the recipe AS CAPTURED, and lastResult is not
			// cleared when a setting changes — so without this guard, capturing at 4
			// passes and then switching to 1 leaves the outcome's "…about one frame
			// per pass…" sitting directly above the live "…only one frame will land
			// inside it…". Two sentences opening with the same clause, reading as a
			// duplicate rather than as history. The failure message below is
			// deliberately NOT gated: a capture that failed still needs explaining.
			if (this.lastResult && this.lastResultIsCurrent) {
				this.lastResult.warnings.forEach((warning) => {
					notices.push({ level: 'warning', text: warning });
				});
			}

			// Tips only. A block rather than an early return, deliberately: an early
			// `return notices` here once skipped the dedupe below, so with tooltips
			// disabled every plan warning still rendered twice after a shot.
			if (!this.disableTooltips) {
				if (Number(this.passes) > 1) {
					notices.push({
						level: 'info',
						text: this.$t('longExposure.notices.passes'),
					});
				}

				// Accumulation always runs through the native WGC + D3D11 compute path,
				// independent of the still-capture backend — worth saying out loud,
				// because a ReShade user reasonably expects their stills setting to
				// apply.
				if (this.reshade) {
					notices.push({
						level: 'info',
						text: this.$t('longExposure.notices.reshade'),
					});
				}
			}

			// The pre-flight above and the last capture's outcome both carry
			// validatePlan's warnings, and lastResult is only cleared when the NEXT
			// capture starts — so after any completed shot every plan warning was
			// rendered twice. See utilities/long-exposure/notices.
			return dedupeNotices(notices);
		},
		advancedSummary(): string {
			if (this.advancedOpen) {
				return '';
			}
			return this.advancedModified.length > 0
				? this.advancedModified.join(', ')
				: this.$t('longExposure.defaultsSummary', {
						count: this.advancedCount,
					});
		},
		// Multi-pass re-seeks between passes, so without the pass number the progress
		// line would appear to restart part-way through and read as a fault.
		passLabel(): string {
			const total = this.progress?.passes ?? 0;
			const current = this.progress?.pass;
			if (total > 1 && typeof current === 'number') {
				return this.$t('longExposure.progress.pass', {
					current: current + 1,
					total,
				});
			}
			return '';
		},
		progressLabel(): string {
			if (!this.progress) return this.$t('longExposure.progress.working');
			switch (this.progress.phase) {
				case 'seeking':
					return this.$t('longExposure.progress.seeking', {
						pass: this.passLabel,
					});
				case 'warming':
					return this.$t('longExposure.progress.warming', {
						pass: this.passLabel,
					});
				case 'accumulating':
					return this.$t('longExposure.progress.accumulating', {
						count: this.progress.accepted ?? 0,
						pass: this.passLabel,
					});
				case 'resolving':
					return this.$t('longExposure.progress.resolving');
				case 'restoring':
					return this.$t('longExposure.progress.restoring');
				default:
					return this.$t('longExposure.progress.working');
			}
		},
		// Everything the main process needs to execute the shot. Building this in
		// one place means the preview and the capture can never disagree about what
		// the current settings mean.
		// Whether the last capture's outcome still describes the current settings.
		// Compared on the recipe, which deliberately carries no anchor frame — so
		// scrubbing the replay does not retire a still-valid outcome.
		lastResultIsCurrent(): boolean {
			return (
				this.lastResultRecipe !== null &&
				this.lastResultRecipe === JSON.stringify(this.recipe)
			);
		},
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
				// Needs no particular hardware, so it is sent as chosen. An addon build too old to run passes degrades to one and
				// says so in the outcome's warnings.
				passes: Number(this.passes) || 1,
				// 0 is a real choice (off), so `|| default` would be wrong here.
				warmUpSeconds: Number.isFinite(Number(this.warmUpSeconds))
					? Number(this.warmUpSeconds)
					: DEFAULT_WARM_UP_SECONDS,
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
		warmUpSeconds(value) {
			config.set('longExposureWarmUpSeconds', Number(value));
			// Adds its seconds to every pass, and can raise a shortened-warm-up
			// warning near the start of the tape — both belong in the verdict.
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
			// Snapshot the settings this shot is being taken with, so its warnings
			// can be retired the moment they stop describing them.
			this.lastResultRecipe = JSON.stringify(this.recipe);

			try {
				const result = await ipcRenderer.invoke(
					'long-exposure:capture',
					this.recipe
				);
				this.lastResult = result;
				if (result.ok) {
					useOruga().notification.open({
						message: this.$t('longExposure.saved', {
							count: result.stats.accepted,
						}),
						variant: 'success',
					});
				} else {
					useOruga().notification.open({
						message: result.message || this.$t('longExposure.failed'),
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

/* Each Weighting segment's curve, drawn in the segment's text colour so it follows
   the selected state. Slot content, so these scoped rules still reach it. */
.weighting-glyph {
	width: 28px;
	height: 18px;
	overflow: visible;
}

.weighting-glyph__axis {
	stroke: currentColor;
	stroke-width: 1;
	opacity: 0.3;
}

.weighting-glyph__curve {
	fill: none;
	stroke: currentColor;
	stroke-width: 1.75;
	stroke-linecap: round;
	stroke-linejoin: round;
}

/* Effects warm-up slider: the label and its value on one line, the track, then
   the whole-second ticks. The track and thumb take the light field colours and
   the primary fill, matching the switches and the segmented controls. */
.warm-up__head {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 0.5rem;
	margin-bottom: 0.35rem;
}

.warm-up__head .label {
	margin-bottom: 0;
}

.warm-up__value {
	font-size: 0.8rem;
	color: rgba(255, 255, 255, 0.85);
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.warm-up__slider {
	--thumb: 16px;
	display: block;
	width: 100%;
	height: 24px;
	margin: 0;
	background: transparent;
	-webkit-appearance: none;
	appearance: none;
	cursor: pointer;
}

/* No box around the whole track — main.scss's global `:focus` outline would draw
   one on every mouse drag. Keyboard focus rings the thumb instead (below). */
.warm-up__slider:focus {
	outline: none;
}

/* The fill ends under the thumb's CENTRE, which travels from half a thumb in to
   half a thumb short of the end — not across the full track width. */
.warm-up__slider::-webkit-slider-runnable-track {
	height: 4px;
	border-radius: 2px;
	background: linear-gradient(
		to right,
		var(--bulma-primary, #ec202a)
			calc(var(--thumb) / 2 + (100% - var(--thumb)) * var(--frac, 0)),
		hsl(0, 0%, 86%)
			calc(var(--thumb) / 2 + (100% - var(--thumb)) * var(--frac, 0))
	);
}

.warm-up__slider::-webkit-slider-thumb {
	-webkit-appearance: none;
	width: var(--thumb);
	height: var(--thumb);
	margin-top: calc((4px - var(--thumb)) / 2);
	border: 2px solid var(--bulma-primary, #ec202a);
	border-radius: 50%;
	background: #fff;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
	transition: transform 0.1s ease;
}

.warm-up__slider:hover::-webkit-slider-thumb {
	transform: scale(1.12);
}

.warm-up__slider:focus-visible::-webkit-slider-thumb {
	box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.55);
}

.warm-up__slider:disabled {
	cursor: not-allowed;
	opacity: 0.5;
}

.warm-up__slider:disabled::-webkit-slider-thumb {
	transform: none;
}

/* Padded by half a thumb and zero-width per label, so each number sits centred
   under the thumb position it names. */
.warm-up__ticks {
	display: flex;
	justify-content: space-between;
	padding: 0 calc(16px / 2);
	font-size: 0.68rem;
	color: rgba(255, 255, 255, 0.45);
	font-variant-numeric: tabular-nums;
}

.warm-up__ticks span {
	display: flex;
	justify-content: center;
	width: 0;
}

@media (prefers-reduced-motion: reduce) {
	.warm-up__slider::-webkit-slider-thumb {
		transition: none;
	}
}
</style>
