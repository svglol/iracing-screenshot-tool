<template>
	<nav class="nav-rail">
		<router-link
			to="/home"
			class="nav-rail__item"
			:class="{ 'nav-rail__item--active': isActive('/home') }"
			:title="$t('iniEditor.nav.home')"
		>
			<font-awesome-icon :icon="['fas', 'images']" />
		</router-link>
		<router-link
			to="/config"
			class="nav-rail__item"
			:class="{ 'nav-rail__item--active': isActive('/config') }"
			:title="$t('iniEditor.nav.config')"
		>
			<font-awesome-icon :icon="['fas', 'display']" />
		</router-link>
		<!-- Utility destinations sit at the bottom of the rail, like every
		     icon-rail convention (VS Code, Discord itself). -->
		<div class="nav-rail__spacer" />

		<!-- Not a page: opens the community invite in the system browser. -->
		<button
			type="button"
			class="nav-rail__item nav-rail__item--button"
			title="Discord"
			@click="openDiscord"
		>
			<font-awesome-icon :icon="['fab', 'discord']" />
		</button>
		<router-link
			v-shortkey.push="['f1']"
			to="/help"
			class="nav-rail__item"
			:class="{ 'nav-rail__item--active': isActive('/help') }"
			:title="$t('help.title')"
			@shortkey="goHelp"
		>
			<font-awesome-icon :icon="['fas', 'circle-question']" />
		</router-link>
		<router-link
			to="/settings"
			class="nav-rail__item"
			:class="{ 'nav-rail__item--active': isActive('/settings') }"
			:title="$t('settings.title')"
		>
			<font-awesome-icon :icon="['fas', 'gear']" />
		</router-link>
	</nav>
</template>

<script lang="ts">
// The app's icon rail: feature pages on top, utility pages at the bottom,
// active route marked with the accent the gallery already uses for its
// selected thumbnail. No labels — every item carries a tooltip.
export default {
	name: 'NavRail',
	methods: {
		isActive(path: string): boolean {
			return this.$route.path === path;
		},
		// F1 opened the help modal before help became a page; the shortcut
		// survives the move. Guarded: re-pushing the current route rejects.
		goHelp() {
			if (this.$route.path !== '/help') {
				this.$router.push('/help');
			}
		},
		openDiscord() {
			// Required lazily so the component mounts in tests without an
			// Electron host.
			const { shell } = require('electron');
			shell.openExternal('https://discord.gg/GX2kSgN');
		},
	},
};
</script>

<style scoped>
.nav-rail {
	flex: 0 0 auto;
	width: var(--nav-rail-width, 48px);
	display: flex;
	flex-direction: column;
	align-items: stretch;
	padding-top: 0.4rem;
	padding-bottom: 0.4rem;
	background-color: rgba(0, 0, 0, 0.25);
	border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.nav-rail__spacer {
	margin-top: auto;
}

.nav-rail__item {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 44px;
	font-size: 1.15rem;
	/* Measured 4.8:1 on the rail background — passes AA for icon glyphs. */
	color: rgba(255, 255, 255, 0.65);
	border-left: 2px solid transparent;
	transition:
		color 0.15s ease,
		border-color 0.15s ease;
}

.nav-rail__item--button {
	background: none;
	border-top: 0;
	border-right: 0;
	border-bottom: 0;
	padding: 0;
	cursor: pointer;
}

.nav-rail__item:hover {
	color: rgba(255, 255, 255, 0.9);
}

.nav-rail__item--active {
	color: #ec202a;
	border-left-color: #ec202a;
}
</style>
