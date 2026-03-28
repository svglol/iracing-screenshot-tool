# Testing Patterns

*Generated: 2026-03-28 | Focus: quality*

## Test Framework

**Runner:**
- Jest `^25.3.0`
- Config: inline in `package.json` under `"jest"` key (no separate config file)

**Configuration:**
```json
{
  "jest": {
    "testPathIgnorePatterns": [
      "/node_modules/",
      "/.tools/",
      "/dist/",
      "/build/"
    ]
  }
}
```

**Babel:** Tests are transpiled via `.babelrc` targeting Electron 41.0 with `@babel/env` and `@babel/typescript` presets.

**Assertion Library:** Jest built-in (`expect`)

**Run Commands:**
```bash
npm test                  # Run all tests (--passWithNoTests)
npm run jest              # Run all tests (without --passWithNoTests)
npm run jest:watch        # Watch mode
npm run jest:coverage     # Collect coverage
npm run test:watch        # Rebuild native modules + watch mode
```

## Test File Organization

**Location:** Co-located with source files (same directory as the module being tested).

**Naming:** `{module-name}.test.js` - matches source file name exactly.

**Structure:**
```
src/
  main/
    main-utils.js              # Source
    main-utils.test.js         # Test (708 lines)
    iracing-sdk-utils.js       # Source
    iracing-sdk-utils.test.js  # Test (173 lines)
  utilities/
    desktop-capture.js         # Source
    desktop-capture.test.js    # Test (539 lines)
    screenshot-name.js         # Source
    screenshot-name.test.js    # Test (333 lines)
```

**Total test files:** 4 files, approximately 1,753 lines of test code.

## Test Structure

**Suite Organization:**
Every test file follows a consistent pattern with horizontal-rule section dividers separating each function's `describe` block:

```javascript
'use strict';

const { functionA, functionB, functionC } = require('./module-under-test');

// ---------------------------------------------------------------------------
// functionA
// ---------------------------------------------------------------------------
describe('functionA', () => {
  test('does the expected thing', () => {
    expect(functionA(input)).toBe(expected);
  });

  test('handles edge case', () => {
    expect(functionA(null)).toBe(defaultValue);
  });
});

// ---------------------------------------------------------------------------
// functionB
// ---------------------------------------------------------------------------
describe('functionB', () => {
  // ...
});
```

**Rules for new test files:**
1. Start with `'use strict';`
2. Import all functions under test via destructuring `require()`
3. One `describe()` block per exported function
4. Separate `describe` blocks with horizontal-rule comment dividers
5. Use `test()` (not `it()`) for individual test cases
6. Test the happy path first, then edge cases, then error cases

## Test Patterns

**Input validation / defensive coding tests:**
Every function is tested with null, undefined, empty string, empty object, empty array, and other boundary inputs:

```javascript
test('returns null for null/undefined', () => {
  expect(normalizeCaptureBounds(null)).toBeNull();
  expect(normalizeCaptureBounds(undefined)).toBeNull();
});

test('returns null for arrays', () => {
  expect(normalizeCaptureBounds([1, 2, 3, 4])).toBeNull();
});

test('returns null for non-objects', () => {
  expect(normalizeCaptureBounds('string')).toBeNull();
  expect(normalizeCaptureBounds(42)).toBeNull();
});
```

**Boundary value testing:**
Tests cover edge cases like NaN, Infinity, zero, negative numbers, and empty strings:

```javascript
test('returns null when values are NaN', () => {
  expect(normalizeCaptureBounds({ x: NaN, y: 0, width: 100, height: 100 })).toBeNull();
});

test('returns null when values are Infinity', () => {
  expect(normalizeCaptureBounds({ x: 0, y: 0, width: Infinity, height: 100 })).toBeNull();
});

test('accepts negative x and y', () => {
  expect(normalizeCaptureBounds({ x: -100, y: -50, width: 200, height: 100 }))
    .toEqual({ x: -100, y: -50, width: 200, height: 100 });
});
```

**Domain-specific integration tests:**
Tests use real iRacing data patterns (track names, driver names, camera states):

```javascript
test('complete integration test with complex data', () => {
  expect(
    buildScreenshotFileKey({
      weekendInfo: {
        TrackDisplayName: 'Circuit of the Americas',
        TrackConfigName: 'Grand Prix',
        TrackName: 'cota_gp',
        TrackDisplayShortName: 'COTA GP'
      },
      driverName: "Kimi Raikkonen",
      count: 42
    })
  ).toBe('Circuit_of_the_Americas-Grand_Prix-Kimi_Raikkonen-42');
});
```

**Bitmask / enum tests:**
Camera state bitmask decoding is tested with individual flags, combined flags, and full flag sets:

```javascript
test('returns all flags for max bitmask', () => {
  // 511 = all flags set (1+2+4+8+16+32+64+128+256)
  const result = decodeCameraState(511);
  expect(result.length).toBeGreaterThan(0);
  expect(result).toContain('IsSessionScreen');
  expect(result).toContain('UIHidden');
  expect(result).toContain('CamToolActive');
  expect(result).toContain('UseMouseAimMode');
});
```

## Environment Manipulation

**Pattern for testing environment variables:**
Save, modify, and restore `process.env`:

```javascript
describe('expandWindowsEnvironmentVariables', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('expands known environment variables', () => {
    process.env.TEST_VAR = 'expanded_value';
    expect(expandWindowsEnvironmentVariables('%TEST_VAR%')).toBe('expanded_value');
  });
});
```

## Platform-Aware Tests

**Conditional test execution:**
Some tests check the runtime environment and skip gracefully on non-Windows:

