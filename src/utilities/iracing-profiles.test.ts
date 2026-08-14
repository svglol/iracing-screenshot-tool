import {
	parseIni,
	canonicaliseIni,
	hashIni,
	countIniDifferences,
	validateRendererIni,
	checkProfileName,
	findDuplicateProfile,
	profileFileName,
	profileNameFromFile,
	resolveActiveProfile,
	MAX_PROFILE_NAME_LENGTH,
} from './iracing-profiles';

// A minimal but structurally faithful renderer ini: the section names iRacing
// really writes, the column-padded inline comments, and CRLF endings.
const VALID_INI = [
	'[AutoCfg]',
	'AutoCfgCompleted=1                      \t; 0=need to run 3D autocfg at startup',
	'',
	'[Graphics Options]',
	'SSAO=1                                  \t; 0=off, 1=on',
	'ShaderQuality=3                         \t; 0=low, 3=max',
	'',
	'[Display]',
	'fullScreenWidth=2560                    \t; full screen width',
	'fullScreenHeight=1440                   \t; full screen height',
	'',
	'[MonitorSetup]',
	'NumMonitors=1                           \t; 1 or 3',
	'',
	'[Debug]',
	'Renderer=?                              \t; Driver DLL',
	'Vendor=?                                \t; Driver Vendor',
	'',
].join('\r\n');

describe('parseIni', () => {
	test('parses every section into key/value maps', () => {
		const parsed = parseIni(VALID_INI);
		expect(Object.keys(parsed).sort()).toEqual([
			'AutoCfg',
			'Debug',
			'Display',
			'Graphics Options',
			'MonitorSetup',
		]);
		expect(parsed['Display'].fullScreenWidth).toBe('2560');
	});

	test('strips the inline comment trailer iRacing pads every line with', () => {
		expect(parseIni(VALID_INI)['Graphics Options'].SSAO).toBe('1');
	});

	test('keeps section names containing spaces intact', () => {
		expect(parseIni(VALID_INI)['Graphics Options']).toBeDefined();
	});

	test('ignores whole-line comments, even ones containing an equals sign', () => {
		const parsed = parseIni('[A]\n; note: x=y\nReal=1\n');
		expect(parsed.A).toEqual({ Real: '1' });
	});

	test('drops keys appearing before any section header', () => {
		expect(parseIni('Stray=1\n[A]\nB=2\n')).toEqual({ A: { B: '2' } });
	});

	test('handles empty content', () => {
		expect(parseIni('')).toEqual({});
	});

	test('merges a repeated section header', () => {
		expect(parseIni('[A]\nX=1\n[B]\nY=2\n[A]\nZ=3\n')).toEqual({
			A: { X: '1', Z: '3' },
			B: { Y: '2' },
		});
	});
});

describe('canonicaliseIni', () => {
	test('is insensitive to line endings', () => {
		const lf = VALID_INI.replace(/\r\n/g, '\n');
		expect(canonicaliseIni(lf)).toBe(canonicaliseIni(VALID_INI));
	});

	test('is insensitive to comment text', () => {
		// A game update rewording a comment must not read as an edited profile.
		const reworded = VALID_INI.replace(
			'; 0=off, 1=on',
			'; disabled/enabled (new wording)'
		);
		expect(canonicaliseIni(reworded)).toBe(canonicaliseIni(VALID_INI));
	});

	test('is insensitive to key and section order', () => {
		const reordered = [
			'[Display]',
			'fullScreenHeight=1440',
			'fullScreenWidth=2560',
			'[Graphics Options]',
			'ShaderQuality=3',
			'SSAO=1',
			'[AutoCfg]',
			'AutoCfgCompleted=1',
			'[MonitorSetup]',
			'NumMonitors=1',
			'[Debug]',
			'Renderer=?',
			'Vendor=?',
		].join('\n');
		expect(canonicaliseIni(reordered)).toBe(canonicaliseIni(VALID_INI));
	});

	test('excludes [Debug] entirely', () => {
		// Driver identity is machine state; a driver update must not look like an
		// edited profile.
		const otherDriver = VALID_INI.replace(
			'Renderer=?',
			'Renderer=nvwgf2umx.dll'
		).replace('Vendor=?', 'Vendor=NVIDIA');
		expect(canonicaliseIni(otherDriver)).toBe(canonicaliseIni(VALID_INI));
		expect(canonicaliseIni(VALID_INI)).not.toContain('Debug');
	});

	test('does reflect a real settings change', () => {
		const changed = VALID_INI.replace('SSAO=1', 'SSAO=0');
		expect(canonicaliseIni(changed)).not.toBe(canonicaliseIni(VALID_INI));
	});
});

