import { defineConfig } from 'vite';

export default defineConfig({
  // host: true permite abrir el juego desde el celular en la misma red WiFi.
  // strictPort: si el puerto está ocupado, falla en vez de cambiarse solo.
  server: { host: true, port: 5301, strictPort: true },
  build: { chunkSizeWarningLimit: 2000 },
});
