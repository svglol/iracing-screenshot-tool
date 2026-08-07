<template>
	<div class="titlebar">
		<div class="bar">
			<div class="dragregion">
				<img
					:src="ico"
					style="
						max-height: 18px;
						margin-right: 5px;
						margin-left: 5px;
						margin-top: auto;
						margin-bottom: auto;
					"
				/>
				<span style="margin-top: auto; margin-bottom: auto">{{
					title
				}}</span>
			</div>
			<!-- The tooltip is not decoration. This used to be a bare green arrow
			     that appeared without explanation and, on one click, quit the app
			     to install — so the title/aria-label naming the version and the
			     action is the smallest thing that makes it honest. Hidden entirely
			     unless there is something to act on (shouldShowUpdateBadge). -->
			<div
				v-if="showUpdate"
				class="button update-button"
				role="button"
				:title="updateTooltip"
				:aria-label="updateTooltip"
				@click="onUpdate"
			>
				<font-awesome-icon
					:style="{ color: updateColor }"
					:icon="['fas', updateIcon]"
				/>
				<span v-if="updatePercent !== null" class="update-percent"
					>{{ updatePercent }}%</span
				>
			</div>
			<div class="button" @click="onMinimize">
				<span class="dash">&#x2012;</span>
			</div>
			<div class="button" @click="onMaximize"><span>&#9744;</span></div>
			<div class="button close" @click="onClose"><span>&#10005;</span></div>
		</div>
	</div>
</template>

<script lang="ts">
import { useOruga } from '@oruga-ui/oruga-next';
import {
	describeUpdate,
	initialUpdateState,
	shouldShowUpdateBadge,
	type UpdateState,
} from '../../utilities/update-decisions';
import { version } from '../../../package.json';

const { ipcRenderer } = require('electron');

// What main sends on 'update:state' and returns from the query: the reduced state
// plus the two things only main can answer.
type UpdateStatePayload = UpdateState & {
	busy: boolean;
	currentVersion: string;
};

export default {
	props: ['title', 'ico'],
	data() {
		return {
			update: {
				...initialUpdateState(),
				busy: false,
				currentVersion: version,
			} as UpdateStatePayload,
			// Hoisted so beforeUnmount can removeListener it — same pattern as
			// LongExposurePanel's onProgress. The old code added an ipcRenderer
			// listener in mounted and never removed it.
			onUpdateState: null as
				| ((event: unknown, state: UpdateStatePayload) => void)
				| null,
		};
	},
	computed: {
		showUpdate(): boolean {
			return shouldShowUpdateBadge(this.update);
		},
		updateTooltip(): string {
			return describeUpdate(
				this.update,
				this.update.currentVersion,
				this.update.busy
			);
		},
		updateIcon(): string {
			// Distinct glyphs per phase: "there is something to fetch" and "there is
			// something ready to install" are different asks, and a single arrow for
			// both was half of why the old affordance was unreadable.
			return this.update.phase === 'downloaded'
				? 'rotate-right'
				: 'cloud-arrow-down';
		},
		updateColor(): string {
			// Green only when it is ready — while downloading it is merely in flight.
			return this.update.phase === 'downloaded' ? '#48c78e' : '#ffffff';
		},
		updatePercent(): number | null {
			return this.update.phase === 'downloading'
				? this.update.percent
				: null;
		},
	},
	async mounted() {
		this.onUpdateState = (_event, state: UpdateStatePayload) => {
			this.update = state;
		};
		ipcRenderer.on('update:state', this.onUpdateState);

		// ASK, rather than only listening. The download can finish before this
		// component mounts (or the renderer can reload), and the previous
		// fire-and-forget send meant that lost the notification for the session.
		try {
			this.update = await ipcRenderer.invoke('update:state');
		} catch {
			// Main not ready yet; the broadcast will catch us up.
		}
	},
	beforeUnmount() {
		if (this.onUpdateState) {
			ipcRenderer.removeListener('update:state', this.onUpdateState);
			this.onUpdateState = null;
		}
	},
	methods: {
		onClose() {
			ipcRenderer.send('window-control', 'close');
		},
		onMinimize() {
			ipcRenderer.send('window-control', 'minimize');
		},
		onMaximize() {
			ipcRenderer.send('window-control', 'toggle-maximize');
		},
		async onUpdate() {
			// One button, two actions, decided by main. The renderer does not get to
			// guess: main re-checks the capture guard at the moment of the call, so
			// its verdict is the authoritative one even if this state is a beat old.
			const channel =
				this.update.phase === 'downloaded'
					? 'update:install'
					: 'update:download';
			const result = await ipcRenderer.invoke(channel);
			if (result?.state) {
				this.update = result.state;
			}
			// A refusal the user can do something about (a capture is running) is
			// worth a toast; declining the install dialog returns no reason and
			// deliberately says nothing.
			if (result && !result.ok && result.reason) {
				useOruga().notification.open({
					message: result.reason,
					variant: 'warning',
					duration: 6000,
				});
			}
		},
	},
};
</script>

<style scoped>
.titlebar {
	display: flex;
	background-color: rgba(0, 0, 0, 0.5);
	color: white;
	height: 24px;
}
img {
	height: 24px;
}
.bar {
	flex-grow: 1;
	display: flex;
}
.dragregion {
	margin-top: 2px;
	flex-grow: 1;
	text-align: left;
	vertical-align: middle;
	-webkit-app-region: drag;
	display: flex;
	align-items: center;
	font-size: 12px;
}
.dragregion > span {
	flex-grow: 1;
	margin-top: -3px;
}
.button {
	padding: 0;
	width: 44px;
	text-align: center;
	font-size: 12pt;
	display: flex;
	align-items: center;
	cursor: pointer;
	height: 24px;
	background-color: rgba(0, 0, 0, 0);
	border: 0px solid transparent;
	border-radius: 0px;
}
.button > span {
	flex-grow: 1;
	margin-top: -3px;
	user-select: none;
	color: white;
}
.button:hover {
	background-color: rgba(255, 255, 255, 0.1);
}
/* Wider than the window controls because it can carry a percentage next to the
   glyph; auto width keeps it from crowding the minimise button when it cannot. */
.update-button {
	width: auto;
	min-width: 44px;
	padding: 0 8px;
	gap: 4px;
	justify-content: center;
}
.update-percent {
	font-size: 9pt;
	color: white;
	user-select: none;
	font-variant-numeric: tabular-nums;
}
.close:hover {
	background-color: red;
	color: white;
}
.button > span.dash {
	vertical-align: sub;
	margin-top: 0px;
}
</style>
