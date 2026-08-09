// Exercised against a REAL temp directory rather than fs spies. This module's
// whole job is file manipulation, and the properties that matter — the rename is
// atomic, the copy is byte-exact, backups rotate — are only meaningfully proven
// against a real filesystem.
import {
	listProfiles,
	getSnapshot,
	applyProfile,
	saveActiveAs,
	importProfile,
	exportProfile,
	renameProfile,
	deleteProfile,
	getProfilesDir,
	setProfilesDirForTesting,
	setTrashImplForTesting,
	type StoreContext,
} from './iracing-profiles-store';

const fs = require('fs');
const path = require('path');
const os = require('os');

const VALID_INI = [
	'[AutoCfg]',
	'AutoCfgCompleted=1                      \t; 0=need to run 3D autocfg',
	'',
	'[Graphics Options]',
	'SSAO=1                                  \t; 0=off, 1=on',
	'',
	'[Display]',
	'fullScreenWidth=2560                    \t; width',
	'',
].join('\r\n');

const TRIPLE_INI = VALID_INI.replace(
	'fullScreenWidth=2560',
	'fullScreenWidth=7680'
);
// A real file that lives in the same folder with the same extension, and would
// wreck the graphics config if applied.
const APP_INI = '[Replay]\nlastReplay=1\n[Misc]\nfoo=bar\n';

let root: string;
let profilesDir: string;
let iracingDir: string;
let trashed: string[];

function ctx(overrides: Partial<StoreContext> = {}): StoreContext {
	return {
		iracingFolder: iracingDir,
		lastAppliedName: '',
		iracingRunning: false,
		...overrides,
	};
}

function activeIniPath(): string {
	return path.join(iracingDir, 'rendererDX11Monitor.ini');
}

function writeProfile(name: string, content: string): void {
	fs.mkdirSync(profilesDir, { recursive: true });
	fs.writeFileSync(path.join(profilesDir, `${name}.ini`), content);
}

beforeEach(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), 'irst-profiles-'));
	profilesDir = path.join(root, 'graphics-profiles');
	iracingDir = path.join(root, 'iRacing');
	fs.mkdirSync(iracingDir, { recursive: true });
	setProfilesDirForTesting(profilesDir);
	trashed = [];
	setTrashImplForTesting(async (target: string) => {
		trashed.push(target);
		fs.unlinkSync(target);
	});
});

afterEach(() => {
	setProfilesDirForTesting(null);
	setTrashImplForTesting(null);
	fs.rmSync(root, { recursive: true, force: true });
});

describe('listProfiles', () => {
	test('returns empty before the directory exists', () => {
		expect(listProfiles()).toEqual([]);
		expect(fs.existsSync(profilesDir)).toBe(false);
	});

	test('lists stored profiles alphabetically', () => {
		writeProfile('Screenshots', VALID_INI);
		writeProfile('Racing', TRIPLE_INI);
		expect(listProfiles().map((p) => p.name)).toEqual([
			'Racing',
			'Screenshots',
		]);
	});

	test('ignores non-ini files and the backups directory', () => {
		writeProfile('Racing', VALID_INI);
		fs.writeFileSync(path.join(profilesDir, 'notes.txt'), 'hello');
		fs.mkdirSync(path.join(profilesDir, '.backups'), { recursive: true });
		fs.writeFileSync(
			path.join(profilesDir, '.backups', 'old.ini'),
			VALID_INI
		);
		expect(listProfiles().map((p) => p.name)).toEqual(['Racing']);
	});

	test('lists an invalid profile but marks it invalid', () => {
		// Hiding it would leave the user staring at a folder containing a file the
		// app pretends not to see.
		writeProfile('Broken', APP_INI);
		const [profile] = listProfiles();
		expect(profile.name).toBe('Broken');
		expect(profile.valid).toBe(false);
		expect(profile.error).toBe('missingSections');
	});

	test('reports size, mtime and a settings hash', () => {
		writeProfile('Racing', VALID_INI);
		const [profile] = listProfiles();
		expect(profile.sizeBytes).toBe(Buffer.byteLength(VALID_INI));
		expect(profile.modifiedAt).toBeGreaterThan(0);
		expect(profile.hash).toMatch(/^[0-9a-f]{40}$/);
	});
});

