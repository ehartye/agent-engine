# Retain WebGL startup evidence before a scene exists

## Capture first

- [tested] The opt-in [diagnostic helper](../../../examples/web/startup-diagnostics.mjs) creates a
  unique receipt directory before launching Chromium. The [Node fixtures](../../../tests/startup-diagnostics.test.mjs)
  exercise failed launch, readiness timeout, mismatched bytes, unsafe inputs, event caps and cleanup
  even when receipt writing fails. Existing scene verifiers are unchanged; this is a separate recipe.
- [general] Reduce to a trusted local fixture with no secrets and size-controlled responses. Pin the
  baseline and current source, run the same flags separately, and retain failures alongside successes.
  A successful support probe does not prove the engine can create its own context; available memory
  does not establish cause. Do not add a renderer fallback, restart services or change dependencies
  merely to hide a failed initialization.

## Run the recipe

- [documented] Use an existing Playwright 1.48+ installation and its Chromium, with Node 20.11+.
  [Browser contexts](https://playwright.dev/docs/api/class-browsercontext) isolate page state;
  [response bodies](https://playwright.dev/docs/api/class-response#response-body) are decoded buffers.
  This recipe launches its own browser, never connects to a user's browser.
- [general] Serve the reduced fixture on a dynamic loopback port. Expose a small explicit probe
  before constructing the renderer, then update it as loading and scene creation proceed:

```js
globalThis.__startupDiagnostics = {
  ready: false, sceneCreated: false, loaderPending: 0, phase: 'boot'
};
// Expose the actual application context as __gl when it exists. Do not create a replacement.
```

- [general] Import the helper from the installed plugin and supply public, nonsecret labels and
  URL paths for the exact files to compare. Include expected missing assets and favicon paths if
  their status matters. Source paths are read but never written into receipts.

```js
import { chromium } from 'playwright';
import { captureStartup } from '<plugin-root>/examples/web/startup-diagnostics.mjs';
const result = await captureStartup({
  chromium, url: 'http://127.0.0.1:PORT/', outParent: './retained-results',
  args: [], timeoutMs: 5000,
  assets: [{ label: 'app', pathname: '/app.js', source: './fixture/app.js' }]
});
console.log(result.directory, result.report.outcome);
```

## Interpret the receipt

- [tested] Browser version is null if launch never returns a browser. Requested allowlisted flags,
  platform and Node version are retained; default browser switches are not captured. Launch,
  navigation, support probe, application readiness/context and cleanup have separate outcomes.
  The support probe is a fresh canvas before navigation in the same page/browser context.
- [tested] Selected source and observed decoded response bytes carry SHA-256 hashes and a match
  result. Unknown or query-bearing URLs are labelled `unmapped-url`; declared public pathnames
  retain HTTP status, distinguishing missing game files from other failures. Unavailable hashes
  are explicit. Raw console/error messages, stacks, headers, URL credentials/query strings and
  arbitrary game state are not saved; error categories deliberately sacrifice detail for privacy.
- [general] A captured hash binds that response only, not every dependency or all future responses.
  Review fixture labels, paths and renderer text before sharing. The renderer is observed browser
  output, not an attestation. A ready flag is not proof of artwork, routes, audio or rendering quality.

## Bounds and deliberate limits

- [tested] At most eight declared source files, each at most 1 MiB, eight response-body captures and
  256 retained response/error events are supported. Each browser phase has a 100..30000 ms timeout;
  snapshot/close have a 2-second ceiling. Unknown cleanup is reported, never treated as terminated.
  This is not a hard total-process deadline: filesystem I/O and a wedged host require an outer owner
  timeout. Abrupt termination can retain an incomplete receipt; no broad process-name cleanup is used.
- [general] Response sizes must be controlled by the fixture. Content-Length and a post-read size
  check limit retained evidence, not decoded-body allocation; Playwright buffers responses. Do not
  run this against untrusted or unbounded servers. Browser background traffic is outside this recipe.
- [documented] [Playwright routing](https://playwright.dev/docs/api/class-browsercontext#browser-context-route)
  intercepts only the first URL of a redirect chain. The helper therefore fetches with
  [maxRedirects: 0](https://playwright.dev/docs/api/class-route#route-fetch), rejects all redirects,
  and fulfills local responses. Cross-origin requests and WebSockets are blocked; service workers
  are disabled. This intentionally changes network behavior, so use a reduced fixture, not an
  untouched production comparison or an application requiring redirects, streaming or sockets.
- [general] Successful supported-local capture does not reproduce an intermittent driver failure
  or establish a universal platform fix. Preserve exact baseline/current hashes and report missing
  evidence instead of inferring an engine defect.

## Separate browser acceptance

- [tested] `node examples/web/startup-diagnostics.browser.mjs` is an opt-in real Chromium fixture
  run. Set `PLAYWRIGHT_DIR` to an existing installation if needed. It retains its temporary receipts,
  covers pre-scene failure, ready observation, invalid-executable launch, request/HTTP failures,
  secret omission, redirect blocking and an unrelated sentinel server surviving cleanup. It is
  separate from the dependency-free merge lane; browser/GPU availability is not skipped into a pass.
