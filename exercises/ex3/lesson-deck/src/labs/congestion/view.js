// Lab 4 drawing and controls. All numbers come from model.js.
import { h, svg, stat, toggle, slider, paperNote, experimentLeaver, pct } from '../../shell/ui.js';
import {
  simulate, CAPACITY, TICKS, BURST_START, ECN_THRESHOLD, SHARE_FACTOR, LINE_RATE, BOUNDED_WINDOW,
  BURST_RANGE, BUFFER_RANGE, DEFAULTS, NO_FIXES, ALL_FIXES,
} from './model.js';

const EXPERIMENTS = {
  'burst-low-load': { ...DEFAULTS, fixes: NO_FIXES },
  'ecn-alone': { ...DEFAULTS, fixes: { ...NO_FIXES, ecn: true } },
  'burst-fixes-on': { ...DEFAULTS, fixes: ALL_FIXES },
};

const BURST_ALONE = simulate(EXPERIMENTS['burst-low-load']);
const BURST_ECN = simulate(EXPERIMENTS['ecn-alone']);
const BURST_FIXED = simulate(EXPERIMENTS['burst-fixes-on']);

const FIXES = [
  { key: 'ecn', id: 'congestion-ecn', label: 'ECN', about: `The switch marks packets once ${ECN_THRESHOLD} back up, and senders halve their window a tick later. They keep slowing until the backlog clears, counting dropped packets.` },
  { key: 'boundedWindow', id: 'congestion-window', label: 'Bounded congestion window', about: `Each sender puts at most ${BOUNDED_WINDOW} packets a tick on the wire, instead of ${LINE_RATE}.` },
  { key: 'dynamicSharing', id: 'congestion-sharing', label: 'Dynamic buffer sharing', about: `The busy port can take ${SHARE_FACTOR} shares of the chip’s buffer, instead of 1.` },
];

const WIDTH = 800;
const LEFT = 68;
const RIGHT = 14;
const PLOT_WIDTH = WIDTH - LEFT - RIGHT;
const COL_WIDTH = PLOT_WIDTH / TICKS;
const BAR_GAP = 2;
const barX = (tick) => LEFT + tick * COL_WIDTH;
const BAR_WIDTH = COL_WIDTH - BAR_GAP;

const label = (x, y, text, attrs = {}) => svg('text', { x, y, class: 'chart-label', ...attrs }, text);

function tickAxis(y) {
  const marks = [];
  for (let tick = 0; tick <= TICKS; tick += 10) {
    marks.push(label(barX(tick), y + 26, String(tick), { 'text-anchor': 'middle' }));
  }
  return [
    svg('line', { class: 'chart-axis', x1: LEFT, x2: WIDTH - RIGHT, y1: y, y2: y }),
    marks,
    label(LEFT, y + 52, 'Ticks', { class: 'chart-label chart-label-soft' }),
  ];
}

function hLine(y, cls) {
  return svg('line', { class: cls, x1: LEFT, x2: WIDTH - RIGHT, y1: y, y2: y });
}

function yTick(y, text) {
  return [
    hLine(y, 'chart-grid'),
    label(LEFT - 8, y + 6, text, { 'text-anchor': 'end', class: 'chart-label chart-label-soft chart-label-axis' }),
  ];
}

function tickOverlay(run, top, height, describe) {
  const cursors = [];
  const hits = [];
  for (const t of run.series) {
    const x = barX(t.tick);
    cursors.push(svg('rect', { class: 'tick-cursor', 'data-tick-cursor': t.tick, x, y: top, width: COL_WIDTH, height }));
    hits.push(
      svg(
        'rect',
        { class: 'tick-hit', 'data-tick': t.tick, x, y: top, width: COL_WIDTH, height, tabindex: '0' },
        svg('title', {}, describe(t)),
      ),
    );
  }
  return [cursors, hits];
}

