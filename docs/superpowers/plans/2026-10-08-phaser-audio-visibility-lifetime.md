# Phaser audio visibility lifetime implementation plan

> **For Claude/Codex:** REQUIRED SUB-SKILL: Use h-superpowers:subagent-driven-development. One fresh author implements this bounded task, followed by fresh SPEC then QUALITY review. The owner has authorized plugin repairs, PRs and squash merges; no execution-choice confirmation is needed. Port implementation remains paused until the released correction is installed and verified.

**Goal:** Prevent Phaser 4.2.1's delayed visibility callback from touching a destroyed manager, replaced context or closed AudioContext while preserving its live-context recovery behavior.

**Architecture:** Correct the pinned dependency at installation with one released agent-engine artifact. Retain the native 100ms callback and suspend/resume sequence; admit it only for a live manager and its current open context. No runtime audio adapter, second context, synthesis, player, global rejection handler or game workaround is introduced.

**Tech Stack:** Dependency-free Node ESM, exact npm Phaser 4.2.1 source/ESM/UMD fragments, Node tests and one sequential Chromium native probe.

---

## Context and scope

Worktree: `C:/Users/ehart/repos/agent-engine-audio-visible-lifecycle`, branch `fix/phaser-audio-visible-lifecycle`, baseline `d25c2000d821b85b3098df4f0844a7577ffa6623` (agent-engine 0.11.8). Preserve that release's audio-director changes. Main checkout has unrelated untracked `.claude/` and `.playwright-mcp/`; leave them alone.

The current native Space2grow ambient task is paused, not accepted. Its frozen `C:/Users/ehart/repos/space2grow-phaser/.local/native-ambient-task1-a/paused-receipt.json` and diagnostics n/o establish a real native lifetime defect. After genuine Settings Enter unlocked the context, native destruction closed it at 2286.20ms; the existing visibility timeout called suspend/resume on the closed context at 2391.70/2391.80ms. The actual trace records both uncaught InvalidStateErrors. Diagnostic n remains a separate failed expected-console assertion; o's earlier attachments preceded error delivery. Do not recast either run as green.

Pinned `WebAudioSoundManager.onGameVisible` captures a context and unconditionally uses it after 100ms. Its native destroy closes owned contexts; `BaseSoundManager.destroy` sets `game=null`. `setAudioContext` can replace the captured context. The existing source and wiki evidence establish this boundary. Native Phaser lifecycle belongs in agent-engine; beeps authoring, synthesis and processing do not change.

Baseline checks: audio-decode/framebuffer 46/46 pass; remaining current CI test command 41/42 passes with only the 0.11.8 README still naming 0.11.7. Updating all release fields to 0.11.9 is required for this release and resolves that metadata failure. Do not broaden into unrelated fixes.

## Task 1: Guard the native delayed callback and release its installer

