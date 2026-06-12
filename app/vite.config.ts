import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const API_TARGET = process.env.API_URL ?? 'http://localhost:50200';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  envDir: '..',
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
    },
  },
});