// Instantaneous load per tick, against capacity and the average for the whole window.
function drawLoad(el, run, baseline, anyFix) {
  const top = 16;
  const bottom = 300;
  const maxLoad = Math.max(1.5, baseline.peakLoad * 1.1);
  const y = (load) => bottom - (load / maxLoad) * (bottom - top);
  const peak = run.series.find((t) => t.load === run.peakLoad);
  const grid = [];
  for (let mult = 0; mult <= Math.floor(maxLoad); mult += 1) {
    grid.push(...yTick(y(mult), `${mult * 100}%`));
  }
  const [cursors, hits] = tickOverlay(
    run,
    top,
    bottom - top,
    (t) => `Tick ${t.tick}: ${t.arrivals} pkts arriving (${pct(t.load)})`,
  );
  el.setAttribute('aria-label', `Load per tick. Peak ${pct(run.peakLoad)} at tick ${peak.tick}, average ${pct(run.averageUtilization)}, capacity 100%.`);
  el.replaceChildren(
    ...[
      grid,
      anyFix
        ? baseline.series.map((t) =>
            svg('rect', {
              class: 'bar-ghost',
              x: barX(t.tick) + BAR_GAP / 2,
              y: y(t.load),
              width: BAR_WIDTH,
              height: bottom - y(t.load),
            }),
          )
        : null,
      cursors,
      run.series.map((t) =>
        svg('rect', {
          class: t.load > 1 ? 'bar bar-over' : 'bar bar-under',
          x: barX(t.tick) + BAR_GAP / 2,
          y: y(t.load),
          width: BAR_WIDTH,
          height: bottom - y(t.load),
        }),
      ),
      hLine(y(1), 'chart-capacity'),
      hLine(y(run.averageUtilization), 'chart-average'),
      label(WIDTH - RIGHT, y(1) - 6, 'Capacity 100%', { 'text-anchor': 'end' }),
      label(WIDTH - RIGHT, y(run.averageUtilization) - 6, `Average ${pct(run.averageUtilization)}`, { 'text-anchor': 'end', class: 'chart-label chart-label-average' }),
      run.peakLoad > 1
        ? label(barX(peak.tick), y(run.peakLoad) - 8, `Peak ${pct(run.peakLoad)}`, { class: 'chart-label chart-label-hot' })
        : null,
      tickAxis(bottom),
      hits,
    ].flat(2).filter(Boolean),
  );
}

// Queue depth against the buffer limit, with a lane of drops per tick below it.
function drawQueue(el, run, baseline, buffer, anyFix, ecnOn) {
  const queueTop = 16;
  const queueBottom = 200;
  const dropTop = 226;
  const dropBottom = 300;
  // The scale leaves room for the largest limit, so switching on sharing visibly lifts the line.
  const maxQueue = buffer * SHARE_FACTOR;
  const qy = (q) => queueBottom - (q / maxQueue) * (queueBottom - queueTop);
  const maxDrop = Math.max(1, ...baseline.series.map((t) => t.dropped));
  const dy = (d) => dropBottom - (d / maxDrop) * (dropBottom - dropTop);
  const worst = run.series.reduce((a, b) => (b.dropped > a.dropped ? b : a));
  const qGrid = [0, buffer, maxQueue].flatMap((v) => yTick(qy(v), String(v)));
  const dGrid = [0, maxDrop].flatMap((v) => yTick(dy(v), String(v)));
  const [cursors, hits] = tickOverlay(
    run,
    queueTop,
    dropBottom - queueTop,
    (t) => `Tick ${t.tick}: queue ${t.queue}/${run.limit} pkts, dropped ${t.dropped} pkts`,
  );
  const ecnY = qy(ECN_THRESHOLD);
  const ecnLabelY = ecnY - 6 < queueTop + 18 ? ecnY + 20 : ecnY - 6;
  el.setAttribute('aria-label', `Queue depth peaks at ${run.peakQueue} of ${run.limit} packets. ${run.dropped} packets drop.`);
  el.replaceChildren(
    ...[
      qGrid,
      dGrid,
      cursors,
      run.series.map((t) =>
        svg('rect', {
          class: `bar bar-queue${ecnOn && t.queue >= ECN_THRESHOLD ? ' is-marked' : ''}`,
          x: barX(t.tick) + BAR_GAP / 2,
          y: qy(t.queue),
          width: BAR_WIDTH,
          height: queueBottom - qy(t.queue),
        }),
      ),
      hLine(queueBottom, 'chart-axis'),
      hLine(qy(run.limit), 'chart-limit'),
      label(WIDTH - RIGHT, qy(run.limit) + (run.limit === maxQueue ? 22 : -6), `Buffer limit ${run.limit} packets`, { 'text-anchor': 'end' }),
      ecnOn ? hLine(ecnY, 'chart-ecn') : null,
      ecnOn ? label(LEFT + 6, ecnLabelY, `ECN mark (${ECN_THRESHOLD})`, { class: 'chart-label chart-label-ecn' }) : null,
      anyFix
        ? baseline.series.filter((t) => t.dropped > 0).map((t) =>
            svg('rect', {
              class: 'bar-ghost',
              x: barX(t.tick) + BAR_GAP / 2,
              y: dy(t.dropped),
              width: BAR_WIDTH,
              height: dropBottom - dy(t.dropped),
            }),
          )
        : null,
      run.series.filter((t) => t.dropped > 0).map((t) =>
        svg('rect', {
          class: 'bar bar-over',
          x: barX(t.tick) + BAR_GAP / 2,
          y: dy(t.dropped),
          width: BAR_WIDTH,
          height: dropBottom - dy(t.dropped),
        }),
      ),
      label(WIDTH - RIGHT, dropTop + 18, run.dropped > 0 ? `Drops per tick, worst ${worst.dropped}` : 'No drops', {
        'text-anchor': 'end',
        class: run.dropped > 0 ? 'chart-label chart-label-hot' : 'chart-label',
      }),
      tickAxis(dropBottom),
      hits,
    ].flat(2).filter(Boolean),
  );
}

