'use strict';

// ---------------------------------------------------------------------------
// Mocks — hermetic config stub and @octokit/rest mock shared with issues.test.js
// pattern (jest.mock is hoisted above imports by babel-jest).
// ---------------------------------------------------------------------------

jest.mock('../config.js', () => {
	const stub = {
		githubToken: 'tkn',
		githubOwner: 'svglol',
		githubRepo: 'iracing-screenshot-tool',
		logDir: '',
		logLevel: 'info'
	};
	return { __esModule: true, default: stub };
});

const mockRest = {
	issues: {
		listLabelsForRepo: jest.fn(),
		createLabel: jest.fn()
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

import { seedLabels, LABEL_TAXONOMY } from './labels.js';
import { resetOctokit } from './client.js';

beforeEach(() => {
	resetOctokit();
	jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// LABEL_TAXONOMY shape
// ---------------------------------------------------------------------------
describe('LABEL_TAXONOMY', () => {
	test('is frozen', () => {
		expect(Object.isFrozen(LABEL_TAXONOMY)).toBe(true);
	});

	test('contains all eight labels from CONTEXT.md discretion', () => {
		const names = LABEL_TAXONOMY.map((l) => l.name);
		expect(names).toEqual([
			'bug',
			'feature',
			'duplicate',
			'triaged',
			'in-progress',
			'fixed',
			'wontfix',
			'needs-repro'
		]);
	});

	test('every label has name (string), color (6-hex, no #), description (string)', () => {
		for (const l of LABEL_TAXONOMY) {
			expect(typeof l.name).toBe('string');
			expect(l.name.length).toBeGreaterThan(0);
			expect(l.color).toMatch(/^[0-9a-f]{6}$/i);
			expect(typeof l.description).toBe('string');
		}
	});

	test('has exactly eight entries', () => {
		expect(LABEL_TAXONOMY.length).toBe(8);
	});
});

// ---------------------------------------------------------------------------
// seedLabels
// ---------------------------------------------------------------------------
describe('seedLabels', () => {
	test('creates missing labels and skips existing', async () => {
		mockRest.issues.listLabelsForRepo.mockResolvedValue({
			data: [{ name: 'bug' }, { name: 'feature' }]
		});
		mockRest.issues.createLabel.mockResolvedValue({ data: {} });
		const result = await seedLabels();
		expect(result.skipped).toEqual(expect.arrayContaining(['bug', 'feature']));
		expect(result.created).toEqual(
			expect.arrayContaining([
				'duplicate',
				'triaged',
				'in-progress',
				'fixed',
				'wontfix',
				'needs-repro'
			])
		);
		expect(mockRest.issues.createLabel).toHaveBeenCalledTimes(6);
	});

	test('is idempotent — second run creates nothing', async () => {
		mockRest.issues.listLabelsForRepo.mockResolvedValue({
			data: LABEL_TAXONOMY.map((l) => ({ name: l.name }))
		});
		const result = await seedLabels();
		expect(result.created).toEqual([]);
		expect(result.skipped.length).toBe(LABEL_TAXONOMY.length);
		expect(mockRest.issues.createLabel).not.toHaveBeenCalled();
	});

	test('returns {error} and does not attempt creates when listLabelsForRepo throws', async () => {
		mockRest.issues.listLabelsForRepo.mockRejectedValue(new Error('403 forbidden'));
		const result = await seedLabels();
		expect(result.error).toContain('403');
		expect(result.created).toEqual([]);
		expect(result.skipped).toEqual([]);
		expect(mockRest.issues.createLabel).not.toHaveBeenCalled();
	});

	test('continues seeding other labels when one create fails', async () => {
		mockRest.issues.listLabelsForRepo.mockResolvedValue({ data: [] });
		mockRest.issues.createLabel.mockImplementation(async ({ name }) => {
			if (name === 'feature') {
				throw new Error('422');
			}
			return { data: {} };
		});
		const result = await seedLabels();
		expect(result.created).toEqual(
			expect.arrayContaining([
				'bug',
				'duplicate',
				'triaged',
				'in-progress',
				'fixed',
				'wontfix',
				'needs-repro'
			])
		);
		expect(result.created).not.toContain('feature');
	});

	test('passes owner/repo/name/color/description through on create', async () => {
		mockRest.issues.listLabelsForRepo.mockResolvedValue({ data: [] });
		mockRest.issues.createLabel.mockResolvedValue({ data: {} });
		await seedLabels();
		expect(mockRest.issues.createLabel).toHaveBeenCalledWith(
			expect.objectContaining({
				owner: 'svglol',
				repo: 'iracing-screenshot-tool',
				name: 'bug',
				color: expect.stringMatching(/^[0-9a-f]{6}$/i),
				description: expect.any(String)
			})
		);
	});

	test('does NOT update existing labels that have mismatched color/description', async () => {
		// Simulate a human having customized `bug` with a different color;
		// seedLabels must preserve human edits (skip, not update).
		mockRest.issues.listLabelsForRepo.mockResolvedValue({
			data: [{ name: 'bug', color: '000000', description: 'custom' }]
		});
		mockRest.issues.createLabel.mockResolvedValue({ data: {} });
		const result = await seedLabels();
		expect(result.skipped).toContain('bug');
		// createLabel must not be called for 'bug' under any circumstance
		const callNames = mockRest.issues.createLabel.mock.calls.map((c) => c[0].name);
		expect(callNames).not.toContain('bug');
	});
});
