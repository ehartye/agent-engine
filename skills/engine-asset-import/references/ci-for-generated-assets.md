# CI for generated assets

A general pattern for any asset an agent tool generates (agent-beeps audio, agent-sprites atlases, agent-meshes
GLBs): **a committed lock, a content-addressed store, and a CI that fetches and verifies instead of regenerating.**
The audio mechanism is documented once, in agent-beeps (`docs/build-lock-and-store.md` and the `beeps-ship`
skill); this page is the engine-agnostic shape and the CI traps. A working workflow is
`examples/web/ci/pages-audio.yml`. Audio specifics are in [audio-integration](audio-integration.md).

## The pattern

1. **Input hash.** Hash everything that determines an asset: the source, anything it references, the tool and
   its version, and the delivery settings. Hash only audio-affecting versions, not the package version.
2. **Lock.** A committed file maps each asset to its input hash and the sha256 and size of every output. Sorted
   keys, no timestamps, so an unchanged rebuild writes identical bytes and a change is a small diff.
3. **Store.** Outputs live by input hash in an immutable store (release assets in one public repo, a mounted
   directory, or an OCI registry). First writer wins; nothing is ever replaced.
4. **CI fetches and verifies.** It reads the lock, downloads missing assets by hash, and checks every file against
   the **lock** (not against the store's own manifest), so a bad store entry cannot reach the site. It needs no
   generator tool, browser or encoder.
5. **The author builds and pushes.** Generation happens on the author's machine; a forgotten push makes CI fail
   naming the assets, which is the intended signal.

Keep generated outputs out of git for an active app (the store holds them). For a small app, committing outputs
works and the lock is then the stale test.

## Never regenerate unchanged outputs

Some generators are not bit-exact: rendering the same song four times from empty caches gave four WAVs that differ
in 33 to 50 of 786,516 samples. A re-render of an unchanged input therefore changes the shipped bytes for nothing,
and in CI it costs minutes to hours (a cold adaptive-song build was about 40 minutes). The rule: an input that
already has an output is never generated again. Encoding that follows the render can be deterministic (same WAV,
same ffmpeg build, same Opus bytes), which is why the lock can pin it. Test your tool for both facts before
choosing what to pin.

A toolchain bump (generator, browser, ffmpeg) changes every hash. Stop and list the drift; accept it once, on
purpose, on the author's machine, then push. Never let CI regenerate everything because a version moved.

## Actions cache: an accelerator, never the source

- GitHub evicts a cache entry **after 7 days without access**, and the repository total is capped at **10 GB**
  (oldest first). A project that is quiet for a week loses its cache, so a design that needs the cache to be fast
  is slow exactly when someone returns.
- **Key on the lock's hash** (`hashFiles('audio.lock.json')`), not on the source tree. An edit that changes no
  generated input then keeps the key, and a change that does changes it. Keying on the source folder invalidates on
  every comment edit.
- Use `actions/cache/restore` and `actions/cache/save` as separate steps, with `if: always()` on the save, so a
  failed later step does not lose finished work. Keys are immutable: make a per-run key (`${{ github.run_id }}`) for
  data that changes and let `restore-keys` pick the newest.
- With a store, a cold or evicted cache costs a fetch, not a regeneration. That is the point.

## Traps

- **YAML colon in a step name.** `- name: Audio: fetch` parses as a nested mapping and the entire workflow fails to
  load, often with an unhelpful error. Quote the name (`name: 'Audio: fetch'`) or drop the colon. Also quote any
  value that starts with `*`, `&`, `{` or contains `: ` or ` #`.
- **Git Bash and `MSYS_NO_PATHCONV`.** Under Git Bash on Windows, an argument that looks like a POSIX path
  (`/api/...`, `/c/...`, `owner/repo:/path`) is rewritten to a Windows path before the program sees it, which breaks
  `gh api`, `docker run -v`, and tool flags. Set `MSYS_NO_PATHCONV=1` for the command (and `MSYS2_ARG_CONV_EXCL='*'`
  where needed) when scripting those from Git Bash. CI on `ubuntu-latest` is unaffected, so the bug appears only
  locally.
- **Runner speed.** A GitHub-hosted runner is about 2x slower than a developer machine for CPU-bound work (browser
  renders, encodes, software WebGL). Set a generous `timeout-minutes`, and do not trust a dev-machine timing for a
  budget. Better, keep that work out of CI with the store.
- **Advisory browser jobs.** A cross-browser job (Chromium, Firefox, WebKit with software rendering) is flaky on a
  shared runner. Mark it `continue-on-error: true` until it has been green on GitHub for a while, and make the
  deploy job not `needs:` it, so a green deploy means the site deployed. Promote it to blocking later. Running
  the real GPU suite stays a local, pre-merge step.
- **Lock gate.** After any step that rewrites the lock, fail on `git diff --exit-code <lock>`: a developer forgot
  to commit it, and the cache key would not match what was built.
- **Check before build.** A `--check` that renders nothing and lists stale assets with reasons is the cheap CI
  test, and the pre-push test locally.

## When the generator is sprites or meshes

Use the same five steps: input hash of the project file and tool version, a lock, a store, CI fetch. Only the
tool differs. Until a tool has a `build` and `store`, a small committed output plus a checksum manifest gives the
same stale test. Say which you did.
