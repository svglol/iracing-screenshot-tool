<template>
	<div class="settings">
		<ul class="toolbar" style="padding: 0.5rem">
			<li>
				<a @click="showSettings = true"
					><font-awesome-icon :icon="['fas', 'gear']"
				/></a>
			</li>
			<li>
				<a
					v-shortkey.push="['f1']"
					@click="showHelp = true"
					@shortkey="showHelp = true"
					><font-awesome-icon :icon="['fas', 'circle-question']"
				/></a>
			</li>

			<li>
				<a @click="openDiscord"
					><font-awesome-icon :icon="['fab', 'discord']"
				/></a>
			</li>
		</ul>

		<o-modal
			v-model:active="showSettings"
			has-modal-card
			full-screen
			:can-cancel="true"
		>
			<SettingsModal @changelog="showChangelog = true" />
		</o-modal>

		<o-modal
			v-model:active="showHelp"
			has-modal-card
			trap-focus
			:destroy-on-hide="false"
			:can-cancel="false"
			aria-role="dialog"
			aria-modal
		>
			<HelpModal @close="showHelp = false" />
		</o-modal>

		<o-modal
			v-model:active="showChangelog"
			has-modal-card
			trap-focus
			:destroy-on-hide="false"
			:can-cancel="false"
			aria-role="dialog"
			aria-modal
		>
			<ChangelogModal @close="showChangelog = false" />
		</o-modal>
	</div>
</template>

<script lang="ts">
import HelpModal from '../components/HelpModal.vue';
import SettingsModal from '../components/SettingsModal.vue';
import ChangelogModal from '../components/ChangelogModal.vue';
const { version, repository } = require('../../../package.json');

const { shell, ipcRenderer } = require('electron');
const fs = require('fs');
const userDataPath = ipcRenderer.sendSync('app:getPath-sync', 'userData');
const changelogFile = userDataPath + '\\releases.json';
const changelogApiUrl = `https://api.github.com/repos/${getRepositorySlug(repository)}/releases`;

const config = require('../../utilities/config');

function getRepositorySlug(repo) {
	const fallback = 'svglol/iracing-screenshot-tool';
	const raw = typeof repo === 'string' ? repo : repo?.url;

	if (!raw) {
		return fallback;
	}

	const slug = raw
		.replace(/^git\+/, '')
		.replace(/^https?:\/\/github\.com\//i, '')
		.replace(/^git@github\.com:/i, '')
		.replace(/^github:/i, '')
		.replace(/\.git$/i, '')
		.replace(/^\/+/, '')
		.trim();

	return slug || fallback;
}

export default {
	components: {
		HelpModal,
		SettingsModal,
		ChangelogModal,
	},
	data() {
		return {
			showSettings: false,
			showHelp: false,
			showConfig: false,
			showChangelog: false,
		};
	},
	mounted() {
		const firstTime = config.get('firstTime');
		if (firstTime) {
			this.showHelp = true;
			config.set('firstTime', false);
		}

		const configVersion = config.get('version');
		const showChangelogOnLoad =
			configVersion !== '' && configVersion !== version && !firstTime;
		config.set('version', version);
		this.loadReleases(showChangelogOnLoad);
	},
	methods: {
		async loadReleases(showChangelogOnLoad) {
			try {
				const response = await fetch(changelogApiUrl);
				const body = await response.text();
				const releases = JSON.parse(body);
				if (Array.isArray(releases)) {
					fs.writeFileSync(changelogFile, body);
					if (showChangelogOnLoad) {
						this.showChangelog = true;
					}
				}
			} catch (error) {
				console.log(error);
			}
		},
		openDiscord() {
			shell.openExternal('https://discord.gg/GX2kSgN');
		},
	},
};
</script>

<style scoped>
.settings {
	margin-top: auto;
	margin-bottom: 1.5rem;
}

.modal {
	margin-top: 24px;
	border: 0px;
}

.toolbar {
	list-style-type: none;
	margin: 0;
	padding: 0;
	overflow: hidden;
}

.toolbar li {
	float: left;
	margin-left: 0.3rem;
	margin-right: 0.3rem;
	font-size: 1.25rem;
}

.toolbar li a {
	display: block;
	color: white;
	text-align: center;
	text-decoration: none;
}

.toolbar li a:hover {
	opacity: 0.5;
}
</style>
