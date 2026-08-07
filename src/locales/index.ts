// The catalogue registry.
//
// Every locale is imported eagerly rather than fetched on demand. They are text,
// they total well under a megabyte across all thirteen, and both processes need
// them synchronously — main phrases a capture refusal inside an IPC handler that
// has nowhere to await a dynamic import.

import type { MessageCatalog, PluralForms } from '../utilities/i18n';
import en from './en';
import cs from './cs';
import da from './da';
import de from './de';
import es from './es';
import fi from './fi';
import fr from './fr';
import it from './it';
import nl from './nl';
import no from './no';
import pl from './pl';
import pt from './pt';
import sv from './sv';

// The shape every translation must have, derived from the English catalogue so
// that a missing or misspelled key is a COMPILE error rather than something the
// parity test catches later (or a user finds as an English sentence in a German
// dialog).
//
// Plural leaves are deliberately relaxed to the full set of CLDR categories:
// English needs `one`/`other` and Polish needs `one`/`few`/`many`/`other`, so
// pinning translations to English's exact forms would make correct Polish a type
// error. Everything else is exact.
export type Localized<T> = {
	[K in keyof T]: T[K] extends string
		? string
		: T[K] extends { other: string }
			? PluralForms
			: Localized<T[K]>;
};

export type Catalog = Localized<typeof en>;

// Concrete object types have no string index signature, so they are not directly
// assignable to MessageCatalog even though they satisfy it structurally. The
// assertion is confined to this one helper rather than repeated thirteen times.
const asCatalog = (catalog: Catalog): MessageCatalog =>
	catalog as unknown as MessageCatalog;

export const CATALOGS: Record<string, MessageCatalog> = {
	en: asCatalog(en),
	cs: asCatalog(cs),
	da: asCatalog(da),
	de: asCatalog(de),
	es: asCatalog(es),
	fi: asCatalog(fi),
	fr: asCatalog(fr),
	it: asCatalog(it),
	nl: asCatalog(nl),
	no: asCatalog(no),
	pl: asCatalog(pl),
	pt: asCatalog(pt),
	sv: asCatalog(sv),
};