describe('hashIni', () => {
	test('equal settings produce an equal hash', () => {
		expect(hashIni(VALID_INI.replace(/\r\n/g, '\n'))).toBe(
			hashIni(VALID_INI)
		);
	});

	test('a changed setting produces a different hash', () => {
		expect(
			hashIni(VALID_INI.replace('NumMonitors=1', 'NumMonitors=3'))
		).not.toBe(hashIni(VALID_INI));
	});
});

describe('countIniDifferences', () => {
	test('counts nothing for identical configs', () => {
		expect(countIniDifferences(VALID_INI, VALID_INI)).toBe(0);
	});

	test('counts each differing setting once', () => {
		const changed = VALID_INI.replace('SSAO=1', 'SSAO=0').replace(
			'NumMonitors=1',
			'NumMonitors=3'
		);
		expect(countIniDifferences(VALID_INI, changed)).toBe(2);
	});

	test('counts a key present on only one side', () => {
		expect(
			countIniDifferences('[Display]\nA=1\n', '[Display]\nA=1\nB=2\n')
		).toBe(1);
	});

	test('ignores [Debug] drift', () => {
		const otherDriver = VALID_INI.replace('Renderer=?', 'Renderer=nv.dll');
		expect(countIniDifferences(VALID_INI, otherDriver)).toBe(0);
	});
});

describe('validateRendererIni', () => {
	test('accepts a real renderer ini', () => {
		expect(validateRendererIni(VALID_INI)).toEqual({
			valid: true,
			error: null,
			warnings: [],
		});
	});

	test('rejects empty content', () => {
		expect(validateRendererIni('   ').error).toBe('empty');
	});

	test('rejects a file missing the required sections', () => {
		// The guard that stops app.ini being imported and applied over the
		// graphics config.
		const appIni = '[Replay]\nlastReplay=1\n[Misc]\nfoo=bar\n';
		expect(validateRendererIni(appIni)).toMatchObject({
			valid: false,
			error: 'missingSections',
		});
	});

	test('rejects a file with only one of the two required sections', () => {
		expect(validateRendererIni('[Display]\nfullScreen=0\n').error).toBe(
			'missingSections'
		);
	});

	test('warns — but still accepts — when autocfg is incomplete', () => {
		// iRacing would re-run auto-configuration and overwrite the whole file,
		// so the profile would appear not to stick.
		const result = validateRendererIni(
			VALID_INI.replace('AutoCfgCompleted=1', 'AutoCfgCompleted=0')
		);
		expect(result.valid).toBe(true);
		expect(result.warnings).toEqual(['autoCfgIncomplete']);
	});
});

describe('checkProfileName', () => {
	test('accepts ordinary names', () => {
		expect(checkProfileName('Screenshots')).toEqual({
			ok: true,
			name: 'Screenshots',
		});
	});

	test('accepts spaces and hyphens', () => {
		expect(checkProfileName('Triple Screen')).toMatchObject({ ok: true });
		expect(checkProfileName('Long-Exposure')).toMatchObject({ ok: true });
	});

	test('trims surrounding whitespace', () => {
		expect(checkProfileName('  Racing  ')).toEqual({
			ok: true,
			name: 'Racing',
		});
	});

	test('rejects an empty or whitespace-only name', () => {
		expect(checkProfileName('')).toEqual({ ok: false, error: 'empty' });
		expect(checkProfileName('   ')).toEqual({ ok: false, error: 'empty' });
	});

	test.each(['a<b', 'a>b', 'a:b', 'a"b', 'a/b', 'a\\b', 'a|b', 'a?b', 'a*b'])(
		'rejects the illegal filename character in %s',
		(name) => {
			expect(checkProfileName(name)).toEqual({
				ok: false,
				error: 'illegalCharacters',
			});
		}
	);

	test('rejects control characters', () => {
		// Built with fromCharCode so the control byte never lands in this source file.
		const withControl = 'a' + String.fromCharCode(1) + 'b';
		expect(checkProfileName(withControl)).toEqual({
			ok: false,
			error: 'illegalCharacters',
		});
	});

	test('rejects reserved DOS device names regardless of case', () => {
		expect(checkProfileName('CON')).toEqual({
			ok: false,
			error: 'reservedName',
		});
		expect(checkProfileName('com1')).toEqual({
			ok: false,
			error: 'reservedName',
		});
	});

	test('rejects a trailing dot or space, which Windows silently strips', () => {
		expect(checkProfileName('Racing.')).toEqual({
			ok: false,
			error: 'trailingDotOrSpace',
		});
	});

	test('rejects an over-long name', () => {
		expect(checkProfileName('x'.repeat(MAX_PROFILE_NAME_LENGTH + 1))).toEqual(
			{
				ok: false,
				error: 'tooLong',
			}
		);
		expect(
			checkProfileName('x'.repeat(MAX_PROFILE_NAME_LENGTH))
		).toMatchObject({ ok: true });
	});

	test('rejects a duplicate name case-insensitively', () => {
		// Windows filesystems are case-insensitive, so "racing" WOULD overwrite
		// "Racing". Silently destroying a stored profile is the one outcome this
		// feature must never produce.
		expect(checkProfileName('racing', ['Racing'])).toEqual({
			ok: false,
			error: 'duplicate',
		});
	});

	test('allows a name that is not among the existing ones', () => {
		expect(
			checkProfileName('Video', ['Racing', 'Screenshots'])
		).toMatchObject({
			ok: true,
		});
	});
});

