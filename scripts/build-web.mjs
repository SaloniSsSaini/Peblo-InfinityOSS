/**
 * Production build for apps/web with Windows-friendly PATH (cmd.exe for Next lockfile helpers).
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const webDir = join(root, 'apps', 'web');

const pathParts = [process.env.PATH ?? process.env.Path ?? ''];
if (process.platform === 'win32') {
  const sysRoot = process.env.SystemRoot ?? 'C:\\Windows';
  pathParts.unshift(join(sysRoot, 'System32'));
}

const nextBin = join(webDir, 'node_modules', 'next', 'dist', 'bin', 'next');

const result = spawnSync(process.execPath, [nextBin, 'build'], {
  cwd: webDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    PATH: pathParts.filter(Boolean).join(';'),
    // Skip Next lockfile patch (fails with npm workspaces ENOWORKSPACES on Windows).
    NEXT_IGNORE_INCORRECT_LOCKFILE: '1',
  },
});

process.exit(result.status === null ? 1 : result.status);
