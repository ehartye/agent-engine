# Choosing a Niagara template: the shipped catalog

Evidence: Unreal 5.8.2 on Windows. `[tested]` is reproduced by a script in [`examples/unreal`](../../../examples/unreal/README.md), `[documented]` was read in Epic documentation, `[general]` is an observation that no script asserts. Authoring and driving a system is in [Niagara in Unreal](unreal-niagara.md).

## Read the catalog before choosing by name

- [tested] Every template system carries a one-line `template_asset_description`, the text the editor shows in its New System picker. [`niagara_templates.py`](../../../examples/unreal/niagara_templates.py) lists them for the fluid, sand and core templates. Epic's web documentation has no per-template descriptions: its [Niagara Fluids reference](https://dev.epicgames.com/documentation/unreal-engine/niagara-fluids-reference-in-unreal-engine) covers the plugin's design, using the 3D gas fire as its worked example.
- [tested] The descriptions are terse and sometimes copied or empty: `Grid3D_Gas_ColoredFire` repeats the 3D fire's sentence, and `Grid3D_FLIP_Coupled`, `SandSystem`, `AttributeReaderTrails`, `FountainLightweight` and the other lightweight systems have none. Read them as a hint about what the system is for, not a quality or cost ranking.
- [general] The trap: a template picked by its name. "3D gas fire" sounds like the headline fire, yet its description says it is fire from a static mesh without smoke, an example of the 3D solver. The 2D fire that is meant to be placed in a map is a different system.

## Gas (Niagara Fluids)

| Template | Shipped description |
|---|---|
| `Grid2D_Gas_MovingFire` | 2D fire simulation that can be parented in a map |
| `Grid2D_Gas_SmokeFire` | Standing fire with smoke |
| `Grid2D_Gas_Smoke` | 2D smoke plume |
| `Grid2D_Gas_Explosion` | 2D gas explosion system |
| `Grid2D_Gas_Color` | Colored smoke |
| `Grid3D_Gas_Fire`, `Grid3D_Gas_ColoredFire` | Fire from a static mesh without smoke |
| `Grid3D_MovingGridFire` | A gas simulation which can be attached to an animating actor and behaves as though simulating in world space; for torches |
| `Grid3D_Gas_Smoke` | Smoke plume from a procedural source |
| `Grid3D_Gas_Explosion` | Gas explosion; particle sourcing is not deterministic (but faster) |
| `Grid3D_Gas_DivergenceExplosion` | Gas expansion explosion; uses divergence to expand the initial blast |
| `Grid3D_Gas_DustExplosion` | Dust explosion from a particle source |
| `Grid3D_Gas_SimpleParticleSource` | A 3D gas simulation sourced from a simple particle emitter; a good starting point for most effects |
| `Grid3D_Gas_ParticleAdvection` | Particle advection through a gas simulation |
| `Grid3D_Gas_ColoredSmoke` | Colored smoke advection; colour comes from particles |

## Liquid, sand and the core templates

- `Grid3D_Flip_Hose`: a static pool plus constant emission. `Grid3D_Flip_Pool`: a static pool; moving static meshes act as collisions and cause splashes. `Grid3D_Flip_Splash`: one splash burst. `Grid3D_FLIP_Coupled` and `SandSystem`: no description.
- Core (`/Niagara/DefaultAssets/Templates/Systems`): `DirectionalBurst` (a burst of sprites in a direction), `RadialBurst` (omnidirectional burst with ribbon trails), `SimpleExplosion` (sprite core, velocity-aligned sparks, oriented meshes). `AttributeReaderTrails` and the three lightweight systems have no description.

## Choosing

- [documented] Epic positions the 2D gas templates for games and real-time use and the 3D ones for hero effects and cinematics, at higher memory and GPU cost.
- [general] Side by side at their default settings in [`night_build.py`](../../../examples/unreal/niagara-showcase/night_build.py), the 2D `Grid2D_Gas_MovingFire` read as a tall, full, well-defined flame and the 3D `Grid3D_Gas_Fire` as thin wisps. This is a look at defaults, by eye, not a measurement; the 3D fire's look is tuned through its Controls emitter (render temperature, density, step size).
- [general] For a fire that must follow something, use the moving variants (`Grid2D_Gas_MovingFire`, `Grid3D_MovingGridFire`). For one that stands in place with smoke, `Grid2D_Gas_SmokeFire`.
- [tested] The 3D fluids need `r.GenerateMeshDistanceFields=True` or they never activate (see the [showcase README](../../../examples/unreal/niagara-showcase/README.md)).
- [general] A scene that only needs the look of a fluid fire can bake it to a flipbook; Epic's reference describes that route for real-time use.
