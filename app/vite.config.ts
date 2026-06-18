import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const API_TARGET = process.env.API_URL ?? 'http://localhost:50200';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  envDir: '..',
  // The app imports backend modules in-process (auth/db/services via ../../backend).
  // Keep the backend's Node/native runtime deps EXTERNAL so they are required from
  // node_modules at runtime instead of being bundled into the SvelteKit server build
  // (bundling pino's worker-transport breaks with `__dirname is not defined` in ESM).
  ssr: {
    external: [
      'pino',
      'pino-pretty',
      'postgres',
      'ioredis',
      'better-auth',
      '@better-auth/kysely-adapter',
      'kysely',
      'drizzle-orm',
      'elysia',
      '@elysiajs/cors',
      'stripe',
    ],
  },
  server: {
    port: 50201,
    proxy: {
      '/api/auth': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
      '/api/events': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
        ws: false,
      },
      '/api/users/me': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
      '/api/analytics': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
      '/api/tenants': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
      '/api/audit': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
      '/api/billing': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
      '/api/settings': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
      '/api/integrations': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
      '/api/rbac': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
      '/api/site-adapters': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
