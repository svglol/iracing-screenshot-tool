<template>
	<!-- A labelled slider over a short run of whole steps: the label and its value
	     on one line, the track, then a number under every stop. A plain range
	     input rather than an Oruga slider — that plugin is not registered, and the
	     native control brings arrow keys and a spoken value with it. -->
	<div class="field step-slider">
		<div class="step-slider__head">
			<label :for="id" class="label">{{ label }}</label>
			<output :for="id" class="step-slider__value">{{ readout }}</output>
		</div>
		<input
			:id="id"
			type="range"
			class="step-slider__input"
			:min="min"
			:max="max"
			:step="step"
			:value="modelValue"
			:disabled="disabled"
			:aria-valuetext="spoken || readout"
			:title="spoken || readout"
			:style="{ '--frac': fraction }"
			@input="onInput"
		/>
		<div class="step-slider__ticks" aria-hidden="true">
			<span v-for="tick in ticks" :key="tick">{{ tick }}</span>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'StepSlider',
	props: {
		modelValue: { type: Number, required: true },
		// Ties the label and the readout to the input. Must be unique on the page.
		id: { type: String, required: true },
		label: { type: String, required: true },
		min: { type: Number, default: 0 },
		max: { type: Number, required: true },
		step: { type: Number, default: 1 },
		// The short value beside the label, e.g. "Off" or "3 s".
		readout: { type: String, required: true },
		// What a screen reader announces and the hover shows, where it should say
		// more than the readout does. Falls back to the readout.
		spoken: { type: String, default: '' },
		disabled: { type: Boolean, default: false },
	},
	emits: ['update:modelValue'],
	computed: {
		ticks(): number[] {
			const ticks: number[] = [];
			for (let v = this.min; v <= this.max + 1e-9; v += this.step) {
				ticks.push(Math.round(v * 1000) / 1000);
			}
			return ticks;
		},
		fraction(): number {
			const span = this.max - this.min;
			return span > 0 ? (this.modelValue - this.min) / span : 0;
		},
	},
	methods: {
		onInput(event: Event) {
			this.$emit(
				'update:modelValue',
				Number((event.target as HTMLInputElement).value)
			);
		},
	},
});
</script>

<style scoped>
/* The track and thumb take the light field colours and the primary fill,
   matching the switches and the segmented controls. */
/* Last baseline, so when a long label wraps in the narrow sidebar the value sits
   on its final line, next to the track, not up beside the first. */
.step-slider__head {
	display: flex;
	align-items: last baseline;
	justify-content: space-between;
	gap: 0.5rem;
	margin-bottom: 0.35rem;
}

.step-slider__head .label {
	margin-bottom: 0;
}

.step-slider__value {
	font-size: 0.8rem;
	color: rgba(255, 255, 255, 0.85);
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.step-slider__input {
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
.step-slider__input:focus {
	outline: none;
}

/* The fill ends under the thumb's CENTRE, which travels from half a thumb in to
   half a thumb short of the end — not across the full track width. */
.step-slider__input::-webkit-slider-runnable-track {
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

.step-slider__input::-webkit-slider-thumb {
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

.step-slider__input:hover::-webkit-slider-thumb {
	transform: scale(1.12);
}

.step-slider__input:focus-visible::-webkit-slider-thumb {
	box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.55);
}

.step-slider__input:disabled {
	cursor: not-allowed;
	opacity: 0.5;
}

.step-slider__input:disabled::-webkit-slider-thumb {
	transform: none;
}

/* Padded by half a thumb and zero-width per label, so each number sits centred
   under the thumb position it names. */
.step-slider__ticks {
	display: flex;
	justify-content: space-between;
	padding: 0 calc(16px / 2);
	font-size: 0.68rem;
	color: rgba(255, 255, 255, 0.45);
	font-variant-numeric: tabular-nums;
}

.step-slider__ticks span {
	display: flex;
	justify-content: center;
	width: 0;
}

@media (prefers-reduced-motion: reduce) {
	.step-slider__input::-webkit-slider-thumb {
		transition: none;
	}
}
</style>
