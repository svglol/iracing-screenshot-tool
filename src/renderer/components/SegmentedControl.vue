<template>
	<!-- A row of mutually exclusive buttons for a short list of choices that are
	     worth seeing at once. Native radios underneath, so arrow keys, the single
	     tab stop, the checked state and the disabled state all come from the
	     browser; each label is only the face of its radio. -->
	<div
		class="segmented"
		role="radiogroup"
		:aria-label="ariaLabel"
		:class="{ 'is-disabled': disabled }"
	>
		<label
			v-for="option in options"
			:key="String(option.value)"
			class="segmented__option"
			:class="{ 'is-selected': modelValue === option.value }"
			:title="option.title"
		>
			<input
				type="radio"
				class="segmented__input"
				:name="name"
				:checked="modelValue === option.value"
				:disabled="disabled"
				@change="$emit('update:modelValue', option.value)"
			/>
			<!-- Optional picture above the text, e.g. a curve for each weighting. -->
			<slot name="glyph" :option="option" />
			<span>{{ option.label }}</span>
		</label>
	</div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';

export interface SegmentedOption {
	value: string | number;
	label: string;
	// The longer description, shown on hover. The button text has to stay short
	// for several to fit side by side in the sidebar.
	title?: string;
	[extra: string]: unknown;
}

export default defineComponent({
	name: 'SegmentedControl',
	props: {
		modelValue: { type: [String, Number], default: null },
		options: { type: Array as PropType<SegmentedOption[]>, required: true },
		// Groups the radios. Must be unique on the page.
		name: { type: String, required: true },
		ariaLabel: { type: String, default: undefined },
		disabled: { type: Boolean, default: false },
	},
	emits: ['update:modelValue'],
});
</script>

<style scoped>
/* Light, like the white selects it sits among, so the sidebar column keeps one
   rhythm; the selected segment is filled with the primary colour the way an on
   switch is. Colours are explicit rather than Bulma scheme variables because the
   sidebar's fields are light inside a dark app. */
.segmented {
	display: flex;
	width: 100%;
	border: 1px solid hsl(0, 0%, 86%);
	border-radius: var(--bulma-radius, 0.375rem);
	overflow: hidden;
}

.segmented__option {
	position: relative;
	flex: 1 1 0;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.15rem;
	min-height: 2.5rem;
	padding: 0.3rem 0.25rem;
	background: #fff;
	color: hsl(0, 0%, 29%);
	font-size: 0.75rem;
	line-height: 1.1;
	font-variant-numeric: tabular-nums;
	cursor: pointer;
	transition:
		background-color 0.15s ease,
		color 0.15s ease;
}

.segmented__option + .segmented__option {
	border-left: 1px solid hsl(0, 0%, 86%);
}

.segmented__option:hover {
	background: hsl(0, 0%, 95%);
	color: hsl(0, 0%, 14%);
}

.segmented__option.is-selected,
.segmented__option.is-selected:hover {
	background: var(--bulma-primary, #ec202a);
	color: #fff;
}

/* The radio is the real control. Kept in the layout tree (not display:none) so it
   stays focusable and announced. */
.segmented__input {
	position: absolute;
	width: 1px;
	height: 1px;
	margin: 0;
	opacity: 0;
	pointer-events: none;
}

/* Inset so it shows on both the white and the red segment. */
.segmented__option:has(.segmented__input:focus-visible) {
	outline: 2px solid hsl(0, 0%, 14%);
	outline-offset: -4px;
}

.segmented__option.is-selected:has(.segmented__input:focus-visible) {
	outline-color: #fff;
}

.segmented.is-disabled .segmented__option {
	cursor: not-allowed;
	opacity: 0.5;
}

.segmented.is-disabled .segmented__option:not(.is-selected):hover {
	background: #fff;
	color: hsl(0, 0%, 29%);
}

@media (prefers-reduced-motion: reduce) {
	.segmented__option {
		transition: none;
	}
}
</style>
