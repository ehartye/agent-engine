// The same dependency-free merge checks run locally and in CI. Browser/GPU
// sample acceptance is separate and needs its documented engine setup.
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tests = ['scripts', 'tests'].flatMap(directory =>
  readdirSync(join(root, directory))
    .filter(name => name.endsWith('.test.mjs'))
    .sort()
    .map(name => `${directory}/${name}`)
);
tests.push('examples/web/verify-checks.test.mjs', 'examples/web/harness/tests/no-sleeps.test.mjs');

for (const args of [
  ['--test', ...tests],
  ['scripts/lint-skills.mjs', 'skills/engine-r3f', 'skills/engine-babylon',
    'skills/phaser-architecture', 'skills/engine-visual-polish',
    '--require-claims', '--skill-md-labels'],
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.error) console.error(result.error);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
