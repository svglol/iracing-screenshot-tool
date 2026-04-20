'use strict';

// ---------------------------------------------------------------------------
// Permission gate — pure, total, null-safe.
// ---------------------------------------------------------------------------
// D-15 mandates two paths to triage:
//   1. The hard-coded owner Discord ID (config.discordOwnerId).
//   2. Any member holding the "Maintainer" role (config.discordMaintainerRoleId).
//
// Every function here MUST return a boolean and MUST NOT throw, even on
// malformed inputs (missing `user`, missing `member`, roles cache with no
// `.has` method, etc.) — the intent is that call sites can drop these in
// front of a command handler without defensive null-checks of their own.
// ---------------------------------------------------------------------------

import config from './config.js';

export function isOwner(userId) {
	if (userId === null || userId === undefined) {
		return false;
	}
	const s = String(userId);
	if (s.length === 0) {
		return false;
	}
	return s === String(config.discordOwnerId);
}

export function hasMaintainerRole(member) {
	const cache = member?.roles?.cache;
	// A valid Discord.js role cache is a Collection (Map subclass) — it has
	// `.has`. Reject anything that lacks it so e.g. `cache = {}` or a plain
	// array can't slip through and throw at call time.
	if (!cache || typeof cache.has !== 'function') {
		return false;
	}
	return cache.has(config.discordMaintainerRoleId);
}

export function canTriage(interaction) {
	if (isOwner(interaction?.user?.id)) {
		return true;
	}
	return hasMaintainerRole(interaction?.member);
}
