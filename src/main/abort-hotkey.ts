// The key that aborts a running capture grid or long exposure.
//
// Both run with iRacing raised in front of our window, often for minutes, so
// the Abort button in our panel cannot be reached without alt-tabbing out of the
// sim. This is a global shortcut, but it is registered ONLY while one of them is
// running: the default is plain Escape, and taking Escape away from every other
// app for as long as we are open would be unacceptable.

import { createLogger } from '../utilities/logger';

const log = createLogger('abort-hotkey');

export const DEFAULT_ABORT_KEYBIND = 'Escape';

export interface ShortcutRegistry {
	register(accelerator: string, callback: () => void): boolean;
	unregister(accelerator: string): void;
}

export class AbortHotkey {
	private armed: string | null = null;

	constructor(private readonly shortcuts: ShortcutRegistry) {}

	get armedKey(): string | null {
		return this.armed;
	}

	// Registers `accelerator` until disarm(). Returns whether it took: an empty or
	// malformed binding, one that clashes with the screenshot key, or one another
	// app already holds all leave the capture running without a hotkey (the
	// panel's Abort button still works), and the overlay then promises nothing.
	arm(
		accelerator: string | null | undefined,
		onPress: () => void,
		reserved: Array<string | null | undefined> = []
	): boolean {
		this.disarm();
		const key = typeof accelerator === 'string' ? accelerator.trim() : '';
		if (!key) {
			return false;
		}
		if (reserved.some((r) => sameAccelerator(r, key))) {
			log.warn('Abort keybind clashes with another binding; not armed', {
				key,
			});
			return false;
		}
		try {
			if (!this.shortcuts.register(key, onPress)) {
				log.warn('Abort keybind is held by another app; not armed', {
					key,
				});
				return false;
			}
		} catch (error) {
			log.warn('Abort keybind could not be registered', {
				key,
				error: (error as Error)?.message || String(error),
			});
			return false;
		}
		this.armed = key;
		return true;
	}

	disarm(): void {
		const key = this.armed;
		this.armed = null;
		if (key) {
			try {
				this.shortcuts.unregister(key);
			} catch {
				// Already gone (the app is quitting).
			}
		}
	}
}

function sameAccelerator(
	a: string | null | undefined,
	b: string | null | undefined
): boolean {
	const norm = (s: string | null | undefined) =>
		(s ?? '')
			.split('+')
			.map((part) => part.trim().toLowerCase())
			.map((part) =>
				part === 'ctrl' || part === 'commandorcontrol' ? 'control' : part
			)
			.map((part) => (part === 'esc' ? 'escape' : part))
			.filter(Boolean)
			.sort()
			.join('+');
	return norm(a) !== '' && norm(a) === norm(b);
}

// For the banner: "Control+Escape" reads as "Ctrl+Esc".
export function displayAccelerator(accelerator: string): string {
	const names: Record<string, string> = {
		control: 'Ctrl',
		commandorcontrol: 'Ctrl',
		escape: 'Esc',
		return: 'Enter',
	};
	return accelerator
		.split('+')
		.map((part) => part.trim())
		.filter(Boolean)
		.map((part) => names[part.toLowerCase()] ?? part)
		.join('+');
}
