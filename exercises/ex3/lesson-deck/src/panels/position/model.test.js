import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPTIONS, parseCount, normalizeSplit, summarize } from './model.js';

test('the three options follow the homework\'s Part 2 (Spec, Homework)', () => {
  assert.deepEqual(OPTIONS.map((o) => [o.letter, o.name]), [
    ['A', 'Fully distributed'], ['B', 'Google’s split'], ['C', 'Fully centralized'],
  ]);
});

test('only whole, non-negative counts are accepted', () => {
  assert.equal(parseCount(' 7 '), 7);
  assert.equal(parseCount('0'), 0);
  for (const bad of ['', '-1', '2.5', 'x']) assert.equal(parseCount(bad), null, bad);
});

test('a stored split keeps only valid counts', () => {
  assert.deepEqual(normalizeSplit({ a: 3, b: -1, c: 'x' }), { a: 3, b: null, c: null });
  assert.deepEqual(normalizeSplit(null), { a: null, b: null, c: null });
});

test('the summary gives counts, shares and the options nobody chose', () => {
  const s = summarize({ a: 3, b: 9, c: 0 });
  assert.equal(s.total, 12);
  assert.deepEqual(s.rows.map((r) => [r.id, r.count, r.percent]), [['a', 3, 25], ['b', 9, 75], ['c', 0, 0]]);
  assert.deepEqual(s.nobodyChose, ['c']);
});

test('an empty split shows nothing as chosen or unchosen', () => {
  const s = summarize({ a: null, b: null, c: null });
  assert.equal(s.empty, true);
  assert.deepEqual(s.nobodyChose, []);
});
