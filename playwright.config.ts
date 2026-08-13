import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run start -- --port 15301',
    url: 'http://localhost:15301',
    reuseExistingServer: true
  },
  use: {
    baseURL: 'http://localhost:15301'
  }
});
