# UEFN fitted moving exhibit cover

Read this when fitted cover must follow skeletal animation or switch with an
exhibit's visible study. First-hand observations: UEFN 42.30, checked 2026-10-03.
This is a measured project recipe, not a collision service supplied by this plugin.
Inspect the installed APIs and actual source geometry in each new project.

**Do not accept self-consistent collider traces alone.** Compare world corners
with independent original model geometry, measure movement and exact return,
and query the active/inactive study. A misplaced collider can pass all six face
tests against its own wrong transform. Cooking, player/weapon interaction,
saved reload, multiplayer and performance are separate acceptance gates.

## Select a bounded pilot

| Route | Time | Risk | Complexity | Architectural fit | Maintenance |
|---|---|---|---|---|---|
| Source-named simple boxes attached to actual bones | Proven editor pilot; fit each solid part | Wrong transforms, stale attachments, extra actors | One actor per fitted box in this recipe | Cover follows visible source parts and study state | Source geometry, exact actor IDs and receipts |
| PhysicsAsset convex shapes per module | More experimentation | Shapes existed but did not answer the tested queries | Native subsystem and body fitting | Potentially fewer actors; not demonstrated here | Preserve failed evidence; require an independent successful proof |
| Broad fixed box around a moving exhibit | Quick to author | Invisible barriers and blocked source openings | Low implementation complexity | Poor fit for open or changing geometry | Ongoing manual reconciliation; do not use as an untested shortcut |

The museum pilot covers two Rietveld studies only: seventeen timbers each,
nine animated module bones, actual world scale 4.5,-4.5,4.5 and yaw -90.
The small source bevels are approximated by the fitted boxes. Do not copy those
dimensions or transforms into another artwork. Scope the next exhibit separately;
passing this editor pilot does not justify claiming all exhibits have cover.

## Author from original geometry and exact native identity

1. Verify the exact loaded island, both parent/component identities, source
   geometry hashes, original visibility keys, idle Sequencer and absence of an
   unresolved installation/save receipt. Enumerate expected fresh destinations.
2. Import a fresh project-owned primitive with an owned material. Read bounds,
   LOD0 vertices and actual BodySetup primitive arrays. The tested unit FBX is
   one metre across, bounds +/-50cm, 24 LOD0 vertices and one 100cm simple box.
   It is not enough for an importer to report success or auto-collision enabled.
3. Set any intended parent animation/bone-refresh policy **before** fitting
   children. In this pilot, ALWAYS_TICK_POSE_AND_REFRESH_BONES replaced
   ONLY_TICK_POSE_WHEN_RENDERED. Changing it after fitting reset all seventeen
   classic child transforms to their bone roots. The internal cause is uninspected;
   this is not a universal property-edit or UEFN-bug claim. Its server/client
   behavior and continuous-refresh cost remain unmeasured.
4. Reconstruct each solid part's corners from unchanged original source data.
   Include source coordinate conversion, FBX/root scale, negative scale and
   parent world transform. Read actual bone names/transforms; reject missing
   bones. Do not infer placement from rendered screenshots or assume unit scale.
5. Attach invisible, movable proxy actors to the intended component and bone
   with KEEP_WORLD and welding disabled; fit them to those original corners.
   Static studies attach to their static component without a bone. Record exact
   actor/component paths, parent/socket, mesh and fitted transforms. Visibility,
   hidden-in-game and disabled shadows do not by themselves disable collision.
6. Preserve original controller references, visibility tracks and comparison
   timing. Add collision ownership for **every** proxy plus affected parents.
   Hidden studies must not leave active query geometry behind. Save only owned
   native packages with explicit receipts and read back clean package state.

Duplicating /Engine/BasicShapes/Cube was rejected before any destination asset
or actor was created. The rejected request's pending receipt was reconciled
against native destination absence and unchanged original actors/sequence before
the separate owned-FBX route. Do not replay a pending mutation or force-copy an
Engine asset because the client received an error. Resolve partial outcomes first.

## Check semantic collision and study state

**Tested:** requesting BlockAll read back as Custom on these Fortnite proxy
components. A disabled actor returned effective NO_COLLISION through
`get_collision_enabled()` while its BodyInstance retained configured
QUERY_AND_PHYSICS. Read configured BodyInstance state, intended Pawn/Visibility
responses and actual query results. Neither the profile name alone nor an
effective disabled value proves that a correctly inactive study is misconfigured.
The installed response enum is `unreal.CollisionResponseType.ECR_BLOCK`.

