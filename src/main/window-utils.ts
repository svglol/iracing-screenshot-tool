import { spawn, spawnSync } from 'child_process';
import { createLogger } from '../utilities/logger';

const log = createLogger('window-utils');

const IRACING_PROCESS_NAME = 'iRacingSim64DX11';
const IRACING_PROCESS_EXE = `${IRACING_PROCESS_NAME}.exe`;

export interface IRacingWindowDetails {
	handle: string;
	title: string;
	left: number;
	top: number;
	width: number;
	height: number;
}

// Result of the exclusive-fullscreen pre-flight (#10). `state` is the raw
// QUERY_USER_NOTIFICATION_STATE; `attributed` is whether iRacing (not some other
// app) is the foreground/display-owning window; `exclusiveFullscreen` is the
// actionable conclusion (state 3 AND attributed).
export interface ExclusiveFullscreenState {
	state: number;
	attributed: boolean;
	exclusiveFullscreen: boolean;
}

// ---------------------------------------------------------------------------
// Win32 numeric constants (see MS Learn winuser.h / tlhelp32.h). Exported so
// the pure helpers below can be exercised without touching the FFI layer.
// ---------------------------------------------------------------------------
const SWP_NOZORDER = 0x0004;
const SWP_NOACTIVATE = 0x0010;
const SWP_NOSENDCHANGING = 0x0400;
const HWND_TOP = 0;
const HWND_NOTOPMOST = -2;
const SW_RESTORE = 9;
const GW_OWNER = 4;
const TH32CS_SNAPPROCESS = 0x00000002;
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
const TOKEN_QUERY = 0x0008;
// TOKEN_INFORMATION_CLASS values.
const TOKEN_INTEGRITY_LEVEL = 25;
const TOKEN_ELEVATION = 20;

// shell32 SHQueryUserNotificationState (#10 exclusive-fullscreen detection).
// S_OK means the read is valid; QUNS_RUNNING_D3D_FULL_SCREEN (3) is the ONLY
// value that means a DWM-bypassing exclusive-fullscreen D3D app (capture → black).
// QUNS_BUSY (2) is borderless / flip-model / fullscreen-optimized — composited,
// captures fine — so this is a strict `=== 3` test, never a range.
const S_OK = 0;
export const QUNS_RUNNING_D3D_FULL_SCREEN = 3;

// ---------------------------------------------------------------------------
// Pure helpers (no FFI) — unit-tested in window-utils.test.ts
// ---------------------------------------------------------------------------

// Toolhelp reports the image name only (e.g. "iRacingSim64DX11.exe"); Windows
// file names are case-insensitive.
export function matchesIracingExe(exeName: unknown): boolean {
	return (
		typeof exeName === 'string' &&
		exeName.toLowerCase() === IRACING_PROCESS_EXE.toLowerCase()
	);
}

// Electron's desktopCapturer embeds the HWND in its window source id as a
// base-10 integer ("window:<hwnd>:0"). koffi.address() returns a BigInt, so
// keep full precision via toString() rather than routing through Number.
export function formatWindowHandle(address: bigint | number): string {
	return typeof address === 'bigint'
		? address.toString()
		: String(Math.trunc(Number(address)));
}

// Exclusive fullscreen iff the shell read succeeded (S_OK), the state is exactly
// QUNS_RUNNING_D3D_FULL_SCREEN, AND the fullscreen app is attributed to iRacing.
// SHQueryUserNotificationState is session-global (it doesn't say WHICH app), so
// attribution (foreground window == iRacing) is mandatory — otherwise another
// game's exclusive fullscreen would trip an iRacing-specific warning.
export function isExclusiveFullscreenState(
	hr: number,
	state: number,
	attributed: boolean
): boolean {
	return hr === S_OK && state === QUNS_RUNNING_D3D_FULL_SCREEN && attributed;
}

// Two SetWindowPos policies. Pre-capture RAISES iRacing into the foreground so
// the compositor renders it on top for the desktop grab. Restore puts geometry
// back WITHOUT stealing focus or reordering the Z-stack (SWP_NOACTIVATE |
// SWP_NOZORDER). SWP_NOSENDCHANGING stops the app vetoing/clamping the size via
// WM_WINDOWPOSCHANGING in both cases.
export function resolveResizePlacement(raise: boolean): {
	insertAfter: number;
	flags: number;
} {
	if (raise) {
		return { insertAfter: HWND_TOP, flags: SWP_NOSENDCHANGING };
	}
	// SWP_NOZORDER makes hWndInsertAfter inert, so HWND_NOTOPMOST here is purely
	// documentary — the restore deliberately leaves the Z-order untouched. (The
	// pre-capture path raises with HWND_TOP, never HWND_TOPMOST, so iRacing never
	// acquires a topmost bit that would need clearing.)
	return {
		insertAfter: HWND_NOTOPMOST,
		flags: SWP_NOACTIVATE | SWP_NOZORDER | SWP_NOSENDCHANGING,
	};
}

// ---------------------------------------------------------------------------
// iRacing running as administrator
//
// Field cases 2026-10-09 and 2026-11-12: iRacing itself ran elevated while this
// tool did not. Windows' UIPI then refuses every SetWindowPos on iRacing's
// window with ERROR_ACCESS_DENIED (5), so captures came out at the desktop size
// whatever resolution was picked. Worse, the SDK's replay and camera commands
// are broadcast window messages (irsdk SendNotifyMessage(HWND_BROADCAST, ...)),
// which UIPI drops silently on the way to a higher-integrity window: long
// exposure's seeks "did not land" with the replay never having moved. Telemetry
// still reads (shared memory), so the tool looked connected throughout.
// ---------------------------------------------------------------------------
export const ERROR_ACCESS_DENIED = 5;

