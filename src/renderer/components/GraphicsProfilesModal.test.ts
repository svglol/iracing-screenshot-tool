// @vitest-environment happy-dom
//
// Component tests for the graphics profile switcher.
//
// These exist because the failure this feature can produce is silent: an
// unregistered component renders nothing rather than throwing, and a missing
// translation key renders as the key. `npm run pack` catches neither. Mounting
// the modal against a stubbed IPC surface proves the template resolves, the
// three active-config states read correctly, and the iRacing guard reaches the
// button that matters.
//
// NOTE ON THE ELECTRON STUB: the component resolves ipcRenderer via a NATIVE
// `require('electron')`, which vi.mock cannot reach (it only intercepts the
// transformed import graph) — so the stub is planted in Node's require cache,
// the same approach TitleBar.test.ts and logger.integration.test.ts document.
import { createRequire } from 'module';
import { mount, flushPromises } from '@vue/test-utils';
import { i18n } from '../i18n';

const nodeRequire = createRequire(import.meta.url);

let invokeResults: Record<string, unknown> = {};
const invoked: Array<{ channel: string; args: unknown[] }> = [];
const listeners = new Map<string, (...args: unknown[]) => void>();

const ipcRendererStub = {
	on(channel: string, handler: (...args: unknown[]) => void) {
		listeners.set(channel, handler);
	},
	removeListener(channel: string) {
		listeners.delete(channel);
	},
	send: vi.fn(),
	sendSync: vi.fn(),
	invoke(channel: string, ...args: unknown[]) {
		invoked.push({ channel, args });
		if (!(channel in invokeResults)) {
			return Promise.reject(new Error(`no stub for ${channel}`));
		}
		return Promise.resolve(invokeResults[channel]);
	},
};

const id = nodeRequire.resolve('electron');
nodeRequire.cache[id] = {
	id,
	filename: id,
	loaded: true,
	exports: { ipcRenderer: ipcRendererStub },
} as unknown as NodeModule;

// Imported AFTER the stub is planted — the component captures ipcRenderer at
// module scope, so a later install would be too late.
const { default: GraphicsProfilesModal } =
	await import('./GraphicsProfilesModal.vue');

function profile(name: string, overrides: Record<string, unknown> = {}) {
	return {
		name,
		hash: `hash-${name}`,
		sizeBytes: 21000,
		modifiedAt: 1_700_000_000_000,
		valid: true,
		error: null,
		warnings: [],
		...overrides,
	};
}

function snapshot(overrides: Record<string, unknown> = {}) {
	return {
		profiles: [profile('Racing'), profile('Screenshots')],
		profilesDir: 'C:\\userData\\graphics-profiles',
		activeIniPath: 'C:\\Docs\\iRacing\\rendererDX11Monitor.ini',
		activeExists: true,
		active: { name: 'Screenshots', state: 'clean' },
		activeDifferences: null,
		iracingRunning: false,
		...overrides,
	};
}

// Oruga's components are registered as plugins in main.ts, which does not run in
// a unit test. Stubbing them to plain elements keeps the assertions about OUR
// template rather than Oruga's rendering.
const global = {
	plugins: [i18n],
	stubs: {
		'o-button': {
			template: '<button :disabled="disabled"><slot /></button>',
			props: ['disabled', 'loading'],
		},
		'o-input': {
			template: '<input />',
			props: ['modelValue', 'placeholder', 'size'],
		},
		'font-awesome-icon': true,
	},
};

async function mountModal(snap = snapshot()) {
	invokeResults = { 'profiles:list': snap };
	const wrapper = mount(GraphicsProfilesModal, { global });
	await flushPromises();
	return wrapper;
}

beforeEach(() => {
	invoked.length = 0;
	listeners.clear();
	invokeResults = {};
});

describe('rendering', () => {
	test('mounts and lists the stored profiles', async () => {
		// The blunt regression guard: an unregistered component or a template
		// error would render nothing at all.
		const wrapper = await mountModal();
		expect(wrapper.find('.profiles-card').exists()).toBe(true);
		expect(wrapper.text()).toContain('Racing');
		expect(wrapper.text()).toContain('Screenshots');
	});

	test('resolves every translation key it renders', async () => {
		// A missing key renders as the dotted key itself, which is greppable —
		// so assert none survived into the output.
		const wrapper = await mountModal();
		expect(wrapper.text()).not.toContain('graphicsProfiles.');
	});

	test('asks main for the snapshot on mount', async () => {
		await mountModal();
		expect(invoked.map((call) => call.channel)).toContain('profiles:list');
	});

	test('shows the empty state when nothing is stored', async () => {
		// Profiles are not auto-discovered from the iRacing folder, so this is
		// genuinely what a first run looks like.
		const wrapper = await mountModal(snapshot({ profiles: [] }));
		expect(wrapper.find('.profiles-empty').exists()).toBe(true);
	});
});

