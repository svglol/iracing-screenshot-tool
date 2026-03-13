const { spawnSync } = require('child_process');

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

$process = Get-Process -Name 'iRacingSim64DX11' -ErrorAction SilentlyContinue |
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

  const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    encoding: 'utf8',
    windowsHide: true
  });

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

module.exports = {
  resizeIracingWindow
};
