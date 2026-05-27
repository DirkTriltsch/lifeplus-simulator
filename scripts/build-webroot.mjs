import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const brandId = process.argv[2];
if (!brandId) {
  console.error('Usage: node scripts/build-webroot.mjs <brand-id>');
  process.exit(1);
}

const brandLabels = {
  lifeplus: 'LifePlus',
  fitline: 'FitLine',
  eqology: 'Eqology',
};
const label = brandLabels[brandId];
if (!label) {
  console.error(`Unknown brand: ${brandId}. Expected one of: ${Object.keys(brandLabels).join(', ')}`);
  process.exit(1);
}

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distRoot = join(repoRoot, 'dist');
const outDir = join(distRoot, `${brandId}-website`);
const appSrc = join(distRoot, `${brandId}-app`);

const sftpAll = JSON.parse(await readFile(join(repoRoot, '.vscode', 'sftp.json'), 'utf8'));
const websiteSftp = sftpAll.find((entry) => entry.name === `${label} Website`);
if (!websiteSftp) {
  console.error(`No SFTP entry for "${label} Website" in .vscode/sftp.json`);
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
await rm(join(outDir, 'app'), { recursive: true, force: true });
await mkdir(join(outDir, 'app'), { recursive: true });
await cp(appSrc, join(outDir, 'app'), { recursive: true });

await mkdir(join(outDir, '.vscode'), { recursive: true });
await writeFile(
  join(outDir, '.vscode', 'sftp.json'),
  JSON.stringify(
    {
      name: `${label} Website`,
      host: websiteSftp.host,
      protocol: 'sftp',
      port: 22,
      username: websiteSftp.username,
      password: websiteSftp.password,
      remotePath: '/',
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

console.log(`Added app/ subdirectory to dist/${brandId}-website.`);
