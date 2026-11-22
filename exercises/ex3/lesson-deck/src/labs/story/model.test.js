import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, comparison, previous, diffCell, growthSeries } from './model.js';
import { GENERATIONS } from '../generations/model.js';

test('one chapter per Table 2 generation, in order', () => {
  assert.deepEqual(CHAPTERS.map((c) => c.id), GENERATIONS.map((g) => g.id));
});

test('every chapter has a debate, a reply, challenges and a quote with exact marks', () => {
  for (const c of CHAPTERS) {
    assert.ok(c.debate && c.debateReply, c.id);
    assert.ok(c.challenges.length > 0 || c.id === 'legacy', c.id);
    for (const m of c.quote.marks) assert.ok(c.quote.text.includes(m), `${c.id}: ${m}`);
    if (previous(c)) assert.ok(c.improved?.length > 0, `${c.id} says what improved`);
  }
});

test('the comparison holds only this generation and the one before', () => {
  const fh10 = comparison(CHAPTERS[1]);
  assert.deepEqual(fh10.head, ['Legacy network', 'Firehose 1.0']);
  const bisection = fh10.rows.find((r) => r.label === 'Bisection BW');
  assert.deepEqual([bisection.before, bisection.now, bisection.changed], ['2T', '10T', true]);
  const legacy = comparison(CHAPTERS[0]);
  assert.equal(legacy.head[0], null);
  assert.ok(legacy.rows.every((r) => r.before === null && !r.changed));
  const fh11 = comparison(CHAPTERS[2]);
  assert.equal(fh11.rows.find((r) => r.label === 'Spine block').changed, false);
});

test('derived counts multiply out from the paper', () => {
  const tier = (id, kind) => CHAPTERS.find((c) => c.id === id).topology.tiers.find((t) => t.kind === kind);
  assert.equal(tier('firehose-1.0', 'tor').count, tier('firehose-1.0', 'agg').count * tier('firehose-1.0', 'tor').perAgg);
  assert.equal(tier('jupiter', 'tor').count, tier('jupiter', 'agg').count * tier('jupiter', 'tor').perAgg);
  assert.equal(tier('legacy', 'tor').count, 20000 / 40);
});

test('block internals add up to the ports the paper gives', () => {
  const view = (id, of) => CHAPTERS.find((c) => c.id === id).inside.find((v) => v.of === of);
  const rows = (v) => v.rows.map((r) => r.n);
  // Firehose: 8×10G boards, 4 up and 4 down.
  assert.deepEqual(rows(view('firehose-1.0', 'spine')), [4, 8]); // 8 × 4 = 32 down
  assert.deepEqual(rows(view('firehose-1.0', 'agg')), [8, 8]); // 8 × 4 = 32 up and 32 down
  // Watchtower 128×10G: 16 edge chips × 8 front ports; Saturn 288×10G: 24 × 12.
  const wt = view('watchtower', 'spine');
  assert.equal(wt.groups.length, 8); // 8 linecards
  assert.equal(wt.rows.length, 3); // 3 chips per card
  assert.equal((wt.rows[0].n + wt.rows[2].n) * 8, 128); // 16 edge chips × 8 front ports
  assert.equal(wt.rows[0].n + wt.rows[2].n, wt.rows[1].n * 2); // a middle chip's 16 ports: one to each edge chip
  const sat = view('saturn', 'spine');
  assert.equal(sat.groups.length, 12); // 12 linecards
  assert.equal((sat.rows[0].n + sat.rows[2].n) * 12, 288); // 24 edge chips × 12 front ports
  assert.equal(sat.rows[0].n + sat.rows[2].n, 24); // a middle chip's 24 ports: one to each edge chip
  // Jupiter: 6 Centauris × 4 chips in a spine block, 4 × 4 in a Middle Block, 8 MBs per aggregation block.
  assert.equal(rows(view('jupiter', 'spine')).reduce((a, b) => a + b), 6 * 4);
  const js = view('jupiter', 'spine');
  assert.equal(js.groups.length, 6); // 6 Centauris
  assert.equal(js.rows[1].n * 8, 128); // 16 lower chips × 8×40G down
  assert.equal(js.rows[0].at.length, js.rows[0].n);
  // Each Centauri holds 4 chips: count the upper and lower chips inside each group.
  for (const grp of js.groups) {
    const upper = js.rows[0].at.filter((c) => c >= grp.from && c <= grp.to).length;
    const lower = grp.to - grp.from + 1;
    assert.equal(upper + lower, 4, grp.label);
  }
  assert.equal(rows(view('jupiter', 'mb')).reduce((a, b) => a + b), 4 * 4);
  assert.equal(view('jupiter', 'mb').groups.length, 4); // 4 Centauris, each 2 linecards × 2 chips
  // Upper chips: 8×40G up each → 64×40G; lower chips: 8×40G = 32×10G down each → 256×10G.
  assert.equal(view('jupiter', 'mb').rows[0].n * 8, 64);
  assert.equal(view('jupiter', 'mb').rows[1].n * 32, 256);
  assert.equal(view('jupiter', 'agg').rows[0].n, 8);
  for (const c of CHAPTERS.slice(1)) assert.ok(c.inside.some((v) => v.of === 'spine') && c.inside.some((v) => v.of === 'agg'), c.id);
});