// What a resize reports back. `accessDenied` is the UIPI refusal above: the
// window was found but did not move. Any other failure is logged and treated as
// done, as before (geometry the compositor clamped, a stale handle).
export interface IracingResize {
	handle: number;
	accessDenied: boolean;
}

// The access probe's verdict from one SetWindowPos: true = refused by UIPI,
// false = allowed, null = failed for some other reason (unknown, fail open).
export function classifyAccessProbe(
	ok: boolean,
	lastError: number
): boolean | null {
	if (ok) {
		return false;
	}
	return lastError === ERROR_ACCESS_DENIED ? true : null;
}

// ---------------------------------------------------------------------------
// Process rights: who runs with more rights, iRacing or this tool?
//
// Windows decides UIPI (the refused resize, the dropped SDK broadcasts) by
// INTEGRITY LEVEL, so that is what is compared; the elevated flag is kept for
// the log and as a fallback. Both are read from the process token, which a
// normal-rights process can open on an elevated process of the same user
// (PROCESS_QUERY_LIMITED_INFORMATION + TOKEN_QUERY; checked on the dev machine
// 2026-11-12 against elevated vendor helpers). A protected process refuses the
// token (audiodg: open-token:5) — anti-cheat could do the same to iRacing,
// which is itself worth logging.
// ---------------------------------------------------------------------------

// Mandatory-label RIDs (winnt.h SECURITY_MANDATORY_*_RID).
export const INTEGRITY_MEDIUM = 0x2000;
export const INTEGRITY_HIGH = 0x3000;

export interface ProcessRights {
	elevated: boolean | null;
	// The mandatory-label RID: 0x2000 normal, 0x3000 administrator.
	integrity: number | null;
	// Why it could not be read ('open-process:5', 'open-token:5'), else null.
	error: string | null;
}

export type RightsVerdict =
	| 'same'
	| 'iracing-higher'
	| 'tool-higher'
	| 'unknown';

export interface IracingRightsReport {
	self: ProcessRights;
	iracing: ProcessRights & { pid: number };
	// The process that started iRacing, when it is still running: an elevated
	// launcher hands its rights to the sim. Null when it has exited.
	launcher: (ProcessRights & { pid: number; name: string }) | null;
	verdict: RightsVerdict;
}

export function integrityName(rid: number | null): string | null {
	if (rid === null) {
		return null;
	}
	if (rid < 0x1000) {
		return 'untrusted';
	}
	if (rid < INTEGRITY_MEDIUM) {
		return 'low';
	}
	if (rid < INTEGRITY_HIGH) {
		return 'medium';
	}
	return rid < 0x4000 ? 'high' : 'system';
}

// The RID out of a TOKEN_MANDATORY_LABEL buffer. The label's SID pointer points
// back into the same buffer, so rather than chase it, find the SID itself:
// S-1-16-<rid> is revision 1, one sub-authority, authority {0,0,0,0,0,16}.
export function parseIntegrityRid(
	buffer: Buffer,
	length: number
): number | null {
	const end = Math.min(length, buffer.length) - 12;
	for (let i = 0; i <= end; i += 1) {
		if (
			buffer[i] === 1 &&
			buffer[i + 1] === 1 &&
			buffer[i + 2] === 0 &&
			buffer[i + 3] === 0 &&
			buffer[i + 4] === 0 &&
			buffer[i + 5] === 0 &&
			buffer[i + 6] === 0 &&
			buffer[i + 7] === 16
		) {
			return buffer.readUInt32LE(i + 8);
		}
	}
	return null;
}

// Integrity decides UIPI, so it wins when both are known; the elevated flags
// stand in when a level could not be read.
export function compareProcessRights(
	self: ProcessRights,
	iracing: ProcessRights
): RightsVerdict {
	if (self.integrity !== null && iracing.integrity !== null) {
		if (self.integrity === iracing.integrity) {
			return 'same';
		}
		return iracing.integrity > self.integrity
			? 'iracing-higher'
			: 'tool-higher';
	}
	if (self.elevated !== null && iracing.elevated !== null) {
		if (self.elevated === iracing.elevated) {
			return 'same';
		}
		return iracing.elevated ? 'iracing-higher' : 'tool-higher';
	}
	return 'unknown';
}

// Whether a process runs as administrator, for the messages: the flag when
// known, else read off the level.
export function runsAsAdministrator(rights: ProcessRights): boolean | null {
	if (rights.elevated !== null) {
		return rights.elevated;
	}
	return rights.integrity === null ? null : rights.integrity >= INTEGRITY_HIGH;
}

// Thrown by the native layer when the iRacing PROCESS is found but no matching
// top-level window resolves. That is distinct from "iRacing not running" (no
// process): the process being present means the window really should exist, so
// the public wrappers treat this as the FFI misbehaving and fall back to
// PowerShell — WITHOUT disabling the native path (it isn't broken, it just
// couldn't resolve the window this once).
class IracingWindowUnresolvedError extends Error {}

