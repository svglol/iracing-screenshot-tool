'use strict';

// ---------------------------------------------------------------------------
// verifyHmac — timing-safe HMAC-SHA256 signature verification for GitHub
// webhook deliveries (RESEARCH.md §Pitfall 4, "Don't Hand-Roll" row on HMAC).
// ---------------------------------------------------------------------------
// GitHub signs each webhook POST with the shared secret and sends the hex
// digest in the `X-Hub-Signature-256` header as `sha256=<hex>`. The verifier
// MUST:
//   - refuse an empty/missing signature (don't treat "" as valid)
//   - reject length mismatches BEFORE calling timingSafeEqual (which throws
//     when its two inputs differ in byte length — this is a subtle footgun)
//   - compare via `crypto.timingSafeEqual`, NEVER `===`
//   - never throw across the module boundary — return false on any error
// ---------------------------------------------------------------------------

import crypto from 'crypto';
import { verifySignature } from './verifyHmac.js';

const SECRET = 'shhh';
const body = Buffer.from('{"hello":"world"}', 'utf8');
const good =
	'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');

describe('verifySignature', () => {
	test('accepts valid signature', () => {
		expect(verifySignature(body, good, SECRET)).toBe(true);
	});

	test('rejects tampered signature (flipped last byte)', () => {
		const bad = good.slice(0, -1) + (good.endsWith('0') ? '1' : '0');
		expect(verifySignature(body, bad, SECRET)).toBe(false);
	});

	test('rejects wrong secret', () => {
		expect(verifySignature(body, good, 'other-secret')).toBe(false);
	});

	test('rejects missing/empty signature', () => {
		expect(verifySignature(body, '', SECRET)).toBe(false);
		expect(verifySignature(body, null, SECRET)).toBe(false);
		expect(verifySignature(body, undefined, SECRET)).toBe(false);
	});

	test('rejects when lengths differ (avoids timingSafeEqual throw)', () => {
		expect(verifySignature(body, 'sha256=short', SECRET)).toBe(false);
	});
});
