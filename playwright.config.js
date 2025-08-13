const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test',
  testMatch: /.*\.spec\.(ts|js)/,
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 900 }
  },
  webServer: {
    command: 'npx http-server -p 5173 -c-1 .',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  },
  reporter: process.env.CI ? 'dot' : 'list'
});
