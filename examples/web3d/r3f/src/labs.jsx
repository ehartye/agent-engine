// Small scenes that isolate one renderer behaviour so the verifier can read pixels or counters from them.
// Each lab publishes `window.__game.lab`; the functions render synchronously and read straight after, so no
// preserveDrawingBuffer is needed.
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { toonMaterial } from './toon.mjs';
import { outlineMaterial } from './outline.mjs';

function readPixel(gl, x, y) {
  const out = new Uint8Array(4);
  gl.getContext().readPixels(x, y, 1, 1, gl.getContext().RGBA, gl.getContext().UNSIGNED_BYTE, out);
  return [...out];
}

function useLab(make) {
  const { gl, scene, camera, size } = useThree();
  useEffect(() => {
    const lab = make({ gl, scene, camera, size });
    window.__game.lab = lab;
    return () => { window.__game.lab = null; };
  }, [gl, scene, camera, size]);
}

/** A sphere facing a light, shaded by a coloured ramp, with and without the channel patch. */
export function ToonLab() {
  const sphere = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);
  useLab(({ gl, scene, camera, size }) => ({
    name: 'toon',
    /** Centre pixel of the lit sphere for a coloured ramp. */
    centre(patch) {
      const mat = toonMaterial({ color: 0xffffff, bands: [[0, 0, 0], [0, 0, 0], [255, 40, 40]], patch });
      const mesh = new THREE.Mesh(sphere, mat);
      scene.add(mesh);
      camera.position.set(0, 0, 4); camera.lookAt(0, 0, 0);
      gl.render(scene, camera);
      const px = readPixel(gl, Math.floor(size.width / 2), Math.floor(size.height / 2));
      scene.remove(mesh); mat.dispose();
      return px;
    },
  }));
  return (<><color attach="background" args={[0x000000]} /><directionalLight position={[0, 0, 5]} intensity={3} /></>);
}

/** A green sphere with a red outline at a chosen distance: how many pixels thick is the line? */
export function OutlineLab() {
  const sphere = useMemo(() => new THREE.SphereGeometry(1, 48, 48), []);
  useLab(({ gl, scene, camera, size }) => ({
    name: 'outline',
    /** Red pixels per rim on the middle row, for a sphere of `radius` at `distance`. */
    thickness({ mode, radius, distance, amount }) {
      const body = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
      const hull = new THREE.Mesh(sphere, outlineMaterial({ color: 0xff0000, mode, thickness: amount, aspect: size.width / size.height }));
      for (const m of [body, hull]) { m.scale.setScalar(radius); m.position.set(0, 0, -distance); scene.add(m); }
      camera.position.set(0, 0, 0); camera.lookAt(0, 0, -1); camera.updateMatrixWorld();
      gl.render(scene, camera);
      const ctx = gl.getContext(), row = new Uint8Array(size.width * 4);
      ctx.readPixels(0, Math.floor(size.height / 2), size.width, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, row);
      let red = 0;
      for (let i = 0; i < size.width; i++) if (row[i * 4] > 128 && row[i * 4 + 1] < 128) red++;
      for (const m of [body, hull]) { scene.remove(m); m.material.dispose(); }
      return red / 2;
    },
  }));
  return <color attach="background" args={[0x000000]} />;
}

/** The same 1,000 spheres as separate meshes and as one InstancedMesh: draw calls after one render. */
export function InstancingLab() {
  const geo = useMemo(() => new THREE.SphereGeometry(0.4, 8, 8), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffffff }), []);
  useLab(({ gl, scene, camera }) => ({
    name: 'instancing',
    drawCalls(kind, n = 1000) {
      const group = new THREE.Group();
      if (kind === 'meshes') {
        for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geo, mat); m.position.set((i % 40) - 20, Math.floor(i / 40) - 12, -30); group.add(m); }
      } else {
        const inst = new THREE.InstancedMesh(geo, mat, n), d = new THREE.Object3D();
        for (let i = 0; i < n; i++) { d.position.set((i % 40) - 20, Math.floor(i / 40) - 12, -30); d.updateMatrix(); inst.setMatrixAt(i, d.matrix); }
        group.add(inst);
      }
      scene.add(group);
      camera.position.set(0, 0, 0); camera.lookAt(0, 0, -1);
      gl.info.reset(); gl.render(scene, camera);
      const calls = gl.info.render.calls;
      scene.remove(group);
      return calls;
    },
  }));
  return null;
}
