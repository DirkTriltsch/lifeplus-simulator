import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

const brand = process.env.ASTRO_BRAND;
if (!brand) {
  throw new Error('ASTRO_BRAND env var required (lifeplus | fitline | eqology)');
}

const sharedPath = fileURLToPath(new URL('./src/shared/', import.meta.url));
const sharedAlias = sharedPath.replace(/\\/g, '/').replace(/\/$/, '');

export default defineConfig({
  srcDir: `./src/brands/${brand}`,
  publicDir: `./src/brands/${brand}/public`,
  outDir: `../dist/site-${brand}`,
  build: {
    // erzeugt /pricing.html statt /pricing/index.html — kompatibel zum heutigen Build
    format: 'file',
  },
  vite: {
    resolve: {
      alias: {
        '@shared': sharedAlias,
      },
    },
  },
});
