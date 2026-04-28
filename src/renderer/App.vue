<template>
	<div class="container">
		<TitleBar
			class="titlebar"
			:title="'iRacing Screenshot Tool'"
			:ico="iconUrl"
		/>
		<RouterView />
	</div>
</template>

<script lang="ts">
import TitleBar from './components/TitleBar.vue';
// Import the icon through Vite's asset pipeline so dev (served via the dev
// server) and prod (file://) both get a resolvable URL. A bare string like
// `./static/icon.png` is left untouched and 404s under both transports.
import iconUrl from '../../static/icon.png';

export default {
	name: 'App',
	components: { TitleBar },
	data() {
		return {
			iconUrl,
		};
	},
};
</script>

<style lang="scss"></style>
