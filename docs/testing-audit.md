# Development CI and test audit

Reviewed 2026-10-20 with agent-tests 0.4.1. The owner confirmed **dev** mode and authorized local verification and shipping a faster CI setup.

## Evidence

- The advisor found 13 test files and flagged the duplicate post-merge `push` trigger. It does not measure runtime; timings below come from actual commands and GitHub jobs.
- Baseline local CI selection: 222 passing tests, no failures/skips, 6.1 seconds reported by Node on Windows (Node 24.18.0).
- New complete local command, `node scripts/check.mjs`: 234 passing tests, no failures/skips, four strict skill lints, 6.6 seconds wall time. It adds the existing 12 web verification tests omitted from CI.
- GitHub run 39282693635: workflow created 2026-10-19 16:05:11 UTC and updated 16:27:33, but its only job ran 16:05:13–16:05:27 (14 seconds). Run 39279413675 similarly has a 13-second job despite roughly 28 minutes between workflow creation and update. These observations do not establish why workflow status updates lagged; removing tests would not explain or repair that gap.
- The repository has no `.testing/risk.yml`. Risk tiers and consumer obligations have not been confirmed, so no per-file deletion, demotion, merge or quarantine verdict is assigned. Existing coverage is retained.

## Findings and implemented policy

CI now runs one Linux observer on relevant ready pull requests, cancels superseded runs, skips drafts, and limits job execution to five minutes. It also runs manually, weekly and on `v*` tags. A normal merge no longer starts a duplicate `main` run. The timeout does not bound GitHub queue or workflow-status processing time.

Local checks own merge verification. `scripts/check.mjs` discovers all `.test.mjs` files directly in `scripts/` and `tests/`, adds the two dependency-free example test files, and runs the same strict skill lint scope as before. It exits on test or lint failure. It installs no npm packages. Browser/GPU specs and native-engine sample acceptance remain separate, requiring their documented setup.

The missing risk map affects all 13 inventoried files: `scripts/{lint-skills,release-consistency}.test.mjs`, `tests/{phaser-audio-decode,phaser-audio-visibility,phaser-dynamic-texture,phaser-framebuffer-restore,phaser-gamepad-lifecycle,phaser-texture-units,unreal-import-policy,unreal-import-reuse}.test.mjs`, `examples/web/verify-checks.test.mjs`, and `examples/web/harness/tests/{no-sleeps.test,smoke.spec}.mjs`.

The flagged `C:/x` in `unreal-import-policy.test.mjs` is rejected-input test data, not access to a fixed checkout. The web verifier's software-renderer fallback classification is current behavior. Shared Phaser patch imports appear in composition checks and are not by themselves redundant assertions. No pruning is justified by those pattern matches. Callback-only audio support remains untouched pending an explicit consumer decision.

No tests were deleted or merged (estimated tokens removed: 0), and no edit-lane tests were demoted. No files received an unopened tier-based keep verdict because no risk map exists.

## Architecture advisory

The measured cost is workflow frequency and status reporting, not an expensive build or browser setup in this merge lane. There is no npm install, browser launch or native editor launch in the current CI command. Unit fixtures and isolated subprocess boundaries already avoid those costs. Do not introduce a cache, affected-only graph, worker pool, or product architecture rewrite to optimize a six-second command.

Chosen approach: share the local command and reduce automatic CI frequency while retaining coverage.

- **Time:** small configuration change now; measured local feedback is 6.6 seconds. One automatic post-merge run is removed per merge; platform queue/status lag remains outside the job timeout.
- **Risk:** draft changes get no CI job until ready; local checks remain the merge gate. Filters cover workflows, skills, examples, scripts, tests, release metadata and docs. Tests and lint keep reporting failures.
- **Complexity:** one short Node runner replaces a growing YAML test-file list; no package install, cache or matrix is added.
- **Best practice:** one owner for merge verification and explicit dev-phase frequency; the non-required observer is a project policy, not a promise of runtime or GPU acceptance.
- **Maintainability:** add root test files in their existing directories and discovery includes them automatically. Add nested test locations explicitly; reassess required checks and platform coverage when the owner changes phase.

Alternative considered: leave both PR and post-merge runs unchanged.

- **Time:** no implementation work, but duplicated runs and ambiguous workflow-level duration persist.
- **Risk:** preserves current coverage but does not cancel stale work or bound job execution.
- **Complexity:** keeps the manually maintained YAML test list and separate local commands.
- **Best practice:** the extra observer offers little dev-phase value after local and PR checks of the same change.
- **Maintainability:** every new test file needs another CI-list edit, which already missed the web verifier.

Confidence is high for local command behavior and trigger changes; no claim is made about statistical flakiness, historical billing, future queue time, real installed Phaser-bundle opt-in checks, or native/GPU sample acceptance. Revisit if measured job execution approaches five minutes, platform failures appear, or the project moves out of dev mode.
