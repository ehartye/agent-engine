---
name: engine-visual-polish
description: Improve genre-specific game visuals and VFX when a game "looks like a demo", needs "AAA visual quality", a VFX polish pass, or closer fidelity to a visual reference. Use for art direction, effect craft and runtime comparison in an existing game. Not for choosing an engine, routine asset import or an isolated rendering bug.
---

# Genre visual polish

Turn a visual ambition into one convincing piece of actual play. Preserve the
project's chosen engine, art direction and gameplay contract. More particles or
a renderer quality preset cannot specify the missing visual language.

`[documented]` means supported by linked primary documentation; `[general]` means
craft guidance or a proposed experiment. No runtime integration or visual-quality
improvement is established by this skill's structural validation.

Read the relevant reference before choosing the effect implementation.

| You are about to | Read |
| --- | --- |
| Diagnose a demo-like image, match genre references or design effect families | [Genre and effect craft](references/genre-effect-craft.md) |
| Choose Unreal materials, Niagara, lighting, AA or production profiling | [Unreal production stack](references/unreal-production-stack.md) |
| Compare Unreal effect or prop implementations side by side, in one filmed and timed run | [Comparison scene](../engine-asset-import/references/unreal-native-compare-scene.md) |

## Establish the target and current evidence

- [general] Read the current art direction, architecture and known gaps first;
  use the owner's canonical wiki when available. Inspect fresh runtime images
  alongside the actual references, with source/build identity. Separate historical
  defects from the current image and still-image findings from motion hypotheses.
- [general] Preserve the approved quality bar while improving a bounded slice.
  Identify the largest perceptual gap: composition/depth, material/value transfer,
  contact/weight, effect shape/timing or temporal stability. A smaller local success
  does not lower a whole-game reference target or establish "AAA" parity.
- [general] Inspect the rendering contract and existing gameplay signals before
  proposing systems: material models, exposure/tone map, pass order, camera,
  contact/weapon state, pools and actual platform/version. Distinguish missing
  content from a broken integration; route an isolated bug to the native engine
  guidance instead of expanding it into a visual overhaul.

## Author one useful slice

- [general] Choose a short repeatable play sequence containing the relevant
  transitions and a representative background. Fix large readable masses before
  secondary texture and particles. Describe each effect's information, origin,
  silhouette, motion and onset/peak/tail; vary those deliberately across families.
- [general] Reuse real contact, hit, movement and sustained-state data. Let VFX
  observe gameplay; visual particle collisions must not become damage authority.
  Keep world trails in the intended space and verify emitter/socket transforms.
- [general] Build the smallest authored kit that can survive that sequence:
  shapes, material masks/erosion and curves before multiplying variants. Use the
  existing renderer when suitable; migrate one family only when the new capability
  solves a demonstrated authoring, visual or performance limit.
- [general] Keep accessibility and route/target/HUD readability in the design.
  Intentional hazard interference remains a gameplay feature to evaluate, not a
  reason to silently remove the hazard. When comparing implementation choices,
  state time now/later, risk, complexity, best practice and maintainability.

## Judge actual play

- [general] Retain baseline and candidate runtime artifacts from matched input,
  state, camera and settings: paired native-size stills plus a continuous real-time
  sequence around events. Bind them to source/content/build identity and recorded
  event times. Check target frame rates; a one-frame cue can disappear in play.
- [general] Treat onset/peak/tail durations and screen coverage as proposed art
  targets until measured. Choose them for the genre and gameplay; no universal
  impact lifetime or per-effect millisecond budget applies. Pool capacity bounds
  ownership, not GPU cost; compute its scope across all active owners.
- [general] Obtain independent judgment against the unchanged references and
  slice criteria. Review normal-speed motion, contact causality, silhouette and
  target readability, then inspect close frames for breakup and temporal artifacts.
  Effect age/TTL logs establish lifecycle state, not visible shape or quality.
- [general] Profile first use and representative worst overlap on target hardware
  at the intended resolution. Compare complete frames and available CPU/GPU
  stages, active instances and memory. Scaled cosmetic detail must preserve cues.

## Report the useful result

- [general] Return the observed gaps, implemented slice, paired artifact paths,
  independent findings, measured costs and remaining work. If captures or an
  independent review are unavailable, state what remains unverified; do not invent
  acceptance from source inspection, successful imports or a static beauty shot.
- [general] Record project-specific design, measured evidence and roadmap in its
  canonical documentation. Keep reusable engine guidance separate from that
  project's palette, art targets, budgets and private capture paths.
