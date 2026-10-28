// One list of Chromium flags for a real GPU: gpuArgs() in examples/web/verify-checks.mjs. Every verifier in this repo that launches a GPU browser takes its
// flags from it, and this test fails when a launch site drops the list or builds its own. The Phaser harness and probes, which had their own launch sites,
// moved to the agent-phaser plugin with their own copy of verify-checks.mjs and their own version of this test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gpuArgs, chromiumArgs } from '../examples/web/verify-checks.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path), 'utf8');

test('gpuArgs() names the platform ANGLE backend and the two GPU-selection flags', () => {
  assert.deepEqual(gpuArgs('win32'), ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--force_high_performance_gpu']);
  assert.deepEqual(gpuArgs('darwin'), ['--use-angle=metal', '--ignore-gpu-blocklist', '--force_high_performance_gpu']);
  assert.deepEqual(gpuArgs('linux'), ['--use-angle=gl', '--ignore-gpu-blocklist', '--force_high_performance_gpu']);
});

test('the sample-scene verifier launches with chromiumArgs(), which starts from gpuArgs()', () => {
  const source = read('examples/web/verify.mjs');
  assert.match(source, /import \{[^}]*\bchromiumArgs\b[^}]*\} from '\.\/verify-checks\.mjs'/, 'verify.mjs does not import chromiumArgs');
  assert.match(source, /chromiumArgs\(opts\)/, 'verify.mjs does not call chromiumArgs()');
  assert.deepEqual(chromiumArgs({ autoplay: false, platform: 'win32' }), gpuArgs('win32'));
  assert.ok(!/--use-angle=/.test(source), 'verify.mjs builds its own --use-angle list');
});

test('every 3D web verifier that launches a GPU browser imports gpuArgs() and does not build its own list', () => {
  for (const file of ['examples/web3d/r3f/verify.mjs', 'examples/web3d/babylon/verify.mjs']) {
    const source = read(file);
    assert.match(source, /import \{[^}]*\bgpuArgs\b[^}]*\} from '\.\.\/\.\.\/web\/verify-checks\.mjs'/, `${file} does not import gpuArgs`);
    assert.match(source, /args: gpuArgs\(\)/, `${file} does not launch with gpuArgs()`);
    assert.ok(!/--use-angle=/.test(source), `${file} builds its own --use-angle list`);
  }
});

test('the R3F flag-choice printer derives its ANGLE flag from the shared backend picker', () => {
  const source = read('examples/web3d/r3f/renderer-flags.mjs');
  assert.match(source, /import \{[^}]*\bangleBackend\b[^}]*\} from '\.\.\/\.\.\/web\/verify-checks\.mjs'/);
  assert.match(source, /--use-angle=\$\{angleBackend\(\)\}/);
});
