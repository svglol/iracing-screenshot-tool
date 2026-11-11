// Capture grid — a small banner over iRacing while a grid runs.
//
// During a grid iRacing is raised in front of our window (the resize raises it,
// and ReShade only captures the foreground game), so nothing in our UI can be
// seen. This banner is how the user knows which car is up and, in ReShade mode,
// that it is their turn to press the ReShade key.
//
// It must never get in the way:
//   - it never takes focus (`focusable: false`, shown inactive), so iRacing stays
//     foreground and keeps receiving the ReShade key;
//   - it ignores the mouse, so it cannot be clicked by accident;
//   - it is never IN a shot: WGC captures iRacing's window, not the screen, and
//     ReShade captures the game's own back buffer, so a window on top of iRacing
//     is invisible to both.
//
// The page is a fixed inline document with no script of its own and no Node
// access; main writes the text into it.

import { BrowserWindow, screen } from 'electron';
import { createLogger } from '../../utilities/logger';

const log = createLogger('capture-grid/overlay');

const WIDTH = 560;
const HEIGHT = 74;
const TOP_MARGIN = 24;

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:transparent;overflow:hidden;
font-family:"Segoe UI",system-ui,sans-serif;-webkit-user-select:none;user-select:none}
.box{box-sizing:border-box;height:100%;display:flex;flex-direction:column;justify-content:center;
padding:8px 16px;border-radius:10px;background:rgba(18,18,22,.88);color:#fff;
border:1px solid rgba(255,255,255,.14);box-shadow:0 6px 24px rgba(0,0,0,.45)}
.box.ask{border-color:#ffb020;background:rgba(40,28,6,.92)}
#t{font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#s{font-size:12.5px;opacity:.75;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style></head><body><div class="box" id="b"><div id="t"></div><div id="s"></div></div></body></html>`;

export interface OverlayText {
	title: string;
	subtitle?: string;
	// Draw it as a request for the user's action (the ReShade key).
	ask?: boolean;
}

export class GridOverlay {
	private win: BrowserWindow | null = null;
	private ready: Promise<void> | null = null;

	// Open centred along the top of the display that holds `near` (iRacing's
	// window). Never throws: the banner is a convenience, never a reason to fail a
	// grid.
	open(near: { x: number; y: number }): void {
		try {
			const display = screen.getDisplayNearestPoint(near);
			const area = display.workArea;
			this.win = new BrowserWindow({
				width: WIDTH,
				height: HEIGHT,
				x: Math.round(area.x + (area.width - WIDTH) / 2),
				y: area.y + TOP_MARGIN,
				frame: false,
				transparent: true,
				resizable: false,
				movable: false,
				focusable: false,
				skipTaskbar: true,
				alwaysOnTop: true,
				show: false,
				hasShadow: false,
				webPreferences: {
					sandbox: true,
					contextIsolation: true,
					nodeIntegration: false,
					javascript: true,
				},
			});
			// Above a borderless-fullscreen game.
			this.win.setAlwaysOnTop(true, 'screen-saver');
			this.win.setIgnoreMouseEvents(true);
			this.ready = this.win
				.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(PAGE)}`)
				.then(() => {
					this.win?.showInactive();
				})
				.catch((error) => {
					log.warn('Grid overlay failed to load', {
						error: (error as Error)?.message || String(error),
					});
				});
		} catch (error) {
			log.warn('Grid overlay failed to open', {
				error: (error as Error)?.message || String(error),
			});
			this.win = null;
		}
	}

	show(text: OverlayText): void {
		const win = this.win;
		if (!win || win.isDestroyed() || !this.ready) {
			return;
		}
		// Text goes in as JSON-encoded data and lands in textContent, never as
		// markup — driver names are third-party strings.
		const script = `(() => {
			const t = ${JSON.stringify(text)};
			document.getElementById('t').textContent = t.title || '';
			document.getElementById('s').textContent = t.subtitle || '';
			document.getElementById('b').className = t.ask ? 'box ask' : 'box';
		})()`;
		void this.ready.then(() => {
			if (!win.isDestroyed()) {
				win.webContents.executeJavaScript(script).catch(() => {});
			}
		});
	}

	close(): void {
		const win = this.win;
		this.win = null;
		this.ready = null;
		try {
			if (win && !win.isDestroyed()) {
				win.destroy();
			}
		} catch {
			// Already gone with the app.
		}
	}
}
