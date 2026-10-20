# Genre and effect craft

This is a compact design vocabulary, not an asset catalog or a measured quality pass.

## Read the whole image

- [general] Compare foreground framing, middle action, far depth, supporting forms and player/ground/threat separation. Particles cannot repair an empty stage or merged planes. Inspect thumbnail masses before scratches and grain.
- [documented] Riot's production education emphasizes restraint, gameplay information and a coherent effect language. Apply those principles to the project's own references rather than copying a stock effect's style. [Riot Art Education: Visual Effects](https://www.riotgames.com/en/artedu/visual-effects)
- [general] When values collapse, inspect texture/vertex input, lighting/emissive transform, exposure, tone map and palette/post together. Restore selected planes/contact before noise. Test effects on light and dark real backgrounds.

## Give a genre distinct effect sentences

- [general] Adapt these hypotheses to actual signals, camera and approved art; they are not required features or fixed timing standards.

| Genre | Information and authored shape | Evidence in play |
| --- | --- | --- |
| Racer | Low directional tire spray, sparse ballistic chips and settling tail follow contact/slip/load/surface. Angular contact burst and tangential fragments convey impact. Outlet/trail flow conveys speed/boost, distinct from damage smoke. | Spray stops in air; landing/graze convey weight; world trails do not drag with the car; rear contour and route remain visible. Compare a turn, jump and crowded pass. |
| Shooter | Separate emission, travel, surface response and confirmed damage. Give weapon families distinct silhouette/rhythm. Orient impacts to hit normal/material and event strength; distinguish sustained hazards. | Flash belongs to accepted barrel emission; traces/impacts agree with authoritative hits; overlapping fire preserves targets, telegraphs and hit confirmation. Compare miss, hit and crowded exchange. |
| Platformer | Distinguish takeoff, landing and attack. Grounded compression/burst and settling tail reinforce weight; airborne trails follow movement. Align anticipation/recovery with existing action windows. | Landing follows real contact; cosmetic arcs imply no false hitbox or safe edge; player and next landing surface remain readable. |

## Shape and time before quantity

- [general] Author primary silhouette, supporting breakup and sparse detail. Separate onset, peak, expansion, erosion and tail; smoke need not inherit a hit envelope from a shared pool. Try asymmetrical shapes and controlled variation before more instances.
- [general] Bind position/normal/velocity, surface and strength. Use local space for attached cores, world space for deposited/ballistic tails. Distance-space ground marks where useful; verify frame rate does not change density/contact.
- [general] Review normal speed at target frame rates before slow motion. Inspect event-close frames, small-scale silhouette and full-size contact. Measure proposed timing from event timestamps to presented frames; counters cannot establish visible emphasis.

## Tested native iteration: passing geometry can still look wrong

- [general] In one Unreal project, an effect passed 54 geometry and lifecycle checks and accepted-contact capture checks, yet isolated review of the native images rejected long flat tire blades and an unreadable contact seam. The directional geometry test had rewarded excessive anisotropy. Tests established valid geometry and execution, not the intended dust silhouette; reported from one project and not reproduced here.
- [tested] In the same project/version, the contact core had two separate visibility problems: its normal-directed fan began inside the visible fender, and shortest-lifetime replacement let ordinary grit evict a fresh short accent before presentation. Source `d060b57` used compact ragged low puffs, a small world-space release at the actual seam's upper lip, and contact replacement preference inside the unchanged pool. Native sampled images then exposed a small angular cue and clearer wheels. A fresh isolated critic rated the local direction PARTIAL and suitable for a work-in-progress study; the dust wreath and impact emphasis still needed work.
- [general] Use that failure pattern, not its numeric settings, elsewhere: inspect actual depth/occlusion and replacement order when an emitted effect is absent. Design host constraints around valid geometry and lifecycle, then let native pixels judge the shape. Retain failed images and matched state/camera. This case does not establish normal-speed motion quality, frame-time gains, automatic skill triggering or general effectiveness across genres.
