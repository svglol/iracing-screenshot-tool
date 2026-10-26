// Which capture owns the sim, and whether the sim still needs putting back.
//
// The still path and the long-exposure path both resize iRacing, hide its UI and
// later restore it, and both are long chains of awaits. This used to be a single
// `takingScreenshot` boolean, which conflated two different facts:
//
//   - the sim is MODIFIED (resized / UI hidden) and must be restored, and
//   - a capture OWNS the sim, so no other capture may start.
//
// For a still the two end together, at the restore. A long exposure restores the
// window before it writes its files, and that write can take seconds — the boolean
// went false at the restore, so a still capture could start mid-write and then
// have its window restored out from under it by the long exposure's final cleanup.
//
// The boolean also could not tell a continuation "your capture is over" from "a
// different capture is now running": after a watchdog or disconnect abort, a late
// await or a late worker message could act on the NEXT capture. Tickets fix that —
// every capture gets a fresh id, and anything acting on behalf of a capture first
// asks whether its ticket still holds.
//
// Pure: no electron, no timers. The side effects of restoring (resize, camera
// state) are injected, so capture-state.test.ts pins the rules directly.

export type CaptureKind = 'still' | 'long-exposure';

export interface CaptureTicket {
	readonly id: number;
	readonly kind: CaptureKind;
}

// Anything that identifies a capture: the ticket itself, or the bare id that
// crosses IPC to the capture worker and back.
export type CaptureRef = CaptureTicket | number | null | undefined;

export class CaptureState {
	private current: CaptureTicket | null = null;
	private lastId = 0;
	private modified = false;

	// Puts the sim back: window size/position and camera state. Called at most
	// once per modification.
	constructor(private readonly restoreSim: () => void) {}

	// The capture holding the sim, or null when it is free.
	get active(): CaptureTicket | null {
		return this.current;
	}

	// Whether a capture has resized iRacing / hidden its UI and not yet put it
	// back. Narrower than `busy`: a long exposure writing its files owns the sim
	// but has already restored it.
	get simModified(): boolean {
		return this.modified;
	}

	// Whether a new capture must be refused.
	get busy(): boolean {
		return this.current !== null || this.modified;
	}

	// Claim the sim for a new capture, which the caller is about to modify. Null
	// when it is busy: there is no queue, the caller refuses.
	begin(kind: CaptureKind): CaptureTicket | null {
		if (this.busy) {
			return null;
		}
		this.lastId += 1;
		this.current = { id: this.lastId, kind };
		this.modified = true;
		return this.current;
	}

	// Whether `ref` is still the capture holding the sim. Anything that is not a
	// number or ticket (a malformed or missing IPC field) never matches.
	//
	// This is the gate for anything acting on behalf of a capture after an await
	// or from a worker message: a capture that was already aborted (and restored)
	// must not restore — or otherwise touch — the one that replaced it.
	holds(ref: CaptureRef): boolean {
		if (!this.current || ref == null) {
			return false;
		}
		const id = typeof ref === 'number' ? ref : ref.id;
		return id === this.current.id;
	}

	// Put the sim back if a capture modified it. A still capture is over once
	// iRacing is back, so this also releases it; a long exposure keeps the sim
	// until end(), because it still has files to write.
	//
	// The state flips BEFORE the side effects run, so a restore that throws can
	// never leave the app permanently busy. The throw still reaches the caller.
	restore(): void {
		this.putBack(this.current?.kind === 'still');
	}

	// Release the sim at the very end of a capture, restoring it first if that
	// has not happened yet. Only the holder can: a stale ticket is a no-op, so a
	// late cleanup cannot free the sim while a newer capture is using it.
	end(ref: CaptureRef): boolean {
		if (!this.holds(ref)) {
			return false;
		}
		this.putBack(true);
		return true;
	}

	private putBack(release: boolean): void {
		const wasModified = this.modified;
		this.modified = false;
		if (release) {
			this.current = null;
		}
		if (wasModified) {
			this.restoreSim();
		}
	}
}
