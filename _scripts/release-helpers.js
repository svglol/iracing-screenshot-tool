'use strict';

// Pure release-tooling helpers, extracted from release.js so they can be
// unit-tested without executing release.js's top-level side effects (which run
// on require). CommonJS so the plain `node _scripts/release.js` invocation can
// require it. Covered by _scripts/release-helpers.test.js (cq-release-desktopcap#3).

// Resolve which git remotes to publish to. Pure — performs no git calls; the
// caller passes the already-enumerated `available` remotes.
//  - requested empty  -> ['origin'] if origin exists, else throw (must pass --remote)
//  - requested given  -> those, but throw on any not present in `available`
// Never silently fans out to every configured remote (a personal fork would
// otherwise receive the tag + installer uploads) — cq-release-desktopcap#3.
function resolveRemotes(requested, available) {
	const avail = Array.isArray(available) ? available.filter(Boolean) : [];
	const req = Array.isArray(requested) ? requested.filter(Boolean) : [];

	if (req.length === 0) {
		if (avail.includes('origin')) {
			return ['origin'];
		}
		throw new Error(
			"No 'origin' remote found. Pass --remote <name> to choose a publish target."
		);
	}

	const unknown = req.filter((r) => !avail.includes(r));
	if (unknown.length > 0) {
		throw new Error(
			`Unknown remote(s): ${unknown.join(', ')}. Available: ${
				avail.join(', ') || '(none)'
			}`
		);
	}

	// De-dup while preserving order.
	return [...new Set(req)];
}

// Parse release CLI args: the first non-flag token is the bump; `--remote <name>`
// and `--remote=<name>` (comma-splittable, repeatable) collect publish targets.
// The value consumed by a space-separated `--remote <name>` is skipped so it is
// never mistaken for the bump positional (plan-check hardening).
function parseReleaseArgs(argv) {
	const args = Array.isArray(argv) ? argv : [];
	const requestedRemotes = [];
	let bump;

	for (let i = 0; i < args.length; i++) {
		const tok = args[i];

		if (tok === '--remote') {
			const val = args[i + 1];
			if (val && !val.startsWith('--')) {
				requestedRemotes.push(...val.split(',').filter(Boolean));
				i++; // consume the value token so it can't be read as `bump`
			}
			continue;
		}

		if (tok.startsWith('--remote=')) {
			requestedRemotes.push(
				...tok.slice('--remote='.length).split(',').filter(Boolean)
			);
			continue;
		}

		if (tok.startsWith('--')) {
			continue; // unrelated flag — ignore
		}

		if (bump === undefined) {
			bump = tok;
		}
	}

	return { bump, requestedRemotes };
}

module.exports = { resolveRemotes, parseReleaseArgs };
