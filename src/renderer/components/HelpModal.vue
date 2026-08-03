<template>
	<div
		class="modal-card"
		style="width: 100%; height: 80vh; background: rgb(37, 37, 37) !important"
	>
		<header
			class="modal-card-head"
			style="background-color: rgba(0, 0, 0, 0.2); border-bottom: 0"
		>
			<p
				class="modal-card-title"
				style="color: white; font-weight: 700; margin-bottom: 0rem"
			>
				Help
			</p>
			<button type="button" class="delete" @click="$emit('close')" />
		</header>
		<section class="modal-card-body help-body">
			<!-- Hand-rolled rather than <o-tabs>. Oruga component PLUGINS have to be
			     registered in main.ts, Tabs is not among them, and passing an
			     unregistered component silently renders nothing rather than failing
			     the build — a runtime-only failure this modal would wear. Two tabs of
			     real buttons cost less than that risk and style cleanly on the dark
			     card. -->
			<div class="help-tabs" role="tablist" aria-label="Help sections">
				<button
					v-for="(tab, index) in tabs"
					:id="'help-tab-' + tab.id"
					:key="tab.id"
					type="button"
					role="tab"
					class="help-tab"
					:class="{ 'is-active': active === tab.id }"
					:aria-selected="active === tab.id"
					:aria-controls="'help-panel-' + tab.id"
					:tabindex="active === tab.id ? 0 : -1"
					@click="active = tab.id"
					@keydown.left.prevent="step(index, -1)"
					@keydown.right.prevent="step(index, 1)"
					@keydown.home.prevent="step(index, -index)"
					@keydown.end.prevent="step(index, tabs.length - 1 - index)"
				>
					{{ tab.label }}
				</button>
			</div>

			<div class="help-panels">
				<div
					v-show="active === 'general'"
					id="help-panel-general"
					role="tabpanel"
					aria-labelledby="help-tab-general"
					tabindex="0"
				>
					<span class="heading">iRacing Settings</span>
					<ul>
						<li>iRacing must be running in Windowed Borderless</li>
						<li>
							At least 8GB of VRAM is recommended for screenshots of 8k
							resolution or higher
						</li>
						<li>Newer tracks and cars will require more VRAM</li>
						<li>
							Shrink the UI to the smallest it can go before taking a
							screenshot if using the Crop Watermark option,
							"Control+PageDown" will shrink it, if this doesnt work you
							may need to reset your UI Zoom in the iRacing settings
						</li>
					</ul>
					<span class="heading">Screenshot Folder</span>
					<p>
						Screenshots will be saved by default to
						"C:\Users\user\Pictures\Screenshots" this can be changed in
						the settings
					</p>
					<span class="heading">Screenshot Hotkey</span>
					<p>
						By default "Control + PrintScreen" will take a screenshot with
						the current settings, this can be changed in the settings.
					</p>
					<span class="heading">Issues</span>
					<p>
						If you have any issues please report them on the
						<a @click="openDiscord">Discord</a>
					</p>
					<span class="heading">Instructions</span>
					<ol>
						<li>
							iRacing <b>must</b> be running in Windowed Borderless Mode
						</li>
						<li>
							Run iRacing and setup the camera in the position you want
							to take the screenshot
						</li>
						<li>
							Select your desired resolution (Try lower resolutions
							before going to 8K)
						</li>
						<li>
							Select if you want to crop the iRacing watermark or not, if
							you want to crop it you will need to resize the iRacing UI
							with 'Control + PageDown' to the smallest size first
						</li>
						<li>
							Press the screenshot button or use the Hotkey 'Control +
							PrintScreen' to take the screenshots
						</li>
						<li>
							Depending on the resolution selected this may take a few
							seconds, once your iRacing screen resizes to its normal
							size it is finished
						</li>
						<li>
							Your screenshot will be saved to
							'C:\Users\{User}\Pictures\Screenshots'
						</li>
					</ol>
				</div>

				<div
					v-show="active === 'long-exposure'"
					id="help-panel-long-exposure"
					role="tabpanel"
					aria-labelledby="help-tab-long-exposure"
					tabindex="0"
				>
					<span class="heading">What it does</span>
					<p>
						A long exposure blends many frames of a replay into one image,
						the way leaving a camera shutter open does: stationary things
						stay sharp, moving things streak. The tool drives the replay
						itself, captures every frame the sim presents, and adds them
						up on the GPU.
					</p>
					<span class="heading">Shutter</span>
					<p>
						How long the exposure lasts <i>in replay time</i>, from a
						fraction of one replay frame up to ten seconds. This is the
						setting that decides how long the streaks are. Longer shutters
						also collect more frames, so they need less help from
						everything below; the fastest stops span a single replay frame
						and collect only a handful of samples.
					</p>

					<span class="heading">Playback speed</span>
					<p>
						The replay is played in slow motion while the exposure is
						captured, so the sim presents more frames per second of replay
						time and the blend gets more samples. 1/16 collects roughly
						sixteen times as many frames as real time — and takes sixteen
						times as long in wall clock. This is the main trade in the
						panel: patience for smoothness.
					</p>
					<p>
						"Auto (from sample target)" picks the speed for you from
						<b>Target samples</b>: the tool solves for the fastest
						playback that still reaches the number you asked for. Set an
						explicit speed instead if you would rather cap the wait.
					</p>

					<span class="heading">Weighting</span>
					<p>
						How much each captured frame contributes to the result.
						<b>Box</b> weights them all equally, giving an even streak.
						<b>Linear</b> ramps toward the end of the window, so the
						subject is sharpest where it finished and fades back along its
						path. <b>Ease</b> is the same idea with a sharper head and a
						longer tail.
					</p>

					<span class="heading">Frame interpolation</span>
					<p>
						Invents extra frames between the real ones using the GPU's
						optical-flow engine, filling in the gaps along the streak.
						Requires an NVIDIA Turing or newer card and is hidden entirely
						on hardware that cannot do it.
					</p>
					<p>
						It is not free: it costs GPU time on every captured frame, and
						the budget is one iRacing frame. If it cannot keep up it
						starts missing <i>real</i> frames in order to manufacture
						synthetic ones, which is a net loss — the streak comes out
						shorter and coarser. The cost scales with megapixels times the
						factor, so what is comfortable at 2560×1440 is not viable at
						8K. To check it, shoot the same moment twice with it on and
						off and compare the real sample counts; the app also warns you
						afterwards if a shot fell short.
					</p>

					<span class="heading">Passes</span>
					<p>
						Visits the same moment several times, accumulating into one
						image. Each pass catches frames the others happened to miss,
						so the streak gets smoother — not brighter, because the result
						is normalised by how much light actually landed on each pixel.
					</p>
					<p>
						Passes buy the same thing interpolation does, with a different
						currency: wall clock instead of GPU time. Eight passes take
						roughly eight times as long, but they can never cost you real
						frames. That makes them the right lever at high resolutions,
						where interpolation cannot keep up, and on fast shutters,
						where a single pass collects very few samples. Using both at
						once is usually the worst of the trade — they compete for the
						same per-frame budget.
					</p>

					<span class="heading">Bracket shutters</span>
					<p>
						Emits one image per shutter stop at or faster than the one you
						chose, from a single capture. A shot at 1/60 also gives you
						1/125, 1/250, 1/500 and 1/1000 — the same moment with
						progressively shorter streaks — so you can pick the look
						afterwards instead of guessing and re-shooting.
					</p>
					<p>
						It costs almost no extra time. Every stop ends on the same
						frame and differs only in how far back it reaches, so a faster
						shutter is simply the tail of the frames already going past —
						they are all filled from one pass of the replay.
					</p>
					<p>
						What it does cost is memory. Each stop needs its own
						full-resolution accumulator, so eleven stops need eleven times
						the video memory of one, which at 8K is more than most cards
						have. The capture checks this before it starts and refuses
						rather than crashing iRacing, so if a bracket is declined,
						lower the resolution or pick a faster shutter — which is also
						a shorter ladder.
					</p>
					<p>
						The stop you chose is saved under the usual name and is the
						one that appears in the gallery; the others sit beside it with
						their shutter in the filename.
					</p>

					<span class="heading">Highlight recovery</span>
					<p>
						Boosts near-clipped highlights before the frames are added up,
						then undoes the boost at the end. iRacing hands over an image
						that has already been tonemapped, so a headlight and a white
						wall arrive at the same value; averaging that makes a bright
						light sweeping through part of the exposure read as a grey
						smudge rather than a bright trail. This puts the non-linearity
						back where a real sensor has it. Measured in stops; 0 is off
						and changes nothing at all.
					</p>

					<span class="heading">What it saves</span>
					<p>
						Size, watermark cropping and file format all follow the same
						controls a normal screenshot uses — the Resolution and Crop
						Watermark settings above, and the output format in Settings.
						The Output line at the top of the sidebar shows exactly what
						you will get.
					</p>
					<p>
						Choosing PNG writes a true 16-bit master, which is worth it if
						you intend to grade the shot afterwards, plus an 8-bit preview
						for the gallery. It is also much slower to write at high
						resolutions — a 33-megapixel 16-bit PNG takes around ten
						seconds where the same frame as JPEG takes under one.
					</p>

					<span class="heading">If the result looks wrong</span>
					<ul>
						<li>
							<b>Discrete ghosts instead of a smooth streak</b> — too few
							samples. Use a slower playback speed, more passes, or a
							lower resolution.
						</li>
						<li>
							<b>Not sure which shutter you wanted</b> — turn on Bracket
							shutters and decide afterwards, for the same wait.
						</li>
						<li>
							<b>Blown-out or flat highlights</b> — try 3 to 5 stops of
							highlight recovery.
						</li>
						<li>
							<b>A black image</b> — iRacing is in exclusive fullscreen.
							Set Display &gt; Full Screen to OFF.
						</li>
						<li>
							Every shot records the exact settings it used, the sample
							count and how evenly the samples landed, as a .json file in
							the log folder alongside app.log. The last 20 shots are
							kept — a bracket counts as one — so the shot you are asking
							about is still there while you are asking about it.
						</li>
					</ul>
				</div>
			</div>
		</section>
	</div>
