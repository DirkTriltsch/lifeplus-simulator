import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distRoot = join(repoRoot, 'dist');
const outDir = join(distRoot, 'site-lifeplus');

await mkdir(outDir, { recursive: true });

await rm(join(outDir, 'app'), { recursive: true, force: true });
await mkdir(join(outDir, 'app'), { recursive: true });
await cp(join(distRoot, 'lifeplus'), join(outDir, 'app'), { recursive: true });

await mkdir(join(outDir, '.vscode'), { recursive: true });
await writeFile(
  join(outDir, '.vscode', 'sftp.json'),
  JSON.stringify(
    {
      name: 'LifePlus Website',
      host: 'home17046326.1and1-data.host',
      protocol: 'sftp',
      port: 22,
      username: 'acc310740413',
      password: 'acc310740413_lifeflow360_app',
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

console.log('Added app/ subdirectory to dist/site-lifeplus.');
