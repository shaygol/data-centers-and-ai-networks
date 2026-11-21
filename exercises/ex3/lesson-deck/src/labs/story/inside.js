// What one spine block or aggregation block is made of, drawn from the paper's figures:
// rows of switch chips (or whole chassis / Middle Blocks), top row nearest the spine,
// the links between rows, and where the block's external ports point.
// Optional extras per view: `groups` (outlined sub-blocks) and `tors` (a ToR row under the block).
import { h, svg } from '../../shell/ui.js';

const W = 800;
const X0 = 120; // row labels sit left of this
const X1 = 780;
const ROW_GAP = 92;
const TICK = 12;
const UNIT = {
  chassis: { w: 120, h: 48 },
  mb: { w: 64, h: 44 },
};

const WHERE = { spine: 'S1 in the diagram', agg: 'A1 in the diagram', mb: 'MB1 above' };

function xs(n) {
  const step = (X1 - X0) / n;
  return Array.from({ length: n }, (_, i) => X0 + step * (i + 0.5));
}

const chipSize = (n) => Math.min(34, ((X1 - X0) / n) * 0.62);

// A row normally spreads its units evenly. A row with `at` instead sits over chosen columns
// of the widest row (`cols` maps each unit to its column), as in Fig. 8's spine block.
function rowGeometry(row, y, widest) {
  const cols = row.at ?? Array.from({ length: row.n }, (_, i) => i);
  const centers = row.at ? row.at.map((i) => xs(widest)[i]) : xs(row.n);
  if (row.unit === 'chip') {
    const s = chipSize(row.at ? widest : row.n);
    return { centers, cols, y, w: s, h: s };
  }
  const u = UNIT[row.unit];
  return { centers, cols, y, w: u.w, h: u.h };
}

// Which lower units each upper unit links to. `mesh` is 'full', 'halves', 'none',
// or the paper's own wiring as a list of [upper, lower] index pairs.
export function pairs(mesh, upper, lower) {
  if (Array.isArray(mesh)) return mesh;
  const out = [];
  if (mesh === 'none') return out;
  const half = (n, i) => (i < n / 2 ? 0 : 1);
  upper.forEach((_, i) =>
    lower.forEach((__, j) => {
      if (mesh === 'full' || (mesh === 'halves' && half(upper.length, i) === half(lower.length, j))) out.push([i, j]);
    }),
  );
  return out;
}

function ports(centers, geo, side, text, cls, mid = (X0 + X1) / 2) {
  const g = svg('g', { class: `st-in-ports ${cls}` });
  for (const cx of centers) {
    const y0 = side === 'top' ? geo.y : geo.y + geo.h;
    const y1 = side === 'top' ? y0 - TICK : y0 + TICK;
    g.append(svg('line', { class: 'st-in-tick', x1: cx, y1: y0, x2: cx, y2: y1 }));
  }
  const ty = side === 'top' ? geo.y - TICK - 8 : geo.y + geo.h + TICK + 19;
  g.append(svg('text', { class: 'st-in-port-label', x: mid, y: ty, 'text-anchor': 'middle' }, `${side === 'top' ? '↑' : '↓'} ${text}`));
  return g;
}

function unitShape(row, geo, cx, i, tone) {
  const x = cx - geo.w / 2;
  if (row.unit === 'chip') return svg('rect', { class: `st-in-chip ${tone}`, x, y: geo.y, width: geo.w, height: geo.h, rx: 3 });
  const label = row.unit === 'mb' ? `MB${i + 1}` : row.label;
  return svg(
    'g',
    { class: `st-in-unit ${tone}` },
    svg('rect', { x, y: geo.y, width: geo.w, height: geo.h, rx: 5 }),
    svg('text', { x: cx, y: geo.y + geo.h / 2 + (row.unit === 'mb' ? 5 : -2), 'text-anchor': 'middle' }, label),
    row.unit === 'chassis' ? svg('text', { class: 'st-in-unit-sub', x: cx, y: geo.y + geo.h / 2 + 15, 'text-anchor': 'middle' }, 'chassis') : null,
  );
}

