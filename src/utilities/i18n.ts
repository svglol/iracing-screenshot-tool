// The translation core, shared by BOTH processes.
//
// It lives in utilities/ for the same reason update-decisions.ts does: main and
// the renderer both phrase things for the user, and a second implementation is a
// second set of wording. Long-exposure validation warnings are written in the
// main process and rendered in the sidebar; the WGC support sentence is decided
// in main and shown under a Settings toggle. If those two processes translated
// through different code they would drift, and the drift would only ever be
// visible to users who do not speak English.
//
// Deliberately NOT vue-i18n. Three reasons, in order of weight:
//   1. vue-i18n only exists in the renderer, so main would need its own engine
//      anyway — and then the same key could interpolate differently in the two
//      places it is read.
//   2. Its full build compiles message strings at runtime via `new Function`,
//      which is exactly what the CSP work deferred out of the WP-K stages will
//      want to forbid.
//   3. What this app actually needs from an i18n library is a dot-path lookup, a
//      brace interpolator and CLDR plural categories. Intl provides the third,
//      and the other two are the file below.
//
// No Node, no Electron, no module state beyond the current locale — so it is
// unit-testable and loads in either process.

import { CATALOGS } from '../locales';

export interface LocaleDescriptor {
	code: string;
	// The language's ENDONYM — its own name for itself. A language picker has to
	// show these rather than English names: someone hunting for their language in
	// a list they cannot read still recognises "Čeština", never "Czech".
	name: string;
}

// Ordered by endonym, because that is the order the picker renders and a user
// scanning it is reading the endonyms, not the codes. Latin scripts sort
// alphabetically; the other scripts follow as a block (Cyrillic, Arabic, then
// CJK), so a reader hunting for their own script finds it grouped rather than
// interleaved by a collation they do not use.
export const SUPPORTED_LOCALES: readonly LocaleDescriptor[] = [
	{ code: 'cs', name: 'Čeština' },
	{ code: 'da', name: 'Dansk' },
	{ code: 'de', name: 'Deutsch' },
	{ code: 'en', name: 'English' },
	{ code: 'es', name: 'Español' },
	{ code: 'fr', name: 'Français' },
	{ code: 'it', name: 'Italiano' },
	{ code: 'nl', name: 'Nederlands' },
	{ code: 'no', name: 'Norsk' },
	{ code: 'pl', name: 'Polski' },
	{ code: 'pt', name: 'Português' },
	{ code: 'fi', name: 'Suomi' },
	{ code: 'sv', name: 'Svenska' },
	{ code: 'ru', name: 'Русский' },
	{ code: 'ar', name: 'العربية' },
	{ code: 'ja', name: '日本語' },
	{ code: 'zh-tw', name: '繁體中文' },
	{ code: 'ko', name: '한국어' },
] as const;

// The source language. Every other catalogue is checked against it (see
// i18n.test.ts) and every lookup falls back to it, so a key that is missing or
// untranslated degrades to English rather than to nothing.
export const FALLBACK_LOCALE = 'en';

// A message is either a finished string or, where the sentence changes shape with
// a count, one string per CLDR plural category. Only `other` is required —
// English needs `one`/`other`, Polish needs `one`/`few`/`many`, and a language
// that needs no distinction just supplies `other`.
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>>;
export type MessageValue = string | PluralForms;

export interface MessageCatalog {
	[segment: string]: MessageValue | MessageCatalog;
}

export type TranslateParams = Record<string, string | number>;

const SUPPORTED_CODES = new Set(SUPPORTED_LOCALES.map((entry) => entry.code));

export function isSupportedLocale(code: unknown): boolean {
	return typeof code === 'string' && SUPPORTED_CODES.has(code);
}

// Chinese is the one language where the subtags cannot simply be dropped: the
// shipped catalogue is written in Traditional characters, which is what zh-TW,
// zh-HK, zh-MO and zh-Hant readers expect, while Simplified tags name a
// different written form of the language entirely. Showing Traditional to a
// zh-CN user is not a regional accent, it is the wrong script — so Simplified
// resolves to nothing here and the caller decides what that falls back to.
const TRADITIONAL_CHINESE_SUBTAGS = new Set(['hant', 'tw', 'hk', 'mo']);

function resolveChinese(subtags: readonly string[]): string | null {
	return subtags.some((tag) => TRADITIONAL_CHINESE_SUBTAGS.has(tag))
		? 'zh-tw'
		: null;
}

// Normalise anything a caller might hand us to a code we actually ship.
//
// Windows reports UI languages as BCP 47 tags ('de-DE', 'pt-BR', 'nb-NO'), so the
// region has to be dropped before the lookup. Norwegian is one case where
// dropping it is not enough: Windows uses `nb` (Bokmål) or `nn` (Nynorsk) and
// almost never the macrolanguage `no` that we ship under, so both map onto it.
// Chinese is the other — see resolveChinese above.
export function resolveLocale(candidate: unknown): string {
	if (typeof candidate !== 'string') {
		return FALLBACK_LOCALE;
	}
	const normalized = candidate.trim().toLowerCase().replace(/_/g, '-');
	if (!normalized) {
		return FALLBACK_LOCALE;
	}
	const subtags = normalized.split('-');
	const base = subtags[0];
	if (base === 'nb' || base === 'nn') {
		return 'no';
	}
	if (base === 'zh') {
		return resolveChinese(subtags) ?? FALLBACK_LOCALE;
	}
	return SUPPORTED_CODES.has(base) ? base : FALLBACK_LOCALE;
}

