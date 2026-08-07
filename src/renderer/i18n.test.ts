// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { applyLocale, detectRendererLocale, i18n } from './i18n';
import { FALLBACK_LOCALE, setLocale } from '../utilities/i18n';

// The renderer's i18n binding is a Vue PLUGIN, and this project has already been
// bitten once by a registration that compiles, builds and silently does nothing
// (passing raw Oruga components to oruga.use(), which no-ops because they have no
// install method — see main.ts). `electron-vite build` cannot see that class of
// fault; only mounting something can. So these tests mount.
//
// They also cover the reason the plugin exists at all rather than components just
// importing the core's `t`: the core keeps the locale in a module variable, which
// Vue cannot observe, so a language change would leave every already-rendered
// string in the old language.

const Probe = defineComponent({
	name: 'I18nProbe',
	template: '<span class="probe">{{ $t("settings.title") }}</span>',
});

const ParamProbe = defineComponent({
	name: 'I18nParamProbe',
	data() {
		return { file: 'shot-01' };
	},
	template:
		'<span class="probe">{{ $t("gallery.copiedToClipboard", { name: file }) }}</span>',
});

const LocaleProbe = defineComponent({
	name: 'I18nLocaleProbe',
	template: '<span class="probe">{{ $locale }}</span>',
});

afterEach(() => {
	applyLocale(FALLBACK_LOCALE);
	setLocale(FALLBACK_LOCALE);
});

describe('renderer i18n plugin', () => {
	test('installs $t and resolves a message', () => {
		applyLocale('en');
		const wrapper = mount(Probe, { global: { plugins: [i18n] } });
		expect(wrapper.text()).toBe('Settings');
	});

	test('interpolates parameters from the template', () => {
		applyLocale('en');
		const wrapper = mount(ParamProbe, { global: { plugins: [i18n] } });
		expect(wrapper.text()).toBe('shot-01 copied to clipboard');
	});

	// THE point of the ref indirection. Without it this assertion fails while
	// everything still compiles and builds — the string would stay 'Settings'.
	test('re-renders an already-mounted component when the language changes', async () => {
		applyLocale('en');
		const wrapper = mount(Probe, { global: { plugins: [i18n] } });
		expect(wrapper.text()).toBe('Settings');

		applyLocale('de');
		await nextTick();
		expect(wrapper.text()).toBe('Einstellungen');

		applyLocale('fr');
		await nextTick();
		expect(wrapper.text()).toBe('Paramètres');
	});

	// $locale is what the handful of computeds phrasing through SHARED helpers
	// (describeUpdate, checkIracingConfig) touch to re-establish the dependency
	// those module-level calls lose.
	test('exposes a reactive $locale', async () => {
		applyLocale('en');
		const wrapper = mount(LocaleProbe, { global: { plugins: [i18n] } });
		expect(wrapper.text()).toBe('en');

		applyLocale('sv');
		await nextTick();
		expect(wrapper.text()).toBe('sv');
	});

	test('applyLocale resolves and returns the adopted locale', () => {
		expect(applyLocale('de-DE')).toBe('de');
		// Unsupported falls back rather than being adopted verbatim.
		expect(applyLocale('ja-JP')).toBe('en');
	});

	test('applyLocale also moves the shared core, so main-authored text follows', () => {
		applyLocale('it');
		// The core's ambient locale is what update-decisions and shot-recipe read.
		expect(setLocale('it')).toBe('it');
	});
});

describe('detectRendererLocale', () => {
	test('picks the first supported language the browser reports', () => {
		const original = Object.getOwnPropertyDescriptor(
			window.navigator,
			'languages'
		);
		Object.defineProperty(window.navigator, 'languages', {
			value: ['ja-JP', 'pl-PL', 'de-DE'],
			configurable: true,
		});
		expect(detectRendererLocale()).toBe('pl');
		if (original) {
			Object.defineProperty(window.navigator, 'languages', original);
		}
	});
});
