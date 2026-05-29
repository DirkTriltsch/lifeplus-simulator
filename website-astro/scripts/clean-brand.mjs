import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const brand = process.argv[2];
const allowed = new Set(['lifeplus', 'fitline', 'eqology']);

if (!allowed.has(brand)) {
  console.error(`Usage: node scripts/clean-brand.mjs <${[...allowed].join('|')}>`);
  process.exit(1);
}

const outDir = resolve(process.cwd(), '..', 'dist', `${brand}-website`);
await rm(outDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 500 });
