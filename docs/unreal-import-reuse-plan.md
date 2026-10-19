# Guarded Unreal GLB import reuse

Approved scope: one self-contained delivered GLB into one exclusively generated `/Game/Generated/<asset>` directory, through Unreal's existing Interchange importer. Preserve `agent-meshes verify-unreal` as scratch verification; no cook cache or other engine parity.

1. Write failing host tests using actual fixture files and a separate importer process: cold/reused/changed/forced, missing outputs, edited/unknown outputs, identities and pending-operation refusal.
2. Implement a dependency-free Node client with explicit config, closed options, input identity, exclusive lock, pending journal, exact output inventory, safe archive-before-replace and atomic receipts. `inspect` performs no mutation or Editor launch.
3. Add the small native Python Interchange script: empty destination check, fixed saved pipeline, synchronous import, explicit saves, registry inventory and native result report.
4. Prove the native route in a newly created disposable project on installed UE 5.8.2. Keep logs and failure evidence; never touch a live project.
5. Document invocation, ownership/recovery and exact verified limits in the asset-import reference, link it from the existing skill, run focused contracts/lint and commit the candidate for independent review.

The receipt inventories all bytes under the exclusive destination, including material, skeleton, texture and package sidecars. It is not inferred dependency closure. Unknown custom import scripts/plugins/config must be declared; external-reference GLBs and custom pipeline overrides are outside the initial capability.
