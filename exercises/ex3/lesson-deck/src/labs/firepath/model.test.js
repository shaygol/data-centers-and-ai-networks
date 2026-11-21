import { test } from 'node:test';
import assert from 'node:assert/strict';
import { steadyState, linkFailureSteps, masterFailoverSteps, stateForNewFailure, trafficLost, pastThePause, linkBetween } from './model.js';

const FAILED = 'T2-S3';
const last = (steps) => steps[steps.length - 1];

test('after an update, every switch link-state version matches the master (Jupiter §5.2)', () => {
  const after = last(linkFailureSteps(steadyState(), FAILED)).state;
  assert.equal(after.master.version, 2);
  assert.equal(Object.keys(after.clients).length, 7);
  for (const [id, client] of Object.entries(after.clients)) {
    assert.equal(client.version, 2, id);
  }
});

test('forwarding tables no longer use the failed link once the update is applied (Jupiter §5.2)', () => {
  const start = steadyState();
  assert.deepEqual(start.clients.T1.tables.T2, ['S1', 'S2', 'S3'], 'ECMP over all three spines before');
  assert.deepEqual(start.clients.T2.tables.T1, ['S1', 'S2', 'S3']);
  assert.deepEqual(start.clients.S3.tables.T2, ['T2']);

  const after = last(linkFailureSteps(start, FAILED)).state;
  for (const dest of ['T1', 'T3', 'T4']) assert.deepEqual(after.clients.T2.tables[dest], ['S1', 'S2'], `T2 toward ${dest}`);
  assert.deepEqual(after.clients.T1.tables.T2, ['S1', 'S2'], 'other ToRs stop routing through S3 toward T2');
  assert.deepEqual(after.clients.S3.tables.T2, ['T1', 'T3', 'T4'], 'S3 now reaches T2 through another ToR');
  assert.deepEqual(after.clients.T1.tables.T3, ['S1', 'S2', 'S3'], 'other destinations keep all three spines');
});

test('the sequence: switch reports, master redistributes, each switch computes (Jupiter §5.2)', () => {
  const steps = linkFailureSteps(steadyState(), FAILED);
  assert.deepEqual(
    steps.map((s) => [s.id, s.actor]),
    [
      ['steady', 'none'],
      ['link-fails', 'fabric'],
      ['report', 'switch'],
      ['master-builds', 'master'],
      ['multicast', 'master'],
      ['some-compute', 'switch'],
      ['all-compute', 'switch'],
    ],
  );
  const step = (id) => steps.find((s) => s.id === id);
  assert.deepEqual(step('report').reporters, ['T2', 'S3'], 'both ends of the link see the interface go down');
  assert.equal(step('report').plane, 'cpn', 'reports travel over the CPN');
  assert.equal(step('multicast').plane, 'cpn', 'the update travels over the CPN');
  assert.equal(step('link-fails').plane, 'fabric');
});

test('the master moves first; a client takes the new version only when it computes (Jupiter §5.2)', () => {
  const steps = linkFailureSteps(steadyState(), FAILED);
  const step = (id) => steps.find((s) => s.id === id);
  const versions = (s) => Object.values(s.state.clients).map((c) => c.version);

  assert.equal(step('report').state.master.version, 1);
  assert.equal(step('master-builds').state.master.version, 2);
  assert.ok(versions(step('multicast')).every((v) => v === 1), 'clients are still on v1 while the update is on its way');

  const mixed = step('some-compute').state.clients;
  assert.ok(versions(step('some-compute')).includes(1), 'some clients have not moved');
  assert.ok(versions(step('some-compute')).includes(2), 'some clients have moved');
  assert.equal(mixed.T1.version, 2);
  assert.deepEqual(mixed.T1.tables.T2, ['S1', 'S2'], 'a client that moved has new tables');
  assert.equal(mixed.T4.version, 1);
  assert.deepEqual(mixed.T4.tables.T2, ['S1', 'S2', 'S3'], 'a client that has not moved keeps its old tables');
});

test('the first update is full, and later ones hold only the diff with a higher version (Jupiter §5.2)', () => {
  const start = steadyState();
  assert.deepEqual(start.master.log, [{ version: 1, kind: 'full', links: 12 }]);

  const first = last(linkFailureSteps(start, FAILED)).state;
  assert.deepEqual(first.master.log.at(-1), {
    version: 2,
    kind: 'diff',
    changes: [{ link: FAILED, from: 'up', to: 'down' }],
  });

  const second = last(linkFailureSteps(first, 'T4-S1')).state;
  assert.equal(second.master.version, 3);
  assert.deepEqual(second.master.log.at(-1).changes, [{ link: 'T4-S1', from: 'up', to: 'down' }], 'not the earlier failure');
  assert.deepEqual(second.master.log.map((e) => e.version), [1, 2, 3]);
  assert.deepEqual(second.master.down, [FAILED, 'T4-S1'], 'the database itself holds both');
  assert.deepEqual(second.clients.T2.tables.T4, ['S2'], 'S1 lost T4 and S3 lost T2, so only S2 is left');
});

