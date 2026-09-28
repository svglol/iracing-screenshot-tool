// Which DLLs are loaded into THIS process from neither Windows nor our own
// install directory — the fingerprint of third-party injection (overlays, audio
// "enhancers", RGB suites, AV hooks). Field case 2026-08: WGC's CreateForWindow
// failed from our process while Discord converted the same iRacing window, so
// the difference had to be inside our process, and "what else is in here" is
// the one question a user cannot answer for us.
//
// The pure filter is separated from the process.report read so the exclusion
// rules can be unit-tested with fixtures.

const DEFAULT_LIMIT = 40;

export interface ForeignModuleRoots {
	// %SystemRoot% (e.g. C:\WINDOWS); undefined when the env var is unset.
	systemRoot: string | undefined;
	// process.execPath — everything in its directory tree is our own install.
	execPath: string;
}

function normalize(p: string): string {
	return p.replace(/\//g, '\\').toLowerCase();
}

function dirOf(p: string): string {
	const n = normalize(p);
	const cut = n.lastIndexOf('\\');
	return cut < 0 ? n : n.slice(0, cut);
}

// Trailing separator so a root only matches its own tree — never a sibling
// that merely shares the prefix (…\iracing-screenshot-tool-hooks\).
function asTree(dir: string): string {
	return dir.endsWith('\\') ? dir : dir + '\\';
}

// Paths under %SystemRoot% or under the exe's directory are Windows'/ours; the
// rest is foreign. Case-insensitive and slash-agnostic, deduplicated in
// first-seen order, capped at `limit` with an explicit "+N more" tail so a
// truncated list never reads as complete.
export function selectForeignModules(
	sharedObjects: readonly string[],
	roots: ForeignModuleRoots,
	limit = DEFAULT_LIMIT
): string[] {
	const ownTrees: string[] = [asTree(dirOf(roots.execPath))];
	if (roots.systemRoot) {
		ownTrees.push(asTree(normalize(roots.systemRoot)));
	}
	// No %SystemRoot% in the environment: fall back to the conventional layout
	// rather than listing every system DLL as foreign.
	const looksLikeWindows = (p: string): boolean =>
		!roots.systemRoot && /^[a-z]:\\windows\\/.test(p);

	const seen = new Set<string>();
	const foreign: string[] = [];
	for (const raw of sharedObjects) {
		const key = normalize(raw);
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		if (ownTrees.some((tree) => key.startsWith(tree))) {
			continue;
		}
		if (looksLikeWindows(key)) {
			continue;
		}
		foreign.push(raw);
	}
	if (foreign.length <= limit) {
		return foreign;
	}
	return [...foreign.slice(0, limit), `…(+${foreign.length - limit} more)`];
}

// Live read for the diagnostics log; null when Node's report facility is
// unavailable. Never throws — this must not be the thing that takes the
// failure log down.
export function listForeignModules(): string[] | null {
	try {
		const report = process.report?.getReport?.() as
			| { sharedObjects?: unknown }
			| undefined;
		const objects = report?.sharedObjects;
		if (!Array.isArray(objects)) {
			return null;
		}
		return selectForeignModules(
			objects.filter((entry): entry is string => typeof entry === 'string'),
			{
				systemRoot: process.env.SystemRoot ?? process.env.windir,
				execPath: process.execPath,
			}
		);
	} catch {
		return null;
	}
}
