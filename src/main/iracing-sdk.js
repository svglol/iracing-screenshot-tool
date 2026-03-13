const { EventEmitter } = require('events');
const { IRacingSDK, CameraState } = require('irsdk-node');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTelemetryValue(value) {
  if (!Array.isArray(value)) {
    return value;
  }

  if (value.length === 1) {
    return value[0];
  }

  return [...value];
}

function decodeCameraState(mask) {
  if (typeof mask !== 'number') {
    return [];
  }

  return Object.entries(CameraState)
    .filter(([name, value]) => {
      return Number.isInteger(value) && value !== 0 && (mask & value) === value;
    })
    .map(([name]) => name);
}

function flattenTelemetry(rawTelemetry) {
  const values = {};

  Object.entries(rawTelemetry || {}).forEach(([name, variable]) => {
    values[name] = normalizeTelemetryValue(variable.value);
  });

  values.CamCameraState = decodeCameraState(values.CamCameraState);

  return { values };
}

class IRacingBridge extends EventEmitter {
  constructor() {
    super();

    this.sdk = new IRacingSDK({ autoEnableTelemetry: true });
    this.connected = false;
    this.loopActive = false;
    this.telemetry = null;
    this.sessionInfo = null;
    this.Consts = { CameraState };
    this.camControls = {
      setState: (state) => this.sdk.changeCameraState(state)
    };

    this.start();
  }

  async start() {
    if (this.loopActive) {
      return;
    }

    this.loopActive = true;

    while (this.loopActive) {
      const isRunning = await IRacingSDK.IsSimRunning();

      if (!isRunning) {
        if (this.connected) {
          this.connected = false;
          this.telemetry = null;
          this.sessionInfo = null;
          this.sdk.stopSDK();
          this.emit('Disconnected');
        }

        await delay(500);
        continue;
      }

      if (!this.connected) {
        this.sdk.startSDK();
        this.connected = true;
        this.emit('Connected');
      }

      const hasData = this.sdk.waitForData(16);

      if (hasData) {
        const sessionData = this.sdk.getSessionData();
        const telemetry = this.sdk.getTelemetry();

        this.sessionInfo = sessionData ? { data: sessionData } : null;
        this.telemetry = telemetry ? flattenTelemetry(telemetry) : null;
        this.emit('update');
      }

      await delay(16);
    }
  }
}

let instance = null;

module.exports = {
  getInstance () {
    if (!instance) {
      instance = new IRacingBridge();
    }

    return instance;
  }
};
