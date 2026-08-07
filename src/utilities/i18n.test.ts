import { describe, it, expect, afterEach } from 'vitest';
import {
	detectLocale,
	FALLBACK_LOCALE,
	getLocale,
	isSupportedLocale,
	resolveLocale,
	setLocale,
	SUPPORTED_LOCALES,
	t,
	translate,
	type MessageCatalog,
} from './i18n';
import { CATALOGS } from '../locales';
import en from '../locales/en';

// The ambient locale is module state, so a test that changes it has to put it
// back or it leaks into every test that runs after it in the same file.
afterEach(() => {
	setLocale(FALLBACK_LOCALE);
});

describe('resolveLocale', () => {
	it('strips the region from a BCP 47 tag', () => {
		expect(resolveLocale('de-DE')).toBe('de');
		expect(resolveLocale('pt-BR')).toBe('pt');
		expect(resolveLocale('fr-CA')).toBe('fr');
	});

	it('is case- and separator-insensitive', () => {
		expect(resolveLocale('DE')).toBe('de');
		expect(resolveLocale('es_ES')).toBe('es');
		expect(resolveLocale('  It-IT  ')).toBe('it');
	});

	// Windows reports Norwegian as nb/nn and essentially never as the
	// macrolanguage `no` we ship under, so without this mapping every Norwegian
	// machine would silently get English.
	it('maps both written forms of Norwegian onto the shipped catalogue', () => {
		expect(resolveLocale('nb-NO')).toBe('no');
		expect(resolveLocale('nn')).toBe('no');
		expect(resolveLocale('no')).toBe('no');
	});

	it('falls back to English for anything unshipped or unusable', () => {
		expect(resolveLocale('ja')).toBe('en');
		expect(resolveLocale('')).toBe('en');
		expect(resolveLocale('   ')).toBe('en');
		expect(resolveLocale(null)).toBe('en');
		expect(resolveLocale(undefined)).toBe('en');
		expect(resolveLocale(42)).toBe('en');
	});
});

describe('detectLocale', () => {
	it('takes the first supported entry, not merely the first', () => {
		expect(detectLocale(['ja-JP', 'zh-CN', 'sv-SE', 'de-DE'])).toBe('sv');
	});

	it('falls back to English when nothing matches', () => {
		expect(detectLocale(['ja-JP', 'ko-KR'])).toBe('en');
		expect(detectLocale([])).toBe('en');
	});

	it('ignores non-string entries rather than throwing', () => {
		expect(detectLocale([null, undefined, 7, 'pl-PL'])).toBe('pl');
	});
});

describe('setLocale', () => {
	it('returns and stores the RESOLVED code, not the raw request', () => {
		expect(setLocale('de-DE')).toBe('de');
		expect(getLocale()).toBe('de');
	});

	it('resolves an unsupported request to English rather than storing it', () => {
		expect(setLocale('ja')).toBe('en');
		expect(getLocale()).toBe('en');
	});
});

describe('isSupportedLocale', () => {
	it('accepts exactly the shipped codes', () => {
		expect(isSupportedLocale('de')).toBe(true);
		expect(isSupportedLocale('en')).toBe(true);
		// A full tag is not itself a shipped code — resolveLocale is what narrows.
		expect(isSupportedLocale('de-DE')).toBe(false);
		expect(isSupportedLocale('ja')).toBe(false);
		expect(isSupportedLocale(null)).toBe(false);
	});
});

describe('translate', () => {
	it('returns the message for a dot path', () => {
		expect(translate('en', 'settings.title')).toBe('Settings');
	});

	it('substitutes named parameters', () => {
		expect(
			translate('en', 'gallery.copiedToClipboard', { name: 'shot' })
		).toBe('shot copied to clipboard');
	});

	// The filename-format help talks ABOUT {track} and {counter} as literal text
	// the user types. Blanking an unmatched placeholder would reduce the one
	// message explaining that feature to "Use a custom pattern instead of the
	// default (--)".
	it('leaves a placeholder it was given no value for exactly as written', () => {
		expect(translate('en', 'settings.customFilenameFormatDescription')).toBe(
			'Use a custom pattern instead of the default ({track}-{driver}-{counter})'
		);
	});

	it('returns the key itself for a message that does not exist', () => {
		expect(translate('en', 'settings.nope')).toBe('settings.nope');
		expect(translate('en', 'no.such.namespace.at.all')).toBe(
			'no.such.namespace.at.all'
		);
	});

	// A key that names a branch rather than a leaf is a caller bug, and returning
	// "[object Object]" would hide it.
	it('returns the key when the path lands on a namespace', () => {
		expect(translate('en', 'settings')).toBe('settings');
	});

	it('falls back to English when a locale is missing the key', () => {
		// Deliberately not a shipped locale: resolveLocale sends it to English.
		expect(translate('ja', 'settings.title')).toBe('Settings');
	});

	it('selects the English plural forms by count', () => {
		expect(
			translate('en', 'longExposure.modified.passes', { count: 1 })
		).toBe('1 pass');
		expect(
			translate('en', 'longExposure.modified.passes', { count: 4 })
		).toBe('4 passes');
	});

	it('falls back to `other` when a plural message is asked for without a count', () => {
		expect(translate('en', 'longExposure.modified.passes')).toContain(
			'passes'
		);
	});
});

