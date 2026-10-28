// The routing prompts and their answer key stay honest: every expected skill exists, ids are unique, the skills with a distinct trigger are all covered,
// and a prompt that carries a `term` still finds that term in its expected skill's description, so an edited description cannot lose its trigger unnoticed.
// The blind-router scoring itself needs a model and is run by hand (see the fixture's `about`). Prompts whose answer is a Phaser skill live in agent-phaser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { prompts } = JSON.parse(readFileSync(join(root, 'tests', 'fixtures', 'engine-routing-prompts.json'), 'utf8'));
const skills = readdirSync(join(root, 'skills')).filter(d => existsSync(join(root, 'skills', d, 'SKILL.md')));
const description = name => (readFileSync(join(root, 'skills', name, 'SKILL.md'), 'utf8').match(/^description:\s*(.*)$/m) ?? [])[1] ?? '';

test('every prompt has a text, a unique id and an expected skill that exists', () => {
  assert.ok(prompts.length >= 10, `found ${prompts.length}`);
  assert.equal(new Set(prompts.map(p => p.id)).size, prompts.length, 'ids are unique');
  for (const p of prompts) {
    assert.ok(typeof p.text === 'string' && p.text.length > 15, `prompt ${p.id} has no text`);
    assert.ok(skills.includes(p.expect), `prompt ${p.id} expects ${p.expect}, which is not a skill of this plugin`);
    for (const alt of p.alt ?? []) assert.ok(skills.includes(alt), `prompt ${p.id} alt ${alt} is not a skill of this plugin`);
    assert.ok(!(p.alt ?? []).includes(p.expect), `prompt ${p.id} lists its own answer as an alternate`);
  }
});

test('each engine skill except engine-visual-polish is the answer to at least one prompt', () => {
  assert.deepEqual(skills.toSorted(), ['engine-asset-import', 'engine-babylon', 'engine-custom-shaders', 'engine-r3f', 'engine-selection', 'engine-visual-polish']);
  const answered = new Set(prompts.map(p => p.expect));
  for (const name of skills.filter(s => s !== 'engine-visual-polish')) assert.ok(answered.has(name), `no prompt expects ${name}`);
});

test('a prompt with a term finds it in the expected skill description', () => {
  const withTerm = prompts.filter(p => p.term);
  assert.ok(withTerm.length >= 8, 'the descriptions are guarded');
  for (const p of withTerm) assert.match(description(p.expect), new RegExp(p.term, 'i'), `prompt ${p.id}: ${p.expect} no longer mentions /${p.term}/`);
});

test('the guard fails when a description loses its term (the check is not vacuous)', () => {
  const p = prompts.find(q => q.term === 'useFrame');
  assert.ok(p && description(p.expect).includes('useFrame'));
  assert.doesNotMatch(description(p.expect).replaceAll('useFrame', ''), new RegExp(p.term, 'i'));
});
