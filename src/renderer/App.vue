<template>
	<div class="container">
		<TitleBar
			class="titlebar"
			:title="'iRacing Screenshot Tool'"
			:ico="'./static/icon.png'"
		/>
		<RouterView />
	</div>
</template>

<script>
import TitleBar from './components/TitleBar.vue';

export default {
	name: 'App',
	components: { TitleBar },
};
</script>

<style lang="scss"></style>