// ---------------------------------------------------------------------------
// Native (koffi FFI) layer
//
// Replaces the PowerShell spawns below with in-process user32/kernel32 calls.
// This removes ~1s/screenshot (no CLR + Add-Type cold spawn) and — crucially —
// runs in Chromium's per-monitor-v2 DPI context, so SetWindowPos/GetWindowRect
// operate in physical pixels. That fixes high-res capture on 125/150%-scaled
// monitors, where the PowerShell child ran in a different DPI context and the
// resize never converged on the requested size. Width/height are already
// physical pixels and are passed AS-IS (no ×scaleFactor); left/top likewise.
//
// The PowerShell path is kept as an automatic fallback so capture keeps working
// if the FFI misbehaves. Two tiers: a genuine FFI fault (koffi won't load, or a
// call throws) disables native for the session; a "process present but window
// unresolved" signal falls back for that one call while leaving native enabled.
// "iRacing not running" (no process) returns undefined with no wasted spawn.
// ---------------------------------------------------------------------------

interface NativeApi {
	getDetails(): IRacingWindowDetails | undefined;
	resize(
		width: number,
		height: number,
		left: number,
		top: number,
		raise: boolean
	): IracingResize | undefined;
	probeWindowAccess(): boolean | null;
	getIracingRights(): IracingRightsReport | undefined;
	readRights(pid: number): ProcessRights;
	getExclusiveFullscreenState(): ExclusiveFullscreenState;
}

// undefined = not yet initialized; null = unavailable (fall back to PowerShell)
let nativeApi: NativeApi | null | undefined;

function getNativeApi(): NativeApi | null {
	if (nativeApi === undefined) {
		nativeApi = createNativeApi();
	}
	return nativeApi;
}

// One FFI failure disables native for the rest of the session so we don't
// repeatedly throw; PowerShell takes over from here.
function disableNative(where: string, error: unknown): void {
	nativeApi = null;
	log.warn('native FFI failed; using PowerShell fallback', {
		where,
		error: (error as Error)?.message || String(error),
	});
}

// Shared fallback policy for the three public entry points. A window-unresolved
// signal means iRacing is running but native couldn't find its window: cross-
// check with PowerShell for THIS call but keep native enabled. Any other error
// is a genuine FFI fault: disable native for the session, then fall back.
function shouldKeepNativeAfter(where: string, error: unknown): void {
	if (error instanceof IracingWindowUnresolvedError) {
		log.warn('native window unresolved; cross-checking via PowerShell', {
			where,
			error: error.message,
		});
		return;
	}
	disableNative(where, error);
}

