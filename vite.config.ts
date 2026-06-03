import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/ipt-api': {
        target: 'https://mainoffice.uz:8181',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ipt-api/, ''),
      },
    },
  },
});
