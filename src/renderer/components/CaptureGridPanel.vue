<template>
	<div class="capture-grid" :class="{ 'is-collapsed': collapsed }">
		<!-- Folds like the long-exposure panel, for the same reason: a
		     replay-driven mode that someone who came for one screenshot should not
		     have to read past. -->
		<button
			type="button"
			class="capture-grid__header"
			:aria-expanded="!collapsed"
			aria-controls="capture-grid-body"
			@click="toggleCollapsed"
		>
			<span
				class="capture-grid__chevron"
				:class="{ 'is-open': !collapsed }"
				aria-hidden="true"
			>
				<font-awesome-icon icon="chevron-right" />
			</span>
			<span class="label" style="margin-bottom: 0">{{
				$t('captureGrid.title')
			}}</span>
		</button>

		<div v-show="!collapsed" id="capture-grid-body">
			<p class="capture-grid__intro">{{ $t('captureGrid.intro') }}</p>

			<p v-if="referenceText" class="capture-grid__reference">
				{{ referenceText }}
			</p>

			<!-- The car picker: classes, each one checkbox for the whole class
			     (indeterminate when partly selected) that unfolds to its cars. -->
			<template v-if="classes.length > 0">
				<div class="capture-grid__toolbar">
					<span>{{
						$t('captureGrid.selectedCount', {
							selected: String(selectedCars.length),
							total: String(allCars.length),
						})
					}}</span>
					<span class="capture-grid__toolbar-actions">
						<button
							type="button"
							class="capture-grid__link"
							:disabled="running"
							@click="selectAll(true)"
						>
							{{ $t('captureGrid.selectAll') }}
						</button>
						<button
							type="button"
							class="capture-grid__link"
							:disabled="running"
							@click="selectAll(false)"
						>
							{{ $t('captureGrid.selectNone') }}
						</button>
						<button
							type="button"
							class="capture-grid__link"
							:disabled="running"
							:title="$t('captureGrid.refresh')"
							@click="refresh"
						>
							<font-awesome-icon icon="rotate-right" />
						</button>
					</span>
				</div>

				<ul class="capture-grid__classes">
					<li
						v-for="cls in classes"
						:key="cls.classId"
						class="capture-grid__class"
					>
						<div class="capture-grid__class-row">
							<button
								type="button"
								class="capture-grid__fold"
								:aria-expanded="isClassOpen(cls)"
								@click="toggleClassOpen(cls)"
							>
								<span
									class="capture-grid__chevron"
									:class="{ 'is-open': isClassOpen(cls) }"
									aria-hidden="true"
								>
									<font-awesome-icon icon="chevron-right" />
								</span>
							</button>
							<label class="capture-grid__check">
								<input
									type="checkbox"
									:checked="classState(cls) === 'all'"
									:indeterminate="classState(cls) === 'some'"
									:disabled="running"
									@change="
										setClass(
											cls,
											($event.target as HTMLInputElement).checked
										)
									"
								/>
								<span
									class="capture-grid__swatch"
									:style="{ background: cls.color || 'transparent' }"
									aria-hidden="true"
								></span>
								<span class="capture-grid__class-name">{{
									cls.className
								}}</span>
								<span class="capture-grid__count"
									>{{ classSelectedCount(cls) }}/{{
										cls.cars.length
									}}</span
								>
							</label>
						</div>
						<ul v-show="isClassOpen(cls)" class="capture-grid__cars">
							<li v-for="car in cls.cars" :key="car.carIdx">
								<label class="capture-grid__check">
									<input
										type="checkbox"
										:checked="isSelected(car)"
										:disabled="running"
										@change="
											setCar(
												car,
												($event.target as HTMLInputElement).checked
											)
										"
									/>
									<span class="capture-grid__pos">{{
										car.racePosition ? 'P' + car.racePosition : '–'
									}}</span>
									<span class="capture-grid__driver"
										>#{{ car.carNumber }} {{ car.driverName }}</span
									>
									<span
										v-if="car.isReference"
										class="capture-grid__tag"
										>{{ $t('captureGrid.referenceTag') }}</span
									>
									<span
										v-if="car.onPitRoad"
										class="capture-grid__tag"
										>{{ $t('captureGrid.pitTag') }}</span
									>
								</label>
							</li>
						</ul>
					</li>
				</ul>

				<p v-if="unavailableText" class="capture-grid__muted">
					{{ unavailableText }}
				</p>
			</template>

			<NoticeCard :notices="notices" />

			<p v-if="progressText" class="capture-grid__progress">
				{{ progressText }}
			</p>

			<o-button
				v-if="!running"
				variant="primary"
				icon-left="table-cells"
				expanded
				:disabled="!canStart"
				style="margin-top: 0.5rem"
				@click="start"
			>
				{{
					$t('captureGrid.start', { count: String(selectedCars.length) })
				}}
			</o-button>
			<div v-else class="capture-grid__running-actions">
				<o-button
					v-if="mode === 'reshade'"
					variant="light"
					expanded
					@click="skip"
				>
					{{ $t('captureGrid.skip') }}
				</o-button>
				<o-button variant="danger" expanded @click="abort">
					{{ $t('captureGrid.abort') }}
				</o-button>
			</div>

			<div v-if="lastResult && !running" class="capture-grid__result">
				<p>{{ summaryText }}</p>
				<ul v-if="failures.length > 0" class="capture-grid__failures">
					<li v-for="f in failures" :key="f.carIdx">{{ f.text }}</li>
				</ul>
				<button
					v-if="lastResult.folder"
					type="button"
					class="capture-grid__link"
					@click="openFolder"
				>
					<font-awesome-icon icon="folder" />
					{{ $t('captureGrid.openFolder') }}
				</button>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import config from '../../utilities/config';
