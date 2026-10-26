import fs from 'fs';
import path from 'path';
import { execFileSync, spawn } from 'child_process';

const IGNORED_ENTRIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'target',
  '.next',
  '.nuxt',
  '.venv',
  'venv',
  '__pycache__',
  '.DS_Store',
  'Thumbs.db'
]);

let electronFolderPicker = null;

export function registerElectronFolderPicker(pickerFn) {
  electronFolderPicker = pickerFn;
}

/**
 * Opens a native OS folder selection dialog.
 * Uses Electron's native dialog when running inside Electron,
 * with a fallback to Windows Forms FolderBrowserDialog when accessed via browser.
 */
export async function pickDirectoryDialog() {
  if (electronFolderPicker) {
    return await electronFolderPicker();
  }

  if (process.platform === 'win32') {
    try {
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        $f = New-Object System.Windows.Forms.FolderBrowserDialog
        $f.Description = "Select Project Directory"
        $f.ShowNewFolderButton = $false
        $top = New-Object System.Windows.Forms.Form
        $top.TopMost = $true
        if ($f.ShowDialog($top) -eq [System.Windows.Forms.DialogResult]::OK) {
          Write-Output $f.SelectedPath
        }
      `;
      const out = execFileSync('powershell.exe', ['-NoProfile', '-STA', '-Command', psScript], {
        encoding: 'utf-8',
        timeout: 120000
      }).trim();
      return out || null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Inspects a local directory for project metadata, README, AI guidelines, Git status, and file tree.
 */
export function inspectLocalDirectory(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') {
    return { exists: false, path: '' };
  }

  const resolvedPath = path.resolve(rawPath.trim());
  if (!fs.existsSync(resolvedPath)) {
    return { exists: false, path: resolvedPath };
  }

  let stat;
  try {
    stat = fs.statSync(resolvedPath);
  } catch {
    return { exists: false, path: resolvedPath };
  }

  if (!stat.isDirectory()) {
    return { exists: false, path: resolvedPath };
  }

  const folderName = path.basename(resolvedPath);
  const detectedStack = new Set();
  const detectedTags = new Set();
  let detectedName = folderName;
  let detectedDescription = '';
  let detectedGuidelines = '';
  let readmeExcerpt = '';

  // 1. Check package.json
  const pkgJsonPath = path.join(resolvedPath, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      if (pkg.description && !detectedDescription) {
        detectedDescription = pkg.description;
      }
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {})
      };
      if (allDeps.react) detectedStack.add('React');
      if (allDeps.next) detectedStack.add('Next.js');
      if (allDeps.vue) detectedStack.add('Vue');
      if (allDeps.svelte) detectedStack.add('Svelte');
      if (allDeps.vite) detectedStack.add('Vite');
      if (allDeps.typescript) detectedStack.add('TypeScript');
      if (allDeps.tailwindcss) detectedStack.add('Tailwind CSS');
      if (allDeps.electron) detectedStack.add('Electron');
      if (allDeps.express) detectedStack.add('Express');
      if (allDeps.three) detectedStack.add('Three.js');
      if (allDeps['@modelcontextprotocol/sdk']) {
        detectedStack.add('MCP SDK');
        detectedTags.add('mcp');
      }
      if (detectedStack.size === 0) {
        detectedStack.add('Node.js');
      }
    } catch {
      // ignore malformed package.json
    }
  }

  // 2. Check Cargo.toml
  const cargoPath = path.join(resolvedPath, 'Cargo.toml');
  if (fs.existsSync(cargoPath)) {
    detectedStack.add('Rust');
    detectedTags.add('rust');
    try {
      const cargoRaw = fs.readFileSync(cargoPath, 'utf-8');
      if (cargoRaw.includes('tauri')) detectedStack.add('Tauri');
      if (cargoRaw.includes('tokio')) detectedStack.add('Tokio');
      if (cargoRaw.includes('axum')) detectedStack.add('Axum');
      if (cargoRaw.includes('bevy')) detectedStack.add('Bevy');
    } catch {
      // ignore
    }
  }

  // 3. Check Python project files
  const pyProjectPath = path.join(resolvedPath, 'pyproject.toml');
  const reqTxtPath = path.join(resolvedPath, 'requirements.txt');
  if (fs.existsSync(pyProjectPath) || fs.existsSync(reqTxtPath)) {
    detectedStack.add('Python');
    detectedTags.add('python');
  }

  // 4. Check Go / Godot
  if (fs.existsSync(path.join(resolvedPath, 'go.mod'))) {
    detectedStack.add('Go');
  }
  if (fs.existsSync(path.join(resolvedPath, 'project.godot'))) {
    detectedStack.add('Godot');
    detectedTags.add('gamedev');
  }

  // 5. Read README.md for description & excerpt
  const readmeCandidates = ['README.md', 'readme.md', 'Readme.md'];
  for (const candidate of readmeCandidates) {
    const p = path.join(resolvedPath, candidate);
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        readmeExcerpt = raw.slice(0, 2500);
        const lines = raw.split(/\r?\n/);
        // Extract title if H1 present
        const h1Line = lines.find(l => l.startsWith('# '));
        if (h1Line) {
          const cleanTitle = h1Line.replace(/^#\s+/, '').replace(/[^\w\s|:\-&/.]/g, '').trim();
          if (cleanTitle) detectedName = cleanTitle.split('|')[0].trim();
        }
        // Extract first paragraph
        if (!detectedDescription) {
          const paraLines = [];
          let started = false;
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---') || trimmed.startsWith('![')) {
              if (started) break;
              continue;
            }
            started = true;
            paraLines.push(trimmed);
          }
          if (paraLines.length > 0) {
            detectedDescription = paraLines.join(' ').replace(/\*\*|`/g, '').slice(0, 280);
          }
        }
      } catch {
        // ignore
      }
      break;
    }
  }

  // 6. Read AI Guidelines files if present (AGENTS.md, CLAUDE.md, DESIGN.md)
  const guidelineCandidates = ['AGENTS.md', 'CLAUDE.md', '.cursorrules', 'DESIGN.md'];
  for (const candidate of guidelineCandidates) {
    const p = path.join(resolvedPath, candidate);
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8').trim();
        if (raw) {
          detectedGuidelines = raw.slice(0, 1500);
          break;
        }
      } catch {
        // ignore
      }
    }
  }

  // 7. Inspect Git status
  const git = inspectGitRepo(resolvedPath);

  // 8. Top-level directory contents
  const files = [];
  try {
    const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_ENTRIES.has(entry.name)) continue;
      const isDir = entry.isDirectory();
      let size = undefined;
      if (!isDir) {
        try {
          size = fs.statSync(path.join(resolvedPath, entry.name)).size;
        } catch {
          // ignore
        }
      }
      files.push({
        name: entry.name,
        type: isDir ? 'directory' : 'file',
        size
      });
    }
    files.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  } catch {
    // ignore
  }

  return {
    exists: true,
    path: resolvedPath,
    name: detectedName,
    folderName,
    detectedStack: Array.from(detectedStack),
    detectedTags: Array.from(detectedTags),
    detectedDescription,
    detectedGuidelines,
    readmeExcerpt,
    git,
    files: files.slice(0, 40)
  };
}

