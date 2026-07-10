import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A static app: `vite build` + `vite preview` serves it (Railway runs `npm start`).
// No server code here — content arrives via postMessage (editor embed) or a fetch of
// the CMS's public content API (standalone ?src= mode).
export default defineConfig({
  plugins: [react()],
  preview: {
    // vite's DNS-rebinding host check 403s unknown hosts; this app is a public static
    // site meant to be served behind any domain (Railway, custom), so allow all.
    allowedHosts: true,
  },
});
