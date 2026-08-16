// The curated vocabulary of the iRacing config-editor page.
//
// Every setting the page can edit is described here — section, key, type,
// bounds — and NOTHING outside this list is ever written. Together with the
// span-replacing writer in ini-document.ts (which cannot create keys), that
// makes the editable surface a closed set: a bug in the page can mistype a
// curated value, but it cannot invent settings or touch uncurated ones.
//
// i18n keys derive mechanically from the descriptor (`labelKey`), so adding a
// setting is one entry here plus its strings in the locale catalogues.
//
// Numeric bounds on the [Display] keys are deliberately generous sanity rails
// (a 20 000 px window is silly but harmless), not iRacing's real limits, which
// are undocumented. The [Graphics Options] enums and rails are the real ones:
// transcribed 2026-08-15 from a live install's inline comment trailers and
// cross-checked against the in-sim settings screen. The [Display] enums
// iRacing does not document stay plain numeric inputs (see the design doc).

export type SettingTab = 'monitor' | 'graphics';
export type SettingType = 'bool' | 'int' | 'float' | 'enum';
export type SettingSection = 'Display' | 'Graphics Options';
export type SettingUnit = 'mm' | 'deg' | 'px' | 'pct' | 'fps' | 'MB' | 'hz';

export interface SettingEnumValue {
	value: string;
	/** Full i18n key, usually from the shared `iniEditor.levels.*` vocabulary. */
	labelKey: string;
}

export interface SettingDescriptor {
	section: SettingSection;
	/** Exact key casing as iRacing writes it. */
	key: string;
	type: SettingType;
	tab: SettingTab;
	/** Grouping id; label at `iniEditor.groups.<group>`. */
	group: string;
	min?: number;
	max?: number;
	step?: number;
	unit?: SettingUnit;
	enumValues?: SettingEnumValue[];
	/** Also mirror edits into [Replay Graphics] (graphics tab only). */
	pairedReplay?: boolean;
	/** A `.help` string exists next to the `.label`. */
	hasHelp?: boolean;
}

const SECTION_SLUGS: Record<SettingSection, string> = {
	Display: 'display',
	'Graphics Options': 'graphics',
};

function bool(
	section: SettingSection,
	key: string,
	group: string,
	extra: Partial<SettingDescriptor> = {}
): SettingDescriptor {
	return { section, key, type: 'bool', tab: 'monitor', group, ...extra };
}

function int(
	section: SettingSection,
	key: string,
	group: string,
	extra: Partial<SettingDescriptor> = {}
): SettingDescriptor {
	return { section, key, type: 'int', tab: 'monitor', group, ...extra };
}

function float(
	section: SettingSection,
	key: string,
	group: string,
	extra: Partial<SettingDescriptor> = {}
): SettingDescriptor {
	return { section, key, type: 'float', tab: 'monitor', group, ...extra };
}

/**
 * Enum options for the consecutive values 0..n-1: one label name per value, in
 * value order, resolved under `iniEditor.<prefix>.<name>`. Enums whose values
 * are not consecutive from 0 (MSAASamples) list their options longhand.
 */
function enumOf(prefix: string, ...names: string[]): SettingEnumValue[] {
	return names.map((name, index) => ({
		value: String(index),
		labelKey: `iniEditor.${prefix}.${name}`,
	}));
}

/**
 * The v1 curated set: the full Monitor/Display surface.
 * The Graphics-tab descriptors land with the v1.1 milestone.
 */
