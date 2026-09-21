import {
	checkReshadeConfig,
	classifyReshadeIniError,
	describeReshadeIniProblem,
	discoverReshadeIni,
	inspectReshadeIni,
	probeReshadeIni,
	readReshadeSavePath,
	reshadeIniCandidates,
	RESHADE_INI_FILENAMES,
} from './reshade-config';
import { FALLBACK_LOCALE, setLocale, t } from './i18n';

// CJS require for fs: ESM namespace imports are sealed and `vi.spyOn` needs a
// mutable target. Same idiom, same reason, as iracing-config-checks.test.ts.
// read-ini-file reads through this same fs singleton, so spying on readFileSync
// is how these tests feed content to the probe — the REAL parser then runs on it,
// which is the point: the detection rule depends on how that parser reshapes an
// ini, and a hand-built object fixture would not prove anything about it.
const fs = require('fs');

// The path the 2026-08-21 reports carried — our shipped default, on a machine
// that had no ReShade at that path.
const DEFAULT_INI = 'C:\\Program Files (x86)\\iRacing\\ReShade.ini';

// The path the 2026-08-28 reports settled on, after the reporter swapped one
// preset for another.
const REPORTED_PRESET =
	'C:\\Program Files (x86)\\iRacing\\ReShadePreset normal.ini';

// Trimmed from the real files in a working ReShade 5.x install, so these are the
// shapes the parser actually meets rather than invented ones.
const REAL_CONFIG_INI = [
	'[GENERAL]',
	'EffectSearchPaths=.\\reshade-shaders\\Shaders',
	'PresetPath=.\\ReShadePreset.ini',
	'',
	'[SCREENSHOT]',
	'FileFormat=1',
	'SavePath=C:\\Users\\test\\Pictures\\Screenshots\\',
].join('\n');

// The right file, but with no screenshot path set in it.
const CONFIG_WITHOUT_SAVEPATH = [
	'[GENERAL]',
	'EffectSearchPaths=.\\reshade-shaders\\Shaders',
	'',
	'[SCREENSHOT]',
	'FileFormat=1',
].join('\n');

// The 2026-08-28 case. Note the root-level Techniques key and the DOTTED section
// names: the parser turns [LumaSharpen.fx] into { LumaSharpen: { fx: {...} } },
// which is exactly why the preset test cannot look for an '.fx' section and has
// to look at Techniques instead.
const PRESET_INI = [
	'Techniques=LumaSharpen@LumaSharpen.fx,Vignette@Vignette.fx',
	'TechniqueSorting=LumaSharpen@LumaSharpen.fx,Vignette@Vignette.fx',
	'',
	'[LumaSharpen.fx]',
	'sharp_strength=0.650000',
	'',
	'[Vignette.fx]',
	'Ratio=1.000000',
].join('\n');

function errno(code: string): NodeJS.ErrnoException {
	const error = new Error(`${code}: simulated`) as NodeJS.ErrnoException;
	error.code = code;
	return error;
}

function givenIniContent(content: string) {
	vi.spyOn(fs, 'readFileSync').mockReturnValue(content);
}

function givenIniError(code: string) {
	vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
		throw errno(code);
	});
}

afterEach(() => {
	vi.restoreAllMocks();
	setLocale(FALLBACK_LOCALE);
});

describe('classifyReshadeIniError', () => {
	test('reads ENOENT as a missing file', () => {
		expect(classifyReshadeIniError(errno('ENOENT'))).toBe('missing');
	});

	// A path component that is a file where a folder was expected leaves the user
	// in the same place as ENOENT: nothing is there to open.
	test('reads ENOTDIR as a missing file', () => {
		expect(classifyReshadeIniError(errno('ENOTDIR'))).toBe('missing');
	});

	test('reads the permission errors as unreadable', () => {
		expect(classifyReshadeIniError(errno('EACCES'))).toBe('unreadable');
		expect(classifyReshadeIniError(errno('EPERM'))).toBe('unreadable');
	});

	// Something IS at that path, so "not found" would be a lie the user could
	// waste real time on.
	test('reads EISDIR as unreadable rather than missing', () => {
		expect(classifyReshadeIniError(errno('EISDIR'))).toBe('unreadable');
	});

	// The whole point of the null: an errno we have never seen must not be
	// dressed up as a confident diagnosis, because the caller uses null to mean
	// "keep the original error".
	test('refuses to name an errno it does not recognise', () => {
		expect(classifyReshadeIniError(errno('EBUSY'))).toBeNull();
		expect(classifyReshadeIniError(errno('EIO'))).toBeNull();
	});

	test('survives non-errors', () => {
		expect(classifyReshadeIniError(null)).toBeNull();
		expect(classifyReshadeIniError(undefined)).toBeNull();
		expect(classifyReshadeIniError('ENOENT')).toBeNull();
		expect(classifyReshadeIniError(new Error('no code'))).toBeNull();
	});
});

