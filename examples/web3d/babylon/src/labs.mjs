// Small scenes that isolate one Babylon.js behaviour so the verifier can read pixels or counters from them.
// A lab sets `window.__lab`, which main.mjs exposes as `window.__game.lab`. Functions render synchronously and read
// straight after, so no preserveDrawingBuffer is needed.
import { Vector3, Matrix } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import '@babylonjs/core/Rendering/outlineRenderer';
import '@babylonjs/core/Meshes/thinInstanceMesh';

function readFrame(engine) {
  const gl = engine._gl, w = engine.getRenderWidth(), h = engine.getRenderHeight(), px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return { w, h, px };
}

const unlit = (scene, color) => {
  const m = new StandardMaterial('unlit', scene);
  m.disableLighting = true; m.emissiveColor = color; return m;
};

export function setupLab(name, { engine, scene, camera, instr }) {
  scene.clearColor = new Color4(0, 0, 0, 1);
  camera.position.set(0, 0, 8); camera.setTarget(Vector3.Zero());
  // Materials compile in parallel: wait until they are ready, or the first render draws nothing.
  const render = async () => { await scene.whenReadyAsync(); scene.render(); };
  const labs = {
    /** Share of the silhouette boundary with red ink within 3 px, and the average ink pixels per boundary pixel. */
    async outline({ shape }) {
      const mesh = shape === 'plate' ? MeshBuilder.CreateBox('p', { width: 4, height: 0.1, depth: 2 }, scene) : shape === 'box' ? MeshBuilder.CreateBox('b', { size: 2 }, scene) : MeshBuilder.CreateSphere('s', { diameter: 2, segments: 24 }, scene);
      mesh.rotation.set(0.5, 0.7, 0.2);
      mesh.material = unlit(scene, new Color3(1, 1, 1));
      mesh.renderOutline = true; mesh.outlineWidth = 0.04; mesh.outlineColor = new Color3(1, 0, 0);
      await render();
      const { w, h, px } = readFrame(engine);
      const body = (i) => px[i * 4] > 200 && px[i * 4 + 1] > 200 && px[i * 4 + 2] > 200;
      const ink = (i) => px[i * 4] > 150 && px[i * 4 + 1] < 90;
      const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : y * w + x);
      let edge = 0, covered = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = at(x, y);
        if (!body(i) || ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const j = at(x + dx, y + dy); return j >= 0 && !body(j) && !ink(j) ? true : j >= 0 && ink(j); })) continue;
        edge++;
        let found = false;
        for (let dy = -3; dy <= 3 && !found; dy++) for (let dx = -3; dx <= 3 && !found; dx++) { const j = at(x + dx, y + dy); if (j >= 0 && ink(j)) found = true; }
        if (found) covered++;
      }
      mesh.dispose();
      let inkPixels = 0;
      for (let i = 0; i < w * h; i++) if (ink(i)) inkPixels++;
      return { edge, coverage: edge ? covered / edge : 0, thickness: edge ? inkPixels / edge : 0 };
    },
    /** Red pixels at the screen centre for a thin-instanced box: one instance away from the centre, none, none and disabled. */
    async thin(kind) {
      const box = MeshBuilder.CreateBox('t', { size: 4 }, scene);
      box.material = unlit(scene, new Color3(1, 0, 0));
      const m = Matrix.Translation(kind === 'one' ? 8 : 0, 0, 0);
      box.thinInstanceSetBuffer('matrix', new Float32Array(m.toArray()), 16, false);
      box.thinInstanceCount = kind === 'one' ? 1 : 0;
      if (kind === 'zero-disabled') box.setEnabled(false);
      await render();
      const { w, h, px } = readFrame(engine);
      let centre = 0, right = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (px[i * 4] > 150 && px[i * 4 + 1] < 90) { if (Math.abs(x - w / 2) < w / 8) centre++; else if (x > w / 2) right++; }
      }
      box.dispose();
      return { centre, right };
    },
    /** Draw calls after one frame: 1,000 separate meshes versus one mesh with 1,000 thin instances. */
    async draws(kind) {
      const mat = unlit(scene, new Color3(1, 1, 1)), made = [];
      camera.position.set(0, 0, 40); camera.setTarget(Vector3.Zero());
      if (kind === 'meshes') {
        for (let i = 0; i < 1000; i++) { const s = MeshBuilder.CreateBox(`m${i}`, { size: 0.4 }, scene); s.material = mat; s.position.set((i % 40) - 20, Math.floor(i / 40) - 12, 0); made.push(s); }
      } else {
        const s = MeshBuilder.CreateBox('i', { size: 0.4 }, scene); s.material = mat;
        const buf = new Float32Array(1000 * 16);
        for (let i = 0; i < 1000; i++) Matrix.Translation((i % 40) - 20, Math.floor(i / 40) - 12, 0).copyToArray(buf, i * 16);
        s.thinInstanceSetBuffer('matrix', buf, 16, true); made.push(s);
      }
      await render();
      const calls = instr.drawCallsCounter.current;
      made.forEach((s) => s.dispose());
      return calls;
    },
  };
  window.__lab = { name, ...labs };
}
