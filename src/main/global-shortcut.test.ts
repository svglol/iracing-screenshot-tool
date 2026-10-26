import {
	rebindShortcut,
	registerShortcut,
	registerStartupShortcut,
	type ShortcutRegistry,
} from './global-shortcut';

// Behaves like Electron's globalShortcut as probed on Electron 41: register and
// unregister THROW on an accelerator they cannot parse, register returns false
// when another application owns the key.
const UNPARSEABLE = new Set(['Control', 'Control+ArrowUp', 'Control+ò', '']);

function fakeRegistry(ownedElsewhere: string[] = []) {
	const registered = new Set<string>();
	const registry: ShortcutRegistry = {
		register(accelerator) {
			if (UNPARSEABLE.has(accelerator)) {
				throw new Error(
					`Error processing argument at index 0, conversion failure from ${accelerator}`
				);
			}
			if (
				ownedElsewhere.includes(accelerator) ||
				registered.has(accelerator)
			) {
				return false;
			}
			registered.add(accelerator);
			return true;
		},
		unregister(accelerator) {
			if (UNPARSEABLE.has(accelerator)) {
				throw new Error('conversion failure');
			}
			registered.delete(accelerator);
		},
	};
	return { registry, registered };
}

const callback = () => {};

describe('registerShortcut', () => {
	test('registers a valid accelerator', () => {
		const { registry, registered } = fakeRegistry();
		expect(registerShortcut(registry, 'F12', callback)).toEqual({ ok: true });
		expect(registered.has('F12')).toBe(true);
	});

	test('reports an unparseable accelerator instead of throwing', () => {
		const { registry } = fakeRegistry();
		expect(registerShortcut(registry, 'Control+ArrowUp', callback)).toEqual(
			expect.objectContaining({ ok: false, failure: 'invalid' })
		);
	});

	test('reports a key another app owns as a conflict', () => {
		const { registry } = fakeRegistry(['F12']);
		expect(registerShortcut(registry, 'F12', callback)).toEqual(
			expect.objectContaining({ ok: false, failure: 'conflict' })
		);
	});

	test.each([undefined, null, '', '  ', 42])(
		'refuses a non-accelerator (%j)',
		(value) => {
			const { registry } = fakeRegistry();
			expect(registerShortcut(registry, value, callback)).toEqual(
				expect.objectContaining({ ok: false, failure: 'invalid' })
			);
		}
	);
});

describe('rebindShortcut', () => {
	test('moves the hotkey', () => {
		const { registry, registered } = fakeRegistry();
		registry.register('Control+PrintScreen', callback);
		expect(
			rebindShortcut(registry, 'Control+PrintScreen', 'F12', callback)
		).toEqual({ ok: true });
		expect([...registered]).toEqual(['F12']);
	});

	// Regression: the old handler unregistered first, then threw registering the
	// new accelerator — and the user had no hotkey at all.
	test('an unparseable new accelerator leaves the previous hotkey working', () => {
		const { registry, registered } = fakeRegistry();
		registry.register('Control+PrintScreen', callback);
		const result = rebindShortcut(
			registry,
			'Control+PrintScreen',
			'Control+ArrowUp',
			callback
		);
		expect(result.ok).toBe(false);
		expect([...registered]).toEqual(['Control+PrintScreen']);
	});

	test('a key another app owns leaves the previous hotkey working', () => {
		const { registry, registered } = fakeRegistry(['F12']);
		registry.register('Control+PrintScreen', callback);
		expect(
			rebindShortcut(registry, 'Control+PrintScreen', 'F12', callback)
		).toEqual(expect.objectContaining({ ok: false, failure: 'conflict' }));
		expect([...registered]).toEqual(['Control+PrintScreen']);
	});

	// Regression: an invalid saved hotkey made unregister throw, so even a valid
	// rebind failed until the app was restarted.
	test('recovers from an unparseable previous accelerator', () => {
		const { registry, registered } = fakeRegistry();
		expect(rebindShortcut(registry, 'Control', 'F12', callback)).toEqual({
			ok: true,
		});
		expect([...registered]).toEqual(['F12']);
	});

	test('rebinding to the same accelerator keeps it registered', () => {
		const { registry, registered } = fakeRegistry();
		registry.register('F12', callback);
		expect(rebindShortcut(registry, 'F12', 'F12', callback)).toEqual({
			ok: true,
		});
		expect([...registered]).toEqual(['F12']);
	});
});

describe('registerStartupShortcut', () => {
	test('registers the saved hotkey', () => {
		const { registry } = fakeRegistry();
		expect(
			registerStartupShortcut(
				registry,
				'F12',
				'Control+PrintScreen',
				callback
			)
		).toEqual({ active: 'F12', replacedInvalid: false, reason: null });
	});

	// Regression: this threw inside the async ready handler, so every handler
	// registered after it never existed.
	test('replaces an unparseable saved hotkey with the default', () => {
		const { registry, registered } = fakeRegistry();
		expect(
			registerStartupShortcut(
				registry,
				'Control+ò',
				'Control+PrintScreen',
				callback
			)
		).toEqual({
			active: 'Control+PrintScreen',
			replacedInvalid: true,
			reason: expect.stringContaining('conversion failure'),
		});
		expect([...registered]).toEqual(['Control+PrintScreen']);
	});

	test('keeps a saved hotkey another app owns, without registering anything', () => {
		const { registry, registered } = fakeRegistry(['F12']);
		expect(
			registerStartupShortcut(
				registry,
				'F12',
				'Control+PrintScreen',
				callback
			)
		).toEqual({
			active: null,
			replacedInvalid: false,
			reason: 'already registered by another application',
		});
		expect(registered.size).toBe(0);
	});

	test('reports no hotkey when even the default cannot be registered', () => {
		const { registry } = fakeRegistry(['Control+PrintScreen']);
		expect(
			registerStartupShortcut(registry, '', 'Control+PrintScreen', callback)
		).toEqual({
			active: null,
			replacedInvalid: true,
			reason: 'empty accelerator',
		});
	});
});
