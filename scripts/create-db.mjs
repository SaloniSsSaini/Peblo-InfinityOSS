/**
 * Creates peblo user + database on local PostgreSQL (Windows dev).
 * Tries common postgres passwords; set PGPASSWORD env to skip guessing.
 */
import pg from 'pg';

const { Client } = pg;

const TARGET_DB = 'peblo_infinityos';
const TARGET_USER = 'peblo';
const TARGET_PASS = 'peblo';

const passwords = [
  process.env.PGPASSWORD,
  'postgres',
  'admin',
  'password',
  '123456',
  'root',
  '',
].filter((p, i, a) => p !== undefined && a.indexOf(p) === i);

async function tryAdmin(password) {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: password ?? '',
    database: 'postgres',
    connectionTimeoutMillis: 4000,
  });
  await client.connect();
  return client;
}

async function setup(client) {
  const userRes = await client.query(
    `SELECT 1 FROM pg_roles WHERE rolname = $1`,
    [TARGET_USER],
  );
  if (userRes.rowCount === 0) {
    await client.query(
      `CREATE USER ${TARGET_USER} WITH PASSWORD '${TARGET_PASS}' CREATEDB LOGIN`,
    );
    console.log(`Created user ${TARGET_USER}`);
  } else {
    await client.query(`ALTER USER ${TARGET_USER} WITH PASSWORD '${TARGET_PASS}'`);
    console.log(`User ${TARGET_USER} exists — password synced`);
  }

  const dbRes = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [TARGET_DB],
  );
  if (dbRes.rowCount === 0) {
    await client.query(`CREATE DATABASE ${TARGET_DB} OWNER ${TARGET_USER}`);
    console.log(`Created database ${TARGET_DB}`);
  } else {
    console.log(`Database ${TARGET_DB} already exists`);
  }

  await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${TARGET_DB} TO ${TARGET_USER}`);
}

async function main() {
  let lastErr;
  for (const pass of passwords) {
    try {
      const label = pass === '' ? '(empty)' : pass === undefined ? '(env)' : '***';
      console.log(`Trying postgres password ${label}...`);
      const client = await tryAdmin(pass);
      await setup(client);
      await client.end();
      console.log('\nOK — use in apps/api/.env:');
      console.log(
        `DATABASE_URL=postgresql://${TARGET_USER}:${TARGET_PASS}@localhost:5432/${TARGET_DB}?schema=public`,
      );
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  console.error('\nCould not connect as postgres superuser.');
  console.error('Set your postgres password and run:');
  console.error('  $env:PGPASSWORD="YOUR_PASSWORD"; node scripts/create-db.mjs');
  console.error(lastErr?.message ?? lastErr);
  process.exit(1);
}

main();
