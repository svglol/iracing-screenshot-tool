<template>
	<section class="promo-card">
		<span class="promo-card__badge">Maintainer's Note</span>
		<img class="promo-card__logo" :src="logoSrc" alt="AR Media Solutions" />
		<p class="promo-card__title">
			Built and maintained by Alessandro Romanelli.
		</p>
		<p class="promo-card__copy">
			Part of AR Media Solutions.
		</p>
		<button type="button" class="promo-card__link" @click="openSite">
			<span>Visit armediasolutions.net</span>
			<font-awesome-icon :icon="['fas', 'up-right-from-square']" />
		</button>
	</section>
</template>

<script lang="ts">
import logoSrc from '../../../static/arms_logo.png';
const { shell } = require('electron');

export default {
	data() {
		return {
			logoSrc,
		};
	},
	methods: {
		openSite() {
			shell.openExternal('https://armediasolutions.net');
		},
	},
};
</script>

<style scoped>
.promo-card {
	position: relative;
	overflow: hidden;
	border-radius: 16px;
	padding: 0.9rem;
	background:
		radial-gradient(
			circle at top left,
			rgba(216, 209, 197, 0.18),
			transparent 40%
		),
		linear-gradient(160deg, rgba(255, 255, 255, 0.08), rgba(0, 0, 0, 0.2));
	border: 1px solid rgba(216, 209, 197, 0.2);
	box-shadow: 0 14px 30px rgba(0, 0, 0, 0.22);
}

.promo-card__badge {
	display: inline-flex;
	align-items: center;
	margin-bottom: 0.6rem;
	padding: 0.2rem 0.55rem;
	border-radius: 999px;
	background-color: rgba(216, 209, 197, 0.12);
	color: #f3ede4;
	font-size: 0.68rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
}

.promo-card__logo {
	width: 100%;
	height: auto;
	margin-bottom: 0.7rem;
	border-radius: 10px;
	background-color: rgba(255, 255, 255, 0.92);
	padding: 0.35rem;
}

.promo-card__title {
	margin: 0 0 0.4rem;
	color: #fff7ee;
	font-size: 0.95rem;
	font-weight: 700;
	line-height: 1.25;
}

.promo-card__copy {
	margin: 0;
	color: rgba(255, 255, 255, 0.78);
	font-size: 0.78rem;
	line-height: 1.45;
}

.promo-card__link {
	width: 100%;
	margin-top: 0.85rem;
	padding: 0.65rem 0.75rem;
	border: 0;
	border-radius: 12px;
	background: linear-gradient(135deg, #e5dccf, #cdbba6);
	color: #1d1a17;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	font-size: 0.78rem;
	font-weight: 700;
	transition:
		transform 0.18s ease,
		box-shadow 0.18s ease,
		filter 0.18s ease;
}

.promo-card__link:hover {
	transform: translateY(-1px);
	box-shadow: 0 10px 22px rgba(0, 0, 0, 0.22);
	filter: brightness(1.03);
}
</style>
