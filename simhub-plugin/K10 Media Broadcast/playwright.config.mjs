import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 15000,
  retries: 0,
  use: {
    headless: true,
    viewport: { width: 1280, height: 600 },
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  },
});
