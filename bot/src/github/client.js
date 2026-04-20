'use strict';

// ---------------------------------------------------------------------------
// Octokit singleton — built once, reused by every github/* module.
// ---------------------------------------------------------------------------
// D-09: authentication is a fine-grained Personal Access Token read from
// config.githubToken (env: GITHUB_TOKEN). userAgent identifies this bot in
// GitHub's request logs. `request.retries: 3` opts into Octokit v22's
// native primary/secondary rate-limit retry behaviour (no plugin needed).
//
// resetOctokit() is exported for tests so each test can clear the cache and
// re-instantiate under a fresh mock.
// ---------------------------------------------------------------------------

import { Octokit } from '@octokit/rest';
import config from '../config.js';

let _octokit = null;

export function getOctokit() {
	if (_octokit) {
		return _octokit;
	}
	_octokit = new Octokit({
		auth: config.githubToken,
		userAgent: 'iracing-screenshot-tool-bot/0.1.0',
		request: { retries: 3 }
	});
	return _octokit;
}

export function resetOctokit() {
	_octokit = null;
}
