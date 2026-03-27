# Changelog

## 4.4.0

### Minor Changes

- de22e68: Adds `useTelemVariableCache` option to the `Config` object that can be passed to `IRacingSDK` during initialisation. This option defaults to true and can be controlled after initialization via `IRacingSDK.useTelemVariableCache`. This option enables a performance optimisation where telemetry variables fetched by name (as a string) through `IRacingSDK.getTelemetryVariable()` will lookup and cache their variable index, which is used to get the variable data instead of the name string. This prevents every name string call of `IRacingSDK.getTelemetryVariable()` from performing a linear search to find the variable with the matching name, which can add up when fetching larger number of variables. In testing, this saw a consistent improvement of 0.01ms when fetching only 10 variables every frame, and 0.02ms when fetching 20 variables every frame. Also added is a `IRacingSDK.resetTelemetryVariableCache()` method for programmatically resetting this variable cache, which can be used in situations where a large number of niche variables for single cars may be accessed frequently, with the process never closing in between.

### Patch Changes

- Updated dependencies [de22e68]
  - @irsdk-node/native@5.4.0

## 4.3.1

### Patch Changes

- 9636379: Fix faulty logic for the getTelemetryVariable() function on the native side, which was previously not working.
- 9636379: The `.getTelemetryVariable()` native function now returns `null` if given invalid arguments, and the `INativeSDK` API has been updated to reflect this. `.getTelemetryVariable()` in `irsdk-node` has been updated to early return `null` when this case occurs.
- Updated dependencies [fb7d0ac]
- Updated dependencies [9636379]
- Updated dependencies [9636379]
  - @irsdk-node/native@5.3.0

## 4.3.0

### Minor Changes

- 28f85ea: Add leveled logging support. Native and TS API's now expose a LogLevel API that can be used to control SDK logging output more granularly, allowing filtering logs between debug, error, warn, info, and silent.

  .enableLogging is now deprecated, but remains a part of the API and uses the new API underneath. It is recommended to migrate to the .logLevel prop (or use the new config object passed to the irsdk-node constructor) instead.

- 802e32f: The timeout parameter provided to .waitForData now gets clamped to a minimum of 16 (aka 16ms/~60fps). This iRacing SDK only supports pulling data at 60fps or slower, and attempting to pull data out faster than that can cause unwanted functionality where the SDK will rapidly swap between getting data and being disconnected.

### Patch Changes

- 28f85ea: Expose SDK session data version number (.getSessionVersionNum()) and session connection ID (.getSessionConnectionID())
- 28f85ea: IRacingSDK class constructor now accepts an optional configuration object. (see irsdk-node.Config interface)
- Updated dependencies [28f85ea]
- Updated dependencies [28f85ea]
- Updated dependencies [802e32f]
- Updated dependencies [5535e1c]
- Updated dependencies [28f85ea]
- Updated dependencies [802e32f]
  - @irsdk-node/native@5.2.0
  - @irsdk-node/types@4.0.5

## 4.2.0

### Minor Changes

- a0c6cf9: Updates all wrapped broadcast API messages to follow the correct API signature for their given messages. Also added `broadcastUnsafe` function, allowing to call the full broadcast API without guardrails.

### Patch Changes

- Updated dependencies [d11fbaa]
- Updated dependencies [a0c6cf9]
- Updated dependencies [a0c6cf9]
  - @irsdk-node/native@5.1.0
  - @irsdk-node/types@4.0.4

## 4.1.2

### Patch Changes

- 1b04e7c: Added new Telemetry type generation script and updated telemetry variable types. See @irsdk-node/types for more details.
- Updated dependencies [c161ad9]
- Updated dependencies [c161ad9]
- Updated dependencies [939ed4c]
  - @irsdk-node/types@4.0.2

## 4.1.1

### Patch Changes

- 6f81f5b: Add fix for design/color strings that produce invalid yaml. (Thanks @mikey0000)
- Updated dependencies [1435d80]
  - @irsdk-node/types@4.0.1

## 4.1.0

### Minor Changes

- c53a7b4: Switched @irsdk-node/native to a required dependency due to new pre-published binaries and fallbacks.
- d7e45e5: Revamp internal build system to support both ESM and CJS modules.

### Patch Changes

- Updated dependencies [57c2f2f]
- Updated dependencies [75d6955]
- Updated dependencies [9c42558]
- Updated dependencies [57c2f2f]
  - @irsdk-node/native@5.0.0
  - @irsdk-node/types@4.0.0

## 4.0.4

### Patch Changes

- 2830fbd: Updated readme.
- 86eeabe: Updated license to MIT.
- Updated dependencies [fc577ee]
- Updated dependencies [86eeabe]
  - @irsdk-node/types@3.0.3

## 4.0.3

### Patch Changes

- fa4206a: Update codebase to use pnpm as a package manager for more workspace feature stability.
- c1138e9: Minor inline documentation changes.
- 09e935a: Compile a mock SDK on non-windows platforms instead of nothing at all.
- Updated dependencies [fa4206a]
  - @irsdk-node/types@3.0.2

## v4.0.2

- `irsdk-node` Fixes Electron compilation issues (Thank you @tariknz)
- `@irsdk-node/types` Update to generated telemetry types (Thank you @justinmakaila)

## v4.0.0

- BREAKING: Upgrades all API's to support modern node versions. Minimum version increased to Node v18.

## v3.0.0

- BREAKING: Splits irsdk-node package into multiple packages.
- `@irsdk-node/native` module made into optional module.
- `@irsdk-node/types` module added for consuming iRacing types without importing native module.
- BREAKING: SDK now imported asyncronously, so you need to wait for that to complete before using the SDK. (`await sdk.ready()` method added)
- BREAKING: `.isSimRunning()` static method updated to match naming conventions (now `.IsSimRunning()`)
