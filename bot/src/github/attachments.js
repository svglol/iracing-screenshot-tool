'use strict';

// ---------------------------------------------------------------------------
// Attachment re-hosting pipeline (D-18 / D-03).
// ---------------------------------------------------------------------------
// Discord CDN URLs expire in ~24h (RESEARCH.md §Pitfall 2) and GitHub has no
// public REST endpoint for uploading files to an issue (§Pitfall 3). The only
// durable storage is a commit. This module fetches the bytes that the caller
// already pulled from the Discord CDN and commits them to a dedicated
// *orphan* branch (`bug-attachments`) so the main branch stays free of binary
// churn. D-18 locks the orphan-branch strategy.
//
// Security (§Known Threat Patterns):
// - Filename sanitization: reject path traversal (`..`), directory
//   separators, null bytes, and filenames whose extension is not in a small
//   allowlist. Strip any directory component — we only ever commit to
//   `<issue-number>/<basename>` on the orphan branch.
// - Size cap: 10 MB per attachment. Anything larger is rejected pre-commit.
//
// Return shape:
// - Success: `{ ok: true, url, name }` where `url` is the
//   raw.githubusercontent.com URL pointing at the orphan branch, NOT main.
// - Failure: `{ ok: false, reason }` — never throws across the boundary so
//   the caller can report a user-visible error without catching exceptions.
// ---------------------------------------------------------------------------

import path from 'path';
import config from '../config.js';
import { getOctokit } from './client.js';
import { createLogger } from '../logger.js';

const log = createLogger('github:attachments');

export const ALLOWED_EXTENSIONS = Object.freeze(
	new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.log', '.txt', '.json'])
);
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

// Deferred accessors so tests that mock config after module load still see
// the mock (config values are read at call time, not at import time).
const owner = () => config.githubOwner;
const repo = () => config.githubRepo;
const branch = () => config.githubAttachmentsBranch;

// Module-level cache: once the orphan branch is confirmed/created we never
// re-check within the same process. Reset via _resetBranchEnsuredForTests.
let _branchEnsured = false;

// ---------------------------------------------------------------------------
// sanitizeAttachmentName
// ---------------------------------------------------------------------------
// Returns `{ ok: true, name }` or `{ ok: false, reason }`. Pure function —
// no side effects, no network, safe to call before any Octokit operation.
export function sanitizeAttachmentName(name) {
	if (name === null || name === undefined) {
		return { ok: false, reason: 'empty' };
	}
	const s = String(name);
	if (s.length === 0) {
		return { ok: false, reason: 'empty' };
	}
	if (s.includes('\0')) {
		return { ok: false, reason: 'null-byte' };
	}
	// Reject `..` anywhere — as full string, as a component, or inline.
	if (
		s === '..' ||
		s.includes('../') ||
		s.includes('..\\') ||
		s.split(/[\\/]/).includes('..')
	) {
		return { ok: false, reason: 'path-traversal' };
	}
	// Take last path segment only — we never want to commit into a
	// subdirectory below `<issue-number>/`.
	let base = s.split(/[\\/]/).pop();
	if (!base || base.length === 0) {
		return { ok: false, reason: 'empty' };
	}
	// Replace disallowed characters with underscore. Keep
	// `[A-Za-z0-9._-]` — anything else (spaces, parens, unicode, etc.)
	// collapses to `_`.
	base = base.replace(/[^A-Za-z0-9._-]/g, '_');
	// Extension check against ALLOWED_EXTENSIONS happens BEFORE truncation
	// so a long filename like `a....a.png` doesn't get its extension
	// chopped off by the 120-char cap. Reject unknown or missing
	// extensions to block arbitrary file uploads.
	const ext = path.extname(base).toLowerCase();
	if (!ALLOWED_EXTENSIONS.has(ext)) {
		return { ok: false, reason: 'extension-not-allowed' };
	}
	if (base.length > 120) {
		// Preserve the extension: trim the stem so the total length is
		// <= 120 but `.ext` still trails.
		const stemLen = Math.max(1, 120 - ext.length);
		const stem = base.slice(0, base.length - ext.length).slice(0, stemLen);
		base = stem + ext;
	}
	return { ok: true, name: base };
}

