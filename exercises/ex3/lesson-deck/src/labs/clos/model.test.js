import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clos, equalCostPaths, allToAll, pair, route, linkLoads, summary, spineShareLost, isSpine } from './model.js';
import lab from './view.js';

const close = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: ${actual}, expected ${expected}`);

test('traffic is conserved through the fabric before and after a failure: every switch forwards what it receives, and all of it arrives (Jupiter §5.2)', () => {
  const net = clos();
  const demands = allToAll(net, 1);
  for (const failed of [[], ['S1'], ['A7-S1'], ['T1-A1'], ['S1', 'S4', 'A3-S2']]) {
    const result = route(net, demands, failed);
    close(result.offered, 8, `offered with ${failed}`);
    close(result.delivered, 8, `delivered with ${failed}`);
    close(result.unreachable, 0, `unreachable with ${failed}`);
    for (const n of net.nodes) {
      const { received, sent, sourced, sunk } = result.balance.get(n.id);
      close(received + sourced, sent + sunk, `${n.id} with ${failed}`);
      if (n.tier !== 'tor') close(sourced + sunk, 0, `${n.id} only passes traffic on`);
    }
  }
});

test('traffic with no path left counts as unreachable, so offered still equals delivered plus unreachable (illustration, ticket 05)', () => {
  const net = clos();
  const cutOff = ['T1-A1', 'T1-A2'];
  const one = route(net, pair('T1', 'T7', 2), cutOff);
  assert.deepEqual([one.offered, one.delivered, one.unreachable], [2, 0, 2]);
  const all = route(net, allToAll(net, 1), cutOff);
  close(all.offered, 8, 'offered');
  // T1 can't place its 1 unit, and the other 7 ToRs each lose the 1/7 they send to T1.
  close(all.unreachable, 2, 'unreachable');
  close(all.delivered, 6, 'delivered');
});

test('ECMP spreads one pair evenly across the four spines of a healthy fabric (Jupiter §5.2)', () => {
  const loads = linkLoads(clos(), pair('T1', 'T7', 1));
  const load = (id) => loads.find((l) => l.id === id).load;
  for (const id of ['T1-A1', 'T1-A2', 'T7-A7', 'T7-A8']) close(load(id), 0.5, id);
  for (const id of ['A1-S1', 'A1-S2', 'A2-S3', 'A2-S4', 'A7-S1', 'A7-S2', 'A8-S3', 'A8-S4']) close(load(id), 0.25, id);
  assert.equal(load('T2-A1'), 0);
});

test('sorted link loads put the busiest link first and failed links last, with no load (illustration, ticket 05)', () => {
  const loads = linkLoads(clos(), pair('T1', 'T7', 1), ['S1']);
  const up = loads.filter((l) => !l.down).map((l) => l.load);
  assert.deepEqual(up, [...up].sort((a, b) => b - a));
  const down = loads.slice(-4);
  assert.deepEqual(down.map((l) => l.id).sort(), ['A1-S1', 'A3-S1', 'A5-S1', 'A7-S1']);
  assert.ok(down.every((l) => l.down && l.load === 0));
});

test('all ToRs at half rate: spine links carry 3/7 when healthy, and a spine failure doubles the busiest to 6/7 (illustration, ticket 05)', () => {
  const net = clos();
  const demands = allToAll(net, 1);
  close(linkLoads(net, demands).find((l) => l.id === 'A1-S1').load, 3 / 7, 'A1-S1 healthy');
  const failed = linkLoads(net, demands, ['S1']);
  close(failed[0].load, 6 / 7, 'busiest after S1 fails');
  close(failed.find((l) => l.id === 'A1-S2').load, 6 / 7, 'A1-S2 is A1’s only spine now');
  close(failed.find((l) => l.id === 'A2-S3').load, 3 / 7, 'A2-S3 keeps its load');
});

test('the notes quote the model: 3/7 to 6/7 and 7/12 fits for a spine failure, 3 of 4 paths at 50, 25, 25 for a link failure (illustration, ticket 05)', () => {
  const note = (id) => lab.experiments.find((e) => e.id === id).note;
  assert.match(note('spine-failure'), /4 of 16 spine links/);
  assert.match(note('spine-failure'), /from 43% to 86%/);
  assert.match(note('spine-failure'), /only 58% fits/);
  assert.match(note('link-failure'), /keeps 3 of 4 paths/);
  assert.match(note('link-failure'), /50%, 25%, 25%/);
});

test('isSpine tells a spine block from other switches (Jupiter Fig. 2)', () => {
  const net = clos();
  assert.equal(isSpine(net, 'S1'), true);
  assert.equal(isSpine(net, 'A1'), false);
  assert.equal(isSpine(net, 'T1'), false);
});

test('a spine failure removes 4 of 16 spine links, and nothing is lost until the busiest link passes capacity (illustration, ticket 05)', () => {
  const net = clos();
  const half = summary(net, allToAll(net, 1), ['S1']);
  assert.deepEqual([half.spineLinksUp, half.spineLinksTotal, half.fits], [12, 16, 1]);
  const full = summary(net, allToAll(net, 2), ['S1']);
  close(full.busiest.load, 12 / 7, 'busiest at full rate');
  close(full.fits, 7 / 12, 'fits at full rate');
});

test('a ToR that loses one of two uplinks can only send half its full rate (illustration, ticket 05)', () => {
  const s = summary(clos(), pair('T1', 'T7', 2), ['T1-A1']);
  assert.deepEqual([s.busiest.id, s.busiest.load, s.fits], ['T1-A2', 2, 0.5]);
});

test('with no path left, none of the traffic fits (illustration, ticket 05)', () => {
  assert.equal(summary(clos(), pair('T1', 'T7', 1), ['T1-A1', 'T1-A2']).fits, 0);
});

test('one spine block of 256 is about 0.4% of spine capacity, against half at 2 spines (derived from Jupiter Fig. 8)', () => {
  assert.equal(spineShareLost(2), 0.5);
  assert.equal(spineShareLost(4), 0.25);
  close(spineShareLost(256), 0.00390625, '256');
});

test('on a healthy symmetric fabric, cross-block ToR pairs have aggregation switches per block x uplinks per switch equal-cost paths (closed form, derived from Jupiter §1, §3.1, §5.2)', () => {
  // Expected values are the closed form worked by hand: 2x2, 2x4, 4x4.
  assert.equal(equalCostPaths(clos(), 'T1', 'T7').paths.length, 4);
  assert.equal(equalCostPaths(clos({ blocks: 4, torsPerBlock: 2, aggsPerBlock: 2, uplinksPerAgg: 4 }), 'T1', 'T7').paths.length, 8);
  assert.equal(equalCostPaths(clos({ blocks: 3, torsPerBlock: 2, aggsPerBlock: 4, uplinksPerAgg: 4 }), 'T1', 'T5').paths.length, 16);
});

test('the default lab fabric has 8 ToRs, 8 aggregation switches, 4 spine blocks, and each block reaches each spine once (illustration, after Jupiter §3.1)', () => {
  const net = clos();
  const count = (tier) => net.nodes.filter((n) => n.tier === tier).length;
  assert.deepEqual([count('tor'), count('agg'), count('spine')], [8, 8, 4]);
  assert.equal(net.links.filter((l) => l.tier === 'tor').length, 16);
  assert.equal(net.links.filter((l) => l.tier === 'spine').length, 16);
  const aggsOf = (spine) => net.links.filter((l) => l.b === spine).map((l) => l.a);
  assert.deepEqual(aggsOf('S1'), ['A1', 'A3', 'A5', 'A7']);
  assert.deepEqual(aggsOf('S4'), ['A2', 'A4', 'A6', 'A8']);
});

test('ToRs in the same block have one equal-cost path per aggregation switch (derived from Jupiter §3.1)', () => {
  assert.deepEqual(
    equalCostPaths(clos(), 'T1', 'T2').paths.map((p) => p.nodes),
    [['T1', 'A1', 'T2'], ['T1', 'A2', 'T2']],
  );
});

test('every healthy cross-block path has a ToR-to-ToR path length of 4 and uses a different spine (Jupiter §5.2)', () => {
  const { paths } = equalCostPaths(clos(), 'T1', 'T7');
  for (const p of paths) assert.equal(p.nodes.length - 1, 4);
  assert.deepEqual(paths.map((p) => p.nodes[2]).sort(), ['S1', 'S2', 'S3', 'S4']);
});

test('each surviving path gets its share from an even split at every switch, not an even split across paths (Jupiter §5.2)', () => {
  const healthy = equalCostPaths(clos(), 'T1', 'T7').paths;
  assert.deepEqual(healthy.map((p) => p.share), [0.25, 0.25, 0.25, 0.25]);
  const failed = equalCostPaths(clos(), 'T1', 'T7', ['S1']).paths;
  assert.deepEqual(failed.map((p) => p.nodes), [
    ['T1', 'A1', 'S2', 'A7', 'T7'],
    ['T1', 'A2', 'S3', 'A8', 'T7'],
    ['T1', 'A2', 'S4', 'A8', 'T7'],
  ]);
  assert.deepEqual(failed.map((p) => p.share), [0.5, 0.25, 0.25]);
});

test('a failed link two steps from the sender still moves its traffic, because link state reaches every switch (Jupiter §5.2)', () => {
  const { paths } = equalCostPaths(clos(), 'T1', 'T7', ['A7-S1']);
  assert.deepEqual(paths.map((p) => p.nodes.slice(1, 3)), [['A1', 'S2'], ['A2', 'S3'], ['A2', 'S4']]);
  assert.deepEqual(paths.map((p) => p.share), [0.5, 0.25, 0.25]);
});

test('a ToR that loses both uplinks has no path left, and failing a ToR uplink leaves two spines reachable (illustration, ticket 05)', () => {
  assert.equal(equalCostPaths(clos(), 'T1', 'T7', ['T1-A1', 'T1-A2']).paths.length, 0);
  const { paths } = equalCostPaths(clos(), 'T1', 'T7', ['T1-A1']);
  assert.deepEqual(paths.map((p) => p.nodes[2]), ['S3', 'S4']);
  assert.deepEqual(paths.map((p) => p.share), [0.5, 0.5]);
});
