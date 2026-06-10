import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const API_TARGET = process.env.API_URL ?? 'http://localhost:50200';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    port: 50201,
    proxy: {
      '/api/auth': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