// ---------------------------------------------------------------------------
// ensureAttachmentsBranch
// ---------------------------------------------------------------------------
// Idempotent: check if the configured orphan branch exists; if the server
// answers 404, create it via empty tree + parentless commit + createRef.
// Any other error is treated as an unexpected failure and we return false.
// Success is cached at module scope — second call is a no-op.
export async function ensureAttachmentsBranch() {
	if (_branchEnsured) {
		return true;
	}
	const octokit = getOctokit();
	const o = owner();
	const r = repo();
	const b = branch();

	try {
		await octokit.rest.repos.getBranch({ owner: o, repo: r, branch: b });
		_branchEnsured = true;
		log.debug('Attachments branch exists', { branch: b });
		return true;
	} catch (error) {
		if (!error || error.status !== 404) {
			log.error('ensureAttachmentsBranch: unexpected error', {
				status: error && error.status,
				err: String((error && error.message) || error)
			});
			return false;
		}
		// Fall through to create orphan branch.
	}

	try {
		// Orphan branch per D-18: empty tree + parentless commit + ref.
		const { data: tree } = await octokit.rest.git.createTree({
			owner: o,
			repo: r,
			tree: []
		});
		const { data: commit } = await octokit.rest.git.createCommit({
			owner: o,
			repo: r,
			message: `Initialize ${b} orphan branch (per D-18)`,
			tree: tree.sha,
			parents: []
		});
		await octokit.rest.git.createRef({
			owner: o,
			repo: r,
			ref: `refs/heads/${b}`,
			sha: commit.sha
		});
		_branchEnsured = true;
		log.info('Attachments orphan branch created', {
			branch: b,
			commit: commit.sha
		});
		return true;
	} catch (error) {
		log.error('ensureAttachmentsBranch: create failed', {
			status: error && error.status,
			err: String((error && error.message) || error)
		});
		return false;
	}
}

// Check if a file already exists at the given path on the orphan branch. On
// 404 we return undefined (the caller omits `sha` and creates a new file);
// on success we return the existing sha so `createOrUpdateFileContents`
// updates rather than errors. Any other error is rethrown to the caller.
async function fileShaIfExists(pathStr) {
	const octokit = getOctokit();
	try {
		const { data } = await octokit.rest.repos.getContent({
			owner: owner(),
			repo: repo(),
			path: pathStr,
			ref: branch()
		});
		// `getContent` returns an array when the path is a directory — we
		// only care about single files here.
		return Array.isArray(data) ? undefined : data.sha;
	} catch (error) {
		if (error && error.status === 404) {
			return undefined;
		}
		throw error;
	}
}

// ---------------------------------------------------------------------------
// uploadAttachment
// ---------------------------------------------------------------------------
// Caller has already fetched bytes from the Discord CDN (the URL expires in
// ~24h so that fetch MUST happen immediately on modal-submit; this module
// receives the bytes ready to commit). Returns `{ ok, url, name }` on
// success or `{ ok: false, reason }` on any failure.
export async function uploadAttachment({ issueNumber, filename, bytes }) {
	const san = sanitizeAttachmentName(filename);
	if (!san.ok) {
		log.info('Attachment rejected', { filename, reason: san.reason });
		return { ok: false, reason: san.reason };
	}
	if (!bytes || bytes.length === 0) {
		log.info('Attachment rejected', { filename, reason: 'empty-bytes' });
		return { ok: false, reason: 'empty-bytes' };
	}
	if (bytes.length > MAX_ATTACHMENT_BYTES) {
		log.info('Attachment rejected', {
			filename,
			reason: 'too-large',
			size: bytes.length
		});
		return { ok: false, reason: 'too-large' };
	}

	const branched = await ensureAttachmentsBranch();
	if (!branched) {
		return { ok: false, reason: 'branch-unavailable' };
	}

	const o = owner();
	const r = repo();
	const b = branch();
	// Path scheme on the orphan branch is `<issue>/<file>` — no
	// `.issue-attachments/` prefix because the entire branch is dedicated
	// to attachments (D-18).
	const pathStr = `${issueNumber}/${san.name}`;

	let sha;
	try {
		sha = await fileShaIfExists(pathStr);
	} catch (error) {
		log.error('getContent failed', {
			status: error && error.status,
			err: String((error && error.message) || error)
		});
		return { ok: false, reason: 'get-content-failed' };
	}

	try {
		const octokit = getOctokit();
		await octokit.rest.repos.createOrUpdateFileContents({
			owner: o,
			repo: r,
			path: pathStr,
			branch: b,
			message: `Attach ${san.name} for issue #${issueNumber}`,
			content: Buffer.from(bytes).toString('base64'),
			sha,
			committer: {
				name: 'iracing-screenshot-bot',
				email: 'bot@noreply.svglol'
			}
		});
	} catch (error) {
		log.error('createOrUpdateFileContents failed', {
			status: error && error.status,
			err: String((error && error.message) || error)
		});
		return { ok: false, reason: 'commit-failed' };
	}

	const url = `https://raw.githubusercontent.com/${o}/${r}/${b}/${pathStr}`;
	log.info('Attachment uploaded', { issueNumber, name: san.name, url });
	return { ok: true, url, name: san.name };
}

// Test-only: reset the module-level branch-ensured cache so each test can
// exercise the getBranch / createRef path under a fresh mock.
export function _resetBranchEnsuredForTests() {
	_branchEnsured = false;
}
