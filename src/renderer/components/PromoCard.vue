<template>
	<section class="maintainer-note">
		<p class="maintainer-note__greeting">
			Thanks for using iRacing Screenshot Tool!
		</p>
		<p class="maintainer-note__signature">
			Built and maintained by AR Media Solutions.
		</p>
		<a class="maintainer-note__link" href="#" @click.prevent="openSite">
			<span>armediasolutions.net</span>
			<font-awesome-icon :icon="['fas', 'up-right-from-square']" />
		</a>
	</section>
</template>

<script lang="ts">
const { shell } = require('electron');

export default {
	methods: {
		openSite() {
			shell.openExternal('https://armediasolutions.net');
		},
	},
};
</script>

<style scoped>
.maintainer-note {
	padding: 0.5rem 0.25rem;
	color: rgba(255, 255, 255, 0.72);
	font-size: 0.78rem;
	line-height: 1.45;
}

.maintainer-note__greeting {
	margin: 0 0 0.35rem;
	color: #fff7ee;
	font-weight: 600;
}

.maintainer-note__signature {
	margin: 0 0 0.55rem;
}

.maintainer-note__link {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	color: #e5dccf;
	font-size: 0.78rem;
	font-weight: 600;
	text-decoration: none;
	cursor: pointer;
	transition: color 0.18s ease;
}

.maintainer-note__link:hover {
	color: #fff7ee;
	text-decoration: underline;
}
</style>
