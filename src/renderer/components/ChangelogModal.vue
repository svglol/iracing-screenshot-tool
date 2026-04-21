<template>
	<div
		class="modal-card"
		style="width: 60vw; height: 80vh; background: rgb(37, 37, 37) !important"
	>
		<header
			class="modal-card-head"
			style="background-color: rgba(0, 0, 0, 0.2); border-bottom: 0"
		>
			<p
				class="modal-card-title"
				style="color: white; font-weight: 700; margin-bottom: 0rem"
			>
				Changelog
			</p>
			<button type="button" class="delete" @click="$emit('close')" />
		</header>
		<section class="modal-card-body" style="background-color: transparent">
			<vue-markdown-plus :source="changelog" />
		</section>
	</div>
</template>

<script>
const { ipcRenderer } = require('electron');
const fs = require('fs');
const userDataPath = ipcRenderer.sendSync('app:getPath-sync', 'userData');
const changelogFile = userDataPath + '\\releases.json';
const { version } = require('../../../package.json');

export default {
	data() {
		return {
			changelog: '',
		};
	},
	mounted() {
		fs.readFile(changelogFile, (err, data) => {
			if (err) {
				console.log(err);
				return;
			}

			const releases = JSON.parse(data.toString());
			this.parseChangelog(releases);
		});
	},
	methods: {
		parseChangelog(releases) {
			if (!Array.isArray(releases)) {
				return;
			}

			releases.forEach((release) => {
				const releaseVersion = release.tag_name || release.name || '';
				const releaseTitle = release.name || release.tag_name || 'Release';
				const compare = compareVer(version, releaseVersion);
				if (compare === 0 || compare === 1) {
					this.changelog += `## ${releaseTitle}\n ${release.body || ''}\n\n ___ \n`;
				}
			});
		},
	},
};

function compareVer(a, b) {
	function fix(s) {
		return '.' + (s.toLowerCase().charCodeAt(0) - 2147483647) + '.';
	}

	const left = String(a)
		.replace(/[^0-9.]/g, fix)
		.split('.');
	const right = String(b)
		.replace(/[^0-9.]/g, fix)
		.split('.');
	const count = Math.max(left.length, right.length);

	for (let i = 0; i < count; i += 1) {
		left[i] = ~~left[i];
		right[i] = ~~right[i];
		if (left[i] > right[i]) {
			return 1;
		}
		if (left[i] < right[i]) {
			return -1;
		}
	}

	return 0;
}
</script>

<style scoped>
.heading {
	font-size: 0.75rem;
	font-weight: 700;
}

button {
	background-color: transparent;
	border: 0px;
	color: white;
	font-size: 2rem;
	padding: 0px;
	margin: 0px;
	text-align: left;
	height: 30px;
	max-height: 30px;
	max-width: 30px;
	width: 30px;
}
</style>