function createNativeApi(): NativeApi | null {
	if (process.platform !== 'win32') {
		return null;
	}

	// koffi ships a prebuilt N-API binary; require() only throws if the package
	// is missing entirely. koffi.load() (below) throws on a DLL/arch mismatch.
	// koffi's runtime surface is dynamic (FFI marshalling); it is intentionally
	// left untyped rather than modelled with a partial interface.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let koffi: any;
	try {
		koffi = require('koffi');
	} catch {
		return null;
	}
	if (!koffi) {
		return null;
	}

	try {
		// Register opaque HWND/HANDLE aliases so the prototype strings below read
		// like the Win32 headers; the return values themselves are unused.
		koffi.pointer('HWND', koffi.opaque());
		koffi.pointer('HANDLE', koffi.opaque());

		koffi.struct('RECT', {
			left: 'int32_t',
			top: 'int32_t',
			right: 'int32_t',
			bottom: 'int32_t',
		});
		const PROCESSENTRY32W = koffi.struct('PROCESSENTRY32W', {
			dwSize: 'uint32_t',
			cntUsage: 'uint32_t',
			th32ProcessID: 'uint32_t',
			// ULONG_PTR — 8 bytes on x64. Mapping this to uint32_t would shift
			// every following field and corrupt the szExeFile read.
			th32DefaultHeapID: 'uintptr_t',
			th32ModuleID: 'uint32_t',
			cntThreads: 'uint32_t',
			th32ParentProcessID: 'uint32_t',
			pcPriClassBase: 'int32_t',
			dwFlags: 'uint32_t',
			szExeFile: koffi.array('char16_t', 260, 'String'),
		});
		koffi.proto('bool __stdcall EnumWindowsProc(HWND hwnd, intptr_t lParam)');

		const user32 = koffi.load('user32.dll');
		const kernel32 = koffi.load('kernel32.dll');
		const shell32 = koffi.load('shell32.dll');

		// hWndInsertAfter is declared intptr_t (not HWND) so the numeric HWND_TOP
		// (0) / HWND_NOTOPMOST (-2) sentinels can be passed directly — koffi opaque
		// pointers can't be rebuilt from a raw integer.
		const SetWindowPos = user32.func(
			'bool __stdcall SetWindowPos(HWND hWnd, intptr_t hWndInsertAfter, int X, int Y, int cx, int cy, uint32_t uFlags)'
		);
		const GetWindowRect = user32.func(
			'bool __stdcall GetWindowRect(HWND hWnd, _Out_ RECT *lpRect)'
		);
		const GetWindowTextW = user32.func(
			'int __stdcall GetWindowTextW(HWND hWnd, uint16_t *lpString, int nMaxCount)'
		);
		const ShowWindow = user32.func(
			'bool __stdcall ShowWindow(HWND hWnd, int nCmdShow)'
		);
		const IsIconic = user32.func('bool __stdcall IsIconic(HWND hWnd)');
		const IsZoomed = user32.func('bool __stdcall IsZoomed(HWND hWnd)');
		const BringWindowToTop = user32.func(
			'bool __stdcall BringWindowToTop(HWND hWnd)'
		);
		const SetForegroundWindow = user32.func(
			'bool __stdcall SetForegroundWindow(HWND hWnd)'
		);
		const EnumWindows = user32.func(
			'bool __stdcall EnumWindows(EnumWindowsProc *lpEnumFunc, intptr_t lParam)'
		);
		const GetWindowThreadProcessId = user32.func(
			'uint32_t __stdcall GetWindowThreadProcessId(HWND hWnd, _Out_ uint32_t *lpdwProcessId)'
		);
		const IsWindowVisible = user32.func(
			'bool __stdcall IsWindowVisible(HWND hWnd)'
		);
		const GetWindow = user32.func(
			'HWND __stdcall GetWindow(HWND hWnd, uint32_t uCmd)'
		);
		const GetForegroundWindow = user32.func(
			'HWND __stdcall GetForegroundWindow()'
		);
		// HRESULT out-param via a JS array [0], same convention as
		// GetWindowThreadProcessId's lpdwProcessId below. 'long' = 4-byte HRESULT.
		const SHQueryUserNotificationState = shell32.func(
			'long __stdcall SHQueryUserNotificationState(_Out_ int *pquns)'
		);
		const CreateToolhelp32Snapshot = kernel32.func(
			'HANDLE __stdcall CreateToolhelp32Snapshot(uint32_t dwFlags, uint32_t th32ProcessID)'
		);
		const Process32FirstW = kernel32.func(
			'bool __stdcall Process32FirstW(HANDLE hSnapshot, _Inout_ PROCESSENTRY32W *lppe)'
		);
		const Process32NextW = kernel32.func(
			'bool __stdcall Process32NextW(HANDLE hSnapshot, _Inout_ PROCESSENTRY32W *lppe)'
		);
		const CloseHandle = kernel32.func(
			'bool __stdcall CloseHandle(HANDLE hObject)'
		);
		const GetLastError = kernel32.func('uint32_t __stdcall GetLastError()');

		// Process rights (see ProcessRights). Bound on their own: a failure here
		// leaves the rights unknown and must not take the resize path down with
		// it. BOOL parameters are declared int: BOOL is 4 bytes, koffi's bool is
		// C's 1-byte bool.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let rightsFns: Record<string, any> | null = null;
		try {
			const advapi32 = koffi.load('advapi32.dll');
			rightsFns = {
				OpenProcess: kernel32.func(
					'HANDLE __stdcall OpenProcess(uint32_t dwDesiredAccess, int bInheritHandle, uint32_t dwProcessId)'
				),
				GetProcessTimes: kernel32.func(
					'int __stdcall GetProcessTimes(HANDLE hProcess, _Out_ uint64_t *lpCreationTime, _Out_ uint64_t *lpExitTime, _Out_ uint64_t *lpKernelTime, _Out_ uint64_t *lpUserTime)'
				),
				OpenProcessToken: advapi32.func(
					'int __stdcall OpenProcessToken(HANDLE ProcessHandle, uint32_t DesiredAccess, _Out_ HANDLE *TokenHandle)'
				),
				GetTokenInformation: advapi32.func(
					'int __stdcall GetTokenInformation(HANDLE TokenHandle, int TokenInformationClass, _Out_ uint8_t *TokenInformation, uint32_t TokenInformationLength, _Out_ uint32_t *ReturnLength)'
				),
			};
		} catch (error) {
			log.warn('Process-rights FFI unavailable', {
				error: (error as Error)?.message || String(error),
			});
		}

		// CreateToolhelp32Snapshot returns INVALID_HANDLE_VALUE ((HANDLE)-1), not
		// NULL, on failure. koffi.address() may surface that as the unsigned or the
		// signed representation depending on version, so reject both plus null.
		const isBadHandle = (handle: unknown): boolean => {
			const addr = koffi.address(handle);
			return addr === 0n || addr === -1n || addr === 0xffffffffffffffffn;
		};

		// PID of iRacingSim64DX11.exe via a process snapshot, or undefined.
		const findIracingPid = (): number | undefined => {
			const snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
			if (isBadHandle(snapshot)) {
				return undefined;
			}
			try {
				// dwSize MUST be preset or Process32FirstW fails (ERROR_BAD_LENGTH).
				// koffi fills the remaining fields in place on each call.
				const entry: {
					dwSize: number;
					th32ProcessID?: number;
					szExeFile?: string;
				} = { dwSize: koffi.sizeof(PROCESSENTRY32W) };
				let ok = Process32FirstW(snapshot, entry);
				while (ok) {
					if (matchesIracingExe(entry.szExeFile)) {
						return entry.th32ProcessID;
					}
					ok = Process32NextW(snapshot, entry);
				}
				return undefined;
			} finally {
				CloseHandle(snapshot);
			}
		};

		// Every process as (pid, parent, image name), from one snapshot.
		const listProcesses = (): {
			pid: number;
			parentPid: number;
			exe: string;
		}[] => {
			const snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
			if (isBadHandle(snapshot)) {
				return [];
			}
			try {
				const out: { pid: number; parentPid: number; exe: string }[] = [];
				const entry: {
					dwSize: number;
					th32ProcessID?: number;
					th32ParentProcessID?: number;
					szExeFile?: string;
				} = { dwSize: koffi.sizeof(PROCESSENTRY32W) };
				let ok = Process32FirstW(snapshot, entry);
				while (ok) {
					out.push({
						pid: entry.th32ProcessID ?? 0,
						parentPid: entry.th32ParentProcessID ?? 0,
						exe: entry.szExeFile ?? '',
					});
					ok = Process32NextW(snapshot, entry);
				}
				return out;
			} finally {
				CloseHandle(snapshot);
			}
		};

		// A process's rights, plus when it started (FILETIME ticks) so a parent
		// PID can be told from a recycled one.
		const readProcess = (
			pid: number
		): { rights: ProcessRights; created: bigint | number | null } => {
			if (!rightsFns) {
				return {
					rights: {
						elevated: null,
						integrity: null,
						error: 'unavailable',
					},
					created: null,
				};
			}
			const {
				OpenProcess,
				GetProcessTimes,
				OpenProcessToken,
				GetTokenInformation,
			} = rightsFns;
			const proc = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
			if (!proc || koffi.address(proc) === 0n) {
				return {
					rights: {
						elevated: null,
						integrity: null,
						error: `open-process:${GetLastError() >>> 0}`,
					},
					created: null,
				};
			}
			try {
				const created = [0];
				const unused = [0];
				const created0 = GetProcessTimes(
					proc,
					created,
					unused,
					unused,
					unused
				)
					? created[0]
					: null;
				const tokenOut: unknown[] = [null];
				if (!OpenProcessToken(proc, TOKEN_QUERY, tokenOut)) {
					return {
						rights: {
							elevated: null,
							integrity: null,
							error: `open-token:${GetLastError() >>> 0}`,
						},
						created: created0,
					};
				}
				const token = tokenOut[0];
				try {
					const length = [0];
					const elevation = Buffer.alloc(4);
					const elevated = GetTokenInformation(
						token,
						TOKEN_ELEVATION,
						elevation,
						elevation.length,
						length
					)
						? elevation.readUInt32LE(0) !== 0
						: null;
					const label = Buffer.alloc(128);
					const integrity = GetTokenInformation(
						token,
						TOKEN_INTEGRITY_LEVEL,
						label,
						label.length,
						length
					)
						? parseIntegrityRid(label, length[0])
						: null;
					return {
						rights: { elevated, integrity, error: null },
						created: created0,
					};
				} finally {
					CloseHandle(token);
				}
			} finally {
				CloseHandle(proc);
			}
		};

		// Replicates .NET Process.MainWindowHandle: the FIRST enumerated (top of
		// Z-order) top-level window that belongs to the PID, is unowned, and is
		// visible. Returns the HWND wrapper or undefined.
		const findIracingHwnd = (pid: number): unknown => {
			let match: unknown;
			// Transient (synchronous) callback: EnumWindows only invokes it during
			// this call, so passing the closure directly is correct and leak-free.
			EnumWindows((hwnd: unknown) => {
				const pidOut = [0];
				GetWindowThreadProcessId(hwnd, pidOut);
				if (pidOut[0] !== pid) {
					return true; // keep enumerating
				}
				if (koffi.address(GetWindow(hwnd, GW_OWNER)) !== 0n) {
					return true; // owned window (splash/tooltip) — skip
				}
				if (!IsWindowVisible(hwnd)) {
					return true;
				}
				match = hwnd;
				return false; // stop enumeration
			}, 0);
			return match;
		};

		const readTitle = (hwnd: unknown): string => {
			// Best-effort, diagnostic only — never fail getDetails over a title.
			try {
				const buffer = new Uint16Array(512);
				const length = GetWindowTextW(hwnd, buffer, buffer.length);
				if (length > 0) {
					return Buffer.from(buffer.buffer, 0, length * 2).toString(
						'utf16le'
					);
				}
			} catch {
				/* fall through to empty title */
			}
			return '';
		};

		const findWindow = (): unknown => {
			const pid = findIracingPid();
			if (pid === undefined) {
				// iRacing genuinely isn't running — PowerShell would find nothing
				// either, so callers return undefined without a wasted spawn.
				return undefined;
			}
			const hwnd = findIracingHwnd(pid);
			if (!hwnd) {
				// Process present but our EnumWindows filter matched no window —
				// signal for a PowerShell cross-check rather than a hard failure.
				throw new IracingWindowUnresolvedError(
					'iRacing process found but no matching window resolved'
				);
			}
			return hwnd;
		};

		return {
			getDetails(): IRacingWindowDetails | undefined {
				const hwnd = findWindow();
				if (!hwnd) {
					return undefined;
				}
				const rect = {} as {
					left: number;
					top: number;
					right: number;
					bottom: number;
				};
				if (!GetWindowRect(hwnd, rect)) {
					// The window resolved but its rect couldn't be read — treat as
					// "unresolved" so the caller cross-checks via PowerShell
					// (shouldKeepNativeAfter) instead of silently reporting not-found.
					log.warn('GetWindowRect failed on resolved iRacing window');
					throw new IracingWindowUnresolvedError(
						'GetWindowRect failed on resolved iRacing window'
					);
				}
				return {
					handle: formatWindowHandle(koffi.address(hwnd)),
					title: readTitle(hwnd),
					left: rect.left,
					top: rect.top,
					width: rect.right - rect.left,
					height: rect.bottom - rect.top,
				};
			},

			resize(
				width: number,
				height: number,
				left: number,
				top: number,
				raise: boolean
			): IracingResize | undefined {
				const hwnd = findWindow();
				if (!hwnd) {
					return undefined;
				}
				const { insertAfter, flags } = resolveResizePlacement(raise);
				if (raise && (IsIconic(hwnd) || IsZoomed(hwnd))) {
					// A minimized window isn't composited and reports off-screen
					// sentinel coords; a maximized one keeps WS_MAXIMIZE and can snap
					// back. SW_RESTORE clears both before we size it for capture.
					ShowWindow(hwnd, SW_RESTORE);
				}
				const ok = SetWindowPos(
					hwnd,
					insertAfter,
					left,
					top,
					width,
					height,
					flags
				);
				// Read at once, before any other call can overwrite it. Best-effort —
				// koffi may not preserve GetLastError across the call, so 0 means
				// 'unknown' — but both field logs carried a steady 5.
				const lastError = ok ? 0 : GetLastError() >>> 0;
				if (!ok) {
					// A failed resize (stale HWND, compositor-rejected geometry, or
					// iRacing running as administrator) otherwise vanished silently.
					log.warn('SetWindowPos failed', {
						raise,
						width,
						height,
						left,
						top,
						lastError,
					});
				}
				if (raise) {
					// Only pre-capture forces the window frontmost; the restore path
					// deliberately does not steal focus back.
					BringWindowToTop(hwnd);
					SetForegroundWindow(hwnd);
				}
				// Win32 USER handles are 32-bit-significant even in x64 processes, so
				// Number() is lossless here and matches the PowerShell fallback's
				// numeric return (index.ts String()s it to match source ids).
				return {
					handle: Number(koffi.address(hwnd)),
					accessDenied: classifyAccessProbe(ok, lastError) === true,
				};
			},

			// Whether Windows lets us move iRacing's window, asked without changing
			// anything: put it exactly where it already is, with the quiet restore
			// flags (no activation, no Z-order change). That is the very call that
			// failed with 5 in the field logs — the restore of a window whose resize
			// had been refused, to the size it already had — so it is refused under
			// the same condition. Minimised or maximised windows report geometry
			// that is not safe to re-apply (off-screen sentinels; a maximised rect
			// that would un-maximise it), so those are not probed: null, unknown.
			probeWindowAccess(): boolean | null {
				const hwnd = findWindow();
				if (!hwnd || IsIconic(hwnd) || IsZoomed(hwnd)) {
					return null;
				}
				const rect = {} as {
					left: number;
					top: number;
					right: number;
					bottom: number;
				};
				if (!GetWindowRect(hwnd, rect)) {
					return null;
				}
				const { insertAfter, flags } = resolveResizePlacement(false);
				const ok = SetWindowPos(
					hwnd,
					insertAfter,
					rect.left,
					rect.top,
					rect.right - rect.left,
					rect.bottom - rect.top,
					flags
				);
				return classifyAccessProbe(ok, ok ? 0 : GetLastError() >>> 0);
			},

			readRights(pid: number): ProcessRights {
				return readProcess(pid).rights;
			},

			getIracingRights(): IracingRightsReport | undefined {
				const processes = listProcesses();
				const sim = processes.find((p) => matchesIracingExe(p.exe));
				if (!sim) {
					return undefined;
				}
				const self = readProcess(process.pid).rights;
				const iracing = readProcess(sim.pid);
				let launcher: IracingRightsReport['launcher'] = null;
				const parent = processes.find((p) => p.pid === sim.parentPid);
				if (parent) {
					const read = readProcess(parent.pid);
					// A PID is recycled once its process exits: a "parent" started
					// after iRacing is a stranger. Unknown times are taken on trust.
					const recycled =
						read.created !== null &&
						iracing.created !== null &&
						read.created > iracing.created;
					if (!recycled) {
						launcher = {
							pid: parent.pid,
							name: parent.exe,
							...read.rights,
						};
					}
				}
				return {
					self,
					iracing: { pid: sim.pid, ...iracing.rights },
					launcher,
					verdict: compareProcessRights(self, iracing.rights),
				};
			},

			getExclusiveFullscreenState(): ExclusiveFullscreenState {
				// findWindow() first: undefined = iRacing not running (nothing to
				// attribute), or it throws IracingWindowUnresolvedError (handled by
				// the public wrapper). Sample the session-global shell state, then
				// attribute it to iRacing via the foreground window.
				const hwnd = findWindow();
				const stateOut = [0];
				const hr = SHQueryUserNotificationState(stateOut);
				const state = hr === S_OK ? stateOut[0] : -1;
				let attributed = false;
				if (hwnd) {
					const fg = GetForegroundWindow();
					attributed = !!fg && koffi.address(fg) === koffi.address(hwnd);
				}
				return {
					state,
					attributed,
					exclusiveFullscreen: isExclusiveFullscreenState(
						hr,
						state,
						attributed
					),
				};
			},
		};
	} catch (error) {
		log.warn('koffi FFI unavailable; using PowerShell fallback', {
			error: (error as Error)?.message || String(error),
		});
		return null;
	}
}

