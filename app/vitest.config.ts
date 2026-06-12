import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [svelte({ hot: false })],
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, 'src/lib'),
    },
    conditions: ['browser'],
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/e2e/**/*.spec.ts'],
    environment: 'jsdom',
    testTimeout: 60_000,
    sequence: { concurrent: false },
  },
});
