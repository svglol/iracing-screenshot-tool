<template>
	<div class="help-page">
		<!-- Sticky so the section tabs stay reachable while a long panel
		     scrolls — otherwise the only way back to another section is to
		     scroll to the top. Solid background because content passes
		     beneath; #252525 is the window backgroundColor from main. -->
		<header class="help-page__header">
			<span class="help-page__title">{{ $t('help.title') }}</span>
			<!-- Hand-rolled rather than <o-tabs>. Oruga component PLUGINS have
			     to be registered in main.ts, Tabs is not among them, and passing
			     an unregistered component silently renders nothing rather than
			     failing the build — a runtime-only failure this page would wear.
			     Three tabs of real buttons cost less than that risk. -->
			<div
				class="help-tabs"
				role="tablist"
				:aria-label="$t('help.sections')"
			>
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
		</header>

		<!-- v-html on the prose paragraphs that carry inline <b>/<i> emphasis.
		     The emphasis is not decoration here — "<b>Box</b> weights them all
		     equally" is naming a control — and splitting each sentence into three
		     keys around it would hand translators fragments they cannot reorder,
		     which is exactly the word order most of these languages need to change.

		     The XSS rule is disabled DELIBERATELY and only here. Its premise is
		     that the string might be attacker-influenced; every string below comes
		     from $t, which reads a compile-time catalogue in this repo. No user
		     input, no file content and no network response can reach these keys —
		     the only way to get markup in is to commit it. If that ever stops being
		     true (a downloaded or user-supplied translation, say), this block has to
		     go back to interpolation. -->
		<!-- eslint-disable vue/no-v-html -->
		<div
			v-show="active === 'general'"
			id="help-panel-general"
			role="tabpanel"
			aria-labelledby="help-tab-general"
			tabindex="0"
			class="help-panel"
		>
			<section class="help-block">
				<span class="heading">{{
					$t('help.general.iracingSettings')
				}}</span>
				<ul>
					<li>{{ $t('help.general.borderless') }}</li>
					<li>{{ $t('help.general.vram') }}</li>
					<li>{{ $t('help.general.newerContent') }}</li>
					<li>{{ $t('help.general.shrinkUi') }}</li>
				</ul>
			</section>
			<section class="help-block">
				<span class="heading">{{
					$t('help.general.screenshotFolder')
				}}</span>
				<p>{{ $t('help.general.screenshotFolderBody') }}</p>
			</section>
			<section class="help-block">
				<span class="heading">{{
					$t('help.general.screenshotHotkey')
				}}</span>
				<p>{{ $t('help.general.screenshotHotkeyBody') }}</p>
			</section>
			<section class="help-block">
				<span class="heading">{{ $t('help.general.issues') }}</span>
				<p>
					{{ $t('help.general.issuesBody') }}
					<a @click="openDiscord">{{ $t('help.general.discord') }}</a>
				</p>
			</section>
			<section class="help-block">
				<span class="heading">{{ $t('help.general.instructions') }}</span>
				<ol>
					<li v-html="$t('help.general.step1')"></li>
					<li>{{ $t('help.general.step2') }}</li>
					<li>{{ $t('help.general.step3') }}</li>
					<li>{{ $t('help.general.step4') }}</li>
					<li>{{ $t('help.general.step5') }}</li>
					<li>{{ $t('help.general.step6') }}</li>
					<li>{{ $t('help.general.step7') }}</li>
				</ol>
			</section>
		</div>

		<!-- An accordion of native <details>. The name attribute makes the group
		     exclusive — opening one closes the others — in the engine itself
		     (Chromium 120+; Electron ships far newer), so there is no open-state
		     to script and <summary> brings the disclosure keyboard/AT semantics
		     with it. Single stack, not columns: an item expanding in one column
		     would reflow the neighbouring column mid-read. -->
		<div
			v-show="active === 'faq'"
			id="help-panel-faq"
			role="tabpanel"
			aria-labelledby="help-tab-faq"
			tabindex="0"
			class="help-panel help-panel--stack"
		>
			<details class="help-faq" name="help-faq">
				<summary class="help-faq__question">
					{{ $t('help.faq.blackShot') }}
				</summary>
				<div class="help-faq__answer">
					<p>{{ $t('help.faq.blackShotBody') }}</p>
					<p v-html="$t('help.faq.blackShotFullscreenBody')"></p>
				</div>
			</details>
			<details class="help-faq" name="help-faq">
				<summary class="help-faq__question">
					{{ $t('help.faq.cameraReset') }}
				</summary>
				<div class="help-faq__answer">
					<p>{{ $t('help.faq.cameraResetBody') }}</p>
					<p v-html="$t('help.faq.cameraResetFixBody')"></p>
				</div>
			</details>
		</div>

		<div
			v-show="active === 'long-exposure'"
			id="help-panel-long-exposure"
			role="tabpanel"
			aria-labelledby="help-tab-long-exposure"
			tabindex="0"
			class="help-panel"
		>
			<section class="help-block">
				<span class="heading">{{
					$t('help.longExposure.whatItDoes')
				}}</span>
				<p>{{ $t('help.longExposure.whatItDoesBody') }}</p>
			</section>
			<section class="help-block">
				<span class="heading">{{ $t('help.longExposure.shutter') }}</span>
				<p v-html="$t('help.longExposure.shutterBody')"></p>
			</section>
			<section class="help-block">
				<span class="heading">{{ $t('help.longExposure.playback') }}</span>
				<p>{{ $t('help.longExposure.playbackBody') }}</p>
				<p v-html="$t('help.longExposure.playbackAutoBody')"></p>
			</section>
			<section class="help-block">
				<span class="heading">{{ $t('help.longExposure.weighting') }}</span>
				<p v-html="$t('help.longExposure.weightingBody')"></p>
			</section>
			<section class="help-block">
				<span class="heading">{{
					$t('help.longExposure.interpolation')
				}}</span>
				<p>{{ $t('help.longExposure.interpolationBody') }}</p>
				<p v-html="$t('help.longExposure.interpolationCostBody')"></p>
			</section>
			<section class="help-block">
				<span class="heading">{{ $t('help.longExposure.passes') }}</span>
				<p>{{ $t('help.longExposure.passesBody') }}</p>
				<p>{{ $t('help.longExposure.passesTradeBody') }}</p>
			</section>
			<section class="help-block">
				<span class="heading">{{ $t('help.longExposure.bracket') }}</span>
				<p>{{ $t('help.longExposure.bracketBody') }}</p>
				<p>{{ $t('help.longExposure.bracketCostBody') }}</p>
				<p>{{ $t('help.longExposure.bracketMemoryBody') }}</p>
				<p>{{ $t('help.longExposure.bracketNamingBody') }}</p>
			</section>
			<section class="help-block">
				<span class="heading">{{
					$t('help.longExposure.highlights')
				}}</span>
				<p>{{ $t('help.longExposure.highlightsBody') }}</p>
			</section>
			<section class="help-block">
				<span class="heading">{{
					$t('help.longExposure.whatItSaves')
				}}</span>
				<p>{{ $t('help.longExposure.whatItSavesBody') }}</p>
				<p>{{ $t('help.longExposure.whatItSavesPngBody') }}</p>
			</section>
			<section class="help-block">
				<span class="heading">{{
					$t('help.longExposure.troubleshooting')
				}}</span>
				<ul>
					<li v-html="$t('help.longExposure.troubleGhosts')"></li>
					<li v-html="$t('help.longExposure.troubleShutter')"></li>
					<li v-html="$t('help.longExposure.troubleHighlights')"></li>
					<li v-html="$t('help.longExposure.troubleBlack')"></li>
					<li>{{ $t('help.longExposure.troubleSidecar') }}</li>
				</ul>
			</section>
		</div>
	</div>
