<template>
	<div class="help-page">
		<HelpModal />
	</div>
</template>

<script lang="ts">
// The Help page: the former F1 modal hosted as a rail destination. The card
// component is reused as-is; its close button is hidden below because leaving
// a page is the rail's job.
import HelpModal from '../components/HelpModal.vue';

export default {
	name: 'HelpPage',
	components: { HelpModal },
};
</script>

<style scoped>
.help-page {
	height: calc(100vh - var(--titlebar-height, 24px));
	overflow-y: auto;
	padding: 1rem 1.25rem;
}

/* Override the card's inline 80vh modal sizing; fill the page instead. */
.help-page :deep(.modal-card) {
	width: 100% !important;
	height: 100% !important;
	max-height: none;
	max-width: 60rem;
	margin: 0 auto;
}

.help-page :deep(.modal-card-head .delete) {
	display: none;
}
</style>
