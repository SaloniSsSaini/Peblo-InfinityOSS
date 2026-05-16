/**
 * Verify DATABASE_URL and run prisma migrate deploy.
 * Usage: node scripts/verify-production-db.mjs
 * Requires apps/api/.env with a real DATABASE_URL (not REPLACE_* placeholders).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = join(root, 'apps', 'api');
const envPath = join(apiDir, '.env');

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error('Missing apps/api/.env — copy from apps/api/.env.production.example');
    process.exit(1);
  }
  const env = { ...process.env };
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

function run(cmd, args, env) {
  const r = spawnSync(cmd, args, { cwd: apiDir, env, stdio: 'inherit', shell: process.platform === 'win32' });
  return r.status ?? 1;
}

const env = loadEnv();
const url = env.DATABASE_URL ?? '';

const PLACEHOLDER_MARKERS = [
  'REPLACE_',
  'your-db-host',
  'YourPassword',
  'yourdbname',
  'USER:PASSWORD@HOST',
  '@HOST:5432',
];

if (!url || PLACEHOLDER_MARKERS.some((m) => url.includes(m))) {
  console.error(`
DATABASE_URL is missing or still a placeholder.

1. Deploy render.yaml (Render Blueprint) OR create Neon/Supabase Postgres.
2. Set DATABASE_URL in Render Dashboard (production) OR paste External URL into apps/api/.env (local only, gitignored).
3. Re-run: node scripts/verify-production-db.mjs

See RENDER_DEPLOY.md and apps/api/.env.production.example
`);
  process.exit(1);
}

console.log('==> prisma generate');
if (run('npx', ['prisma', 'generate'], env) !== 0) process.exit(1);

console.log('==> prisma migrate deploy');
if (run('npx', ['prisma', 'migrate', 'deploy'], env) !== 0) process.exit(1);

console.log('==> prisma db execute (connectivity check)');
const check = spawnSync(
  'npx',
  ['prisma', 'db', 'execute', '--stdin'],
  {
    cwd: apiDir,
    env,
    input: 'SELECT 1 AS ok;',
    encoding: 'utf8',
    shell: process.platform === 'win32',
  },
);
if (check.status !== 0) {
  console.error('Database connectivity check failed.');
  process.exit(1);
}

console.log('OK — database reachable and migrations applied.');
