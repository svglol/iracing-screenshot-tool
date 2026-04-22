export function sanitizeFilePart(value: unknown, fallback = ''): string {
	const sanitized = String(value || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
		.replace(/\s*-\s*/g, '-')
		.trim();

	return (sanitized ? sanitized.replace(/\s+/g, '_') : '') || fallback;
}

function normalizeTrackPart(value: unknown): string {
	return sanitizeFilePart(value, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

function firstNonEmpty(values: unknown[] = []): string {
	return (values.find((value) => String(value || '').trim()) as string) || '';
}

function addTrackPart(parts: string[], value: unknown): void {
	const part = sanitizeFilePart(value, '');
	const normalizedPart = normalizeTrackPart(part);

	if (!normalizedPart) {
		return;
	}

	const isDuplicate = parts.some((existingPart) => {
		const normalizedExistingPart = normalizeTrackPart(existingPart);
		return (
			normalizedExistingPart === normalizedPart ||
			normalizedExistingPart.includes(normalizedPart) ||
			normalizedPart.includes(normalizedExistingPart)
		);
	});

	if (!isDuplicate) {
		parts.push(part);
	}
}

export function buildTrackFilePart(
	weekendInfo: Record<string, unknown> = {}
): string {
	const parts: string[] = [];
	const primaryTrackName = firstNonEmpty([
		weekendInfo.TrackDisplayName,
		weekendInfo.TrackName,
		weekendInfo.TrackDisplayShortName,
	]);

	addTrackPart(parts, primaryTrackName);
	addTrackPart(parts, weekendInfo.TrackConfigName);

	return parts.join('-') || 'Track';
}

export function buildScreenshotFileKey({
	weekendInfo = {},
	driverName = 'Driver',
	count = 0,
}: {
	weekendInfo?: Record<string, unknown>;
	driverName?: unknown;
	count?: number;
} = {}): string {
	const trackName = buildTrackFilePart(weekendInfo);
	const safeDriverName = sanitizeFilePart(driverName, 'Driver');

	return `${trackName}-${safeDriverName}-${count}`;
}