// ---------------------------------------------------------------------------
// Public API — native first, PowerShell fallback
// ---------------------------------------------------------------------------

export function getIracingWindowDetails(): IRacingWindowDetails | undefined {
	const native = getNativeApi();
	if (native) {
		try {
			return native.getDetails();
		} catch (error) {
			shouldKeepNativeAfter('getIracingWindowDetails', error);
		}
	}
	return getIracingWindowDetailsViaPowerShell();
}

// Physical-pixel size of iRacing's window via the koffi path ONLY — this never
// spawns PowerShell. Returns null when native is unavailable, iRacing isn't
// running, or its window can't be resolved.
//
// This exists specifically for the VRAM guardrail's baseline read (index.ts
// get-vram-info), which is polled every few seconds. getIracingWindowDetails()
// above must not be used there: it falls back to a synchronous spawnSync
// powershell.exe (~1s CLR cold start, blocking the main event loop each poll)
// whenever the window is momentarily unresolved (iRacing startup) or native was
// disabled — and that PowerShell child runs DPI-UNAWARE, so on a >100%-scaled
// monitor GetWindowRect returns virtualized (DIP) coordinates smaller than
// physical. A DIP baseline shrinks the predicted delta's denominator and
// manufactures false-positive VRAM warnings on the very scaled monitors the
// native path was added to protect. Fail-open: any miss returns null, which the
// predictor treats as "no baseline" (assume no growth).
export function getIracingWindowSizeNative(): {
	width: number;
	height: number;
} | null {
	const native = getNativeApi();
	if (!native) {
		return null;
	}
	try {
		const details = native.getDetails();
		if (!details || !(details.width > 0) || !(details.height > 0)) {
			return null;
		}
		return { width: details.width, height: details.height };
	} catch (error) {
		// A genuine FFI fault disables native for the session (so the capture
		// paths stop retrying it too); an unresolved window is transient — stay
		// native and just report no baseline this poll. Either way: no PowerShell.
		if (!(error instanceof IracingWindowUnresolvedError)) {
			disableNative('getIracingWindowSizeNative', error);
		}
		return null;
	}
}

