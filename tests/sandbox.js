// Points every storage surface at a throwaway store for the duration of a test
// run. Import it FIRST in each test file: ESM evaluates imports in order, and
// server/storage.js resolves its paths once, when it is first evaluated.
//
// Without this, tests would read and write the one real database in
// ~/.mission-control/data, which the desktop app and every agent's MCP server
// are using at the same time. Child processes (the API server, the CLI)
// inherit these variables through process.env.
import fs from 'fs';
import os from 'os';
import path from 'path';

const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mission-control-test-'));

process.env.MISSION_CONTROL_DATA_DIR = path.join(sandboxDir, 'data');
process.env.MISSION_CONTROL_STATUS_PATH = path.join(sandboxDir, 'STATUS.md');

export const statusMdPath = process.env.MISSION_CONTROL_STATUS_PATH;

process.on('exit', () => {
  fs.rmSync(sandboxDir, { recursive: true, force: true });
});
