import { describe, expect, it } from 'vitest';
import { listForeignModules, selectForeignModules } from './foreign-modules';

const roots = {
	systemRoot: 'C:\\WINDOWS',
	execPath:
		'C:\\Users\\me\\AppData\\Local\\Programs\\iracing-screenshot-tool\\iRacing Screenshot Tool.exe',
};

describe('selectForeignModules', () => {
	it('keeps only modules outside %SystemRoot% and our install tree', () => {
		expect(
			selectForeignModules(
				[
					roots.execPath,
					'C:\\WINDOWS\\SYSTEM32\\ntdll.dll',
					'C:\\Windows\\System32\\DriverStore\\FileRepository\\nv_dispi.inf_amd64\\nvwgf2umx.dll',
					'C:\\Users\\me\\AppData\\Local\\Programs\\iracing-screenshot-tool\\resources\\native\\wgc-capture.node',
					'C:\\Program Files\\RivaTuner Statistics Server\\RTSSHooks64.dll',
					'C:\\ProgramData\\A-Volute\\Nahimic\\NahimicOSD.dll',
				],
				roots
			)
		).toEqual([
			'C:\\Program Files\\RivaTuner Statistics Server\\RTSSHooks64.dll',
			'C:\\ProgramData\\A-Volute\\Nahimic\\NahimicOSD.dll',
		]);
	});

	it('matches roots case-insensitively and slash-agnostically', () => {
		expect(
			selectForeignModules(
				[
					'c:/windows/system32/user32.dll',
					'C:/USERS/ME/APPDATA/LOCAL/PROGRAMS/IRACING-SCREENSHOT-TOOL/FFMPEG.DLL',
					'D:\\Tools\\hook.dll',
				],
				roots
			)
		).toEqual(['D:\\Tools\\hook.dll']);
	});

	it('falls back to a drive:\\windows\\ match when %SystemRoot% is unset', () => {
		expect(
			selectForeignModules(
				['C:\\Windows\\System32\\user32.dll', 'D:\\Tools\\hook.dll'],
				{ ...roots, systemRoot: undefined }
			)
		).toEqual(['D:\\Tools\\hook.dll']);
	});

	it('does not treat a sibling directory sharing our prefix as our install', () => {
		const sibling =
			'C:\\Users\\me\\AppData\\Local\\Programs\\iracing-screenshot-tool-hooks\\x.dll';
		expect(selectForeignModules([sibling], roots)).toEqual([sibling]);
	});

	it('deduplicates and caps the list with an explicit remainder', () => {
		const many = Array.from(
			{ length: 6 },
			(_, i) => `D:\\Tools\\hook${i}.dll`
		);
		expect(selectForeignModules([...many, many[0]], roots, 4)).toEqual([
			...many.slice(0, 4),
			'…(+2 more)',
		]);
	});
});

describe('listForeignModules', () => {
	it('reads the live process report as a string list (or null), never throwing', () => {
		const modules = listForeignModules();
		expect(modules === null || Array.isArray(modules)).toBe(true);
		for (const entry of modules ?? []) {
			expect(typeof entry).toBe('string');
		}
	});
});