</template>

<script lang="ts">
const { shell } = require('electron');

export default {
	data() {
		return {
			active: 'general',
			tabs: [
				{ id: 'general', label: 'General' },
				{ id: 'long-exposure', label: 'Long Exposure' },
			],
		};
	},
	methods: {
		openDiscord() {
			shell.openExternal('https://discord.gg/GX2kSgN');
		},
		// Arrow/Home/End move between tabs, per the WAI-ARIA tabs pattern: only the
		// selected tab is in the tab order (tabindex 0 vs -1), so the arrow keys are
		// the only way to reach the other one from the keyboard. Focus has to follow
		// the selection or the user is left typing at a tab that is no longer active.
		step(fromIndex: number, delta: number) {
			const count = this.tabs.length;
			const next = (((fromIndex + delta) % count) + count) % count;
			const id = this.tabs[next].id;
			this.active = id;
			// Looked up by id rather than through a v-for `ref` array: Vue 3 does
			// not guarantee such an array is in source order, and the ids are
			// already stable because aria-controls needs them.
			this.$nextTick(() => {
				document.getElementById(`help-tab-${id}`)?.focus();
			});
		},
	},
};
</script>

<style scoped>
/* The tab strip stays put while the panel scrolls under it — otherwise the only
   way back to the other tab is to scroll to the top of a long page of text. The
   card is a fixed 80vh, so the panel has a bounded height to scroll within. */