import NoticeCard, { type Notice } from './NoticeCard.vue';
const { ipcRenderer } = require('electron');

// How often the picker re-reads the roster while it is open and idle. Race
// positions, pit status and the reference car all move with the replay.
const ROSTER_POLL_MS = 1500;

interface GridCarRow {
	carIdx: number;
	carNumber: string;
	driverName: string;
	racePosition: number | null;
	onPitRoad: boolean;
	isReference: boolean;
}
interface GridClassRow {
	classId: number;
	className: string;
	color: string | null;
	cars: GridCarRow[];
}
interface GridCarResult {
	carIdx: number;
	carNumber: string;
	driverName: string;
	status: 'shot' | 'failed' | 'skipped';
	reason: string | null;
}

// 'camera-wrong-car' → 'cameraWrongCar', the key under captureGrid.failReasons.
function camelReason(code: string): string {
	return code.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
}

export default {
	name: 'CaptureGridPanel',
	components: { NoticeCard },
	data() {
		return {
			collapsed: config.get('captureGridCollapsed') !== false,
			roster: null as null | {
				connected: boolean;
				running: boolean;
				mode: 'standard' | 'reshade';
				reference: {
					carIdx: number;
					carNumber: string;
					driverName: string;
				} | null;
				cameraKind: 'car' | 'trackside' | 'unknown';
				classes: GridClassRow[];
				skipped: Array<{ carNumber: string; reason: string }>;
			},
			// Deselections, not selections: a car that appears on a refresh (a
			// driver who rejoined) starts selected, and what the user unticked
			// stays unticked.
			deselected: {} as Record<number, true>,
			// Per class, unfolded or not. Unset means the default: open when there is
			// only one class, folded when there are several.
			classOpen: {} as Record<number, boolean>,
			running: false,
			progress: null as null | {
				phase: string;
				index: number;
				total: number;
				carNumber: string;
				driverName: string;
			},
			lastResult: null as null | {
				ok: boolean;
				message: string | null;
				aborted: boolean;
				results: GridCarResult[];
				folder: string | null;
			},
			pollTimer: null as ReturnType<typeof setInterval> | null,
		};
	},
	computed: {
		classes(): GridClassRow[] {
			return this.roster?.classes ?? [];
		},
		allCars(): GridCarRow[] {
			return this.classes.flatMap((c) => c.cars);
		},
		selectedCars(): GridCarRow[] {
			return this.allCars.filter((car) => !this.deselected[car.carIdx]);
		},
		mode(): string {
			return this.roster?.mode ?? 'standard';
		},
		canStart(): boolean {
			return (
				!this.running &&
				!!this.roster?.connected &&
				!!this.roster?.reference &&
				this.selectedCars.length > 0
			);
		},
		referenceText(): string {
			const ref = this.roster?.reference;
			return ref
				? this.$t('captureGrid.reference', {
						carNumber: ref.carNumber,
						driverName: ref.driverName,
					})
				: '';
		},
		unavailableText(): string {
			const skipped = this.roster?.skipped ?? [];
			if (skipped.length === 0) {
				return '';
			}
			const list = skipped
				.map(
					(s) =>
						`#${s.carNumber} (${this.$t(
							`captureGrid.skipReasons.${camelReason(s.reason)}`
						)})`
				)
				.join(', ');
			return this.$t('captureGrid.unavailable', { list });
		},
		notices(): Notice[] {
			const notices: Notice[] = [];
			if (
				this.lastResult &&
				!this.lastResult.ok &&
				this.lastResult.message
			) {
				notices.push({ level: 'danger', text: this.lastResult.message });
			}
			if (!this.roster || !this.roster.connected) {
				notices.push({
					level: 'info',
					text: this.$t('captureGrid.notices.notConnected'),
				});
				return notices;
			}
			if (!this.roster.reference) {
				notices.push({
					level: 'warning',
					text: this.$t('captureGrid.notices.noReference'),
				});
			}
			if (this.roster.cameraKind === 'trackside') {
				notices.push({
					level: 'warning',
					text: this.$t('captureGrid.notices.trackside'),
				});
			}
			if (this.roster.mode === 'reshade') {
				notices.push({
					level: 'info',
					text: this.$t('captureGrid.notices.reshade'),
				});
			}
			return notices;
		},
		progressText(): string {
			const p = this.progress;
			if (!this.running || !p) {
				return '';
			}
			const params = {
				index: String(p.index + 1),
				total: String(p.total),
				carNumber: p.carNumber,
				driverName: p.driverName,
			};
			if (p.phase === 'capturing') {
				return this.mode === 'reshade'
					? this.$t('captureGrid.progress.waitingReshade', params)
					: this.$t('captureGrid.progress.capturing', params);
			}
			return this.$t('captureGrid.progress.positioning', params);
		},
		summaryText(): string {
			const results = this.lastResult?.results ?? [];
			if (results.length === 0) {
				return '';
			}
			const params = {
				shot: String(results.filter((r) => r.status === 'shot').length),
				failed: String(results.filter((r) => r.status === 'failed').length),
				skipped: String(
					results.filter((r) => r.status === 'skipped').length
				),
			};
			return this.lastResult?.aborted
				? this.$t('captureGrid.summaryAborted', params)
				: this.$t('captureGrid.summary', params);
		},
		failures(): Array<{ carIdx: number; text: string }> {
			return (this.lastResult?.results ?? [])
				.filter((r) => r.status === 'failed')
				.map((r) => ({
					carIdx: r.carIdx,
					text: this.$t('captureGrid.failedCar', {
						carNumber: r.carNumber,
						driverName: r.driverName,
						reason: this.reasonText(r.reason),
					}),
				}));
		},
	},
	watch: {
		collapsed(value: boolean) {
			if (config.get('captureGridCollapsed') !== value) {
				config.set('captureGridCollapsed', value);
			}
			this.syncPolling();
		},
	},
	mounted() {
		ipcRenderer.on('capture-grid:progress', this.handleProgress);
		this.syncPolling();
	},
	beforeUnmount() {
		ipcRenderer.removeListener('capture-grid:progress', this.handleProgress);
		this.stopPolling();
	},
	methods: {
		// Bound by Vue, so the same function reference is added and removed.
		handleProgress(_event: unknown, progress: unknown) {
			this.progress = progress as typeof this.progress;
		},
		toggleCollapsed() {
			this.collapsed = !this.collapsed;
		},
		// Poll only while the panel is open and no grid is running: folded, there
		// is nothing to show; running, the roster must stay what was started.
		syncPolling() {
			if (!this.collapsed && !this.running) {
				if (!this.pollTimer) {
					void this.refresh();
					this.pollTimer = setInterval(() => {
						void this.refresh();
					}, ROSTER_POLL_MS);
				}
			} else {
				this.stopPolling();
			}
		},
		stopPolling() {
			if (this.pollTimer) {
				clearInterval(this.pollTimer);
				this.pollTimer = null;
			}
		},
		async refresh() {
			try {
				this.roster = await ipcRenderer.invoke('capture-grid:roster');
			} catch {
				this.roster = null;
			}
		},
		isSelected(car: GridCarRow): boolean {
			return !this.deselected[car.carIdx];
		},
		setCar(car: GridCarRow, selected: boolean) {
			if (selected) {
				delete this.deselected[car.carIdx];
			} else {
				this.deselected[car.carIdx] = true;
			}
		},
		setClass(cls: GridClassRow, selected: boolean) {
			for (const car of cls.cars) {
				this.setCar(car, selected);
			}
		},
		selectAll(selected: boolean) {
			for (const car of this.allCars) {
				this.setCar(car, selected);
			}
		},
		classSelectedCount(cls: GridClassRow): number {
			return cls.cars.filter((car) => this.isSelected(car)).length;
		},
		classState(cls: GridClassRow): 'all' | 'some' | 'none' {
			const n = this.classSelectedCount(cls);
			return n === 0 ? 'none' : n === cls.cars.length ? 'all' : 'some';
		},
		isClassOpen(cls: GridClassRow): boolean {
			const set = this.classOpen[cls.classId];
			return set === undefined ? this.classes.length === 1 : set;
		},
		toggleClassOpen(cls: GridClassRow) {
			this.classOpen[cls.classId] = !this.isClassOpen(cls);
		},
		reasonText(reason: string | null): string {
			if (!reason) {
				return '';
			}
			const key = `captureGrid.failReasons.${camelReason(reason)}`;
			const text = this.$t(key);
			return text === key ? reason : text;
		},
		async start() {
			if (!this.canStart) {
				return;
			}
			this.running = true;
			this.progress = null;
			this.lastResult = null;
			this.syncPolling();
			try {
				this.lastResult = await ipcRenderer.invoke(
					'capture-grid:start',
					this.selectedCars.map((car) => car.carIdx)
				);
			} catch (error) {
				this.lastResult = {
					ok: false,
					message: (error as Error)?.message || String(error),
					aborted: false,
					results: [],
					folder: null,
				};
			} finally {
				this.running = false;
				this.progress = null;
				this.syncPolling();
			}
		},
		abort() {
			void ipcRenderer.invoke('capture-grid:abort');
		},
		skip() {
			void ipcRenderer.invoke('capture-grid:skip');
		},
		openFolder() {
			if (this.lastResult?.folder) {
				void ipcRenderer.invoke(
					'capture-grid:open-folder',
					this.lastResult.folder
				);
			}
		},
	},
};
</script>

