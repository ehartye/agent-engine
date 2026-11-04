// Opt-in diagnostics for a trusted local fixture, never a renderer fallback or scene acceptance gate.
import { mkdtemp, readFile, writeFile, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const FLAGS = new Set(['--use-angle=d3d11', '--use-angle=metal', '--use-angle=gl',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu',
  '--ignore-gpu-blocklist', '--force_high_performance_gpu']);
export function errorKind(error) {
  const text = String(error?.message ?? error);
  if (/webgl|context.*creat/i.test(text)) return 'webgl-context';
  if (/timeout|timed out/i.test(text)) return 'timeout';
  if (/closed|crash/i.test(text)) return 'closed-or-crashed';
  if (/executable.*exist|launch/i.test(text)) return 'launch';
  return 'other'; // Never persist arbitrary exception text, stacks or console payloads.
}

async function bounded(promise, ms) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
  })]); } finally { clearTimeout(timer); }
}

// Serialized by Playwright; only fixed fields, never arbitrary game state.
export function snapshot() {
  const state = globalThis.__startupDiagnostics;
  const gl = globalThis.__gl;
  let renderer = null;
  try {
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      renderer = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER)).slice(0, 512);
    }
  } catch { /* renderer remains unknown */ }
  return {
    ready: typeof state?.ready === 'boolean' ? state.ready : null,
    sceneCreated: typeof state?.sceneCreated === 'boolean' ? state.sceneCreated : null,
    loaderPending: Number.isSafeInteger(state?.loaderPending) && state.loaderPending >= 0 ? state.loaderPending : null,
    phase: ['boot', 'loading', 'scene', 'failed'].includes(state?.phase) ? state.phase : 'unknown',
    context: gl ? (gl.isContextLost() ? 'lost' : 'present') : 'not-exposed', renderer,
  };
}

/** chromium is a Playwright BrowserType. outParent must exist; every run gets a new directory.
 * assets: [{label, pathname, source}] maps public local URLs to source files, up to eight 1 MiB files.
 * Only a trusted, isolated local fixture is supported. No credentials, remote pages or arbitrary flags.
 */
