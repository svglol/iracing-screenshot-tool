'use strict';

// ---------------------------------------------------------------------------
// renderIssueBody — pure-function unit tests, no mocks needed.
// ---------------------------------------------------------------------------

import {
	renderBugBody,
	renderFeatureBody,
	appendAttachmentsToBody,
	escapeDiscordMentions
} from './renderIssueBody.js';

// ---------------------------------------------------------------------------
// escapeDiscordMentions
// ---------------------------------------------------------------------------
describe('escapeDiscordMentions', () => {
	test('neutralizes @everyone with zero-width space', () => {
		expect(escapeDiscordMentions('hello @everyone')).toBe('hello @\u200beveryone');
	});

	test('neutralizes @here', () => {
		expect(escapeDiscordMentions('@here please')).toBe('@\u200bhere please');
	});

	test('neutralizes both in the same string', () => {
		expect(escapeDiscordMentions('@everyone and @here')).toBe(
			'@\u200beveryone and @\u200bhere'
		);
	});

	test('leaves normal user mentions <@id> alone', () => {
		expect(escapeDiscordMentions('<@1234>')).toBe('<@1234>');
	});

	test('handles null/undefined/empty', () => {
		expect(escapeDiscordMentions(null)).toBe('');
		expect(escapeDiscordMentions(undefined)).toBe('');
		expect(escapeDiscordMentions('')).toBe('');
	});

	test('handles non-string input by coercing to string', () => {
		expect(escapeDiscordMentions(42)).toBe('42');
	});
});

// ---------------------------------------------------------------------------
// renderBugBody
// ---------------------------------------------------------------------------
describe('renderBugBody', () => {
	test('includes every section and reporter attribution', () => {
		const body = renderBugBody({
			title: 'Crash on save',
			steps: '1. Open app\n2. Save',
			expected: 'File saves',
			actual: 'Crash',
			version: '2.1.0',
			reporter: { id: '12345', username: 'alice' }
		});
		expect(body).toContain('### Steps to reproduce');
		expect(body).toContain('### Expected');
		expect(body).toContain('### Actual');
		expect(body).toContain('### App version');
		expect(body).toContain('<@12345>');
		expect(body).toContain('alice');
	});

	test('wraps user content in fenced code blocks to preserve whitespace', () => {
		const body = renderBugBody({
			title: 't',
			steps: 'step with *markdown* inside',
			expected: 'e',
			actual: 'a',
			version: 'v',
			reporter: { id: '1', username: 'u' }
		});
		expect(body).toContain('```');
		expect(body).toContain('step with *markdown* inside');
	});

	test('neutralizes @everyone in username', () => {
		const body = renderBugBody({
			title: 't',
			steps: 's',
			expected: 'e',
			actual: 'a',
			version: 'v',
			reporter: { id: '1', username: '@everyone' }
		});
		expect(body).not.toMatch(/\(@everyone\)/);
		expect(body).toContain('@\u200beveryone');
	});

	test('neutralizes @everyone in title', () => {
		const body = renderBugBody({
			title: '@everyone fix this',
			steps: 's',
			expected: 'e',
			actual: 'a',
			version: 'v',
			reporter: { id: '1', username: 'u' }
		});
		expect(body).not.toContain('@everyone fix');
		expect(body).toContain('@\u200beveryone');
	});

	test('defaults missing version to "not provided"', () => {
		const body = renderBugBody({
			title: 't',
			steps: 's',
			expected: 'e',
			actual: 'a',
			reporter: { id: '1', username: 'u' }
		});
		expect(body).toContain('not provided');
	});

	test('tolerates missing reporter object', () => {
		const body = renderBugBody({
			title: 't',
			steps: 's',
			expected: 'e',
			actual: 'a',
			version: 'v'
		});
		expect(body).toContain('Reported by');
	});

	test('truncates very long titles to 200 chars', () => {
		const body = renderBugBody({
			title: 'T'.repeat(300),
			steps: 's',
			expected: 'e',
			actual: 'a',
			version: 'v',
			reporter: { id: '1', username: 'u' }
		});
		// The rendered title should not contain 300 consecutive T's.
		expect(body).not.toContain('T'.repeat(201));
	});
});

// ---------------------------------------------------------------------------
// renderFeatureBody
// ---------------------------------------------------------------------------
describe('renderFeatureBody', () => {
	test('includes Use case / Why / Nice-to-have sections', () => {
		const body = renderFeatureBody({
			title: 'Dark mode',
			useCase: 'Reduce eye strain',
			why: 'Night sessions',
			niceToHave: 'OLED-friendly pure black',
			reporter: { id: '99', username: 'bob' }
		});
		expect(body).toContain('### Use case');
		expect(body).toContain('### Why');
		expect(body).toContain('### Nice-to-have');
		expect(body).toContain('<@99>');
	});

	test('defaults missing nice-to-have to n/a', () => {
		const body = renderFeatureBody({
			title: 't',
			useCase: 'uc',
			why: 'w',
			reporter: { id: '1', username: 'u' }
		});
		expect(body).toContain('n/a');
	});

	test('neutralizes @everyone in any field via title', () => {
		const body = renderFeatureBody({
			title: '@everyone want this',
			useCase: 'uc',
			why: 'w',
			reporter: { id: '1', username: 'u' }
		});
		expect(body).toContain('@\u200beveryone');
	});
});

// ---------------------------------------------------------------------------
// appendAttachmentsToBody
// ---------------------------------------------------------------------------
describe('appendAttachmentsToBody', () => {
	test('returns body unchanged when attachments empty', () => {
		expect(appendAttachmentsToBody('X', [])).toBe('X');
		expect(appendAttachmentsToBody('X', null)).toBe('X');
		expect(appendAttachmentsToBody('X', undefined)).toBe('X');
	});

	test('renders images as ![]() and non-images as - []()', () => {
		const out = appendAttachmentsToBody('body', [
			{ name: 'shot.png', url: 'https://x/shot.png' },
			{ name: 'bot.log', url: 'https://x/bot.log' }
		]);
		expect(out).toContain('![shot.png](https://x/shot.png)');
		expect(out).toContain('- [bot.log](https://x/bot.log)');
	});

	test('includes ### Attachments heading', () => {
		const out = appendAttachmentsToBody('body', [{ name: 'a.png', url: 'u' }]);
		expect(out).toContain('### Attachments');
	});

	test('recognizes all image extensions', () => {
		const imgExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
		for (const ext of imgExts) {
			const out = appendAttachmentsToBody('', [
				{ name: `file${ext}`, url: `https://x/file${ext}` }
			]);
			expect(out).toContain(`![file${ext}](https://x/file${ext})`);
		}
	});

	test('handles mixed-case extensions as images', () => {
		const out = appendAttachmentsToBody('', [
			{ name: 'photo.PNG', url: 'https://x/photo.PNG' }
		]);
		expect(out).toContain('![photo.PNG](https://x/photo.PNG)');
	});

	test('preserves original body content', () => {
		const out = appendAttachmentsToBody('Original body text', [
			{ name: 'a.png', url: 'u' }
		]);
		expect(out).toContain('Original body text');
	});
});
