import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, mkdir, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { captureStartup, snapshot } from '../examples/web/startup-diagnostics.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'engine-startup-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'app.js'); await writeFile(source, 'expected');
  return { root, options: { outParent: root, url: 'http://127.0.0.1:4321/', timeoutMs: 100,
    assets: [{ label: 'app', pathname: '/app.js', source }] } };
}
function mock({ timeout = false, goto, newPage, close } = {}) {
  const page = new EventEmitter();
  page.evaluate = async fn => fn === snapshot ? { ready: false, sceneCreated: false, loaderPending: 2 } : { context: true };
  page.goto = async () => goto?.(page);
  page.waitForFunction = async () => { if (timeout) throw new Error('timeout SECRET'); };
  let closed = 0;
  let handler;
  const context = { route: async (_, fn) => { handler = fn; }, routeWebSocket: async () => {}, newPage: newPage ?? (async () => page) };
  const browser = { version: () => '123.0', newContext: async () => context, close: async () => { closed++; await close?.(); } };
  return { chromium: { launch: async () => browser }, closed: () => closed, route: (...args) => handler(...args) };
}
test('failed launch retains source identity and sanitized evidence', async t => {
  const { options } = await fixture(t);
  const { report, directory } = await captureStartup({ ...options, chromium: { launch: async () => { throw new Error('launch SECRET'); } } });
  assert.equal(report.launch, 'failed'); assert.equal(report.browserVersion, null);
  assert.equal(report.sources[0].sha256.length, 64);
  assert.equal(report.cleanup, 'no-browser-returned');
  assert.equal((await readFile(join(directory, 'receipt.json'), 'utf8')).includes('SECRET'), false);
});
test('timeout retains independent support, scene, failed HTTP, mismatched served bytes and errors', async t => {
  const { options } = await fixture(t);
  const fake = mock({ timeout: true, goto(page) {
    page.emit('pageerror', new Error('Cannot create WebGL context SECRET'));
    page.emit('requestfailed', { url: () => 'http://user:SECRET@remote.invalid/private?token=SECRET' });
    page.emit('response', { url: () => `${options.url}app.js`, status: () => 404,
      headers: () => ({ 'content-length': '6' }), body: async () => Buffer.from('actual') });
  } });
  const { report } = await captureStartup({ ...options, chromium: fake.chromium });
  assert.equal(report.outcome, 'failed'); assert.equal(report.supportProbe.context, true);
  assert.equal(report.application.sceneCreated, false); assert.equal(report.responses[0].status, 404);
  assert.equal(report.responses[0].matchesSource, false); assert.equal(report.responses[0].pathname, '/app.js');
  assert.equal(JSON.stringify(report).includes('SECRET'), false); assert.equal(fake.closed(), 1);
});
test('new-page stall is bounded and closes owned browser', async t => {
  const { options } = await fixture(t);
  const fake = mock({ newPage: () => new Promise(() => {}) });
  const result = await captureStartup({ ...options, chromium: fake.chromium });
  assert.equal(result.report.outcome, 'failed'); assert.equal(fake.closed(), 1);
});
test('receipt I/O failure still closes owned browser', async t => {
  const { root, options } = await fixture(t);
  const fake = mock({ async goto() {
    const dir = (await readdir(root)).find(name => name.startsWith('startup-'));
    await mkdir(join(root, dir, 'receipt.tmp'));
  } });
  await assert.rejects(captureStartup({ ...options, chromium: fake.chromium }));
  assert.equal(fake.closed(), 1);
});
test('rejects unsafe inputs before launch or report creation', async t => {
  const { options } = await fixture(t); const fake = mock();
  for (const overrides of [{ url: 'https://remote.invalid/' }, { url: options.url + '?token=SECRET' },
    { args: ['--proxy-server=SECRET'] }, { timeoutMs: 0 },
    { assets: [options.assets[0], { ...options.assets[0], pathname: '/other.js' }] },
    { assets: [{ ...options.assets[0], label: 'unmapped-url' }] }]) {
    await assert.rejects(captureStartup({ ...options, ...overrides, chromium: fake.chromium }));
  }
});
test('event floods are capped and missing size does not claim byte identity', async t => {
  const { options } = await fixture(t);
  const fake = mock({ goto(page) {
    page.emit('response', { url: () => options.url + 'app.js', status: () => 200,
      headers: () => ({}), body: () => { throw new Error('must not read unbounded body'); } });
    for (let i = 0; i < 300; i++) page.emit('pageerror', new Error('SECRET'));
  } });
  const { report } = await captureStartup({ ...options, chromium: fake.chromium });
  assert.equal(report.responses[0].hash, 'size-unverified');
  assert.equal(report.errors.length + report.responses.length, 256);
  assert.equal(report.droppedEvents, 45);
});
test('routing refuses cross-origin traffic and never follows redirects', async t => {
  const { options } = await fixture(t); let aborted = 0, fetched = 0;
  const fake = mock({ async goto() {
    const route = url => ({ request: () => ({ url: () => url }), abort: async () => { aborted++; },
      fetch: async opts => { fetched++; assert.equal(opts.maxRedirects, 0); return { status: () => 302 }; },
      fulfill: async () => assert.fail('redirect must not be fulfilled') });
    await fake.route(route('http://other.invalid/SECRET'));
    await fake.route(route(options.url + 'redirect'));
  } });
  const { report } = await captureStartup({ ...options, chromium: fake.chromium });
  assert.equal(aborted, 2); assert.equal(fetched, 1);
  assert.deepEqual(report.errors.map(e => e.event), ['blocked-request', 'blocked-redirect']);
});
test('cleanup timeout preserves an explicit unconfirmed receipt', async t => {
  const { options } = await fixture(t); const fake = mock({ close: () => new Promise(() => {}) });
  const { report, directory } = await captureStartup({ ...options, chromium: fake.chromium });
  assert.equal(report.cleanup, 'unconfirmed');
  assert.equal(JSON.parse(await readFile(join(directory, 'receipt.json'))).cleanup, 'unconfirmed');
});
test('late responses cannot add undrained pending hashes', async t => {
  const { options } = await fixture(t);
  const fake = mock({ goto(page) {
    const response = { url: () => options.url + 'app.js', status: () => 200,
      headers: () => ({ 'content-length': '8' }), body: () => new Promise(resolve => setTimeout(() => resolve(Buffer.from('expected')), 60)) };
    page.emit('response', response);
    setTimeout(() => page.emit('response', response), 20);
  } });
  const { report } = await captureStartup({ ...options, chromium: fake.chromium });
  assert.equal(report.responses.length, 1); assert.equal(report.responses[0].hash, 'captured');
});
test('repeated runs retain distinct receipts without overwriting user evidence', async t => {
  const { options } = await fixture(t); const fake = mock();
  const first = await captureStartup({ ...options, chromium: fake.chromium });
  const bytes = await readFile(join(first.directory, 'receipt.json'));
  const second = await captureStartup({ ...options, chromium: fake.chromium });
  assert.notEqual(first.directory, second.directory);
  assert.deepEqual(await readFile(join(first.directory, 'receipt.json')), bytes);
  assert.equal(second.report.outcome, 'ready-observed');
});
