'use strict';

const {
	sanitizeFilePart,
	buildTrackFilePart,
	buildScreenshotFileKey,
} = require('./screenshot-name');

// ---------------------------------------------------------------------------
// sanitizeFilePart
// ---------------------------------------------------------------------------
describe('sanitizeFilePart', () => {
	test('removes invalid filename characters', () => {
		expect(sanitizeFilePart('Spa: Francorchamps*', 'Track')).toBe(
			'Spa_Francorchamps'
		);
	});

	test('collapses " - " into a single hyphen', () => {
		expect(
			sanitizeFilePart('Okayama International Circuit - Short', 'Track')
		).toBe('Okayama_International_Circuit-Short');
	});

	test('returns fallback for empty string', () => {
		expect(sanitizeFilePart('', 'Track')).toBe('Track');
	});

	test('returns fallback for null', () => {
		expect(sanitizeFilePart(null, 'Fallback')).toBe('Fallback');
	});

	test('returns fallback for undefined', () => {
		expect(sanitizeFilePart(undefined, 'Fallback')).toBe('Fallback');
	});

	test('returns empty string when fallback is empty and input is empty', () => {
		expect(sanitizeFilePart('', '')).toBe('');
	});

	test('defaults fallback to empty string', () => {
		expect(sanitizeFilePart('')).toBe('');
	});

	test('replaces spaces with underscores', () => {
		expect(sanitizeFilePart('Daytona International Speedway')).toBe(
			'Daytona_International_Speedway'
		);
	});

	test('collapses multiple spaces into single underscore', () => {
		expect(sanitizeFilePart('Too  Many   Spaces')).toBe('Too_Many_Spaces');
	});

	test('trims leading and trailing whitespace', () => {
		expect(sanitizeFilePart('  Monza  ')).toBe('Monza');
	});

	test('removes control characters', () => {
		expect(sanitizeFilePart('Track\x00Name\x1F')).toBe('TrackName');
	});

	test('removes all reserved Windows filename characters', () => {
		expect(sanitizeFilePart('<>:"/\\|?*')).toBe('');
	});

	test('handles strings that are only invalid characters', () => {
		expect(sanitizeFilePart('***', 'Default')).toBe('Default');
	});

	test('preserves hyphens that are part of the name', () => {
		expect(sanitizeFilePart('Spa-Francorchamps')).toBe('Spa-Francorchamps');
	});

	test('handles numbers in track names', () => {
		expect(sanitizeFilePart('Circuit of the Americas T15')).toBe(
			'Circuit_of_the_Americas_T15'
		);
	});

	test('handles parentheses (not in the forbidden list)', () => {
		expect(sanitizeFilePart('Track (Layout A)')).toBe('Track_(Layout_A)');
	});

	test('converts non-string inputs to string', () => {
		expect(sanitizeFilePart(12345)).toBe('12345');
		expect(sanitizeFilePart(true)).toBe('true');
	});

	test('handles string with only spaces', () => {
		expect(sanitizeFilePart('   ', 'Default')).toBe('Default');
	});

	test('multiple hyphens with spaces are collapsed correctly', () => {
		expect(sanitizeFilePart('A - B - C')).toBe('A-B-C');
	});

	test('hyphen at start or end after trimming', () => {
		// " - " collapses to "-", so "- Track -" becomes "-Track-"
		expect(sanitizeFilePart('- Track -')).toBe('-Track-');
	});
});

