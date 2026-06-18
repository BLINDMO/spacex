import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Relative base so the built bundle works when served from a GitHub Pages project
// subpath (https://<user>.github.io/spacex/) as well as from root.
export default defineConfig({
    base: './',
    plugins: [react()],
    server: { host: true },
});
