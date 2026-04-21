'use strict';

// ---------------------------------------------------------------------------
// Attachment collector — 2-minute follow-up window after modal submit.
// ---------------------------------------------------------------------------
// Discord modals cannot contain file inputs (RESEARCH.md §Pitfall 1), so the
// intake flow asks the reporter to drop screenshots / log files in the
// reports channel as normal messages within 2 minutes. This module listens
// for up to 5 messages from the reporter, fetches each attachment's bytes
// immediately (Discord CDN URLs expire in ~24h — §Pitfall 2) and hands them
// to `uploadAttachment` for re-hosting on the orphan `bug-attachments`
// branch (D-18).
//
// Behaviour:
//   - Filter scoped to `m.author.id === reporterId`. Other people chatting
//     in the channel must NOT be able to attach to someone else's issue.
//   - Reporter can send the literal word "done" to end the window early.
//   - Timeout is treated as a normal "no attachments" path — NOT an error.
//     `awaitMessages({ errors: ['time'] })` rejects on timeout; we catch
//     and return what we've collected.
//   - Per-attachment failures (CDN 404, oversized, bad extension, commit
//     error) are logged but do NOT abort the rest of the collection —
//     losing one pic shouldn't lose the others.
// ---------------------------------------------------------------------------

import { uploadAttachment } from '../github/attachments.js';
import { createLogger } from '../logger.js';

const log = createLogger('intake:attachments');

// Exported as a constant (not inlined) so tests can assert on the window
// size without hard-coding the 2-minute magic number.
export const ATTACHMENT_WINDOW_MS = 120_000;
export const ATTACHMENT_MAX_MESSAGES = 5;

export async function collectAttachments(channel, reporterId, issueNumber) {
	const out = [];
	const filter = (m) => m && m.author && m.author.id === reporterId;

	let collected;
	try {
		collected = await channel.awaitMessages({
			filter,
			max: ATTACHMENT_MAX_MESSAGES,
			time: ATTACHMENT_WINDOW_MS,
			errors: ['time']
		});
	} catch {
		log.info('Attachment collector timed out', { issueNumber });
		return out;
	}

	for (const msg of collected.values()) {
		const content = String((msg && msg.content) || '').trim().toLowerCase();
		if (content === 'done') {
			log.debug('Reporter sent "done" — ending window', { issueNumber });
			break;
		}
		if (!msg.attachments || typeof msg.attachments.values !== 'function') {
			continue;
		}
		for (const att of msg.attachments.values()) {
			try {
				const res = await fetch(att.url);
				if (!res.ok) {
					log.error('CDN fetch non-2xx', {
						status: res.status,
						name: att.name
					});
					continue;
				}
				const bytes = Buffer.from(await res.arrayBuffer());
				const up = await uploadAttachment({
					issueNumber,
					filename: att.name,
					bytes
				});
				if (up && up.ok) {
					out.push({ name: up.name, url: up.url });
					log.info('Attachment uploaded', {
						issueNumber,
						name: up.name
					});
				} else {
					log.info('Attachment rejected', {
						issueNumber,
						name: att.name,
						reason: (up && up.reason) || 'unknown'
					});
				}
			} catch (err) {
				log.error('Attachment fetch/upload threw', {
					issueNumber,
					name: att && att.name,
					err: String((err && err.message) || err)
				});
			}
		}
	}

	return out;
}
