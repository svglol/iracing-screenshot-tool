// Registering the global screenshot hotkey without ever losing it.
//
// Electron's globalShortcut.register returns false when another application owns
// the accelerator, but THROWS ("conversion failure") when it cannot parse it — and
// so does unregister. The old handlers did neither check: a rebind unregistered the
// working hotkey and then threw registering the new one, leaving none; and the
// startup registration threw inside the async `ready` handler, so every handler
// registered after it (the Restore Now geometry channels) silently never existed.
//
// These helpers never throw, and a failed rebind puts the previous hotkey back.
// The registry is injected so global-shortcut.test.ts can drive the failure modes.

export interface ShortcutRegistry {
	register(accelerator: string, callback: () => void): boolean;
	unregister(accelerator: string): void;
}

export type ShortcutFailure =
	// Electron could not parse it: retrying will never work.
	| 'invalid'
	// Parsed, but another application already owns it: may work another time.
	| 'conflict';

export type ShortcutResult =
	| { ok: true }
	| { ok: false; failure: ShortcutFailure; reason: string };

export function registerShortcut(
	registry: ShortcutRegistry,
	accelerator: unknown,
	callback: () => void
): ShortcutResult {
	if (typeof accelerator !== 'string' || accelerator.trim() === '') {
		return { ok: false, failure: 'invalid', reason: 'empty accelerator' };
	}
	try {
		return registry.register(accelerator, callback)
			? { ok: true }
			: {
					ok: false,
					failure: 'conflict',
					reason: 'already registered by another application',
				};
	} catch (error) {
		return {
			ok: false,
			failure: 'invalid',
			reason: (error as Error)?.message || String(error),
		};
	}
}

function unregisterQuietly(
	registry: ShortcutRegistry,
	accelerator: unknown
): void {
	if (typeof accelerator !== 'string' || accelerator.trim() === '') {
		return;
	}
	try {
		registry.unregister(accelerator);
	} catch {
		// An accelerator that cannot be parsed was never registered either.
	}
}

// Move the hotkey from `previous` to `next`. The old one is released FIRST, so a
// next that Electron treats as the same key ('Ctrl+P' vs 'Control+P') is not
// refused as a conflict with ourselves; if `next` then fails, `previous` is
// registered again.
export function rebindShortcut(
	registry: ShortcutRegistry,
	previous: unknown,
	next: unknown,
	callback: () => void
): ShortcutResult {
	unregisterQuietly(registry, previous);
	const result = registerShortcut(registry, next, callback);
	if (result.ok === false) {
		registerShortcut(registry, previous, callback);
	}
	return result;
}

export interface StartupShortcut {
	// The accelerator actually registered, or null when there is no hotkey.
	active: string | null;
	// True when the stored value could never work and the fallback replaced it,
	// so the caller should persist the fallback.
	replacedInvalid: boolean;
	// Why the stored accelerator was not registered; null when it was.
	reason: string | null;
}

// Register the saved hotkey at launch. A saved value Electron cannot parse (one
// the old Settings key capture could produce) is replaced by the default; one that
// another app owns is left saved — that conflict may be gone next launch, and the
// user chose it.
export function registerStartupShortcut(
	registry: ShortcutRegistry,
	stored: unknown,
	fallback: string,
	callback: () => void
): StartupShortcut {
	const result = registerShortcut(registry, stored, callback);
	if (result.ok === true) {
		return { active: stored as string, replacedInvalid: false, reason: null };
	}
	if (result.failure === 'invalid' && stored !== fallback) {
		const fallbackResult = registerShortcut(registry, fallback, callback);
		return {
			active: fallbackResult.ok ? fallback : null,
			replacedInvalid: true,
			reason: result.reason,
		};
	}
	return { active: null, replacedInvalid: false, reason: result.reason };
}
