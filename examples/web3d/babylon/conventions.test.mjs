// node --test conventions.test.mjs   (needs `npm install` here; uses Babylon.js NullEngine, so no browser)
// Babylon.js behaviour that the engine-babylon skill relies on, checked against the engine-neutral core.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3, Quaternion, Matrix } from '@babylonjs/core/Maths/math.vector.js';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { noseDirection, orientation } from '../core/flight.mjs';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);

/** Count scene.onBeforeStepObservable notifications in about `ms` of real time at the given timeStep option. */
function countSteps(timeStep, ms) {
  const engine = new NullEngine({ renderWidth: 64, renderHeight: 64, textureSize: 64, deterministicLockstep: true, lockstepMaxSteps: 4, timeStep });
  const scene = new Scene(engine);
  new FreeCamera('c', new Vector3(0, 0, -5), scene);
  let steps = 0, frames = 0;
  scene.onBeforeStepObservable.add(() => { steps++; });
  engine.runRenderLoop(() => { scene.render(); frames++; });
  return new Promise((resolve) => setTimeout(() => {
    const reported = engine.getTimeStep();
    engine.stopRenderLoop(); scene.dispose(); engine.dispose();
    resolve({ steps, frames, reported });
  }, ms));
}

test('timeStep is in seconds: 1/60 steps about 60 times a second, 1000/60 freezes the simulation', async () => {
  const good = await countSteps(1 / 60, 1500);
  assert.ok(good.steps >= 60 && good.steps <= 100, `${good.steps} steps in 1.5 s`);
  close(good.reported, 1000 / 60, 0.01); // getTimeStep() reports milliseconds
  const bad = await countSteps(1000 / 60, 1500);
  assert.ok(bad.steps <= 2, `${bad.steps} steps with a millisecond value`);
  assert.ok(bad.frames > 10, 'frames still render while the simulation is frozen');
});

test('Engine has no setTimeStep', () => {
  const engine = new NullEngine({ renderWidth: 64, renderHeight: 64, textureSize: 64 });
  assert.equal(typeof engine.setTimeStep, 'undefined');
  engine.dispose();
});

test('a core quaternion copies straight into rotationQuaternion in a right-handed scene', () => {
  const engine = new NullEngine({ renderWidth: 64, renderHeight: 64, textureSize: 64 });
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  const node = new TransformNode('ship', scene);
  for (const pose of [{ yaw: 0, pitch: 0 }, { yaw: Math.PI / 2, pitch: 0 }, { yaw: 0.7, pitch: 0.4 }, { yaw: -2.1, pitch: -0.9 }]) {
    node.rotationQuaternion = new Quaternion(...orientation(pose));
    node.computeWorldMatrix(true);
    const nose = node.getDirection(new Vector3(0, 0, 1)), want = noseDirection(pose);
    close(nose.x, want[0]); close(nose.y, want[1]); close(nose.z, want[2]);
  }
  scene.dispose(); engine.dispose();
});

test('in a right-handed scene Vector3.Forward(true) is -Z, so never use it for a +Z nose', () => {
  assert.equal(Vector3.Forward(true).z, -1);
  assert.equal(Vector3.Forward(false).z, 1);
});

test('a right-handed camera at +Z looking at the origin projects +X to the right and +Y up', () => {
  const engine = new NullEngine({ renderWidth: 200, renderHeight: 100, textureSize: 64 });
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  const camera = new FreeCamera('c', new Vector3(0, 0, 10), scene);
  camera.setTarget(Vector3.Zero());
  scene.render();
  const viewport = camera.viewport.toGlobal(200, 100);
  const project = (p) => Vector3.Project(p, Matrix.Identity(), scene.getTransformMatrix(), viewport);
  const centre = project(Vector3.Zero());
  assert.ok(project(new Vector3(1, 0, 0)).x > centre.x, '+X is right of centre');
  assert.ok(project(new Vector3(0, 1, 0)).y < centre.y, '+Y is above centre (screen y grows downward)');
  scene.dispose(); engine.dispose();
});
