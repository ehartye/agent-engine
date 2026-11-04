// Opt-in real browser fixtures. PLAYWRIGHT_DIR selects an existing Playwright >=1.48 installation.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { captureStartup } from './startup-diagnostics.mjs';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_DIR ?? 'playwright');
const root = await mkdtemp(join(tmpdir(), 'engine-startup-browser-'));
let sentinelHits = 0;
const sentinel = createServer((_, res) => { sentinelHits++; res.end('unrelated'); });
await new Promise(resolve => sentinel.listen(0, '127.0.0.1', resolve));
const foreign = `http://127.0.0.1:${sentinel.address().port}/SECRET`;
const bytes = Buffer.from(`globalThis.__startupDiagnostics={ready:false,sceneCreated:false,loaderPending:1,phase:'failed'};
fetch('/missing.js');fetch('/abort');fetch('${foreign}').catch(()=>{});
fetch('/redirect').catch(()=>{});throw new Error('Cannot create WebGL context SECRET');`);
const source = join(root, 'app.js'); await writeFile(source, bytes);
const missing = join(root, 'missing.js'); await writeFile(missing, 'missing expected source');
const server = createServer((req, res) => {
  if (req.url === '/abort') return req.socket.destroy();
  if (req.url === '/redirect') { res.writeHead(302, { location: foreign }); return res.end(); }
  const body = req.url === '/app.js' ? bytes : req.url === '/ok' ? Buffer.from(`<script>window.__gl=document.createElement('canvas').getContext('webgl2');window.__startupDiagnostics={ready:true,sceneCreated:true,loaderPending:0,phase:'scene'};</script>`) : req.url === '/' ? Buffer.from('<script src="/app.js"></script>') : Buffer.from('not found');
  res.writeHead(['/app.js', '/', '/ok'].includes(req.url) ? 200 : 404,
    { 'content-type': req.url === '/app.js' ? 'text/javascript' : 'text/html', 'content-length': body.length }); res.end(body);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const options = { chromium, url, outParent: root, timeoutMs: 1500,
  assets: [{ label: 'app', pathname: '/app.js', source }, { label: 'missing', pathname: '/missing.js', source: missing }] };
try {
  const failed = await captureStartup(options);
  assert.equal(failed.report.outcome, 'failed'); assert.equal(failed.report.cleanup, 'closed');
  assert.equal(failed.report.application.sceneCreated, false);
  assert.equal(failed.report.responses.find(r => r.label === 'app').matchesSource, true);
  assert.equal(failed.report.responses.find(r => r.label === 'missing').status, 404);
  assert.ok(failed.report.errors.some(e => e.event === 'pageerror' && e.kind === 'webgl-context'));
  assert.ok(failed.report.errors.some(e => e.event === 'requestfailed'));
  assert.equal(JSON.stringify(failed.report).includes('SECRET'), false);
  assert.equal(sentinelHits, 0);
  const success = await captureStartup({ ...options, url: url + 'ok' });
  assert.equal(success.report.outcome, 'ready-observed'); assert.equal(success.report.cleanup, 'closed');
  const launch = await captureStartup({ ...options, chromium: { launch: opts => chromium.launch({ ...opts, executablePath: join(root, 'nonexistent-browser') }) } });
  assert.equal(launch.report.launch, 'failed'); assert.equal(launch.report.browserVersion, null);
  assert.equal(JSON.parse(await readFile(join(launch.directory, 'receipt.json'))).outcome, 'failed');
  // Prove the unrelated sentinel remained healthy after owned-browser cleanup.
  assert.equal(await (await fetch(foreign)).text(), 'unrelated'); assert.equal(sentinelHits, 1);
  console.log(JSON.stringify({ pass: true, fixtureRoot: root, browserVersion: failed.report.browserVersion,
    cases: ['pre-scene-failure', 'ready-observed', 'failed-launch', 'secret-redaction', 'cross-origin-and-redirect-block', 'unrelated-server-survives'],
    supportProbe: failed.report.supportProbe, applicationContext: success.report.application.context }, null, 2));
} finally {
  server.closeAllConnections(); sentinel.closeAllConnections();
  await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => sentinel.close(resolve))]);
}
