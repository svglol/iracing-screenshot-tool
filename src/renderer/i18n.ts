// The renderer's binding to the shared translation core.
//
// The core keeps the current locale in a module variable, which is right for the
// main process and useless to Vue: nothing would re-render when it changed. This
// mirrors it into a ref, so `$t` establishes a reactive dependency on the language
// every time it is called and every template and computed that translates
// re-evaluates the moment the setting changes. No window reload, no restart
// prompt.

import { ref, type App } from 'vue';
import {
	detectLocale,
	getLocale,
	setLocale,
	t,
	type TranslateParams,
} from '../utilities/i18n';

// Seeded from whatever the core already resolved (main sets it before the window
// is created, but the renderer reads config for itself too — see main.ts).
const localeRef = ref(getLocale());

// Adopt a language. Returns the locale actually adopted, which the caller
// persists — see setLocale's note on not letting an unsupported tag linger.
export function applyLocale(locale: unknown): string {
	const resolved = setLocale(locale);
	localeRef.value = resolved;
	return resolved;
}

// The renderer's own view of the user's language preferences, for first run.
// Main has app.getPreferredSystemLanguages(); here Chromium reports the same
// thing through navigator.
export function detectRendererLocale(): string {
	const languages =
		typeof navigator !== 'undefined' && Array.isArray(navigator.languages)
			? navigator.languages
			: [];
	return detectLocale(
		languages.length > 0 ? languages : [navigator?.language]
	);
}

export const i18n = {
	install(app: App): void {
		app.config.globalProperties.$t = (
			key: string,
			params?: TranslateParams
		): string => {
			// Touching the ref is the whole point of this indirection: it is what
			// makes a language change invalidate every render that translated.
			void localeRef.value;
			return t(key, params);
		};

		// For the handful of computed properties that phrase things through a
		// SHARED helper rather than through $t — describeUpdate, checkIracingConfig,
		// FILENAME_FIELDS. Those call the core's `t` directly and so cannot be seen
		// by Vue; referencing `this.$locale` in the computed re-establishes the
		// dependency the plain module call loses.
		Object.defineProperty(app.config.globalProperties, '$locale', {
			get: () => localeRef.value,
		});
	},
};

declare module 'vue' {
	interface ComponentCustomProperties {
		$t: (key: string, params?: TranslateParams) => string;
		$locale: string;
	}
}
