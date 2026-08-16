<template>
	<div
		class="setting-field"
		:class="{
			'setting-field--missing': missing,
			'setting-field--invalid': showInvalid,
		}"
	>
		<div class="setting-field__row">
			<div class="setting-field__label-col">
				<label class="setting-field__label" :for="inputId">
					{{ $t(labelText) }}
				</label>
				<p v-if="setting.hasHelp" class="setting-field__help">
					{{ $t(helpText) }}
				</p>
			</div>

			<div class="setting-field__control">
				<o-tag v-if="missing" size="small">
					{{ $t('iniEditor.state.keyMissing') }}
				</o-tag>

				<o-switch
					v-else-if="setting.type === 'bool'"
					:model-value="value === '1'"
					:disabled="locked"
					@update:model-value="onBool"
				/>

				<o-select
					v-else-if="setting.type === 'enum'"
					:model-value="value"
					:disabled="locked"
					size="small"
					@update:model-value="onRaw"
				>
					<option
						v-for="option in setting.enumValues"
						:key="option.value"
						:value="option.value"
					>
						{{ $t(option.labelKey) }}
					</option>
				</o-select>

				<div v-else class="setting-field__number">
					<o-input
						:id="inputId"
						type="number"
						size="small"
						:model-value="value"
						:min="setting.min"
						:max="setting.max"
						:step="setting.step || (setting.type === 'int' ? 1 : 0.1)"
						:disabled="locked"
						:class="{ 'setting-field__input--invalid': showInvalid }"
						@update:model-value="onRaw"
					/>
					<span v-if="setting.unit" class="setting-field__unit">{{
						unitText
					}}</span>
				</div>
			</div>
		</div>

		<!-- What exactly is wrong with the pending value — shown only once the
		     user has actually touched the field. -->
		<p v-if="showInvalid" class="setting-field__error" role="alert">
			{{ invalidHint }}
		</p>
	</div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import {
	labelKey,
	helpKey,
	settingId,
	validateValue,
	type SettingDescriptor,
} from '../../../utilities/iracing-settings-schema';

// Unit strings are notation, not prose — identical in every locale, so they
// live here rather than in twenty catalogues.
const UNIT_TEXT: Record<string, string> = {
	mm: 'mm',
	deg: '°',
	px: 'px',
	pct: '%',
	fps: 'fps',
	MB: 'MB',
	hz: 'Hz',
};

export default defineComponent({
	name: 'SettingField',
	props: {
		setting: {
			type: Object as PropType<SettingDescriptor>,
			required: true,
		},
		/** Current buffer value (raw ini string). */
		value: {
			type: String,
			default: '',
		},
		/** The file does not contain this key; nothing can be edited. */
		missing: {
			type: Boolean,
			default: false,
		},
		/** iRacing is running — everything read-only. */
		locked: {
			type: Boolean,
			default: false,
		},
		/** The user changed this value (invalidity only shows on dirty fields). */
		dirty: {
			type: Boolean,
			default: false,
		},
	},
	emits: ['update'],
	computed: {
		id(): string {
			return settingId(this.setting);
		},
		inputId(): string {
			return 'setting-' + this.id.replace(/[^a-zA-Z0-9]/g, '-');
		},
		labelText(): string {
			return labelKey(this.setting);
		},
		helpText(): string {
			return helpKey(this.setting);
		},
		unitText(): string {
			return UNIT_TEXT[this.setting.unit || ''] || '';
		},
		// Untouched values are shown as-is even when iRacing formatted them in a
		// way the write gate would reject (it never has to re-write them).
		showInvalid(): boolean {
			return this.dirty && !validateValue(this.setting, this.value);
		},
		invalidHint(): string {
			// Only numeric inputs can go invalid through the UI — switches and
			// dropdowns can only emit legal values. Bounded numerics in the
			// schema always carry BOTH bounds, so two shapes per type suffice.
			const bounded =
				this.setting.min !== undefined && this.setting.max !== undefined;
			const params = { min: this.setting.min, max: this.setting.max };
			if (this.setting.type === 'int') {
				return bounded
					? this.$t('iniEditor.invalid.intRange', params)
					: this.$t('iniEditor.invalid.int');
			}
			return bounded
				? this.$t('iniEditor.invalid.floatRange', params)
				: this.$t('iniEditor.invalid.float');
		},
	},
	methods: {
		onBool(checked: boolean) {
			this.$emit('update', this.id, checked ? '1' : '0');
		},
		onRaw(raw: string | number) {
			this.$emit('update', this.id, String(raw ?? ''));
		},
	},
});
</script>

<style scoped>
.setting-field {
	padding: 0.35rem 0;
	border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.setting-field__row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
}

.setting-field--missing {
	opacity: 0.55;
}

.setting-field--invalid {
	background-color: rgba(236, 32, 42, 0.08);
	border-radius: 4px;
	padding-left: 0.4rem;
	padding-right: 0.4rem;
}

.setting-field__label-col {
	min-width: 0;
}

.setting-field__label {
	color: rgba(255, 255, 255, 0.9);
	font-size: 0.9rem;
}

.setting-field__help {
	margin: 0.1rem 0 0;
	font-size: 0.75rem;
	color: rgba(255, 255, 255, 0.55);
	max-width: 34rem;
}

.setting-field__control {
	flex: 0 0 auto;
	display: flex;
	align-items: center;
}

.setting-field__number {
	display: flex;
	align-items: center;
	gap: 0.35rem;
}

.setting-field__number :deep(input) {
	width: 7.5rem;
	text-align: right;
}

.setting-field__input--invalid :deep(input) {
	border-color: #ec202a;
}

.setting-field__unit {
	color: rgba(255, 255, 255, 0.55);
	font-size: 0.8rem;
	min-width: 1.4rem;
}

.setting-field__error {
	margin: 0.2rem 0 0.1rem;
	font-size: 0.75rem;
	/* Lighter than the accent so it stays readable on the dark tint (measured
	   ~6.1:1 on the row background). */
	color: #ff8087;
	text-align: right;
}
</style>
