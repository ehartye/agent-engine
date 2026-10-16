# Native procedural road contact

Scope: DEAD REDLINE, Unreal5.8.2 CL56702186 on Windows,2026-10-16. This is an executed consuming-project case study, not a universal collision prescription. Source, actual physics trajectories and rendered bodywork answer different questions.

## Reproduce and separate the mechanisms

- [tested] A closed80cm ProceduralMesh triangle road shell, with CCD on the simulated chassis, admitted a head-on wall impact. Chassis center reached40.94cm below the top; a vertical drop settled near the underside80cm lower. Suspension still reported contacts. Above-road traces found the correct top, so missing rendered road was not the failure.
- [documented] Installed ProceduralMeshComponent source already sets `bDoubleSidedGeometry=true` before collision cooking. Reassigning it after CreateMeshSection was redundant in this version and did not explain the observed failure. Inspect installed implementation before treating a suspicious local assignment as the root cause.
- [tested] The probe separated chassis center/oriented box corners, actual transformed imported body/wheel vertices, camera height, road support trace, contacts, velocity and reset serial. An overhanging corner outside a deck footprint is not proof of tunneling. Severe impacts can briefly compress visual wheels below the local plane while the chassis remains supported.

## A fix can pass the original gate and create another regression

- [tested] Replacing the surface with643 road and67 spur convex prisms sharing the same tile corners/depths prevented below-deck loss in all eight fixtures. However a259km/h closed-loop run encountered a steep internal convex-cap contact, became airborne and departed the track. Its floor-only assertion ignored outside-deck positions correctly, but therefore could not establish track retention.
- [tested] Two explicit retained-track checks and independent CSV corridor checks made that intermediate receipt RED. The final experiment restored the original continuous triangle contact surface and added hidden collision-only convex support tops4cm beneath it, retaining80/95cm bottoms and the intentional jump gap. Native `floor-backing-20261016T1937` passed18 checks with no recovery or track departures; the closed-loop sample stayed grounded145/145frames.
- [tested] The final wall/ram/drop and two high-speed seam cases cover bounded initial fixtures. The vertical drop observes4s to include a real rebound and settling, keeping its original minimum-contact-frame requirement. Other cases retain2.4s. A longer legitimate observation is different from lowering a failed threshold or relocating the car during measurement.

## Preserve the evidence contract

- [general] Record fixture-only initial pose/velocity assignments, then observe ordinary production physics without per-frame corrections or rescue resets. Require actual contact/air/ground exposure as well as no-loss outcomes; a fixture that never reaches its hazard proves little. Preserve old failures, intermediate regressions and successful native reports independently.
- [general] Keep visual construction separate from contact ownership. Assert the actual cooked/runtime hull count and intentional openings. Check gameplay and real screenshots after a collision representation change; pure geometry calculations cannot establish solver behavior, visual overlap, human handling or sustained performance.

See [the native game loop](unreal-native-game.md) for capture provenance and simulation-time limits.