describe('getSnapshot', () => {
	test('reports a clean match when the active config equals a profile', () => {
		writeProfile('Racing', VALID_INI);
		fs.writeFileSync(activeIniPath(), VALID_INI);
		const snapshot = getSnapshot(ctx());
		expect(snapshot.active).toEqual({ name: 'Racing', state: 'clean' });
		expect(snapshot.activeExists).toBe(true);
		expect(snapshot.activeDifferences).toBeNull();
	});

	test('reports modified with a difference count after in-sim edits', () => {
		// The real-world state: applied a profile, then nudged a slider in iRacing.
		writeProfile('Racing', VALID_INI);
		fs.writeFileSync(activeIniPath(), VALID_INI.replace('SSAO=1', 'SSAO=0'));
		const snapshot = getSnapshot(ctx({ lastAppliedName: 'Racing' }));
		expect(snapshot.active).toEqual({ name: 'Racing', state: 'modified' });
		expect(snapshot.activeDifferences).toBe(1);
	});

	test('reports unknown when there is no active config', () => {
		writeProfile('Racing', VALID_INI);
		const snapshot = getSnapshot(ctx());
		expect(snapshot.activeExists).toBe(false);
		expect(snapshot.active).toEqual({ name: null, state: 'unknown' });
	});

	test('passes the iRacing-running flag through for the UI guard', () => {
		expect(getSnapshot(ctx({ iracingRunning: true })).iracingRunning).toBe(
			true
		);
	});
});

describe('applyProfile', () => {
	test('refuses while iRacing is running', () => {
		// iRacing rewrites the ini from memory on exit, so the swap would be
		// silently undone and the user would not find out until next launch.
		writeProfile('Racing', TRIPLE_INI);
		fs.writeFileSync(activeIniPath(), VALID_INI);

		const result = applyProfile('Racing', ctx({ iracingRunning: true }));

		expect(result).toEqual({ ok: false, error: 'iracingRunning' });
		expect(fs.readFileSync(activeIniPath(), 'utf8')).toBe(VALID_INI);
	});

	test('writes the profile over the live config byte for byte', () => {
		writeProfile('Racing', TRIPLE_INI);
		fs.writeFileSync(activeIniPath(), VALID_INI);

		expect(applyProfile('Racing', ctx())).toMatchObject({ ok: true });

		expect(fs.readFileSync(activeIniPath())).toEqual(
			fs.readFileSync(path.join(profilesDir, 'Racing.ini'))
		);
	});

	test('preserves CRLF endings exactly', () => {
		// iRacing writes CRLF; silently converting to LF would be a real change to
		// a file another program parses.
		writeProfile('Racing', TRIPLE_INI);
		applyProfile('Racing', ctx());
		const written = fs.readFileSync(activeIniPath(), 'utf8');
		expect(written).toContain('\r\n');
		expect(written).toBe(TRIPLE_INI);
	});

	test('backs up the outgoing config before overwriting it', () => {
		// The safety net for applying over settings tuned in-sim and never saved.
		writeProfile('Racing', TRIPLE_INI);
		fs.writeFileSync(activeIniPath(), VALID_INI);

		expect(applyProfile('Racing', ctx())).toMatchObject({
			ok: true,
			backedUp: true,
		});

		const backups = fs.readdirSync(path.join(profilesDir, '.backups'));
		expect(backups).toHaveLength(1);
		expect(
			fs.readFileSync(path.join(profilesDir, '.backups', backups[0]), 'utf8')
		).toBe(VALID_INI);
	});

	test('reports no backup when there was no config to preserve', () => {
		writeProfile('Racing', TRIPLE_INI);
		expect(applyProfile('Racing', ctx())).toMatchObject({
			ok: true,
			backedUp: false,
		});
	});

	test('refuses a profile that is not a renderer ini', () => {
		writeProfile('Broken', APP_INI);
		fs.writeFileSync(activeIniPath(), VALID_INI);

		expect(applyProfile('Broken', ctx())).toEqual({
			ok: false,
			error: 'invalidIni',
		});
		expect(fs.readFileSync(activeIniPath(), 'utf8')).toBe(VALID_INI);
	});

	test('reports a missing profile', () => {
		expect(applyProfile('Nope', ctx())).toEqual({
			ok: false,
			error: 'profileNotFound',
		});
	});

	test('leaves no staging file behind', () => {
		writeProfile('Racing', TRIPLE_INI);
		applyProfile('Racing', ctx());
		expect(
			fs.readdirSync(iracingDir).filter((f: string) => f.includes('tmp'))
		).toEqual([]);
	});

	test('keeps at most ten backups, discarding the oldest', () => {
		writeProfile('Racing', TRIPLE_INI);
		const backupsDir = path.join(profilesDir, '.backups');
		fs.mkdirSync(backupsDir, { recursive: true });
		// Twelve pre-existing, ISO-stamped so lexical order is chronological.
		for (let i = 0; i < 12; i++) {
			fs.writeFileSync(
				path.join(
					backupsDir,
					`rendererDX11Monitor.2020-01-${String(i + 1).padStart(2, '0')}.ini`
				),
				'old'
			);
		}
		fs.writeFileSync(activeIniPath(), VALID_INI);

		applyProfile('Racing', ctx());

		const remaining = fs.readdirSync(backupsDir).sort();
		expect(remaining).toHaveLength(10);
		// The oldest went first; the just-made backup survived.
		expect(remaining).not.toContain('rendererDX11Monitor.2020-01-01.ini');
	});
});

