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
				{{ $t('help.title') }}
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
			<div class="help-panels">
				<div
					v-show="active === 'general'"
					id="help-panel-general"
					role="tabpanel"
					aria-labelledby="help-tab-general"
					tabindex="0"
				>
					<span class="heading">{{
						$t('help.general.iracingSettings')
					}}</span>
					<ul>
						<li>{{ $t('help.general.borderless') }}</li>
						<li>{{ $t('help.general.vram') }}</li>
						<li>{{ $t('help.general.newerContent') }}</li>
						<li>{{ $t('help.general.shrinkUi') }}</li>
					</ul>
					<span class="heading">{{
						$t('help.general.screenshotFolder')
					}}</span>
					<p>{{ $t('help.general.screenshotFolderBody') }}</p>
					<span class="heading">{{
						$t('help.general.screenshotHotkey')
					}}</span>
					<p>{{ $t('help.general.screenshotHotkeyBody') }}</p>
					<span class="heading">{{ $t('help.general.issues') }}</span>
					<p>
						{{ $t('help.general.issuesBody') }}
						<a @click="openDiscord">{{ $t('help.general.discord') }}</a>
					</p>
					<span class="heading">{{
						$t('help.general.instructions')
					}}</span>
					<ol>
						<li v-html="$t('help.general.step1')"></li>
						<li>{{ $t('help.general.step2') }}</li>
						<li>{{ $t('help.general.step3') }}</li>
						<li>{{ $t('help.general.step4') }}</li>
						<li>{{ $t('help.general.step5') }}</li>
						<li>{{ $t('help.general.step6') }}</li>
						<li>{{ $t('help.general.step7') }}</li>
					</ol>
				</div>

				<div
					v-show="active === 'long-exposure'"
					id="help-panel-long-exposure"
					role="tabpanel"
					aria-labelledby="help-tab-long-exposure"
					tabindex="0"
				>
					<span class="heading">{{
						$t('help.longExposure.whatItDoes')
					}}</span>
					<p>{{ $t('help.longExposure.whatItDoesBody') }}</p>

					<span class="heading">{{
						$t('help.longExposure.shutter')
					}}</span>
					<p v-html="$t('help.longExposure.shutterBody')"></p>

					<span class="heading">{{
						$t('help.longExposure.playback')
					}}</span>
					<p>{{ $t('help.longExposure.playbackBody') }}</p>
					<p v-html="$t('help.longExposure.playbackAutoBody')"></p>

					<span class="heading">{{
						$t('help.longExposure.weighting')
					}}</span>
					<p v-html="$t('help.longExposure.weightingBody')"></p>

					<span class="heading">{{
						$t('help.longExposure.interpolation')
					}}</span>
					<p>{{ $t('help.longExposure.interpolationBody') }}</p>
					<p v-html="$t('help.longExposure.interpolationCostBody')"></p>

					<span class="heading">{{ $t('help.longExposure.passes') }}</span>
					<p>{{ $t('help.longExposure.passesBody') }}</p>
					<p>{{ $t('help.longExposure.passesTradeBody') }}</p>

					<span class="heading">{{
						$t('help.longExposure.bracket')
					}}</span>
					<p>{{ $t('help.longExposure.bracketBody') }}</p>
					<p>{{ $t('help.longExposure.bracketCostBody') }}</p>
					<p>{{ $t('help.longExposure.bracketMemoryBody') }}</p>
					<p>{{ $t('help.longExposure.bracketNamingBody') }}</p>

					<span class="heading">{{
						$t('help.longExposure.highlights')
					}}</span>
					<p>{{ $t('help.longExposure.highlightsBody') }}</p>

					<span class="heading">{{
						$t('help.longExposure.whatItSaves')
					}}</span>
					<p>{{ $t('help.longExposure.whatItSavesBody') }}</p>
					<p>{{ $t('help.longExposure.whatItSavesPngBody') }}</p>

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
		};
	},
	computed: {
		// A computed, not data: the labels have to re-read when the language
		// changes, and data() runs once.
		tabs(): { id: string; label: string }[] {
			return [
				{ id: 'general', label: this.$t('help.tabGeneral') },
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