export async function captureStartup({ chromium, url, assets = [], args = [], outParent, timeoutMs = 5000 }) {
  const target = new URL(url);
  if (target.protocol !== 'http:' || !['127.0.0.1', '[::1]', 'localhost'].includes(target.hostname)
      || target.username || target.password || target.search || target.hash) throw new Error('use a credential-free loopback HTTP URL without query or fragment');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) throw new Error('timeoutMs must be 100..30000');
  if (args.some(arg => !FLAGS.has(arg))) throw new Error('unsupported launch flag; no arbitrary values recorded');
  if (assets.length > 8 || new Set(assets.map(a => a.pathname)).size !== assets.length
      || new Set(assets.map(a => a.label)).size !== assets.length) throw new Error('up to eight distinct asset paths and labels');
  for (const asset of assets) {
    if (asset.label === 'unmapped-url' || !/^[a-zA-Z0-9_-]{1,64}$/.test(asset.label) || !/^\/[A-Za-z0-9_./-]*$/.test(asset.pathname)
        || asset.pathname.includes('..')) throw new Error('assets require public labels and simple absolute URL paths');
  }
  const directory = await mkdtemp(join(outParent, 'startup-'));
  const report = { schema: 'startup-diagnostics@1', outcome: 'incomplete', browserVersion: null,
    requestedFlags: args, headless: true, platform: process.platform, node: process.version,
    launch: 'not-attempted', navigation: 'not-attempted', supportProbe: null, application: null,
    sources: [], responses: [], errors: [], droppedEvents: 0, cleanup: 'not-started',
    limits: ['requested flags only; browser default flags not captured', 'decoded response bytes, not wire bytes',
      'unknown URLs and raw error text omitted', 'size-controlled fixture required; decoded body allocation is not bounded',
      'support probe uses a fresh canvas before navigation, not a separate browser context', 'support probe is not application context proof',
      'diagnostics are not scene/art/route acceptance'] };
  async function save() {
    await writeFile(join(directory, 'receipt.tmp'), JSON.stringify(report, null, 2), { mode: 0o600 });
    await rename(join(directory, 'receipt.tmp'), join(directory, 'receipt.json'));
  }
  await save(); // A launch failure still leaves a receipt.
  let browser, page, accepting = true, captureOpen = true;
  const pending = [];
  const record = (list, item) => {
    if (!accepting) return;
    if (report.errors.length + report.responses.length >= 256) report.droppedEvents++;
    else list.push(item);
  };
  const identify = raw => {
    try {
      const parsed = new URL(raw);
      const asset = parsed.origin === target.origin && !parsed.search && !parsed.hash
        ? assets.find(a => a.pathname === parsed.pathname) : null;
      return asset ? { label: asset.label, pathname: asset.pathname } : { label: 'unmapped-url' };
    } catch { return { label: 'unmapped-url' }; }
  };
  try {
    for (const asset of assets) {
      if ((await stat(asset.source)).size > 1048576) throw new Error('source exceeds size bound');
      const bytes = await readFile(asset.source);
      if (bytes.length > 1048576) throw new Error('source exceeds size bound');
      report.sources.push({ label: asset.label, pathname: asset.pathname, bytes: bytes.length, sha256: digest(bytes) });
    }
    await save();
    report.launch = 'pending';
    browser = await chromium.launch({ headless: true, args, timeout: timeoutMs });
    report.launch = 'succeeded';
    report.browserVersion = browser.version();
    const context = await bounded(browser.newContext({ serviceWorkers: 'block' }), timeoutMs);
    await bounded(context.route('**/*', async route => {
      const request = new URL(route.request().url());
      if (request.origin !== target.origin || request.username || request.password) {
        record(report.errors, { event: 'blocked-request', ...identify(request.href) });
        return route.abort().catch(() => {});
      }
      // Playwright routes only the first URL in a redirect chain. Fetch without following
      // redirects, refuse every redirect, and fulfill the observed local response.
      try {
        const response = await route.fetch({ maxRedirects: 0, timeout: timeoutMs });
        if (response.status() >= 300 && response.status() < 400) {
          record(report.errors, { event: 'blocked-redirect', status: response.status(), ...identify(request.href) });
          return await route.abort();
        }
        await route.fulfill({ response });
      } catch {
        record(report.errors, { event: 'route-fetch-failed', ...identify(request.href) });
        await route.abort().catch(() => {});
      }
    }), timeoutMs);
    await bounded(context.routeWebSocket('**/*', socket => socket.close()), timeoutMs);
    page = await bounded(context.newPage(), timeoutMs);
    page.on('pageerror', error => record(report.errors, { event: 'pageerror', kind: errorKind(error) }));
    page.on('console', message => {
      if (['warning', 'error'].includes(message.type())) record(report.errors, { event: `console-${message.type()}`, kind: errorKind(message.text()) });
    });
    page.on('requestfailed', request => record(report.errors, { event: 'requestfailed', ...identify(request.url()) }));
    page.on('response', response => {
      if (!captureOpen) return;
      const identity = identify(response.url());
      const entry = { ...identity, status: response.status(), hash: 'not-selected' };
      record(report.responses, entry);
      if (identity.label === 'unmapped-url' || pending.length >= 8) return;
      const length = Number(response.headers()['content-length']);
      if (!Number.isSafeInteger(length) || length < 0 || length > 1048576) { entry.hash = 'size-unverified'; return; }
      entry.hash = 'pending';
      pending.push(bounded(response.body(), timeoutMs).then(bytes => {
        if (!accepting) return;
        if (bytes.length > 1048576) { entry.hash = 'too-large'; return; }
        entry.hash = 'captured'; entry.bytes = bytes.length; entry.sha256 = digest(bytes);
        entry.matchesSource = report.sources.find(s => s.label === identity.label)?.sha256 === entry.sha256;
      }, () => { if (accepting) entry.hash = 'unavailable'; }));
    });
    report.supportProbe = await bounded(page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const result = { context: Boolean(gl) };
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
      return result;
    }), timeoutMs);
    report.navigation = 'pending';
    await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    report.navigation = 'succeeded';
    await page.waitForFunction(() => globalThis.__startupDiagnostics?.ready === true, null, { timeout: timeoutMs });
    report.outcome = 'ready-observed';
  } catch (error) {
    report.outcome = 'failed';
    if (report.launch === 'pending') report.launch = 'failed';
    if (report.navigation === 'pending') report.navigation = 'failed';
    record(report.errors, { event: 'harness', kind: errorKind(error) });
  } finally {
    if (page) {
      try { report.application = await bounded(page.evaluate(snapshot), Math.min(timeoutMs, 2000)); }
      catch { record(report.errors, { event: 'snapshot', kind: 'unavailable' }); }
    }
    captureOpen = false;
    await Promise.all(pending);
    accepting = false;
    report.cleanup = browser ? 'pending' : 'no-browser-returned';
    try { await save(); } // Preserve observations before cleanup, including if cleanup stalls.
    finally {
      if (browser) {
        try { await bounded(browser.close(), 2000); report.cleanup = 'closed'; }
        catch { report.cleanup = 'unconfirmed'; }
      }
    }
    await save();
  }
  return { directory, report };
}
