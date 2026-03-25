'use strict';

const {
  sanitizeFilePart,
  buildTrackFilePart,
  buildScreenshotFileKey
} = require('./screenshot-name');

describe('screenshot naming helpers', () => {
  test('sanitizes invalid filename characters', () => {
    expect(sanitizeFilePart('Spa: Francorchamps*', 'Track')).toBe('Spa Francorchamps');
    expect(sanitizeFilePart('', 'Track')).toBe('Track');
  });

  test('prefers full track name plus layout when both are available', () => {
    expect(
      buildTrackFilePart({
        TrackDisplayName: 'Virginia International Raceway',
        TrackConfigName: 'Full Course',
        TrackDisplayShortName: 'VIR Full'
      })
    ).toBe('Virginia International Raceway - Full Course');
  });

  test('avoids repeating layout information that is already part of the display name', () => {
    expect(
      buildTrackFilePart({
        TrackDisplayName: 'Okayama International Circuit - Short',
        TrackConfigName: 'Short',
        TrackDisplayShortName: 'Okayama Short'
      })
    ).toBe('Okayama International Circuit - Short');
  });

  test('falls back through available track fields', () => {
    expect(
      buildTrackFilePart({
        TrackName: 'Circuit de Spa-Francorchamps',
        TrackConfigName: 'Grand Prix'
      })
    ).toBe('Circuit de Spa-Francorchamps - Grand Prix');

    expect(
      buildTrackFilePart({
        TrackDisplayShortName: 'Monza Road'
      })
    ).toBe('Monza Road');
  });

  test('builds the full screenshot key with driver and count', () => {
    expect(
      buildScreenshotFileKey({
        weekendInfo: {
          TrackDisplayName: 'Circuit de Spa-Francorchamps',
          TrackConfigName: 'Grand Prix'
        },
        driverName: 'Max Verstappen',
        count: 2
      })
    ).toBe('Circuit de Spa-Francorchamps - Grand Prix-Max Verstappen-2');
  });
});
