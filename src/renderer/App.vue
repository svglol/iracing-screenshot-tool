<template>
	<div class="container">
		<TitleBar
			class="titlebar"
			:title="'iRacing Screenshot Tool'"
			:ico="iconUrl"
			:show-picker="showRail"
		/>
		<div class="app-shell">
			<!-- The worker window loads #/worker into this same document; it must
			     stay chrome-free, so the rail only renders for real views. -->
			<NavRail v-if="showRail" />
			<div class="app-view">
				<RouterView v-slot="{ Component }">
					<!-- Home stays alive across navigation: its virtualized gallery
					     state and live IPC listeners keep ingesting screenshots taken
					     while another page is open. The config page is deliberately
					     NOT kept alive — re-entering re-reads the ini from disk. -->
					<KeepAlive include="Home">
						<component :is="Component" />
					</KeepAlive>
				</RouterView>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import TitleBar from './components/TitleBar.vue';
import NavRail from './components/NavRail.vue';
// Import the icon through Vite's asset pipeline so dev (served via the dev
// server) and prod (file://) both get a resolvable URL. A bare string like
// `./static/icon.png` is left untouched and 404s under both transports.
import iconUrl from '../../static/icon.png';

export default {
	name: 'App',
	components: { TitleBar, NavRail },
	data() {
		return {
			iconUrl,
		};
	},
	computed: {
		showRail(): boolean {
			return this.$route.path !== '/worker';
		},
	},
};
</script>

<style scoped>
.app-shell {
	/* Home's global stylesheet subtracts this from its 100vw width math. */
	--nav-rail-width: 48px;
	/* Must match .titlebar's height in TitleBar.vue. Every page sizes itself
	   `calc(100vh - var(--titlebar-height, 24px))` off this. (The old
	   hardcoded 41px was 17px taller than the real bar, leaving a dead strip
	   at the bottom of every page.) */
	--titlebar-height: 24px;
	display: flex;
	flex-direction: row;
	align-items: stretch;
	min-height: calc(100vh - var(--titlebar-height));
}

.app-view {
	flex: 1 1 auto;
	min-width: 0;
}
</style>
