import {
	getOutputExtension,
	buildUniqueScreenshotName,
	resolveCropRect,
} from './screenshot-output';

// ---------------------------------------------------------------------------
// getOutputExtension
// ---------------------------------------------------------------------------
describe('getOutputExtension', () => {
	test('maps known format keys', () => {
		expect(getOutputExtension('jpeg')).toBe('.jpg');
		expect(getOutputExtension('png')).toBe('.png');
		expect(getOutputExtension('webp')).toBe('.webp');
	});

	test('defaults to .jpg for unknown / missing keys', () => {
		expect(getOutputExtension('gif')).toBe('.jpg');
		expect(getOutputExtension('')).toBe('.jpg');
		expect(getOutputExtension(undefined)).toBe('.jpg');
		expect(getOutputExtension(null)).toBe('.jpg');
	});
});

// ---------------------------------------------------------------------------
// buildUniqueScreenshotName
//
// A minimal session object so resolveFilenameFormat expands {track}/{driver}
// to real values (its findDriver needs telemetry.values.CamCarIdx). Kept small
// on purpose — the token engine itself is covered by filenameFormat.test.ts.
// ---------------------------------------------------------------------------
describe('buildUniqueScreenshotName', () => {
	const sessionInfo = {
		data: {
			WeekendInfo: { TrackDisplayShortName: 'Daytona', TeamRacing: 0 },
			DriverInfo: {
				DriverCarIdx: 0,
				Drivers: [{ CarIdx: 0, UserName: 'Ayrton Senna' }],
			},
		},
	};
	const telemetry = { values: { CamCarIdx: 0 } };

	test('expands {counter} to the first free integer', () => {
		// '0' and '1' are taken, '2' is free.
		const taken = new Set([
			'Daytona-Ayrton Senna-0',
			'Daytona-Ayrton Senna-1',
		]);
		const name = buildUniqueScreenshotName({
			formatString: '{track}-{driver}-{counter}',
			sessionInfo,
			telemetry,
			exists: (n) => taken.has(n),
		});
		expect(name).toBe('Daytona-Ayrton Senna-2');
	});

	test('starts {counter} at 0 when nothing is taken', () => {
		const name = buildUniqueScreenshotName({
			formatString: '{track}-{counter}',
			sessionInfo,
			telemetry,
			exists: () => false,
		});
		expect(name).toBe('Daytona-0');
	});

	test('appends -N to a counter-less format on collision', () => {
		const taken = new Set(['Daytona', 'Daytona-1']);
		const name = buildUniqueScreenshotName({
			formatString: '{track}',
			sessionInfo,
			telemetry,
			exists: (n) => taken.has(n),
		});
		expect(name).toBe('Daytona-2');
	});

	test('returns the resolved name unchanged when there is no collision', () => {
		const name = buildUniqueScreenshotName({
			formatString: '{track}',
			sessionInfo,
			telemetry,
			exists: () => false,
		});
		expect(name).toBe('Daytona');
	});

	test('falls back to the tool name when session info is absent', () => {
		// resolveFilenameFormat returns FALLBACK_FORMAT ('iRacingScreenshotTool-
		// {counter}') when sessionInfo is null, so we still get a usable unique name.
		const name = buildUniqueScreenshotName({
			formatString: '{track}-{driver}-{counter}',
			sessionInfo: null,
			telemetry: null,
			exists: () => false,
		});
		expect(name).toBe('iRacingScreenshotTool-0');
	});
});

// ---------------------------------------------------------------------------
// resolveCropRect
// ---------------------------------------------------------------------------
describe('resolveCropRect', () => {
	const base = {
		sourceWidth: 1920,
		sourceHeight: 1080,
		targetWidth: 1900,
		targetHeight: 1060,
	};

	test('returns null when crop is off', () => {
		expect(
			resolveCropRect({ ...base, crop: false, cropTopLeft: false })
		).toBeNull();
	});

	test('returns null when there is no target size', () => {
		expect(
			resolveCropRect({
				sourceWidth: 1920,
				sourceHeight: 1080,
				targetWidth: null,
				targetHeight: null,
				crop: true,
				cropTopLeft: false,
			})
		).toBeNull();
	});

	test('top-left mode keeps the top-left target region', () => {
		expect(
			resolveCropRect({ ...base, crop: true, cropTopLeft: true })
		).toEqual({ left: 0, top: 0, width: 1900, height: 1060 });
	});

	test('centered mode trims the margin equally from all sides', () => {
		// (1920-1900)/2 = 10 ; (1080-1060)/2 = 10
		expect(
			resolveCropRect({ ...base, crop: true, cropTopLeft: false })
		).toEqual({ left: 10, top: 10, width: 1900, height: 1060 });
	});

	test('centered mode rounds odd margins', () => {
		// (1921-1900)/2 = 10.5 -> 11
		expect(
			resolveCropRect({
				sourceWidth: 1921,
				sourceHeight: 1081,
				targetWidth: 1900,
				targetHeight: 1060,
				crop: true,
				cropTopLeft: false,
			})
		).toEqual({ left: 11, top: 11, width: 1900, height: 1060 });
	});
});
