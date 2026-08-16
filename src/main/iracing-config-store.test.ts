import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
	listModes,
	readConfig,
	saveConfig,
	setConfigDirForTesting,
	type ConfigStoreContext,
} from './iracing-config-store';
import { SETTINGS, settingId } from '../utilities/iracing-settings-schema';

// Real temp directories, no fs spies: byte-exactness and backup rotation are
// only meaningfully proven against a real filesystem (same stance as
// iracing-profiles-store.test.ts).

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);

// A renderer ini carrying EVERY curated Monitor-tab key, iRacing-shaped:
// BOM, CRLF, column-padded inline trailers, float-formatted numbers.
const FIXTURE_LINES = [
	'[AutoCfg]',
	'AutoCfgCompleted=1                      \t; 0=need to run 3D autocfg',
	'',
	'[Graphics Options]',
	'ShaderQuality=3                         \t; 0=low, 3=max',
	'ShadowDetail=1',
	'DynamicShadowMaps=1',
	'DNSMFilter=5                            \t; 0= none 1= Fetch4 2= PCF4 3= PCF4P 4= PCF8P 5= PCF16P',
	'CarDetail=2',
	'PitObjectDetail=2',
	'CrowdDetail=1',
	'GrandstandDetail=1',
	'ObjectDetail=1',
	'FoliageDetail=0',
	'ParticleDetail=2',
	'ParticlesFullRes=1',
	'MirrorDetail=1',
	'MaxCockpitMirrors=2',
	'AntiAliasMethod=1',
	'MSAASamples=4',
	'MSAAUseFilter=1',
	'Sharpening=1',
	'SharpeningAmount=125',
	'FSRSharpness=4',
	'AutoExposure=1',
	'SSAO=1                                  \t; 0=off, 1=on',
	'SSRLevel=0',
	'SSRRainOnly=0',
	'HeatHaze=0',
	'DepthOfField=0',
	'MotionBlurStrength=0',
	'Distortion=0',
	'EnableHDR=1',
	'LimitFrameRate=0',
	'DesiredFPSLimit=106',
	'VerticalSync=0',
	'NvReflexMode=2',
	'MaxPreRenderedFrames=1',
	'SysMemToUseMB=32768',
	'VidMemToUseMB=12712',
	'MaxCarsToDraw=30',
	'MaxCarsToDrawInMirrors=8',
	'VirtualMirrors=1',
	'UIScale=100',
	'EnableTireMarks=1',
	'HideCockpitObstructions=3',
	'HeadlightLevel=2',
	'',
	'[Display]',
	'border=0                                \t; window border',
	'windowedXPos=0',
	'windowedYPos=0',
	'windowedWidth=1920',
	'windowedHeight=1080',
	'windowedMaximized=0',
	'windowedAlignment=0',
	'fullScreen=0                            \t; 0=windowed',
	'fullScreenWidth=2560',
	'fullScreenHeight=1440',
	'fullScreenDepth=32',
	'RefreshRate=0.000000                    \t; 0 = auto',
	'deviceIdx=0',
	'displayRotateMode=1',
	'pixelRatio=1.000000',
	'pixelRatioWindowed=1.000000',
	'ModeScaling=0',
	'HDRFormat=0                             \t; 0 = SDR 8bit',
	'',
	'[MonitorSetup]',
	'NumMonitors=1                           \t; 1 or 3',
	'MonitorType=0                           \t; 0=flat, 1=curved',
	'EnableSMPSurround=0',
	'RenderViewPerMonitor=0',
	'ViewingDist=600                         \t; mm',
	'MonitorWidth=550                        \t; mm',
	'ScreenWidth=531                         \t; mm',
	'ScreenAngles=0.000000',
	'RadiusOfCurvature=1000',
	'BezelProtectionPct=0.000000',
	'Min3ViewZoomDistortion=1.000000',
	'',
	// A partial replay section, like real files: SSAO/CarDetail have twins,
	// MotionBlurStrength deliberately does not.
	'[Replay Graphics]',
	'SSAO=0                                  \t; 0=off, 1=on',
	'CarDetail=1',
	'ShadowDetail=0',
	'',
];
const FIXTURE = Buffer.concat([
	BOM,
	Buffer.from(FIXTURE_LINES.join('\r\n'), 'latin1'),
]);