// ---------------------------------------------------------------------------
// buildTrackFilePart
// ---------------------------------------------------------------------------
describe('buildTrackFilePart', () => {
	test('prefers TrackDisplayName plus layout', () => {
		expect(
			buildTrackFilePart({
				TrackDisplayName: 'Virginia International Raceway',
				TrackConfigName: 'Full Course',
				TrackDisplayShortName: 'VIR Full',
			})
		).toBe('Virginia_International_Raceway-Full_Course');
	});

	test('avoids repeating layout already in display name', () => {
		expect(
			buildTrackFilePart({
				TrackDisplayName: 'Okayama International Circuit - Short',
				TrackConfigName: 'Short',
				TrackDisplayShortName: 'Okayama Short',
			})
		).toBe('Okayama_International_Circuit-Short');
	});

	test('falls back to TrackName when TrackDisplayName is missing', () => {
		expect(
			buildTrackFilePart({
				TrackName: 'Circuit de Spa-Francorchamps',
				TrackConfigName: 'Grand Prix',
			})
		).toBe('Circuit_de_Spa-Francorchamps-Grand_Prix');
	});

	test('falls back to TrackDisplayShortName when both others missing', () => {
		expect(
			buildTrackFilePart({
				TrackDisplayShortName: 'Monza Road',
			})
		).toBe('Monza_Road');
	});

	test('returns "Track" for empty weekendInfo', () => {
		expect(buildTrackFilePart({})).toBe('Track');
	});

	test('returns "Track" for no arguments', () => {
		expect(buildTrackFilePart()).toBe('Track');
	});

	test('handles all empty strings', () => {
		expect(
			buildTrackFilePart({
				TrackDisplayName: '',
				TrackName: '',
				TrackDisplayShortName: '',
				TrackConfigName: '',
			})
		).toBe('Track');
	});

	test('handles null values in fields', () => {
		expect(
			buildTrackFilePart({
				TrackDisplayName: null,
				TrackName: null,
				TrackConfigName: null,
			})
		).toBe('Track');
	});

	test('does not duplicate when config name is substring of display name', () => {
		expect(
			buildTrackFilePart({
				TrackDisplayName: 'Daytona Road Course',
				TrackConfigName: 'Road Course',
			})
		).toBe('Daytona_Road_Course');
	});

	test('does not duplicate when display name is substring of config name', () => {
		expect(
			buildTrackFilePart({
				TrackDisplayName: 'Oval',
				TrackConfigName: 'Daytona Oval',
			})
		).toBe('Oval');
	});

	test('appends config name that is genuinely different', () => {
		expect(
			buildTrackFilePart({
				TrackDisplayName: 'Suzuka',
				TrackConfigName: 'West Course',
			})
		).toBe('Suzuka-West_Course');
	});

	test('handles track name with special characters', () => {
		expect(
			buildTrackFilePart({
				TrackDisplayName: 'Nürburgring: GP',
			})
		).toBe('Nurburgring_GP');
	});

	test('handles config name with special characters', () => {
		expect(
			buildTrackFilePart({
				TrackDisplayName: 'Spa',
				TrackConfigName: 'Grand Prix <2024>',
			})
		).toBe('Spa-Grand_Prix_2024');
	});

	test('only primary track name (no config) uses just the name', () => {
		expect(
			buildTrackFilePart({
				TrackDisplayName: 'Indianapolis Motor Speedway',
			})
		).toBe('Indianapolis_Motor_Speedway');
	});

	test('config name only (no display/track names)', () => {
		expect(
			buildTrackFilePart({
				TrackConfigName: 'Oval',
			})
		).toBe('Oval');
	});
});

// ---------------------------------------------------------------------------
// buildScreenshotFileKey
// ---------------------------------------------------------------------------
describe('buildScreenshotFileKey', () => {
	test('builds the full key with all parts', () => {
		expect(
			buildScreenshotFileKey({
				weekendInfo: {
					TrackDisplayName: 'Circuit de Spa-Francorchamps',
					TrackConfigName: 'Grand Prix',
				},
				driverName: 'Max Verstappen',
				count: 2,
			})
		).toBe('Circuit_de_Spa-Francorchamps-Grand_Prix-Max_Verstappen-2');
	});

	test('uses defaults when no arguments provided', () => {
		expect(buildScreenshotFileKey()).toBe('Track-Driver-0');
	});

	test('uses defaults for empty object', () => {
		expect(buildScreenshotFileKey({})).toBe('Track-Driver-0');
	});

	test('sanitizes driver name', () => {
		expect(
			buildScreenshotFileKey({
				driverName: 'Driver: <Special>',
				count: 1,
			})
		).toBe('Track-Driver_Special-1');
	});

	test('uses "Driver" fallback for empty driver name', () => {
		expect(
			buildScreenshotFileKey({
				driverName: '',
				count: 5,
			})
		).toBe('Track-Driver-5');
	});

	test('uses "Driver" fallback for null driver name', () => {
		expect(
			buildScreenshotFileKey({
				driverName: null,
				count: 0,
			})
		).toBe('Track-Driver-0');
	});

	test('handles count of 0', () => {
		expect(
			buildScreenshotFileKey({
				weekendInfo: { TrackDisplayName: 'Monza' },
				driverName: 'Test',
				count: 0,
			})
		).toBe('Monza-Test-0');
	});

	test('handles large count values', () => {
		expect(
			buildScreenshotFileKey({
				weekendInfo: { TrackDisplayName: 'Monza' },
				driverName: 'Test',
				count: 99999,
			})
		).toBe('Monza-Test-99999');
	});

	test('handles driver name with spaces', () => {
		expect(
			buildScreenshotFileKey({
				weekendInfo: { TrackDisplayName: 'Spa' },
				driverName: 'Lewis Hamilton',
				count: 1,
			})
		).toBe('Spa-Lewis_Hamilton-1');
	});

	test('handles driver name with hyphens', () => {
		expect(
			buildScreenshotFileKey({
				weekendInfo: { TrackDisplayName: 'Spa' },
				driverName: 'Jean-Pierre Jabouille',
				count: 1,
			})
		).toBe('Spa-Jean-Pierre_Jabouille-1');
	});

	test('complete integration test with complex data', () => {
		expect(
			buildScreenshotFileKey({
				weekendInfo: {
					TrackDisplayName: 'Circuit of the Americas',
					TrackConfigName: 'Grand Prix',
					TrackName: 'cota_gp',
					TrackDisplayShortName: 'COTA GP',
				},
				driverName: 'Kimi Räikkönen',
				count: 42,
			})
		).toBe('Circuit_of_the_Americas-Grand_Prix-Kimi_Raikkonen-42');
	});
});
