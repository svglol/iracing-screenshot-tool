import {
	parseIniDocument,
	getValue,
	hasSection,
	patchValues,
	serialize,
} from './ini-document';

// Fixtures are built as latin1 Buffers IN CODE, never read from fixture files:
// the whole point of this module is byte exactness, and a fixture that travels
// through editors, git filters, or tooling with encoding opinions cannot be
// trusted to still hold the bytes it was authored with. `Buffer.from(s,
// 'latin1')` maps every char 1:1 to a byte, so what the test says is what the
// "file" contains.

const BOM = 'ï»¿'; // EF BB BF as latin1 chars

// Structurally faithful renderer ini: real section names, column-padded
// inline trailers, CRLF endings, BOM.
const RENDERER_LINES = [
	`${BOM}[AutoCfg]`,
	'AutoCfgCompleted=1                      \t; 0=need to run 3D autocfg at startup',
	'',
	'[Graphics Options]',
	'SSAO=1                                  \t; 0=off, 1=on',
	'ShaderQuality=3                         \t; 0=low, 1=med, 2=high, 3=max',
	'MSAASamples=4',
	'',
	'[Display]',
	'windowedWidth=1920                      \t; window width in pixels',
	'windowedHeight=1080                     \t; window height in pixels',
	'RefreshRate=0                           \t; 0 = auto',
	'',
	'[MonitorSetup]',
	'NumMonitors=1                           \t; 1 or 3',
	'ViewingDist=600                         \t; mm',
	'',
	'[Debug]',
	'Renderer=?                              \t; Driver DLL',
	'',
];
const RENDERER = Buffer.from(RENDERER_LINES.join('\r\n'), 'latin1');

function buf(text: string): Buffer {
	return Buffer.from(text, 'latin1');
}

describe('parseIniDocument round trip', () => {
	const cases: Array<[string, Buffer]> = [
		['BOM + CRLF renderer ini', RENDERER],
		['no BOM, CRLF', buf('[A]\r\nx=1\r\n')],
		['LF only', buf('[A]\nx=1\ny=2\n')],
		['mixed endings', buf('[A]\r\nx=1\ny=2\r\n')],
		['unterminated last line', buf('[A]\r\nx=1')],
		['file ending with blank lines', buf('[A]\r\nx=1\r\n\r\n\r\n')],
		['lone CR embedded in a line', buf('[A]\r\nx=1\rtrailing\r\n')],
		[
			'high-byte latin1 char in a comment',
			buf('[A]\r\n; temp in °C — était\r\nx=1\r\n'),
		],
		['empty file', buf('')],
		['whitespace only', buf('   \r\n\t\r\n')],
	];

	for (const [name, bytes] of cases) {
		test(`serialize(parse(bytes)) is byte-identical: ${name}`, () => {
			expect(serialize(parseIniDocument(bytes)).equals(bytes)).toBe(true);
		});
	}
});

describe('getValue', () => {
	const doc = parseIniDocument(RENDERER);

	test('reads a value and strips the padded inline trailer', () => {
		expect(getValue(doc, 'Graphics Options', 'SSAO')).toBe('1');
		expect(getValue(doc, 'Display', 'windowedWidth')).toBe('1920');
	});

	test('reads a value with no trailer', () => {
		expect(getValue(doc, 'Graphics Options', 'MSAASamples')).toBe('4');
	});

	test('reads a key in the BOM-prefixed first section', () => {
		expect(getValue(doc, 'AutoCfg', 'AutoCfgCompleted')).toBe('1');
	});

	test('section and key lookup are case-insensitive', () => {
		expect(getValue(doc, 'graphics options', 'ssao')).toBe('1');
		expect(getValue(doc, 'DISPLAY', 'WINDOWEDWIDTH')).toBe('1920');
	});

	test('missing key and missing section are undefined', () => {
		expect(getValue(doc, 'Display', 'nope')).toBeUndefined();
		expect(getValue(doc, 'Nope', 'windowedWidth')).toBeUndefined();
	});

	test('hasSection matches case-insensitively', () => {
		expect(hasSection(doc, 'monitorsetup')).toBe(true);
		expect(hasSection(doc, 'Replay Graphics')).toBe(false);
	});

	test('duplicate key: the LAST occurrence wins', () => {
		const dup = parseIniDocument(buf('[A]\r\nx=1\r\nx=2\r\n'));
		expect(getValue(dup, 'A', 'x')).toBe('2');
	});

	test('repeated section headers merge, later keys visible', () => {
		const dup = parseIniDocument(buf('[A]\r\nx=1\r\n[B]\r\n[A]\r\ny=2\r\n'));
		expect(getValue(dup, 'A', 'x')).toBe('1');
		expect(getValue(dup, 'A', 'y')).toBe('2');
	});

	test('keys before any section header are dropped', () => {
		const doc2 = parseIniDocument(buf('orphan=1\r\n[A]\r\nx=2\r\n'));
		expect(getValue(doc2, 'A', 'orphan')).toBeUndefined();
		expect(getValue(doc2, 'A', 'x')).toBe('2');
	});

	test('a malformed header stops key collection (parseIni parity)', () => {
		const doc2 = parseIniDocument(buf('[A]\r\nx=1\r\n[broken\r\ny=2\r\n'));
		expect(getValue(doc2, 'A', 'x')).toBe('1');
		expect(getValue(doc2, 'A', 'y')).toBeUndefined();
	});

	test('whole-line comments are not keys, even containing "="', () => {
		const doc2 = parseIniDocument(buf('[A]\r\n; note: x=9\r\nx=1\r\n'));
		expect(getValue(doc2, 'A', 'x')).toBe('1');
	});

	test('empty value reads as empty string', () => {
		const doc2 = parseIniDocument(buf('[A]\r\nx=\r\ny=  ; hint\r\n'));
		expect(getValue(doc2, 'A', 'x')).toBe('');
		expect(getValue(doc2, 'A', 'y')).toBe('');
	});
});

