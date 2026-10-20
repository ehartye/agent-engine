import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { chaseCamera, smoothDamp } from '../../core/flight.mjs';
import { toonMaterial } from './toon.mjs';
import { outlineMaterial } from './outline.mjs';

const BANDS = [[40, 60, 160], [90, 140, 230], [200, 230, 255]]; // a coloured ramp, dark to light
const lerp = (a, b, t) => a + (b - a) * t;

/** The one place the fixed-step game is driven from R3F: a single useFrame ahead of every view. */
function Sim({ game, holder }) {
  useFrame((state, delta) => {
    holder.alpha = game.session.frameUpdate(Math.min(delta, 0.25));
  }, -2);
  return null;
}

/** Renderer counters for the probe, in every scene: the previous frame's draw calls and render() calls so far. */
function Counters({ game }) {
  useFrame((state) => {
    game.session.drawCalls = state.gl.info.render.calls;
    game.session.markDrawn(state.gl.info.render.frame);
  }, -2);
  return null;
}

function Ship({ game, holder }) {
  const group = useRef();
  const material = useMemo(() => toonMaterial({ color: 0xffffff, bands: BANDS }), []);
  const hull = useMemo(() => outlineMaterial({ color: 0x101018 }), []);
  useEffect(() => { holder.assembled = true; holder.ship = group.current; }, [holder]);
  useFrame(() => {
    const { prev, ship } = game.state, a = holder.alpha ?? 0;
    group.current.position.set(...ship.position.map((v, i) => lerp(prev.position[i], v, a)));
    group.current.rotation.set(lerp(prev.pitch, ship.pitch, a), lerp(prev.yaw, ship.yaw, a), 0, 'YXZ');
    group.current.getWorldDirection(holder.nose);          // local +Z in world space: the model's nose
  });
  return (
    <group ref={group}>
      {/* ConeGeometry points along +Y; turn it so the nose is +Z like a glTF model */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={material}><coneGeometry args={[0.6, 2.4, 16]} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={hull}><coneGeometry args={[0.6, 2.4, 16]} /></mesh>
    </group>
  );
}

/** Rocks and shots are instanced: one draw call each however many there are. */
function Instances({ game }) {
  const rocks = useRef(), shots = useRef();
  const material = useMemo(() => toonMaterial({ color: 0xffffff, bands: [[70, 60, 50], [140, 120, 100], [230, 215, 190]] }), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    game.state.rocks.forEach((r, i) => { dummy.position.set(...r.c); dummy.scale.setScalar(r.r); dummy.updateMatrix(); rocks.current.setMatrixAt(i, dummy.matrix); });
    rocks.current.instanceMatrix.needsUpdate = true;
  }, [game, dummy]);
  useFrame(() => {
    game.state.rocks.forEach((r, i) => {
      if (r.alive) return;
      dummy.position.set(...r.c); dummy.scale.setScalar(0); dummy.updateMatrix(); rocks.current.setMatrixAt(i, dummy.matrix);
      rocks.current.instanceMatrix.needsUpdate = true;
    });
    shots.current.count = game.state.shots.length;
    game.state.shots.forEach((s, i) => { dummy.position.set(...s.p); dummy.scale.setScalar(1); dummy.updateMatrix(); shots.current.setMatrixAt(i, dummy.matrix); });
    shots.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={rocks} args={[undefined, undefined, game.state.rocks.length]} material={material} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
      </instancedMesh>
      <instancedMesh ref={shots} args={[undefined, undefined, 64]} frustumCulled={false}>
        <sphereGeometry args={[0.3, 8, 8]} /><meshBasicMaterial color={0xffee88} />
      </instancedMesh>
    </>
  );
}

/** Chase camera: behind the drawn pose, smoothed with a critically damped spring, looking at the ship. */
function CameraRig({ game, holder }) {
  const vel = useRef([0, 0, 0]);
  useFrame((state, delta) => {
    const { prev, ship } = game.state, a = holder.alpha ?? 0;
    const pose = { position: ship.position.map((v, i) => lerp(prev.position[i], v, a)), yaw: lerp(prev.yaw, ship.yaw, a), pitch: 0 };
    const goal = chaseCamera(pose, 12, 3).position, p = state.camera.position, dt = Math.min(delta, 0.25);
    const next = [0, 1, 2].map((i) => smoothDamp(p.getComponent(i), goal[i], vel.current[i], 0.15, dt));
    state.camera.position.set(...next.map((n) => n.value));
    vel.current = next.map((n) => n.velocity);
    state.camera.lookAt(...pose.position);
  }, -1);
  return null;
}

function Flight({ game, holder }) {
  return (
    <>
      <color attach="background" args={[0x0a0e1a]} />
      <ambientLight intensity={0.6} /><directionalLight position={[5, 10, -4]} intensity={2} />
      <Sim game={game} holder={holder} /><Ship game={game} holder={holder} /><Instances game={game} /><CameraRig game={game} holder={holder} />
    </>
  );
}

export function App({ game, holder, lab }) {
  return (
    <Canvas
      gl={{ antialias: lab ? false : true }}
      camera={{ fov: 60, near: 0.1, far: 3000, position: [0, 3, -12] }}
      onCreated={({ gl }) => {
        const dbg = gl.getContext().getExtension('WEBGL_debug_renderer_info');
        holder.backend = gl.capabilities.isWebGL2 ? 'webgl2' : 'webgl1';
        holder.renderer = dbg ? gl.getContext().getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
      }}
    >
      <Counters game={game} />
      {lab ? lab : <Flight game={game} holder={holder} />}
    </Canvas>
  );
}