.help-body {
	background-color: transparent;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	min-height: 0;
}

.help-panels {
	flex: 1 1 auto;
	min-height: 0;
	overflow-y: auto;
}

.help-tabs {
	flex: 0 0 auto;
	display: flex;
	gap: 0.25rem;
	margin-bottom: 1rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

/* Reset the component's own `button` rule below, which is sized for the 30px
   close glyph in the header and would otherwise clip these to a square. */
.help-tab {
	width: auto;
	max-width: none;
	height: auto;
	max-height: none;
	padding: 0.45rem 0.9rem;
	font-size: 0.85rem;
	font-weight: 600;
	color: rgba(255, 255, 255, 0.55);
	background: transparent;
	border: 0;
	border-bottom: 2px solid transparent;
	margin-bottom: -1px;
	cursor: pointer;
}

.help-tab:hover {
	color: rgba(255, 255, 255, 0.85);
}

.help-tab.is-active {
	color: #ffffff;
	border-bottom-color: #ec202a;
}

.help-tab:focus-visible {
	outline: 1px solid rgba(255, 255, 255, 0.6);
	outline-offset: -2px;
}

/* The panel is focusable (tabindex 0) so a keyboard user can scroll it, but it
   is a container, not a control — no focus ring styling beyond the default. */
.heading {
	font-size: 0.75rem;
	font-weight: 700;
}

ul {
	list-style-type: disc;
	margin-left: 2rem;
}

li {
	color: #aaaaaa;
	overflow-wrap: anywhere;
}

p {
	margin-bottom: 1rem;
	color: #aaaaaa;
	overflow-wrap: anywhere;
}

/* Inline emphasis inside the help copy. The global `p` colour is #aaaaaa, so
   bold alone barely reads as emphasis against it. */
p b,
li b {
	color: rgba(255, 255, 255, 0.9);
}

a {
	overflow-wrap: anywhere;
	cursor: pointer;
}

button {
	background-color: transparent;
	border: 0px;
	color: white;
	font-size: 2rem;
	padding: 0px;
	margin: 0px;
	text-align: left;
	height: 30px;
	max-height: 30px;
	max-width: 30px;
	width: 30px;
}

ol {
	list-style: none;
	counter-reset: li;
}

ol li {
	margin-left: 2rem;
}

ol li::before {
	content: counter(li);
	color: white;
	display: inline-block;
	width: 1em;
	margin-left: -1em;
}

li {
	counter-increment: li;
}
</style>