<style scoped>
.capture-grid {
	margin-top: 1rem;
	padding-top: 0.75rem;
	border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.capture-grid__header {
	display: flex;
	align-items: baseline;
	gap: 0.45rem;
	width: 100%;
	margin-bottom: 0.5rem;
	padding: 0;
	background: none;
	border: none;
	color: inherit;
	font: inherit;
	text-align: left;
	cursor: pointer;
}

.capture-grid__header:focus-visible,
.capture-grid__fold:focus-visible,
.capture-grid__link:focus-visible {
	outline: 1px solid rgba(255, 255, 255, 0.4);
	outline-offset: 2px;
}

.capture-grid.is-collapsed .capture-grid__header {
	margin-bottom: 0;
}

.capture-grid__chevron {
	display: inline-flex;
	width: 0.7rem;
	font-size: 0.7rem;
	color: rgba(255, 255, 255, 0.5);
	transition: transform 0.15s ease;
}

.capture-grid__chevron.is-open {
	transform: rotate(90deg);
}

.capture-grid__intro,
.capture-grid__reference,
.capture-grid__muted,
.capture-grid__progress,
.capture-grid__result {
	font-size: 0.78rem;
	line-height: 1.3;
	margin: 0 0 0.45rem;
	color: rgba(255, 255, 255, 0.65);
}

.capture-grid__reference {
	color: rgba(255, 255, 255, 0.85);
}

.capture-grid__progress {
	color: #fff;
	font-weight: 600;
}

.capture-grid__toolbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 0.78rem;
	color: rgba(255, 255, 255, 0.75);
	margin-bottom: 0.25rem;
}

