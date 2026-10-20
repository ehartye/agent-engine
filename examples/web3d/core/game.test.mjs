// node --test examples/web3d/core/game.test.mjs  (no browser, no dependencies)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './game.mjs';
import { noseDirection } from './flight.mjs';

const ahead = () => createGame({ targets: [{ c: [0, 0, 60], r: 3 }] });

test('a tap fires one shot that sweeps into a target dead ahead, at 60 and at 144 Hz', () => {
  for (const hz of [60, 144, 30]) {
    const { session, state } = ahead();
    session.input.down('fire'); session.input.up('fire');
    for (let i = 0; i < hz * 3; i++) session.frameUpdate(1 / hz);
    assert.equal(state.fired, 1, `${hz} Hz fired`);
    assert.equal(state.hits, 1, `${hz} Hz hits`);
    assert.equal(state.rocks[0].alive, false);
  }
});

test('held yaw turns the ship toward +X and held pitch points the nose down', () => {
  const { session, state } = ahead();
  session.input.down('right');
  for (let i = 0; i < 30; i++) session.frameUpdate(1 / 60);
  assert.ok(state.ship.yaw > 0 && noseDirection(state.ship)[0] > 0);
  session.input.up('right'); session.input.down('down');
  for (let i = 0; i < 30; i++) session.frameUpdate(1 / 60);
  assert.ok(state.ship.pitch > 0 && noseDirection(state.ship)[1] < 0);
});

test('the pose before the last step is kept for interpolation', () => {
  const { session, state } = ahead();
  for (let i = 0; i < 5; i++) session.frameUpdate(1 / 60);
  assert.ok(state.prev.position[2] < state.ship.position[2]);
});

test('the same seed builds the same field', () => {
  assert.deepEqual(createGame({ seed: 5 }).state.rocks, createGame({ seed: 5 }).state.rocks);
  assert.notDeepEqual(createGame({ seed: 5 }).state.rocks, createGame({ seed: 6 }).state.rocks);
});
