'use strict';

function sanitizeFilePart(value, fallback = '') {
  const sanitized = String(value || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s*-\s*/g, '-')
    .trim();

  return (sanitized ? sanitized.replace(/\s+/g, '_') : '') || fallback;
}

function normalizeTrackPart(value) {
  return sanitizeFilePart(value, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function firstNonEmpty(values = []) {
  return values.find((value) => String(value || '').trim()) || '';
}

function addTrackPart(parts, value) {
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

function buildTrackFilePart(weekendInfo = {}) {
  const parts = [];
  const primaryTrackName = firstNonEmpty([
    weekendInfo.TrackDisplayName,
    weekendInfo.TrackName,
    weekendInfo.TrackDisplayShortName
  ]);

  addTrackPart(parts, primaryTrackName);
  addTrackPart(parts, weekendInfo.TrackConfigName);

  return parts.join('-') || 'Track';
}

function buildScreenshotFileKey({ weekendInfo = {}, driverName = 'Driver', count = 0 } = {}) {
  const trackName = buildTrackFilePart(weekendInfo);
  const safeDriverName = sanitizeFilePart(driverName, 'Driver');

  return `${trackName}-${safeDriverName}-${count}`;
}

module.exports = {
  sanitizeFilePart,
  buildTrackFilePart,
  buildScreenshotFileKey
};