```javascript
test('remaps known profile subfolder from foreign user', () => {
  const currentRoot = getWindowsUserProfileRoot(path.win32.resolve(os.homedir()));
  if (!currentRoot) {
    return; // skip on non-Windows-like environments
  }
  // ... test body
});
```

## Mocking

**Framework:** No mocking framework is used. Tests are written against pure utility functions that do not require mocks.

**What is mocked:** Nothing. All tested functions are pure or near-pure (only depending on `process.env`, `os.homedir()`, or `path` module).

**What is NOT tested (and why mocking would be needed):**
- `src/main/index.js` - Electron app lifecycle, IPC handlers, window management
- `src/main/iracing-sdk.js` - IRacingBridge class (requires native SDK)
- `src/main/window-utils.js` - PowerShell-based window manipulation
- `src/utilities/config.js` - electron-store with IPC bridge
- All Vue components (`src/renderer/`) - UI rendering, IPC, filesystem access

## Fixtures and Factories

**Test data:** Inline in test files. No shared fixtures, factories, or test data files.

**Pattern:** Test data is constructed directly in each `test()` or at the top of a `describe()` block:

```javascript
const sources = [
  { id: 'window:111:0', name: 'App A' },
  { id: 'window:222:0', name: 'App B' },
  { id: 'window:333:0', name: 'iRacing' }
];
```

## Coverage

**Requirements:** None enforced. No coverage thresholds configured.

**View coverage:**
```bash
npm run jest:coverage
```

## Test Types

**Unit tests only:**
- All 4 test files are pure unit tests for utility/helper functions
- No integration tests, no end-to-end tests, no component tests

**What IS tested:**
| Module | Functions Tested | Test File |
|--------|-----------------|-----------|
| `src/main/main-utils.js` | `isPlainObject`, `mergePlainObjects`, `serializeBounds`, `serializeDisplay`, `summarizeDesktopSource`, `summarizeDesktopSources`, `createScreenshotErrorPayload`, `trimWrappedQuotes`, `expandWindowsEnvironmentVariables`, `normalizeComparableWindowsPath`, `getWindowsUserProfileRoot`, `resolveReshadeBasePath`, `remapForeignUserProfileFolder`, `createReshadeConfigError`, `getReshadeScreenshotFolder`, `normalizeFileKey`, `parseCameraState` | `src/main/main-utils.test.js` |
| `src/main/iracing-sdk-utils.js` | `normalizeTelemetryValue`, `decodeCameraState`, `flattenTelemetry` | `src/main/iracing-sdk-utils.test.js` |
| `src/utilities/desktop-capture.js` | `normalizeWindowHandle`, `normalizeWindowTitle`, `normalizeCaptureBounds`, `normalizeCaptureTarget`, `isExternalWindowSource`, `findSourceByWindowHandles`, `findSourceByWindowTitle`, `findSourceByKnownIracingTitle`, `findDisplaySourceByDisplayId`, `resolveDisplayCaptureRect` | `src/utilities/desktop-capture.test.js` |
| `src/utilities/screenshot-name.js` | `sanitizeFilePart`, `buildTrackFilePart`, `buildScreenshotFileKey` | `src/utilities/screenshot-name.test.js` |

**What is NOT tested:**
| Module | Reason |
|--------|--------|
| `src/main/index.js` | Main Electron process orchestration - heavy side effects, IPC, window management |
| `src/main/iracing-sdk.js` | Native SDK wrapper class - requires iRacing sim running |
| `src/main/window-utils.js` | PowerShell window manipulation - requires Windows + iRacing process |
| `src/utilities/config.js` | electron-store with IPC bridge - requires Electron runtime |
| `src/renderer/**/*.vue` | Vue components - no component testing framework set up |
| `src/renderer/main.js` | App bootstrap - requires full Electron + Vue environment |

## Common Assertion Patterns

**Equality:**
```javascript
expect(result).toBe(42);              // Strict equality (primitives)
expect(result).toEqual({ a: 1 });     // Deep equality (objects/arrays)
expect(result).not.toBe(original);    // Referential inequality (copy check)
```

**Truthiness:**
```javascript
expect(isPlainObject(null)).toBeFalsy();
expect(isPlainObject({})).toBe(true);
expect(isPlainObject(new Object())).toBe(true);
```

**Null checks:**
```javascript
expect(normalizeCaptureBounds(null)).toBeNull();
```

**Array containment:**
```javascript
expect(result).toContain('IsSessionScreen');
expect(result).toContain('UIHidden');
expect(result).toHaveLength(10);
expect(result.length).toBeGreaterThan(0);
expect(Array.isArray(result)).toBe(true);
```

**Error testing:**
```javascript
test('throws when no screenshot path is configured', () => {
  expect(() => getReshadeScreenshotFolder({})).toThrow('Unable to determine the ReShade screenshot folder');
});
```

**Instance checking:**
```javascript
expect(err).toBeInstanceOf(Error);
```

**Property checking:**
```javascript
expect(result).toHaveProperty('values');
expect(typeof result.values).toBe('object');
```

## Writing New Tests

When adding tests for a new utility module:

1. Create `{module-name}.test.js` in the same directory as the source
2. Start with `'use strict';`
3. Import functions via destructured `require('./module-name')`
4. Create one `describe()` per function with horizontal-rule dividers
5. Use `test()` not `it()`
6. Test: happy path, edge cases (null/undefined/empty), type coercion, boundary values
7. Use inline test data, no shared fixtures
8. Do not introduce mocking unless absolutely necessary
9. Run with `npm test` to verify

---

*Testing analysis: 2026-03-28*
