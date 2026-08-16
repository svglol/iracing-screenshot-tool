// @vitest-environment happy-dom
//
// One renderer per descriptor type, driven entirely by the schema — so the
// assertions here are about the mapping (type -> control, value -> emit
// format), with Oruga stubbed to emit-capable plain elements.
import { mount } from '@vue/test-utils';
import { i18n } from '../../i18n';
import SettingField from './SettingField.vue';
import { findSetting } from '../../../utilities/iracing-settings-schema';

const global = {
	plugins: [i18n],
	stubs: {
		'o-switch': {
			template:
				'<input type="checkbox" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
			props: ['modelValue', 'disabled'],
		},
		'o-select': {
			template:
				'<select :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
			props: ['modelValue', 'disabled', 'size'],
		},
		'o-input': {
			template:
				'<input type="number" :value="modelValue" :min="min" :max="max" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
			props: [
				'modelValue',
				'min',
				'max',
				'step',
				'disabled',
				'size',
				'type',
			],
		},
		'o-tag': { template: '<span class="tag"><slot /></span>' },
	},
};

function mountField(id: string, props: Record<string, unknown> = {}) {
	const setting = findSetting(id);
	expect(setting, id).toBeDefined();
	return mount(SettingField, {
		global,
		props: { setting, value: '', ...props },
	});
}

describe('SettingField', () => {
	test('bool renders a switch and emits 0/1 strings', async () => {
		const wrapper = mountField('Display/fullScreen', { value: '0' });
		const box = wrapper.find('input[type="checkbox"]');
		expect(box.exists()).toBe(true);
		await box.setValue(true);
		expect(wrapper.emitted('update')).toEqual([['Display/fullScreen', '1']]);
	});

	test('enum renders a select with resolved option labels', async () => {
		const wrapper = mountField('Graphics Options/ShaderQuality', {
			value: '3',
		});
		const options = wrapper.findAll('option');
		expect(options).toHaveLength(4);
		expect(wrapper.text()).toContain('Low');
		expect(wrapper.text()).toContain('Max');
		await wrapper.find('select').setValue('1');
		expect(wrapper.emitted('update')).toEqual([
			['Graphics Options/ShaderQuality', '1'],
		]);
	});

	test('int renders a bounded number input and emits strings', async () => {
		const wrapper = mountField('Display/windowedWidth', { value: '1920' });
		const input = wrapper.find('input[type="number"]');
		expect(input.attributes('min')).toBe('640');
		await input.setValue('2560');
		expect(wrapper.emitted('update')).toEqual([
			['Display/windowedWidth', '2560'],
		]);
	});

	test('a unit renders next to numeric settings', () => {
		const wrapper = mountField('Graphics Options/DesiredFPSLimit', {
			value: '106',
		});
		expect(wrapper.find('.setting-field__unit').text()).toBe('fps');
	});

	test('missing keys render the tag and no control', () => {
		const wrapper = mountField('Display/windowedWidth', { missing: true });
		expect(wrapper.text()).toContain('Not present in this file');
		expect(wrapper.find('input').exists()).toBe(false);
	});

	test('locked disables the control', () => {
		const wrapper = mountField('Display/windowedWidth', {
			value: '1920',
			locked: true,
		});
		expect(wrapper.find('input').attributes('disabled')).toBeDefined();
	});

	test('invalid marking only appears on dirty fields', async () => {
		// iRacing writes e.g. `1920.000000` for values this schema types as int;
		// an untouched field must not wear the invalid treatment for it.
		const clean = mountField('Display/windowedWidth', {
			value: '1920.000000',
			dirty: false,
		});
		expect(clean.find('.setting-field__input--invalid').exists()).toBe(false);
		expect(clean.find('.setting-field__error').exists()).toBe(false);

		const dirty = mountField('Display/windowedWidth', {
			value: 'not-a-number',
			dirty: true,
		});
		expect(dirty.find('.setting-field__input--invalid').exists()).toBe(true);
		expect(dirty.classes()).toContain('setting-field--invalid');
	});

	test('an invalid bounded int explains its exact constraint', () => {
		const wrapper = mountField('Display/windowedWidth', {
			value: '99',
			dirty: true,
		});
		expect(wrapper.find('.setting-field__error').text()).toBe(
			'Enter a whole number between 640 and 30000.'
		);
	});

	test('an invalid bounded float explains its exact constraint', () => {
		const wrapper = mountField('Display/RefreshRate', {
			value: '-5',
			dirty: true,
		});
		expect(wrapper.find('.setting-field__error').text()).toBe(
			'Enter a number between 0 and 1000.'
		);
	});

	test('an unbounded int gets the plain whole-number hint', () => {
		const wrapper = mountField('Display/windowedAlignment', {
			value: '1.5',
			dirty: true,
		});
		expect(wrapper.find('.setting-field__error').text()).toBe(
			'Enter a whole number.'
		);
	});

	test('a valid dirty value shows no hint', () => {
		const wrapper = mountField('Display/windowedWidth', {
			value: '2560',
			dirty: true,
		});
		expect(wrapper.find('.setting-field__error').exists()).toBe(false);
	});

	test('help renders for settings that declare it, as a real string', () => {
		const wrapper = mountField('Display/RefreshRate', {
			value: '0',
		});
		const help = wrapper.find('.setting-field__help');
		expect(help.exists()).toBe(true);
		expect(help.text()).not.toContain('iniEditor.');
	});

	test('labels resolve — no dotted keys leak into the output', () => {
		const wrapper = mountField('Graphics Options/SSAO', { value: '1' });
		expect(wrapper.text()).not.toContain('iniEditor.');
	});
});
