import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LABS } from './registry.js';

const lab = (id) => LABS.find((l) => l.id === id);
const note = (id, experiment) => lab(id).experiments.find((e) => e.id === experiment).note;
const assertSilent = (text, words, where) => {
  for (const word of words) assert.ok(!text.includes(word), `${where} gives away "${word}"`);
};

// The rendered pages, including text below the fold, are checked by scripts/smoke.mjs.
test('Lab 2 lands before the spine question is answered (Lesson plan, Lab 2; ticket 05)', () => {
  assertSilent(lab('clos').idea, ['shifts load', 'leaves paths'], 'idea');
  assertSilent(note('clos', 'healthy'), ['25%'], 'default note');
  assert.match(note('clos', 'link-failure'), /leaves paths but shifts load unevenly/);
});

test('Lab 3 poses the control loop without answering "Is this step centralized?" (Lesson plan, Decision 3; Jupiter §5.2)', () => {
  assertSilent(lab('firepath').idea, ['computes', 'Each switch', 'holds the topology'], 'idea');
});
