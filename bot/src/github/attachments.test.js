'use strict';

// ---------------------------------------------------------------------------
// Mocks — hermetic config stub and @octokit/rest mock matching the pattern
// from issues.test.js / labels.test.js (jest.mock hoisted above imports by
// babel-jest).
// ---------------------------------------------------------------------------

jest.mock('../config.js', () => {
	const stub = {
		githubToken: 'tkn',
		githubOwner: 'svglol',
		githubRepo: 'iracing-screenshot-tool',
		githubAttachmentsBranch: 'bug-attachments',
		logDir: '',
		logLevel: 'info'
	};
	return { __esModule: true, default: stub };
});

const mockRest = {
	repos: {
		getBranch: jest.fn(),
		getContent: jest.fn(),
		createOrUpdateFileContents: jest.fn()
	},
	git: {
		createTree: jest.fn(),
		createCommit: jest.fn(),
		createRef: jest.fn()
	}
};

jest.mock(
	'@octokit/rest',
	() => ({
		__esModule: true,
		Octokit: jest.fn().mockImplementation(() => ({ rest: mockRest }))
	}),
	{ virtual: true }
);

import {
	sanitizeAttachmentName,
	ALLOWED_EXTENSIONS,
	MAX_ATTACHMENT_BYTES,
	ensureAttachmentsBranch,
	uploadAttachment,
	_resetBranchEnsuredForTests
} from './attachments.js';
import { resetOctokit } from './client.js';