describe('patchValues', () => {
	test('changes exactly the value bytes, nothing else', () => {
		const doc = parseIniDocument(RENDERER);
		const result = patchValues(doc, [
			{ section: 'Display', key: 'windowedWidth', value: '2560' },
		]);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		const expected = Buffer.from(
			RENDERER_LINES.map((line) =>
				line.startsWith('windowedWidth=1920')
					? line.replace('windowedWidth=1920', 'windowedWidth=2560')
					: line
			).join('\r\n'),
			'latin1'
		);
		expect(result.bytes.equals(expected)).toBe(true);
	});

	test('preserves the trailer and padding on the patched line', () => {
		const doc = parseIniDocument(RENDERER);
		const result = patchValues(doc, [
			{ section: 'Graphics Options', key: 'SSAO', value: '0' },
		]);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		const text = result.bytes.toString('latin1');
		const originalLine = RENDERER_LINES.find((line) =>
			line.startsWith('SSAO=')
		);
		expect(text).toContain(originalLine.replace('SSAO=1', 'SSAO=0'));
	});

	test('a longer value only stretches its own line', () => {
		const doc = parseIniDocument(RENDERER);
		const result = patchValues(doc, [
			{ section: 'MonitorSetup', key: 'ViewingDist', value: '1054' },
		]);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		const text = result.bytes.toString('latin1');
		const viewingDist = RENDERER_LINES.find((line) =>
			line.startsWith('ViewingDist=')
		);
		expect(text).toContain(
			viewingDist.replace('ViewingDist=600', 'ViewingDist=1054')
		);
		// Every other line is untouched.
		expect(text).toContain(
			RENDERER_LINES.find((line) => line.startsWith('NumMonitors='))
		);
	});

	test('BOM and CRLF endings survive a patch', () => {
		const doc = parseIniDocument(RENDERER);
		const result = patchValues(doc, [
			{ section: 'Display', key: 'RefreshRate', value: '120' },
		]);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(
			result.bytes.slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))
		).toBe(true);
		expect(result.bytes.toString('latin1')).toContain('\r\n');
	});

	test('multiple edits land in one pass, changedLines sorted', () => {
		const doc = parseIniDocument(RENDERER);
		const result = patchValues(doc, [
			{ section: 'MonitorSetup', key: 'NumMonitors', value: '3' },
			{ section: 'Graphics Options', key: 'ShaderQuality', value: '2' },
		]);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		const reparsed = parseIniDocument(result.bytes);
		expect(getValue(reparsed, 'MonitorSetup', 'NumMonitors')).toBe('3');
		expect(getValue(reparsed, 'Graphics Options', 'ShaderQuality')).toBe('2');
		expect(result.changedLines).toEqual(
			[...result.changedLines].sort((a, b) => a - b)
		);
	});

	test('duplicate edits to one key collapse to the last', () => {
		const doc = parseIniDocument(RENDERER);
		const result = patchValues(doc, [
			{ section: 'Display', key: 'RefreshRate', value: '60' },
			{ section: 'Display', key: 'RefreshRate', value: '144' },
		]);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(
			getValue(parseIniDocument(result.bytes), 'Display', 'RefreshRate')
		).toBe('144');
		expect(result.changedLines).toHaveLength(1);
	});

	test('patches the LAST occurrence of a duplicated key', () => {
		const doc = parseIniDocument(buf('[A]\r\nx=1\r\nx=2\r\n'));
		const result = patchValues(doc, [{ section: 'A', key: 'x', value: '9' }]);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.bytes.toString('latin1')).toBe('[A]\r\nx=1\r\nx=9\r\n');
	});

	test('patching an empty value inserts in place', () => {
		const doc = parseIniDocument(buf('[A]\r\nx=\r\n'));
		const result = patchValues(doc, [{ section: 'A', key: 'x', value: '5' }]);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.bytes.toString('latin1')).toBe('[A]\r\nx=5\r\n');
	});

	test('unknown key rejects the whole batch, document untouched', () => {
		const doc = parseIniDocument(RENDERER);
		const result = patchValues(doc, [
			{ section: 'Display', key: 'windowedWidth', value: '640' },
			{ section: 'Display', key: 'doesNotExist', value: '1' },
		]);
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error).toBe('keyNotFound');
		expect(result.key).toBe('doesNotExist');
		// Nothing was mutated: the document still serializes to the input.
		expect(serialize(doc).equals(RENDERER)).toBe(true);
	});

	test('unknown section reports sectionNotFound', () => {
		const doc = parseIniDocument(RENDERER);
		const result = patchValues(doc, [
			{ section: 'Replay Graphics', key: 'SSAO', value: '1' },
		]);
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error).toBe('sectionNotFound');
		expect(result.section).toBe('Replay Graphics');
	});

	test('case-insensitive edits keep the file casing intact', () => {
		const doc = parseIniDocument(RENDERER);
		const result = patchValues(doc, [
			{ section: 'display', key: 'WINDOWEDHEIGHT', value: '1440' },
		]);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		const original = RENDERER_LINES.find((line) =>
			line.startsWith('windowedHeight=')
		);
		expect(result.bytes.toString('latin1')).toContain(
			original.replace('windowedHeight=1080', 'windowedHeight=1440')
		);
	});
});
