<template>
	<div v-if="physical.length > 0" class="monitor-layout">
		<span class="monitor-layout__title">{{
			$t('iniEditor.layout.title')
		}}</span>
		<svg
			class="monitor-layout__svg"
			:viewBox="viewBox"
			preserveAspectRatio="xMidYMid meet"
			role="img"
		>
			<g v-for="(display, index) in physical" :key="display.id">
				<rect
					class="monitor-layout__display"
					:x="display.x"
					:y="display.y"
					:width="display.w"
					:height="display.h"
					:rx="corner"
				/>
				<text
					class="monitor-layout__number"
					:x="display.x + display.w / 2"
					:y="display.y + display.h / 2"
					:font-size="numberSize"
					text-anchor="middle"
					dominant-baseline="central"
				>
					{{ index + 1 }}
				</text>
				<text
					class="monitor-layout__caption"
					:x="display.x + padding"
					:y="display.y + padding + labelSize"
					:font-size="labelSize"
				>
					{{ display.x }},{{ display.y }}
				</text>
				<text
					class="monitor-layout__caption"
					:x="display.x + display.w / 2"
					:y="display.y + display.h - padding"
					:font-size="labelSize"
					text-anchor="middle"
				>
					{{ display.w }}×{{ display.h }}
					{{
						display.primary ? '· ' + $t('iniEditor.layout.primary') : ''
					}}
				</text>
			</g>
			<rect
				v-if="windowRect"
				class="monitor-layout__window"
				:x="windowRect.x"
				:y="windowRect.y"
				:width="windowRect.width"
				:height="windowRect.height"
				:stroke-width="strokeWidth"
				:stroke-dasharray="strokeWidth * 3"
			>
				<title>{{ $t('iniEditor.layout.windowTarget') }}</title>
			</rect>
		</svg>
		<p class="monitor-layout__note">{{ $t('iniEditor.layout.estimated') }}</p>
	</div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';

interface DisplayInfo {
	id: number;
	bounds: { x: number; y: number; width: number; height: number };
	scaleFactor: number;
	internal: boolean;
}

interface PhysicalRect {
	id: number;
	x: number;
	y: number;
	w: number;
	h: number;
	primary: boolean;
}

// Draws the OS display arrangement (numbered, irSidekick-style) with the
// iRacing window target overlaid from the edit buffer's [Display] values, so
// dragging windowedXPos live moves the outline. Electron reports DIP bounds;
// each display's own scaleFactor approximates physical pixels — good enough
// for orientation, hence the "estimated" note (mixed-DPI arrangements shift
// origins in ways only a real WinAPI enumeration would resolve exactly).
export default defineComponent({
	name: 'MonitorLayout',
	props: {
		displays: {
			type: Array as PropType<DisplayInfo[]>,
			default: () => [],
		},
		primaryId: {
			type: Number,
			default: -1,
		},
		/** The iRacing window rect in physical px, or null when unknown. */
		windowRect: {
			type: Object as PropType<{
				x: number;
				y: number;
				width: number;
				height: number;
			} | null>,
			default: null,
		},
	},
	computed: {
		physical(): PhysicalRect[] {
			return this.displays
				.map((display) => ({
					id: display.id,
					x: Math.round(display.bounds.x * display.scaleFactor),
					y: Math.round(display.bounds.y * display.scaleFactor),
					w: Math.round(display.bounds.width * display.scaleFactor),
					h: Math.round(display.bounds.height * display.scaleFactor),
					primary: display.id === this.primaryId,
				}))
				.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
		},
		extent(): { minX: number; minY: number; maxX: number; maxY: number } {
			const rects: Array<{ x: number; y: number; w: number; h: number }> = [
				...this.physical,
			];
			if (this.windowRect) {
				rects.push({
					x: this.windowRect.x,
					y: this.windowRect.y,
					w: this.windowRect.width,
					h: this.windowRect.height,
				});
			}
			const minX = Math.min(...rects.map((r) => r.x));
			const minY = Math.min(...rects.map((r) => r.y));
			const maxX = Math.max(...rects.map((r) => r.x + r.w));
			const maxY = Math.max(...rects.map((r) => r.y + r.h));
			return { minX, minY, maxX, maxY };
		},
		viewBox(): string {
			const { minX, minY, maxX, maxY } = this.extent;
			const pad = Math.max(maxX - minX, maxY - minY) * 0.03;
			return [
				minX - pad,
				minY - pad,
				maxX - minX + pad * 2,
				maxY - minY + pad * 2,
			].join(' ');
		},
		// Text/stroke sizes scale with the physical-pixel coordinate space.
		scaleUnit(): number {
			const { minX, maxX } = this.extent;
			return Math.max(1, (maxX - minX) / 100);
		},
		numberSize(): number {
			return this.scaleUnit * 18;
		},
		labelSize(): number {
			return this.scaleUnit * 4;
		},
		padding(): number {
			return this.scaleUnit * 2;
		},
		corner(): number {
			return this.scaleUnit;
		},
		strokeWidth(): number {
			return this.scaleUnit * 0.8;
		},
	},
});
</script>

<style scoped>
.monitor-layout {
	padding: 0.75rem 0.9rem;
	background-color: rgba(0, 0, 0, 0.25);
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 6px;
}

.monitor-layout__title {
	display: block;
	font-weight: 700;
	color: white;
	margin-bottom: 0.4rem;
}

.monitor-layout__svg {
	width: 100%;
	max-height: 220px;
	display: block;
}

.monitor-layout__display {
	fill: rgba(41, 128, 185, 0.75);
	stroke: rgba(255, 255, 255, 0.7);
	stroke-width: 1;
	vector-effect: non-scaling-stroke;
}

.monitor-layout__number {
	fill: rgba(255, 255, 255, 0.85);
	font-weight: 700;
}

.monitor-layout__caption {
	fill: rgba(255, 255, 255, 0.75);
}

.monitor-layout__window {
	fill: none;
	stroke: #ec202a;
}

.monitor-layout__note {
	margin: 0.4rem 0 0;
	font-size: 0.75rem;
	color: rgba(255, 255, 255, 0.55);
}
</style>
