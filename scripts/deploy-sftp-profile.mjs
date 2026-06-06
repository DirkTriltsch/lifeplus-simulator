import { readdir, readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const profileName = process.argv.slice(2).join(' ');
if (!profileName) {
  console.error('Usage: node scripts/deploy-sftp-profile.mjs <profile-name>');
  process.exit(1);
}

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const configPath = join(repoRoot, '.vscode', 'sftp.json');
const profiles = JSON.parse(await readFile(configPath, 'utf8'));
const profile = profiles.find((entry) => entry.name === profileName);
if (!profile) {
  console.error(`No SFTP profile "${profileName}" in .vscode/sftp.json`);
  process.exit(1);
}

const localRoot = resolve(repoRoot, profile.context);
const remoteRoot = normalizeRemote(profile.remotePath || '/');
const ignore = new Set(profile.ignore ?? []);
const ssh2Root =
  process.env.SSH2_MODULE_ROOT ??
  join(
    process.env.USERPROFILE ?? '',
    '.vscode',
    'extensions',
    'natizyskunk.sftp-1.16.3',
    'node_modules',
  );
const require = createRequire(import.meta.url);
const { Client } = require(join(ssh2Root, 'ssh2'));

const files = await collectFiles(localRoot, ignore);
files.sort((a, b) => {
  const aBase = basename(a);
  const bBase = basename(b);
  if (aBase === 'index.html') return 1;
  if (bBase === 'index.html') return -1;
  return a.localeCompare(b);
});

const client = new Client();
await new Promise((resolveConnect, rejectConnect) => {
  client
    .on('ready', resolveConnect)
    .on('error', rejectConnect)
    .connect({
      host: profile.host,
      port: profile.port ?? 22,
      username: profile.username,
      password: profile.password,
    });
});

try {
  const sftp = await new Promise((resolveSftp, rejectSftp) => {
    client.sftp((err, instance) => {
      if (err) rejectSftp(err);
      else resolveSftp(instance);
    });
  });

  await ensureRemoteDir(sftp, remoteRoot);
  let uploaded = 0;
  for (const file of files) {
    const rel = relative(localRoot, file).split(sep).join('/');
    const remoteFile = joinRemote(remoteRoot, rel);
    await ensureRemoteDir(sftp, remoteDirname(remoteFile));
    await putFile(sftp, file, remoteFile);
    uploaded++;
    console.log(`uploaded ${rel}`);
  }

  console.log(`Uploaded ${uploaded} files to ${profile.name}.`);
} finally {
  client.end();
}

async function collectFiles(root, ignore) {
  const result = [];

  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (ignore.has(entry.name)) continue;
      const fullPath = join(dir, entry.name);
      const rel = relative(root, fullPath).split(sep).join('/');
      if ([...ignore].some((item) => item && rel.startsWith(`${item}/`))) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        result.push(fullPath);
      }
    }
  }

  await stat(root);
  await walk(root);
  return result;
}

function normalizeRemote(path) {
  const normalized = path.replaceAll('\\', '/').replace(/\/+$/u, '');
  return normalized.startsWith('/') ? normalized || '/' : `/${normalized}`;
}

function joinRemote(root, rel) {
  return normalizeRemote(`${root}/${rel}`);
}

function remoteDirname(path) {
  const parts = normalizeRemote(path).split('/');
  parts.pop();
  return parts.join('/') || '/';
}

async function ensureRemoteDir(sftp, path) {
  const normalized = normalizeRemote(path);
  if (normalized === '/') return;

  const parts = normalized.split('/').filter(Boolean);
  let current = '';
  for (const part of parts) {
    current += `/${part}`;
    await new Promise((resolveMkdir, rejectMkdir) => {
      sftp.mkdir(current, (err) => {
        if (!err || err.code === 4) resolveMkdir();
        else rejectMkdir(err);
      });
    });
  }
}

async function putFile(sftp, localFile, remoteFile) {
  await new Promise((resolvePut, rejectPut) => {
    sftp.fastPut(localFile, remoteFile, (err) => {
      if (err) rejectPut(err);
      else resolvePut();
    });
  });
}