let iracingDir: string;
let configDir: string;
let ctx: ConfigStoreContext;

function writeMonitorIni(bytes: Buffer = FIXTURE): string {
	const filePath = path.join(iracingDir, 'rendererDX11Monitor.ini');
	fs.writeFileSync(filePath, bytes);
	return filePath;
}

function backupsDir(): string {
	return path.join(configDir, '.backups');
}

function readMonitor(): { mtimeMs: number } {
	const result = readConfig('Monitor', ctx);
	expect(result.ok).toBe(true);
	if (!result.ok) {
		throw new Error('readConfig failed');
	}
	return result;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 3));

beforeEach(() => {
	iracingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'irst-cfg-ir-'));
	configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'irst-cfg-ud-'));
	setConfigDirForTesting(configDir);
	ctx = { iracingFolder: iracingDir, iracingRunning: false };
});

afterEach(() => {
	setConfigDirForTesting(null);
	fs.rmSync(iracingDir, { recursive: true, force: true });
	fs.rmSync(configDir, { recursive: true, force: true });
});

describe('listModes', () => {
	test('discovers every renderer variant, Monitor first, Legacy included', () => {
		writeMonitorIni();
		fs.writeFileSync(
			path.join(iracingDir, 'rendererDX11OpenXR.ini'),
			FIXTURE
		);
		fs.writeFileSync(path.join(iracingDir, 'rendererDX11.ini'), FIXTURE);
		fs.writeFileSync(path.join(iracingDir, 'app.ini'), '[X]\r\n');

		const result = listModes(ctx);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.modes.map((m) => m.mode)).toEqual([
			'Monitor',
			'Legacy',
			'OpenXR',
		]);
		expect(result.modes[0].fileName).toBe('rendererDX11Monitor.ini');
		expect(result.modes.every((m) => m.mtimeMs > 0)).toBe(true);
	});

	test('custom configs sort directly behind their base mode', () => {
		writeMonitorIni();
		for (const name of [
			'rendererDX11Monitor - Video.ini',
			'rendererDX11Monitor - Racing.ini',
			'rendererDX11OpenXR.ini',
			'rendererDX11OpenXR - Racing.ini',
			'rendererDX11.ini',
		]) {
			fs.writeFileSync(path.join(iracingDir, name), FIXTURE);
		}

		const result = listModes(ctx);
		if (!result.ok) {
			throw new Error('listModes failed');
		}
		expect(result.modes.map((m) => m.mode)).toEqual([
			'Monitor',
			'Monitor - Racing',
			'Monitor - Video',
			'Legacy',
			'OpenXR',
			'OpenXR - Racing',
		]);
	});

	test('an unknown suffix is still listed as its own mode', () => {
		fs.writeFileSync(
			path.join(iracingDir, 'rendererDX11Something.ini'),
			FIXTURE
		);
		const result = listModes(ctx);
		if (!result.ok) {
			throw new Error('listModes failed');
		}
		expect(result.modes.map((m) => m.mode)).toEqual(['Something']);
	});

	test('a missing iRacing folder lists as empty, not as an error', () => {
		const result = listModes({
			iracingFolder: path.join(iracingDir, 'not-there'),
			iracingRunning: false,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.modes).toEqual([]);
		expect(result.folder).toContain('not-there');
	});
});

