'use strict';

// ---------------------------------------------------------------------------
// Tests for buildBugModal — 5 TextInput ActionRows per RESEARCH.md §Pattern 3.
// ---------------------------------------------------------------------------
// Discord modals have a hard 5-ActionRow limit; the bug modal uses all five
// (title, steps, expected, actual, version). Tests pin the custom IDs, field
// count, required flags, and max lengths so a refactor can't silently shift
// the intake schema — if the intake expects `interaction.fields.getTextInputValue('steps')`,
// the modal MUST publish a `steps` custom ID.
// ---------------------------------------------------------------------------

import { buildBugModal, BUG_MODAL_ID } from './bugModal.js';

describe('BUG_MODAL_ID', () => {
	test('is a stable versioned constant', () => {
		expect(BUG_MODAL_ID).toBe('bug-modal-v1');
	});
});

describe('buildBugModal', () => {
	test('returns a ModalBuilder whose custom_id matches BUG_MODAL_ID', () => {
		const modal = buildBugModal();
		const json = modal.toJSON();
		expect(json.custom_id).toBe(BUG_MODAL_ID);
	});

	test('title is "Report a bug"', () => {
		const json = buildBugModal().toJSON();
		expect(json.title).toBe('Report a bug');
	});

	test('produces exactly 5 ActionRows (Discord hard limit)', () => {
		const json = buildBugModal().toJSON();
		expect(json.components).toHaveLength(5);
	});

	test('each ActionRow contains exactly 1 TextInput', () => {
		const json = buildBugModal().toJSON();
		for (const row of json.components) {
			expect(row.components).toHaveLength(1);
		}
	});

	test('custom_ids appear in documented order', () => {
		const ids = buildBugModal()
			.toJSON()
			.components.map((row) => row.components[0].custom_id);
		expect(ids).toEqual(['title', 'steps', 'expected', 'actual', 'version']);
	});

	test('title, steps, expected, actual are required; version is optional', () => {
		const rows = buildBugModal().toJSON().components;
		expect(rows[0].components[0].required).toBe(true);  // title
		expect(rows[1].components[0].required).toBe(true);  // steps
		expect(rows[2].components[0].required).toBe(true);  // expected
		expect(rows[3].components[0].required).toBe(true);  // actual
		expect(rows[4].components[0].required).toBe(false); // version
	});

	test('title has max_length 100 (D-11 short summary cap)', () => {
		const json = buildBugModal().toJSON();
		expect(json.components[0].components[0].max_length).toBe(100);
	});

	test('steps has max_length 2000 (paragraph)', () => {
		const json = buildBugModal().toJSON();
		expect(json.components[1].components[0].max_length).toBe(2000);
	});
});
