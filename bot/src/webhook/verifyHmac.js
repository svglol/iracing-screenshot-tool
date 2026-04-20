'use strict';

// ---------------------------------------------------------------------------
// HMAC-SHA256 signature verification for GitHub webhook deliveries.
// ---------------------------------------------------------------------------
// GitHub signs each webhook POST body with the shared secret and sends the
// hex digest in the `X-Hub-Signature-256` header formatted as `sha256=<hex>`.
//
// Implementation notes (RESEARCH.md §Pitfall 4, §"Don't Hand-Roll" HMAC row):
//   - Compute HMAC over the RAW body bytes, NEVER the parsed+re-stringified
//     JSON (fastify-raw-body runs BEFORE the JSON parser for that reason).
//   - Compare via `crypto.timingSafeEqual` — strict `===` leaks timing info
//     that can be used to forge signatures byte-by-byte.
//   - `timingSafeEqual` THROWS when its two Buffer arguments differ in
//     length; guard with an explicit length check first so a malformed
//     signature header never crashes the request handler.
//   - Never throw across the module boundary — return `false` on any
//     exception so the Fastify route always gets a simple boolean.
// ---------------------------------------------------------------------------

// Bare `crypto` specifier (not `node:crypto`) — Jest 25's resolver rejects
// `node:*` scheme (same as logger.js / db.js); Node 24 resolves both forms.
import crypto from 'crypto';

export function verifySignature(rawBody, signatureHeader, secret) {
	try {
		if (!signatureHeader || typeof signatureHeader !== 'string') {
			return false;
		}
		if (!secret || typeof secret !== 'string') {
			return false;
		}
		const expected =
			'sha256=' +
			crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
		const a = Buffer.from(signatureHeader, 'utf8');
		const b = Buffer.from(expected, 'utf8');
		// Length guard MUST come before timingSafeEqual — it throws otherwise.
		if (a.length !== b.length) {
			return false;
		}
		return crypto.timingSafeEqual(a, b);
	} catch {
		return false;
	}
}
