import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Add this proxy block:
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Your Express backend port
        changeOrigin: true,
        secure: false,
      },
    },
  },
});