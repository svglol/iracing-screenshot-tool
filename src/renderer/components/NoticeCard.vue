<template>
	<div
		v-if="ordered.length > 0"
		class="notice-card"
		:class="'notice-card--' + level"
		:role="level === 'danger' ? 'alert' : 'status'"
		aria-live="polite"
	>
		<!-- One notice reads as a sentence, not a list of one. -->
		<div v-if="ordered.length === 1" class="notice-card__row">
			<font-awesome-icon
				:icon="iconFor(ordered[0].level)"
				class="notice-card__icon"
				:class="'is-' + ordered[0].level"
				aria-hidden="true"
			/>
			<span class="notice-card__text">
				{{ ordered[0].text }}
				<a
					v-if="ordered[0].action"
					class="notice-card__action"
					role="button"
					tabindex="0"
					@click="ordered[0].action.run()"
					@keydown.enter.prevent="ordered[0].action.run()"
					@keydown.space.prevent="ordered[0].action.run()"
				>
					{{ ordered[0].action.label }}
				</a>
			</span>
		</div>

		<template v-else>
			<div class="notice-card__head">
				<font-awesome-icon
					:icon="iconFor(level)"
					class="notice-card__icon"
					:class="'is-' + level"
					aria-hidden="true"
				/>
				<span class="notice-card__title">{{ resolvedTitle }}</span>
				<!-- How many are folded into this card, so a growing list is
				     noticeable without re-reading it. -->
				<span class="notice-card__count">{{ ordered.length }}</span>
			</div>
			<ul class="notice-card__list">
				<li
					v-for="(notice, index) in ordered"
					:key="index"
					class="notice-card__row"
				>
					<font-awesome-icon
						:icon="iconFor(notice.level)"
						class="notice-card__icon"
						:class="'is-' + notice.level"
						aria-hidden="true"
					/>
					<span class="notice-card__text">
						{{ notice.text }}
						<a
							v-if="notice.action"
							class="notice-card__action"
							role="button"
							tabindex="0"
							@click="notice.action.run()"
							@keydown.enter.prevent="notice.action.run()"
							@keydown.space.prevent="notice.action.run()"
						>
							{{ notice.action.label }}
						</a>
					</span>
				</li>
			</ul>
		</template>
	</div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';

export type NoticeLevel = 'danger' | 'warning' | 'info';

export interface Notice {
	level: NoticeLevel;
	text: string;
	// Optional inline affordance, e.g. the VRAM banner's "Switch to 4k".
	action?: { label: string; run: () => void };
}

// Most severe first. Also the card's own accent: a card containing an error is
// an error card, whatever else is in it.
const RANK: Record<NoticeLevel, number> = { danger: 0, warning: 1, info: 2 };

const ICONS: Record<NoticeLevel, string> = {
	danger: 'circle-exclamation',
	warning: 'triangle-exclamation',
	info: 'circle-info',
};

const TITLES: Record<NoticeLevel, string> = {
	danger: 'Problems',
	warning: 'Worth knowing',
	info: 'Notes',
};

// ONE card for every notice a panel wants to raise, replacing the stacks of
// <o-notification> this used to be.
//
// WHY. Seventeen of them across the sidebar could put six cards on screen at
// once, each with its own padding, border and background — so the thing that
// actually mattered (an exclusive-fullscreen capture that will come back black)
// competed for attention with a tip about cropping the watermark. Stacked
// full-bleed colour blocks also read as a wall rather than as a list.
//
// AND THE CONTRAST. The old rules coloured the message TEXT by severity
// (#ffdd57 / #ff6b6b / #3298dc) but only SideBar.vue's own notifications set a
// background, inline. LongExposurePanel's did not, so they kept Bulma's light
// is-warning panel and rendered #ffdd57 on it — yellow text on a yellow card.
// Here severity lives in the icon and the left rule, the message text is
// near-white on a fixed dark ground, and neither depends on a caller
// remembering an inline style.
export default defineComponent({
	name: 'NoticeCard',
	props: {
		notices: {
			type: Array as PropType<Notice[]>,
			default: () => [],
		},
		// Heading for the multi-notice form. Defaults to the top severity.
		title: { type: String, default: '' },
	},
	computed: {
		// Blank entries are dropped rather than rendered as empty rows: callers
		// build these from validation output, which can legitimately be empty.
		ordered(): Notice[] {
			return this.notices
				.filter((notice) => notice && notice.text && notice.text.trim())
				.slice()
				.sort((a, b) => RANK[a.level] - RANK[b.level]);
		},
		level(): NoticeLevel {
			return this.ordered.length > 0 ? this.ordered[0].level : 'info';
		},
		resolvedTitle(): string {
			return this.title || TITLES[this.level];
		},
	},
	methods: {
		iconFor(level: NoticeLevel): string {
			return ICONS[level];
		},
	},
});
</script>

