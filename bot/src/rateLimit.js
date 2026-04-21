'use strict';

// ---------------------------------------------------------------------------
// Rate-limit facade over storage/rateLimits.js.
// ---------------------------------------------------------------------------
// This module exists so command handlers don't have to know about
// config.rateLimitPerDay — they just call `check(userId)` and `record(userId)`.
// Keep it thin: every line of logic in here is a line of logic that isn't
// being exercised by the storage-layer tests.
//
// D-14: "configurable via env var" — the cap comes from config.rateLimitPerDay,
// which is loaded once at module init and frozen (see config.js).
// ---------------------------------------------------------------------------

import config from './config.js';
import * as store from './storage/rateLimits.js';

export function check(userId) {
	return store.canSubmit(userId, config.rateLimitPerDay);
}

export function record(userId) {
	store.increment(userId);
}