describe('profileFileName / profileNameFromFile', () => {
	test('round-trips a name through its filename', () => {
		expect(profileNameFromFile(profileFileName('Triple Screen'))).toBe(
			'Triple Screen'
		);
	});

	test('recognises an uppercase extension', () => {
		expect(profileNameFromFile('Racing.INI')).toBe('Racing');
	});

	test('ignores non-ini files', () => {
		expect(profileNameFromFile('notes.txt')).toBeNull();
		expect(profileNameFromFile('.ini')).toBeNull();
	});
});

describe('findDuplicateProfile', () => {
	const profiles = [
		{ name: 'Racing', hash: 'hash-racing' },
		{ name: 'Screenshots', hash: 'hash-screenshots' },
	];

	test('names the profile already holding the hash', () => {
		expect(findDuplicateProfile('hash-screenshots', profiles)).toBe(
			'Screenshots'
		);
	});

	test('returns null for settings no profile holds', () => {
		expect(findDuplicateProfile('hash-new', profiles)).toBeNull();
	});

	// Overwriting a profile with the content it already has is a no-op, not a
	// duplicate — and profile names are Windows filenames, so the exemption has
	// to be case-insensitive like every other name comparison.
	test('exempts the profile being overwritten, case-insensitively', () => {
		expect(
			findDuplicateProfile('hash-racing', profiles, 'racing')
		).toBeNull();
	});

	test('still reports a duplicate that is not the exempted profile', () => {
		const duplicates = [
			{ name: 'A', hash: 'same' },
			{ name: 'B', hash: 'same' },
		];
		expect(findDuplicateProfile('same', duplicates, 'A')).toBe('B');
	});

	test('never matches on an absent hash', () => {
		expect(findDuplicateProfile('', profiles)).toBeNull();
	});
});

describe('resolveActiveProfile', () => {
	const profiles = [
		{ name: 'Racing', hash: 'hash-racing' },
		{ name: 'Screenshots', hash: 'hash-screenshots' },
	];

	test('reports a clean match by hash', () => {
		expect(resolveActiveProfile('hash-screenshots', profiles)).toEqual({
			name: 'Screenshots',
			state: 'clean',
		});
	});

	test('a hash match wins over the last-applied record', () => {
		expect(
			resolveActiveProfile('hash-racing', profiles, 'Screenshots')
		).toEqual({ name: 'Racing', state: 'clean' });
	});

	test('reports the last-applied profile as modified when nothing matches', () => {
		// The real-world case: applied Screenshots, then nudged a slider in-sim.
		// "no profile active" would be a useless answer here.
		expect(
			resolveActiveProfile('hash-drifted', profiles, 'Screenshots')
		).toEqual({ name: 'Screenshots', state: 'modified' });
	});

	test('reports unknown when nothing matches and nothing was applied', () => {
		expect(resolveActiveProfile('hash-drifted', profiles, '')).toEqual({
			name: null,
			state: 'unknown',
		});
	});

	test('reports unknown when the last-applied profile has been deleted', () => {
		expect(resolveActiveProfile('hash-drifted', profiles, 'Deleted')).toEqual(
			{
				name: null,
				state: 'unknown',
			}
		);
	});

	test('reports unknown when there is no active config at all', () => {
		expect(resolveActiveProfile(null, profiles, 'Screenshots')).toEqual({
			name: null,
			state: 'unknown',
		});
	});

	test('breaks a tie between identical profiles using the last-applied name', () => {
		const duplicates = [
			{ name: 'A', hash: 'same' },
			{ name: 'B', hash: 'same' },
		];
		expect(resolveActiveProfile('same', duplicates, 'B')).toEqual({
			name: 'B',
			state: 'clean',
		});
	});

	test('resolves deterministically with no last-applied hint', () => {
		const duplicates = [
			{ name: 'A', hash: 'same' },
			{ name: 'B', hash: 'same' },
		];
		expect(resolveActiveProfile('same', duplicates)).toEqual({
			name: 'A',
			state: 'clean',
		});
	});

	test('handles an empty profile list', () => {
		expect(resolveActiveProfile('anything', [], 'Racing')).toEqual({
			name: null,
			state: 'unknown',
		});
	});
});
