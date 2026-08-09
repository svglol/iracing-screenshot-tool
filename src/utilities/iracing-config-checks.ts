// Use CJS require for fs so tests can spy on fs methods via `vi.spyOn(fs, ...)`;
// ESM namespace imports are sealed and vi.spyOn cannot redefine their properties.
const fs: typeof import('fs') = require('fs');

import { t } from './i18n';
import { getRendererIniPath } from './iracing-paths';

export function parseIniSection(
	content: string,
	section: string
): Record<string, string> {
	const sectionPattern = new RegExp(`^\\[${section}\\]\\s*$`, 'm');
	const match = content.search(sectionPattern);
	if (match === -1) {
		return {};
	}

	const afterHeader = content.slice(match);
	const lines = afterHeader.split(/\r?\n/).slice(1);
	const result: Record<string, string> = {};

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith('[')) {
			break;
		}
		const eqIndex = trimmed.indexOf('=');
		if (eqIndex > 0) {
			const rawValue = trimmed.slice(eqIndex + 1);
			const commentIndex = rawValue.indexOf(';');
			const value = (
				commentIndex >= 0 ? rawValue.slice(0, commentIndex) : rawValue
			).trim();
			result[trimmed.slice(0, eqIndex).trim()] = value;
		}
	}

	return result;
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
