import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GENERATIONS, generation, tableRow, derivedBisection, parseBandwidth, growth,
  tiers, bisectionScale, changedFields,
} from './model.js';

const tier = (genId, kind) => tiers(generation(genId)).find((t) => t.kind === kind);

test('blocking and non-blocking stages follow the B and NB marks in Table 2 (Jupiter Table 2)', () => {
  const marks = Object.fromEntries(
    GENERATIONS.filter((g) => g.id !== 'legacy').map((g) => [g.id, [tier(g.id, 'agg').stage, tier(g.id, 'spine').stage]]),
  );
  assert.deepEqual(marks, {
    'firehose-1.0': ['blocking', 'nonblocking'],
    'firehose-1.1': ['blocking', 'nonblocking'],
    watchtower: ['nonblocking', 'nonblocking'],
    saturn: ['nonblocking', 'nonblocking'],
    jupiter: ['blocking', 'nonblocking'],
  });
});

test('Table 2 puts no B or NB mark on a ToR (Jupiter Table 2)', () => {
  for (const g of GENERATIONS) assert.equal(tier(g.id, 'tor').stage, 'unmarked', g.id);
});

test('the legacy network has no aggregation or spine block (Jupiter Table 2)', () => {
  assert.deepEqual(tiers(generation('legacy')).map((t) => t.kind), ['routers', 'tor']);
});

test('every other generation has spine block, aggregation block and ToR, top down (Jupiter Fig. 2)', () => {
  for (const g of GENERATIONS.filter((x) => x.id !== 'legacy')) {
    assert.deepEqual(tiers(g).map((t) => t.kind), ['spine', 'agg', 'tor'], g.id);
  }
});

const drawn = (t) => t.groups.map((group) => group.map((r) => r.count));

test('Firehose 1.0 boards match Fig. 3: spine 4 over 8, aggregation two groups of 4 over 4, 16 ToRs (Jupiter Fig. 3, §3.1)', () => {
  assert.deepEqual(drawn(tier('firehose-1.0', 'spine')), [[4, 8]]);
  assert.deepEqual(drawn(tier('firehose-1.0', 'agg')), [[4, 4], [4, 4]]);
  assert.deepEqual(drawn(tier('firehose-1.0', 'tor')), [[16]]);
});

test('Firehose 1.1 aggregation block matches Fig. 4: one group of 8 over 8, with 8 buddied ToR pairs (Jupiter Fig. 4)', () => {
  assert.deepEqual(drawn(tier('firehose-1.1', 'agg')), [[8, 8]]);
  const tor = tier('firehose-1.1', 'tor');
  assert.equal(tor.groups.length, 8);
  assert.deepEqual(drawn(tor)[0], [2]);
});

test('Jupiter matches Fig. 8: 6 Centauris per spine block, 8 Middle Blocks per aggregation block (Jupiter §3.3, Fig. 8)', () => {
  assert.deepEqual(drawn(tier('jupiter', 'spine')), [[6]]);
  assert.deepEqual(drawn(tier('jupiter', 'agg')), [[8]]);
  assert.equal(tier('jupiter', 'spine').count, '256 blocks');
  assert.equal(tier('jupiter', 'agg').count, '64 blocks at most');
  assert.equal(tier('jupiter', 'tor').count, '32 per aggregation block');
});

test('Watchtower and Saturn chassis match the text: 8 and 12 linecards (Jupiter §3.2)', () => {
  assert.deepEqual(drawn(tier('watchtower', 'spine')), [[8]]);
  assert.deepEqual(drawn(tier('saturn', 'spine')), [[12]]);
  assert.deepEqual(drawn(tier('watchtower', 'agg')), [[4]]);
  assert.deepEqual(drawn(tier('saturn', 'agg')), [[4]]);
});

