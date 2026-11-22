import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FAT_TREE_12,
  EXPANDER_12,
  SPRAYPOINT_DEMO_PATHS,
  cutSize,
  shortestPaths,
  areEdgeDisjoint,
  failureImpact,
  edgeDisjointPaths,
  ecmpPredefinedEntries,
  kShortestEntriesPerRouter,
  cablingEndpointPairs,
} from './model.js';

const close = (actual, expected, tol = 1e-9, label = '') =>
  assert.ok(Math.abs(actual - expected) < tol, `${label}: ${actual}, expected ${expected}`);

test('12-ToR fat tree example matches RNG Fig. 1a and §2: 22 switches, 3:1 oversubscription, 2-link pod cut, ~60% stranded', () => {
  const byTier = (t) => FAT_TREE_12.nodes.filter((n) => n.tier === t).length;
  assert.deepEqual([byTier('tor'), byTier('agg'), byTier('spine'), FAT_TREE_12.nodes.length], [12, 8, 2, 22]);
  assert.equal(FAT_TREE_12.links.filter((l) => l.tier === 'tor').length, 24);
  assert.equal(FAT_TREE_12.links.filter((l) => l.tier === 'spine').length, 8);
  assert.equal(FAT_TREE_12.oversubscription, 3);

  const pod1 = new Set(['T1', 'T2', 'T3', 'A1', 'A2']);
  assert.equal(cutSize(FAT_TREE_12.links, pod1), 2);
  close(FAT_TREE_12.allToAllStranded, 0.59259259259, 1e-6, 'stranded all-to-all capacity');

  const s1Impact = failureImpact(FAT_TREE_12, 'S1');
  assert.equal(s1Impact.lostLinks, 4);
  assert.equal(s1Impact.allConnected, true);
});

test('12-ToR flat expander is a valid 3-regular graph with 45% fewer switches, 9-link cut on {T1,T2,T3}, and survives ToR failure', () => {
  assert.equal(EXPANDER_12.nodes.length, 12);
  assert.equal(EXPANDER_12.edges.length, 18);
  close((22 - 12) / 22, 10 / 22, 1e-9, '45.5% switch savings');

  const deg = new Map(EXPANDER_12.nodes.map((n) => [n.id, 0]));
  const seen = new Set();
  for (const [a, b] of EXPANDER_12.edges) {
    assert.notEqual(a, b, 'no self-loops');
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    assert.ok(!seen.has(key), `duplicate edge ${key}`);
    seen.add(key);
    deg.set(a, deg.get(a) + 1);
    deg.set(b, deg.get(b) + 1);
  }
  for (const [id, d] of deg) assert.equal(d, 3, `${id} degree`);

  assert.equal(cutSize(EXPANDER_12.edges, ['T1', 'T2', 'T3']), 9);

  const t6Impact = failureImpact(EXPANDER_12, 'T6');
  assert.equal(t6Impact.lostLinks, 3);
  assert.equal(t6Impact.remainingTors, 11);
  assert.equal(t6Impact.allConnected, true);
});

test('shortest-path finds only 1 path T1 -> T7, while Spraypoint exposes 3 completely edge-disjoint paths (2, 4, 5 hops)', () => {
  const sp = shortestPaths(EXPANDER_12.nodes, EXPANDER_12.edges, 'T1', 'T7');
  assert.deepEqual(sp, [['T1', 'T4', 'T7']]);

  assert.equal(SPRAYPOINT_DEMO_PATHS.length, 3);
  assert.deepEqual(
    SPRAYPOINT_DEMO_PATHS.map((p) => p.nodes.length - 1),
    [2, 4, 5],
  );
  assert.equal(areEdgeDisjoint(SPRAYPOINT_DEMO_PATHS, EXPANDER_12.edges), true);
});

test('RNG analytical models match §3, §5, §6, and Model 7.1 figures in the paper', () => {
  close(edgeDisjointPaths(64, 1), 40.4556442, 1e-4, 'd=64, h=1');
  close(edgeDisjointPaths(64, 2), 55.3385419, 1e-4, 'd=64, h=2 (~86.5% of degree)');
  assert.equal(ecmpPredefinedEntries(64, 2), 8192);
  assert.equal(kShortestEntriesPerRouter(10000, 8), 320000);
  assert.equal(cablingEndpointPairs(1000, 10), 1045);
});
