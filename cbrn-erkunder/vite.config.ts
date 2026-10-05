import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' => lauffähig als NUI/CEF ohne Server-Root.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'resource/cbrn-erkunder/app', emptyOutDir: true, chunkSizeWarningLimit: 1600 },
});
