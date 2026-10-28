// Where to reopen the main window.
//
// The window's position is saved on close and reused on the next launch. It is
// frameless (`frame: false`): the only way to move it is the app's own title bar.
// So a position saved on a monitor that has since been disconnected — or a laptop
// undocked from it — reopened the window somewhere no display shows, with nothing
// the user could grab to bring it back.
//
// The saved position is kept when a usable piece of the window's top edge (where
// the title bar is) lands inside some display's work area; otherwise the position
// is dropped and Electron centres the window on the primary display. The size is
// always kept: the window's minimum size is enforced by Electron itself.
//
// Pure — displays are passed in — so window-bounds.test.ts pins the rule.

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface SavedBounds {
	x: unknown;
	y: unknown;
	width: unknown;
	height: unknown;
}

// Height of the strip along the window's top that must be reachable, and how
// much of it must show, for the user to drag the window back.
const GRAB_STRIP_HEIGHT = 32;
const MIN_GRAB_WIDTH = 100;

function finite(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function overlap(a: Rect, b: Rect): { width: number; height: number } {
	return {
		width: Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
		height: Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
	};
}

export function restoreWindowBounds(
	saved: SavedBounds,
	workAreas: readonly Rect[],
	fallbackSize: { width: number; height: number }
): { x?: number; y?: number; width: number; height: number } {
	const width = finite(saved.width) ?? fallbackSize.width;
	const height = finite(saved.height) ?? fallbackSize.height;
	const x = finite(saved.x);
	const y = finite(saved.y);
	if (x === null || y === null) {
		return { width, height };
	}

	const grabStrip: Rect = {
		x,
		y,
		width,
		height: Math.min(GRAB_STRIP_HEIGHT, height),
	};
	const reachable = workAreas.some((area) => {
		const shown = overlap(grabStrip, area);
		return (
			shown.width >= Math.min(MIN_GRAB_WIDTH, width) &&
			shown.height >= grabStrip.height / 2
		);
	});
	return reachable ? { x, y, width, height } : { width, height };
}
