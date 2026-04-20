'use strict';

// ---------------------------------------------------------------------------
// createBotErrorPayload — uniform error shape for the bot.
// ---------------------------------------------------------------------------
// Mirrors `createScreenshotErrorPayload` in `src/main/main-utils.js` so that
// log aggregation tools can parse errors from the desktop app and the bot
// with a single schema. The six fields (message, stack, source, context,
// meta, diagnostics) are always present; meta and diagnostics are always
// plain objects regardless of input shape.
// ---------------------------------------------------------------------------

// `source` is constrained to values meaningful in the bot's architecture.
// Anything else (including 'main' from the desktop app) is coerced to 'bot'
// so a misconfigured caller can't smuggle an arbitrary source label through.
const VALID_SOURCES = new Set(['discord', 'github', 'webhook', 'storage', 'bot']);

function isPlainObject(v) {
	return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function toPlainObject(v) {
	return isPlainObject(v) ? v : {};
}

export function createBotErrorPayload(errorLike, defaults = {}) {
	let message = 'Unknown bot error';
	let stack = '';

	if (errorLike instanceof Error) {
		if (errorLike.message) {
			message = String(errorLike.message);
		}
		if (errorLike.stack) {
			stack = String(errorLike.stack);
		}
	} else if (typeof errorLike === 'string' && errorLike.length > 0) {
		message = errorLike;
	} else if (isPlainObject(errorLike)) {
		if (errorLike.message) {
			message = String(errorLike.message);
		}
		if (errorLike.stack) {
			stack = String(errorLike.stack);
		}
	}

	const rawSource = String(defaults.source || 'bot');
	const source = VALID_SOURCES.has(rawSource) ? rawSource : 'bot';

	return {
		message,
		stack,
		source,
		context: String(defaults.context || ''),
		meta: toPlainObject(defaults.meta),
		diagnostics: toPlainObject(defaults.diagnostics)
	};
}
