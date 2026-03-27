'use strict';

const {
  sanitizeFilePart,
  buildTrackFilePart,
  buildScreenshotFileKey
} = require('./screenshot-name');

describe('screenshot naming helpers', () => {
  test('sanitizes invalid filename characters', () => {
    expect(sanitizeFilePart('Spa: Francorchamps*', 'Track')).toBe('Spa_Francorchamps');
    expect(sanitizeFilePart('Okayama International Circuit - Short', 'Track')).toBe('Okayama_International_Circuit-Short');
    expect(sanitizeFilePart('', 'Track')).toBe('Track');
  });

  test('prefers full track name plus layout when both are available', () => {
    expect(
      buildTrackFilePart({
        TrackDisplayName: 'Virginia International Raceway',
        TrackConfigName: 'Full Course',
        TrackDisplayShortName: 'VIR Full'
      })
    ).toBe('Virginia_International_Raceway-Full_Course');
  });

  test('avoids repeating layout information that is already part of the display name', () => {
    expect(
      buildTrackFilePart({
        TrackDisplayName: 'Okayama International Circuit - Short',
        TrackConfigName: 'Short',
        TrackDisplayShortName: 'Okayama Short'
      })
    ).toBe('Okayama_International_Circuit-Short');
  });

  test('falls back through available track fields', () => {
    expect(
      buildTrackFilePart({
        TrackName: 'Circuit de Spa-Francorchamps',
        TrackConfigName: 'Grand Prix'
      })
    ).toBe('Circuit_de_Spa-Francorchamps-Grand_Prix');

    expect(
      buildTrackFilePart({
        TrackDisplayShortName: 'Monza Road'
      })
    ).toBe('Monza_Road');
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
    ).toBe('Circuit_de_Spa-Francorchamps-Grand_Prix-Max_Verstappen-2');
  });
});