function inspectGitRepo(dirPath) {
  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: dirPath,
      encoding: 'utf-8',
      timeout: 2000,
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();

    const statusOut = execFileSync('git', ['status', '--porcelain'], {
      cwd: dirPath,
      encoding: 'utf-8',
      timeout: 2000,
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    const dirtyCount = statusOut ? statusOut.split(/\r?\n/).filter(Boolean).length : 0;

    let lastCommit = '';
    try {
      lastCommit = execFileSync('git', ['log', '-1', '--format=%h — %s (%cr)'], {
        cwd: dirPath,
        encoding: 'utf-8',
        timeout: 2000,
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();
    } catch {
      // repo with no commits
    }

    let remoteUrl = '';
    try {
      remoteUrl = execFileSync('git', ['config', '--get', 'remote.origin.url'], {
        cwd: dirPath,
        encoding: 'utf-8',
        timeout: 2000,
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();
    } catch {
      // no origin remote
    }

    return {
      isGitRepo: true,
      branch,
      dirtyCount,
      lastCommit,
      remoteUrl
    };
  } catch {
    return {
      isGitRepo: false
    };
  }
}

/**
 * Launches Explorer, Terminal, or IDE at the given local directory.
 */
export function openLocalDirectory(rawPath, target = 'explorer') {
  if (!rawPath || typeof rawPath !== 'string') {
    throw new Error('Path is required');
  }
  const resolvedPath = path.resolve(rawPath.trim());
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Directory does not exist: ${resolvedPath}`);
  }

  if (target === 'explorer') {
    const child = spawn('explorer.exe', [resolvedPath], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    return { opened: 'explorer', path: resolvedPath };
  }

  if (target === 'terminal') {
    // Open PowerShell window in target directory
    const child = spawn('cmd.exe', ['/c', 'start', 'powershell.exe', '-NoExit', '-Command', `Set-Location -LiteralPath '${resolvedPath.replace(/'/g, "''")}'`], {
      cwd: resolvedPath,
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    return { opened: 'terminal', path: resolvedPath };
  }

  if (target === 'ide') {
    // Open VS Code / Cursor / default code editor at path
    const child = spawn('cmd.exe', ['/c', 'code', resolvedPath], {
      cwd: resolvedPath,
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    return { opened: 'ide', path: resolvedPath };
  }

  throw new Error(`Unknown open target: ${target}`);
}
