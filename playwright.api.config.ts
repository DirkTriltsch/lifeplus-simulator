import { defineConfig } from '@playwright/test';

const baseURL = process.env.CHECKOUT_API_BASE ?? 'https://api.lifeflow360.app';

export default defineConfig({
  testDir: './tests/api',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    extraHTTPHeaders: {
      accept: 'application/json',
    },
  },
});
