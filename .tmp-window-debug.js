const { spawnSync } = require('child_process');
const script = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public struct RECT {
  public int Left;
  public int Top;
  public int Right;
  public int Bottom;
}

public static class Win32 {
  [DllImport("user32.dll", CharSet = CharSet.Ansi, SetLastError = true)]
  public static extern IntPtr FindWindowA(string lpClassName, string lpWindowName);

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

$window = [Win32]::FindWindowA($null, 'iRacing.com Simulator')
if ($window -eq [IntPtr]::Zero) {
  Write-Output 'NOT_FOUND'
  exit 0
}

[Win32]::SetWindowPos($window, [IntPtr](-2), 0, 0, 2560, 1440, 0) | Out-Null
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
console.log(JSON.stringify({ status: result.status, stdout: result.stdout, stderr: result.stderr }, null, 2));
