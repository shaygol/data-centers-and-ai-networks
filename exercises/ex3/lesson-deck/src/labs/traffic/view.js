// Traffic growth: the paper's Figure 1 brought up to today. One log axis, everything indexed to 2008.
// Paper values, Google's later capacity figures and the what-if arithmetic are kept visibly apart.
// v2 (Shay's deck) shows the debate, passage 1, a Figure 1 style picture and the data table; the
// interactive chart below is still built and kept in step, but not placed on the page.
import { h, svg, stat, toggle, slider, heldBack, paperNote, experimentLeaver, debateBox } from '../../shell/ui.js';
import { zoomFigure } from '../../editions/v2/figures.js';
import { passageBlocks } from '../../editions/v2/debate.js';
import trafficSketch from '../../editions/v2/figs/traffic-sketch.jpg';
import {
  TRAFFIC, CAPACITY, CAPACITY_BASE, capacityIndex, extrapolate, DOUBLING_MONTHS, NOW, times, tbpsText, capacityGrowth, TRACE, INDUSTRY,
} from './model.js';

const W = 900;
const H = 430;
const M = { top: 18, right: 160, bottom: 40, left: 100 };
const X0 = 2004;
const X1 = 2027;
const Y0 = -1; // log10: 0.1x
const Y1 = 6; // log10: 1,000,000x

const x = (t) => M.left + ((t - X0) / (X1 - X0)) * (W - M.left - M.right);
const y = (v) => M.top + ((Y1 - Math.log10(v)) / (Y1 - Y0)) * (H - M.top - M.bottom);

const STATES = {
  'figure-1': { whatIf: false, after: true },
  'what-if': { whatIf: false, after: true },
  'after-paper': { whatIf: false, after: true },
};

function axes() {
  const g = svg('g', { class: 'tg-axes' });
  for (let p = Y0; p <= Y1; p += 1) {
    const v = 10 ** p;
    g.append(
      svg('line', { class: 'tg-grid', x1: M.left, x2: W - M.right, y1: y(v), y2: y(v) }),
      svg('text', { class: 'tg-tick', x: M.left - 8, y: y(v) + 4, 'text-anchor': 'end' }, times(v)),
    );
  }
  for (let t = 2004; t <= 2026; t += 2) {
    g.append(svg('text', { class: 'tg-tick', x: x(t), y: H - M.bottom + 20, 'text-anchor': 'middle' }, String(t)));
  }
  g.append(
    svg('line', { class: 'tg-axis', x1: M.left, x2: W - M.right, y1: H - M.bottom, y2: H - M.bottom }),
    svg('line', { class: 'tg-paper-end', x1: x(2015.6), x2: x(2015.6), y1: M.top, y2: H - M.bottom }),
    svg('text', { class: 'tg-era', x: x(2015.6) - 6, y: M.top + 12, 'text-anchor': 'end' }, 'The paper'),
    svg('text', { class: 'tg-era', x: x(2015.6) + 6, y: M.top + 12 }, 'After the paper'),
  );
  return g;
}

function point(cls, cx, cy, text, onShow) {
  const g = svg('g', { class: `tg-point ${cls}`, tabindex: '0', role: 'button', 'aria-label': text });
  g.append(svg('circle', { class: 'tg-hit', cx, cy, r: 14 }), svg('circle', { class: 'tg-dot', cx, cy, r: 6 }));
  g.addEventListener('mouseenter', () => onShow(text));
  g.addEventListener('focus', () => onShow(text));
  g.addEventListener('click', () => onShow(text));
  return g;
}

// The Figure 1 style picture: the paper's curve to Nov 2014, then a sketch to 2026.
function trafficImage() {
  const alt = 'Figure 1 style chart: aggregate server traffic from July 2008 to 2026, indexed from 1x to 300x';
  const img = h('img', { src: trafficSketch, alt });
  img.addEventListener('click', () => zoomFigure(trafficSketch, alt));
  return h(
    'figure',
    { class: 'paper-fig traffic-fig' },
    img,
    h('figcaption', {}, h('b', {}, 'Illustration, not published data. '), 'Up to Nov 2014 the curve is the paper’s Figure 1. After 2014 it is a sketch, because Google has not published traffic since then. For scale, Cisco’s forecast for global data center traffic reaches about 300x of this index in 2021, and this sketch reaches 300x in 2026. Click to enlarge.'),
  );
}