describe('saveActiveAs', () => {
	test('stores the live config under a new name', () => {
		fs.writeFileSync(activeIniPath(), VALID_INI);
		expect(saveActiveAs('Screenshots', ctx())).toEqual({
			ok: true,
			name: 'Screenshots',
		});
		expect(
			fs.readFileSync(path.join(profilesDir, 'Screenshots.ini'), 'utf8')
		).toBe(VALID_INI);
	});

	test('copies byte for byte', () => {
		fs.writeFileSync(activeIniPath(), VALID_INI);
		saveActiveAs('Screenshots', ctx());
		expect(
			fs.readFileSync(path.join(profilesDir, 'Screenshots.ini'))
		).toEqual(fs.readFileSync(activeIniPath()));
	});

	test('refuses to clobber an existing profile without overwrite', () => {
		writeProfile('Racing', TRIPLE_INI);
		fs.writeFileSync(activeIniPath(), VALID_INI);
		expect(saveActiveAs('Racing', ctx())).toEqual({
			ok: false,
			error: 'duplicate',
		});
		expect(
			fs.readFileSync(path.join(profilesDir, 'Racing.ini'), 'utf8')
		).toBe(TRIPLE_INI);
	});

	test('overwrite updates the profile and backs up what it replaced', () => {
		// The answer to a drifted config: make the profile catch up.
		writeProfile('Racing', TRIPLE_INI);
		fs.writeFileSync(activeIniPath(), VALID_INI);

		expect(saveActiveAs('Racing', ctx(), { overwrite: true })).toEqual({
			ok: true,
			name: 'Racing',
		});

		expect(
			fs.readFileSync(path.join(profilesDir, 'Racing.ini'), 'utf8')
		).toBe(VALID_INI);
		const backups = fs.readdirSync(path.join(profilesDir, '.backups'));
		expect(backups).toHaveLength(1);
		expect(
			fs.readFileSync(path.join(profilesDir, '.backups', backups[0]), 'utf8')
		).toBe(TRIPLE_INI);
	});

	test('rejects an invalid name before touching the disk', () => {
		fs.writeFileSync(activeIniPath(), VALID_INI);
		expect(saveActiveAs('bad/name', ctx())).toEqual({
			ok: false,
			error: 'illegalCharacters',
		});
		expect(listProfiles()).toEqual([]);
	});

	test('reports when there is no live config to save', () => {
		expect(saveActiveAs('Screenshots', ctx())).toEqual({
			ok: false,
			error: 'noActiveConfig',
		});
	});
});