</template>

<script lang="ts">
// The Help page: the former F1 modal's content laid out as a rail destination.
// Full-bleed like the configuration editor page — the prose flows into 30rem
// columns, so a wide window fills with two or three columns instead of framing
// a dialog-width card in empty space.
const { shell } = require('electron');

export default {
	name: 'HelpPage',
	data() {
		return {
			active: 'general',
		};
	},
	computed: {
		// A computed, not data: the labels have to re-read when the language
		// changes, and data() runs once.
		tabs(): { id: string; label: string }[] {
			return [
				{ id: 'general', label: this.$t('help.tabGeneral') },
				{ id: 'faq', label: this.$t('help.tabFaq') },
				{
					id: 'long-exposure',
					label: this.$t('help.tabLongExposure'),
				},
			];
		},
	},
	methods: {
		openDiscord() {
			shell.openExternal('https://discord.gg/GX2kSgN');
		},
		// Arrow/Home/End move between tabs, per the WAI-ARIA tabs pattern: only the
		// selected tab is in the tab order (tabindex 0 vs -1), so the arrow keys are
		// the only way to reach the others from the keyboard. Focus has to follow
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
.help-page {
	height: calc(100vh - var(--titlebar-height, 24px));
	overflow-y: auto;
	padding: 0 1.25rem 3rem;
	color: white;
}

.help-page__header {
	position: sticky;
	top: 0;
	z-index: 1;
	background: #252525;
	padding-top: 1rem;
	margin-bottom: 1rem;
}

.help-page__title {
	display: block;
	font-size: 1.35rem;
	font-weight: 700;
	margin-bottom: 0.75rem;
}

.help-tabs {
	display: flex;
	gap: 0.25rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.help-tab {
	background: none;
	border: none;
	border-bottom: 2px solid transparent;
	color: rgba(255, 255, 255, 0.65);
	padding: 0.4rem 0.9rem;
	cursor: pointer;
	font-size: 0.9rem;
}

.help-tab:hover {
	color: rgba(255, 255, 255, 0.9);
}

.help-tab.is-active {
	color: white;
	border-bottom-color: #ec202a;
	font-weight: 600;
}

.help-tab:focus-visible {
	outline: 1px solid rgba(255, 255, 255, 0.6);
	outline-offset: -2px;
}

/* `columns: <width>` rather than a count: the browser fits as many 34rem
   columns as the window allows — one on a small window, two or three on a
   wide one — with no media-query ladder to maintain. 34rem holds the line
   at ~65ch of the 1.05rem body type, a comfortable measure.

   The panel is focusable (tabindex 0) so a keyboard user can scroll it, but
   it is a container, not a control — no focus ring styling beyond the
   default. */
.help-panel {
	columns: 34rem;
	column-gap: 4rem;
}

/* A heading never separates from its body across a column break. */
.help-block {
	break-inside: avoid;
	margin-bottom: 2rem;
}

.help-panel--stack {
	columns: auto;
	max-width: 46rem;
}

.help-faq {
	border: 1px solid rgba(255, 255, 255, 0.1);
	border-radius: 0.5rem;
	background: rgba(0, 0, 0, 0.15);
	margin-bottom: 0.75rem;
}

.help-faq__question {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 0.85rem 1.1rem;
	cursor: pointer;
	font-size: 1.05rem;
	font-weight: 600;
	color: rgba(255, 255, 255, 0.9);
	/* Suppress the default triangle marker; the chevron below replaces it. */
	list-style: none;
}

.help-faq__question::-webkit-details-marker {
	display: none;
}

.help-faq__question:focus-visible {
	outline: 1px solid rgba(255, 255, 255, 0.6);
	outline-offset: -2px;
}

.help-faq__question::after {
	content: '';
	flex: 0 0 auto;
	width: 0.5rem;
	height: 0.5rem;
	border-right: 2px solid rgba(255, 255, 255, 0.55);
	border-bottom: 2px solid rgba(255, 255, 255, 0.55);
	/* Points down while closed, up while open. */
	transform: rotate(45deg);
	transition: transform 0.15s ease;
}

.help-faq[open] > .help-faq__question::after {
	transform: rotate(225deg);
}

/* The paragraphs' own 1rem bottom margin provides the bottom padding. */
.help-faq__answer {
	padding: 0 1.1rem;
}

/* Bulma's .heading helper is an 11px uppercase micro-label — right for a form
   caption, cramped for a manual. Restyled as a real section heading. */
.heading {
	font-size: 1.15rem;
	font-weight: 600;
	text-transform: none;
	letter-spacing: normal;
	color: #ffffff;
	margin-bottom: 0.5rem;
}

ul {
	list-style-type: disc;
	margin-left: 2rem;
}

li {
	color: #b3b3b3;
	font-size: 1.05rem;
	line-height: 1.65;
	overflow-wrap: anywhere;
}

li + li {
	margin-top: 0.4rem;
}

p {
	margin-bottom: 1rem;
	color: #b3b3b3;
	font-size: 1.05rem;
	line-height: 1.65;
	overflow-wrap: anywhere;
}

/* Inline emphasis inside the help copy. The body colour is #b3b3b3, so bold
   alone barely reads as emphasis against it. */
p b,
li b {
	color: rgba(255, 255, 255, 0.9);
}

a {
	overflow-wrap: anywhere;
	cursor: pointer;
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
