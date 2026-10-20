import React from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { createProbe } from '../../core/probe.mjs';
import { createGame } from '../../core/game.mjs';
import { App } from './App.jsx';
import { ToonLab, OutlineLab, InstancingLab } from './labs.jsx';

const params = new URLSearchParams(location.search);
const scene = params.get('scene') ?? 'flight';
// `?scene=fire` puts one target dead ahead so a verifier can fire a single shot and expect one hit.
const game = createGame(scene === 'fire' ? { targets: [{ c: [0, 0, 60], r: 3 }] } : {});
const holder = { assembled: false, backend: undefined, renderer: '', alpha: 0, ship: null, nose: new THREE.Vector3() };
const labs = { toon: <ToonLab />, outline: <OutlineLab />, instancing: <InstancingLab /> };
const isLab = scene in labs;
if (isLab) holder.assembled = true; // labs have no model to wait for

// Installed before React mounts: plain data copied on demand, plus the input path a verifier drives.
window.__game = {
  ...createProbe({
    session: game.session,
    versions: { ...__VERSIONS__, three: THREE.REVISION, react: React.version },
    read: () => ({
      scene, assembled: holder.assembled, backend: holder.backend, renderer: holder.renderer,
      ship: game.state.ship, nose: holder.nose.toArray(), fired: game.state.fired, hits: game.state.hits,
      shots: game.state.shots.length, rocksAlive: game.state.rocks.filter((r) => r.alive).length,
    }),
  }),
  input: { down: (n) => game.session.input.down(n), up: (n) => game.session.input.up(n) },
  lab: null,
};

const KEYS = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'fire' };
addEventListener('keydown', (e) => { const k = KEYS[e.code]; if (k && !e.repeat) { game.session.input.down(k); e.preventDefault(); } });
addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k) game.session.input.up(k); });

createRoot(document.getElementById('root')).render(<App game={game} holder={holder} lab={isLab ? labs[scene] : null} />);
