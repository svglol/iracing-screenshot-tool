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

	describe('hardening (cq-utilities#1/#2/#3)', () => {
		const trackSession = (name: string) => ({
			data: {
				WeekendInfo: { TrackDisplayShortName: name },
				DriverInfo: { DriverCarIdx: 0, Drivers: [] },
			},
		});

		it('strips ASCII control chars / NUL / tab / newline', () => {
			expect(
				resolveFilenameFormat('{track}', trackSession('M\x00o\x1Fn\tz\na'), {
					values: {},
				})
			).toBe('Monza');
		});

		it('prefixes Windows reserved device names', () => {
			expect(
				resolveFilenameFormat('{track}', trackSession('CON'), { values: {} })
			).toBe('_CON');
			expect(
				resolveFilenameFormat('{track}', trackSession('NUL'), { values: {} })
			).toBe('_NUL');
		});

		it('leaves reserved-name lookalikes alone (CONWAY, CON-{counter})', () => {
			expect(
				resolveFilenameFormat('{track}', trackSession('CONWAY'), {
					values: {},
				})
			).toBe('CONWAY');
			expect(
				resolveFilenameFormat('{track}-{counter}', trackSession('CON'), {
					values: {},
				})
			).toBe('CON-{counter}');
		});

		it('falls back when a counterless format resolves empty', () => {
			// {driver} with no drivers → '' → no alnum, no counter → FALLBACK_FORMAT.
			expect(
				resolveFilenameFormat('{driver}', trackSession('Monza'), {
					values: {},
				})
			).toBe(FALLBACK_FORMAT);
		});

		it('preserves an explicit bare {counter} format (no fallback)', () => {
			expect(
				resolveFilenameFormat('{counter}', trackSession('Monza'), {
					values: {},
				})
			).toBe('{counter}');
		});

		it('preserves a non-Latin (CJK) name instead of falling back', () => {
			const cjk = {
				data: {
					WeekendInfo: {},
					DriverInfo: {
						DriverCarIdx: 0,
						Drivers: [{ CarIdx: 0, UserName: '鈴鹿太郎' }],
					},
				},
			};
			expect(
				resolveFilenameFormat('{driver}', cjk, { values: { CamCarIdx: 0 } })
			).toBe('鈴鹿太郎');
		});
	});
});
