/**
 * Ensures package-lock.json lists all @next/swc-* packages under apps/web/node_modules/
 * so Next.js 16 does not try (and fail) to patch the lockfile during `next build`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = join(root, 'package-lock.json');
const nextPkgPath = join(root, 'apps/web/node_modules/next/package.json');
const WEB_PREFIX = 'apps/web/node_modules/';

const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
const nextPkg = JSON.parse(readFileSync(nextPkgPath, 'utf8'));
const swcPkgs = Object.keys(nextPkg.optionalDependencies ?? {}).filter((p) =>
  p.startsWith('@next/swc-'),
);

if (lock.lockfileVersion !== 3 || !lock.packages) {
  console.log('[patch-swc-lockfile] Unsupported lockfile format, skipping.');
  process.exit(0);
}

const registry = 'https://registry.npmjs.org/';
let patched = 0;

async function pkgInfo(name) {
  const existing =
    lock.packages[`${WEB_PREFIX}${name}`] ?? lock.packages[`node_modules/${name}`];
  if (existing?.resolved && existing?.integrity) {
    return existing;
  }
  const res = await fetch(`${registry}${name}`);
  if (!res.ok) throw new Error(`Failed to fetch ${name}: ${res.status}`);
  const data = await res.json();
  const version = nextPkg.version;
  const v = data.versions[version];
  return {
    version,
    resolved: v.dist.tarball,
    integrity: v.dist.integrity,
    cpu: v.cpu,
    os: v.os,
    engines: v.engines,
    optional: true,
  };
}

for (const pkg of swcPkgs) {
  const key = `${WEB_PREFIX}${pkg}`;
  if (lock.packages[key]) continue;

  const info = await pkgInfo(pkg);
  lock.packages[key] = {
    version: info.version,
    resolved: info.resolved,
    integrity: info.integrity,
    cpu: info.cpu,
    optional: true,
    os: info.os,
    engines: info.engines,
  };
  patched += 1;
  console.log(`[patch-swc-lockfile] added ${key}`);
}

if (patched > 0) {
  const ending = readFileSync(lockPath, 'utf8').endsWith('\r\n') ? '\r\n' : '\n';
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}${ending}`);
  console.log(`[patch-swc-lockfile] Patched ${patched} entries. Run: npm install`);
} else {
  console.log('[patch-swc-lockfile] Lockfile already has all SWC entries for apps/web.');
}
