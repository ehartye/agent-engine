// node renderer-flags.mjs
// Prints which WebGL 2 renderer headless Chromium picks for each launch-flag set on this machine. It reports, it does
// not pass or fail: the answer depends on the GPUs, drivers and platform, which is the point.
import { chromium } from 'playwright';
import { angleBackend, SOFTWARE_RENDERER } from '../../web/verify-checks.mjs';

const angle = `--use-angle=${angleBackend()}`;
const sets = [
  ['no flags', []],
  [`${angle} --ignore-gpu-blocklist`, [angle, '--ignore-gpu-blocklist']],
  [`${angle} --ignore-gpu-blocklist --force_high_performance_gpu`, [angle, '--ignore-gpu-blocklist', '--force_high_performance_gpu']],
];

for (const [label, args] of sets) {
  const browser = await chromium.launch({ headless: true, args });
  const page = await browser.newPage();
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return null;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'masked';
  });
  console.log(`${renderer && SOFTWARE_RENDERER.test(renderer) ? 'software' : renderer ? 'hardware' : 'none    '}  ${label}\n          ${renderer}`);
  await browser.close();
}
