import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from './clock.js';

function fakeTimers() {
  let time = 0;
  let nextId = 1;
  const tasks = new Map();
  const advance = (ms) => {
    const target = time + ms;
    while (true) {
      let earliest = null;
      for (const [id, task] of tasks) {
        if (task.at <= target && (!earliest || task.at < earliest.at)) earliest = { id, ...task };
      }
      if (!earliest) break;
      time = earliest.at;
      tasks.delete(earliest.id);
      earliest.fn();
    }
    time = target;
  };
  const clock = createClock({
    now: () => time,
    set: (fn, ms) => {
      const id = nextId++;
      tasks.set(id, { at: time + ms, fn });
      return id;
    },
    clear: (id) => tasks.delete(id),
  });
  return { clock, advance, scheduled: () => tasks.size };
}

test('pausing mid-countdown freezes the remaining delay and resumes without restarting', () => {
  const { clock, advance, scheduled } = fakeTimers();
  let firedAt = null;
  clock.resume();
  clock.later(1000, () => { firedAt = 1000; });
  assert.equal(clock.pending, 1);

  advance(400);
  clock.pause();
  assert.equal(clock.running, false);
  assert.equal(scheduled(), 0);
  assert.equal(clock.pending, 1);

  advance(5000);
  assert.equal(firedAt, null);

  clock.resume();
  assert.equal(clock.running, true);
  assert.equal(scheduled(), 1);

  advance(599);
  assert.equal(firedAt, null);
  advance(1);
  assert.equal(firedAt, 1000);
  assert.equal(clock.pending, 0);
});

test('multiple pause and resume cycles accumulate elapsed time without drift or double-firing', () => {
  const { clock, advance } = fakeTimers();
  let count = 0;
  clock.resume();
  clock.later(1000, () => { count += 1; });

  advance(250);
  clock.pause();
  advance(1000);

  clock.resume();
  advance(350);
  clock.pause();
  advance(2000);

  clock.resume();
  advance(399);
  assert.equal(count, 0);
  advance(1);
  assert.equal(count, 1);

  advance(5000);
  assert.equal(count, 1);
  assert.equal(clock.pending, 0);
});

test('timers queued while paused do not run until resume', () => {
  const { clock, advance, scheduled } = fakeTimers();
  let ran = false;
  clock.later(300, () => { ran = true; });
  assert.equal(clock.running, false);
  assert.equal(clock.pending, 1);
  assert.equal(scheduled(), 0);

  advance(2000);
  assert.equal(ran, false);

  clock.resume();
  advance(299);
  assert.equal(ran, false);
  advance(1);
  assert.equal(ran, true);
  assert.equal(clock.pending, 0);
});

test('clear cancels all pending timers and empties the queue', () => {
  const { clock, advance, scheduled } = fakeTimers();
  let count = 0;
  clock.resume();
  clock.later(100, () => { count++; });
  clock.later(200, () => { count++; });
  assert.equal(clock.pending, 2);
  assert.equal(scheduled(), 2);

  clock.clear();
  assert.equal(clock.pending, 0);
  assert.equal(scheduled(), 0);

  advance(1000);
  assert.equal(count, 0);
});
