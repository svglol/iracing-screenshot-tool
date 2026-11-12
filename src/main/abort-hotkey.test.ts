import { AbortHotkey, displayAccelerator } from './abort-hotkey';

vi.mock('../utilities/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
	}),
}));

function registry(taken: string[] = []) {
	const held = new Map<string, () => void>();
	return {
		held,
		register: vi.fn((key: string, cb: () => void) => {
			if (taken.includes(key) || held.has(key)) {
				return false;
			}
			held.set(key, cb);
			return true;
		}),
		unregister: vi.fn((key: string) => {
			held.delete(key);
		}),
	};
}

describe('AbortHotkey', () => {
	test('holds the key only between arm and disarm', () => {
		const r = registry();
		const hotkey = new AbortHotkey(r);
		const onPress = vi.fn();
		expect(hotkey.arm('Escape', onPress)).toBe(true);
		r.held.get('Escape')?.();
		expect(onPress).toHaveBeenCalledTimes(1);
		hotkey.disarm();
		expect(r.held.size).toBe(0);
		expect(hotkey.armedKey).toBeNull();
		// Twice is harmless.
		hotkey.disarm();
		expect(r.unregister).toHaveBeenCalledTimes(1);
	});

	test('arming again replaces the previous key', () => {
		const r = registry();
		const hotkey = new AbortHotkey(r);
		hotkey.arm('Escape', vi.fn());
		hotkey.arm('Control+End', vi.fn());
		expect([...r.held.keys()]).toEqual(['Control+End']);
	});

	test('a key clashing with the screenshot key is not armed', () => {
		const r = registry();
		const hotkey = new AbortHotkey(r);
		expect(
			hotkey.arm('PrintScreen+Ctrl', vi.fn(), ['Control+PrintScreen'])
		).toBe(false);
		expect(r.register).not.toHaveBeenCalled();
	});

	test('empty, taken, or malformed keys leave it disarmed without throwing', () => {
		const r = registry(['Escape']);
		const hotkey = new AbortHotkey(r);
		expect(hotkey.arm('', vi.fn())).toBe(false);
		expect(hotkey.arm('Escape', vi.fn())).toBe(false);
		r.register.mockImplementationOnce(() => {
			throw new Error('bad accelerator');
		});
		expect(hotkey.arm('Nonsense+', vi.fn())).toBe(false);
		expect(hotkey.armedKey).toBeNull();
	});
});

describe('displayAccelerator', () => {
	test('shortens the common names', () => {
		expect(displayAccelerator('Escape')).toBe('Esc');
		expect(displayAccelerator('Control+Shift+End')).toBe('Ctrl+Shift+End');
	});
});
