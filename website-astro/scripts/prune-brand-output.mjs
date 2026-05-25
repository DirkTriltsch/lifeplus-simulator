import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const brand = process.argv[2];
const allowed = new Set(['lifeplus', 'fitline', 'eqology']);

if (!allowed.has(brand)) {
  console.error(`Usage: node scripts/prune-brand-output.mjs <${[...allowed].join('|')}>`);
  process.exit(1);
}

const outDir = resolve(process.cwd(), '..', 'dist', `site-${brand}`);
const generatedContentFiles = [
  'content-assets.mjs',
  'content-modules.mjs',
  'data-store.json',
];

await Promise.all(
  generatedContentFiles.map((file) => rm(resolve(outDir, file), { force: true }))
);
