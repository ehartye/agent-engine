import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// The probe reports the dependency versions it was built with, read from package.json so they cannot drift.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  define: { __VERSIONS__: JSON.stringify({ vite: pkg.devDependencies.vite }) },
  server: { fs: { allow: ['..'] } }, // the core lives one folder up
});
