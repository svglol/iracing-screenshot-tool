import { EventEmitter } from 'events';
import { IRacingSDK, CameraState } from 'irsdk-node';
import { flattenTelemetry } from './iracing-sdk-utils';

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

type FlattenedTelemetry = { values: Record<string, unknown> };
type SessionInfo = { data: unknown };

class IRacingBridge extends EventEmitter {
	// irsdk-node SDK surface is untyped upstream; `any` is transitional per D-12-01.
	sdk: any;
	connected: boolean;
	loopActive: boolean;
	telemetry: FlattenedTelemetry | null;
	sessionInfo: SessionInfo | null;
	Consts: { CameraState: any };
	camControls: { setState: (state: number) => void };

	constructor() {
		super();

		this.sdk = new IRacingSDK({ autoEnableTelemetry: true });
		this.connected = false;
		this.loopActive = false;
		this.telemetry = null;
		this.sessionInfo = null;
		this.Consts = { CameraState };
		this.camControls = {
			setState: (state: number) => this.sdk.broadcastUnsafe(2, state, 0, 0),
		};

		this.start();
	}

	async start(): Promise<void> {
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

let instance: IRacingBridge | null = null;

export function getInstance(): IRacingBridge {
	if (!instance) {
		instance = new IRacingBridge();
	}

	return instance;
}

export { IRacingBridge };

// Preserve CommonJS interop for existing `const irsdk = require('./iracing-sdk');
// irsdk.getInstance()` callers in index.ts. Dual-form is legal; ESM `export`
// statements above coexist with this assignment under our tsconfig settings.
module.exports = { getInstance, IRacingBridge };
module.exports.default = { getInstance, IRacingBridge };
