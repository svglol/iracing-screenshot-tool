# irsdk-node

This package provides a fully type-safe thin wrapper around node.js bindings for the iRacing C++ SDK for easy consumption of iRacing data by node.js applications and scripts. It can be used for servers, data tracking scripts, overlays, and much more. The goal for irsdk-node is to not only provide node.js bindings for the sdk, but also to provide accurate typescript types for the data structures and available telemetry variables.

If you want to use the SDK bindings _without_ any wrapper class, you can use the backing [`@irsdk-node/native`](https://github.com/bengsfort/irsdk-node/tree/main/packages/irsdk-node-native) package directly. If you do use the native module directly, it is recommended to use [`@irsdk-node/types`](https://github.com/bengsfort/irsdk-node/tree/main/packages/irsdk-node-types) for a better experience.

> ⚠️ **Node Version support** v4.0.0 updates all native dependencies to modern NodeJS API's, and as such the minimum Node version supported has been increased to v18. For v16 environments, please use the last 3.x.x release (3.3.0).

## Usage

```ts
import { IRacingSDK } from "irsdk-node";

const TIMEOUT = Math.floor((1 / 60) * 1000); // 60fps

// Create a loop to use if the service is running.
function loop(sdk: IRacingSDK): void {
    if (sdk.waitForData(TIMEOUT)) {
        const session = sdk.getSessionData();
        const telemetry = sdk.getTelemetry();

        // Do something with the data

        // Wait for new data
        loop(sdk);
    } else {
        // Disconnected.
    }
}

// Check the iRacing service is running
if (await IRacingSDK.IsSimRunning()) {
    const sdk = new IRacingSDK({
      // If you want the SDK to auto-enable telemetry
      autoEnableTelemetry: true,
    });

    // Start the SDK and create a data loop
    sdk.startSDK();
    loop(sdk);
}
```

Example apps and scripts can be found in the [examples/](https://github.com/bengsfort/irsdk-node/tree/main/examples/) section on github.

### Why is `@irsdk-node/native` separate dependency?

The original irsdk-node package was split up in to separate packages to solve the issue that this SDK is windows-only, which means that the package wasn't able to be used in any other environment other than node.js on windows devices.

To solve this, the package was split into the main native module, the types module, and the wrapper module. Not only does this allow you to have webview environments that can import the SDK types freely, but it also allows you to iterate on your app on different devices that may not necessarily be windows (For example, if you are iterating on some piece of UI for your Electron app from a mac or linux machine) when a fallback module is provided on non-windows platforms.

An added benefit of this is more freedom: if someone would prefer to create their own wrapping API around the native module, they can do so by consuming just the native module!

## Contributing

Contributions are of course welcome! Whether it is help improving telemetry variable types or improving the wrapper or native modules, all packages are available in the monorepo on [github](https://github.com/bengsfort/irsdk-node/).

### Development commands

It is recommended to use one of the [example apps](https://github.com/bengsfort/irsdk-node/tree/main/examples/) as a development environment to check changes against. They will automatically use the latest code from your local device.

```sh
# Build the module via typescript.
$ pnpm build

# Watch the module and recompile on any changes.
$ pnpm watch

# Clean the build directories
$ pnpm clean

# Lint package
$ pnpm lint
```
