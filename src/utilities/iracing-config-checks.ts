// Use CJS require for fs so tests can spy on fs methods via `vi.spyOn(fs, ...)`;
// ESM namespace imports are sealed and vi.spyOn cannot redefine their properties.
const fs: typeof import('fs') = require('fs');

import { t } from './i18n';
import { getRendererIniPath } from './iracing-paths';
import { parseIni } from './iracing-profiles';

/**
 * One section of an ini as key/value pairs, or `{}` when it is absent.
 *
 * Delegates to the shared parser in iracing-profiles so the rules for stripping
 * iRacing's inline `; explanation` trailers live in exactly one place — the
 * profile hashing depends on parsing values identically to this check.
 */
export function parseIniSection(
	content: string,
	section: string
): Record<string, string> {
	return parseIni(content)[section] || {};
}

/**
 * `folderOverride` is the stored `iracingFolder` setting, passed in rather than
 * read here so this module stays importable without an Electron host (see the
 * note in iracing-paths). Empty means "auto-resolve", which is the normal case.
 */
export function checkIracingConfig(folderOverride = ''): string[] {
	const warnings: string[] = [];
	const iniPath = getRendererIniPath(folderOverride);

	try {
		if (!fs.existsSync(iniPath)) {
			return warnings;
		}

		const content = fs.readFileSync(iniPath, 'utf8');
		const monitorSetup = parseIniSection(content, 'MonitorSetup');

		if (
			monitorSetup.RenderViewPerMonitor &&
			monitorSetup.RenderViewPerMonitor !== '0'
		) {
			warnings.push(t('iracingConfig.projections'));
		}
	} catch {
		// Skip check if file cannot be read
	}

	return warnings;
}
