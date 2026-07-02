import { spawn, spawnSync } from 'child_process';

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
	): number | undefined;
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
	console.error(
		`[window-utils] native FFI failed in ${where}; using PowerShell fallback`,
		error
	);
}

// Shared fallback policy for the three public entry points. A window-unresolved
// signal means iRacing is running but native couldn't find its window: cross-
// check with PowerShell for THIS call but keep native enabled. Any other error
// is a genuine FFI fault: disable native for the session, then fall back.
function shouldKeepNativeAfter(where: string, error: unknown): void {
	if (error instanceof IracingWindowUnresolvedError) {
		console.warn(
			`[window-utils] ${where}: ${error.message}; cross-checking via PowerShell`
		);
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
		// eslint-disable-next-line @typescript-eslint/no-require-imports
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
					return undefined;
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
			): number | undefined {
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
				SetWindowPos(hwnd, insertAfter, left, top, width, height, flags);
				if (raise) {
					// Only pre-capture forces the window frontmost; the restore path
					// deliberately does not steal focus back.
					BringWindowToTop(hwnd);
					SetForegroundWindow(hwnd);
				}
				// Win32 USER handles are 32-bit-significant even in x64 processes, so
				// Number() is lossless here and matches the PowerShell fallback's
				// numeric return (index.ts String()s it to match source ids).
				return Number(koffi.address(hwnd));
			},
		};
	} catch (error) {
		console.error(
			'[window-utils] koffi FFI unavailable; using PowerShell fallback',
			error
		);
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

// Restore / reposition path (via resize() in index.ts): quiet, no focus change.
export function resizeIracingWindow(
	width: number,
	height: number,
	left: number,
	top: number
): number | undefined {
	const native = getNativeApi();
	if (native) {
		try {
			return native.resize(width, height, left, top, false);
		} catch (error) {
			shouldKeepNativeAfter('resizeIracingWindow', error);
		}
	}
	return resizeIracingWindowViaPowerShell(width, height, left, top);
}

// Pre-capture path: size to the target resolution and raise for the grab. Used
// by both the non-ReShade path (overlapped with desktopCapturer.getSources) and
// the ReShade path (awaited directly).
export function resizeIracingWindowAsync(
	width: number,
	height: number,
	left: number,
	top: number
): Promise<number | undefined> {
	const native = getNativeApi();
	if (native) {
		try {
			return Promise.resolve(native.resize(width, height, left, top, true));
		} catch (error) {
			shouldKeepNativeAfter('resizeIracingWindowAsync', error);
		}
	}
	return resizeIracingWindowAsyncViaPowerShell(width, height, left, top);
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
			console.error(result.stderr.trim());
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
		console.error(error);
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
			console.error(result.stderr.trim());
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
			console.error(error);
			resolve(undefined);
		});
		child.on('close', (code: number | null) => {
			if (code !== 0) {
				if (stderr.trim()) {
					console.error(stderr.trim());
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
