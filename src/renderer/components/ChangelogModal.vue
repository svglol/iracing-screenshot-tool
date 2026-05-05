<template>
	<div
		class="modal-card"
		style="width: 100%; height: 80vh; background: rgb(37, 37, 37) !important"
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
			<vue3-markdown-it :source="changelog" />
		</section>
	</div>
</template>

<script lang="ts">
import { version } from '../../../package.json';
const { ipcRenderer } = require('electron');
const fs = require('fs');
const userDataPath = ipcRenderer.sendSync('app:getPath-sync', 'userData');
const changelogFile = userDataPath + '\\releases.json';

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
		// Cast to any: in-place coercion of string-parts into numeric-compare slots
		// (legacy JS pattern; D-12-08 pragmatic).
		(left as any)[i] = ~~left[i];
		(right as any)[i] = ~~right[i];
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

/* Wrap long markdown content (URLs, code, table rows) inside the changelog
   body instead of letting it push a horizontal scrollbar. vue3-markdown-it
   renders into a child component, so :deep() is required to reach the
   generated <p>/<a>/<pre>/<code>/<table> nodes from the scoped block. */
.modal-card-body :deep(p),
.modal-card-body :deep(li),
.modal-card-body :deep(a) {
	overflow-wrap: break-word;
	word-break: break-word;
}

.modal-card-body :deep(pre),
.modal-card-body :deep(code) {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	word-break: break-word;
}

.modal-card-body :deep(table) {
	display: block;
	max-width: 100%;
	overflow-x: auto;
}

.modal-card-body :deep(img) {
	max-width: 100%;
	height: auto;
}
</style>
