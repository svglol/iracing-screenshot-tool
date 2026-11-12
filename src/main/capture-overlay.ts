// A small banner over iRacing while a capture runs: the capture grid, a long
// exposure, and a ReShade-mode screenshot.
//
// During all three, iRacing is raised in front of our window (the resize raises
// it, and ReShade only captures the foreground game), so nothing in our UI can be
// seen. This banner is how the user knows what is happening and, in ReShade
// mode, that it is their turn to press the ReShade key. Born in the capture grid
// (2026-11-11), shared with the other two on request (2026-11-12).
//
// It must never get in the way:
//   - it never takes focus (`focusable: false`, shown inactive), so iRacing stays
//     foreground and keeps receiving the ReShade key;
//   - it ignores the mouse, so it cannot be clicked by accident;
//   - it is never IN a shot: WGC captures iRacing's window, not the screen, and
//     ReShade captures the game's own back buffer, so a window on top of iRacing
//     is invisible to both. (The getUserMedia fallback captures the window too.)
//
// The page is a fixed inline document with no script of its own and no Node
// access; main writes the text into it.

import { BrowserWindow, screen } from 'electron';
import { createLogger } from '../utilities/logger';

const log = createLogger('capture-overlay');

const WIDTH = 560;
const HEIGHT = 74;
const TOP_MARGIN = 24;

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:transparent;overflow:hidden;
font-family:"Segoe UI",system-ui,sans-serif;-webkit-user-select:none;user-select:none}
.box{position:relative;box-sizing:border-box;height:100%;display:flex;flex-direction:column;justify-content:center;
padding:8px 16px;border-radius:10px;background:rgba(18,18,22,.88);color:#fff;overflow:hidden;
border:1px solid rgba(255,255,255,.14);box-shadow:0 6px 24px rgba(0,0,0,.45)}
.box.ask{border-color:#ffb020;background:rgba(40,28,6,.92)}
.box.warn{border-color:#ff6b5b;background:rgba(44,12,10,.92)}
#r{display:flex;align-items:baseline;gap:12px}
#t{flex:1;min-width:0;font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#k{flex:none;font-size:11.5px;opacity:.6;white-space:nowrap}
#s{font-size:12.5px;opacity:.75;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#p{position:absolute;left:0;bottom:0;height:3px;width:0;background:#4da3ff;transition:width .2s linear}
</style></head><body><div class="box" id="b"><div id="r"><div id="t"></div><div id="k"></div></div><div id="s"></div><div id="p"></div></div></body></html>`;

export interface OverlayText {
	title: string;
	subtitle?: string;
	// Drawn as a request for the user's action (the ReShade key).
	ask?: boolean;
	// Drawn as a warning (the camera moved and is being put back).
	warn?: boolean;
	// 0..1 fills a bar along the bottom; absent hides it.
	progress?: number;
	// Glide the bar to this, arriving in `progressMs`, linearly, instead of
	// stepping to it. Only the FIRST glide starts at `progress`; every later one
	// continues from wherever the bar is on screen, so an update changes the
	// bar's speed and never its position. (Starting each re-aim at the reported
	// position made it leap: real progress arrives in replay-frame steps, a
	// quarter-second apart in slow motion, and the seek time is a guess.)
	progressTo?: number;
	progressMs?: number;
}

export class CaptureOverlay {
	private win: BrowserWindow | null = null;
	private ready: Promise<void> | null = null;
	// The small line in the top-right corner ("Press Esc to abort"). Kept across
	// show() calls and across close(): it belongs to the running capture, which
	// sets and clears it, not to any one banner.
	private hint = '';

	setHint(hint: string | null): void {
		this.hint = hint ?? '';
	}

	get isOpen(): boolean {
		return this.win !== null && !this.win.isDestroyed();
	}

	// Open centred along the top of the display that holds `near` (iRacing's
	// window). Never throws: the banner is a convenience, never a reason to fail a
	// capture. Opening an open overlay does nothing.
	open(near: { x: number; y: number }): void {
		if (this.isOpen) {
			return;
		}
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
					log.warn('Capture overlay failed to load', {
						error: (error as Error)?.message || String(error),
					});
				});
		} catch (error) {
			log.warn('Capture overlay failed to open', {
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
		const fraction = (value: unknown) =>
			typeof value === 'number' && Number.isFinite(value)
				? Math.max(0, Math.min(1, value))
				: null;
		const progress = fraction(text.progress);
		const progressTo = progress === null ? null : fraction(text.progressTo);
		const progressMs =
			typeof text.progressMs === 'number' && text.progressMs > 0
				? Math.round(text.progressMs)
				: 0;
		// Text goes in as JSON-encoded data and lands in textContent, never as
		// markup — driver names are third-party strings.
		const script = `(() => {
			const t = ${JSON.stringify({
				title: text.title,
				subtitle: text.subtitle,
				ask: text.ask === true,
				warn: text.warn === true,
				hint: this.hint,
				progress,
				progressTo,
				progressMs,
			})};
			document.getElementById('t').textContent = t.title || '';
			document.getElementById('k').textContent = t.hint || '';
			document.getElementById('s').textContent = t.subtitle || '';
			document.getElementById('b').className =
				t.ask ? 'box ask' : t.warn ? 'box warn' : 'box';
			const p = document.getElementById('p');
			if (t.progress === null) {
				p.style.transition = 'none';
				p.style.width = '0';
				return;
			}
			if (t.progressTo === null) {
				p.dataset.gliding = '';
				p.style.transition = 'width .2s linear';
				p.style.width = (t.progress * 100) + '%';
				return;
			}
			// Where the running glide has got to, read off the screen.
			let from = t.progress;
			if (p.dataset.gliding) {
				const track = p.parentElement.clientWidth;
				from = track > 0 ? p.getBoundingClientRect().width / track : 0;
			}
			p.dataset.gliding = '1';
			p.style.transition = 'none';
			p.style.width = (from * 100) + '%';
			void p.offsetWidth;
			// Never backwards; and a step reported as already over still gets a
			// moment to catch up rather than a snap.
			if (t.progressTo > from) {
				p.style.transition =
					'width ' + Math.max(400, t.progressMs) + 'ms linear';
				p.style.width = (t.progressTo * 100) + '%';
			}
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