describe('active configuration state', () => {
	test('reports a clean match by name', async () => {
		const wrapper = await mountModal();
		expect(wrapper.text()).toContain('Matches your Screenshots profile');
	});

	test('reports a drifted config with its difference count', async () => {
		// The state users are in most of the time, because iRacing rewrites the
		// ini whenever it exits.
		const wrapper = await mountModal(
			snapshot({
				active: { name: 'Screenshots', state: 'modified' },
				activeDifferences: 5,
			})
		);
		expect(wrapper.text()).toContain(
			'Based on Screenshots, with 5 settings changed since'
		);
	});

	test('uses the singular form for a single changed setting', async () => {
		const wrapper = await mountModal(
			snapshot({
				active: { name: 'Racing', state: 'modified' },
				activeDifferences: 1,
			})
		);
		expect(wrapper.text()).toContain('with 1 setting changed');
	});

	test('falls back to a countless phrasing when the count is unavailable', async () => {
		const wrapper = await mountModal(
			snapshot({
				active: { name: 'Racing', state: 'modified' },
				activeDifferences: null,
			})
		);
		expect(wrapper.text()).toContain('Based on Racing, with changes since');
	});

	test('reports an unmatched configuration', async () => {
		const wrapper = await mountModal(
			snapshot({ active: { name: null, state: 'unknown' } })
		);
		expect(wrapper.text()).toContain('Does not match any stored profile');
	});

	test('reports a missing configuration', async () => {
		const wrapper = await mountModal(
			snapshot({
				activeExists: false,
				active: { name: null, state: 'unknown' },
			})
		);
		expect(wrapper.text()).toContain(
			'No iRacing graphics configuration was found'
		);
	});
});

describe('the iRacing-running guard', () => {
	test('explains why switching is blocked', async () => {
		const wrapper = await mountModal(snapshot({ iracingRunning: true }));
		expect(wrapper.find('.profiles-banner.is-blocking').exists()).toBe(true);
		expect(wrapper.text()).toContain('Close iRacing before switching');
	});

	test('disables every Load button while iRacing is running', async () => {
		// The reason the whole feature needs a guard: iRacing rewrites the ini
		// from memory on exit, so a load now would be silently undone.
		const wrapper = await mountModal(snapshot({ iracingRunning: true }));
		const loadButtons = wrapper
			.findAll('button')
			.filter((button) => button.text() === 'Load');
		expect(loadButtons.length).toBe(2);
		for (const button of loadButtons) {
			expect(button.attributes('disabled')).toBeDefined();
		}
	});

	test('disables Load only for the profile that is already the live config', async () => {
		// Default snapshot: Screenshots is the active profile with a CLEAN match,
		// so loading it again would change nothing. Racing stays loadable.
		const wrapper = await mountModal();
		const rowButton = (name: string) =>
			wrapper
				.find(`[data-profile-name="${name}"]`)
				.findAll('button')
				.find((button) => button.text() === 'Load');
		expect(rowButton('Screenshots')?.attributes('disabled')).toBeDefined();
		expect(rowButton('Racing')?.attributes('disabled')).toBeUndefined();
	});

	test('keeps Load enabled for a MODIFIED active profile', async () => {
		// A drifted config based on Screenshots is not Screenshots any more:
		// loading it then is a real action — restore the stored version and
		// discard the drift.
		const wrapper = await mountModal(
			snapshot({
				active: { name: 'Screenshots', state: 'modified' },
				activeDifferences: 3,
			})
		);
		const load = wrapper
			.find('[data-profile-name="Screenshots"]')
			.findAll('button')
			.find((button) => button.text() === 'Load');
		expect(load?.attributes('disabled')).toBeUndefined();
	});

	test('disables Load for a profile that is not a graphics config', async () => {
		const wrapper = await mountModal(
			snapshot({
				profiles: [
					profile('Broken', { valid: false, error: 'missingSections' }),
				],
			})
		);
		expect(wrapper.text()).toContain('Not a graphics config');
		const load = wrapper
			.findAll('button')
			.find((button) => button.text() === 'Load');
		expect(load?.attributes('disabled')).toBeDefined();
	});

	test('flags a profile iRacing would reset', async () => {
		const wrapper = await mountModal(
			snapshot({
				profiles: [profile('Racing', { warnings: ['autoCfgIncomplete'] })],
			})
		);
		expect(wrapper.text()).toContain('Will be reset by iRacing');
	});
});

