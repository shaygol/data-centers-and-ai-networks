import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, BURST_RANGE, BUFFER_RANGE } from './model.js';
import lab from './view.js';

const steps = ({ min, max, step }) => {
  const values = [];
  for (let v = min; v <= max; v += step) values.push(v);
  return values;
};

// Every combination of the three switches.
const FIX_SETS = [0, 1, 2, 3, 4, 5, 6, 7].map((bits) => ({
  ecn: Boolean(bits & 1),
  boundedWindow: Boolean(bits & 2),
  dynamicSharing: Boolean(bits & 4),
}));

test('with no burst and load below capacity, there are no drops (Jupiter §6.1, ticket 12)', () => {
  for (const baseLoad of [0.1, 0.25, 0.5, 0.99]) {
    const run = simulate({ burst: 0, buffer: 10, baseLoad });
    assert.equal(run.dropped, 0, `base load ${baseLoad}`);
    assert.equal(run.peakQueue, 0, `base load ${baseLoad}`);
  }
});

test('a burst at 25% average utilization still drops: 43 packets by hand for the default burst (illustrates Jupiter §6.1)', () => {
  // 4 senders at line rate put 40 packets a tick on the port, plus 1 of background, against capacity 10.
  // Tick 10: 41 in, 10 out, queue 31, buffer 20, so 11 drop. Tick 11: 20 + 41 - 10 = 51, so 31 drop.
  // Tick 12: the last 10 burst packets plus 1: 20 + 11 - 10 = 21, so 1 drops.
  const run = simulate({ burst: 90, buffer: 20 });
  assert.equal(run.averageUtilization, 0.25);
  assert.equal(run.peakLoad, 4.1);
  assert.equal(run.peakQueue, 20);
  assert.equal(run.dropped, 43);
  assert.deepEqual(
    run.series.filter((t) => t.dropped > 0).map((t) => [t.tick, t.dropped]),
    [[10, 11], [11, 31], [12, 1]],
  );
  assert.equal(run.burstTicks, 3);
});

test('dynamic buffer sharing alone: the busy port borrows up to 3 shares, leaving 3 drops by hand (mechanism from Jupiter §6.1)', () => {
  // Limit 60. Tick 10: queue 31. Tick 11: 31 + 41 - 10 = 62, so 2 drop. Tick 12: 60 + 11 - 10 = 61, so 1 drops.
  const run = simulate({ burst: 90, buffer: 20, fixes: { dynamicSharing: true } });
  assert.equal(run.limit, 60);
  assert.equal(run.dropped, 3);
  assert.equal(run.burstTicks, 3);
});

test('a bounded congestion window alone: 3 packets a tick per sender, leaving 1 drop by hand (mechanism from Jupiter §6.1)', () => {
  // 4 senders at 3 = 12 a tick, plus 1, so the queue grows by 3 a tick for 7 ticks to 21, and 1 drops.
  // Tick 17 sends the last 6 packets: 90 = 7 x 12 + 6.
  const run = simulate({ burst: 90, buffer: 20, fixes: { boundedWindow: true } });
  assert.equal(run.dropped, 1);
  assert.equal(run.peakLoad, 1.3);
  assert.equal(run.burstTicks, 8);
});

test('ECN alone: senders halve after a marked tick, leaving 23 drops by hand (mechanism from Jupiter §6.1)', () => {
  // Marks start at a backlog of 10 and reach the senders a tick later.
  // Tick 10: window 10, 41 in, 11 drop. Tick 11: window 5, 21 in, 11 drop. Tick 12: window 2.5, 11 in, 1 drops.
  // Tick 13: window 1.25, 5 burst packets. The window then sits at its floor of 1 while the backlog clears:
  // 90 = 40 + 20 + 10 + 5 + 4 + 4 + 4 + 3, so the burst takes 8 ticks.
  const run = simulate({ burst: 90, buffer: 20, fixes: { ecn: true } });
  assert.equal(run.dropped, 23);
  assert.equal(run.burstTicks, 8);
});

test('all fixes on: the same burst and the same 25% average, with no drops and a 130% peak by hand (illustrates Jupiter §6.1)', () => {
  // Window 3: 13 in each tick from tick 10 until the queue reaches 12 at tick 13, which marks.
  // Then 7, 11, 6, 10, 13 in (windows 1.5, 2.5, 1.25, 2.25, 3). The last 12 packets go at tick 18.
  const run = simulate({ burst: 90, buffer: 20, fixes: { ecn: true, boundedWindow: true, dynamicSharing: true } });
  assert.equal(run.averageUtilization, 0.25);
  assert.equal(run.dropped, 0);
  assert.equal(run.peakLoad, 1.3);
  assert.equal(run.peakQueue, 12);
  assert.equal(run.burstTicks, 9);
});

test('the notes quote the model: 25%, 410% and 43 drops, then 130%, a queue of 12 and 9 ticks instead of 3 (illustrates Jupiter §6.1, ticket 12)', () => {
  const note = (id) => lab.experiments.find((e) => e.id === id).note;
  assert.match(note('burst-low-load'), /90-packet burst/);
  assert.match(note('burst-low-load'), /average is 25%.*reaches 410%/);
  assert.match(note('burst-low-load'), /20-packet buffer overflows and 43 packets drop/);
  assert.match(note('burst-fixes-on'), /falls to 130%, the queue peaks at 12 packets, and nothing drops/);
  assert.match(note('burst-fixes-on'), /9 ticks instead of 3/);
});

test('for a fixed burst, a larger buffer never increases drops, for every slider position and set of fixes (buffering from Jupiter §6.1; invariant from ticket 12)', () => {
  for (const fixes of FIX_SETS) {
    for (const burst of steps(BURST_RANGE)) {
      let previous = Infinity;
      for (let buffer = BUFFER_RANGE.min; buffer <= BUFFER_RANGE.max; buffer += 1) {
        const { dropped } = simulate({ burst, buffer, fixes });
        assert.ok(dropped <= previous, `burst ${burst}, buffer ${buffer}, ${JSON.stringify(fixes)}: ${dropped} > ${previous}`);
        previous = dropped;
      }
    }
  }
});

test('fixes change when packets arrive, not how many: the whole burst is sent inside the window at every slider position, so average utilization holds (the 25% from Jupiter §6.1; invariant from ticket 12)', () => {
  for (const fixes of FIX_SETS) {
    for (const burst of steps(BURST_RANGE)) {
      for (const buffer of steps(BUFFER_RANGE)) {
        const run = simulate({ burst, buffer, fixes });
        const where = `burst ${burst}, buffer ${buffer}, ${JSON.stringify(fixes)}`;
        assert.equal(run.unsent, 0, where);
        assert.equal(run.averageUtilization, simulate({ burst, buffer }).averageUtilization, where);
        const left = run.series.at(-1).queue;
        assert.equal(run.delivered + run.dropped + left, run.offered, where);
      }
    }
  }
});

test('switching on any one more fix never adds drops, at any slider position (fixes from Jupiter §6.1; invariant from ticket 12)', () => {
  for (const fixes of FIX_SETS) {
    for (const added of Object.keys(fixes).filter((name) => !fixes[name])) {
      for (const burst of steps(BURST_RANGE)) {
        for (const buffer of steps(BUFFER_RANGE)) {
          const before = simulate({ burst, buffer, fixes }).dropped;
          const after = simulate({ burst, buffer, fixes: { ...fixes, [added]: true } }).dropped;
          assert.ok(after <= before, `burst ${burst}, buffer ${buffer}, ${JSON.stringify(fixes)} + ${added}: ${after} > ${before}`);
        }
      }
    }
  }
});