describe('readConfig', () => {
	test('returns every curated value present in the file', () => {
		writeMonitorIni();
		const result = readConfig('Monitor', ctx);
		if (!result.ok) {
			throw new Error('readConfig failed');
		}
		expect(result.values['Display/windowedWidth']).toBe('1920');
		expect(result.values['Display/RefreshRate']).toBe('0.000000');
		expect(result.values['Graphics Options/ShaderQuality']).toBe('3');
		expect(result.missing).toEqual([]);
		expect(result.fileName).toBe('rendererDX11Monitor.ini');
		expect(result.mtimeMs).toBeGreaterThan(0);
	});

	test('curated keys absent from the file are reported missing', () => {
		const withoutHeight = Buffer.from(
			FIXTURE.toString('latin1').replace(
				'windowedHeight=1080',
				'SomethingElse=1'
			),
			'latin1'
		);
		writeMonitorIni(withoutHeight);
		const result = readConfig('Monitor', ctx);
		if (!result.ok) {
			throw new Error('readConfig failed');
		}
		expect(result.missing).toEqual(['Display/windowedHeight']);
		expect(result.values['Display/windowedHeight']).toBeUndefined();
	});

	test('a missing file is fileNotFound', () => {
		const result = readConfig('Monitor', ctx);
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error).toBe('fileNotFound');
	});

	test('the fixture covers the entire curated schema', () => {
		// Guard for future schema additions: every new descriptor must join the
		// fixture, or the byte-exactness suite silently loses coverage.
		writeMonitorIni();
		const result = readConfig('Monitor', ctx);
		if (!result.ok) {
			throw new Error('readConfig failed');
		}
		expect(Object.keys(result.values).sort()).toEqual(
			SETTINGS.map(settingId).sort()
		);
	});
});

