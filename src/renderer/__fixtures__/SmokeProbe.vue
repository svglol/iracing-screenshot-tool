<script lang="ts">
// A trivial, dependency-free SFC used only by renderer-harness.test.ts to prove the
// vitest renderer harness (plugin-vue + happy-dom + @vue/test-utils) works
// end-to-end (cq-tests#4). It intentionally requires nothing at module scope so it
// can mount under vitest — unlike the real views, which pull config/fs/sharp.
export default {
	name: 'SmokeProbe',
	props: {
		label: {
			type: String,
			default: 'ready',
		},
	},
};
</script>

<template>
	<div class="smoke-probe">harness: {{ label }}</div>
</template>
