import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/test-setup.ts']
  },
  resolve: {
    alias: {
      '@app-core/': `${resolve(__dirname, 'src/app/core')}/`
    }
  }
});
