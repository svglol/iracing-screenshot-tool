import { describe, it, expect } from 'vitest';
import {
	resolveFilenameFormat,
	DEFAULT_FORMAT,
	FALLBACK_FORMAT,
} from './filenameFormat';

describe('resolveFilenameFormat', () => {
	describe('fallback (no session info)', () => {
		it('returns the fallback when sessionInfo is null', () => {
			expect(resolveFilenameFormat(DEFAULT_FORMAT, null, null)).toBe(
				FALLBACK_FORMAT
			);
		});

		it('returns the fallback when sessionInfo is undefined', () => {
			expect(
				resolveFilenameFormat(DEFAULT_FORMAT, undefined, undefined)
			).toBe(FALLBACK_FORMAT);
		});

		it('returns the fallback even with a custom format string', () => {
			expect(
				resolveFilenameFormat('{driver}-{track}-{lap}', null, null)
			).toBe(FALLBACK_FORMAT);
		});

		it('preserves the {counter} placeholder for Worker.vue to substitute', () => {
			expect(resolveFilenameFormat(DEFAULT_FORMAT, null, null)).toContain(
				'{counter}'
			);
		});
	});

	describe('normal resolution (session info present)', () => {
		const sessionInfo = {
			data: {
				WeekendInfo: {
					TrackDisplayShortName: 'Monza',
					TrackDisplayName: 'Autodromo Nazionale Monza',
					TeamRacing: 0,
				},
				DriverInfo: {
					DriverCarIdx: 0,
					Drivers: [
						{
							CarIdx: 0,
							UserName: 'Bob Smith',
							AbbrevName: 'Smith, B',
						},
					],
				},
			},
		};
		const telemetry = { values: { CamCarIdx: 0, Lap: 7 } };

		it('resolves the default format', () => {
			expect(
				resolveFilenameFormat(DEFAULT_FORMAT, sessionInfo, telemetry)
			).toBe('Monza-Bob Smith-{counter}');
		});

		it('resolves a custom format with multiple tokens', () => {
			expect(
				resolveFilenameFormat(
					'{trackFull}-{driverAbbrev}-{lap}-{counter}',
					sessionInfo,
					telemetry
				)
			).toBe('Autodromo Nazionale Monza-Smith, B-7-{counter}');
		});

		it('strips diacritics for filesystem safety', () => {
			const trackSession = {
				data: {
					WeekendInfo: { TrackDisplayShortName: 'Nürburgring' },
					DriverInfo: { DriverCarIdx: 0, Drivers: [] },
				},
			};
			expect(
				resolveFilenameFormat('{track}', trackSession, { values: {} })
			).toBe('Nurburgring');
		});

		it('replaces Windows-unsafe characters', () => {
			const colonSession = {
				data: {
					WeekendInfo: { TrackDisplayShortName: 'Track:1' },
					DriverInfo: { DriverCarIdx: 0, Drivers: [] },
				},
			};
			expect(
				resolveFilenameFormat('{track}', colonSession, { values: {} })
			).toBe('Track_1');
		});
	});
});
