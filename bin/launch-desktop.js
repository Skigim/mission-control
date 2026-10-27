#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const isDev = process.argv.includes('--dev');

const electronBin = path.join(rootDir, 'node_modules', 'electron', 'dist', 'electron.exe');
const args = isDev ? ['.', '--dev'] : ['.'];

if (process.platform === 'win32') {
  const quotedArgs = args.map((a) => `"${a}"`).join(' ');
  const cmdLine = `"${electronBin}" ${quotedArgs}`;
  const psCommand = `
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class DesktopLauncher {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct STARTUPINFO {
    public int cb;
    public string lpReserved;
    public string lpDesktop;
    public string lpTitle;
    public int dwX;
    public int dwY;
    public int dwXSize;
    public int dwYSize;
    public int dwXCountChars;
    public int dwYCountChars;
    public int dwFillAttribute;
    public int dwFlags;
    public short wShowWindow;
    public short cbReserved2;
    public IntPtr lpReserved2;
    public IntPtr hStdInput;
    public IntPtr hStdOutput;
    public IntPtr hStdError;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct PROCESS_INFORMATION {
    public IntPtr hProcess;
    public IntPtr hThread;
    public int dwProcessId;
    public int dwThreadId;
  }

  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool CreateProcessW(
    string lpApplicationName,
    string lpCommandLine,
    IntPtr lpProcessAttributes,
    IntPtr lpThreadAttributes,
    bool bInheritHandles,
    uint dwCreationFlags,
    IntPtr lpEnvironment,
    string lpCurrentDirectory,
    ref STARTUPINFO lpStartupInfo,
    out PROCESS_INFORMATION lpProcessInformation
  );

  public static int LaunchOnDefaultDesktop(string cmdLine, string workDir) {
    STARTUPINFO si = new STARTUPINFO();
    si.cb = Marshal.SizeOf(si);
    si.lpDesktop = "WinSta0\\\\Default";
    si.dwFlags = 1; // STARTF_USESHOWWINDOW
    si.wShowWindow = 1; // SW_SHOWNORMAL
    PROCESS_INFORMATION pi;
    bool ok = CreateProcessW(null, cmdLine, IntPtr.Zero, IntPtr.Zero, false, 0, IntPtr.Zero, workDir, ref si, out pi);
    if (!ok) {
      throw new Exception("CreateProcessW failed with error " + Marshal.GetLastWin32Error());
    }
    return pi.dwProcessId;
  }
}
"@
$pidLaunched = [DesktopLauncher]::LaunchOnDefaultDesktop('${cmdLine.replace(/'/g, "''")}', '${rootDir.replace(/'/g, "''")}')
Wait-Process -Id $pidLaunched
  `;
  const child = spawn('powershell.exe', ['-NoProfile', '-Command', psCommand], {
    cwd: rootDir,
    stdio: 'inherit'
  });
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  const child = spawn(electronBin, args, {
    cwd: rootDir,
    stdio: 'inherit'
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}
