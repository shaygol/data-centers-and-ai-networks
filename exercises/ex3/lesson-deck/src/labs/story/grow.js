// Grow the fabric: a slider through the generations. One view shows what grew (bisection bandwidth), the other theory against practice (ToR oversubscription).
import { h, svg } from '../../shell/ui.js';

export function growTheFabric(series) {
  // A slider through the generations. Two views: bisection bandwidth on a log scale (what grew),
  // and ToR oversubscription against the fat tree's 1:1 (theory against practice).
  const last = series.length - 1;
  let idx = last;
  let mode = 'bandwidth';
  let timer = null;
  const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmtBps = (v) => (v >= 1e15 ? `${Number((v / 1e15).toPrecision(3))} Pb/s` : `${Number((v / 1e12).toPrecision(3))} Tb/s`);
  const times = (x) => `×${x >= 10 ? Math.round(x) : Number(x.toPrecision(2))}`;
  const ratioText = (o) => `${o.upto ? '≤' : ''}${o.ratio}:1`;
  const LO = 12;
  const HI = 15.2;
  const BASE = 205;
  const hgt = (v) => 30 + ((Math.log10(v) - LO) / (HI - LO)) * 140;
  const barX = (i) => 56 + i * 82;
  const select = (i, byUser) => {
    if (byUser) stop();
    idx = Math.max(0, Math.min(last, i));
    paint();
  };
  const onKey = (i) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select(i, true);
    }
  };

  // view 1: bisection bandwidth
  const g = svg('g', {});
  for (const [v, text] of [[1e13, '10 Tb/s'], [1e14, '100 Tb/s'], [1e15, '1 Pb/s']]) {
    g.append(svg('line', { class: 'gf-grid', x1: 48, y1: BASE - hgt(v), x2: 552, y2: BASE - hgt(v) }));
    g.append(svg('text', { class: 'gf-grid-label', x: 44, y: BASE - hgt(v) + 4, 'text-anchor': 'end' }, text));
  }
  g.append(svg('line', { class: 'gf-axis', x1: 48, y1: BASE, x2: 552, y2: BASE }));
  const bars = series.map((s, i) => {
    const bar = svg(
      'g',
      { class: 'gf-bar', tabindex: '0', role: 'button', 'aria-label': `${s.year} ${s.name}: ${fmtBps(s.bisection)} bisection bandwidth` },
      svg('rect', { x: barX(i), y: BASE - hgt(s.bisection), width: 54, height: hgt(s.bisection), rx: 4 }),
      svg('text', { class: 'gf-bar-value', x: barX(i) + 27, y: BASE - hgt(s.bisection) - 7, 'text-anchor': 'middle' }, fmtBps(s.bisection)),
      svg('text', { class: 'gf-bar-year', x: barX(i) + 27, y: BASE + 20, 'text-anchor': 'middle' }, s.year),
      svg('text', { class: 'gf-bar-name', x: barX(i) + 27, y: BASE + 36, 'text-anchor': 'middle' }, s.name),
    );
    bar.addEventListener('click', () => select(i, true));
    bar.addEventListener('keydown', onKey(i));
    g.append(bar);
    return bar;
  });
  const chart = svg('svg', { class: 'gf-chart', viewBox: '0 0 560 250', role: 'group', 'aria-label': 'Bisection bandwidth of each generation, on a log scale' }, g);

  // view 2: oversubscription, theory against practice
  const Y1 = (r) => BASE - r * 16;
  const g2 = svg('g', {});
  for (const v of [2, 5, 10]) {
    g2.append(svg('line', { class: 'gf-grid', x1: 48, y1: Y1(v), x2: 552, y2: Y1(v) }));
    g2.append(svg('text', { class: 'gf-grid-label', x: 44, y: Y1(v) + 4, 'text-anchor': 'end' }, `${v}:1`));
  }
  g2.append(svg('line', { class: 'gf-axis', x1: 48, y1: BASE, x2: 552, y2: BASE }));
  g2.append(svg('line', { class: 'gf-theory', x1: 48, y1: Y1(1), x2: 552, y2: Y1(1) }));
  g2.append(svg('text', { class: 'gf-theory-label', x: 552, y: Y1(1) - 8, 'text-anchor': 'end' }, 'Theory: fat tree, 1:1'));
  g2.append(svg('polyline', { class: 'gf-trend', points: series.map((s, i) => `${barX(i) + 27},${Y1(s.oversub.ratio)}`).join(' ') }));
  const dots = series.map((s, i) => {
    const dot = svg(
      'g',
      { class: 'gf-dot', tabindex: '0', role: 'button', 'aria-label': `${s.year} ${s.name}: ${ratioText(s.oversub)} oversubscribed at the ToR` },
      svg('rect', { class: 'gf-hit', x: barX(i), y: 10, width: 54, height: BASE + 30, rx: 6 }),
      svg('circle', { cx: barX(i) + 27, cy: Y1(s.oversub.ratio), r: 6, class: 'gf-pt' }),
      svg('text', { class: 'gf-bar-value', x: barX(i) + 27, y: Y1(s.oversub.ratio) - 14, 'text-anchor': 'middle' }, ratioText(s.oversub)),
      svg('text', { class: 'gf-bar-year', x: barX(i) + 27, y: BASE + 20, 'text-anchor': 'middle' }, s.year),
      svg('text', { class: 'gf-bar-name', x: barX(i) + 27, y: BASE + 36, 'text-anchor': 'middle' }, s.name),
    );
    dot.addEventListener('click', () => select(i, true));
    dot.addEventListener('keydown', onKey(i));
    g2.append(dot);
    return dot;
  });
  const chart2 = svg('svg', { class: 'gf-chart', viewBox: '0 0 560 250', role: 'group', 'aria-label': 'How oversubscribed the ToR is in each generation, against the fat tree’s 1:1' }, g2);
  const chartBox = h('div', { class: 'gf-chart-box' });

  const modeBtns = [['bandwidth', 'What grew: bisection bandwidth'], ['oversub', 'Theory vs practice: ToR oversubscription']].map(([id, text]) => {
    const b = h('button', { type: 'button', class: 'gf-mode', 'aria-pressed': 'false' }, text);
    b.addEventListener('click', () => {
      mode = id;
      paint();
    });
    return b;
  });

  const slider = h('input', { type: 'range', class: 'gf-slider', min: '0', max: String(last), step: '1', value: String(idx), 'aria-label': 'Generation' });
  slider.addEventListener('input', () => select(Number(slider.value), true));
  const play = h('button', { type: 'button', class: 'gf-play' }, 'Play');
  play.addEventListener('click', () => {
    if (timer) return stop();
    if (idx >= last) select(0, false);
    play.textContent = 'Pause';
    timer = setInterval(() => {
      if (!wrap.isConnected || idx >= last) return stop();
      select(idx + 1, false);
    }, 1500);
  });
  function stop() {
    clearInterval(timer);
    timer = null;
    play.textContent = 'Play';
  }

  const title = h('h4', { class: 'gf-title' });
  const big = h('p', { class: 'gf-big' });
  const mult = h('p', { class: 'gf-mult' });
  const chipBox = h('div', { class: 'gf-chip' });
  const facts = h('p', { class: 'gf-facts' });
  const hook = h('p', { class: 'gf-hook' });
  const card = h('div', { class: 'gf-card', 'aria-live': 'polite' }, title, big, mult, chipBox, facts, hook);
  const note = h('p', { class: 'gf-note' });

  function chipView(s) {
    if (!s.chip) return h('p', { class: 'gf-vendor' }, 'Vendor switches: no merchant chip yet.');
    const rows = Math.ceil(s.chip.ports / 8);
    const cells = [];
    for (let k = 0; k < s.chip.ports; k++) cells.push(svg('rect', { class: s.chip.speed >= 40 ? 'gf-c40' : 'gf-c10', x: (k % 8) * 18, y: Math.floor(k / 8) * 18, width: 14, height: 14, rx: 3 }));
    return h('div', {}, svg('svg', { class: 'gf-chip-svg', viewBox: `0 0 144 ${rows * 18}`, role: 'img', 'aria-label': `${s.chip.ports} ports of ${s.chip.speed}G` }, ...cells), h('p', { class: 'gf-chip-text' }, `${s.chip.ports}×${s.chip.speed}G chip: ${s.chip.ports * s.chip.speed} Gb/s of ports`));
  }
  function paint() {
    const s = series[idx];
    const prev = idx > 0 ? series[idx - 1] : null;
    modeBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(['bandwidth', 'oversub'][i] === mode)));
    bars.forEach((b, i) => {
      b.classList.toggle('is-on', i === idx);
      b.classList.toggle('is-past', i < idx);
    });
    dots.forEach((d, i) => d.classList.toggle('is-on', i === idx));
    slider.value = String(idx);
    chartBox.replaceChildren(mode === 'bandwidth' ? chart : chart2);
    title.textContent = `${s.year} · ${s.name}`;
    if (mode === 'bandwidth') {
      big.textContent = fmtBps(s.bisection);
      const ratio = prev ? s.bisection / prev.bisection : null;
      mult.textContent = !prev ? 'bisection bandwidth: the starting point' : `bisection bandwidth: ${ratio < 1.05 ? 'unchanged' : `${times(ratio)} the one before`} · ${times(s.bisection / series[0].bisection)} the 2004 network`;
      chipBox.replaceChildren(chipView(s));
      facts.textContent = `Fabric speed ${s.fabricSpeed} · host speed ${s.hostSpeed} · servers per ToR: ${s.serversPerTor}`;
      hook.textContent = s.hook;
      note.textContent = 'Log scale: each gridline is ten times the one below. Bisection bandwidth is from Table 2; the chip is its "Switch chip" column.';
    } else {
      const o = s.oversub;
      big.textContent = ratioText(o);
      mult.textContent = o.ratio <= 1.05 ? 'In theory: 1:1. This generation matched it.' : `In theory: 1:1. ${o.upto ? 'Up to ' : ''}${times(o.ratio)} more oversubscribed in practice.`;
      chipBox.replaceChildren(h('p', { class: 'gf-chip-text' }, o.text));
      facts.textContent = `Source: ${o.source}. The ratio is our arithmetic from the figures given.`;
      hook.textContent = o.why || '';
      note.textContent = 'Oversubscription: bandwidth of the server-facing ports divided by the ToR uplinks. A fat tree has none (1:1).';
    }
  }
  const wrap = h(
    'div',
    { class: 'gf-wrap' },
    h('div', { class: 'gf-modes' }, modeBtns),
    h('div', { class: 'gf-bar-row' }, reduced ? null : play, slider),
    h('div', { class: 'gf-grid-wrap' }, chartBox, card),
    note,
  );
  paint();
  return wrap;
}
