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
tests.push('examples/web/verify-checks.test.mjs', 'examples/web3d/core/core.test.mjs', 'examples/web3d/core/game.test.mjs');

for (const args of [
  ['--test', ...tests],
  ['scripts/lint-skills.mjs', 'skills/engine-r3f', 'skills/engine-babylon', 'skills/engine-visual-polish',
    'skills/engine-asset-import', 'skills/engine-custom-shaders', '--require-claims', '--skill-md-labels'],
  // Every skill requires an evidence label on every claim bullet and a labelled bullet in every section.
  // engine-selection is a selector with many references, so its SKILL.md budget is wider.
  ['scripts/lint-skills.mjs', 'skills/engine-selection', '--require-claims', '--skill-md-labels', '--max-skill-bytes', '8500'],
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.error) console.error(result.error);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
