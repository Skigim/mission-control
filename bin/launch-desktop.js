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
  const argListStr = args.map((a) => `'${a}'`).join(',');
  const psCommand = `
    $p = Start-Process -FilePath '${electronBin.replace(/'/g, "''")}' -ArgumentList @(${argListStr}) -WorkingDirectory '${rootDir.replace(/'/g, "''")}' -WindowStyle Normal -PassThru
    Wait-Process -Id $p.Id
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