describe('readReshadeSavePath', () => {
	test('prefers SCREENSHOT.SavePath', () => {
		expect(
			readReshadeSavePath({
				SCREENSHOT: { SavePath: 'D:\\Primary' },
				GENERAL: { ScreenshotPath: 'E:\\Fallback' },
			})
		).toBe('D:\\Primary');
	});

	test('falls back to GENERAL.ScreenshotPath', () => {
		expect(
			readReshadeSavePath({ GENERAL: { ScreenshotPath: 'E:\\Shots' } })
		).toBe('E:\\Shots');
	});

	test('returns empty string when neither is present', () => {
		expect(readReshadeSavePath({})).toBe('');
		expect(readReshadeSavePath({ SCREENSHOT: {} })).toBe('');
	});

	test('survives junk', () => {
		expect(readReshadeSavePath(null)).toBe('');
		expect(readReshadeSavePath(undefined)).toBe('');
		expect(readReshadeSavePath('a string')).toBe('');
		expect(readReshadeSavePath([1, 2])).toBe('');
		// A section that parsed to a string rather than an object.
		expect(readReshadeSavePath({ SCREENSHOT: 'not-an-object' })).toBe('');
	});
});

describe('inspectReshadeIni', () => {
	test('a config with a save path is usable', () => {
		expect(
			inspectReshadeIni({ SCREENSHOT: { SavePath: 'D:\\Shots' } })
		).toBeNull();
	});

	test('Techniques marks a preset', () => {
		expect(inspectReshadeIni({ Techniques: 'A@A.fx' })).toBe('preset');
	});

	// ReShade writes both keys, but a hand-edited preset may carry only the one.
	test('TechniqueSorting alone still marks a preset', () => {
		expect(inspectReshadeIni({ TechniqueSorting: 'A@A.fx' })).toBe('preset');
	});

	// The distinction that decides which remedy the user is told to apply.
	test('a ReShade config without a save path is not called a preset', () => {
		expect(inspectReshadeIni({ GENERAL: {}, SCREENSHOT: {} })).toBe(
			'noSavePath'
		);
		expect(inspectReshadeIni({ GENERAL: { PresetPath: 'x' } })).toBe(
			'noSavePath'
		);
	});

	test('anything else is notConfig', () => {
		expect(inspectReshadeIni({})).toBe('notConfig');
		expect(inspectReshadeIni(null)).toBe('notConfig');
		expect(inspectReshadeIni('a string')).toBe('notConfig');
		expect(inspectReshadeIni({ Unrelated: { key: 'value' } })).toBe(
			'notConfig'
		);
	});

	// Order guard: a save path wins outright, so a file that somehow carried both
	// is treated as the working config it is rather than refused as a preset.
	test('a save path outranks a preset marker', () => {
		expect(
			inspectReshadeIni({
				Techniques: 'A@A.fx',
				SCREENSHOT: { SavePath: 'D:\\Shots' },
			})
		).toBeNull();
	});
});

