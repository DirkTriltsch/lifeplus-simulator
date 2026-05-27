// Schreibt das passende SFTP-Profil aus .vscode/sftp.json als nested
// .vscode/sftp.json in das Build-Output-Verzeichnis dist/<brand>-<kind>/
// damit die SFTP-Extension das Profil beim Upload aus dem Ordner findet.
//
// Aufruf: node scripts/write-dist-sftp.mjs <lifeplus|fitline|eqology> <app|website>

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const [brandId, kind] = process.argv.slice(2);
const allowedBrands = new Set(['lifeplus', 'fitline', 'eqology']);
const allowedKinds = new Set(['app', 'website']);

if (!allowedBrands.has(brandId) || !allowedKinds.has(kind)) {
  console.error(
    'Usage: node scripts/write-dist-sftp.mjs <lifeplus|fitline|eqology> <app|website>',
  );
  process.exit(1);
}

const brandLabels = {
  lifeplus: 'LifePlus',
  fitline: 'FitLine',
  eqology: 'Eqology',
};
const kindLabel = kind === 'app' ? 'App' : 'Website';
const profileName = `${brandLabels[brandId]} ${kindLabel}`;

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDir = join(repoRoot, 'dist', `${brandId}-${kind}`);

const allConfigs = JSON.parse(
  await readFile(join(repoRoot, '.vscode', 'sftp.json'), 'utf8'),
);
const profile = allConfigs.find((c) => c.name === profileName);
if (!profile) {
  console.error(`No SFTP profile "${profileName}" in .vscode/sftp.json`);
  process.exit(1);
}

await mkdir(join(distDir, '.vscode'), { recursive: true });
await writeFile(
  join(distDir, '.vscode', 'sftp.json'),
  JSON.stringify(
    {
      name: profileName,
      host: profile.host,
      protocol: 'sftp',
      port: profile.port ?? 22,
      username: profile.username,
      password: profile.password,
      remotePath: profile.remotePath,
      context: '.',
      uploadOnSave: false,
      useTempFile: false,
      openSsh: false,
      ignore: ['.vscode', '.gitignore', 'README.md', 'eRecht24'],
    },
    null,
    2,
  ),
  'utf8',
);

console.log(`Wrote ${distDir}/.vscode/sftp.json (${profileName})`);
