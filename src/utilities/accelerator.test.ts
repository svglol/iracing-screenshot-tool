import {
	acceleratorFromKeyPress,
	modifiersOfKey,
	type KeyPress,
} from './accelerator';

// A key press as Chromium reports it on Windows: `keyCode` is the virtual key the
// active layout produced, `code` the US-position name, `key` the character.
function press(
	key: string,
	code: string,
	keyCode: number | undefined,
	mods: Partial<
		Pick<KeyPress, 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'>
	> = {}
): KeyPress {
	return {
		key,
		code,
		keyCode,
		ctrlKey: false,
		altKey: false,
		shiftKey: false,
		metaKey: false,
		...mods,
	};
}

const ctrl = { ctrlKey: true };

const accel = (p: KeyPress, alsoHeld: string[] = []) => {
	const result = acceleratorFromKeyPress(p, alsoHeld);
	return result.kind === 'accelerator' ? result.accelerator : result;
};

describe('acceleratorFromKeyPress', () => {
	test('keeps the existing default binding exactly', () => {
		expect(accel(press('PrintScreen', 'PrintScreen', 44, ctrl))).toBe(
			'Control+PrintScreen'
		);
	});

	// Each of these raw e.key joins made globalShortcut.register throw.
	describe('produces valid tokens where e.key did not', () => {
		test('arrows', () => {
			expect(accel(press('ArrowUp', 'ArrowUp', 38, ctrl))).toBe(
				'Control+Up'
			);
		});
		test('space', () => {
			expect(accel(press(' ', 'Space', 32, ctrl))).toBe('Control+Space');
		});
		test('the plus key is its base character, Shift a modifier', () => {
			expect(accel(press('+', 'Equal', 187, { shiftKey: true }))).toBe(
				'Shift+='
			);
		});
		test('a dead key resolves to its virtual key', () => {
			expect(accel(press('Dead', 'BracketLeft', 219, ctrl))).toBe(
				'Control+['
			);
		});
		test('a shifted digit names the digit, not the symbol', () => {
			expect(accel(press('!', 'Digit1', 49, { shiftKey: true }))).toBe(
				'Shift+1'
			);
		});
	});

	// Regression: the first version of this mapping went by KeyboardEvent.code,
	// the US-position name, and so registered a different key from the one
	// pressed on other layouts. Windows hot keys match VIRTUAL keys, which keyCode
	// reports for the active layout.
	describe('registers the key that was pressed, on any layout', () => {
		test('AZERTY: M sits where US has ";" and must stay M', () => {
			expect(accel(press('m', 'Semicolon', 77, ctrl))).toBe('Control+M');
		});
		test('AZERTY: the comma key sits where US has M and must stay ","', () => {
			expect(accel(press(',', 'KeyM', 188, ctrl))).toBe('Control+,');
		});
		test('AZERTY: A sits where US has Q', () => {
			expect(accel(press('a', 'KeyQ', 65, ctrl))).toBe('Control+A');
		});
		test('AZERTY digit row: the unshifted character is a symbol, the key is 1', () => {
			expect(accel(press('&', 'Digit1', 49, ctrl))).toBe('Control+1');
		});
		test('QWERTZ: ß reports VK_OEM_4, which Electron spells "["', () => {
			expect(accel(press('ß', 'Minus', 219, ctrl))).toBe('Control+[');
		});
		test('Cyrillic: a non-Latin label still names its virtual key', () => {
			expect(accel(press('ф', 'KeyA', 65, ctrl))).toBe('Control+A');
		});
	});

	// Regression: lock and media keys were bindable with the old capture and
	// Electron accepts them; the first version of this mapping refused them.
	test('lock and media keys', () => {
		expect(accel(press('CapsLock', 'CapsLock', 20, ctrl))).toBe(
			'Control+Capslock'
		);
		expect(accel(press('NumLock', 'NumLock', 144))).toBe('Numlock');
		expect(accel(press('ScrollLock', 'ScrollLock', 145))).toBe('Scrolllock');
		expect(accel(press('MediaPlayPause', 'MediaPlayPause', 179))).toBe(
			'MediaPlayPause'
		);
		expect(accel(press('AudioVolumeUp', 'AudioVolumeUp', 175, ctrl))).toBe(
			'Control+VolumeUp'
		);
	});

	test('function keys, numpad and named keys', () => {
		expect(accel(press('F12', 'F12', 123))).toBe('F12');
		expect(accel(press('F24', 'F24', 135, { shiftKey: true }))).toBe(
			'Shift+F24'
		);
		expect(accel(press('5', 'Numpad5', 101, ctrl))).toBe('Control+num5');
		expect(accel(press('+', 'NumpadAdd', 107))).toBe('numadd');
		expect(accel(press('Enter', 'NumpadEnter', 13))).toBe('Enter');
		expect(accel(press('Home', 'Home', 36, { metaKey: true }))).toBe(
			'Super+Home'
		);
	});

	test('modifiers come out in a fixed order', () => {
		expect(
			accel(
				press('K', 'KeyK', 75, {
					shiftKey: true,
					metaKey: true,
					altKey: true,
					ctrlKey: true,
				})
			)
		).toBe('Control+Alt+Shift+Super+K');
	});

	// Windows reports PrintScreen only on release; the user may have let go of
	// Ctrl first. The capture passes the modifiers it saw earlier in the chord.
	test('a key completed on release keeps modifiers released before it', () => {
		expect(accel(press('PrintScreen', 'PrintScreen', 44), ['Control'])).toBe(
			'Control+PrintScreen'
		);
		expect(
			accel(press('PrintScreen', 'PrintScreen', 44, ctrl), [
				'Control',
				'Shift',
			])
		).toBe('Control+Shift+PrintScreen');
	});

	test('a modifier on its own is not a binding', () => {
		expect(
			acceleratorFromKeyPress(press('Control', 'ControlLeft', 17, ctrl))
		).toEqual({ kind: 'modifier', modifiers: ['Control'] });
		expect(
			acceleratorFromKeyPress(
				press('AltGraph', 'AltRight', 18, { ctrlKey: true, altKey: true })
			)
		).toEqual({ kind: 'modifier', modifiers: ['Control', 'Alt'] });
	});

	test('Escape alone cancels; with a modifier it is a binding', () => {
		expect(acceleratorFromKeyPress(press('Escape', 'Escape', 27))).toEqual({
			kind: 'cancel',
		});
		expect(accel(press('Escape', 'Escape', 27, ctrl))).toBe('Control+Escape');
	});

	test('keys no accelerator can name are reported, not guessed', () => {
		// The ISO key between left Shift and Z (VK_OEM_102) has no Electron token.
		expect(acceleratorFromKeyPress(press('<', 'IntlBackslash', 226))).toEqual(
			{
				kind: 'unsupported',
				code: 'IntlBackslash',
			}
		);
		expect(
			acceleratorFromKeyPress(press('ContextMenu', 'ContextMenu', 93)).kind
		).toBe('unsupported');
	});

	describe('without a usable keyCode, falls back to the US-position name', () => {
		test('missing (a synthetic event)', () => {
			expect(accel(press('ArrowUp', 'ArrowUp', undefined, ctrl))).toBe(
				'Control+Up'
			);
			expect(accel(press('s', 'KeyS', undefined, { altKey: true }))).toBe(
				'Alt+S'
			);
		});
		test('229 (an IME composing)', () => {
			expect(accel(press('Process', 'KeyA', 229, ctrl))).toBe('Control+A');
		});
		test('a letter keeps its label even then', () => {
			expect(accel(press('a', 'KeyQ', 0, ctrl))).toBe('Control+A');
		});
	});
});

describe('modifiersOfKey', () => {
	test('names the modifier a released modifier key was', () => {
		expect(modifiersOfKey('Control')).toEqual(['Control']);
		expect(modifiersOfKey('Meta')).toEqual(['Super']);
	});
	// Windows matches a hot key pressed with AltGr as Ctrl+Alt.
	test('AltGr stands for Ctrl+Alt', () => {
		expect(modifiersOfKey('AltGraph')).toEqual(['Control', 'Alt']);
	});
	test('any other key is none', () => {
		expect(modifiersOfKey('F1')).toEqual([]);
		expect(modifiersOfKey('PrintScreen')).toEqual([]);
	});
});
