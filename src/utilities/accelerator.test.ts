import { acceleratorFromKeyPress, type KeyPress } from './accelerator';

function press(
	key: string,
	code: string,
	mods: Partial<Omit<KeyPress, 'key' | 'code'>> = {}
): KeyPress {
	return {
		key,
		code,
		ctrlKey: false,
		altKey: false,
		shiftKey: false,
		metaKey: false,
		...mods,
	};
}

const accel = (p: KeyPress) => {
	const result = acceleratorFromKeyPress(p);
	return result.kind === 'accelerator' ? result.accelerator : result;
};

describe('acceleratorFromKeyPress', () => {
	test('keeps the existing default binding exactly', () => {
		expect(
			accel(press('PrintScreen', 'PrintScreen', { ctrlKey: true }))
		).toBe('Control+PrintScreen');
	});

	// Each of these raw e.key joins made globalShortcut.register throw.
	describe('produces valid tokens where e.key did not', () => {
		test('arrows', () => {
			expect(accel(press('ArrowUp', 'ArrowUp', { ctrlKey: true }))).toBe(
				'Control+Up'
			);
		});
		test('space', () => {
			expect(accel(press(' ', 'Space', { ctrlKey: true }))).toBe(
				'Control+Space'
			);
		});
		test('the plus key is its unshifted character, Shift a modifier', () => {
			expect(accel(press('+', 'Equal', { shiftKey: true }))).toBe('Shift+=');
		});
		test('a dead key resolves to its physical key', () => {
			expect(accel(press('Dead', 'BracketLeft', { ctrlKey: true }))).toBe(
				'Control+['
			);
		});
		test('a non-ASCII label resolves to its physical key', () => {
			expect(accel(press('ò', 'Semicolon', { ctrlKey: true }))).toBe(
				'Control+;'
			);
		});
		test('a shifted digit names the digit, not the symbol', () => {
			expect(accel(press('!', 'Digit1', { shiftKey: true }))).toBe(
				'Shift+1'
			);
		});
	});

	describe('letters', () => {
		test('are upper-cased', () => {
			expect(accel(press('s', 'KeyS', { altKey: true }))).toBe('Alt+S');
		});
		test('follow the label on AZERTY, where Windows sends VK_A for it', () => {
			expect(accel(press('a', 'KeyQ', { ctrlKey: true }))).toBe('Control+A');
		});
		test('fall back to the physical key for non-Latin layouts', () => {
			expect(accel(press('ф', 'KeyA', { ctrlKey: true }))).toBe('Control+A');
		});
	});

	test('function keys, numpad and named keys', () => {
		expect(accel(press('F12', 'F12'))).toBe('F12');
		expect(accel(press('F24', 'F24', { shiftKey: true }))).toBe('Shift+F24');
		expect(accel(press('5', 'Numpad5', { ctrlKey: true }))).toBe(
			'Control+num5'
		);
		expect(accel(press('+', 'NumpadAdd'))).toBe('numadd');
		expect(accel(press('Enter', 'NumpadEnter'))).toBe('Enter');
		expect(accel(press('Home', 'Home', { metaKey: true }))).toBe(
			'Super+Home'
		);
	});

	test('modifiers come out in a fixed order', () => {
		expect(
			accel(
				press('K', 'KeyK', {
					shiftKey: true,
					metaKey: true,
					altKey: true,
					ctrlKey: true,
				})
			)
		).toBe('Control+Alt+Shift+Super+K');
	});

	test('a modifier on its own is not a binding', () => {
		expect(
			acceleratorFromKeyPress(
				press('Control', 'ControlLeft', { ctrlKey: true })
			)
		).toEqual({ kind: 'modifier', modifiers: ['Control'] });
		expect(
			acceleratorFromKeyPress(
				press('AltGraph', 'AltRight', { ctrlKey: true, altKey: true })
			)
		).toEqual({ kind: 'modifier', modifiers: ['Control', 'Alt'] });
	});

	test('Escape alone cancels; with a modifier it is a binding', () => {
		expect(acceleratorFromKeyPress(press('Escape', 'Escape'))).toEqual({
			kind: 'cancel',
		});
		expect(accel(press('Escape', 'Escape', { ctrlKey: true }))).toBe(
			'Control+Escape'
		);
	});

	test('keys no accelerator can name are reported, not guessed', () => {
		expect(acceleratorFromKeyPress(press('\\', 'IntlBackslash'))).toEqual({
			kind: 'unsupported',
			code: 'IntlBackslash',
		});
		expect(
			acceleratorFromKeyPress(press('ContextMenu', 'ContextMenu')).kind
		).toBe('unsupported');
	});
});