export const SETTINGS: SettingDescriptor[] = [
	// --- [Display] window placement -----------------------------------------
	bool('Display', 'border', 'window'),
	int('Display', 'windowedXPos', 'window', {
		min: -20000,
		max: 20000,
		unit: 'px',
	}),
	int('Display', 'windowedYPos', 'window', {
		min: -20000,
		max: 20000,
		unit: 'px',
	}),
	int('Display', 'windowedWidth', 'window', {
		min: 640,
		max: 30000,
		unit: 'px',
	}),
	int('Display', 'windowedHeight', 'window', {
		min: 480,
		max: 30000,
		unit: 'px',
	}),
	bool('Display', 'windowedMaximized', 'window'),
	int('Display', 'windowedAlignment', 'window', { hasHelp: true }),

	// --- [Display] fullscreen -----------------------------------------------
	bool('Display', 'fullScreen', 'fullscreen'),
	int('Display', 'fullScreenWidth', 'fullscreen', {
		min: 640,
		max: 30000,
		unit: 'px',
	}),
	int('Display', 'fullScreenHeight', 'fullscreen', {
		min: 480,
		max: 30000,
		unit: 'px',
	}),
	int('Display', 'fullScreenDepth', 'fullscreen', { hasHelp: true }),
	float('Display', 'RefreshRate', 'fullscreen', {
		min: 0,
		max: 1000,
		step: 1,
		unit: 'hz',
		hasHelp: true,
	}),

	// The "Advanced display" group (deviceIdx, displayRotateMode, pixelRatio,
	// pixelRatioWindowed, ModeScaling, HDRFormat) was removed by user decision
	// 2026-08-15 — expert-only knobs iRacing manages itself.

	// [MonitorSetup] is deliberately NOT curated: its geometry (screen sizes,
	// viewing distance, angles) is what iRacing's own auto-configuration and
	// the in-sim graphics wizard manage, and the section was removed from this
	// page by user decision 2026-08-15.

	// --- [Graphics Options] ---------------------------------------------------
	// `pairedReplay: true` marks keys that ALSO exist in [Replay Graphics] (per
	// a real renderer ini): with the pair switch on, a save mirrors the value
	// there — guarded by the key actually being present in the file, so files
	// missing a replay twin still save cleanly. Every enum's value meanings are
	// the ini's own comment trailers; labels prefer the in-sim screen's wording
	// where the two differ.

	// Quality & detail
	{
		section: 'Graphics Options',
		key: 'ShaderQuality',
		type: 'enum',
		tab: 'graphics',
		group: 'quality',
		enumValues: enumOf('levels', 'low', 'medium', 'high', 'max'),
	},
	{
		// 0=fewer shadows, 1=maximum shadows — a two-value choice, not a tier.
		section: 'Graphics Options',
		key: 'ShadowDetail',
		type: 'enum',
		tab: 'graphics',
		group: 'quality',
		pairedReplay: true,
		enumValues: enumOf('shadowDetail', 'fewer', 'maximum'),
	},
	{
		// The in-sim "Dynamic Objects" (Shadows and Lighting). The trailer only
		// documents 0/1; the settings screen exposes the third state.
		section: 'Graphics Options',
		key: 'DynamicShadowMaps',
		type: 'enum',
		tab: 'graphics',
		group: 'quality',
		pairedReplay: true,
		hasHelp: true,
		enumValues: enumOf(
			'dynamicShadowMaps',
			'off',
			'mainView',
			'mainViewMirrors'
		),
	},
	{
		// The in-sim "Shadowmap Filter" (Shadows and Lighting). The trailer
		// calls 1 "Fetch4"; the settings screen words it "Simple".
		section: 'Graphics Options',
		key: 'DNSMFilter',
		type: 'enum',
		tab: 'graphics',
		group: 'quality',
		pairedReplay: true,
		hasHelp: true,
		enumValues: enumOf(
			'dnsmFilter',
			'off',
			'simple',
			'pcf4',
			'pcf4p',
			'pcf8p',
			'pcf16p'
		),
	},
	{
		section: 'Graphics Options',
		key: 'CarDetail',
		type: 'enum',
		tab: 'graphics',
		group: 'quality',
		pairedReplay: true,
		enumValues: enumOf('levels', 'low', 'medium', 'high'),
	},
	{
		section: 'Graphics Options',
		key: 'PitObjectDetail',
		type: 'enum',
		tab: 'graphics',
		group: 'quality',
		pairedReplay: true,
		enumValues: enumOf('levels', 'off', 'low', 'medium', 'high'),
	},
	{
		section: 'Graphics Options',
		key: 'CrowdDetail',
		type: 'enum',
		tab: 'graphics',
		group: 'quality',
		pairedReplay: true,
		enumValues: enumOf('levels', 'off', 'low', 'medium', 'high'),
	},
	{
		section: 'Graphics Options',
		key: 'GrandstandDetail',
		type: 'enum',
		tab: 'graphics',
		group: 'quality',
		pairedReplay: true,
		enumValues: enumOf('levels', 'low', 'medium', 'high'),
	},
	{
		section: 'Graphics Options',
		key: 'ObjectDetail',
		type: 'enum',
		tab: 'graphics',
		group: 'quality',
		pairedReplay: true,
		enumValues: enumOf('levels', 'low', 'medium', 'high'),
	},
	{
		section: 'Graphics Options',
		key: 'FoliageDetail',
		type: 'enum',
		tab: 'graphics',
		group: 'quality',
		pairedReplay: true,
		enumValues: enumOf('levels', 'off', 'low', 'medium', 'high'),
	},
	{
		section: 'Graphics Options',
		key: 'ParticleDetail',
		type: 'enum',
		tab: 'graphics',
		group: 'quality',
		pairedReplay: true,
		enumValues: enumOf('levels', 'low', 'medium', 'high'),
	},
	bool('Graphics Options', 'ParticlesFullRes', 'quality', {
		tab: 'graphics',
		pairedReplay: true,
	}),
	// 0=low detail, 1=high detail — the in-sim screen's "Higher Detail in
	// Mirrors" toggle.
	bool('Graphics Options', 'MirrorDetail', 'quality', {
		tab: 'graphics',
		pairedReplay: true,
	}),
	int('Graphics Options', 'MaxCockpitMirrors', 'quality', {
		tab: 'graphics',
		min: 0,
		max: 4,
		pairedReplay: true,
	}),

	// Anti-aliasing & sharpening
	{
		section: 'Graphics Options',
		key: 'AntiAliasMethod',
		type: 'enum',
		tab: 'graphics',
		group: 'aa',
		enumValues: enumOf('aaMethod', 'none', 'msaa', 'fxaa', 'smaa'),
	},
	{
		section: 'Graphics Options',
		key: 'MSAASamples',
		type: 'enum',
		tab: 'graphics',
		group: 'aa',
		enumValues: [
			{ value: '2', labelKey: 'iniEditor.msaaSamples.x2' },
			{ value: '4', labelKey: 'iniEditor.msaaSamples.x4' },
			{ value: '8', labelKey: 'iniEditor.msaaSamples.x8' },
		],
	},
	{
		section: 'Graphics Options',
		key: 'MSAAUseFilter',
		type: 'enum',
		tab: 'graphics',
		group: 'aa',
		enumValues: enumOf('msaaFilter', 'soft', 'neutral', 'sharp', 'simple'),
	},
	bool('Graphics Options', 'Sharpening', 'aa', {
		tab: 'graphics',
		pairedReplay: true,
	}),
	int('Graphics Options', 'SharpeningAmount', 'aa', {
		tab: 'graphics',
		min: 10,
		max: 300,
		pairedReplay: true,
		hasHelp: true,
	}),
	int('Graphics Options', 'FSRSharpness', 'aa', {
		tab: 'graphics',
		min: 0,
		max: 100,
		hasHelp: true,
	}),

	// Post-processing
	bool('Graphics Options', 'AutoExposure', 'post', {
		tab: 'graphics',
		pairedReplay: true,
		hasHelp: true,
	}),
	bool('Graphics Options', 'SSAO', 'post', {
		tab: 'graphics',
		pairedReplay: true,
	}),
	{
		// 0=off, 1=lower res, 2=full res; the in-sim screen words 2 as "High".
		section: 'Graphics Options',
		key: 'SSRLevel',
		type: 'enum',
		tab: 'graphics',
		group: 'post',
		pairedReplay: true,
		hasHelp: true,
		enumValues: enumOf('levels', 'off', 'low', 'high'),
	},
	// The second half of the sim's 5-option "Screen Space Reflections"
	// dropdown: its "Low Rain"/"High Rain" entries are SSRLevel 1/2 with this
	// flag set.
	bool('Graphics Options', 'SSRRainOnly', 'post', {
		tab: 'graphics',
		pairedReplay: true,
		hasHelp: true,
	}),
	bool('Graphics Options', 'HeatHaze', 'post', {
		tab: 'graphics',
		pairedReplay: true,
	}),
	bool('Graphics Options', 'DepthOfField', 'post', {
		tab: 'graphics',
		pairedReplay: true,
	}),
	{
		section: 'Graphics Options',
		key: 'MotionBlurStrength',
		type: 'enum',
		tab: 'graphics',
		group: 'post',
		pairedReplay: true,
		enumValues: enumOf('levels', 'off', 'low', 'medium', 'high', 'ultra'),
	},
	bool('Graphics Options', 'Distortion', 'post', {
		tab: 'graphics',
		pairedReplay: true,
	}),
	bool('Graphics Options', 'EnableHDR', 'post', { tab: 'graphics' }),

	// Performance
	bool('Graphics Options', 'LimitFrameRate', 'perf', { tab: 'graphics' }),
	int('Graphics Options', 'DesiredFPSLimit', 'perf', {
		tab: 'graphics',
		min: 30,
		max: 1000,
		unit: 'fps',
	}),
	bool('Graphics Options', 'VerticalSync', 'perf', { tab: 'graphics' }),
	{
		section: 'Graphics Options',
		key: 'NvReflexMode',
		type: 'enum',
		tab: 'graphics',
		group: 'perf',
		enumValues: enumOf('nvReflex', 'off', 'on', 'onBoost'),
	},
	int('Graphics Options', 'MaxPreRenderedFrames', 'perf', {
		tab: 'graphics',
		min: 0,
		max: 4,
		hasHelp: true,
	}),
	int('Graphics Options', 'SysMemToUseMB', 'perf', {
		tab: 'graphics',
		min: 1024,
		max: 32768,
		unit: 'MB',
	}),
	int('Graphics Options', 'VidMemToUseMB', 'perf', {
		tab: 'graphics',
		min: 256,
		max: 131072,
		unit: 'MB',
	}),
	int('Graphics Options', 'MaxCarsToDraw', 'perf', {
		tab: 'graphics',
		min: 10,
		max: 64,
		pairedReplay: true,
	}),
	int('Graphics Options', 'MaxCarsToDrawInMirrors', 'perf', {
		tab: 'graphics',
		min: 4,
		max: 64,
		pairedReplay: true,
	}),

	// Misc
	bool('Graphics Options', 'VirtualMirrors', 'misc', {
		tab: 'graphics',
		pairedReplay: true,
	}),
	int('Graphics Options', 'UIScale', 'misc', {
		tab: 'graphics',
		min: 50,
		max: 200,
		unit: 'pct',
	}),
	bool('Graphics Options', 'EnableTireMarks', 'misc', { tab: 'graphics' }),
	{
		section: 'Graphics Options',
		key: 'HideCockpitObstructions',
		type: 'enum',
		tab: 'graphics',
		group: 'misc',
		pairedReplay: true,
		enumValues: enumOf(
			'hideObstructions',
			'none',
			'halo',
			'pillarRollcage',
			'everything'
		),
	},
	{
		section: 'Graphics Options',
		key: 'HeadlightLevel',
		type: 'enum',
		tab: 'graphics',
		group: 'misc',
		enumValues: enumOf('levels', 'low', 'medium', 'high'),
	},
];