test('link speeds rise from 1G to 40G at the top of the fabric (Jupiter Table 2)', () => {
  assert.equal(tier('legacy', 'routers').linkBelow.speedGbps, 1);
  assert.equal(tier('firehose-1.0', 'spine').linkBelow.speedGbps, 10);
  assert.equal(tier('jupiter', 'spine').linkBelow.speedGbps, 40);
  assert.equal(tier('jupiter', 'agg').linkBelow.speedGbps, 10);
});

test('tiers the paper does not fully specify are flagged illustrative, and only those (Jupiter §1–§3.3)', () => {
  const flagged = GENERATIONS.flatMap((g) =>
    tiers(g).filter((t) => t.illustrative).map((t) => `${g.id}/${t.kind}`),
  );
  assert.deepEqual(flagged, [
    'legacy/routers',
    'firehose-1.1/spine',
    'watchtower/spine', 'watchtower/agg', 'watchtower/tor',
    'saturn/spine', 'saturn/agg', 'saturn/tor',
  ]);
});

test('every tier and fact cites a section, figure or table of the paper (Spec, evidence rule)', () => {
  const cites = /§|Fig\.|Table/;
  for (const g of GENERATIONS) {
    for (const t of tiers(g)) assert.match(t.source, cites, `${g.id}/${t.kind}`);
    assert.ok(g.facts.length > 0, g.id);
    for (const f of g.facts) assert.match(f.source, cites, f.text);
  }
});

test('the bisection scale is logarithmic and the two Firehoses share a point (Jupiter Table 2)', () => {
  const { points, ticks } = bisectionScale();
  assert.deepEqual(points.map((p) => p.label), ['2T', '10T', '82T', '207T', '1.3P']);
  assert.deepEqual(points[1].ids, ['firehose-1.0', 'firehose-1.1']);
  assert.deepEqual(ticks.map((t) => t.label), ['1T', '10T', '100T', '1P']);
  const gaps = ticks.slice(1).map((t, i) => t.position - ticks[i].position);
  assert.ok(Math.abs(gaps[0] - gaps[1]) < 1e-9 && Math.abs(gaps[1] - gaps[2]) < 1e-9);
  assert.equal(ticks[0].position, 0);
  assert.ok(points.at(-1).position <= 1);
});

// Typed from the PDF's Table 2 (page 90), not generated from the model.
const TABLE_2 = {
  legacy: {
    name: 'Legacy network', firstDeployed: '2004', merchantSilicon: 'Vendor', torConfig: '48x1G',
    aggConfig: '–', spineConfig: '–', fabricSpeed: '10G', hostSpeed: '1G', bisection: '2T',
  },
  'firehose-1.0': {
    name: 'Firehose 1.0', firstDeployed: '2005', merchantSilicon: '8x10G 4x10G (ToR)', torConfig: '2x10G up 24x1G down',
    aggConfig: '2x32x10G (B)', spineConfig: '32x10G (NB)', fabricSpeed: '10G', hostSpeed: '1G', bisection: '10T',
  },
  'firehose-1.1': {
    name: 'Firehose 1.1', firstDeployed: '2006', merchantSilicon: '8x10G', torConfig: '4x10G up 48x1G down',
    aggConfig: '64x10G (B)', spineConfig: '32x10G (NB)', fabricSpeed: '10G', hostSpeed: '1G', bisection: '10T',
  },
  watchtower: {
    name: 'Watchtower', firstDeployed: '2008', merchantSilicon: '16x10G', torConfig: '4x10G up 48x1G down',
    aggConfig: '4x128x10G (NB)', spineConfig: '128x10G (NB)', fabricSpeed: '10G', hostSpeed: 'nx1G', bisection: '82T',
  },
  saturn: {
    name: 'Saturn', firstDeployed: '2009', merchantSilicon: '24x10G', torConfig: '24x10G',
    aggConfig: '4x288x10G (NB)', spineConfig: '288x10G (NB)', fabricSpeed: '10G', hostSpeed: 'nx10G', bisection: '207T',
  },
  jupiter: {
    name: 'Jupiter', firstDeployed: '2012', merchantSilicon: '16x40G', torConfig: '16x40G',
    aggConfig: '8x128x40G (B)', spineConfig: '128x40G (NB)', fabricSpeed: '10/40G', hostSpeed: 'nx10G/nx40G', bisection: '1.3P',
  },
};

