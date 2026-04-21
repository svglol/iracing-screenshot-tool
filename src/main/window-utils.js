const { spawn, spawnSync } = require('child_process');
const IRACING_PROCESS_NAME = 'iRacingSim64DX11';

function getIracingWindowDetails() {
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

function resizeIracingWindow(width, height, left, top) {
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

function resizeIracingWindowAsync(width, height, left, top) {
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

	return new Promise((resolve) => {
		const child = spawn(
			'powershell.exe',
			['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
			{
				windowsHide: true,
			}
		);

		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (data) => {
			stdout += data;
		});
		child.stderr.on('data', (data) => {
			stderr += data;
		});
		child.on('close', (code) => {
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

module.exports = {
	resizeIracingWindow,
	resizeIracingWindowAsync,
	getIracingWindowDetails,
};
