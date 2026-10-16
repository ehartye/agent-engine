# Native Unreal input replay

Scope: DEAD REDLINE, Windows Unreal 5.8.2 CL56702186, 2026-10-16. Engine source inspection and executed behavior are labeled separately. Simulated mapped events do not establish human controller acceptance.

- [documented] Installed-source inspection: `UPlayerInput` adds analog samples within one processing frame (`PlayerInput.cpp:331–332`) and retains trigger state without a new sample (`1345–1395`). A press sample of1 followed by0 in the same frame sums to1. Replay one complete trigger state per frame, including zero values after release; avoid transition-frame duplicates.
- [tested] DEAD REDLINE's first release-controller retry retained RT=1 during LT braking and failed reverse. `-NoGamepad` alone did not fix it. After correcting the sample schedule, native `controller-release-20261016T1856` passed all11 checks, including brake→reverse and fixed-barrel firing. The suite drove simulated events through production mappings.
- [documented] Installed-source inspection: Windows `-NoGamepad` sets `bForceNoGamepads` and returns before `PollGameDeviceState` external-device polling (`WindowsApplication.cpp:1302–1305,4247–4252`). It is process-local. A capture-only controller guard can additionally reject `!Params.IsSimulatedInput()` and flush initial cached keys once, while ordinary play keeps hardware input. Preserve native failure/proof receipts rather than assuming a launch flag establishes isolation.

See the [native game loop](unreal-native-game.md) for fresh artifact validation, process ownership and fixed simulation step limits.
