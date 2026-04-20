'use strict';

// ---------------------------------------------------------------------------
// Fastify HTTP server exposing POST /webhook/github only.
// ---------------------------------------------------------------------------
// This is the one public-internet surface the bot exposes (via Cloudflare
// Tunnel in prod — D-19). Every request MUST be authenticated via GitHub's
// HMAC signature on the RAW body, with replay protection via delivery UUIDs.
//
// Request flow:
//   1. `x-hub-signature-256` missing    → 401 {error: 'missing signature'}
//   2. Signature invalid                → 401 {error: 'invalid signature'}
//   3. `x-github-delivery` missing      → 400 {error: 'missing delivery id'}
//   4. Delivery seen within 5-min window → 200 {ok: true, replay: true}
//      (idempotent — re-processing would double-ping the reporter)
//   5. recordDelivery + dispatch(event, body) → 200 {ok: true}
//   6. Any throw from dispatch          → 500 {error: 'internal'}
//
// Why `fastify-raw-body` with `runFirst: true` (RESEARCH.md §Pitfall 4):
//   Fastify auto-parses JSON. If we compute HMAC over the parsed-and-
//   re-stringified body, it will NOT be byte-identical to the body GitHub
//   signed (whitespace, key ordering, unicode normalization all differ).
//   `fastify-raw-body` with `runFirst: true` captures the raw Buffer
//   BEFORE the JSON parser runs, so `request.rawBody` is exactly what
//   GitHub signed and `request.body` is the parsed JSON for routing.
//
// The server `start()` does NOT `await` from the bot entrypoint's call
// site — startup failure logs and does not abort the Discord pipeline.
// ---------------------------------------------------------------------------

import Fastify from 'fastify';
import rawBody from 'fastify-raw-body';
import config from '../config.js';
import { createLogger } from '../logger.js';
import { verifySignature } from './verifyHmac.js';
import { isReplay, recordDelivery } from './deliveries.js';
import { dispatch } from './handlers.js';

const log = createLogger('webhook:server');

export async function buildServer() {
	const fastify = Fastify({
		logger: false,
		disableRequestLogging: true,
		trustProxy: true
	});

	// Strip the `x-powered-by` header — we don't advertise the framework.
	fastify.addHook('onSend', (_req, reply, _payload, done) => {
		reply.header('x-powered-by', undefined);
		done();
	});

	// runFirst: true → raw body captured BEFORE JSON parser runs.
	// global: false + per-route `config: { rawBody: true }` keeps the raw
	// buffer off every request we might add later.
	await fastify.register(rawBody, {
		field: 'rawBody',
		global: false,
		encoding: false,
		runFirst: true
	});

	fastify.post(
		'/webhook/github',
		{ config: { rawBody: true } },
		async (req, reply) => {
			const sig = req.headers['x-hub-signature-256'];
			const evt = req.headers['x-github-event'];
			const did = req.headers['x-github-delivery'];

			if (!sig) {
				log.info('Webhook rejected', { reason: 'missing-sig' });
				return reply.code(401).send({ error: 'missing signature' });
			}
			if (!verifySignature(req.rawBody, sig, config.githubWebhookSecret)) {
				log.info('Webhook rejected', { reason: 'bad-sig' });
				return reply.code(401).send({ error: 'invalid signature' });
			}
			if (!did) {
				return reply.code(400).send({ error: 'missing delivery id' });
			}
			if (isReplay(did)) {
				// Idempotent: we already processed this delivery. Re-dispatching
				// would double-ping the reporter. Reply 200 so GitHub stops
				// retrying (a non-2xx triggers exponential backoff retries).
				log.info('Replay ignored', { did });
				return reply.send({ ok: true, replay: true });
			}
			recordDelivery(did);

			try {
				await dispatch(evt, req.body);
				return reply.send({ ok: true });
			} catch (err) {
				log.error('dispatch threw', {
					err: String((err && err.message) || err)
				});
				return reply.code(500).send({ error: 'internal' });
			}
		}
	);

	// Explicit 404 for every other path — hides framework details and
	// gives a consistent error shape for scanners/probes.
	fastify.setNotFoundHandler((_req, reply) =>
		reply.code(404).send({ error: 'not found' })
	);

	return fastify;
}

// ---------------------------------------------------------------------------
// start — construct + listen. Host 0.0.0.0 so the Cloudflare Tunnel
// sidecar process can reach the port on localhost as well as on a private
// network interface (the tunnel daemon runs locally).
// ---------------------------------------------------------------------------
export async function start() {
	const f = await buildServer();
	await f.listen({ port: config.webhookPort, host: '0.0.0.0' });
	log.info('Webhook server listening', { port: config.webhookPort });
	return f;
}