// ToR row under the block. Buddied ToRs come in pairs joined by a side link.
// `wiring` lists [ToR, lower card] pairs; without it a schematic default is used.
const TOR_W = 22;
const TOR_H = 18;
export function torWiring(n, cards) {
  // ToR t (within its half) links to cards t mod k and t+1 mod k, so every card gets 2 × (ToRs / cards).
  const half = n / 2;
  const k = cards / 2;
  const out = [];
  for (let t = 0; t < n; t++) {
    const base = t < half ? 0 : k;
    const local = t % half;
    out.push([t, base + (local % k)], [t, base + ((local + 1) % k)]);
  }
  return out;
}

function torRow(view, last, g) {
  const t = view.tors;
  const y = last.y + last.h + 58;
  const n = t.pairs * 2;
  const pairCenters = xs(t.pairs);
  const GAP = 9; // half the space between buddies, room for the two side links
  const centers = pairCenters.flatMap((cx) => [cx - TOR_W / 2 - GAP, cx + TOR_W / 2 + GAP]);
  for (const [ti, cj] of t.wiring ?? torWiring(n, last.centers.length)) {
    g.append(svg('line', { class: 'st-in-link is-tor', x1: last.centers[cj], y1: last.y + last.h, x2: centers[ti], y2: y }));
  }
  // Two side links (2×10G) between buddies.
  pairCenters.forEach((cx) =>
    [-3.5, 3.5].forEach((dy) => g.append(svg('line', { class: 'st-in-buddy', x1: cx - GAP, y1: y + TOR_H / 2 + dy, x2: cx + GAP, y2: y + TOR_H / 2 + dy }))),
  );
  centers.forEach((cx) => {
    g.append(svg('rect', { class: 'st-in-tor', x: cx - TOR_W / 2, y, width: TOR_W, height: TOR_H, rx: 2 }));
    g.append(svg('line', { class: 'st-in-tick', x1: cx, y1: y + TOR_H, x2: cx, y2: y + TOR_H + 9 }));
  });
  g.append(
    svg('text', { class: 'st-in-row-label', x: 0, y: y + 6 }, t.label),
    svg('text', { class: 'st-in-row-count', x: 0, y: y + 22 }, `${n} ToRs, ${t.pairs} pairs`),
    svg('text', { class: 'st-in-port-label', x: (X0 + X1) / 2, y: y + TOR_H + 29, 'text-anchor': 'middle' }, `↓ ${t.down}`),
  );
  if (t.side) {
    const ly = y + TOR_H + 52;
    [-3.5, 3.5].forEach((dy) => g.append(svg('line', { class: 'st-in-buddy', x1: X0, y1: ly - 5 + dy, x2: X0 + 26, y2: ly - 5 + dy })));
    g.append(svg('text', { class: 'st-in-buddy-label', x: X0 + 34, y: ly }, t.side));
    return ly + 10;
  }
  return y + TOR_H + 36;
}

function groupBoxes(view, geos, top, bottom, g) {
  const first = geos[0];
  const last = geos[geos.length - 1];
  const ref = geos.reduce((a, b) => (b.centers.length > a.centers.length ? b : a)); // the widest row sets the columns
  const inGroup = (geo, grp) => geo.centers.filter((_, k) => geo.cols[k] >= grp.from && geo.cols[k] <= grp.to);
  for (const grp of view.groups) {
    // A one-column group (a linecard) takes nearly its whole column, so its port labels fit.
    const step = ref.centers.length > 1 ? ref.centers[1] - ref.centers[0] : 0;
    const pad = grp.from === grp.to && step ? step / 2 - 4 - ref.w / 2 : grp.pad ?? 14;
    const left = ref.centers[grp.from] - ref.w / 2 - pad;
    const right = ref.centers[grp.to] + ref.w / 2 + pad;
    const mid = (left + right) / 2;
    g.append(
      svg('rect', { class: 'st-in-group', x: left, y: top, width: right - left, height: bottom - top, rx: 8 }),
      svg('text', { class: 'st-in-group-label', x: mid, y: top + 18, 'text-anchor': 'middle' }, grp.label),
    );
    if (grp.top) g.append(ports(inGroup(first, grp), first, 'top', grp.top, 'is-up', mid));
    if (grp.bottom) g.append(ports(inGroup(last, grp), last, 'bottom', grp.bottom, 'is-down', mid));
  }
}