describe('describeReshadeIniProblem', () => {
	const ALL_PROBLEMS = [
		'missing',
		'unreadable',
		'preset',
		'noSavePath',
		'notConfig',
	] as const;

	test('names the path so the user can see what we tried', () => {
		for (const problem of ALL_PROBLEMS) {
			expect(describeReshadeIniProblem(problem, DEFAULT_INI)).toContain(
				DEFAULT_INI
			);
		}
	});

	// The two ways out. This is the sentence that replaced a raw
	// "ENOENT: no such file or directory", which named neither.
	test('offers both remedies for a missing ini', () => {
		const message = describeReshadeIniProblem('missing', DEFAULT_INI);
		expect(message).toContain('Settings');
		expect(message).toContain('Reshade Compatibility Mode');
	});

	// The 2026-08-28 message. It has to name the mistake, not the symptom: the
	// old wording ("Unable to determine the ReShade screenshot folder") sent the
	// reporter looking for a folder setting that was never the problem.
	test('the preset message names the mistake and the fix', () => {
		const message = describeReshadeIniProblem('preset', REPORTED_PRESET);
		expect(message).toContain('preset');
		expect(message).toContain('ReShade.ini');
		expect(message).not.toContain('Unable to determine');
	});

	// Different mistake, different fix — this one is not solved in our settings
	// at all, so it must not tell the user to go pick another file.
	test('the no-save-path message sends the user to ReShade, not to our picker', () => {
		const message = describeReshadeIniProblem('noSavePath', DEFAULT_INI);
		expect(message).toContain('ReShade');
		expect(message).not.toContain('Reshade Compatibility Mode');
	});

	test('every problem gets its own sentence', () => {
		const messages = ALL_PROBLEMS.map((problem) =>
			describeReshadeIniProblem(problem, DEFAULT_INI)
		);
		expect(new Set(messages).size).toBe(ALL_PROBLEMS.length);
	});

	// Phrased through the shared core rather than from a literal, so it CAN be
	// translated — the 2026-08-21 reporter's machine was Italian and read a raw
	// English errno. Asserted as "resolves the catalogue key under the ambient
	// locale", not as "differs from English": these strings ship English-only in
	// every catalogue until the translation pass, so a cross-language difference
	// is not observable yet and a test asserting one would fail today and pass
	// for the wrong reason later.
	test('resolves through the catalogue under the ambient locale', () => {
		setLocale('it');
		expect(describeReshadeIniProblem('missing', DEFAULT_INI)).toBe(
			t('capture.reshadeIniMissing', { path: DEFAULT_INI })
		);
		expect(describeReshadeIniProblem('preset', DEFAULT_INI)).toBe(
			t('capture.reshadeIniPreset', { path: DEFAULT_INI })
		);
	});

	// If a key were missing, `t` would hand back the key path itself and the user
	// would read "capture.reshadeIniPreset" in a toast.
	test('interpolates rather than echoing the key', () => {
		for (const problem of ALL_PROBLEMS) {
			const message = describeReshadeIniProblem(problem, DEFAULT_INI);
			expect(message).not.toContain('capture.reshadeIni');
			expect(message).not.toContain('{path}');
		}
	});
});

describe('probeReshadeIni', () => {
	test('returns null for a real ReShade config with a save path', () => {
		givenIniContent(REAL_CONFIG_INI);
		expect(probeReshadeIni(DEFAULT_INI)).toBeNull();
	});

	// The 2026-08-28 case end to end: this file opens perfectly. A probe that
	// stopped at "can I read it" called it healthy and stayed silent through all
	// twelve attempts.
	test('calls a preset a preset, however cleanly it reads', () => {
		givenIniContent(PRESET_INI);
		expect(probeReshadeIni(REPORTED_PRESET)).toBe('preset');
	});

	test('separates a config with no save path from a wrong-kind file', () => {
		givenIniContent(CONFIG_WITHOUT_SAVEPATH);
		expect(probeReshadeIni(DEFAULT_INI)).toBe('noSavePath');
	});

	// A freshly created ReShadePreset.ini really is empty, and parses to {}.
	test('calls an empty file notConfig', () => {
		givenIniContent('');
		expect(probeReshadeIni(DEFAULT_INI)).toBe('notConfig');
	});

	// The ini parser is lenient and returns junk rather than throwing, so the
	// CONTENT rule — not an exception — is what has to reject this.
	test('calls unrelated text notConfig rather than throwing', () => {
		givenIniContent('this is not an ini file at all\njust prose');
		expect(probeReshadeIni(DEFAULT_INI)).toBe('notConfig');
	});

	test('classifies whatever the filesystem threw', () => {
		givenIniError('ENOENT');
		expect(probeReshadeIni(DEFAULT_INI)).toBe('missing');
	});

	test('an unrecognised errno is not dressed up as missing', () => {
		givenIniError('EBUSY');
		expect(probeReshadeIni(DEFAULT_INI)).toBeNull();
	});

	// Never chosen is the same story as not there, and there is no path to read.
	test('calls an empty setting missing without touching the disk', () => {
		const readFileSync = vi.spyOn(fs, 'readFileSync');
		expect(probeReshadeIni('')).toBe('missing');
		expect(probeReshadeIni('   ')).toBe('missing');
		expect(readFileSync).not.toHaveBeenCalled();
	});
});

