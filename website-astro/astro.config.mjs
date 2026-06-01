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
  outDir: `../dist/${brand}-website`,
  cacheDir: './.astro-cache',
  build: {
    // erzeugt /pricing.html statt /pricing/index.html — kompatibel zum heutigen Build
    format: 'file',
  },
  vite: {
    cacheDir: './.vite-cache',
    resolve: {
      alias: {
        '@shared': sharedAlias,
      },
    },
    // Dev-only: /api/* an den lokalen Wrangler weiterreichen, damit
    // Frontend und API same-origin sind (kein CORS, kein Cookie-Drama in
    // Firefox). PUBLIC_API_BASE_URL muss dafuer leer / unset sein, damit
    // Frontend relative URLs nutzt.
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8788',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  },
});