// First supported language among the user's preferences, else English.
//
// Takes the list rather than reading it, because the two processes source it
// differently (app.getPreferredSystemLanguages in main, navigator.languages in
// the renderer) and neither belongs in a pure function.
export function detectLocale(candidates: readonly unknown[]): string {
	for (const candidate of candidates) {
		if (typeof candidate !== 'string') {
			continue;
		}
		const normalized = candidate.trim().toLowerCase().replace(/_/g, '-');
		const subtags = normalized.split('-');
		const base = subtags[0];
		if (base === 'nb' || base === 'nn') {
			return 'no';
		}
		if (base === 'zh') {
			const traditional = resolveChinese(subtags);
			if (traditional) {
				return traditional;
			}
			// Simplified Chinese is not shipped, but a LATER preference may still
			// match — skip rather than give up on the whole list.
			continue;
		}
		if (SUPPORTED_CODES.has(base)) {
			return base;
		}
	}
	return FALLBACK_LOCALE;
}

// The ambient locale. Module state on purpose: threading a locale through
// `describeUpdate`, `validatePlan` and `decideWgcSupport` would change every
// signature and every one of their call sites and tests, to carry a value that is
// global to the process anyway. Each process sets it once at startup and again
// when the setting changes.
let currentLocale: string = FALLBACK_LOCALE;

export function getLocale(): string {
	return currentLocale;
}

// Returns the locale actually adopted, which is not necessarily what was asked
// for — callers persist the RESOLVED value so an unsupported tag cannot sit in
// config.json being re-resolved forever.
export function setLocale(locale: unknown): string {
	currentLocale = resolveLocale(locale);
	return currentLocale;
}

function lookup(catalog: MessageCatalog, path: string[]): MessageValue | null {
	let node: MessageValue | MessageCatalog | undefined = catalog;
	for (const segment of path) {
		if (typeof node !== 'object' || node === null || Array.isArray(node)) {
			return null;
		}
		node = (node as MessageCatalog)[segment];
		if (node === undefined) {
			return null;
		}
	}
	// A branch is not a message. Reaching one means the key names a namespace,
	// which is a bug in the caller rather than a missing translation — so it is
	// treated as a miss and falls through to English, then to the key itself.
	if (typeof node === 'string') {
		return node;
	}
	if (node && typeof node === 'object' && !Array.isArray(node)) {
		const forms = node as PluralForms;
		return typeof forms.other === 'string' ||
			typeof forms.one === 'string' ||
			typeof forms.few === 'string' ||
			typeof forms.many === 'string' ||
			typeof forms.two === 'string' ||
			typeof forms.zero === 'string'
			? forms
			: null;
	}
	return null;
}

// Intl.PluralRules construction is not free and these are asked for on every
// render of a sample count, so keep one per locale.
const pluralRules = new Map<string, Intl.PluralRules>();

function selectPluralForm(
	forms: PluralForms,
	locale: string,
	count: number
): string | null {
	let rules = pluralRules.get(locale);
	if (!rules) {
		try {
			rules = new Intl.PluralRules(locale);
		} catch {
			rules = new Intl.PluralRules(FALLBACK_LOCALE);
		}
		pluralRules.set(locale, rules);
	}
	const category = rules.select(count);
	// CLDR guarantees `other` exists for every language, so it is the only
	// mandatory form and the right last resort within a locale.
	return forms[category] ?? forms.other ?? null;
}

// Substitute {name} from params.
//
// An UNKNOWN placeholder is left exactly as it was found, which is load-bearing
// rather than merely lenient: the filename-format copy talks about
// "{track}-{driver}-{counter}" as literal text the user types, and blanking those
// would turn the one message explaining the feature into "--". The rule is that
// this only ever replaces what it was given a value for.
function interpolate(template: string, params?: TranslateParams): string {
	if (!params) {
		return template;
	}
	return template.replace(/\{(\w+)\}/g, (match, name: string) => {
		const value = params[name];
		// Numbers are stringified plainly, NOT through Intl.NumberFormat: most of
		// them here are pixel dimensions, frame indices and percentages, and a
		// French thousands separator would turn a 1920x1080 target into "1 920".
		// A caller that wants a number formatted for a locale formats it and passes
		// a string.
		return value === undefined || value === null ? match : String(value);
	});
}

// Translate `key` in the ambient locale.
//
// Misses degrade in three steps — requested locale, English, then the key itself.
// Returning the key rather than an empty string is deliberate: a bare
// "settings.language" on screen names the thing that is missing and is greppable,
// where blank text just looks like a layout bug.
export function t(key: string, params?: TranslateParams): string {
	return translate(currentLocale, key, params);
}

// The same lookup with an explicit locale. Used by the tests, and by anything
// that has to render a string in a locale other than the ambient one.
export function translate(
	locale: string,
	key: string,
	params?: TranslateParams
): string {
	const path = key.split('.');
	const resolved = resolveLocale(locale);

	let message = CATALOGS[resolved] ? lookup(CATALOGS[resolved], path) : null;
	if (message === null && resolved !== FALLBACK_LOCALE) {
		message = lookup(CATALOGS[FALLBACK_LOCALE], path);
	}
	if (message === null) {
		return key;
	}

	if (typeof message !== 'string') {
		const count = params?.count;
		if (typeof count !== 'number') {
			// A plural message asked for without a count cannot be selected. Fall
			// back to `other` so it still reads as a sentence.
			const fallbackForm = message.other ?? null;
			return fallbackForm === null ? key : interpolate(fallbackForm, params);
		}
		const form = selectPluralForm(message, resolved, count);
		if (form === null) {
			return key;
		}
		return interpolate(form, params);
	}

	return interpolate(message, params);
}
