import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@mlm/simulator-core': `${root}packages/simulator-core/src/index.ts`,
      '@mlm/product-lifeplus': `${root}packages/product-lifeplus/src/index.ts`,
      '@mlm/product-fitline': `${root}packages/product-fitline/src/index.ts`,
      '@mlm/product-eqology': `${root}packages/product-eqology/src/index.ts`,
      '@mlm/product-registry': `${root}packages/product-registry/src/index.ts`,
    },
  },
});
