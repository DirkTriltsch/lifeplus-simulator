// One-shot SVG-to-PNG converter for brand icons used in Paddle invoice emails.
// Usage:
//   node scripts/svg-to-png.mjs <brand-id> [size] [border]
// Example:
//   node scripts/svg-to-png.mjs lifeplus 90 6

import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const brandId = process.argv[2] ?? 'lifeplus';
const size = Number(process.argv[3] ?? 90);
const border = Number(process.argv[4] ?? 6);
const inner = size - border * 2;

if (inner <= 0) {
  console.error(`Invalid size/border: inner content would be ${inner}px.`);
  process.exit(1);
}

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const srcSvg = join(repoRoot, 'website', 'marks', `${brandId}.svg`);
const outPng = join(repoRoot, 'website', 'marks', `${brandId}-paddle.png`);

const svgBuffer = await readFile(srcSvg);

const pngBuffer = await sharp(svgBuffer, { density: 384 })
  .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({
    top: border,
    bottom: border,
    left: border,
    right: border,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png({ compressionLevel: 9 })
  .toBuffer();

await writeFile(outPng, pngBuffer);

console.log(`Wrote ${outPng} (${size}x${size}, content ${inner}x${inner}, border ${border}px)`);