beforeEach(() => {
	resetOctokit();
	_resetBranchEnsuredForTests();
	jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// sanitizeAttachmentName
// ---------------------------------------------------------------------------
describe('sanitizeAttachmentName', () => {
	test('accepts normal png', () => {
		expect(sanitizeAttachmentName('screen.png')).toEqual({ ok: true, name: 'screen.png' });
	});

	test('rejects path traversal ..', () => {
		expect(sanitizeAttachmentName('../etc/passwd.log').ok).toBe(false);
		expect(sanitizeAttachmentName('..').ok).toBe(false);
		expect(sanitizeAttachmentName('foo/../bar.png').ok).toBe(false);
	});

	test('rejects null byte', () => {
		expect(sanitizeAttachmentName('bad\0.png').ok).toBe(false);
	});

	test('strips directory components, keeps basename', () => {
		expect(sanitizeAttachmentName('foo/bar/baz.jpg')).toEqual({ ok: true, name: 'baz.jpg' });
		expect(sanitizeAttachmentName('foo\\bar\\baz.jpg')).toEqual({ ok: true, name: 'baz.jpg' });
	});

	test('replaces disallowed chars with underscore', () => {
		expect(sanitizeAttachmentName('my screen (1).png')).toEqual({ ok: true, name: 'my_screen__1_.png' });
	});

	test('rejects extension not in allowlist', () => {
		expect(sanitizeAttachmentName('exploit.exe').ok).toBe(false);
		expect(sanitizeAttachmentName('script.sh').ok).toBe(false);
		expect(sanitizeAttachmentName('no-extension').ok).toBe(false);
	});

	test('accepts all allowed extensions', () => {
		for (const ext of ALLOWED_EXTENSIONS) {
			expect(sanitizeAttachmentName(`file${ext}`).ok).toBe(true);
		}
	});

	test('rejects empty / null / undefined', () => {
		expect(sanitizeAttachmentName('').ok).toBe(false);
		expect(sanitizeAttachmentName(null).ok).toBe(false);
		expect(sanitizeAttachmentName(undefined).ok).toBe(false);
	});

	test('truncates to 120 chars max', () => {
		const long = 'a'.repeat(200) + '.png';
		const r = sanitizeAttachmentName(long);
		expect(r.ok).toBe(true);
		expect(r.name.length).toBeLessThanOrEqual(120);
	});

	test('reason field present on rejection', () => {
		expect(sanitizeAttachmentName('..').reason).toBe('path-traversal');
		expect(sanitizeAttachmentName('bad\0.png').reason).toBe('null-byte');
		expect(sanitizeAttachmentName('').reason).toBe('empty');
		expect(sanitizeAttachmentName('a.exe').reason).toBe('extension-not-allowed');
	});
});

// ---------------------------------------------------------------------------
// ensureAttachmentsBranch
// ---------------------------------------------------------------------------
describe('ensureAttachmentsBranch', () => {
	test('no-op when branch already exists', async () => {
		mockRest.repos.getBranch.mockResolvedValue({ data: { name: 'bug-attachments' } });
		expect(await ensureAttachmentsBranch()).toBe(true);
		expect(mockRest.git.createTree).not.toHaveBeenCalled();
		expect(mockRest.git.createCommit).not.toHaveBeenCalled();
		expect(mockRest.git.createRef).not.toHaveBeenCalled();
	});

	test('creates orphan branch on 404 via empty tree + parentless commit + createRef', async () => {
		const err = new Error('Not Found');
		err.status = 404;
		mockRest.repos.getBranch.mockRejectedValue(err);
		mockRest.git.createTree.mockResolvedValue({ data: { sha: 'tree1' } });
		mockRest.git.createCommit.mockResolvedValue({ data: { sha: 'commit1' } });
		mockRest.git.createRef.mockResolvedValue({ data: {} });

		expect(await ensureAttachmentsBranch()).toBe(true);
		expect(mockRest.git.createTree).toHaveBeenCalledWith(
			expect.objectContaining({ tree: [] })
		);
		expect(mockRest.git.createCommit).toHaveBeenCalledWith(
			expect.objectContaining({ parents: [], tree: 'tree1' })
		);
		expect(mockRest.git.createRef).toHaveBeenCalledWith(
			expect.objectContaining({ ref: 'refs/heads/bug-attachments', sha: 'commit1' })
		);
	});

	test('returns false on unexpected non-404 error', async () => {
		const err = new Error('Service Unavailable');
		err.status = 503;
		mockRest.repos.getBranch.mockRejectedValue(err);
		expect(await ensureAttachmentsBranch()).toBe(false);
		expect(mockRest.git.createTree).not.toHaveBeenCalled();
	});

	test('returns false when orphan branch creation fails', async () => {
		const err = new Error('Not Found');
		err.status = 404;
		mockRest.repos.getBranch.mockRejectedValue(err);
		mockRest.git.createTree.mockRejectedValue(new Error('500'));
		expect(await ensureAttachmentsBranch()).toBe(false);
	});

	test('caches success — second call does not hit the network', async () => {
		mockRest.repos.getBranch.mockResolvedValue({ data: { name: 'bug-attachments' } });
		await ensureAttachmentsBranch();
		await ensureAttachmentsBranch();
		expect(mockRest.repos.getBranch).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------
// uploadAttachment
// ---------------------------------------------------------------------------
describe('uploadAttachment', () => {
	beforeEach(() => {
		mockRest.repos.getBranch.mockResolvedValue({ data: { name: 'bug-attachments' } });
	});

	test('happy path: uploads and returns raw URL on bug-attachments branch', async () => {
		mockRest.repos.getContent.mockRejectedValue(
			Object.assign(new Error('Not Found'), { status: 404 })
		);
		mockRest.repos.createOrUpdateFileContents.mockResolvedValue({ data: {} });

		const r = await uploadAttachment({
			issueNumber: 42,
			filename: 'pic.png',
			bytes: Buffer.from('hello')
		});

		expect(r).toMatchObject({ ok: true, name: 'pic.png' });
		expect(r.url).toBe(
			'https://raw.githubusercontent.com/svglol/iracing-screenshot-tool/bug-attachments/42/pic.png'
		);
		expect(mockRest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
			expect.objectContaining({
				branch: 'bug-attachments',
				path: '42/pic.png',
				committer: { name: 'iracing-screenshot-bot', email: 'bot@noreply.svglol' }
			})
		);
	});

	test('content is base64-encoded before being sent', async () => {
		mockRest.repos.getContent.mockRejectedValue(
			Object.assign(new Error('Not Found'), { status: 404 })
		);
		mockRest.repos.createOrUpdateFileContents.mockResolvedValue({ data: {} });

		await uploadAttachment({
			issueNumber: 1,
			filename: 'a.png',
			bytes: Buffer.from('hello')
		});

		const call = mockRest.repos.createOrUpdateFileContents.mock.calls[0][0];
		expect(call.content).toBe(Buffer.from('hello').toString('base64'));
	});

	test('rejects too-large bytes without any network call', async () => {
		const big = Buffer.alloc(MAX_ATTACHMENT_BYTES + 1);
		const r = await uploadAttachment({
			issueNumber: 1,
			filename: 'big.png',
			bytes: big
		});
		expect(r).toEqual({ ok: false, reason: 'too-large' });
		expect(mockRest.repos.createOrUpdateFileContents).not.toHaveBeenCalled();
	});

	test('rejects empty bytes', async () => {
		const r = await uploadAttachment({
			issueNumber: 1,
			filename: 'a.png',
			bytes: Buffer.alloc(0)
		});
		expect(r).toEqual({ ok: false, reason: 'empty-bytes' });
		expect(mockRest.repos.createOrUpdateFileContents).not.toHaveBeenCalled();
	});

	test('rejects unsafe filename before any network call', async () => {
		const r = await uploadAttachment({
			issueNumber: 1,
			filename: '../evil.png',
			bytes: Buffer.from('x')
		});
		expect(r).toEqual({ ok: false, reason: 'path-traversal' });
		expect(mockRest.repos.createOrUpdateFileContents).not.toHaveBeenCalled();
		expect(mockRest.repos.getBranch).not.toHaveBeenCalled();
	});

	test('rejects extension-not-allowed before network call', async () => {
		const r = await uploadAttachment({
			issueNumber: 1,
			filename: 'exploit.exe',
			bytes: Buffer.from('x')
		});
		expect(r).toEqual({ ok: false, reason: 'extension-not-allowed' });
		expect(mockRest.repos.createOrUpdateFileContents).not.toHaveBeenCalled();
	});

	test('returns {ok:false, reason:commit-failed} on createOrUpdateFileContents throw', async () => {
		mockRest.repos.getContent.mockRejectedValue(
			Object.assign(new Error('Not Found'), { status: 404 })
		);
		mockRest.repos.createOrUpdateFileContents.mockRejectedValue(new Error('500'));
		const r = await uploadAttachment({
			issueNumber: 1,
			filename: 'a.png',
			bytes: Buffer.from('x')
		});
		expect(r).toEqual({ ok: false, reason: 'commit-failed' });
	});

	test('returns {ok:false, reason:branch-unavailable} when ensureAttachmentsBranch fails', async () => {
		const err = new Error('Service Unavailable');
		err.status = 503;
		mockRest.repos.getBranch.mockReset();
		mockRest.repos.getBranch.mockRejectedValue(err);

		const r = await uploadAttachment({
			issueNumber: 1,
			filename: 'a.png',
			bytes: Buffer.from('x')
		});
		expect(r).toEqual({ ok: false, reason: 'branch-unavailable' });
		expect(mockRest.repos.createOrUpdateFileContents).not.toHaveBeenCalled();
	});

	test('passes existing file sha when file already exists', async () => {
		mockRest.repos.getContent.mockResolvedValue({
			data: { sha: 'abc123', name: 'a.png' }
		});
		mockRest.repos.createOrUpdateFileContents.mockResolvedValue({ data: {} });
		await uploadAttachment({
			issueNumber: 1,
			filename: 'a.png',
			bytes: Buffer.from('x')
		});
		expect(mockRest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
			expect.objectContaining({ sha: 'abc123' })
		);
	});

	test('returns {ok:false, reason:get-content-failed} on non-404 getContent error', async () => {
		mockRest.repos.getContent.mockRejectedValue(
			Object.assign(new Error('Forbidden'), { status: 403 })
		);
		const r = await uploadAttachment({
			issueNumber: 1,
			filename: 'a.png',
			bytes: Buffer.from('x')
		});
		expect(r).toEqual({ ok: false, reason: 'get-content-failed' });
		expect(mockRest.repos.createOrUpdateFileContents).not.toHaveBeenCalled();
	});

	test('commits with expected commit message for traceability', async () => {
		mockRest.repos.getContent.mockRejectedValue(
			Object.assign(new Error('Not Found'), { status: 404 })
		);
		mockRest.repos.createOrUpdateFileContents.mockResolvedValue({ data: {} });
		await uploadAttachment({
			issueNumber: 7,
			filename: 'shot.png',
			bytes: Buffer.from('x')
		});
		const call = mockRest.repos.createOrUpdateFileContents.mock.calls[0][0];
		expect(call.message).toContain('shot.png');
		expect(call.message).toContain('#7');
	});
});