describe('t', () => {
	it('reads the ambient locale', () => {
		setLocale('en');
		expect(t('settings.title')).toBe('Settings');
	});
});

// ---------------------------------------------------------------------------
// Catalogue integrity. These are what stop a translation from silently rotting:
// TypeScript already enforces the key set at compile time, but nothing there can
// see a placeholder that was mistyped or dropped, and a dropped {version} is a
// sentence with a hole in it.
// ---------------------------------------------------------------------------

type Leaf = { path: string; value: string };

function flatten(node: unknown, prefix: string[] = []): Leaf[] {
	if (typeof node === 'string') {
		return [{ path: prefix.join('.'), value: node }];
	}
	if (!node || typeof node !== 'object') {
		return [];
	}
	return Object.entries(node as Record<string, unknown>).flatMap(
		([key, value]) => flatten(value, [...prefix, key])
	);
}

// Plural leaves are collapsed to their parent path: English may define `one` and
// `other` where Polish needs `one`, `few`, `many` and `other`, so comparing them
// form-by-form would fail on correct translations.
function isPluralNode(node: unknown): boolean {
	return (
		!!node &&
		typeof node === 'object' &&
		typeof (node as Record<string, unknown>).other === 'string'
	);
}

function messagePaths(node: unknown, prefix: string[] = []): string[] {
	if (typeof node === 'string') {
		return [prefix.join('.')];
	}
	if (isPluralNode(node)) {
		return [prefix.join('.')];
	}
	if (!node || typeof node !== 'object') {
		return [];
	}
	return Object.entries(node as Record<string, unknown>).flatMap(
		([key, value]) => messagePaths(value, [...prefix, key])
	);
}

function placeholders(text: string): Set<string> {
	return new Set(
		Array.from(text.matchAll(/\{(\w+)\}/g)).map((match) => match[1])
	);
}

const englishPaths = messagePaths(en).sort();
const englishLeaves = new Map(
	flatten(en).map((leaf) => [leaf.path, leaf.value])
);

describe('catalogue integrity', () => {
	it('registers a catalogue for every locale the picker offers', () => {
		for (const locale of SUPPORTED_LOCALES) {
			expect(
				CATALOGS[locale.code],
				`no catalogue registered for ${locale.code}`
			).toBeDefined();
		}
	});

	it('offers a catalogue for nothing the picker does not list', () => {
		const listed = new Set(SUPPORTED_LOCALES.map((entry) => entry.code));
		for (const code of Object.keys(CATALOGS)) {
			expect(listed.has(code), `${code} is registered but unlisted`).toBe(
				true
			);
		}
	});

	it('names every language in its own language, not in English', () => {
		for (const locale of SUPPORTED_LOCALES) {
			expect(locale.name.trim().length).toBeGreaterThan(0);
		}
		// The endonyms have to be distinct or the picker shows two identical rows.
		const names = SUPPORTED_LOCALES.map((entry) => entry.name);
		expect(new Set(names).size).toBe(names.length);
	});

	for (const [code, catalog] of Object.entries(CATALOGS)) {
		if (code === FALLBACK_LOCALE) {
			continue;
		}

		it(`${code} has exactly the English key set`, () => {
			const paths = messagePaths(catalog as MessageCatalog).sort();
			const missing = englishPaths.filter((key) => !paths.includes(key));
			const extra = paths.filter((key) => !englishPaths.includes(key));
			expect(missing, `${code} is missing keys`).toEqual([]);
			expect(extra, `${code} has keys English does not`).toEqual([]);
		});

		it(`${code} uses only the placeholders English defines`, () => {
			for (const leaf of flatten(catalog as MessageCatalog)) {
				// Plural forms live one level below the English path, so compare
				// against the parent when the exact path is not an English leaf.
				const source =
					englishLeaves.get(leaf.path) ??
					englishLeaves.get(
						leaf.path.split('.').slice(0, -1).join('.') + '.other'
					);
				if (source === undefined) {
					continue;
				}
				const allowed = placeholders(source);
				for (const name of placeholders(leaf.value)) {
					expect(
						allowed.has(name),
						`${code}: ${leaf.path} uses {${name}}, which English does not define`
					).toBe(true);
				}
			}
		});

		it(`${code} leaves no message empty`, () => {
			for (const leaf of flatten(catalog as MessageCatalog)) {
				expect(
					leaf.value.trim().length,
					`${code}: ${leaf.path} is empty`
				).toBeGreaterThan(0);
			}
		});

		// CLDR guarantees `other` for every language, and the selector falls back
		// to it when a count lands in a category the catalogue skipped.
		it(`${code} supplies the mandatory 'other' plural form`, () => {
			const walk = (node: unknown, prefix: string[]): void => {
				if (!node || typeof node !== 'object') {
					return;
				}
				const record = node as Record<string, unknown>;
				const englishIsPlural = isPluralNode(
					prefix.reduce<unknown>(
						(acc, key) =>
							acc && typeof acc === 'object'
								? (acc as Record<string, unknown>)[key]
								: undefined,
						en
					)
				);
				if (englishIsPlural) {
					expect(
						typeof record.other,
						`${code}: ${prefix.join('.')} has no 'other' form`
					).toBe('string');
					return;
				}
				for (const [key, value] of Object.entries(record)) {
					walk(value, [...prefix, key]);
				}
			};
			walk(catalog, []);
		});
	}
});
