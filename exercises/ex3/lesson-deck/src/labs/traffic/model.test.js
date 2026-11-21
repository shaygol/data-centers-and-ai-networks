import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAFFIC, CAPACITY, CAPACITY_BASE, capacityIndex, extrapolate, impliedDoublingMonths, capacityGrowth, times, tbpsText, NOW,
} from './model.js';

test('Figure 1 runs from 1x in Jul 2008 to 50x in Nov 2014 (Jupiter Fig. 1, §2)', () => {
  assert.deepEqual(TRAFFIC.map((p) => [p.label, p.value]), [['Jul 2008', 1], ['Nov 2014', 50]]);
});

test('Figure 1’s ends imply a doubling time inside the paper’s 12–15 months (Jupiter abstract, §2)', () => {
  const months = impliedDoublingMonths(TRAFFIC[0], TRAFFIC[1]);
  assert.ok(months > 12 && months < 15, String(months));
  assert.equal(Math.round(months * 10) / 10, 13.5);
});

test('capacity up to 2012 is Table 2’s bisection column (Jupiter Table 2)', () => {
  const paper = CAPACITY.filter((c) => !c.after).map((c) => [c.label, c.t, c.tbps]);
  assert.deepEqual(paper, [
    ['Firehose 1.0', 2005, 10], ['Firehose 1.1', 2006, 10], ['Watchtower', 2008, 82], ['Saturn', 2009, 207], ['Jupiter', 2012, 1300],
  ]);
});

test('capacity after the paper: over 6 Pb/s (2022) and 64 × 204.8 Tb/s (Google Cloud blog, Aug 2022 and Oct 2024)', () => {
  const after = CAPACITY.filter((c) => c.after);
  assert.deepEqual(after.map((c) => [c.t, c.tbps]), [[2022, 6000], [2023, 13100]]);
  assert.equal(Math.round(64 * 204.8), 13107);
  assert.ok(after.every((c) => c.source.startsWith('Google Cloud blog')));
});

test('capacity is indexed to Watchtower 2008, the start of Figure 1', () => {
  assert.equal(CAPACITY_BASE.t, 2008);
  assert.equal(capacityIndex(CAPACITY_BASE), 1);
  assert.equal(Math.round(capacityIndex(CAPACITY.at(-1))), 160);
});

test('the what-if band starts at 50x and grows 2x per doubling time (derived)', () => {
  assert.equal(extrapolate(12, TRAFFIC[1].t), 50);
  assert.equal(Math.round(extrapolate(12, TRAFFIC[1].t + 1)), 100);
  assert.equal(Math.round(extrapolate(12, NOW)), 204800);
  assert.equal(Math.round(extrapolate(15, NOW)), 38802);
});

test('one fabric grew about 10x from Jupiter 2012 to 2023 (Table 2 vs. Google Cloud blog)', () => {
  assert.equal(Math.round(capacityGrowth(CAPACITY[4], CAPACITY[6])), 10);
});

test('numbers read as the class will say them', () => {
  assert.equal(times(204800), '200,000x');
  assert.equal(times(38802), '39,000x');
  assert.equal(times(50), '50x');
  assert.equal(times(1.3), '1.3x');
  assert.equal(times(0.12), '0.12x');
  assert.equal(tbpsText(13100), '13.1 Pb/s');
  assert.equal(tbpsText(82), '82 Tb/s');
});
