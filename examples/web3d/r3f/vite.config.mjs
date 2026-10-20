import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The probe reports the dependency versions it was built with, read from package.json so they cannot drift.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [react()],
  define: { __VERSIONS__: JSON.stringify({ fiber: pkg.dependencies['@react-three/fiber'], vite: pkg.devDependencies.vite }) },
  server: { fs: { allow: ['..'] } }, // the core lives one folder up
});
