import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const API_TARGET = process.env.API_URL ?? 'http://localhost:50200';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  envDir: '..',
  optimizeDeps: {
    exclude: ['@hiai/ui'],
  },
  // The app imports backend modules in-process (auth/db/services via ../../backend).
  // Keep the backend's Node/native runtime deps EXTERNAL so they are required from
  // node_modules at runtime instead of being bundled into the SvelteKit server build
  // (bundling pino's worker-transport breaks with `__dirname is not defined` in ESM).
  ssr: {
    // Keep only native/runtime deps external — ESM libraries (better-auth,
    // elysia, drizzle-orm, stripe, etc.) bundle fine with Vite's SSR and
    // cause "writeBundle unresolved Promise" deadlocks when externalized.
    external: ['pino', 'pino-pretty', 'postgres', 'ioredis'],
  },
  server: {
    port: 50201,
    // Vite's default host allowlist blocks every Host header except
    // localhost. In dev we accept any host — vite is a dev-only server
    // (not used in production builds). If a future deployment scenario
    // needs strict host checks, gate this on NODE_ENV.
    allowedHosts: true,
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
      '/api/notifications': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
      '/api/profile': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