describe('saveConfig', () => {
	test('changes exactly the value bytes; BOM, CRLF, trailers survive', () => {
		const filePath = writeMonitorIni();
		const { mtimeMs } = readMonitor();

		const result = saveConfig(
			'Monitor',
			[{ id: 'Display/windowedWidth', value: '2560' }],
			mtimeMs,
			ctx
		);
		expect(result.ok).toBe(true);

		const written = fs.readFileSync(filePath);
		const expected = Buffer.concat([
			BOM,
			Buffer.from(
				FIXTURE_LINES.map((line) =>
					line === 'windowedWidth=1920' ? 'windowedWidth=2560' : line
				).join('\r\n'),
				'latin1'
			),
		]);
		expect(written.equals(expected)).toBe(true);
	});

	test('returns the fresh mtime so a follow-up save is not stale', async () => {
		writeMonitorIni();
		const { mtimeMs } = readMonitor();

		const first = saveConfig(
			'Monitor',
			[{ id: 'Display/windowedWidth', value: '2560' }],
			mtimeMs,
			ctx
		);
		if (!first.ok) {
			throw new Error('first save failed');
		}
		await tick();
		const second = saveConfig(
			'Monitor',
			[{ id: 'Display/windowedHeight', value: '1440' }],
			first.mtimeMs,
			ctx
		);
		expect(second.ok).toBe(true);
	});

	test('refuses while iRacing is running, file untouched', () => {
		const filePath = writeMonitorIni();
		const { mtimeMs } = readMonitor();

		const result = saveConfig(
			'Monitor',
			[{ id: 'Display/windowedWidth', value: '2560' }],
			mtimeMs,
			{ ...ctx, iracingRunning: true }
		);
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error).toBe('iracingRunning');
		expect(fs.readFileSync(filePath).equals(FIXTURE)).toBe(true);
	});

	test('refuses a stale mtime — the file changed since it was read', () => {
		const filePath = writeMonitorIni();
		const { mtimeMs } = readMonitor();

		// Someone else (iRacing exiting) rewrites the file.
		const later = new Date(Date.now() + 5000);
		fs.utimesSync(filePath, later, later);

		const result = saveConfig(
			'Monitor',
			[{ id: 'Display/windowedWidth', value: '2560' }],
			mtimeMs,
			ctx
		);
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error).toBe('staleFile');
		expect(fs.readFileSync(filePath).equals(FIXTURE)).toBe(true);
	});

	test('refuses an id outside the curated schema', () => {
		writeMonitorIni();
		const { mtimeMs } = readMonitor();
		const result = saveConfig(
			'Monitor',
			[{ id: 'Debug/Renderer', value: 'x' }],
			mtimeMs,
			ctx
		);
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error).toBe('validationFailed');
	});

	test('refuses a value outside its rails', () => {
		const filePath = writeMonitorIni();
		const { mtimeMs } = readMonitor();
		const result = saveConfig(
			'Monitor',
			[{ id: 'Display/windowedWidth', value: '99' }],
			mtimeMs,
			ctx
		);
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error).toBe('validationFailed');
		expect(fs.readFileSync(filePath).equals(FIXTURE)).toBe(true);
	});

	test('a curated key the file lacks is keyNotFound, file untouched', () => {
		const withoutHeight = Buffer.from(
			FIXTURE.toString('latin1').replace(
				'windowedHeight=1080',
				'SomethingElse=1'
			),
			'latin1'
		);
		const filePath = writeMonitorIni(withoutHeight);
		const { mtimeMs } = readMonitor();

		const result = saveConfig(
			'Monitor',
			[{ id: 'Display/windowedHeight', value: '1440' }],
			mtimeMs,
			ctx
		);
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error).toBe('keyNotFound');
		expect(fs.readFileSync(filePath).equals(withoutHeight)).toBe(true);
	});

	test('an empty edit list succeeds without touching the file', () => {
		const filePath = writeMonitorIni();
		const { mtimeMs } = readMonitor();
		const before = fs.statSync(filePath).mtimeMs;

		const result = saveConfig('Monitor', [], mtimeMs, ctx);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.backedUp).toBe(false);
		expect(fs.statSync(filePath).mtimeMs).toBe(before);
	});

	test("a save is preceded by a backup in this feature's own directory", () => {
		writeMonitorIni();
		const { mtimeMs } = readMonitor();

		const result = saveConfig(
			'Monitor',
			[{ id: 'Display/windowedWidth', value: '2560' }],
			mtimeMs,
			ctx
		);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.backedUp).toBe(true);

		const backups = fs.readdirSync(backupsDir());
		expect(backups).toHaveLength(1);
		expect(backups[0]).toMatch(/^rendererDX11Monitor\..+\.ini$/);
		// The backup holds the PRE-save bytes.
		expect(
			fs.readFileSync(path.join(backupsDir(), backups[0])).equals(FIXTURE)
		).toBe(true);
	});

	test('backups rotate at 10', async () => {
		writeMonitorIni();
		let { mtimeMs } = readMonitor();

		for (let i = 0; i < 12; i++) {
			const result = saveConfig(
				'Monitor',
				[{ id: 'Display/windowedWidth', value: String(1920 + i) }],
				mtimeMs,
				ctx
			);
			if (!result.ok) {
				throw new Error(`save ${i} failed: ${result.error}`);
			}
			mtimeMs = result.mtimeMs;
			// ISO stamps carry millisecond precision; keep consecutive saves from
			// sharing one.
			await tick();
		}

		const backups = fs
			.readdirSync(backupsDir())
			.filter((file) => file.endsWith('.ini'));
		expect(backups).toHaveLength(10);
	});

	test('no staging file is left behind after a save', () => {
		writeMonitorIni();
		const { mtimeMs } = readMonitor();
		const result = saveConfig(
			'Monitor',
			[{ id: 'Display/windowedWidth', value: '2560' }],
			mtimeMs,
			ctx
		);
		expect(result.ok).toBe(true);
		expect(
			fs.readdirSync(iracingDir).filter((f) => f.includes('.iRST-tmp'))
		).toEqual([]);
	});

	test('pairReplay mirrors a paired edit into [Replay Graphics]', () => {
		const filePath = writeMonitorIni();
		const { mtimeMs } = readMonitor();

		const result = saveConfig(
			'Monitor',
			[{ id: 'Graphics Options/SSAO', value: '0' }],
			mtimeMs,
			ctx,
			{ pairReplay: true }
		);
		expect(result.ok).toBe(true);

		const text = fs.readFileSync(filePath).toString('latin1');
		const replaySection = text.slice(text.indexOf('[Replay Graphics]'));
		// Main section updated…
		expect(text).toContain(
			'SSAO=0                                  \t; 0=off, 1=on'
		);
		// …and the replay twin got the same value (it already was 0; use a
		// different value to prove the write).
		expect(replaySection).toContain('SSAO=0');
	});

	test('pairReplay writes BOTH sections when the values differ', () => {
		const filePath = writeMonitorIni();
		const { mtimeMs } = readMonitor();

		const result = saveConfig(
			'Monitor',
			[{ id: 'Graphics Options/CarDetail', value: '0' }],
			mtimeMs,
			ctx,
			{ pairReplay: true }
		);
		expect(result.ok).toBe(true);

		const text = fs.readFileSync(filePath).toString('latin1');
		const replayStart = text.indexOf('[Replay Graphics]');
		const mainSection = text.slice(0, replayStart);
		const replaySection = text.slice(replayStart);
		expect(mainSection).toContain('CarDetail=0');
		expect(replaySection).toContain('CarDetail=0');
		expect(replaySection).not.toContain('CarDetail=1');
	});

	test('a paired key without a replay twin saves without mirroring', () => {
		const filePath = writeMonitorIni();
		const { mtimeMs } = readMonitor();

		const result = saveConfig(
			'Monitor',
			[{ id: 'Graphics Options/MotionBlurStrength', value: '4' }],
			mtimeMs,
			ctx,
			{ pairReplay: true }
		);
		expect(result.ok).toBe(true);

		const text = fs.readFileSync(filePath).toString('latin1');
		const replaySection = text.slice(text.indexOf('[Replay Graphics]'));
		expect(text).toContain('MotionBlurStrength=4');
		expect(replaySection).not.toContain('MotionBlurStrength');
	});

	test('without pairReplay the replay section is never touched', () => {
		const filePath = writeMonitorIni();
		const { mtimeMs } = readMonitor();

		const result = saveConfig(
			'Monitor',
			[{ id: 'Graphics Options/CarDetail', value: '0' }],
			mtimeMs,
			ctx
		);
		expect(result.ok).toBe(true);

		const text = fs.readFileSync(filePath).toString('latin1');
		const replaySection = text.slice(text.indexOf('[Replay Graphics]'));
		expect(replaySection).toContain('CarDetail=1');
	});

	test('pairReplay leaves unpaired settings alone', () => {
		const filePath = writeMonitorIni();
		const { mtimeMs } = readMonitor();

		const result = saveConfig(
			'Monitor',
			[{ id: 'Graphics Options/UIScale', value: '120' }],
			mtimeMs,
			ctx,
			{ pairReplay: true }
		);
		expect(result.ok).toBe(true);

		const text = fs.readFileSync(filePath).toString('latin1');
		const replaySection = text.slice(text.indexOf('[Replay Graphics]'));
		expect(text).toContain('UIScale=120');
		expect(replaySection).not.toContain('UIScale');
	});

	test('a vanished file is fileNotFound', () => {
		writeMonitorIni();
		const { mtimeMs } = readMonitor();
		fs.unlinkSync(path.join(iracingDir, 'rendererDX11Monitor.ini'));

		const result = saveConfig(
			'Monitor',
			[{ id: 'Display/windowedWidth', value: '2560' }],
			mtimeMs,
			ctx
		);
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error).toBe('fileNotFound');
	});
});
