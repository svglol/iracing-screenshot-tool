'use strict';

// ---------------------------------------------------------------------------
// GitHub Issues CRUD surface.
// ---------------------------------------------------------------------------
// Every exported function follows the repo's try/catch + safe-default shape
// (mirroring src/utilities/iracing-config-checks.js). On failure a function
// returns `null` (single-item) or `[]` (list) — no throw crosses the module
// boundary. Callers may inspect the return and decide how to surface the
// failure to the user.
//
// Never log config.githubToken or any part of the token — only structured
// metadata (command label, GitHub status code, short error message).
// ---------------------------------------------------------------------------

import config from '../config.js';
import { getOctokit } from './client.js';
import { createLogger } from '../logger.js';

const log = createLogger('github:issues');

// Deferred accessors so tests that mock config after module load still see
// the mock (config values are read at call time, not at import time).
const owner = () => config.githubOwner;
const repo = () => config.githubRepo;

async function safe(label, fn) {
	try {
		return await fn();
	} catch (error) {
		log.error('GitHub call failed', {
			label,
			status: error && error.status,
			err: String((error && error.message) || error)
		});
		return null;
	}
}

// ---------------------------------------------------------------------------
// createIssue — D-01 / D-11
// ---------------------------------------------------------------------------
export async function createIssue({ title, body, labels = [] }) {
	return safe('createIssue', async () => {
		const { data } = await getOctokit().rest.issues.create({
			owner: owner(),
			repo: repo(),
			title,
			body,
			labels
		});
		log.info('Issue created', { number: data.number, labels });
		return data;
	});
}

// ---------------------------------------------------------------------------
// getIssue / updateIssue
// ---------------------------------------------------------------------------
export async function getIssue(number) {
	return safe('getIssue', async () => {
		const { data } = await getOctokit().rest.issues.get({
			owner: owner(),
			repo: repo(),
			issue_number: number
		});
		return data;
	});
}

export async function updateIssue(number, patch) {
	return safe('updateIssue', async () => {
		const { data } = await getOctokit().rest.issues.update({
			owner: owner(),
			repo: repo(),
			issue_number: number,
			...patch
		});
		log.info('Issue updated', { number, patch: Object.keys(patch) });
		return data;
	});
}

// ---------------------------------------------------------------------------
// closeIssue / reopenIssue
// ---------------------------------------------------------------------------
// D-16: closeIssue accepts state_reason = 'duplicate' so the triage command
// can mark issues as duplicates cleanly.
export async function closeIssue(number, { state_reason = 'completed' } = {}) {
	return safe('closeIssue', async () => {
		const { data } = await getOctokit().rest.issues.update({
			owner: owner(),
			repo: repo(),
			issue_number: number,
			state: 'closed',
			state_reason
		});
		log.info('Issue closed', { number, state_reason });
		return data;
	});
}

export async function reopenIssue(number) {
	return safe('reopenIssue', async () => {
		const { data } = await getOctokit().rest.issues.update({
			owner: owner(),
			repo: repo(),
			issue_number: number,
			state: 'open'
		});
		log.info('Issue reopened', { number });
		return data;
	});
}

// ---------------------------------------------------------------------------
// addLabels / removeLabel
// ---------------------------------------------------------------------------
export async function addLabels(number, labels) {
	return safe('addLabels', async () => {
		const { data } = await getOctokit().rest.issues.addLabels({
			owner: owner(),
			repo: repo(),
			issue_number: number,
			labels
		});
		return data;
	});
}

export async function removeLabel(number, name) {
	return safe('removeLabel', async () => {
		const { data } = await getOctokit().rest.issues.removeLabel({
			owner: owner(),
			repo: repo(),
			issue_number: number,
			name
		});
		return data;
	});
}

// ---------------------------------------------------------------------------
// listIssues — D-12 (/list, /top-features need issue listings)
// ---------------------------------------------------------------------------
// GitHub's listForRepo returns BOTH issues and PRs (PRs are issues with
// pull_request populated); filter them out here so callers always see real
// issues. Returns [] on failure to keep call sites simple.
export async function listIssues({ state = 'open', labels, per_page = 30 } = {}) {
	const result = await safe('listIssues', async () => {
		const { data } = await getOctokit().rest.issues.listForRepo({
			owner: owner(),
			repo: repo(),
			state,
			labels,
			per_page
		});
		return data.filter((i) => !i.pull_request);
	});
	return result == null ? [] : result;
}

// ---------------------------------------------------------------------------
// searchIssues — D-12 (/search)
// ---------------------------------------------------------------------------
// Prefixes the query with `repo:owner/repo` so the search is scoped to this
// repository only (GitHub's search endpoint is global by default). PRs are
// filtered out because the underlying endpoint returns both.
export async function searchIssues(query, { state, per_page = 30 } = {}) {
	const result = await safe('searchIssues', async () => {
		const scoped = `repo:${owner()}/${repo()} ${state ? `state:${state} ` : ''}${query}`;
		const { data } = await getOctokit().rest.search.issuesAndPullRequests({
			q: scoped,
			per_page
		});
		const items = data && Array.isArray(data.items) ? data.items : [];
		return items.filter((i) => !i.pull_request);
	});
	return result == null ? [] : result;
}

// ---------------------------------------------------------------------------
// addComment
// ---------------------------------------------------------------------------
export async function addComment(number, body) {
	return safe('addComment', async () => {
		const { data } = await getOctokit().rest.issues.createComment({
			owner: owner(),
			repo: repo(),
			issue_number: number,
			body
		});
		return data;
	});
}