function drawing(view) {
  const grouped = Boolean(view.groups?.length);
  const top = grouped ? 74 : view.top ? 40 : 14;
  const widest = Math.max(...view.rows.map((r) => r.n));
  const geos = view.rows.map((row, i) => rowGeometry(row, top + i * ROW_GAP, widest));
  const last = geos[geos.length - 1];
  const tone = view.of === 'spine' ? 'is-spine' : 'is-agg';
  const g = svg('g', {});

  for (let r = 0; r + 1 < geos.length; r++) {
    const a = geos[r];
    const b = geos[r + 1];
    for (const [i, j] of pairs(view.mesh, a.centers, b.centers)) {
      g.append(svg('line', { class: 'st-in-link', x1: a.centers[i], y1: a.y + a.h, x2: b.centers[j], y2: b.y }));
    }
  }
  let height = last.y + last.h + (view.bottom ? 40 : 14);
  if (grouped) {
    const boxBottom = last.y + last.h + TICK + 30;
    groupBoxes(view, geos, 6, boxBottom, g);
    height = boxBottom + 8;
  } else {
    if (view.top) g.append(ports(geos[0].centers, geos[0], 'top', view.top, 'is-up'));
    if (view.bottom) g.append(ports(last.centers, last, 'bottom', view.bottom, 'is-down'));
  }
  if (view.tors) height = torRow(view, last, g);
  // Linecards: a solid box around every `cards` chips in a row.
  if (view.cards) {
    for (const geo of geos) {
      for (let i = 0; i + view.cards - 1 < geo.centers.length; i += view.cards) {
        const left = geo.centers[i] - geo.w / 2 - 4;
        const right = geo.centers[i + view.cards - 1] + geo.w / 2 + 4;
        g.append(svg('rect', { class: 'st-in-card', x: left, y: geo.y - 6, width: right - left, height: geo.h + 12, rx: 4 }));
      }
    }
  }
  view.rows.forEach((row, r) => {
    const geo = geos[r];
    geo.centers.forEach((cx, i) => g.append(unitShape(row, geo, cx, i, tone)));
    g.append(
      svg('text', { class: 'st-in-row-label', x: 0, y: geo.y + geo.h / 2 - 2 }, row.unit === 'chip' ? row.label : ''),
      svg('text', { class: 'st-in-row-count', x: 0, y: geo.y + geo.h / 2 + (row.unit === 'chip' ? 15 : 5) }, `${row.n} ${row.unit === 'chip' ? (row.word ?? 'chips') : row.unit === 'mb' ? 'MBs' : 'chassis'}`),
    );
  });

  return svg('svg', { class: 'st-in-svg', viewBox: `0 0 ${W} ${height}`, role: 'img', 'aria-label': `${view.title}. ${view.caption}` }, g);
}

function panel(view) {
  return h(
    'figure',
    { class: `st-inside-panel is-${view.of}`, id: `st-inside-${view.of}` },
    h('figcaption', {}, h('span', { class: 'st-in-title' }, view.title), ' ', h('span', { class: 'st-in-where' }, `(${WHERE[view.of]})`)),
    drawing(view),
    h('p', { class: 'st-in-key' }, view.key),
    h('p', { class: 'st-in-caption' }, view.caption, ' ', h('span', { class: 'st-source' }, `(${view.source})`)),
    view.note ? h('p', { class: 'st-in-note' }, view.note) : null,
  );
}

export function insideBlocks(c) {
  if (!c.inside?.length) return null;
  return h(
    'section',
    { class: 'st-inside', 'aria-label': 'What the blocks are made of' },
    h('h4', { class: 'st-inside-head' }, 'What is inside the blocks'),
    c.inside.map(panel),
  );
}