function chartPanel({ id, title, subtitle, stats }) {
  const chart = svg('svg', { class: 'chart', id: `congestion-chart-${id}`, viewBox: `0 0 ${WIDTH} 360`, role: 'img' });
  const el = h(
    'article',
    { class: 'chart-panel', id: `congestion-panel-${id}` },
    h('h3', {}, title),
    h('p', { class: 'chart-subtitle' }, subtitle),
    h('div', { class: 'chart-scroll' }, chart),
    h('div', { class: 'stats' }, stats),
  );
  return { el, chart };
}

function insight(run) {
  const average = pct(run.averageUtilization);
  const peak = pct(run.peakLoad);
  if (run.dropped > 0) {
    return `Average utilization is ${average}, but the busiest tick reaches ${peak}. The buffer overflows and ${run.dropped} packets drop.`;
  }
  if (run.peakLoad > 1) return `The busiest tick reaches ${peak}, and the buffer absorbs it. Nothing drops at ${average} average utilization.`;
  return `Load stays at or below capacity, so no queue builds and nothing drops.`;
}

function mount(body, ctx) {
  const state = { ...DEFAULTS, fixes: { ...NO_FIXES }, guided: true };

  const leaveExperiment = experimentLeaver(ctx, state, paint);
  const packets = (value) => `${value} packets`;

  const burstSlider = slider({
    id: 'congestion-burst',
    label: 'Burst size',
    ...BURST_RANGE,
    format: packets,
    onInput: (value) => {
      state.burst = value;
      leaveExperiment();
    },
  });
  const bufferSlider = slider({
    id: 'congestion-buffer',
    label: 'Buffer share for this port',
    ...BUFFER_RANGE,
    format: packets,
    onInput: (value) => {
      state.buffer = value;
      leaveExperiment();
    },
  });
  const fixToggles = FIXES.map((fix) => {
    const control = toggle({
      id: fix.id,
      label: fix.label,
      onChange: (on) => {
        state.fixes = { ...state.fixes, [fix.key]: on };
        leaveExperiment();
      },
    });
    control.key = fix.key;
    return control;
  });

  const average = stat('Average utilization', { id: 'congestion-average' });
  const peakLoad = stat('Peak instantaneous load', { id: 'congestion-peak-load' });
  const burstTime = stat('Burst sent in', { id: 'congestion-burst-time' });
  const peakQueue = stat('Peak queue depth', { id: 'congestion-peak-queue' });
  const drops = stat('Packets dropped', { id: 'congestion-drops' });

  const loadPanel = chartPanel({
    id: 'load',
    title: 'Load on the port',
    subtitle: `Bars show instantaneous load each tick. The port sends ${CAPACITY} packets a tick. The burst starts at tick ${BURST_START}.`,
    stats: [average, peakLoad, burstTime],
  });
  const queuePanel = chartPanel({
    id: 'queue',
    title: 'Queue and drops',
    subtitle: 'Queue depth against the buffer limit, with drops per tick below it.',
    stats: [peakQueue, drops],
  });
  const insightLine = h('p', { class: 'insight', id: 'congestion-insight', 'aria-live': 'polite' });
  const DEFAULT_INSPECT = 'Hover any tick in either chart to inspect arrivals, queue depth, and drops.';
  const inspector = h('p', { class: 'cg-inspector', id: 'congestion-inspector', 'aria-live': 'polite' }, DEFAULT_INSPECT);
  const fixCards = new Map(
    FIXES.map((fix) => {
      const pill = h('span', { class: 'cg-fix-pill' }, 'OFF');
      const card = h(
        'li',
        { class: 'cg-fix-card', 'data-fix-card': fix.key },
        h('div', { class: 'cg-fix-head' }, h('b', {}, fix.label), pill),
        h('p', { class: 'cg-fix-about' }, fix.about),
      );
      return [fix.key, { card, pill }];
    }),
  );

  let latestRun = null;
  let latestFixes = { ...NO_FIXES };
  function inspectTick(tick) {
    for (const chart of [loadPanel.chart, queuePanel.chart]) {
      for (const rect of chart.querySelectorAll('[data-tick-cursor]')) {
        rect.classList.toggle('is-active', tick !== null && Number(rect.getAttribute('data-tick-cursor')) === tick);
      }
    }
    if (tick === null || !latestRun) {
      inspector.textContent = DEFAULT_INSPECT;
      return;
    }
    const t = latestRun.series[tick];
    if (!t) return;
    const ecnMark = latestFixes.ecn && t.queue >= ECN_THRESHOLD ? ' · ECN marked' : '';
    inspector.textContent = `Tick ${t.tick} · Arrivals: ${t.arrivals} pkts (${pct(t.load)}) · Queue: ${t.queue}/${latestRun.limit} pkts · Dropped: ${t.dropped} pkts${ecnMark}`;
  }

  for (const chart of [loadPanel.chart, queuePanel.chart]) {
    chart.addEventListener('mouseover', (e) => {
      const hit = e.target?.closest?.('[data-tick]');
      if (hit) inspectTick(Number(hit.getAttribute('data-tick')));
    });
    chart.addEventListener('mouseout', (e) => {
      const next = e.relatedTarget;
      if (next && chart.contains(next) && next.closest?.('[data-tick]')) return;
      inspectTick(null);
    });
    chart.addEventListener('focusin', (e) => {
      const hit = e.target?.closest?.('[data-tick]');
      if (hit) inspectTick(Number(hit.getAttribute('data-tick')));
    });
    chart.addEventListener('focusout', () => inspectTick(null));
  }

  body.append(
    h(
      'div',
      { class: 'cg-toolbar' },
      h('div', { class: 'controls' }, burstSlider, bufferSlider),
      h('div', { class: 'controls fix-toggles' }, h('span', { class: 'stat-label' }, 'Fixes'), fixToggles),
    ),
    insightLine,
    h('div', { class: 'chart-panels' }, loadPanel.el, queuePanel.el),
    inspector,
    h('ul', { class: 'cg-fix-cards' }, [...fixCards.values()].map((v) => v.card)),
    h(
      'div',
      { class: 'paper-notes' },
      h('h3', {}, 'What the paper says'),
      h('p', { class: 'cg-paper-callout' }, h('strong', {}, 'Production result (§6.1): '), 'packet discards at ~25% average utilization dropped 100× — from ~1% to <0.01%.'),
      paperNote('Jupiter’s packet discard rate in a typical Clos fabric at 25% average utilization fell from 1% to under 0.01%.', 'Jupiter §6.1'),
      paperNote('Drops came from four causes: bursty flows seen as incast or outcast, limited buffering on commodity switches, deliberately oversubscribed parts such as ToR uplinks, and imperfect flow hashing.', 'Jupiter §6.1'),
      paperNote('The paper also used QoS-based drops, link-level pause at ToRs in early fabrics, more ToR uplinks where needed, and tuned ECMP hashing. This lab doesn’t model those four.', 'Jupiter §6.1'),
    ),
  );

  function paint() {
    burstSlider.set(state.burst);
    bufferSlider.set(state.buffer);
    for (const control of fixToggles) control.set(state.fixes[control.key]);

    const run = simulate(state);
    const baseline = simulate({ burst: state.burst, buffer: state.buffer });
    const anyFix = Object.values(state.fixes).some(Boolean);
    latestRun = run;
    latestFixes = { ...state.fixes };

    drawLoad(loadPanel.chart, run, baseline, anyFix);
    drawQueue(queuePanel.chart, run, baseline, state.buffer, anyFix, state.fixes.ecn);
    inspectTick(null);

    for (const [key, { card, pill }] of fixCards) {
      const on = Boolean(state.fixes[key]);
      card.classList.toggle('is-on', on);
      pill.textContent = on ? 'ON' : 'OFF';
    }

    average.set(pct(run.averageUtilization), `${run.offered} packets over ${TICKS} ticks, against capacity for ${CAPACITY * TICKS}`);
    peakLoad.set(pct(run.peakLoad), 'The busiest single tick, where 100% is capacity');
    burstTime.set(
      state.burst === 0 ? 'No burst' : `${run.burstTicks} ${run.burstTicks === 1 ? 'tick' : 'ticks'}`,
      anyFix && state.burst > 0 ? `${baseline.burstTicks} with no fixes` : '',
    );
    peakQueue.set(`${run.peakQueue} packets`, `Buffer limit ${run.limit}`);
    drops.set(
      String(run.dropped),
      `${((run.dropped / run.offered) * 100).toFixed(1)}% of packets offered${anyFix ? `. ${baseline.dropped} with no fixes` : ''}`,
    );
    const dropsVal = drops.querySelector('.stat-value');
    dropsVal?.classList.toggle('is-hot', run.dropped > 0);
    dropsVal?.classList.toggle('is-ok', run.dropped === 0);

    insightLine.textContent = insight(run);
    insightLine.hidden = state.guided;
  }

  paint();
  return {
    run(experiment) {
      const preset = EXPERIMENTS[experiment];
      state.burst = preset.burst;
      state.buffer = preset.buffer;
      state.fixes = { ...preset.fixes };
      state.guided = true;
      paint();
    },
  };
}