describe('applying', () => {
	test('sends the profile name and reports the restart requirement', async () => {
		const wrapper = await mountModal();
		invokeResults['profiles:apply'] = {
			ok: true,
			applied: 'Racing',
			backedUp: true,
		};

		await wrapper.vm.apply('Racing');
		await flushPromises();

		const apply = invoked.find((call) => call.channel === 'profiles:apply');
		expect(apply?.args).toEqual(['Racing']);
		// Without this sentence a user has every reason to think it failed.
		expect(wrapper.text()).toContain('Start iRacing for it to take effect');
	});

	test('surfaces a refusal in the user language rather than as a code', async () => {
		const wrapper = await mountModal();
		invokeResults['profiles:apply'] = { ok: false, error: 'iracingRunning' };

		await wrapper.vm.apply('Racing');
		await flushPromises();

		expect(wrapper.find('.profiles-banner.is-danger').exists()).toBe(true);
		expect(wrapper.text()).toContain('Close iRacing first');
		expect(wrapper.text()).not.toContain('iracingRunning');
	});

	test('phrases an unrecognised error code rather than leaking it', async () => {
		const wrapper = await mountModal();
		invokeResults['profiles:apply'] = { ok: false, error: 'somethingNew' };

		await wrapper.vm.apply('Racing');
		await flushPromises();

		expect(wrapper.text()).not.toContain('somethingNew');
		expect(wrapper.text()).toContain('The file could not be written');
	});
});

describe('saving and deleting', () => {
	test('seeds the save name with the active profile', async () => {
		// The common case is re-saving the setup you are already on.
		const wrapper = await mountModal();
		await wrapper.vm.startSave();
		expect(wrapper.vm.nameInput).toBe('Screenshots');
	});

	test('reports a duplicate name in words', async () => {
		const wrapper = await mountModal();
		invokeResults['profiles:save'] = { ok: false, error: 'duplicate' };
		wrapper.vm.nameInput = 'Racing';

		await wrapper.vm.confirmSave();
		await flushPromises();

		expect(wrapper.text()).toContain(
			'A profile with that name already exists'
		);
	});

	test('a duplicate CONFIGURATION names the profile that already holds it', async () => {
		// Telling the user "duplicate" without saying which profile would send
		// them diffing ini files by hand.
		const wrapper = await mountModal();
		invokeResults['profiles:save'] = {
			ok: false,
			error: 'duplicateContent',
			duplicateOf: 'Screenshots',
		};
		wrapper.vm.nameInput = 'Racing copy';

		await wrapper.vm.confirmSave();
		await flushPromises();
		// flagDuplicate re-applies the class on the next tick so the animation can
		// restart on a repeat refusal; let that tick land before asserting.
		await flushPromises();

		expect(wrapper.text()).toContain(
			'A profile with these exact settings already exists: Screenshots.'
		);
		// The row itself is flagged too — the class drives the shake and glow
		// that point the eye at the right line in the list.
		const flagged = wrapper.find('.profiles-row.is-duplicate');
		expect(flagged.exists()).toBe(true);
		expect(flagged.text()).toContain('Screenshots');
	});

	test('clicking the name turns it into an editor seeded with the name', async () => {
		// There is no Rename button; the name itself is the control.
		const wrapper = await mountModal();
		await wrapper
			.find('[data-profile-name="Racing"] .profiles-row__name')
			.trigger('click');

		const editor = wrapper.find(
			'[data-profile-name="Racing"] .profiles-row__name-edit'
		);
		expect(editor.exists()).toBe(true);
		expect(wrapper.vm.nameInput).toBe('Racing');
	});

	test('Enter commits the rename', async () => {
		const wrapper = await mountModal();
		invokeResults['profiles:rename'] = { ok: true, name: 'Endurance' };

		await wrapper
			.find('[data-profile-name="Racing"] .profiles-row__name')
			.trigger('click');
		wrapper.vm.nameInput = 'Endurance';
		await wrapper
			.find('.profiles-row__name-edit')
			.trigger('keyup', { key: 'Enter' });
		await flushPromises();

		const rename = invoked.find((call) => call.channel === 'profiles:rename');
		expect(rename?.args).toEqual([{ from: 'Racing', to: 'Endurance' }]);
	});

	test('Escape abandons the rename without a call', async () => {
		const wrapper = await mountModal();
		await wrapper
			.find('[data-profile-name="Racing"] .profiles-row__name')
			.trigger('click');
		wrapper.vm.nameInput = 'Endur';
		await wrapper
			.find('.profiles-row__name-edit')
			.trigger('keyup', { key: 'Escape' });
		await flushPromises();

		expect(wrapper.find('.profiles-row__name-edit').exists()).toBe(false);
		expect(invoked.some((call) => call.channel === 'profiles:rename')).toBe(
			false
		);
	});

	test('blur commits a real change', async () => {
		const wrapper = await mountModal();
		invokeResults['profiles:rename'] = { ok: true, name: 'Endurance' };

		await wrapper
			.find('[data-profile-name="Racing"] .profiles-row__name')
			.trigger('click');
		wrapper.vm.nameInput = 'Endurance';
		await wrapper.find('.profiles-row__name-edit').trigger('blur');
		await flushPromises();

		const rename = invoked.find((call) => call.channel === 'profiles:rename');
		expect(rename?.args).toEqual([{ from: 'Racing', to: 'Endurance' }]);
	});

	test('blur with the name unchanged is a silent no-op', async () => {
		// A click into the name followed by a click elsewhere must not rename,
		// toast, or error.
		const wrapper = await mountModal();
		await wrapper
			.find('[data-profile-name="Racing"] .profiles-row__name')
			.trigger('click');
		await wrapper.find('.profiles-row__name-edit').trigger('blur');
		await flushPromises();

		expect(wrapper.find('.profiles-row__name-edit').exists()).toBe(false);
		expect(invoked.some((call) => call.channel === 'profiles:rename')).toBe(
			false
		);
		expect(wrapper.vm.feedback).toBe('');
	});

	test('asks before deleting', async () => {
		const wrapper = await mountModal();
		await wrapper.vm.startDelete('Racing');
		await flushPromises();
		expect(wrapper.text()).toContain('Delete Racing?');
		// Nothing sent until the confirmation is taken.
		expect(invoked.some((call) => call.channel === 'profiles:delete')).toBe(
			false
		);
	});

	test('deletes only after confirmation', async () => {
		const wrapper = await mountModal();
		invokeResults['profiles:delete'] = { ok: true };

		await wrapper.vm.startDelete('Racing');
		await wrapper.vm.confirmDelete('Racing');
		await flushPromises();

		const call = invoked.find((entry) => entry.channel === 'profiles:delete');
		expect(call?.args).toEqual(['Racing']);
	});
});

