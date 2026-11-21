import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, formatRoute } from './route.js';

const known = (tab) => ['cut', 'walkthrough'].includes(tab);

test('a bare tab token opens that tab (ticket 03)', () => {
  assert.deepEqual(parseRoute('#cut', known), { tab: 'cut', arg: null, back: null });
});

test('a tab and experiment token opens the experiment (ticket 03)', () => {
  assert.deepEqual(parseRoute('#cut~t1-t3', known), { tab: 'cut', arg: 't1-t3', back: null });
});

test('a jump carries the way back, including the card to return to (ticket 03)', () => {
  assert.deepEqual(parseRoute('#cut~t1-t3~from~walkthrough~expanders', known), {
    tab: 'cut',
    arg: 't1-t3',
    back: { tab: 'walkthrough', arg: 'expanders' },
  });
});

test('a jump back to a tab with no card has a null arg (ticket 03)', () => {
  assert.deepEqual(parseRoute('#cut~from~walkthrough', known), {
    tab: 'cut',
    arg: null,
    back: { tab: 'walkthrough', arg: null },
  });
});

test('an empty or unknown hash gives no route (ticket 03)', () => {
  assert.equal(parseRoute('', known), null);
  assert.equal(parseRoute('#', known), null);
  assert.equal(parseRoute('#comment-12', known), null);
});

test('an unknown back tab is dropped rather than offered as a dead link (ticket 03)', () => {
  assert.deepEqual(parseRoute('#cut~t1-t3~from~nowhere', known), { tab: 'cut', arg: 't1-t3', back: null });
});

test('a token with illegal characters is ignored, so an odd link still opens the tab (ticket 03)', () => {
  assert.deepEqual(parseRoute('#cut~two%20words', known), { tab: 'cut', arg: null, back: null });
  assert.deepEqual(parseRoute('#cut~~from~walkthrough~x%y', known), {
    tab: 'cut',
    arg: null,
    back: { tab: 'walkthrough', arg: null },
  });
});

test('formatting produces the bare token that parsing reads (ticket 03)', () => {
  assert.equal(formatRoute({ tab: 'cut' }), '#cut');
  assert.equal(formatRoute({ tab: 'cut', arg: 't1-t3' }), '#cut~t1-t3');
  assert.equal(
    formatRoute({ tab: 'cut', arg: 't1-t3', back: { tab: 'walkthrough', arg: 'expanders' } }),
    '#cut~t1-t3~from~walkthrough~expanders',
  );
  assert.equal(formatRoute({ tab: 'cut', back: { tab: 'walkthrough' } }), '#cut~from~walkthrough');
});

test('formatting refuses characters the platform does not allow in a hash token (ticket 03)', () => {
  assert.throws(() => formatRoute({ tab: 'cut', arg: 'two words' }));
});