describe('importProfile', () => {
	test('copies an external ini in', () => {
		const source = path.join(root, 'rendererDX11Monitor - Racing.ini');
		fs.writeFileSync(source, TRIPLE_INI);

		expect(importProfile(source, 'Racing')).toEqual({
			ok: true,
			name: 'Racing',
		});
		expect(fs.readFileSync(path.join(profilesDir, 'Racing.ini'))).toEqual(
			fs.readFileSync(source)
		);
	});

	test('refuses a file that is not a renderer ini', () => {
		// Importing app.ini and later applying it would wreck the graphics config.
		const source = path.join(root, 'app.ini');
		fs.writeFileSync(source, APP_INI);
		expect(importProfile(source, 'Oops')).toEqual({
			ok: false,
			error: 'invalidIni',
		});
		expect(listProfiles()).toEqual([]);
	});

	test('refuses a duplicate name', () => {
		writeProfile('Racing', VALID_INI);
		const source = path.join(root, 'src.ini');
		fs.writeFileSync(source, TRIPLE_INI);
		expect(importProfile(source, 'racing')).toEqual({
			ok: false,
			error: 'duplicate',
		});
	});

	test('reports a missing source file', () => {
		expect(importProfile(path.join(root, 'gone.ini'), 'X')).toEqual({
			ok: false,
			error: 'profileNotFound',
		});
	});
});

describe('exportProfile', () => {
	test('copies a profile out byte for byte', () => {
		writeProfile('Racing', TRIPLE_INI);
		const destination = path.join(root, 'exported.ini');
		expect(exportProfile('Racing', destination)).toEqual({ ok: true });
		expect(fs.readFileSync(destination)).toEqual(
			fs.readFileSync(path.join(profilesDir, 'Racing.ini'))
		);
	});

	test('reports failure for a missing profile', () => {
		expect(exportProfile('Nope', path.join(root, 'out.ini'))).toEqual({
			ok: false,
			error: 'ioError',
		});
	});
});

describe('renameProfile', () => {
	test('renames the underlying file', () => {
		writeProfile('Racing', TRIPLE_INI);
		expect(renameProfile('Racing', 'Race Day')).toEqual({
			ok: true,
			name: 'Race Day',
		});
		expect(listProfiles().map((p) => p.name)).toEqual(['Race Day']);
	});

	test('refuses a name already in use', () => {
		writeProfile('Racing', TRIPLE_INI);
		writeProfile('Screenshots', VALID_INI);
		expect(renameProfile('Racing', 'Screenshots')).toEqual({
			ok: false,
			error: 'duplicate',
		});
	});

	test('allows re-casing a profile to its own name', () => {
		writeProfile('Racing', TRIPLE_INI);
		expect(renameProfile('Racing', 'RACING')).toMatchObject({ ok: true });
	});

	test('reports a missing profile', () => {
		expect(renameProfile('Nope', 'X')).toEqual({
			ok: false,
			error: 'profileNotFound',
		});
	});

	test('rejects an invalid new name', () => {
		writeProfile('Racing', TRIPLE_INI);
		expect(renameProfile('Racing', 'a|b')).toEqual({
			ok: false,
			error: 'illegalCharacters',
		});
	});
});

describe('deleteProfile', () => {
	test('sends the file to the recycle bin rather than unlinking it', async () => {
		// A mis-click destroys a configuration that took real effort to build.
		writeProfile('Racing', TRIPLE_INI);
		await expect(deleteProfile('Racing')).resolves.toEqual({ ok: true });
		expect(trashed).toEqual([path.join(profilesDir, 'Racing.ini')]);
		expect(listProfiles()).toEqual([]);
	});

	test('reports a missing profile', async () => {
		await expect(deleteProfile('Nope')).resolves.toEqual({
			ok: false,
			error: 'profileNotFound',
		});
	});

	test('reports a trash failure instead of deleting permanently', async () => {
		writeProfile('Racing', TRIPLE_INI);
		setTrashImplForTesting(async () => {
			throw new Error('recycle bin unavailable');
		});
		await expect(deleteProfile('Racing')).resolves.toEqual({
			ok: false,
			error: 'ioError',
		});
		// Still there — never escalated to a permanent delete.
		expect(listProfiles().map((p) => p.name)).toEqual(['Racing']);
	});
});

describe('getProfilesDir', () => {
	test('honours the test override', () => {
		expect(getProfilesDir()).toBe(profilesDir);
	});
});