function mount(body, ctx) {
  const state = { whatIf: false, after: false, months: DOUBLING_MONTHS.start, guided: true };
  const readout = h('p', { class: 'tg-readout', id: 'tg-readout', 'aria-live': 'polite' });
  const chart = svg('svg', { class: 'tg-chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-labelledby': 'tg-chart-title' });
  const leave = experimentLeaver(ctx, state, paint);

  const whatIfToggle = toggle({ id: 'tg-whatif', label: 'What if the paper’s rate continued?', onChange: (on) => { state.whatIf = on; leave(); } });
  const afterToggle = toggle({ id: 'tg-after', label: 'Show figures after the paper (Google, Cisco)', onChange: (on) => { state.after = on; leave(); } });
  const monthsSlider = slider({
    id: 'tg-months', label: 'Doubling time', min: DOUBLING_MONTHS.min, max: DOUBLING_MONTHS.max, step: 1,
    format: (m) => `${m} months`, onInput: (m) => { state.months = m; leave(); },
  });
  const nowStat = stat('What-if traffic, Nov 2026', { id: 'tg-now' });
  const fabricStat = stat('One fabric, 2012 → 2023', { id: 'tg-fabric' });

  const legend = h(
    'ul',
    { class: 'tg-legend' },
    h('li', {}, h('span', { class: 'tg-key key-traffic' }), 'Server traffic, whole fleet (Figure 1)'),
    h('li', {}, h('span', { class: 'tg-key key-capacity' }), 'Largest single fabric, bisection bandwidth'),
    h('li', { class: 'tg-legend-whatif' }, h('span', { class: 'tg-key key-whatif' }), 'What-if: Figure 1’s rate carried forward (arithmetic, not data)'),
    h('li', { class: 'tg-legend-ind' }, h('span', { class: 'tg-key key-industry' }), 'Industry: global data center traffic (Cisco), indexed to Figure 1 at Nov 2014'),
  );

  const whereDidItGo = heldBack(
    { id: 'tg-reveal', label: 'Show one answer' },
    paperNote('Figure 1 counts traffic across the whole fleet; the orange line is one fabric. Google says it now runs “hundreds of Jupiter fabrics” around the world.', 'Google Cloud blog, Oct 2024'),
    paperNote('Google stopped publishing the Figure 1 series after 2014, so nobody outside Google can draw the real traffic line to today.', 'No public source found'),
  );

  const table = h(
    'details',
    { class: 'tg-table' },
    h('summary', {}, 'Data table'),
    h(
      'table',
      {},
      h('thead', {}, h('tr', {}, h('th', {}, 'Year'), h('th', {}, 'Series'), h('th', {}, 'Value'), h('th', {}, 'Index (2008 = 1x)'), h('th', {}, 'Source'))),
      h(
        'tbody',
        {},
        TRAFFIC.map((p) => h('tr', {}, h('td', {}, p.label), h('td', {}, 'Server traffic'), h('td', {}, 'no units in the paper'), h('td', {}, times(p.value)), h('td', {}, p.source))),
        INDUSTRY.map((d) => h('tr', { class: 'is-after' }, h('td', {}, d.label), h('td', {}, 'Global data center traffic (Cisco)'), h('td', {}, `${d.zb} ZB per year`), h('td', {}, times(d.value)), h('td', {}, d.source))),
        CAPACITY.map((c) => h('tr', { class: c.after ? 'is-after' : '' }, h('td', {}, String(c.t)), h('td', {}, c.label), h('td', {}, `${c.more ? 'over ' : ''}${tbpsText(c.tbps)}`), h('td', {}, times(capacityIndex(c))), h('td', {}, c.source))),
      ),
    ),
  );

  const discussion = h('div', { class: 'tg-discuss', id: 'tg-discuss' }, h('p', { class: 'tg-question' }, 'One fabric grew about 10x since 2012. Where did the rest of the traffic go?'), whereDidItGo);

  body.append(
    debateBox(
      'Until 2014, server traffic doubled about every year. Did it keep doubling after that?',
      'Google stopped publishing the series, so no public source shows its own traffic. Industry data does not show yearly doubling. Cisco counts global data center traffic at 3.4 ZB per year in 2014 and about 6.8 ZB in 2016, and forecasts about 20.5 ZB for 2021: a doubling every 2 to 3 years. One Jupiter fabric grew from over 1 Pb/s in 2015 to over 6 Pb/s in 2022. For scale, 1 ZB (zettabyte) is 10²¹ bytes, a billion terabytes, and 1 Pb/s (petabit per second) is 10¹⁵ bits every second, a million gigabits.',
    ),
    passageBlocks('s1', [0, 1]),
    h('div', { class: 'tg-layout' }, trafficImage()),
    table,
  );

  const showReadout = (text) => { readout.textContent = text; };

  function paint() {
    whatIfToggle.set(state.whatIf);
    afterToggle.set(state.after);
    monthsSlider.set(state.months, !state.whatIf);
    legend.querySelector('.tg-legend-whatif').hidden = !state.whatIf;
    legend.querySelector('.tg-legend-ind').hidden = !state.after;

    const shown = CAPACITY.filter((c) => state.after || !c.after);
    chart.replaceChildren(axes());

    if (state.whatIf) {
      const steps = 40;
      const ts = Array.from({ length: steps + 1 }, (_, i) => TRAFFIC[1].t + ((NOW - TRAFFIC[1].t) * i) / steps);
      const top = ts.map((t) => `${x(t)},${y(Math.min(extrapolate(DOUBLING_MONTHS.min, t), 10 ** Y1))}`);
      const bottom = ts.map((t) => `${x(t)},${y(extrapolate(DOUBLING_MONTHS.max, t))}`).reverse();
      chart.append(
        svg('polygon', { class: 'tg-band', points: [...top, ...bottom].join(' ') }),
        svg('polyline', { class: 'tg-whatif', points: ts.map((t) => `${x(t)},${y(Math.min(extrapolate(state.months, t), 10 ** Y1))}`).join(' ') }),
        svg('text', { class: 'tg-label', x: x(NOW) + 8, y: y(Math.min(extrapolate(state.months, NOW), 10 ** Y1)) + 4 }, `What-if ${times(extrapolate(state.months, NOW))}`),
      );
    }

    const paperCap = shown.filter((c) => !c.after);
    const afterCap = shown.filter((c) => c.after);
    chart.append(svg('polyline', { class: 'tg-capacity', points: paperCap.map((c) => `${x(c.t)},${y(capacityIndex(c))}`).join(' ') }));
    if (afterCap.length) {
      chart.append(svg('polyline', { class: 'tg-capacity is-after', points: [paperCap.at(-1), ...afterCap].map((c) => `${x(c.t)},${y(capacityIndex(c))}`).join(' ') }));
    }
    chart.append(svg('polyline', { class: 'tg-traffic', points: TRACE.map(([t, v]) => `${x(t)},${y(v)}`).join(' ') }));
    if (state.after) {
      chart.append(svg('polyline', { class: 'tg-industry', points: INDUSTRY.map((d) => `${x(d.t)},${y(d.value)}`).join(' ') }));
      for (const d of INDUSTRY) {
        const text = `Global data center traffic, ${d.label}: ${d.zb} ZB per year, drawn as ${times(d.value)} of Jul 2008 (indexed to Figure 1 at Nov 2014). Source: ${d.source}.`;
        chart.append(point(`is-industry${d.forecast ? ' is-after' : ''}`, x(d.t), y(d.value), text, showReadout));
      }
      chart.append(svg('text', { class: 'tg-label', x: x(INDUSTRY.at(-1).t) + 10, y: y(INDUSTRY.at(-1).value) + 4 }, `Industry ${times(INDUSTRY.at(-1).value)}`));
    }

    for (const c of shown) {
      const text = `${c.label}, ${c.t}: ${c.more ? 'over ' : ''}${tbpsText(c.tbps)}, ${times(capacityIndex(c))} of Watchtower 2008. Source: ${c.source}.`;
      chart.append(point(`is-capacity${c.after ? ' is-after' : ''}`, x(c.t), y(capacityIndex(c)), text, showReadout));
    }
    for (const p of TRAFFIC) {
      chart.append(point('is-traffic', x(p.t), y(p.value), `Server traffic, ${p.label}: ${times(p.value)} of Jul 2008. Source: ${p.source}.`, showReadout));
    }
    const lastCap = shown.at(-1);
    chart.append(
      svg('text', { class: 'tg-label', x: x(TRAFFIC[1].t) - 10, y: y(TRAFFIC[1].value) - 14, 'text-anchor': 'end' }, 'Traffic 50x'),
      svg('text', { class: 'tg-label', x: x(lastCap.t) + 10, y: y(capacityIndex(lastCap)) + 18 }, `${lastCap.label} ${times(capacityIndex(lastCap))}`),
    );

    nowStat.hidden = !state.whatIf;
    nowStat.set(times(extrapolate(state.months, NOW)), `of 2008, doubling every ${state.months} months. Arithmetic, not data.`);
    fabricStat.hidden = !state.after;
    fabricStat.set(times(capacityGrowth(CAPACITY[4], CAPACITY.at(-1))), `${tbpsText(CAPACITY[4].tbps)} → ${tbpsText(CAPACITY.at(-1).tbps)}`);
    discussion.hidden = !state.after;
    for (const tr of table.querySelectorAll('tr.is-after')) tr.hidden = !state.after;
    readout.textContent = 'Point at a dot for its value and source.';
  }

  return {
    run(id) {
      Object.assign(state, STATES[id], { months: DOUBLING_MONTHS.start, guided: true });
      whereDidItGo.set(false);
      paint();
    },
  };
}

export default {
  id: 'traffic',
  number: 0,
  title: 'Traffic growth: Figure 1 to today',
  short: 'Traffic',
  paper: 'Jupiter',
  source: 'Jupiter Fig. 1, §2, Table 2; Google Cloud blog 2022, 2024',
  hidden: false,
  noStrip: true,
  idea: null,
  illustration: null,
  defaultExperiment: 'figure-1',
  experiments: [
    { id: 'figure-1', label: 'The paper’s Figure 1', note: 'Traffic and fabric capacity as the paper reports them. If traffic kept this pace, how big is it today?' },
    { id: 'what-if', label: 'What if it continued?', note: 'The band runs from a 15-month to a 12-month doubling time.' },
    { id: 'after-paper', label: 'After the paper', note: 'Google’s published fabric capacity for 2022 and 2023, and Cisco’s global data center traffic, next to the what-if.' },
  ],
  mount,
};