test('Firehose 1.1 wiring matches the 8×10G linecard: 4 links each way', async () => {
  const { pairs, torWiring } = await import('./inside.js');
  const fh11 = CHAPTERS.find((c) => c.id === 'firehose-1.1');
  const agg = fh11.inside.find((v) => v.of === 'agg');
  const links = pairs(agg.mesh, [], []);
  assert.equal(links.length, 32); // 8 upper cards × 4 ports down
  for (let k = 0; k < 8; k++) {
    assert.equal(links.filter(([i]) => i === k).length, 4, `upper ${k}`);
    assert.equal(links.filter(([, j]) => j === k).length, 4, `lower ${k}`);
  }
  assert.equal(new Set(links.map(String)).size, 32);
  // 16 buddied ToRs × 2×10G up fill 8 lower cards × 4 ports down.
  const tors = agg.tors.wiring;
  assert.equal(tors.length, 32);
  for (let k = 0; k < 8; k++) assert.equal(tors.filter(([, j]) => j === k).length, 4, `card ${k}`);
  for (let t = 0; t < 16; t++) {
    const cards = tors.filter(([x]) => x === t).map(([, j]) => j);
    assert.equal(new Set(cards).size, 2, `ToR ${t} uses two different cards`);
    const buddy = tors.filter(([x]) => x === (t ^ 1)).map(([, j]) => j);
    assert.ok(cards.every((j) => !buddy.includes(j)), `ToR ${t} shares no card with its buddy`);
  }
  assert.ok(torWiring(16, 8).length === 32);
});

test('a changed cell marks only the words that are new', () => {
  const marked = (a, b) => diffCell(a, b).filter((s) => s.changed).map((s) => s.text);
  assert.deepEqual(marked('2x10G up 24x1G down', '4x10G up 48x1G down'), ['4x10G', '48x1G']);
  assert.deepEqual(marked('2004', '2005'), ['2005']);
  assert.deepEqual(marked('–', '2x32x10G (B)'), ['2x32x10G', '(B)']);
  assert.deepEqual(marked('8x10G 4x10G (ToR)', '8x10G'), ['8x10G'], 'words only removed: the whole cell is marked');
});

test('marked words in the improved and challenge lists are in their text', () => {
  for (const c of CHAPTERS) for (const i of [...(c.improved ?? []), ...c.challenges]) for (const m of i.marks ?? []) assert.ok(i.text.includes(m), `${c.id}: ${m}`);
});

test('the comparison lists servers per ToR right after the ToR row', () => {
  const rows = comparison(CHAPTERS[1]).rows;
  const at = rows.findIndex((r) => r.label === 'ToR');
  assert.equal(rows[at + 1].label, 'Servers per ToR');
  assert.deepEqual([rows[at + 1].before, rows[at + 1].now, rows[at + 1].changed], ['40', '20', true]);
  assert.ok(comparison(CHAPTERS[0]).rows.every((r) => r.before === null && !r.changed));
});

test('the growth series reads Table 2: bisection climbs and the chips match', () => {
  const s = growthSeries();
  assert.equal(s.length, CHAPTERS.length);
  for (let i = 1; i < s.length; i++) assert.ok(s[i].bisection >= s[i - 1].bisection, s[i].id);
  assert.equal(s[0].bisection, 2e12);
  assert.equal(s[s.length - 1].bisection, 1.3e15);
  assert.equal(s[0].chip, null);
  assert.deepEqual(s.find((x) => x.id === 'firehose-1.0').chip, { ports: 8, speed: 10 });
  assert.deepEqual(s.find((x) => x.id === 'jupiter').chip, { ports: 16, speed: 40 });
});

test('every generation has a ToR oversubscription figure, and the fat tree is 1:1', () => {
  const s = growthSeries();
  for (const x of s) assert.ok(x.oversub && x.oversub.ratio >= 1 && x.oversub.text && x.oversub.source, x.id);
  assert.equal(s[0].oversub.ratio, 10);
  assert.equal(s.find((x) => x.id === 'firehose-1.0').oversub.ratio, 1);
  assert.equal(s.find((x) => x.id === 'saturn').oversub.ratio, 5);
});
