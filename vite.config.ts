import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: true, port: 5301, strictPort: true },
  build: { chunkSizeWarningLimit: 2000 },
});