**Files:**
- Create `skills/engine-phaser/scripts/assets/phaser-audio-visibility-patch.mjs` — one exact-version installer and importable `patchAudioVisibility(installedPhaserDirectory)` API.
- Create `tests/fixtures/phaser-audio-visible-4.2.1.txt` — exact pinned method with copyright/provenance and independently checked bytes.
- Create `tests/phaser-audio-visibility.test.mjs` — actual extracted native-method behavior and installer admission tests.
- Create `examples/web/phaser-probes/audio-visibility.mjs` — standalone sequential pristine/corrected native reproduction, without importing/running the game.
- Modify `skills/engine-phaser/references/native-audio.md` — scoped defect, released artifact usage, boundary, verification limits and removal condition.
- Modify `.github/workflows/lint-skills.yml` — add the new test to the existing Node gate.
- Modify `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `README.md` — consistent 0.11.9 release fields only.

- [ ] **Step 1: Meaningful RED from the actual pinned method.** Extract the native method into a VM with a controlled `window.setTimeout` queue. Its original callback must demonstrably call suspend/resume after the context closes, after manager destruction (`game=null`) with a borrowed still-open context, and after replacement. Write required corrected expectations and observe them fail before the installer exists. Preserve normal native live callback behavior at 100ms: no immediate context calls, then suspend/resume in the existing order. Exercise null/closed/current-running/current-suspended and repeated callbacks. Do not copy a replacement scheduler into tests.

- [ ] **Step 2: Implement the smallest pinned guard.** Use the existing installer structure and preserve all original bytes except the method fragment. Add a manager capture and guard inside its existing callback:

```js
var _this = this;
var context = this.context;
// Existing native timer and its 100ms delay remain.
if (_this.game && context && _this.context === context && context.state !== 'closed')
{
    context.suspend();
    context.resume();
}
```

Do not add rejection suppression, change native unlock, alter pauseOnBlur, cancel valid visible recovery, add manager state or implement a second audio owner. Guard both owned and borrowed manager destruction and replacement, rather than checking only context.closed. Keep actual native call failures observable for admitted live contexts.

The installer targets `src/sound/webaudio/WebAudioSoundManager.js`, `dist/phaser.esm.js`, `dist/phaser.js`. Require package name phaser and version exactly 4.2.1. Preflight a unique method marker and unique complete original/corrected fragment in all three files before writes. Reject unknown/ambiguous fragments, missing/invalid manifests/files, mixed correction states or inconsistent/mixed target newlines. Preserve LF/CRLF and every byte outside the fragment. Reinstallation is idempotent; importing has no side effect; CLI accepts exactly one installed-directory argument and reports changed files or a nonzero failure.

- [ ] **Step 3: GREEN and composition.** Run `node --test tests/phaser-audio-visibility.test.mjs`. Include original-vs-corrected function behavior, callback order/delay, all three target equality, LF/CRLF/outside bytes, idempotence, API/CLI invalid inputs with no partial writes, and composition in both orders with released audio-decode, gamepad-lifecycle, framebuffer-restore and held-input corrections on real pinned bundle copies. Do not weaken the existing patches' independent guards. The consuming game's whole-file identities are a separate integration step after publication.

- [ ] **Step 4: One bounded native reproduction.** Obtain an actual pristine npm phaser@4.2.1 package in external evidence and a separate corrected copy using this installer. Host their real ESM bundles and a tiny native game; use the host project's existing Playwright dependency read-only. Keep one verified browser/server/GPU owner and one actual consumed page at a time. Observe actual response bodies/hashes, real AudioContext state and method call timing, page errors/rejections/console warnings, and native game destruction. Cover live recovery and immediate destruction after native VISIBLE in both pristine and corrected packages, with an actual trusted gesture unlocking audio; include stale replacement and externally supplied still-open context destruction. Original callbacks must reproduce forbidden calls; corrected callbacks must make none, while the live control still uses native suspend/resume after the delay. Await asynchronous observation before taking final attachments. Preserve failed attempts separately. Do not invent warning events if Chromium surfaces page errors. Record actual renderer and cleanup; do not claim iPhone/audible/performance verification. Game source/dependencies and frozen ambient evidence remain unchanged during the standalone probe.

- [ ] **Step 5: Documentation and release fields.** Add a short section to native-audio.md with exact API/CLI/postinstall usage and the two pinned source links. Name this a temporary dependency band-aid, scoped to the native visibility callback; remove it only after a reviewed upstream pinned release preserves live recovery while refusing stale lifetimes, verified by these tests. Explain how it composes with existing installer artifacts and independent project integrity guards. Keep beeps responsibilities unchanged and do not expand SKILL.md or create a new skill. Set all three release fields to 0.11.9 and add the Node test to CI. Run the complete current workflow test command plus the new test and existing 3D lint once after final source changes; expected exit 0. Run `git diff --check`.

- [ ] **Step 6: Freeze and hand off.** Self-review scope, native behavior, retained actual-source evidence and cleanup. Stage only the nine task paths plus this already committed plan if needed; commit on the feature branch. Record exact base/head, changed paths, individually qualified commands/results, source/fixture/native response identities and owned-resource closure. Do not push/merge before ROOT admission and fresh SPEC then QUALITY. ROOT owns catalog publication, supported installation and game integration after reviews. The game ambient author resumes only after the released exact artifact and composed dependency identities are verified.

## Plan self-review

The guard covers destroyed, closed and replaced native lifetimes without changing native live recovery or introducing audio ownership. Tests use the actual pinned function and installed bundles, and the installer is compatible with existing explicit dependency corrections. Scope excludes beeps, game source and unrelated release work. Publication and consuming-project integration remain separate verified steps under standing authorization.
