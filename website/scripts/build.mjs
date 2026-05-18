// website/scripts/build.mjs
// Erzeugt pro Brand eine statische Microsite in dist/site-<brand>/
// Aufruf:  node scripts/build.mjs            (alle Brands)
//          node scripts/build.mjs lifeplus   (nur einer)

import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(ROOT, '..');
const TEMPLATES = join(ROOT, 'templates');
const PUBLIC = join(ROOT, 'public');
const MARKS = join(ROOT, 'marks');
const DIST_ROOT = join(REPO_ROOT, 'dist');

const brandsConfig = JSON.parse(await readFile(join(ROOT, 'brands.json'), 'utf8'));
const contact = brandsConfig._contact;

const targetBrand = process.argv[2];
const brandIds = targetBrand
  ? [targetBrand]
  : Object.keys(brandsConfig).filter((k) => !k.startsWith('_'));

const pages = ['index.html', 'impressum.html', 'datenschutz.html'];

function tokensFor(brand) {
  const lockup = brand.lockup ?? {};
  return {
    SITE_NAME: brand.siteName,
    SITE_DOMAIN: brand.siteDomain,
    APP_URL: brand.appUrl,
    PRODUCT_NAME: brand.productName,
    ACCENT_COLOR: brand.accentColor,
    ACCENT_COLOR_DARK: brand.accentColorDark,
    CLAIM: brand.claim,
    SUB_CLAIM: brand.subClaim,
    LOCKUP_INITIAL: lockup.initial,
    LOCKUP_NEUTRAL: lockup.wordNeutral,
    LOCKUP_ACCENT: lockup.wordAccent,
    LOCKUP_MARK_FILL: lockup.markFill,
    LOCKUP_DARK_BG: lockup.darkBg,
    LOCKUP_ACCENT_ON_DARK: lockup.accentOnDark,
    LOCKUP_WAVE_COLOR: lockup.waveColor,
    LOCKUP_TAGLINE_DE: lockup.taglineDe,
    CONTACT_NAME: contact.name,
    CONTACT_ADDR1: contact.addressLine1,
    CONTACT_ADDR2: contact.addressLine2,
    CONTACT_ADDR3: contact.addressLine3,
    CONTACT_PHONE: contact.phone,
    CONTACT_EMAIL: contact.email,
  };
}

function replaceTokens(content, tokens) {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (tokens[key] === undefined) {
      console.warn(`  ! unknown token: ${match}`);
      return match;
    }
    return tokens[key];
  });
}

async function copyDir(src, dest) {
  if (!existsSync(src)) return;
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

for (const brandId of brandIds) {
  const brand = brandsConfig[brandId];
  if (!brand) {
    console.error(`Unknown brand: ${brandId}`);
    process.exit(1);
  }

  const outDir = join(DIST_ROOT, `site-${brandId}`);
  console.log(`\nBuilding ${brand.siteName} -> dist/site-${brandId}/`);

  await mkdir(outDir, { recursive: true });

  // 1. Copy public assets (robots.txt etc.)
  await copyDir(PUBLIC, outDir);

  // 2. Brand-specific favicon
  await copyFile(join(MARKS, `${brandId}.svg`), join(outDir, 'favicon.svg'));

  // 3. Copy shared CSS
  await copyFile(join(TEMPLATES, 'styles.css'), join(outDir, 'styles.css'));

  // 3. Render each HTML template
  const tokens = tokensFor(brand);
  for (const page of pages) {
    const template = await readFile(join(TEMPLATES, page), 'utf8');
    const rendered = replaceTokens(template, tokens);
    await writeFile(join(outDir, page), rendered, 'utf8');
    console.log(`  ✓ ${page}`);
  }
}

console.log('\nDone.');