export default {
  id: 'congestion',
  number: 4,
  title: 'Congestion and small buffers',
  short: 'Congestion',
  paper: 'Jupiter',
  source: 'Jupiter §6.1',
  hidden: false,
  idea: 'An average hides bursts. A short burst far above capacity overruns a small buffer, so packets drop while average utilization stays low.',
  illustration: 'Values here come from a small live model of one switch port and one burst, not from the paper. Dropped packets are not resent, and the drop counts are not comparable to the paper’s 1%.',
  defaultExperiment: 'burst-low-load',
  experiments: [
    {
      id: 'burst-low-load',
      label: 'Burst at low average load',
      note: `A ${DEFAULTS.burst}-packet burst lands on a quiet port. Over ${TICKS} ticks the average is ${pct(BURST_ALONE.averageUtilization)}, but the busiest tick reaches ${pct(BURST_ALONE.peakLoad)}. The ${DEFAULTS.buffer}-packet buffer overflows and ${BURST_ALONE.dropped} packets drop.`,
    },
    {
      id: 'ecn-alone',
      label: 'ECN alone',
      note: `ECN marks once the queue hits ${ECN_THRESHOLD} packets, but the signal reaches senders a tick late — after the first microburst already overflowed the buffer. Drops fall from ${BURST_ALONE.dropped} to ${BURST_ECN.dropped} over ${BURST_ECN.burstTicks} ticks, showing why one fix alone is not enough.`,
    },
    {
      id: 'burst-fixes-on',
      label: 'Same burst, fixes on',
      note: `The same burst and the same ${pct(BURST_FIXED.averageUtilization)} average, with all three fixes on. The busiest tick falls to ${pct(BURST_FIXED.peakLoad)}, the queue peaks at ${BURST_FIXED.peakQueue} packets, and ${BURST_FIXED.dropped === 0 ? 'nothing drops' : `${BURST_FIXED.dropped} packets drop`}. The burst takes ${BURST_FIXED.burstTicks} ticks instead of ${BURST_ALONE.burstTicks}.`,
    },
  ],
  mount,
};
