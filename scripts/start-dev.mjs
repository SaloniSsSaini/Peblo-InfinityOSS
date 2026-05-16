/**
 * Starts embedded PostgreSQL (port 5433), migrates, seeds, then API + Web.
 * Usage: node scripts/start-dev.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pgPort = 5433;
const databaseUrl = `postgresql://postgres:postgres@127.0.0.1:${pgPort}/peblo_infinityos?schema=public`;

const pgDataDir = join(root, '.peblo-pgdata');
mkdirSync(pgDataDir, { recursive: true });

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      cwd: opts.cwd ?? root,
      env: { ...process.env, ...opts.env },
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function main() {
  console.log('\n==> Starting embedded PostgreSQL on port', pgPort);
  const pg = new EmbeddedPostgres({
    databaseDir: pgDataDir,
    user: 'postgres',
    password: 'postgres',
    port: pgPort,
    persistent: true,
  });

  try {
    if (existsSync(join(pgDataDir, 'PG_VERSION'))) {
      await pg.start();
    } else {
      await pg.initialise();
      await pg.start();
    }
  } catch (err) {
    const msg = String(err?.message ?? err);
    if (msg.includes('postmaster.pid') || msg.includes('lock file')) {
      console.log('PostgreSQL already running on port', pgPort, '— continuing');
    } else {
      throw err;
    }
  }

  try {
    await pg.createDatabase('peblo_infinityos');
    console.log('Created database peblo_infinityos');
  } catch {
    console.log('Database peblo_infinityos ready');
  }

  const env = {
    DATABASE_URL: databaseUrl,
    PORT: '4000',
    WEB_ORIGIN: 'http://localhost:3000',
    JWT_ACCESS_SECRET: 'dev-access-secret',
    JWT_REFRESH_SECRET: 'dev-refresh-secret',
  };

  console.log('\n==> Prisma migrate');
  await run('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: join(root, 'apps/api'),
    env,
  });

  console.log('\n==> Prisma seed');
  await run('npx', ['prisma', 'db', 'seed'], {
    cwd: join(root, 'apps/api'),
    env: { ...env, DEMO_EMAIL: 'demo@peblo.infinityos.app', DEMO_PASSWORD: 'DemoInfinity2026!' },
  });

  // Update api .env for manual restarts
  const fs = await import('node:fs');
  const envPath = join(root, 'apps/api/.env');
  let existing = '';
  try {
    existing = fs.readFileSync(envPath, 'utf8');
  } catch {
    /* ignore */
  }
  if (!existing.includes(String(pgPort))) {
    fs.writeFileSync(
      envPath,
      `# Auto-updated by scripts/start-dev.mjs\nPORT=4000\nWEB_ORIGIN=http://localhost:3000\nDATABASE_URL=${databaseUrl}\nJWT_ACCESS_SECRET=dev-access-secret\nJWT_REFRESH_SECRET=dev-refresh-secret\nDEMO_EMAIL=demo@peblo.infinityos.app\nDEMO_PASSWORD=DemoInfinity2026!\nDEMO_NAME=Demo visitor\nOPENAI_API_KEY=\n`,
    );
  }

  console.log('\n==> Starting API + Web');
  console.log('   Web:  http://localhost:3000');
  console.log('   API:  http://localhost:4000/api/health');
  console.log('   Demo: demo@peblo.infinityos.app / DemoInfinity2026!\n');

  const apiEnv = { ...process.env, ...env };
  const webEnv = {
    ...process.env,
    NEXT_PUBLIC_API_URL: 'http://localhost:4000',
  };
  delete webEnv.PORT;

  console.log('Building API (one-time)...');
  await run('npm', ['run', 'build', '--workspace=api'], { cwd: root, env: apiEnv });

  const children = [
    spawn('node', ['dist/main.js'], { stdio: 'inherit', shell: true, cwd: join(root, 'apps/api'), env: apiEnv }),
    spawn('npm', ['run', 'dev:web'], { stdio: 'inherit', shell: true, cwd: root, env: webEnv }),
  ];

  const shutdown = async () => {
    for (const c of children) {
      try {
        c.kill();
      } catch {
        /* ignore */
      }
    }
    try {
      await pg.stop();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  for (const c of children) {
    c.on('exit', () => {
      if (children.every((ch) => ch.exitCode !== null)) {
        void shutdown();
      }
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
