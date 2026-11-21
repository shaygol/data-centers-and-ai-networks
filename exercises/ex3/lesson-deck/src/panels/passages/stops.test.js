import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STOPS } from './stops.js';
import { LABS } from '../../labs/index.js';

const quotes = (stop) => stop.blocks.filter((b) => b.type === 'quote');
const quoted = (id) => quotes(STOPS.find((s) => s.id === id)).map((q) => q.text).join(' ');

test('the passages run P1 to P4, with the Firehose zoom inside P1 (Spec, Key passages)', () => {
  assert.deepEqual(STOPS.map((s) => s.id), ['p1', 'p1-firehose', 'p2', 'p3', 'p4']);
});

test('every passage quotes the paper, cites a section and poses a debate question (Spec, evidence rule)', () => {
  for (const stop of STOPS) {
    assert.ok(quotes(stop).length > 0, stop.id);
    assert.match(stop.source, /^Jupiter §\d/, stop.id);
    assert.ok(stop.question.trim().length > 0, stop.id);
  }
});

test('trims are marked with an ellipsis and never cut inside a sentence (Spec, evidence rule)', () => {
  for (const stop of STOPS) {
    for (const { text } of quotes(stop)) {
      for (const piece of text.split(' … ')) assert.match(piece.trim(), /^[A-Z(].*[.…]$/, `${stop.id}: ${piece.slice(0, 40)}`);
    }
  }
});

test('the passages carry the paper sentences the lesson plan names (Jupiter §1, §3.1, §5.2, §6.1)', () => {
  assert.match(quoted('p1'), /we adopted Clos topologies for our datacenters/);
  assert.match(quoted('p1-firehose'), /we consider FH1\.0 to be a landmark effort internally/);
  assert.match(quoted('p2'), /^Clos topologies can scale to nearly arbitrary size/);
  assert.match(quoted('p2'), /more complex routing across multiple equal-cost paths\.$/);
  assert.match(quoted('p3'), /^A number of these components anticipate some of the principles of modern SDN/);
  assert.match(quoted('p3'), /Switches locally calculate forwarding tables/);
  assert.match(quoted('p4'), /as utilization approached 25%/);
  for (const cause of ['(i)', '(ii)', '(iii)', '(iv)']) assert.ok(quoted('p4').includes(cause), cause);
});

test('P1 and P2 split the Clos principle without repeating a sentence (Jupiter §1)', () => {
  assert.ok(!quoted('p1').includes('nearly arbitrary size'));
  assert.ok(!quoted('p2').includes('we adopted Clos topologies'));
});

test('every jump opens a visible lab’s real guided experiment (Spec, Interactive artifact)', () => {
  for (const stop of STOPS) {
    for (const jump of stop.jumps ?? []) {
      const lab = LABS.find((l) => l.id === jump.tab);
      assert.ok(lab && !lab.hidden, `${stop.id} -> ${jump.tab}`);
      assert.ok(lab.experiments.some((e) => e.id === jump.arg), `${stop.id} -> ${jump.tab}~${jump.arg}`);
    }
  }
});

test('each passage opens the lab the spec pairs it with (Spec, Key passages)', () => {
  const opens = Object.fromEntries(STOPS.map((s) => [s.id, [...new Set((s.jumps ?? []).map((j) => j.tab))]]));
  assert.deepEqual(opens, { p1: [], 'p1-firehose': ['generations'], p2: ['clos'], p3: ['firepath'], p4: ['congestion'] });
});