The five-case preliminary experiment showed that merely hiding an actor still
blocked queries. `MovieSceneBoolTrack` keys on `bActorEnableCollision` switched
queries off and back on. The installed comparison adds 36 collision tracks:
two original parents and 34 proxies. Frames0/30 select classic/wood; verification
uses 0/30/0. Changing the visible parent's collision alone was not demonstrated
to disable attached children.

Keep the selected comparison sequence actively evaluated while querying that
study. Closing editor Sequencer restored the pre-evaluation state in this recipe,
despite KEEP_STATE sections; wood queries then encountered classic state instead.
Runtime device ForceKeepState behavior is unverified. Restore documented default
visibility/collision, selection and idle Sequencer in a finally block; retain
pending state if cleanup cannot be verified.

## Verify independent geometry, movement and query identity

In the tested native API, `HitResult.to_dict()` supplied `hit_actor`,
`hit_component`, `impact_point` and `initial_overlap`. Verify actual actor and
component identity, no initial overlap and fitted intersection location. The
generic `SystemLibrary.break_hit_result` helper was absent in this installation;
inspect available methods rather than inventing a helper.

Use isolated six-face surface rays for every fitted part, **plus independent
source-corner comparisons** at multiple actual animation poses. Measure that
each intended moving part changes position and returns within a stated tolerance;
passing at several frame numbers does not prove that animation moved. The chair
uses frames0,60,120,180,240, movement >1cm at frame120 and return <0.01cm at240.
That threshold and schedule describe this pilot, not all possible animations.

An initially assumed backrest gap actually crossed solid source geometry. Replace
an incorrect gap expectation with a genuine source-open cavity; do not weaken
fitted cover merely to satisfy the test. The installed proof has six rest-pose
gap rays, three per study. Those rays do not establish capsule clearance or gaps
throughout the moving cycle. Exclude unrelated/editor-only device meshes when
testing proxy identity; a CreativeEditOnlyMesh hit is not proof of a runtime wall.

After the post-fit bone-policy change, independent corners exposed the wrong
child positions even though self-derived face checks passed. The bounded repair
kept actor/bone identities, refitted only seventeen owned classic proxies and
saved their exact packages. All checks and motion/return then passed in fresh
native calls. Before another mutation, inspect and reconcile the failed attempt;
do not repeat full installation or replace original geometry/controller assets.

## Evidence and limits

Museum [PR #15](https://github.com/ehartye/art_explorers_fn/pull/15) contains the
disposable preliminary experiments, including seventeen convex PhysicsAsset
shapes on nine bodies yielding zero of255 queries. Deferred calls, saved proof
packages and positive-scale tests also failed. The cause remains unresolved;
this is not evidence that all UEFN PhysicsAssets or gameplay physics are unsupported.

[PR #16](https://github.com/ehartye/art_explorers_fn/pull/16) contains the fitted
installation and negative receipts. `museum/collision/chair-cover.json` stores
the recipe; `chair-verification.json` includes 612 identity/face checks,
816 source-corner comparisons, 102 study selection queries, six rest-gap checks and
17 measurably moving/returning timbers. The 38 saved packages were clean; all 25 white
architecture package hashes and approved music remained unchanged. Source hash
inputs survive a fresh Windows autocrlf checkout. These are saved/editor facts.

No Fortnite validation/cook or real player/weapon, saved-reload, moving-gap,
multiplayer or cost result is claimed for this pilot. The observed client was in
Sleep Mode with Disconnected/Unconnected session status. Reconcile the prior
pending launch before starting another; a server cook with no connected client
does not establish gameplay readiness. Do not add general simulation/ragdolls
merely to create cover or infer a performance improvement from fewer actors.

The owner's canonical wiki records the living installation and open acceptance
at `wiki/authored/art-explorers-fn/notes/chair-fitted-cover-installation.md` and
`wiki/authored/art-explorers-fn/backlog/exhibit-cover-collision.md`. Ordinary
native save/capture guidance remains in the existing operations reference;
disposable asset-lifetime cleanup is a separate follow-up.
