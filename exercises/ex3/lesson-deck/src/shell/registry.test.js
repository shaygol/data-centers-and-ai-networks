import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LABS, PANELS, TAB_GROUPS, visibleTabs, HOME } from './registry.js';

const RESERVED = ['settings', 'sidebar', 'customize', 'upgrade', 'downloads'];

test('the Jupiter labs from the spec are registered (Spec, Interactive artifact)', () => {
  assert.deepEqual(LABS.map((l) => [l.number, l.id]), [[1, 'generations'], [2, 'clos'], [3, 'firepath'], [4, 'congestion']]);
  assert.ok(LABS.every((l) => l.paper === 'Jupiter'));
});

test('the page opens on the opening panel, and the tabs follow the spec (Spec, Interactive artifact)', () => {
  assert.equal(HOME, 'start');
  assert.deepEqual(PANELS.map((p) => p.id), ['start', 'passages', 'position']);
  assert.deepEqual(TAB_GROUPS.map((g) => [g.label, g.tabs]), [
    ['Start', ['start']],
    ['Passages', ['passages']],
    ['Labs', ['generations', 'clos', 'firepath', 'congestion']],
    ['Class', ['position']],
  ]);
});

test('every visible tab sits in exactly one group (Spec, Interactive artifact)', () => {
  const grouped = TAB_GROUPS.flatMap((g) => g.tabs).sort();
  assert.deepEqual(grouped, visibleTabs([...LABS, ...PANELS]).map((t) => t.id).sort());
});

test('every tab id is a legal hash token the platform leaves alone (ticket 03)', () => {
  for (const { id } of [...LABS, ...PANELS]) {
    assert.match(id, /^[A-Za-z0-9._-]+$/);
    assert.ok(!RESERVED.includes(id) && !id.startsWith('comment-'), id);
  }
});

test('every lab declares what its frame shows, and experiment ids are unique legal tokens (ticket 03)', () => {
  for (const lab of LABS) {
    assert.ok(lab.title && lab.short && lab.source && lab.paper, lab.id);
    assert.equal(typeof lab.hidden, 'boolean', lab.id);
    assert.equal(typeof lab.mount, 'function', lab.id);
    const ids = lab.experiments.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length, lab.id);
    for (const e of lab.experiments) {
      assert.match(e.id, /^[A-Za-z0-9._-]+$/);
      assert.notEqual(e.id, 'from');
      assert.ok(e.label && e.note, `${lab.id}/${e.id}`);
    }
    if (!lab.stub) {
      assert.ok(lab.idea || lab.idea === null, `${lab.id} has a key idea (or opts out with null)`);
      assert.ok(lab.experiments.length > 0, `${lab.id} has guided experiments`);
    }
  }
});

test('a lab with hidden: true drops out of the visible tabs (ticket 03)', () => {
  const tabs = [{ id: 'a', hidden: false }, { id: 'b', hidden: true }, { id: 'c' }];
  assert.deepEqual(visibleTabs(tabs).map((t) => t.id), ['a', 'c']);
});
