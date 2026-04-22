import { parseIniSection, checkIracingConfig } from './iracing-config-checks';

// CJS require for fs: ESM namespace imports are sealed and `vi.spyOn` requires
// a mutable object target. Tests below spy on fs methods to simulate ini I/O.
const fs = require('fs');

describe('parseIniSection', () => {
	test('parses key=value pairs from a section', () => {
		const content = '[MonitorSetup]\nRenderViewPerMonitor=0\nFoo=bar\n';
		expect(parseIniSection(content, 'MonitorSetup')).toEqual({
			RenderViewPerMonitor: '0',
			Foo: 'bar',
		});
	});

	test('stops at the next section', () => {
		const content = '[MonitorSetup]\nA=1\n[Other]\nB=2\n';
		expect(parseIniSection(content, 'MonitorSetup')).toEqual({ A: '1' });
	});

	test('returns empty object when section is missing', () => {
		expect(parseIniSection('[Other]\nA=1', 'MonitorSetup')).toEqual({});
	});

	test('returns empty object for empty content', () => {
		expect(parseIniSection('', 'MonitorSetup')).toEqual({});
	});

	test('handles Windows line endings', () => {
		const content = '[MonitorSetup]\r\nRenderViewPerMonitor=1\r\n';
		expect(parseIniSection(content, 'MonitorSetup')).toEqual({
			RenderViewPerMonitor: '1',
		});
	});

	test('trims whitespace around keys and values', () => {
		const content = '[MonitorSetup]\n  Key  =  Value  \n';
		expect(parseIniSection(content, 'MonitorSetup')).toEqual({
			Key: 'Value',
		});
	});

	test('skips lines without equals sign', () => {
		const content = '[MonitorSetup]\n; comment\nKey=Value\n';
		expect(parseIniSection(content, 'MonitorSetup')).toEqual({
			Key: 'Value',
		});
	});

	test('handles value containing equals sign', () => {
		const content = '[MonitorSetup]\nKey=a=b\n';
		expect(parseIniSection(content, 'MonitorSetup')).toEqual({ Key: 'a=b' });
	});

	test('strips inline comments after semicolon', () => {
		const content =
			'[MonitorSetup]\nRenderViewPerMonitor=0                          \t; 0=off 1=on\n';
		expect(parseIniSection(content, 'MonitorSetup')).toEqual({
			RenderViewPerMonitor: '0',
		});
	});

	test('strips inline comments for non-zero values', () => {
		const content = '[MonitorSetup]\nRenderViewPerMonitor=1\t; 0=off 1=on\n';
		expect(parseIniSection(content, 'MonitorSetup')).toEqual({
			RenderViewPerMonitor: '1',
		});
	});
});

describe('checkIracingConfig', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('returns empty array when ini file does not exist', () => {
		vi.spyOn(fs, 'existsSync').mockReturnValue(false);
		expect(checkIracingConfig()).toEqual([]);
	});

	test('returns empty array when RenderViewPerMonitor is 0', () => {
		vi.spyOn(fs, 'existsSync').mockReturnValue(true);
		vi.spyOn(fs, 'readFileSync').mockReturnValue(
			'[MonitorSetup]\nRenderViewPerMonitor=0\n'
		);
		expect(checkIracingConfig()).toEqual([]);
	});

	test('returns warning when RenderViewPerMonitor is 1', () => {
		vi.spyOn(fs, 'existsSync').mockReturnValue(true);
		vi.spyOn(fs, 'readFileSync').mockReturnValue(
			'[MonitorSetup]\nRenderViewPerMonitor=1\n'
		);
		const warnings = checkIracingConfig();
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('Render Scene Using 3 Projections');
	});

	test('returns empty array when MonitorSetup section is missing', () => {
		vi.spyOn(fs, 'existsSync').mockReturnValue(true);
		vi.spyOn(fs, 'readFileSync').mockReturnValue('[OtherSection]\nFoo=bar\n');
		expect(checkIracingConfig()).toEqual([]);
	});

	test('returns empty array when RenderViewPerMonitor key is missing', () => {
		vi.spyOn(fs, 'existsSync').mockReturnValue(true);
		vi.spyOn(fs, 'readFileSync').mockReturnValue(
			'[MonitorSetup]\nOtherKey=1\n'
		);
		expect(checkIracingConfig()).toEqual([]);
	});

	test('returns empty array when file read throws', () => {
		vi.spyOn(fs, 'existsSync').mockReturnValue(true);
		vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
			throw new Error('EACCES');
		});
		expect(checkIracingConfig()).toEqual([]);
	});
});
