// Use CJS require for fs so tests can spy on fs methods via `vi.spyOn(fs, ...)`;
// ESM namespace imports are sealed and vi.spyOn cannot redefine their properties.
const fs: typeof import('fs') = require('fs');
import * as path from 'path';
import * as os from 'os';

const IRACING_INI_PATH = path.join(
	os.homedir(),
	'Documents',
	'iRacing',
	'rendererDX11Monitor.ini'
);

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

export function checkIracingConfig(): string[] {
	const warnings: string[] = [];

	try {
		if (!fs.existsSync(IRACING_INI_PATH)) {
			return warnings;
		}

		const content = fs.readFileSync(IRACING_INI_PATH, 'utf8');
		const monitorSetup = parseIniSection(content, 'MonitorSetup');

		if (
			monitorSetup.RenderViewPerMonitor &&
			monitorSetup.RenderViewPerMonitor !== '0'
		) {
			warnings.push(
				'Disable "Render Scene Using 3 Projections" in iRacing (Display > Monitor tab) to avoid vertical bands in screenshots'
			);
		}
	} catch (error) {
		// Skip check if file cannot be read
	}

	return warnings;
}