// Exclusive-fullscreen pre-flight (#10) via the koffi path ONLY — never spawns
// PowerShell. Returns the state (raw + attributed + conclusion) or null when
// native is unavailable / iRacing isn't running / the window can't be resolved.
// Diagnostic, not a capture fix: a true `exclusiveFullscreen` means the resize is
// a no-op and the capture WILL be black. Fail-open: any miss returns null (no
// warning, no block — the black-frame detector remains the ground-truth backstop).
export function getIracingExclusiveFullscreenState(): ExclusiveFullscreenState | null {
	const native = getNativeApi();
	if (!native) {
		return null;
	}
	try {
		return native.getExclusiveFullscreenState();
	} catch (error) {
		// Same policy as getIracingWindowSizeNative: genuine FFI fault disables
		// native for the session; an unresolved window is transient → null.
		if (!(error instanceof IracingWindowUnresolvedError)) {
			disableNative('getIracingExclusiveFullscreenState', error);
		}
		return null;
	}
}

// Whether iRacing runs as administrator, read off whether Windows lets us move
// its window (see probeWindowAccess). True = refused, false = allowed, null =
// unknown: native unavailable, iRacing not running, its window minimised or
// maximised, or a refusal for another reason. Native only — never spawns
// PowerShell — and fail-open: callers refuse only on true.
export function isIracingWindowAccessDenied(): boolean | null {
	const native = getNativeApi();
	if (!native) {
		return null;
	}
	try {
		return native.probeWindowAccess();
	} catch (error) {
		// Same policy as getIracingWindowSizeNative.
		if (!(error instanceof IracingWindowUnresolvedError)) {
			disableNative('isIracingWindowAccessDenied', error);
		}
		return null;
	}
}