describe('checkReshadeConfig', () => {
	// The stored path is still wrong here, but it governs nothing — warning about
	// it would be noise, and noise is what stops people reading the banner.
	test('says nothing while ReShade mode is off, however broken the path', () => {
		const readFileSync = vi.spyOn(fs, 'readFileSync');
		expect(checkReshadeConfig(false, '')).toEqual([]);
		expect(checkReshadeConfig(false, DEFAULT_INI)).toEqual([]);
		expect(readFileSync).not.toHaveBeenCalled();
	});

	test('says nothing when the ini is a usable config', () => {
		givenIniContent(REAL_CONFIG_INI);
		expect(checkReshadeConfig(true, DEFAULT_INI)).toEqual([]);
	});

	// The 2026-08-21 configuration, exactly: mode on, path left at our default,
	// nothing at that path.
	test('warns once, naming the path, for a missing ini', () => {
		givenIniError('ENOENT');
		const warnings = checkReshadeConfig(true, DEFAULT_INI);
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain(DEFAULT_INI);
	});

	// The 2026-08-28 configuration. This is the whole point of widening the
	// probe: before it, this case produced no warning at all.
	test('warns for a preset, and says preset rather than missing', () => {
		givenIniContent(PRESET_INI);
		expect(checkReshadeConfig(true, REPORTED_PRESET)).toEqual([
			describeReshadeIniProblem('preset', REPORTED_PRESET),
		]);
	});
});

describe('reshadeIniCandidates', () => {
	const env = {
		'ProgramFiles(x86)': 'C:\\Program Files (x86)',
		ProgramFiles: 'C:\\Program Files',
	} as NodeJS.ProcessEnv;

	// The folder the user already pointed at beats any guess of ours: they picked
	// it deliberately, and it survives an install that moved off C:.
	test('looks in the configured file’s own folder first', () => {
		const candidates = reshadeIniCandidates(
			'D:\\Games\\iRacing\\Old.ini',
			env
		);
		expect(candidates.slice(0, 2)).toEqual([
			'D:\\Games\\iRacing\\ReShade.ini',
			'D:\\Games\\iRacing\\iRacingSim64DX11.ini',
		]);
	});

	test('covers both ReShade config filenames in every folder it tries', () => {
		for (const candidate of reshadeIniCandidates(
			'D:\\Games\\iRacing\\Old.ini',
			env
		)) {
			expect(
				RESHADE_INI_FILENAMES.some((name) => candidate.endsWith(name))
			).toBe(true);
		}
	});

	test('adds both Program Files roots', () => {
		const candidates = reshadeIniCandidates('', env);
		expect(candidates).toContain(
			'C:\\Program Files (x86)\\iRacing\\ReShade.ini'
		);
		expect(candidates).toContain('C:\\Program Files\\iRacing\\ReShade.ini');
	});

	// A hardcoded C:\ would look authoritative and miss every install on another
	// drive, so the roots come from the environment or not at all.
	test('offers no Program Files guess when the environment has none', () => {
		expect(reshadeIniCandidates('', {} as NodeJS.ProcessEnv)).toEqual([]);
	});

	test('does not probe the same path twice', () => {
		const candidates = reshadeIniCandidates(DEFAULT_INI, env);
		const seen = candidates.map((entry) => entry.toLowerCase());
		expect(new Set(seen).size).toBe(seen.length);
	});

	test('survives an empty setting', () => {
		expect(reshadeIniCandidates(undefined, env).length).toBeGreaterThan(0);
	});
});

describe('discoverReshadeIni', () => {
	test('returns the first candidate that is a usable config', () => {
		const found = 'C:\\Program Files (x86)\\iRacing\\iRacingSim64DX11.ini';
		vi.spyOn(fs, 'readFileSync').mockImplementation((...args: unknown[]) => {
			if (args[0] !== found) {
				throw errno('ENOENT');
			}
			return REAL_CONFIG_INI;
		});
		expect(discoverReshadeIni(DEFAULT_INI)).toBe(found);
	});

	// The 2026-08-28 rescue: the user is pointed at a preset and ReShade.ini is
	// sitting in the same folder. A readability-only probe would have stopped at
	// the preset and "found" it.
	test('skips a readable preset and finds the real config beside it', () => {
		vi.spyOn(fs, 'readFileSync').mockImplementation((...args: unknown[]) =>
			args[0] === DEFAULT_INI ? REAL_CONFIG_INI : PRESET_INI
		);
		expect(discoverReshadeIni(REPORTED_PRESET)).toBe(DEFAULT_INI);
	});

	// Null keeps the user's own path in the setting. Rewriting it to a second
	// wrong path would replace a value they recognise with one they have never
	// seen, and the warning would then name a file they never chose.
	test('returns null rather than guessing when nothing is usable', () => {
		givenIniError('ENOENT');
		expect(discoverReshadeIni(DEFAULT_INI)).toBeNull();
	});

	test('returns null when every candidate is a preset', () => {
		givenIniContent(PRESET_INI);
		expect(discoverReshadeIni(DEFAULT_INI)).toBeNull();
	});
});