<style scoped>
/* Fixed dark ground rather than a severity-tinted panel, so the message text can
   be near-white in every state.

   This chrome briefly lived in main.scss as a shared `.surface-card`, when the
   long-exposure panel had a summary card too. That card is gone, and a shared
   abstraction with one consumer is just indirection — so it is back here, scoped.

   MEASURED contrast against this ground, composited over the sidebar's
   rgba(0,0,0,0.5) and the lightest end of the body gradient (rgb(61,61,61)) —
   the worst case for light text. WCAG AA needs 4.5:1 for body text:
     message / title  rgba(255,255,255,0.92)  16.12:1  AAA
     action link      #ffffff                 19.07:1  AAA
     count chip       rgba(255,255,255,0.85)  13.78:1  AAA
     warning icon     #ffcf4d                 12.97:1  AAA
     info icon        #7cc4f0                 10.00:1  AAA
     danger icon      #ff8f8f                  8.70:1  AAA
   For scale, what this replaced measured 1.03:1 — #ffdd57 message text on
   Bulma 1.0's light is-warning panel, i.e. very nearly invisible.

   Severity is carried by the icon AND the left rule, never by colour alone. */
.notice-card {
	margin: 0.5rem 0;
	padding: 0.6rem 0.75rem;
	background: rgba(10, 10, 10, 0.72);
	border: 1px solid rgba(255, 255, 255, 0.1);
	border-left: 3px solid rgba(255, 255, 255, 0.25);
	border-radius: 4px;
	font-size: 0.78rem;
	line-height: 1.35;
}

.notice-card--danger {
	border-left-color: #ff8f8f;
}

.notice-card--warning {
	border-left-color: #ffcf4d;
}

.notice-card--info {
	border-left-color: #7cc4f0;
}

.notice-card__head {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	margin-bottom: 0.4rem;
	padding-bottom: 0.35rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.notice-card__title {
	font-weight: 600;
	color: rgba(255, 255, 255, 0.92);
}

.notice-card__count {
	margin-left: auto;
	min-width: 1.15rem;
	padding: 0 0.3rem;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.12);
	color: rgba(255, 255, 255, 0.85);
	font-size: 0.68rem;
	font-variant-numeric: tabular-nums;
	text-align: center;
}

.notice-card__list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.notice-card__row {
	display: flex;
	align-items: baseline;
	gap: 0.45rem;
}

.notice-card__list .notice-card__row + .notice-card__row {
	margin-top: 0.4rem;
	padding-top: 0.4rem;
	border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.notice-card__icon {
	flex: 0 0 auto;
	width: 0.8rem;
	font-size: 0.75rem;
}

.notice-card__icon.is-danger {
	color: #ff8f8f;
}

.notice-card__icon.is-warning {
	color: #ffcf4d;
}

.notice-card__icon.is-info {
	color: #7cc4f0;
}

/* The message itself is never severity-coloured — that was the readability
   problem. It is the highest-contrast thing in the card in every state. */
.notice-card__text {
	color: rgba(255, 255, 255, 0.92);
	min-width: 0;
}

.notice-card__action {
	display: inline-block;
	margin-left: 0.35rem;
	color: #ffffff;
	font-weight: 700;
	text-decoration: underline;
	cursor: pointer;
}

.notice-card__action:hover {
	color: rgba(255, 255, 255, 0.75);
}

.notice-card__action:focus-visible {
	outline: 1px solid rgba(255, 255, 255, 0.6);
	outline-offset: 2px;
}
</style>