// iRacing's rights against ours, and its launcher's (see IracingRightsReport).
// Null when native is unavailable or iRacing is not running. Native only; never
// throws. A snapshot plus a few token reads — cheap enough to ask per capture.
export function getIracingProcessRights(): IracingRightsReport | null {
	const native = getNativeApi();
	if (!native) {
		return null;
	}
	try {
		return native.getIracingRights() ?? null;
	} catch (error) {
		// Diagnostic only: a fault here must not switch off the native resize.
		log.warn('Reading process rights failed', {
			error: (error as Error)?.message || String(error),
		});
		return null;
	}
}

// One process's rights by PID (native only). Null when native is unavailable.
export function getProcessRights(pid: number): ProcessRights | null {
	const native = getNativeApi();
	if (!native) {
		return null;
	}
	try {
		return native.readRights(pid);
	} catch (error) {
		log.warn('Reading process rights failed', {
			pid,
			error: (error as Error)?.message || String(error),
		});
		return null;
	}
}

// The PowerShell fallbacks cannot tell a refused resize from a done one.
function fromPowerShell(handle: number | undefined): IracingResize | undefined {
	return handle === undefined ? undefined : { handle, accessDenied: false };
}

// Restore / reposition path (via resize() in index.ts): quiet, no focus change.
export function resizeIracingWindow(
	width: number,
	height: number,
	left: number,
	top: number
): IracingResize | undefined {
	const native = getNativeApi();
	if (native) {
		try {
			return native.resize(width, height, left, top, false);
		} catch (error) {
			shouldKeepNativeAfter('resizeIracingWindow', error);
		}
	}
	return fromPowerShell(
		resizeIracingWindowViaPowerShell(width, height, left, top)
	);
}

// Pre-capture path: size to the target resolution and raise for the grab. Used
// by both the non-ReShade path (overlapped with desktopCapturer.getSources) and
// the ReShade path (awaited directly).
export function resizeIracingWindowAsync(
	width: number,
	height: number,
	left: number,
	top: number
): Promise<IracingResize | undefined> {
	const native = getNativeApi();
	if (native) {
		try {
			return Promise.resolve(native.resize(width, height, left, top, true));
		} catch (error) {
			shouldKeepNativeAfter('resizeIracingWindowAsync', error);
		}
	}
	return resizeIracingWindowAsyncViaPowerShell(width, height, left, top).then(
		fromPowerShell
	);
}

// ---------------------------------------------------------------------------
// PowerShell fallback implementations
//
// The automatic safety net for when the koffi FFI is unavailable. These spawn
// powershell.exe, which is slower (CLR + Add-Type cold start) and runs in a
// different DPI context — hence the native path above is preferred. Each mirrors
// its native counterpart's focus policy: the sync reposition is quiet, the async
// pre-capture variant raises. Only reached if koffi fails or an FFI call throws.
// ---------------------------------------------------------------------------

