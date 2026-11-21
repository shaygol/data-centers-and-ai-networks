import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWalk } from './model.js';

const stops = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

test('a walk starts at the first stop and stays inside its ends (Spec, Key passages)', () => {
  const walk = createWalk(stops);
  assert.equal(walk.current().id, 'a');
  assert.ok(walk.atStart());
  walk.previous();
  assert.equal(walk.current().id, 'a');
  walk.next();
  walk.next();
  walk.next();
  assert.equal(walk.current().id, 'c');
  assert.ok(walk.atEnd());
});

test('a jump back from a lab returns to its stop, and an unknown stop changes nothing (Spec, user story 53)', () => {
  const walk = createWalk(stops);
  assert.ok(walk.goTo('b'));
  assert.ok(!walk.goTo('nope'));
  assert.equal(walk.current().id, 'b');
});
