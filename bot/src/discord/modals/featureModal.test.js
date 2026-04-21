'use strict';

// ---------------------------------------------------------------------------
// Tests for buildFeatureModal — 4 TextInput ActionRows.
// ---------------------------------------------------------------------------
// Features ask a slightly different set of questions than bugs (no
// steps-to-reproduce or expected-vs-actual). Tests pin custom IDs, required
// flags, and the fact that niceToHave is optional, so downstream intake
// handlers can rely on the field names.
// ---------------------------------------------------------------------------

import { buildFeatureModal, FEATURE_MODAL_ID } from './featureModal.js';

describe('FEATURE_MODAL_ID', () => {
	test('is a stable versioned constant', () => {
		expect(FEATURE_MODAL_ID).toBe('feature-modal-v1');
	});
});

describe('buildFeatureModal', () => {
	test('returns a ModalBuilder whose custom_id matches FEATURE_MODAL_ID', () => {
		const modal = buildFeatureModal();
		const json = modal.toJSON();
		expect(json.custom_id).toBe(FEATURE_MODAL_ID);
	});

	test('title is "Request a feature"', () => {
		const json = buildFeatureModal().toJSON();
		expect(json.title).toBe('Request a feature');
	});

	test('produces exactly 4 ActionRows', () => {
		const json = buildFeatureModal().toJSON();
		expect(json.components).toHaveLength(4);
	});

	test('each ActionRow contains exactly 1 TextInput', () => {
		const json = buildFeatureModal().toJSON();
		for (const row of json.components) {
			expect(row.components).toHaveLength(1);
		}
	});

	test('custom_ids appear in documented order', () => {
		const ids = buildFeatureModal()
			.toJSON()
			.components.map((row) => row.components[0].custom_id);
		expect(ids).toEqual(['title', 'useCase', 'why', 'niceToHave']);
	});

	test('title, useCase, why are required; niceToHave is optional', () => {
		const rows = buildFeatureModal().toJSON().components;
		expect(rows[0].components[0].required).toBe(true);  // title
		expect(rows[1].components[0].required).toBe(true);  // useCase
		expect(rows[2].components[0].required).toBe(true);  // why
		expect(rows[3].components[0].required).toBe(false); // niceToHave
	});

	test('title has max_length 100', () => {
		const json = buildFeatureModal().toJSON();
		expect(json.components[0].components[0].max_length).toBe(100);
	});
});