const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: ${actual}, expected ${expected}`);

test('transient loss while switches move to the new state, then none (Jupiter §5.2; shares derived on this fabric)', () => {
  const steps = linkFailureSteps(steadyState(), FAILED);
  const lost = (id) => trafficLost(steps.find((s) => s.id === id).state);
  close(lost('steady'), 0, 'healthy fabric');
  // 12 ordered ToR pairs. T1, T3, T4 to T2 and T2 to T1, T3, T4 each send a third of their traffic into the dead link.
  close(lost('link-fails'), (6 * (1 / 3)) / 12, 'link down, tables stale');
  close(lost('multicast'), (6 * (1 / 3)) / 12, 'update on its way');
  // T1 and T3 have moved. T4 to T2 and T2 to T1, T3, T4 still lose a third.
  close(lost('some-compute'), (4 * (1 / 3)) / 12, 'some switches moved');
  close(lost('all-compute'), 0, 'all switches moved');
});

test('a ToR cut off from every spine cannot be reached, even after the update (derived on this fabric, ticket 06)', () => {
  let state = steadyState();
  for (const link of ['T1-S1', 'T1-S2', 'T1-S3']) state = last(linkFailureSteps(state, link)).state;
  assert.deepEqual(state.clients.T2.tables.T1, []);
  assert.deepEqual(state.clients.T1.tables.T2, []);
  close(trafficLost(state), 6 / 12, 'six of twelve ordered pairs involve T1');
});

test('redundant masters run on spines, with the master on S1 active and S2 as backup (Jupiter §5.2)', () => {
  const { master } = steadyState();
  assert.equal(master.active, 'S1');
  assert.equal(master.backup, 'S2');
});

test('master failover: the backup takes over and the next update carries a higher version (Jupiter §5.2)', () => {
  const steps = masterFailoverSteps(steadyState(), 'T3-S2');
  assert.deepEqual(steps.map((s) => s.id), [
    'steady',
    'master-stops',
    'election',
    'clients-follow',
    'link-fails',
    'report',
    'master-builds',
    'multicast',
    'some-compute',
    'all-compute',
  ]);
  const step = (id) => steps.find((s) => s.id === id);

  assert.equal(step('master-stops').state.master.active, null);
  assert.equal(step('election').state.master.active, 'S2', 'FMRP elects the backup');
  assert.equal(step('election').state.master.backup, null);
  assert.equal(step('election').plane, 'cpn', 'FMRP runs over the CPN');
  assert.equal(step('clients-follow').plane, 'cpn');

  const after = last(steps).state;
  assert.equal(after.master.active, 'S2');
  assert.equal(after.master.version, 2);
  assert.deepEqual(after.master.log.map((e) => e.kind), ['full', 'diff'], 'our assumption: the backup carries the database over');
  for (const [id, client] of Object.entries(after.clients)) assert.equal(client.version, 2, id);
});

test('with no active master, tables on the switches keep forwarding (derived from Jupiter §5.2)', () => {
  const start = steadyState();
  const stopped = masterFailoverSteps(start, 'T3-S2').find((s) => s.id === 'master-stops').state;
  assert.deepEqual(stopped.clients, start.clients);
  close(trafficLost(stopped), 0, 'nothing lost');
});

test('a failed link touching the master’s own spine still gets reported, because the CPN is separate (Jupiter §5.1)', () => {
  const steps = masterFailoverSteps(steadyState(), 'T3-S2');
  const report = steps.find((s) => s.id === 'report');
  assert.deepEqual(report.reporters, ['T3', 'S2']);
  assert.equal(report.state.master.active, 'S2');
  assert.equal(last(steps).state.clients.T1.tables.T3.includes('S2'), false, 'T1 stops using S2 toward T3');
});

test('the pause sits on the multicast step, step 5 of a link failure: only later steps are past it (Lesson plan, Lab 3 pause; Jupiter §5.2)', () => {
  const steps = linkFailureSteps(steadyState(), 'T2-S3');
  assert.equal(steps[4].id, 'multicast');
  assert.deepEqual(steps.map((_, at) => pastThePause(steps, at)), [false, false, false, false, false, true, true]);
});

test('linkBetween names a link the same way from either end (ticket 06, used by the tables and the loss model)', () => {
  assert.equal(linkBetween('T2', 'S3'), 'T2-S3');
  assert.equal(linkBetween('S3', 'T2'), 'T2-S3');
});

test('stepping back shows the earlier state: later steps do not change earlier snapshots (ticket 06)', () => {
  const start = steadyState();
  const before = JSON.stringify(start);
  const steps = linkFailureSteps(start, FAILED);
  last(linkFailureSteps(last(steps).state, 'T4-S1'));
  assert.equal(JSON.stringify(start), before);
  assert.equal(steps[0].state.master.version, 1);
  assert.deepEqual(steps[0].state.down, []);
});

test('failing a link from the steady step does not apply the failure the viewer has not seen yet (ticket 06)', () => {
  const steps = linkFailureSteps(steadyState(), FAILED);
  const state = stateForNewFailure(steps, 0);
  assert.deepEqual(state.down, []);
  assert.equal(state.master.version, 1);
});

test('failing a link mid-sequence finishes the update that is under way first (ticket 06)', () => {
  const steps = linkFailureSteps(steadyState(), FAILED);
  const state = stateForNewFailure(steps, 2);
  assert.deepEqual(state.down, [FAILED]);
  assert.equal(state.master.version, 2);
  assert.equal(state.clients.T4.version, 2);
});

test('failing a link during a takeover keeps the new master but not the failure still to come (ticket 06)', () => {
  const steps = masterFailoverSteps(steadyState(), 'T3-S2');
  const stopped = stateForNewFailure(steps, 1);
  assert.equal(stopped.master.active, 'S2');
  assert.deepEqual(stopped.down, []);
  assert.equal(stopped.master.version, 1);
  assert.equal(stateForNewFailure(steps, 0).master.active, 'S1', 'nothing has happened yet at the first step');
});

test('traffic looping between old and new tables ends instead of hanging the model (derived on this fabric, ticket 06)', () => {
  const mixed = linkFailureSteps(steadyState(), 'T1-S1').find((s) => s.id === 'some-compute').state;
  const lost = trafficLost(mixed);
  assert.ok(lost > 0 && lost < 1, `lost ${lost}`);
});