describe('import and export', () => {
	test('opens the import dialog where the live config lives', async () => {
		// So the user's hand-managed "rendererDX11Monitor - Racing.ini" variants
		// are right there, rather than wherever the dialog last happened to be.
		const wrapper = await mountModal();
		invokeResults['dialog:showOpen'] = { canceled: true, filePaths: [] };

		await wrapper.vm.importFromDisk();
		await flushPromises();

		const dialog = invoked.find((call) => call.channel === 'dialog:showOpen');
		expect(dialog?.args[0]).toMatchObject({
			defaultPath: 'C:\\Docs\\iRacing\\rendererDX11Monitor.ini',
		});
	});

	test('strips the hand-managed filename convention when naming an import', async () => {
		const wrapper = await mountModal();
		invokeResults['dialog:showOpen'] = {
			canceled: false,
			filePaths: ['C:\\Docs\\iRacing\\rendererDX11Monitor - Racing.ini'],
		};
		invokeResults['profiles:import'] = { ok: true, name: 'Racing' };

		await wrapper.vm.importFromDisk();
		await flushPromises();

		const call = invoked.find((entry) => entry.channel === 'profiles:import');
		expect(call?.args[0]).toEqual({
			sourcePath: 'C:\\Docs\\iRacing\\rendererDX11Monitor - Racing.ini',
			name: 'Racing',
		});
	});

	test('does nothing when the import dialog is cancelled', async () => {
		const wrapper = await mountModal();
		invokeResults['dialog:showOpen'] = { canceled: true, filePaths: [] };

		await wrapper.vm.importFromDisk();
		await flushPromises();

		expect(invoked.some((call) => call.channel === 'profiles:import')).toBe(
			false
		);
	});

	test('exports under the convention users already keep by hand', async () => {
		const wrapper = await mountModal();
		invokeResults['dialog:showSave'] = { canceled: true, filePath: null };

		await wrapper.vm.exportProfile('Racing');
		await flushPromises();

		const dialog = invoked.find((call) => call.channel === 'dialog:showSave');
		expect(dialog?.args[0]).toMatchObject({
			defaultPath: 'rendererDX11Monitor - Racing.ini',
		});
	});
});

describe('live iRacing status', () => {
	test('re-reads the snapshot when iRacing connects', async () => {
		// The guard has to relax and tighten while the modal is open, not only at
		// the moment it was opened.
		const wrapper = await mountModal();
		expect(wrapper.find('.profiles-banner.is-blocking').exists()).toBe(false);

		invokeResults['profiles:list'] = snapshot({ iracingRunning: true });
		listeners.get('iracing-connected')?.();
		await flushPromises();

		expect(wrapper.find('.profiles-banner.is-blocking').exists()).toBe(true);
	});

	test('stops listening once unmounted', async () => {
		const wrapper = await mountModal();
		wrapper.unmount();
		expect(listeners.has('iracing-connected')).toBe(false);
		expect(listeners.has('iracing-disconnected')).toBe(false);
	});
});
