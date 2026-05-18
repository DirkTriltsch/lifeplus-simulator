import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const product = env.VITE_PRODUCT ?? mode ?? 'lifeplus';

  return {
    base: '/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: `${product} simulator`,
          short_name: `${product} sim`,
          description: 'MLM Verguetungs-Simulator',
          theme_color: '#1D9E75',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
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
