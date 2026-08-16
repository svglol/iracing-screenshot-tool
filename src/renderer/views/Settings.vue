<template>
	<div class="settings-page">
		<SettingsModal @changelog="showChangelog = true" />

		<o-modal
			v-model:active="showChangelog"
			has-modal-card
			trap-focus
			:can-cancel="false"
			aria-role="dialog"
			aria-modal
		>
			<ChangelogModal @close="showChangelog = false" />
		</o-modal>
	</div>
</template>

<script lang="ts">
// The Settings page: the former full-screen settings modal hosted as a rail
// destination. The card component is reused as-is; only the host changed.
// The changelog stays a modal — it is a transient overlay here AND on Home
// (which auto-opens it after an update), not a place you navigate to.
import SettingsModal from '../components/SettingsModal.vue';
import ChangelogModal from '../components/ChangelogModal.vue';

export default {
	name: 'SettingsPage',
	components: { SettingsModal, ChangelogModal },
	data() {
		return {
			showChangelog: false,
		};
	},
};
</script>

<style scoped>
.settings-page {
	height: calc(100vh - var(--titlebar-height, 24px));
	overflow-y: auto;
}

/* The card fills the page instead of a modal shell. */
.settings-page :deep(.modal-card) {
	width: 100%;
	min-height: 100%;
	max-height: none;
}
</style>
