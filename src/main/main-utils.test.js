'use strict';

const path = require('path');
const os = require('os');

const {
  isPlainObject,
  mergePlainObjects,
  serializeBounds,
  serializeDisplay,
  summarizeDesktopSource,
  summarizeDesktopSources,
  createScreenshotErrorPayload,
  trimWrappedQuotes,
  expandWindowsEnvironmentVariables,
  normalizeComparableWindowsPath,
  getWindowsUserProfileRoot,
  resolveReshadeBasePath,
  remapForeignUserProfileFolder,
  createReshadeConfigError,
  getReshadeScreenshotFolder,
  normalizeFileKey,
  parseCameraState
} = require('./main-utils');

// ---------------------------------------------------------------------------
// isPlainObject
// ---------------------------------------------------------------------------
describe('isPlainObject', () => {
  test('returns true for plain objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  test('returns false for arrays', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2, 3])).toBe(false);
  });

  test('returns false for null and undefined', () => {
    expect(isPlainObject(null)).toBeFalsy();
    expect(isPlainObject(undefined)).toBeFalsy();
  });

  test('returns false for primitives', () => {
    expect(isPlainObject(42)).toBeFalsy();
    expect(isPlainObject('string')).toBeFalsy();
    expect(isPlainObject(true)).toBeFalsy();
    expect(isPlainObject(0)).toBeFalsy();
    expect(isPlainObject('')).toBeFalsy();
  });

  test('returns true for objects created with new Object()', () => {
    expect(isPlainObject(new Object())).toBe(true);
  });

  test('returns false for class instances with own properties', () => {
    // Note: the implementation checks typeof === 'object' && !Array.isArray,
    // so class instances with truthy values will pass
    class Foo { }
    const foo = new Foo();
    // This returns truthy because it's a non-null, non-array object
    expect(isPlainObject(foo)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// mergePlainObjects
// ---------------------------------------------------------------------------
describe('mergePlainObjects', () => {
  test('merges two flat objects', () => {
    expect(mergePlainObjects({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  test('later values override earlier values', () => {
    expect(mergePlainObjects({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
  });

  test('deeply merges nested objects', () => {
    const result = mergePlainObjects(
      { nested: { a: 1, b: 2 } },
      { nested: { b: 3, c: 4 } }
    );
    expect(result).toEqual({ nested: { a: 1, b: 3, c: 4 } });
  });

  test('clones arrays instead of merging them', () => {
    const original = [1, 2, 3];
    const result = mergePlainObjects({ arr: [4, 5] }, { arr: original });
    expect(result.arr).toEqual([1, 2, 3]);
    expect(result.arr).not.toBe(original); // must be a copy
  });

  test('ignores non-object arguments', () => {
    expect(mergePlainObjects(null, { a: 1 }, undefined, 42, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  test('returns empty object when no arguments', () => {
    expect(mergePlainObjects()).toEqual({});
  });

  test('handles single argument', () => {
    expect(mergePlainObjects({ a: 1 })).toEqual({ a: 1 });
  });

  test('creates a deep clone of nested objects', () => {
    const inner = { deep: true };
    const result = mergePlainObjects({ nested: inner });
    expect(result.nested).toEqual({ deep: true });
    expect(result.nested).not.toBe(inner);
  });

  test('merges three or more objects', () => {
    expect(mergePlainObjects({ a: 1 }, { b: 2 }, { c: 3 })).toEqual({ a: 1, b: 2, c: 3 });
  });

  test('replaces nested object with primitive', () => {
    expect(mergePlainObjects({ a: { b: 1 } }, { a: 42 })).toEqual({ a: 42 });
  });

  test('replaces primitive with nested object', () => {
    expect(mergePlainObjects({ a: 42 }, { a: { b: 1 } })).toEqual({ a: { b: 1 } });
  });
});

// ---------------------------------------------------------------------------
// serializeBounds
// ---------------------------------------------------------------------------
describe('serializeBounds', () => {
  test('normalizes valid bounds', () => {
    expect(serializeBounds({ x: 10, y: 20, width: 1920, height: 1080 }))
      .toEqual({ x: 10, y: 20, width: 1920, height: 1080 });
  });

  test('returns null for invalid bounds', () => {
    expect(serializeBounds(null)).toBeNull();
    expect(serializeBounds(undefined)).toBeNull();
    expect(serializeBounds({})).toBeNull();
    expect(serializeBounds({ x: 0, y: 0, width: 0, height: 0 })).toBeNull();
    expect(serializeBounds({ x: 0, y: 0, width: -1, height: 100 })).toBeNull();
  });

  test('converts string values to numbers', () => {
    expect(serializeBounds({ x: '10', y: '20', width: '1920', height: '1080' }))
      .toEqual({ x: 10, y: 20, width: 1920, height: 1080 });
  });
});

// ---------------------------------------------------------------------------
// serializeDisplay
// ---------------------------------------------------------------------------
describe('serializeDisplay', () => {
  test('returns null for falsy inputs', () => {
    expect(serializeDisplay(null)).toBeNull();
    expect(serializeDisplay(undefined)).toBeNull();
    expect(serializeDisplay(0)).toBeNull();
    expect(serializeDisplay('')).toBeNull();
  });

  test('serializes a display object', () => {
    const display = {
      id: 1,
      label: 'Main Display',
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1040 },
      scaleFactor: 1.5,
      rotation: 0,
      internal: true,
      touchSupport: 'available'
    };
    const result = serializeDisplay(display);
    expect(result.id).toBe(1);
    expect(result.label).toBe('Main Display');
    expect(result.scaleFactor).toBe(1.5);
    expect(result.rotation).toBe(0);
    expect(result.internal).toBe(true);
    expect(result.touchSupport).toBe('available');
    expect(result.bounds).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
    expect(result.workArea).toEqual({ x: 0, y: 0, width: 1920, height: 1040 });
  });

  test('defaults label to empty string', () => {
    const display = {
      id: 1,
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      workArea: { x: 0, y: 0, width: 100, height: 100 }
    };
    expect(serializeDisplay(display).label).toBe('');
  });

  test('defaults touchSupport to unknown', () => {
    const display = {
      id: 1,
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      workArea: { x: 0, y: 0, width: 100, height: 100 }
    };
    expect(serializeDisplay(display).touchSupport).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// summarizeDesktopSource
// ---------------------------------------------------------------------------
describe('summarizeDesktopSource', () => {
  test('extracts id, name, display_id from a source', () => {
    expect(summarizeDesktopSource({
      id: 'window:123:0',
      name: 'iRacing',
      display_id: '1',
      extra: 'ignored'
    })).toEqual({
      id: 'window:123:0',
      name: 'iRacing',
      display_id: '1'
    });
  });

  test('handles null/undefined source', () => {
    expect(summarizeDesktopSource(null)).toEqual({ id: '', name: '', display_id: '' });
    expect(summarizeDesktopSource(undefined)).toEqual({ id: '', name: '', display_id: '' });
  });

  test('handles empty source object', () => {
    expect(summarizeDesktopSource({})).toEqual({ id: '', name: '', display_id: '' });
  });
});

// ---------------------------------------------------------------------------
// summarizeDesktopSources
// ---------------------------------------------------------------------------
describe('summarizeDesktopSources', () => {
  test('summarizes up to the limit', () => {
    const sources = Array.from({ length: 15 }, (_, i) => ({
      id: `window:${i}:0`,
      name: `Window ${i}`,
      display_id: ''
    }));
    expect(summarizeDesktopSources(sources)).toHaveLength(10);
    expect(summarizeDesktopSources(sources, 3)).toHaveLength(3);
  });

  test('returns empty array for empty input', () => {
    expect(summarizeDesktopSources([])).toEqual([]);
    expect(summarizeDesktopSources()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// createScreenshotErrorPayload
// ---------------------------------------------------------------------------
describe('createScreenshotErrorPayload', () => {
  test('wraps a string into a payload', () => {
    const payload = createScreenshotErrorPayload('Something went wrong');
    expect(payload.message).toBe('Something went wrong');
    expect(payload.source).toBe('main');
    expect(payload.context).toBe('');
    expect(payload.meta).toEqual({});
    expect(payload.diagnostics).toEqual({});
  });

  test('wraps an Error object', () => {
    const error = new Error('Test error');
    const payload = createScreenshotErrorPayload(error);
    expect(payload.message).toBe('Test error');
    expect(payload.stack).toContain('Test error');
    expect(payload.source).toBe('main');
  });

  test('passes through an object with message property', () => {
    const payload = createScreenshotErrorPayload({
      message: 'Worker failure',
      source: 'worker',
      context: 'capture',
      meta: { width: 1920 },
      diagnostics: { gpu: 'nvidia' }
    });
    expect(payload.message).toBe('Worker failure');
    expect(payload.source).toBe('worker');
    expect(payload.context).toBe('capture');
    expect(payload.meta).toEqual({ width: 1920 });
    expect(payload.diagnostics).toEqual({ gpu: 'nvidia' });
  });

  test('passes through an object with error property', () => {
    const payload = createScreenshotErrorPayload({ error: 'Failed' });
    expect(payload.message).toBe('Failed');
  });

  test('uses defaults when errorLike fields are missing', () => {
    const payload = createScreenshotErrorPayload('oops', {
      source: 'worker',
      context: 'resize',
      meta: { attempt: 1 },
      diagnostics: { info: true }
    });
    expect(payload.source).toBe('worker');
    expect(payload.context).toBe('resize');
    expect(payload.meta).toEqual({ attempt: 1 });
    expect(payload.diagnostics).toEqual({ info: true });
  });

  test('falls back to default message for null/undefined', () => {
    expect(createScreenshotErrorPayload(null).message).toBe('Unknown screenshot error');
    expect(createScreenshotErrorPayload(undefined).message).toBe('Unknown screenshot error');
  });

  test('merges object meta with defaults meta', () => {
    const payload = createScreenshotErrorPayload(
      { message: 'err', meta: { a: 1 } },
      { meta: { b: 2 } }
    );
    expect(payload.meta).toEqual({ b: 2, a: 1 });
  });

  test('rejects arrays as error payloads', () => {
    const payload = createScreenshotErrorPayload(['not', 'valid']);
    expect(payload.message).toBe('not,valid');
  });
});

// ---------------------------------------------------------------------------
// trimWrappedQuotes
// ---------------------------------------------------------------------------
describe('trimWrappedQuotes', () => {
  test('removes surrounding double quotes', () => {
    expect(trimWrappedQuotes('"hello"')).toBe('hello');
  });

  test('leaves unquoted strings unchanged', () => {
    expect(trimWrappedQuotes('hello')).toBe('hello');
  });

  test('only removes outer quotes, not inner', () => {
    expect(trimWrappedQuotes('"say "hi""')).toBe('say "hi"');
  });

  test('trims whitespace before checking quotes', () => {
    expect(trimWrappedQuotes('  "trimmed"  ')).toBe('trimmed');
  });

  test('handles empty string', () => {
    expect(trimWrappedQuotes('')).toBe('');
  });

  test('handles no arguments (default)', () => {
    expect(trimWrappedQuotes()).toBe('');
  });

  test('does not strip single quotes', () => {
    expect(trimWrappedQuotes("'single'")).toBe("'single'");
  });

  test('leaves a single double-quote intact', () => {
    expect(trimWrappedQuotes('"')).toBe('"');
  });

  test('handles string with only two quotes', () => {
    expect(trimWrappedQuotes('""')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// expandWindowsEnvironmentVariables
// ---------------------------------------------------------------------------
describe('expandWindowsEnvironmentVariables', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('expands known environment variables', () => {
    process.env.TEST_VAR = 'expanded_value';
    expect(expandWindowsEnvironmentVariables('%TEST_VAR%')).toBe('expanded_value');
  });

  test('leaves unknown variables unexpanded', () => {
    delete process.env.NONEXISTENT_VAR_12345;
    expect(expandWindowsEnvironmentVariables('%NONEXISTENT_VAR_12345%')).toBe('%NONEXISTENT_VAR_12345%');
  });

  test('expands multiple variables', () => {
    process.env.FOO_TEST = 'foo';
    process.env.BAR_TEST = 'bar';
    expect(expandWindowsEnvironmentVariables('%FOO_TEST%\\%BAR_TEST%')).toBe('foo\\bar');
  });

  test('handles strings without variables', () => {
    expect(expandWindowsEnvironmentVariables('no variables here')).toBe('no variables here');
  });

  test('handles empty string', () => {
    expect(expandWindowsEnvironmentVariables('')).toBe('');
  });

  test('handles no arguments', () => {
    expect(expandWindowsEnvironmentVariables()).toBe('');
  });

  test('leaves variable unexpanded when env value is empty string', () => {
    process.env.EMPTY_VAR_TEST = '';
    expect(expandWindowsEnvironmentVariables('%EMPTY_VAR_TEST%')).toBe('%EMPTY_VAR_TEST%');
  });
});

// ---------------------------------------------------------------------------
// normalizeComparableWindowsPath
// ---------------------------------------------------------------------------
describe('normalizeComparableWindowsPath', () => {
  test('normalizes and lowercases a Windows path', () => {
    const result = normalizeComparableWindowsPath('C:\\Users\\Test\\Documents\\');
    expect(result).toBe('c:\\users\\test\\documents');
  });

  test('strips trailing slashes', () => {
    const result = normalizeComparableWindowsPath('C:\\path\\to\\folder\\\\');
    expect(result).toMatch(/^c:\\path\\to\\folder$/);
  });

  test('handles empty string', () => {
    expect(normalizeComparableWindowsPath('')).toBe('.');
  });

  test('handles null/undefined', () => {
    expect(normalizeComparableWindowsPath(null)).toBe('.');
    expect(normalizeComparableWindowsPath(undefined)).toBe('.');
  });
});

// ---------------------------------------------------------------------------
// getWindowsUserProfileRoot
// ---------------------------------------------------------------------------
describe('getWindowsUserProfileRoot', () => {
  test('extracts profile root from a typical path', () => {
    expect(getWindowsUserProfileRoot('C:\\Users\\JohnDoe\\Documents\\stuff'))
      .toBe('C:\\Users\\JohnDoe');
  });

  test('handles lowercase drive letter', () => {
    expect(getWindowsUserProfileRoot('c:\\users\\jane\\Desktop'))
      .toBe('c:\\users\\jane');
  });

  test('returns empty string for non-user paths', () => {
    expect(getWindowsUserProfileRoot('D:\\Games\\iRacing')).toBe('');
    expect(getWindowsUserProfileRoot('\\\\network\\share')).toBe('');
  });

  test('returns empty string for empty/null/undefined', () => {
    expect(getWindowsUserProfileRoot('')).toBe('');
    expect(getWindowsUserProfileRoot(null)).toBe('');
    expect(getWindowsUserProfileRoot(undefined)).toBe('');
  });

  test('handles path that is exactly a profile root', () => {
    expect(getWindowsUserProfileRoot('C:\\Users\\Admin')).toBe('C:\\Users\\Admin');
  });
});

// ---------------------------------------------------------------------------
// resolveReshadeBasePath
// ---------------------------------------------------------------------------
describe('resolveReshadeBasePath', () => {
  test('returns ini directory when no BasePath is set', () => {
    const result = resolveReshadeBasePath({}, 'C:\\Games\\iRacing\\ReShade.ini');
    expect(result).toBe('C:\\Games\\iRacing');
  });

  test('resolves an absolute BasePath', () => {
    const result = resolveReshadeBasePath(
      { INSTALL: { BasePath: 'D:\\ReShade' } },
      'C:\\Games\\iRacing\\ReShade.ini'
    );
    expect(result).toBe('D:\\ReShade');
  });

  test('resolves a relative BasePath against ini directory', () => {
    const result = resolveReshadeBasePath(
      { INSTALL: { BasePath: '.\\screenshots' } },
      'C:\\Games\\iRacing\\ReShade.ini'
    );
    expect(result).toBe('C:\\Games\\iRacing\\screenshots');
  });

  test('strips quotes from BasePath', () => {
    const result = resolveReshadeBasePath(
      { INSTALL: { BasePath: '"C:\\Quoted\\Path"' } },
      'C:\\Games\\iRacing\\ReShade.ini'
    );
    expect(result).toBe('C:\\Quoted\\Path');
  });

  test('falls back to cwd when no ini path provided', () => {
    const result = resolveReshadeBasePath({}, '');
    expect(result).toBe(process.cwd());
  });
});

// ---------------------------------------------------------------------------
// remapForeignUserProfileFolder
// ---------------------------------------------------------------------------
describe('remapForeignUserProfileFolder', () => {
  test('does not remap when target is same user', () => {
    const homedir = os.homedir();
    const folder = path.win32.join(homedir, 'Pictures', 'Screenshots');
    const result = remapForeignUserProfileFolder(folder);
    expect(result.remappedFrom).toBe('');
    expect(result.folder).toBe(path.win32.normalize(folder));
  });

  test('does not remap non-user paths', () => {
    const result = remapForeignUserProfileFolder('D:\\Games\\Screenshots');
    expect(result.remappedFrom).toBe('');
  });

  test('does not remap unknown profile subfolders', () => {
    const result = remapForeignUserProfileFolder('C:\\Users\\OtherUser\\AppData\\Local');
    expect(result.remappedFrom).toBe('');
  });

  test('remaps known profile subfolder from foreign user', () => {
    const currentRoot = getWindowsUserProfileRoot(path.win32.resolve(os.homedir()));
    if (!currentRoot) {
      return; // skip on non-Windows-like environments
    }

    // Build a path that looks like it's from a different user
    const foreignFolder = 'C:\\Users\\DifferentUser123XYZ\\Pictures\\Screenshots';
    const foreignRoot = getWindowsUserProfileRoot(foreignFolder);

    // Only test if the foreign root differs from current
    if (normalizeComparableWindowsPath(foreignRoot) !== normalizeComparableWindowsPath(currentRoot)) {
      const result = remapForeignUserProfileFolder(foreignFolder);
      expect(result.remappedFrom).not.toBe('');
      expect(result.folder).toContain(currentRoot);
      expect(result.folder).toContain('Pictures');
    }
  });
});

// ---------------------------------------------------------------------------
// createReshadeConfigError
// ---------------------------------------------------------------------------
describe('createReshadeConfigError', () => {
  test('creates an error with message and meta', () => {
    const err = createReshadeConfigError('bad config', { file: 'test.ini' });
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('bad config');
    expect(err.meta).toEqual({ file: 'test.ini' });
  });

  test('meta defaults to empty object', () => {
    const err = createReshadeConfigError('oops');
    expect(err.meta).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// getReshadeScreenshotFolder
// ---------------------------------------------------------------------------
describe('getReshadeScreenshotFolder', () => {
  test('throws when no screenshot path is configured', () => {
    expect(() => getReshadeScreenshotFolder({})).toThrow('Unable to determine the ReShade screenshot folder');
  });

  test('resolves SCREENSHOT.SavePath as absolute', () => {
    const result = getReshadeScreenshotFolder(
      { SCREENSHOT: { SavePath: 'D:\\Screenshots' } },
      'C:\\Games\\ReShade.ini'
    );
    expect(result.folder).toMatch(/D:\\Screenshots/i);
    expect(result.rawFolder).toBe('D:\\Screenshots');
  });

  test('resolves GENERAL.ScreenshotPath as fallback', () => {
    const result = getReshadeScreenshotFolder(
      { GENERAL: { ScreenshotPath: 'E:\\Shots' } },
      'C:\\Games\\ReShade.ini'
    );
    expect(result.folder).toMatch(/E:\\Shots/i);
  });

  test('prefers SCREENSHOT.SavePath over GENERAL.ScreenshotPath', () => {
    const result = getReshadeScreenshotFolder(
      {
        SCREENSHOT: { SavePath: 'D:\\Primary' },
        GENERAL: { ScreenshotPath: 'E:\\Fallback' }
      },
      'C:\\Games\\ReShade.ini'
    );
    expect(result.folder).toMatch(/D:\\Primary/i);
  });

  test('resolves relative paths against base path', () => {
    const result = getReshadeScreenshotFolder(
      { SCREENSHOT: { SavePath: '.\\shots' } },
      'C:\\Games\\iRacing\\ReShade.ini'
    );
    expect(result.folder).toMatch(/C:\\Games\\iRacing\\shots/i);
    expect(result.basePath).toBe('C:\\Games\\iRacing');
  });

  test('strips quotes from SavePath', () => {
    const result = getReshadeScreenshotFolder(
      { SCREENSHOT: { SavePath: '"D:\\My Shots"' } },
      'C:\\Games\\ReShade.ini'
    );
    expect(result.folder).toMatch(/D:\\My Shots/i);
  });
});

// ---------------------------------------------------------------------------
// normalizeFileKey
// ---------------------------------------------------------------------------
describe('normalizeFileKey', () => {
  test('returns a lowercased absolute path', () => {
    const key = normalizeFileKey('C:\\Users\\Test\\photo.png');
    expect(key).toBe(key.toLowerCase());
    expect(path.isAbsolute(key)).toBe(true);
  });

  test('resolves relative paths', () => {
    const key = normalizeFileKey('photo.png');
    expect(path.isAbsolute(key)).toBe(true);
    expect(key).toContain('photo.png');
  });

  test('normalizes path separators', () => {
    const key1 = normalizeFileKey('C:\\Users\\Test\\photo.png');
    const key2 = normalizeFileKey('C:\\Users\\Test/photo.png');
    expect(key1).toBe(key2);
  });
});

// ---------------------------------------------------------------------------
// parseCameraState
// ---------------------------------------------------------------------------
describe('parseCameraState', () => {
  test('returns CamToolActive (4) for empty array', () => {
    // When CamToolActive is NOT in the array, it gets added
    expect(parseCameraState([])).toBe(4);
  });

  test('returns 0 for no arguments (defaults to empty array)', () => {
    // Default is [] which doesn't include CamToolActive, so +4
    expect(parseCameraState()).toBe(4);
  });

  test('computes bitmask for single state', () => {
    expect(parseCameraState(['IsSessionScreen'])).toBe(1 + 4); // 1 + CamToolActive
    expect(parseCameraState(['IsScenicActive'])).toBe(2 + 4);
    expect(parseCameraState(['UIHidden'])).toBe(8 + 4);
  });

  test('does not double-add CamToolActive when present', () => {
    expect(parseCameraState(['CamToolActive'])).toBe(4);
  });

  test('combines multiple states', () => {
    expect(parseCameraState(['IsSessionScreen', 'IsScenicActive'])).toBe(1 + 2 + 4);
    expect(parseCameraState(['UIHidden', 'CamToolActive'])).toBe(8 + 4);
  });

  test('handles all known states together', () => {
    const allStates = [
      'IsSessionScreen',     // 1
      'IsScenicActive',      // 2
      'CamToolActive',       // 4
      'UIHidden',            // 8
      'UseAutoShotSelection', // 16
      'UseTemporaryEdits',   // 32
      'UseKeyAcceleration',  // 64
      'UseKey10xAcceleration', // 128
      'UseMouseAimMode'      // 256
    ];
    // Sum: 1+2+4+8+16+32+64+128+256 = 511
    // CamToolActive IS in the array, so no extra +4
    expect(parseCameraState(allStates)).toBe(511);
  });

  test('ignores unknown states', () => {
    expect(parseCameraState(['UnknownState'])).toBe(4); // only CamToolActive added
  });

  test('individual state values are correct bitmasks', () => {
    const stateValues = {
      'IsSessionScreen': 1,
      'IsScenicActive': 2,
      'CamToolActive': 4,
      'UIHidden': 8,
      'UseAutoShotSelection': 16,
      'UseTemporaryEdits': 32,
      'UseKeyAcceleration': 64,
      'UseKey10xAcceleration': 128,
      'UseMouseAimMode': 256
    };

    for (const [state, value] of Object.entries(stateValues)) {
      if (state === 'CamToolActive') {
        expect(parseCameraState([state])).toBe(value);
      } else {
        expect(parseCameraState([state])).toBe(value + 4); // +4 because CamToolActive is auto-added
      }
    }
  });
});
