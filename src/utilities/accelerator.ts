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
// WHICH KEY a token means. A Windows global hot key is registered by VIRTUAL-KEY
// code, and Electron turns each token into one through a fixed table: 'A'..'Z',
// '0'..'9', 'F1'..'F24', named keys, and the eleven US punctuation characters
// (';' -> VK_OEM_1, ',' -> VK_OEM_COMMA, ...). Which physical key produces a given
// virtual key depends on the keyboard layout — on AZERTY the key labelled M sends
// VK_M from where US has ';'. So the token must come from the virtual key the
// press actually produced, which Chromium reports on Windows as
// KeyboardEvent.keyCode (the WM_KEYDOWN wParam). Mapping keyCode through the
// inverse of Electron's table registers exactly the key that was pressed, on any
// layout. KeyboardEvent.code (the US-position name) is only the fallback for a
// press that carries no usable keyCode.
//
// Pure, no DOM types: accelerator.test.ts pins the mapping, and every token it
// can produce was registered successfully on Electron 41.

export interface KeyPress {
	key: string;
	code: string;
	// The Windows virtual-key code. Optional: absent or 0 on synthetic events,
	// 229 while an IME is composing.
	keyCode?: number;
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
	// A key no accelerator can name (the ISO <> key, ContextMenu, IME input…).
	| { kind: 'unsupported'; code: string }
	| { kind: 'accelerator'; accelerator: string };

// Every KeyboardEvent.key value that is a modifier, never a main key.
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

// Canonical order, so the same chord always produces the same string.
const MODIFIER_ORDER = ['Control', 'Alt', 'Shift', 'Super'];

// Windows virtual-key code -> Electron token, for everything that is not a letter,
// a digit, a numpad digit or a function key (those are computed below). The
// punctuation entries are the inverse of Electron's own character table.
const VIRTUAL_KEY_TOKENS: Record<number, string> = {
	8: 'Backspace',
	9: 'Tab',
	13: 'Enter',
	20: 'Capslock',
	27: 'Escape',
	32: 'Space',
	33: 'PageUp',
	34: 'PageDown',
	35: 'End',
	36: 'Home',
	37: 'Left',
	38: 'Up',
	39: 'Right',
	40: 'Down',
	44: 'PrintScreen',
	45: 'Insert',
	46: 'Delete',
	106: 'nummult',
	107: 'numadd',
	109: 'numsub',
	110: 'numdec',
	111: 'numdiv',
	144: 'Numlock',
	145: 'Scrolllock',
	173: 'VolumeMute',
	174: 'VolumeDown',
	175: 'VolumeUp',
	176: 'MediaNextTrack',
	177: 'MediaPreviousTrack',
	178: 'MediaStop',
	179: 'MediaPlayPause',
	186: ';',
	187: '=',
	188: ',',
	189: '-',
	190: '.',
	191: '/',
	192: '`',
	219: '[',
	220: '\\',
	221: ']',
	222: "'",
};

function tokenForVirtualKey(vk: number): string | null {
	if ((vk >= 65 && vk <= 90) || (vk >= 48 && vk <= 57)) {
		return String.fromCharCode(vk); // A-Z, 0-9
	}
	if (vk >= 96 && vk <= 105) {
		return `num${vk - 96}`;
	}
	if (vk >= 112 && vk <= 135) {
		return `F${vk - 111}`;
	}
	return VIRTUAL_KEY_TOKENS[vk] ?? null;
}

// Fallback only: KeyboardEvent.code names a key by its US-layout position, so on
// another layout this can name a different key from the one pressed (see top).
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
	CapsLock: 'Capslock',
	NumLock: 'Numlock',
	ScrollLock: 'Scrolllock',
	NumpadDecimal: 'numdec',
	NumpadAdd: 'numadd',
	NumpadSubtract: 'numsub',
	NumpadMultiply: 'nummult',
	NumpadDivide: 'numdiv',
	AudioVolumeMute: 'VolumeMute',
	AudioVolumeDown: 'VolumeDown',
	AudioVolumeUp: 'VolumeUp',
	MediaTrackNext: 'MediaNextTrack',
	MediaTrackPrevious: 'MediaPreviousTrack',
	MediaStop: 'MediaStop',
	MediaPlayPause: 'MediaPlayPause',
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

function tokenForCode(press: KeyPress): string | null {
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

function mainKeyToken(press: KeyPress): string | null {
	const vk = press.keyCode;
	if (typeof vk === 'number' && vk > 0 && vk !== 229) {
		return tokenForVirtualKey(vk);
	}
	return tokenForCode(press);
}

// The accelerator modifiers a modifier KEY stands for, from KeyboardEvent.key;
// empty for any other key. AltGr arrives as two keys, a synthetic 'Control' and
// the right Alt reported as 'AltGraph' (never as 'Alt'). Windows matches a hot
// key pressed with AltGr as Ctrl+Alt, so 'AltGraph' stands for both.
export function modifiersOfKey(key: string): string[] {
	switch (key) {
		case 'Control':
			return ['Control'];
		case 'Alt':
			return ['Alt'];
		case 'AltGraph':
			return ['Control', 'Alt'];
		case 'Shift':
			return ['Shift'];
		case 'Meta':
		case 'OS':
		case 'Super':
			return ['Super'];
		default:
			return [];
	}
}

export function modifiersOf(press: KeyPress): string[] {
	const modifiers: string[] = [];
	if (press.ctrlKey) modifiers.push('Control');
	if (press.altKey) modifiers.push('Alt');
	if (press.shiftKey) modifiers.push('Shift');
	if (press.metaKey) modifiers.push('Super');
	return modifiers;
}

// `alsoHeld`: modifiers known to be part of the chord though this event does not
// report them. A key whose press Windows keeps from the page (PrintScreen, or a
// combination another application holds as a hot key) reaches it only on key
// RELEASE, by which time the user may already have let go of Ctrl — so a capture
// completing on keyup passes the modifiers it saw released just before.
export function acceleratorFromKeyPress(
	press: KeyPress,
	alsoHeld: readonly string[] = []
): KeyPressResult {
	const held = new Set([...modifiersOf(press), ...alsoHeld]);
	const modifiers = MODIFIER_ORDER.filter((name) => held.has(name));
	if (MODIFIER_KEYS.has(press.key)) {
		return { kind: 'modifier', modifiers };
	}
	const isEscape = press.code === 'Escape' || press.keyCode === 27;
	if (isEscape && modifiers.length === 0) {
		return { kind: 'cancel' };
	}
	const token = mainKeyToken(press);
	if (!token) {
		return { kind: 'unsupported', code: press.code };
	}
	return { kind: 'accelerator', accelerator: [...modifiers, token].join('+') };
}
