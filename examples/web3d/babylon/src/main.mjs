import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';
import { createProbe } from '../../core/probe.mjs';
import { createGame } from '../../core/game.mjs';
import { orientation, chaseCamera, smoothDamp } from '../../core/flight.mjs';
import { setupLab } from './labs.mjs';

const params = new URLSearchParams(location.search);
const sceneName = params.get('scene') ?? 'flight';
const canvas = document.getElementById('canvas');

// timeStep is in SECONDS. `?timestep=ms` passes 1000 / 60 on purpose, to show the simulation freeze.
const timeStep = params.get('timestep') === 'ms' ? 1000 / 60 : 1 / 60;
const engine = new Engine(canvas, true, { deterministicLockstep: true, lockstepMaxSteps: 4, timeStep });
const scene = new Scene(engine);
scene.useRightHandedSystem = true; // before loading anything: the core, glTF parts and cameras then need no flip
scene.clearColor = new Color4(0.04, 0.055, 0.1, 1);

const game = createGame(sceneName === 'fire' ? { targets: [{ c: [0, 0, 60], r: 3 }] } : {});
const holder = { assembled: false, backend: undefined, renderer: '', nose: [0, 0, 1] };
const isLab = ['outline', 'thin', 'draws'].includes(sceneName);

const instr = new SceneInstrumentation(scene); // its draw-call counter is reset at the start of every render
const gl = engine._gl;
const dbg = gl.getExtension('WEBGL_debug_renderer_info');
holder.backend = engine.webGLVersion >= 2 ? 'webgl2' : 'webgl1';
holder.renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';

const camera = new FreeCamera('camera', new Vector3(0, 3, -12), scene);
camera.fov = 1.0; camera.minZ = 0.1; camera.maxZ = 3000;
new HemisphericLight('light', new Vector3(0.3, 1, -0.4), scene);

const material = (color) => { const m = new StandardMaterial('m', scene); m.diffuseColor = color; return m; };

if (!isLab) {
  // The ship: a cone whose nose is +Z (CreateCylinder is along Y, so tip it forward).
  const ship = MeshBuilder.CreateCylinder('ship', { height: 2.4, diameterTop: 0, diameterBottom: 1.2, tessellation: 16 }, scene);
  ship.bakeTransformIntoVertices(Matrix.RotationX(Math.PI / 2)); // tip +Y -> +Z
  ship.material = material(new Color3(0.6, 0.7, 1));
  ship.rotationQuaternion = Quaternion.Identity();
  ship.renderOutline = true; ship.outlineWidth = 0.04; ship.outlineColor = new Color3(0.06, 0.06, 0.1);
  holder.assembled = true;

  // Targets and shots are thin instances: one draw call each however many there are.
  const rocks = MeshBuilder.CreateIcoSphere('rocks', { radius: 1, subdivisions: 2 }, scene);
  rocks.material = material(new Color3(0.6, 0.5, 0.4));
  const buf = new Float32Array(game.state.rocks.length * 16);
  game.state.rocks.forEach((r, i) => Matrix.Compose(new Vector3(r.r, r.r, r.r), Quaternion.Identity(), new Vector3(...r.c)).copyToArray(buf, i * 16));
  rocks.thinInstanceSetBuffer('matrix', buf, 16, false);
  rocks.alwaysSelectAsActiveMesh = true;

  const shots = MeshBuilder.CreateSphere('shots', { diameter: 0.6, segments: 6 }, scene);
  const shotMat = material(Color3.Black()); shotMat.emissiveColor = new Color3(1, 0.93, 0.5); shots.material = shotMat;
  shots.thinInstanceSetBuffer('matrix', new Float32Array(64 * 16), 16, false);
  shots.thinInstanceCount = 0;
  shots.setEnabled(false); // a thin-instanced mesh with zero instances still draws its source mesh at the origin
  shots.alwaysSelectAsActiveMesh = true;

  let deadRocks = 0;
  const vel = [0, 0, 0];
  const pos = camera.position;
  scene.onBeforeStepObservable.add(() => game.session.runStep(1 / 60));
  scene.onBeforeRenderObservable.add(() => {
    const { ship: s, shots: list, rocks: all } = game.state;
    ship.position.set(...s.position);
    ship.rotationQuaternion.set(...orientation(s));
    holder.nose = ship.getDirection(new Vector3(0, 0, 1)).asArray();
    const goal = chaseCamera({ ...s, pitch: 0 }, 12, 3).position, dt = Math.min(engine.getDeltaTime() / 1000, 0.25);
    const next = [0, 1, 2].map((i) => smoothDamp([pos.x, pos.y, pos.z][i], goal[i], vel[i], 0.15, dt));
    pos.set(next[0].value, next[1].value, next[2].value); next.forEach((n, i) => { vel[i] = n.velocity; });
    camera.setTarget(ship.position);
    const alive = all.filter((r) => !r.alive).length;
    if (alive !== deadRocks) {
      deadRocks = alive;
      all.forEach((r, i) => { if (!r.alive) { buf[i * 16] = buf[i * 16 + 5] = buf[i * 16 + 10] = 0; } });
      rocks.thinInstanceBufferUpdated('matrix');
    }
    const tmp = new Float32Array(Math.max(1, list.length) * 16);
    list.forEach((sh, i) => Matrix.Translation(...sh.p).copyToArray(tmp, i * 16));
    shots.thinInstanceSetBuffer('matrix', tmp, 16, false);
    shots.thinInstanceCount = list.length;
    shots.setEnabled(list.length > 0);
    game.session.endFrame(engine.getDeltaTime() / 1000);
  });
} else {
  holder.assembled = true;
  setupLab(sceneName, { engine, scene, camera, instr });
}

// Frames can render with nothing in them while materials compile in parallel, so count a frame as drawn only when
// it issued draw calls; `framesRendered` counts every render() for comparison.
holder.framesRendered = 0;
scene.onAfterRenderObservable.add(() => {
  holder.framesRendered++;
  game.session.drawCalls = instr.drawCallsCounter.current;
  if (game.session.drawCalls > 0 || isLab) game.session.markDrawn(game.session.framesDrawn + 1); // labs start empty
});

window.__game = {
  ...createProbe({
    session: game.session,
    versions: { ...__VERSIONS__, babylon: Engine.Version },
    read: () => ({
      scene: sceneName, assembled: holder.assembled, backend: holder.backend, renderer: holder.renderer,
      ship: game.state.ship, nose: holder.nose, fired: game.state.fired, hits: game.state.hits,
      shots: game.state.shots.length, rocksAlive: game.state.rocks.filter((r) => r.alive).length,
      timeStepMs: engine.getTimeStep(), framesRendered: holder.framesRendered,
    }),
  }),
  input: { down: (n) => game.session.input.down(n), up: (n) => game.session.input.up(n) },
  lab: window.__lab ?? null,
};

const KEYS = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'fire' };
addEventListener('keydown', (e) => { const k = KEYS[e.code]; if (k && !e.repeat) { game.session.input.down(k); e.preventDefault(); } });
addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k) game.session.input.up(k); });

engine.runRenderLoop(() => scene.render());