.capture-grid__toolbar-actions {
	display: inline-flex;
	gap: 0.6rem;
}

.capture-grid__link {
	padding: 0;
	background: none;
	border: none;
	font: inherit;
	font-size: 0.78rem;
	color: var(--accent, #7aa2ff);
	cursor: pointer;
}

.capture-grid__link:disabled {
	opacity: 0.4;
	cursor: default;
}

.capture-grid__classes,
.capture-grid__cars {
	list-style: none;
	margin: 0;
	padding: 0;
}

.capture-grid__classes {
	max-height: 18rem;
	overflow-y: auto;
	margin-bottom: 0.45rem;
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 4px;
	padding: 0.25rem 0.35rem;
}

.capture-grid__class-row {
	display: flex;
	align-items: center;
	gap: 0.2rem;
}

.capture-grid__fold {
	padding: 0 0.15rem;
	background: none;
	border: none;
	color: inherit;
	cursor: pointer;
}

.capture-grid__cars {
	padding-left: 1.35rem;
}

.capture-grid__check {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	min-width: 0;
	font-size: 0.8rem;
	line-height: 1.6;
	cursor: pointer;
}

.capture-grid__check input {
	flex: 0 0 auto;
	margin: 0;
}

.capture-grid__swatch {
	flex: 0 0 auto;
	width: 0.6rem;
	height: 0.6rem;
	border-radius: 2px;
	border: 1px solid rgba(255, 255, 255, 0.25);
}

.capture-grid__class-name {
	font-weight: 600;
}

.capture-grid__count,
.capture-grid__pos {
	flex: 0 0 auto;
	color: rgba(255, 255, 255, 0.5);
	font-variant-numeric: tabular-nums;
}

.capture-grid__pos {
	min-width: 1.9rem;
}

.capture-grid__driver {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.capture-grid__tag {
	flex: 0 0 auto;
	font-size: 0.68rem;
	padding: 0 0.3rem;
	border-radius: 3px;
	background: rgba(255, 255, 255, 0.12);
	color: rgba(255, 255, 255, 0.8);
}

.capture-grid__running-actions {
	display: flex;
	gap: 0.5rem;
	margin-top: 0.5rem;
}

.capture-grid__failures {
	margin: 0.25rem 0 0.35rem 1rem;
	list-style: disc;
}
</style>