function getIracingWindowDetailsViaPowerShell():
	| IRacingWindowDetails
	| undefined {
	const script = `
$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class Win32Rect {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
}
"@

$process = Get-Process -Name '${IRACING_PROCESS_NAME}' -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 } |
  Select-Object -First 1

if (-not $process) {
  exit 0
}

$hwnd = [IntPtr]$process.MainWindowHandle
$rect = New-Object Win32Rect+RECT
[void][Win32Rect]::GetWindowRect($hwnd, [ref]$rect)

[pscustomobject]@{
  handle = [string]([int64]$hwnd)
  title = [string]$process.MainWindowTitle
  left = $rect.Left
  top = $rect.Top
  width = $rect.Right - $rect.Left
  height = $rect.Bottom - $rect.Top
} | ConvertTo-Json -Compress
`;

	const result = spawnSync(
		'powershell.exe',
		['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
		{
			encoding: 'utf8',
			windowsHide: true,
		}
	);

	if (result.status !== 0) {
		if (result.stderr) {
			log.warn('PowerShell window query returned stderr', {
				stderr: result.stderr.trim(),
			});
		}

		return undefined;
	}

	const output = result.stdout.trim();
	if (!output) {
		return undefined;
	}

	try {
		const parsed = JSON.parse(output);
		if (!parsed || !parsed.handle) {
			return undefined;
		}

		return {
			handle: String(parsed.handle),
			title: String(parsed.title || ''),
			left: Number(parsed.left) || 0,
			top: Number(parsed.top) || 0,
			width: Number(parsed.width) || 0,
			height: Number(parsed.height) || 0,
		};
	} catch (error) {
		log.warn('PowerShell window query JSON parse failed', {
			error: (error as Error)?.message || String(error),
		});
		return undefined;
	}
}

function resizeIracingWindowViaPowerShell(
	width: number,
	height: number,
	left: number,
	top: number
): number | undefined {
	// Quiet restore/reposition — mirrors the native raise=false policy
	// (HWND_NOTOPMOST + SWP_NOACTIVATE|SWP_NOZORDER|SWP_NOSENDCHANGING = 0x0414),
	// with NO ShowWindow/focus barrage, so behaviour is the same whether or not
	// koffi loaded. The raising variant is resizeIracingWindowAsyncViaPowerShell.
	const script = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class Win32Quiet {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
"@

$process = Get-Process -Name '${IRACING_PROCESS_NAME}' -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 } |
  Select-Object -First 1

if (-not $process) {
  Write-Output 'NOT_FOUND'
  exit 0
}

$window = [IntPtr]$process.MainWindowHandle
[Win32Quiet]::SetWindowPos($window, [IntPtr](-2), ${left}, ${top}, ${width}, ${height}, 0x0414) | Out-Null
Write-Output ([int64]$window)
`;

	const result = spawnSync(
		'powershell.exe',
		['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
		{
			encoding: 'utf8',
			windowsHide: true,
		}
	);

	if (result.status !== 0) {
		if (result.stderr) {
			log.warn('PowerShell window query returned stderr', {
				stderr: result.stderr.trim(),
			});
		}

		return undefined;
	}

	const output = result.stdout.trim();

	if (!output || output === 'NOT_FOUND') {
		return undefined;
	}

	const handle = Number.parseInt(output, 10);
	return Number.isNaN(handle) ? undefined : handle;
}

function resizeIracingWindowAsyncViaPowerShell(
	width: number,
	height: number,
	left: number,
	top: number
): Promise<number | undefined> {
	const script = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class Win32 {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool BringWindowToTop(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern IntPtr SetFocus(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern IntPtr SetActiveWindow(IntPtr hWnd);
}
"@

$process = Get-Process -Name '${IRACING_PROCESS_NAME}' -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 } |
  Select-Object -First 1

if (-not $process) {
  Write-Output 'NOT_FOUND'
  exit 0
}

$window = [IntPtr]$process.MainWindowHandle
[Win32]::SetWindowPos($window, [IntPtr](-2), ${left}, ${top}, ${width}, ${height}, 0) | Out-Null
[Win32]::ShowWindow($window, 9) | Out-Null
[Win32]::BringWindowToTop($window) | Out-Null
[Win32]::SetForegroundWindow($window) | Out-Null
[Win32]::SetFocus($window) | Out-Null
[Win32]::SetActiveWindow($window) | Out-Null
Write-Output ([int64]$window)
`;

	return new Promise<number | undefined>((resolve) => {
		const child = spawn(
			'powershell.exe',
			['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
			{
				windowsHide: true,
			}
		);

		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (data: Buffer | string) => {
			stdout += data;
		});
		child.stderr.on('data', (data: Buffer | string) => {
			stderr += data;
		});
		// Without this, a failed spawn (ENOENT/EMFILE) emits 'error' with no
		// listener, which throws on a later tick and escapes the caller's
		// try/catch — a hard crash in the very safety net we fall back to. Treat
		// it as "window not found" instead.
		child.on('error', (error: Error) => {
			log.error('PowerShell fallback spawn failed', {
				error: error.message || String(error),
			});
			resolve(undefined);
		});
		child.on('close', (code: number | null) => {
			if (code !== 0) {
				if (stderr.trim()) {
					log.warn('PowerShell fallback returned stderr', {
						stderr: stderr.trim(),
					});
				}
				resolve(undefined);
				return;
			}

			const output = stdout.trim();
			if (!output || output === 'NOT_FOUND') {
				resolve(undefined);
				return;
			}

			const handle = Number.parseInt(output, 10);
			resolve(Number.isNaN(handle) ? undefined : handle);
		});
	});
}
