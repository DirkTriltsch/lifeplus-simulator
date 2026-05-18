import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

const brandThemeColor: Record<string, string> = {
  lifeplus: '#006F44',
  fitline: '#CD0039',
  eqology: '#293C94',
};

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const product = env.VITE_PRODUCT ?? mode ?? 'lifeplus';
  const base = env.VITE_BASE_PATH ?? '/';
  const themeColor = brandThemeColor[product] ?? brandThemeColor.lifeplus;

  const markSrc = fileURLToPath(new URL(`../website/marks/${product}.svg`, import.meta.url));
  const faviconDst = fileURLToPath(new URL('./public/favicon.svg', import.meta.url));
  await mkdir(dirname(faviconDst), { recursive: true });
  await copyFile(markSrc, faviconDst);

  return {
    base,
    plugins: [
      react(),
      {
        name: 'brand-theme-color',
        transformIndexHtml(html: string) {
          return html.replace(
            /<meta name="theme-color" content="[^"]*"\s*\/>/,
            `<meta name="theme-color" content="${themeColor}" />`,
          );
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: `${product} simulator`,
          short_name: `${product} sim`,
          description: 'MLM Verguetungs-Simulator',
          theme_color: themeColor,
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          scope: base,
        },
      }),
    ],
    resolve: {
      alias: {
        '@mlm/simulator-core': `${repoRoot}packages/simulator-core/src/index.ts`,
        '@mlm/product-lifeplus': `${repoRoot}packages/product-lifeplus/src/index.ts`,
        '@mlm/product-fitline': `${repoRoot}packages/product-fitline/src/index.ts`,
        '@mlm/product-eqology': `${repoRoot}packages/product-eqology/src/index.ts`,
        '@mlm/product-registry': `${repoRoot}packages/product-registry/src/index.ts`,
      },
    },
    build: {
      outDir: `${repoRoot}dist/${product}`,
      emptyOutDir: true,
      sourcemap: false,
    },
  };
});
