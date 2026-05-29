import { readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const brand = process.argv[2];
const allowed = new Set(['lifeplus', 'fitline', 'eqology']);

if (!allowed.has(brand)) {
  console.error(`Usage: node scripts/prune-brand-output.mjs <${[...allowed].join('|')}>`);
  process.exit(1);
}

const outDir = resolve(process.cwd(), '..', 'dist', `${brand}-website`);
const generatedContentFiles = [
  'content-assets.mjs',
  'content-modules.mjs',
  'data-store.json',
  'settings.json',
];

const entries = await readdir(outDir, { withFileTypes: true });
const generatedManifestFiles = entries
  .filter((entry) => entry.isFile() && /^manifest_.*\.mjs$/.test(entry.name))
  .map((entry) => entry.name);

await Promise.all([
  ...generatedContentFiles.map((file) => rm(resolve(outDir, file), { force: true })),
  ...generatedManifestFiles.map((file) => rm(resolve(outDir, file), { force: true })),
  rm(resolve(outDir, 'chunks'), { force: true, recursive: true }),
]);