/** Stable id used by the edit buffer and IPC payloads: 'Display/windowedWidth'. */
export function settingId(d: SettingDescriptor): string {
	return `${d.section}/${d.key}`;
}

export function labelKey(d: SettingDescriptor): string {
	return `iniEditor.settings.${SECTION_SLUGS[d.section]}.${d.key}.label`;
}

export function helpKey(d: SettingDescriptor): string {
	return `iniEditor.settings.${SECTION_SLUGS[d.section]}.${d.key}.help`;
}

export function findSetting(id: string): SettingDescriptor | undefined {
	return SETTINGS.find((d) => settingId(d) === id);
}

const INT_RE = /^-?\d+$/;
const FLOAT_RE = /^-?\d+(\.\d+)?$/;

/**
 * Whether `raw` is a legal value to WRITE for this setting. Values read from
 * disk are displayed regardless (iRacing formats numbers its own way, e.g.
 * `1.000000`); this gate applies to what the page is about to save.
 */
export function validateValue(d: SettingDescriptor, raw: string): boolean {
	const value = String(raw ?? '').trim();
	switch (d.type) {
		case 'bool':
			return value === '0' || value === '1';
		case 'enum':
			return (d.enumValues || []).some((option) => option.value === value);
		case 'int':
			if (!INT_RE.test(value)) {
				return false;
			}
			break;
		case 'float':
			if (!FLOAT_RE.test(value)) {
				return false;
			}
			break;
	}
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return false;
	}
	if (d.min !== undefined && parsed < d.min) {
		return false;
	}
	if (d.max !== undefined && parsed > d.max) {
		return false;
	}
	return true;
}
