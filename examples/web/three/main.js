// three.js build of the agent-engine sample scene: the 3D fox (GLB, walk clip), the campfire and courier as billboard
// flipbooks cut from the agent-sprites atlases, a flickering fire light, and the agent-beeps browser player for audio.
// three.js is a rendering library, so the flipbook, the walk-around and the pickup trigger are all written here.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createPlayer } from '/web/vendor/beeps-player/player/player.js';

const W = 960, H = 540;
const FOX_FACING = 1; // +1 or -1: which way the model's forward axis points along its local X after the GLB load
const state = { ready: false, audioErrors: [], pickups: [], unlocked: false, fox: null };
window.__state = () => snapshot();

const player = createPlayer({ catalog: '/assets/audio/index.json', voices: 8, onError: (e) => state.audioErrors.push(e) });
window.__player = player;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1030);
scene.fog = new THREE.Fog(0x0b1030, 9, 26);
const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 80);
camera.position.set(0, 2.1, 8.2);
camera.lookAt(0, 0.9, 0);

scene.add(new THREE.HemisphereLight(0x7a8ad0, 0x2a1f33, 1.25));
const moon = new THREE.DirectionalLight(0x9fb2ff, 1.7);
moon.position.set(-4, 6, 3);
scene.add(moon);
const fireLight = new THREE.PointLight(0xff8a2a, 22, 16, 1.4);
fireLight.position.set(0, 1.3, 0.9);
scene.add(fireLight);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x1b2148, roughness: 0.95 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// ---- flipbook: follow an atlas tag into the (mixed) frames array and honour the pivot slice
async function loadFlipbook(png, atlasUrl, tagName, heightUnits) {
  const [atlas, tex] = await Promise.all([fetch(atlasUrl).then(r => r.json()), new THREE.TextureLoader().loadAsync(png)]);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  const tag = atlas.meta.frameTags.find(t => t.name === tagName);
  const frames = atlas.frames.slice(tag.from, tag.to + 1); // frame index is not cell index: the tag indexes into the array
  const pivot = atlas.meta.slices.find(s => s.name === 'pivot').keys[0].pivot; // relative to the cell
  const cell = frames[0].frame, texW = atlas.meta.size.w, texH = atlas.meta.size.h;
  tex.repeat.set(cell.w / texW, cell.h / texH);
  const material = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.05, fog: false });
  const sprite = new THREE.Sprite(material);
  sprite.center.set(pivot.x / cell.w, 1 - pivot.y / cell.h);
  sprite.scale.set(heightUnits * cell.w / cell.h, heightUnits, 1);
  const total = frames.reduce((a, f) => a + f.duration, 0);
  const book = { sprite, frames: frames.length, durations: [...new Set(frames.map(f => f.duration))], frameIndex: 0,
    update(ms) {
      let t = ms % total, i = 0;
      while (t >= frames[i].duration) { t -= frames[i].duration; i++; }
      book.frameIndex = i;
      const f = frames[i].frame;
      tex.offset.set(f.x / texW, 1 - (f.y + f.h) / texH);
    } };
  book.update(0);
  return book;
}

const fire = await loadFlipbook('/assets/sprites/campfire.png', '/assets/sprites/campfire.atlas.json', 'burn', 2.6);
fire.sprite.position.set(0, 0, 0);
scene.add(fire.sprite);
const courier = await loadFlipbook('/assets/sprites/courier.png', '/assets/sprites/courier.atlas.json', 'walk', 1.7);
courier.sprite.position.set(3.4, 0, 0.6);
scene.add(courier.sprite);

// ---- the fox
const gltf = await new GLTFLoader().loadAsync('/assets/meshes/fox.glb');
const fox = gltf.scene;
const box = new THREE.Box3().setFromObject(fox);
const size = box.getSize(new THREE.Vector3());
const FOX_HEIGHT = 1.35;
const k = FOX_HEIGHT / size.y;
fox.scale.setScalar(k);
fox.updateMatrixWorld(true);
const grounded = new THREE.Box3().setFromObject(fox);
fox.position.y -= grounded.min.y;
const pivotGroup = new THREE.Group();
pivotGroup.add(fox);
scene.add(pivotGroup);
const mixer = new THREE.AnimationMixer(fox);
const clipNames = gltf.animations.map(c => c.name);
const walk = gltf.animations.find(c => c.name === 'walk') ?? gltf.animations[0];
const walkAction = mixer.clipAction(walk);
walkAction.play();
fox.traverse(o => { if (o.isMesh) { o.castShadow = false; } });
state.fox = { clips: clipNames, playing: walk.name, heightUnits: FOX_HEIGHT, sourceHeight: Number(size.y.toFixed(3)), meshes: 0 };
fox.traverse(o => { if (o.isMesh) state.fox.meshes++; });

// ---- loop
const timer = new THREE.Timer(); // THREE.Clock is deprecated in 0.186
let t = 0;
let heading = Math.PI / 2;
function frame(ts) {
  timer.update(ts);
  const dt = Math.min(timer.getDelta(), 0.1);
  t += dt;
  mixer.update(dt);
  // the fox paces to and fro in front of the fire and turns to face the way it walks
  const phase = t * 0.5;
  pivotGroup.position.set(2.0 * Math.sin(phase) - 1.0, 0, 2.0);
  const target = (Math.cos(phase) >= 0 ? 1 : -1) * Math.PI / 2 * FOX_FACING;
  heading += (target - heading) * Math.min(1, dt * 4);
  pivotGroup.rotation.y = heading;
  // the courier walks a short beat to and fro
  const beat = (Math.sin(t * 0.55) + 1) / 2;
  courier.sprite.position.x = 3.0 + beat * 0.8;
  fire.update(t * 1000);
  courier.update(t * 1000);
  fireLight.intensity = 40 * (0.85 + 0.12 * Math.sin(t * 17) + 0.06 * Math.sin(t * 31 + 1) + 0.05 * Math.sin(t * 7));
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
state.ready = true;

async function start() {
  if (state.unlocked) return;
  await player.unlock();
  state.unlocked = true;
  await player.music('survey-drone', { fadeSec: 1 });
}
function pickup(opts = {}) {
  const handle = player.play('relic-discovered', opts);
  state.pickups.push(handle ? handle.file : null);
  return handle ? handle.file : null;
}
window.__pickup = pickup;
addEventListener('pointerdown', start);
addEventListener('keydown', e => { if (e.code === 'Space') start(); if (e.code === 'KeyP') pickup(); });

function snapshot() {
  if (!state.ready) return { ready: false }; // the module is still awaiting loads
  return {
    ready: state.ready, unlocked: state.unlocked, audioErrors: state.audioErrors, pickups: state.pickups,
    three: THREE.REVISION,
    fox: { ...state.fox, time: Number(walkAction.time.toFixed(3)), running: walkAction.isRunning(), x: Number(pivotGroup.position.x.toFixed(2)) },
    fire: { frameIndex: fire.frameIndex, frames: fire.frames, durations: fire.durations },
    courier: { frameIndex: courier.frameIndex, frames: courier.frames, durations: courier.durations, x: Number(courier.sprite.position.x.toFixed(2)) },
    audio: player.inspect(),
  };
}
