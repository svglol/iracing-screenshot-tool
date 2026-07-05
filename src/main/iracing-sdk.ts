import { EventEmitter } from 'events';
import { IRacingSDK, CameraState } from 'irsdk-node';
import { flattenTelemetry } from './iracing-sdk-utils';
import { createLogger } from '../utilities/logger';

const log = createLogger('iracing-sdk');

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
	// Latched true once telemetry first arrives on a connection, cleared on
	// disconnect — so the 'telemetry first available' edge logs once per connect
	// (obs-lifecycle-telemetry#1), never on every 16ms frame.
	_hadTelemetry: boolean;

	constructor() {
		super();

		this.sdk = new IRacingSDK({ autoEnableTelemetry: true });
		this.connected = false;
		this.loopActive = false;
		this.telemetry = null;
		this.sessionInfo = null;
		this._hadTelemetry = false;
		this.Consts = { CameraState };
		this.camControls = {
			setState: (state: number) => this.sdk.broadcastUnsafe(2, state, 0, 0),
		};

		// Floating promise: a rejection here (a native throw escaping the loop's
		// own guards) must never go unhandled — it would otherwise leave the
		// bridge with loopActive stuck and no trace. The .catch logs it; the
		// loop's own try/finally already resets loopActive so a restart is possible.
		this.start().catch((error) =>
			log.error('iRacing bridge start() rejected', {
				error: (error as Error)?.message || String(error),
			})
		);
	}

	async start(): Promise<void> {
		if (this.loopActive) {
			return;
		}

		this.loopActive = true;
		let consecutiveErrors = 0;

		try {
			while (this.loopActive) {
				try {
					const isRunning = await IRacingSDK.IsSimRunning();

					if (!isRunning) {
						if (this.connected) {
							this.connected = false;
							this.telemetry = null;
							this.sessionInfo = null;
							this._hadTelemetry = false;
							this.sdk.stopSDK();
							// Low-level SDK teardown record; the app-facing 'iRacing
							// disconnected' transition (with midCapture context) is logged
							// by the index.ts iracing.on('Disconnected') handler.
							log.info('SDK stopSDK');
							this.emit('Disconnected');
						}

						consecutiveErrors = 0;
						await delay(500);
						continue;
					}

					if (!this.connected) {
						this.sdk.startSDK();
						this.connected = true;
						// Low-level SDK start record; the app-facing 'iRacing connected'
						// transition is logged by the index.ts iracing.on('Connected')
						// handler.
						log.info('SDK startSDK');
						this.emit('Connected');
					}

					const hasData = this.sdk.waitForData(16);

					if (hasData) {
						const sessionData = this.sdk.getSessionData();
						const telemetry = this.sdk.getTelemetry();

						this.sessionInfo = sessionData
							? { data: sessionData }
							: null;
						this.telemetry = telemetry
							? flattenTelemetry(telemetry)
							: null;
						// False->true telemetry edge, once per connection: the
						// authoritative "data is actually flowing" signal, distinct from
						// the Connected transition (which fires a beat earlier at startSDK).
						// Only ever latched true here; cleared on disconnect so a null
						// frame mid-session can't re-fire it (obs-lifecycle-telemetry#1).
						if (this.telemetry != null && !this._hadTelemetry) {
							this._hadTelemetry = true;
							log.info('iRacing telemetry first available');
						}
						this.emit('update');
					}

					consecutiveErrors = 0;
					await delay(16);
				} catch (error) {
					consecutiveErrors++;
					log.error('iRacing poll loop error — self-healing', {
						error: (error as Error)?.message || String(error),
						consecutiveErrors,
					});

					// A native throw usually means the SDK handle is stale, so drop
					// the connection: a recovered iteration re-runs startSDK() and
					// re-emits Connected. stopSDK() may itself throw if already torn
					// down — swallow that so recovery still proceeds.
					if (this.connected) {
						this.connected = false;
						this.telemetry = null;
						this.sessionInfo = null;
						this._hadTelemetry = false;
						try {
							this.sdk.stopSDK();
						} catch {
							// SDK already torn down — nothing to stop.
						}
						this.emit('Disconnected');
					}

					// Bounded linear backoff so a persistent native fault doesn't
					// spin the loop hot; caps at 5s.
					await delay(Math.min(500 * consecutiveErrors, 5000));
				}
			}
		} finally {
			// Always release the re-entrancy latch so a later start() (or a fresh
			// getInstance()) can spin the loop back up, instead of it staying dead
			// with loopActive stuck true.
			this.loopActive = false;
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
