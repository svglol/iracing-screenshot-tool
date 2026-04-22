// Loose Electron-adjacent types: sources coming from desktopCapturer have a
// shape we read loosely (id, name, display_id); using `any`-friendly local
// types lets us consume them without importing Electron's full type surface.
interface CaptureBounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface DesktopCaptureSourceLike {
	id?: unknown;
	name?: unknown;
	display_id?: unknown;
	[key: string]: unknown;
}

interface NormalizedCaptureTarget {
	id: string;
	kind: 'window' | 'display';
	captureBounds: CaptureBounds | null;
	displayBounds: CaptureBounds | null;
	diagnostics: Record<string, unknown> | null;
}

const fallbackIracingTitles = ['iracing.com simulator', 'iracing simulator'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeWindowHandle(windowHandle: unknown): string {
	return String(windowHandle || '').trim();
}

export function normalizeWindowTitle(title: unknown): string {
	return String(title || '')
		.trim()
		.toLowerCase();
}

export function normalizeCaptureBounds(bounds: unknown): CaptureBounds | null {
	if (!bounds || typeof bounds !== 'object' || Array.isArray(bounds)) {
		return null;
	}

	const b = bounds as Record<string, unknown>;
	const x = Number(b.x);
	const y = Number(b.y);
	const width = Number(b.width);
	const height = Number(b.height);

	if (
		![x, y, width, height].every(Number.isFinite) ||
		width <= 0 ||
		height <= 0
	) {
		return null;
	}

	return { x, y, width, height };
}

export function normalizeCaptureTarget(
	captureTarget: unknown
): NormalizedCaptureTarget {
	if (typeof captureTarget === 'string') {
		return {
			id: captureTarget.trim(),
			kind: 'window',
			captureBounds: null,
			displayBounds: null,
			diagnostics: null,
		};
	}

	if (!isPlainObject(captureTarget)) {
		return {
			id: '',
			kind: 'window',
			captureBounds: null,
			displayBounds: null,
			diagnostics: null,
		};
	}

	return {
		id: String(captureTarget.id || captureTarget.sourceId || '').trim(),
		kind: captureTarget.kind === 'display' ? 'display' : 'window',
		captureBounds: normalizeCaptureBounds(captureTarget.captureBounds),
		displayBounds: normalizeCaptureBounds(captureTarget.displayBounds),
		diagnostics: isPlainObject(captureTarget.diagnostics)
			? captureTarget.diagnostics
			: null,
	};
}

export function isExternalWindowSource(
	source: DesktopCaptureSourceLike = {}
): boolean {
	return (
		typeof source.id === 'string' &&
		source.id.startsWith('window:') &&
		source.id.endsWith(':0')
	);
}

export function findSourceByWindowHandles(
	sources: DesktopCaptureSourceLike[] = [],
	handles: unknown[] = []
): DesktopCaptureSourceLike | null {
	const candidates = [
		...new Set(handles.map(normalizeWindowHandle).filter(Boolean)),
	];
	if (candidates.length === 0) {
		return null;
	}

	return (
		sources.find((source) =>
			candidates.some((handle) =>
				String(source.id || '').startsWith(`window:${handle}:`)
			)
		) || null
	);
}

export function findSourceByWindowTitle(
	sources: DesktopCaptureSourceLike[] = [],
	title: unknown = ''
): DesktopCaptureSourceLike | null {
	const normalizedTitle = normalizeWindowTitle(title);
	if (!normalizedTitle) {
		return null;
	}

	const externalSources = sources.filter(isExternalWindowSource);

	return (
		externalSources.find(
			(source) => normalizeWindowTitle(source.name) === normalizedTitle
		) ||
		externalSources.find((source) => {
			const sourceTitle = normalizeWindowTitle(source.name);
			return (
				sourceTitle &&
				(normalizedTitle.includes(sourceTitle) ||
					sourceTitle.includes(normalizedTitle))
			);
		}) ||
		null
	);
}

export function findSourceByKnownIracingTitle(
	sources: DesktopCaptureSourceLike[] = []
): DesktopCaptureSourceLike | null {
	const externalSources = sources.filter(isExternalWindowSource);

	return (
		externalSources.find((source) => {
			const sourceTitle = normalizeWindowTitle(source.name);
			return fallbackIracingTitles.some((title) =>
				sourceTitle.includes(title)
			);
		}) || null
	);
}

export function findDisplaySourceByDisplayId(
	sources: DesktopCaptureSourceLike[] = [],
	displayId: unknown
): DesktopCaptureSourceLike | null {
	const normalizedDisplayId = String(displayId || '').trim();
	if (!normalizedDisplayId) {
		return sources.length === 1 ? sources[0] : null;
	}

	return (
		sources.find(
			(source) =>
				String(source.display_id || '').trim() === normalizedDisplayId
		) || (sources.length === 1 ? sources[0] : null)
	);
}

function clampCaptureRect(
	rect: unknown,
	maxWidth: number,
	maxHeight: number
): CaptureBounds | null {
	const normalizedRect = normalizeCaptureBounds(rect);
	if (
		!normalizedRect ||
		!Number.isFinite(maxWidth) ||
		!Number.isFinite(maxHeight) ||
		maxWidth < 1 ||
		maxHeight < 1
	) {
		return null;
	}

	const x = Math.min(Math.max(0, Math.round(normalizedRect.x)), maxWidth - 1);
	const y = Math.min(Math.max(0, Math.round(normalizedRect.y)), maxHeight - 1);
	const width = Math.min(
		Math.max(1, Math.round(normalizedRect.width)),
		maxWidth - x
	);
	const height = Math.min(
		Math.max(1, Math.round(normalizedRect.height)),
		maxHeight - y
	);

	return { x, y, width, height };
}

export function resolveDisplayCaptureRect(
	videoWidth: number,
	videoHeight: number,
	captureTarget: unknown
): CaptureBounds {
	const fullRect: CaptureBounds = {
		x: 0,
		y: 0,
		width: videoWidth,
		height: videoHeight,
	};
	const normalizedTarget = normalizeCaptureTarget(captureTarget);

	if (
		normalizedTarget.kind !== 'display' ||
		!normalizedTarget.captureBounds ||
		!normalizedTarget.displayBounds ||
		normalizedTarget.displayBounds.width <= 0 ||
		normalizedTarget.displayBounds.height <= 0
	) {
		return fullRect;
	}

	const scaleX = videoWidth / normalizedTarget.displayBounds.width;
	const scaleY = videoHeight / normalizedTarget.displayBounds.height;

	return (
		clampCaptureRect(
			{
				x:
					(normalizedTarget.captureBounds.x -
						normalizedTarget.displayBounds.x) *
					scaleX,
				y:
					(normalizedTarget.captureBounds.y -
						normalizedTarget.displayBounds.y) *
					scaleY,
				width: normalizedTarget.captureBounds.width * scaleX,
				height: normalizedTarget.captureBounds.height * scaleY,
			},
			videoWidth,
			videoHeight
		) || fullRect
	);
}
