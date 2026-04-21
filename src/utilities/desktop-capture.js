'use strict';

const fallbackIracingTitles = ['iracing.com simulator', 'iracing simulator'];

function isPlainObject(value) {
	return value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeWindowHandle(windowHandle) {
	return String(windowHandle || '').trim();
}

function normalizeWindowTitle(title) {
	return String(title || '')
		.trim()
		.toLowerCase();
}

function normalizeCaptureBounds(bounds) {
	if (!bounds || typeof bounds !== 'object' || Array.isArray(bounds)) {
		return null;
	}

	const x = Number(bounds.x);
	const y = Number(bounds.y);
	const width = Number(bounds.width);
	const height = Number(bounds.height);

	if (
		![x, y, width, height].every(Number.isFinite) ||
		width <= 0 ||
		height <= 0
	) {
		return null;
	}

	return { x, y, width, height };
}

function normalizeCaptureTarget(captureTarget) {
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

function isExternalWindowSource(source = {}) {
	return (
		typeof source.id === 'string' &&
		source.id.startsWith('window:') &&
		source.id.endsWith(':0')
	);
}

function findSourceByWindowHandles(sources = [], handles = []) {
	const candidates = [
		...new Set(handles.map(normalizeWindowHandle).filter(Boolean)),
	];
	if (candidates.length === 0) {
		return null;
	}

	return (
		sources.find((source) =>
			candidates.some((handle) => source.id.startsWith(`window:${handle}:`))
		) || null
	);
}

function findSourceByWindowTitle(sources = [], title = '') {
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

function findSourceByKnownIracingTitle(sources = []) {
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

function findDisplaySourceByDisplayId(sources = [], displayId) {
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

function clampCaptureRect(rect, maxWidth, maxHeight) {
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

function resolveDisplayCaptureRect(videoWidth, videoHeight, captureTarget) {
	const fullRect = { x: 0, y: 0, width: videoWidth, height: videoHeight };
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

module.exports = {
	normalizeWindowHandle,
	normalizeWindowTitle,
	normalizeCaptureBounds,
	normalizeCaptureTarget,
	isExternalWindowSource,
	findSourceByWindowHandles,
	findSourceByWindowTitle,
	findSourceByKnownIracingTitle,
	findDisplaySourceByDisplayId,
	resolveDisplayCaptureRect,
};