test('there are six generations, in Table 2 order (Jupiter Table 2)', () => {
  assert.deepEqual(GENERATIONS.map((g) => g.id), Object.keys(TABLE_2));
});

for (const [id, row] of Object.entries(TABLE_2)) {
  test(`${row.name}: every value the lab shows matches Table 2 exactly (Jupiter Table 2)`, () => {
    assert.deepEqual(tableRow(generation(id)), row);
  });
}

test('Jupiter: 64 x 512 x 40G gives about 1.3P (Jupiter §3.3, Table 2)', () => {
  const math = derivedBisection(generation('jupiter'));
  assert.equal(math.expression, '64 × 512 × 40G');
  assert.equal(math.bitsPerSecond, 1.31072e15);
  assert.equal(math.label, '1.31P');
});

test('Firehose 1.0: 32 x 32 x 10G gives about 10T (Jupiter §3.1, Table 2)', () => {
  const math = derivedBisection(generation('firehose-1.0'));
  assert.equal(math.expression, '32 × 32 × 10G');
  assert.equal(math.label, '10.24T');
});

test('Legacy: 20k servers at 100 Mb/s gives 2T (Jupiter §2, Table 2)', () => {
  const math = derivedBisection(generation('legacy'));
  assert.equal(math.expression, '20k × 100 Mb/s');
  assert.equal(math.label, '2T');
});

test('no multiplication is offered where the paper gives no block count (Jupiter §3.1, §3.2)', () => {
  for (const id of ['firehose-1.1', 'watchtower', 'saturn']) {
    assert.equal(derivedBisection(generation(id)), null, id);
  }
});

test('Table 2 bisection values read as numbers (Jupiter Table 2)', () => {
  assert.equal(parseBandwidth('2T'), 2e12);
  assert.equal(parseBandwidth('207T'), 207e12);
  assert.equal(parseBandwidth('1.3P'), 1.3e15);
});

test('Saturn to Jupiter is the "more than 6x" step (Jupiter §3.3)', () => {
  const step = growth(generation('saturn'), generation('jupiter'));
  assert.ok(step.factor > 6 && step.factor < 7, String(step.factor));
  assert.equal(step.label, '6.3×');
  assert.equal(step.years, 3);
});

test('growth reads earlier to later whichever way it is asked (Jupiter Table 2)', () => {
  const forward = growth(generation('legacy'), generation('jupiter'));
  const backward = growth(generation('jupiter'), generation('legacy'));
  assert.equal(forward.label, '650×');
  assert.equal(forward.years, 8);
  assert.deepEqual(backward, forward);
});

test('the two Firehose generations show no bisection growth (Jupiter Table 2)', () => {
  assert.equal(growth(generation('firehose-1.0'), generation('firehose-1.1')).label, '1×');
});

test('Firehose 1.0 to 1.1 changes the ToR but not the bisection BW (Jupiter Table 2)', () => {
  const changes = changedFields(generation('firehose-1.0'), generation('firehose-1.1'));
  assert.ok(changes.some((c) => c.label === 'ToR' && c.from === '2x10G up 24x1G down' && c.to === '4x10G up 48x1G down'));
  assert.ok(!changes.some((c) => c.label === 'Bisection BW'));
});

test('Saturn to Jupiter lists the move to 16x40G and 1.3P (Jupiter Table 2)', () => {
  const changes = changedFields(generation('saturn'), generation('jupiter'));
  assert.ok(changes.some((c) => c.label === 'Merchant silicon' && c.to === '16x40G'));
  assert.ok(changes.some((c) => c.label === 'Bisection BW' && c.from === '207T' && c.to === '1.3P'));
});
