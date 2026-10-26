// Turning a key press into an Electron accelerator string for the global
// screenshot hotkey.
//
// Settings used to join raw KeyboardEvent.key values with '+'. Several of those
// are not accelerator tokens, and Electron's globalShortcut.register THROWS on
// them ("conversion failure") rather than returning false: 'Control+ArrowUp',
// 'Control+ ' (Space), 'Shift++' (the plus key), 'Control+Dead', 'Control+ò', or a
// bare modifier like 'Control' when it was released first. The thrown error left
// the user with no hotkey, and the saved value broke startup on every later launch.
//
// This maps the PHYSICAL key (KeyboardEvent.code) onto Electron's token names, so
// the result is always something register() can parse. The one exception is
// letters: Windows hot keys are virtual-key based, and on AZERTY/QWERTZ the key
// labelled 'A' sends VK_A from a different physical position — so for an ASCII
// letter the LABEL (event.key) is what matches what the user pressed.
//
// Pure, no DOM types: accelerator.test.ts pins the mapping.

export interface KeyPress {
	key: string;
	code: string;
	ctrlKey: boolean;
	altKey: boolean;
	shiftKey: boolean;
	metaKey: boolean;
}

export type KeyPressResult =
	// A modifier on its own: keep listening for the key it modifies.
	| { kind: 'modifier'; modifiers: string[] }
	// Escape with no modifiers: abandon the capture.
	| { kind: 'cancel' }
	// A key no accelerator can name (IntlBackslash, ContextMenu, media keys…).
	| { kind: 'unsupported'; code: string }
	| { kind: 'accelerator'; accelerator: string };

// Every KeyboardEvent.key value that is a modifier or a lock, never a main key.
const MODIFIER_KEYS = new Set([
	'Control',
	'Alt',
	'AltGraph',
	'Shift',
	'Meta',
	'OS',
	'Super',
	'Hyper',
	'Fn',
	'FnLock',
]);

// KeyboardEvent.code -> Electron accelerator token, for everything that is not a
// letter, a digit row key or a function key (those are computed below).
const CODE_TOKENS: Record<string, string> = {
	Space: 'Space',
	Enter: 'Enter',
	NumpadEnter: 'Enter',
	Tab: 'Tab',
	Backspace: 'Backspace',
	Delete: 'Delete',
	Insert: 'Insert',
	Home: 'Home',
	End: 'End',
	PageUp: 'PageUp',
	PageDown: 'PageDown',
	ArrowUp: 'Up',
	ArrowDown: 'Down',
	ArrowLeft: 'Left',
	ArrowRight: 'Right',
	PrintScreen: 'PrintScreen',
	Escape: 'Escape',
	NumpadDecimal: 'numdec',
	NumpadAdd: 'numadd',
	NumpadSubtract: 'numsub',
	NumpadMultiply: 'nummult',
	NumpadDivide: 'numdiv',
	// The unshifted US characters, which Electron accepts as single-character
	// tokens. '+' is never produced: it is the separator, and Shift is carried
	// as a modifier instead.
	Minus: '-',
	Equal: '=',
	BracketLeft: '[',
	BracketRight: ']',
	Backslash: '\\',
	Semicolon: ';',
	Quote: "'",
	Comma: ',',
	Period: '.',
	Slash: '/',
	Backquote: '`',
};

export function modifiersOf(press: KeyPress): string[] {
	const modifiers: string[] = [];
	if (press.ctrlKey) modifiers.push('Control');
	if (press.altKey) modifiers.push('Alt');
	if (press.shiftKey) modifiers.push('Shift');
	if (press.metaKey) modifiers.push('Super');
	return modifiers;
}

function mainKeyToken(press: KeyPress): string | null {
	const { code, key } = press;
	const letter = /^Key([A-Z])$/.exec(code);
	if (letter) {
		return /^[a-z]$/i.test(key) ? key.toUpperCase() : letter[1];
	}
	const digit = /^(?:Digit|Numpad)([0-9])$/.exec(code);
	if (digit) {
		return code.startsWith('Numpad') ? `num${digit[1]}` : digit[1];
	}
	if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) {
		return code;
	}
	return CODE_TOKENS[code] ?? null;
}

export function acceleratorFromKeyPress(press: KeyPress): KeyPressResult {
	const modifiers = modifiersOf(press);
	if (MODIFIER_KEYS.has(press.key)) {
		return { kind: 'modifier', modifiers };
	}
	if (press.code === 'Escape' && modifiers.length === 0) {
		return { kind: 'cancel' };
	}
	const token = mainKeyToken(press);
	if (!token) {
		return { kind: 'unsupported', code: press.code };
	}
	return { kind: 'accelerator', accelerator: [...modifiers, token].join('+') };
}
