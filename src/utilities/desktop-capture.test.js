'use strict';

const {
  findSourceByWindowHandles,
  findSourceByWindowTitle,
  findSourceByKnownIracingTitle,
  findDisplaySourceByDisplayId,
  normalizeCaptureTarget,
  resolveDisplayCaptureRect
} = require('./desktop-capture');

describe('desktop capture helpers', () => {
  test('matches a window source by handle', () => {
    const sources = [
      { id: 'window:123:0', name: 'Other App' },
      { id: 'window:456:0', name: 'iRacing.com Simulator' }
    ];

    expect(findSourceByWindowHandles(sources, [999, '456'])).toEqual(sources[1]);
  });

  test('matches a window source by title fallback', () => {
    const sources = [
      { id: 'window:123:0', name: 'iRacing.com Simulator' },
      { id: 'window:456:0', name: 'Discord' }
    ];

    expect(findSourceByWindowTitle(sources, '  iRacing.com Simulator - Hosted Session  ')).toEqual(sources[0]);
  });

  test('matches a known iRacing title fallback', () => {
    const sources = [
      { id: 'window:123:0', name: 'iRacing Simulator' },
      { id: 'window:456:0', name: 'Discord' }
    ];

    expect(findSourceByKnownIracingTitle(sources)).toEqual(sources[0]);
  });

  test('matches a display source by display_id and falls back to a single source', () => {
    const sources = [
      { id: 'screen:0:0', display_id: '111' },
      { id: 'screen:1:0', display_id: '222' }
    ];

    expect(findDisplaySourceByDisplayId(sources, 222)).toEqual(sources[1]);
    expect(findDisplaySourceByDisplayId([{ id: 'screen:0:0', display_id: '' }], '')).toEqual({
      id: 'screen:0:0',
      display_id: ''
    });
  });

  test('normalizes capture targets from strings and objects', () => {
    expect(normalizeCaptureTarget('window:123:0')).toEqual({
      id: 'window:123:0',
      kind: 'window',
      captureBounds: null,
      displayBounds: null,
      diagnostics: null
    });

    expect(
      normalizeCaptureTarget({
        id: 'screen:1:0',
        kind: 'display',
        captureBounds: { x: 10, y: 20, width: 300, height: 200 },
        displayBounds: { x: 0, y: 0, width: 1920, height: 1080 },
        diagnostics: { matchStrategy: 'display-fallback' }
      })
    ).toEqual({
      id: 'screen:1:0',
      kind: 'display',
      captureBounds: { x: 10, y: 20, width: 300, height: 200 },
      displayBounds: { x: 0, y: 0, width: 1920, height: 1080 },
      diagnostics: { matchStrategy: 'display-fallback' }
    });
  });

  test('resolves a cropped display capture rect using the live video size', () => {
    const rect = resolveDisplayCaptureRect(3840, 2160, {
      id: 'screen:1:0',
      kind: 'display',
      captureBounds: { x: 100, y: 50, width: 1920, height: 1080 },
      displayBounds: { x: 0, y: 0, width: 2560, height: 1440 }
    });

    expect(rect).toEqual({
      x: 150,
      y: 75,
      width: 2880,
      height: 1620
    });
  });
});
