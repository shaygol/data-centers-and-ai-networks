// One generation's topology, drawn plainly: a row per layer, a few numbered boxes and "…" for the rest,
// every link drawn between the boxes shown, and the link counts written beside each gap.
import { h, svg } from '../../shell/ui.js';

const W = 800;
const LEFT = 150; // layer names
const RIGHT = 628; // link labels start here
const BLOCK = { w: 70, h: 40 };
const TOR = { w: 30, h: 30 };
const BLOCK_X = [215, 345, 455, 585]; // three boxes, "…", the last box
const ELLIPSIS_X = 520;
const TOR_X = [168, 202, 236, 290]; // under block 1: three ToRs, "…", the last ToR
const TOR_ELLIPSIS_X = 263;
// Buddied ToRs: the first pair, "…", the last pair, with room for the two side links in each pair.
const PAIR_X = [150, 194, 276, 322];
const PAIR_ELLIPSIS_X = 235;

const PREFIX = { spine: 'S', agg: 'A', tor: 'T', routers: 'R' };
const lastLabel = (t) => `${PREFIX[t.kind]}${t.count ?? 'n'}`;

function box(cls, cx, y, w, hgt, text) {
  return svg(
    'g',
    { class: cls },
    svg('rect', { x: cx - w / 2, y, width: w, height: hgt, rx: 4 }),
    svg('text', { x: cx, y: y + hgt / 2 + 5, 'text-anchor': 'middle' }, text),
  );
}

function layerName(t, y, hgt) {
  const count = t.count == null ? 'count not in paper' : `${t.count.toLocaleString('en-US')}${t.derived ? ' (derived)' : ''}`;
  return svg(
    'g',
    { class: 'st-layer' },
    svg('text', { class: 'st-layer-name', x: 0, y: y + hgt / 2 - 2 }, t.name),
    svg('text', { class: 'st-layer-count', x: 0, y: y + hgt / 2 + 16 }, count),
  );
}

function linkLabel(y, text) {
  return svg('text', { class: 'st-link-label', x: RIGHT, y: y + 5 }, text);
}

// The three-tier Clos: spine, aggregation, ToRs under aggregation block 1, servers.
// Firehose 1.1 adds buddied ToRs (drawn in pairs) and a lane for the legacy routers beside the fabric.
function clos(topo, zoom = false) {
  const [spine, agg, tor] = topo.tiers;
  const withLegacy = Boolean(topo.legacy);
  const Y = withLegacy ? { spine: 20, agg: 150, legacy: 262, tor: 330, servers: 404 } : { spine: 20, agg: 150, tor: 268, servers: 340 };
  const g = svg('g', {});
  const blockLabels = (t) => [`${PREFIX[t.kind]}1`, `${PREFIX[t.kind]}2`, `${PREFIX[t.kind]}3`, lastLabel(t)];
  const torX = tor.pairs ? PAIR_X : TOR_X;
  const torNames = tor.pairs ? ['T1', 'T2', `T${tor.perAgg - 1}`, `T${tor.perAgg}`] : ['T1', 'T2', 'T3', tor.perAgg ? `T${tor.perAgg}` : 'Tn'];
  const torW = (text) => TOR.w + (text.length > 2 ? 8 : 0);

  // Every aggregation block to every spine block.
  for (const sx of BLOCK_X) {
    for (const ax of BLOCK_X) {
      g.append(svg('line', { class: 'st-link', x1: sx, y1: Y.spine + BLOCK.h, x2: ax, y2: Y.agg }));
    }
  }
  // ToRs under block 1 link to it; the other blocks get a stub saying how many ToRs they hold.
  torX.forEach((tx) => g.append(svg('line', { class: 'st-link', x1: tx, y1: Y.tor, x2: BLOCK_X[0], y2: Y.agg + BLOCK.h })));
  const below = tor.perAgg ? `${tor.perAgg} ToRs` : 'ToRs';
  for (const ax of BLOCK_X.slice(1)) {
    g.append(
      svg('line', { class: 'st-link st-stub', x1: ax, y1: Y.agg + BLOCK.h, x2: ax, y2: Y.agg + BLOCK.h + 22 }),
      svg('text', { class: 'st-stub-label', x: ax, y: Y.agg + BLOCK.h + 38, 'text-anchor': 'middle' }, below),
      tor.pairs ? svg('text', { class: 'st-stub-label', x: ax, y: Y.agg + BLOCK.h + 54, 'text-anchor': 'middle' }, `(${tor.perAgg / 2} pairs)`) : null,
    );
  }
  // Servers under the drawn ToRs.
  torX.forEach((tx) => g.append(svg('line', { class: 'st-link st-server-link', x1: tx, y1: Y.tor + TOR.h, x2: tx, y2: Y.servers })));
  g.append(
    svg('rect', { class: 'st-servers', x: torX[0] - 20, y: Y.servers, width: torX[3] - torX[0] + 40, height: 26, rx: 4 }),
    svg('text', { class: 'st-servers-text', x: (torX[0] + torX[3]) / 2, y: Y.servers + 18, 'text-anchor': 'middle' }, 'servers'),
  );

  // Legacy routers: a separate network beside the fabric. Every ToR also has 1G links to it.
  if (withLegacy) {
    const lx = 480;
    const lw = 230;
    const lh = 48;
    torX.forEach((tx, i) =>
      g.append(svg('line', { class: 'st-link st-legacy-link', x1: tx + 8, y1: Y.tor, x2: lx - lw / 2, y2: Y.legacy + 14 + i * 7 })),
    );
    g.append(
      svg(
        'g',
        { class: 'st-box st-legacy' },
        svg('rect', { x: lx - lw / 2, y: Y.legacy, width: lw, height: lh, rx: 4 }),
        svg('text', { x: lx, y: Y.legacy + 20, 'text-anchor': 'middle' }, 'Legacy routers'),
        svg('text', { class: 'st-legacy-sub', x: lx, y: Y.legacy + 38, 'text-anchor': 'middle' }, 'the old network, kept as a fallback'),
      ),
    );
  }

  // S1 and A1 are opened up in "What is inside the blocks" below the diagram.
  if (zoom) {
    for (const y of [Y.spine, Y.agg]) {
      g.append(svg('rect', { class: 'st-zoom-ring', x: BLOCK_X[0] - BLOCK.w / 2 - 6, y: y - 6, width: BLOCK.w + 12, height: BLOCK.h + 12, rx: 7 }));
    }
    g.append(svg('text', { class: 'st-zoom-label', x: BLOCK_X[0] - BLOCK.w / 2 - 8, y: Y.spine + BLOCK.h + 22, 'text-anchor': 'start' }, 'inside ↓'));
    g.append(svg('text', { class: 'st-zoom-label', x: BLOCK_X[0] + BLOCK.w / 2 + 10, y: Y.agg + 14, 'text-anchor': 'start' }, 'inside ↓'));
  }
  blockLabels(spine).forEach((text, i) => g.append(box('st-box st-spine', BLOCK_X[i], Y.spine, BLOCK.w, BLOCK.h, text)));
  blockLabels(agg).forEach((text, i) => g.append(box('st-box st-agg', BLOCK_X[i], Y.agg, BLOCK.w, BLOCK.h, text)));
  // Two side links between buddies.
  if (tor.pairs) {
    for (const [a, b] of [[0, 1], [2, 3]]) {
      const x1 = torX[a] + torW(torNames[a]) / 2;
      const x2 = torX[b] - torW(torNames[b]) / 2;
      for (const dy of [-4, 4]) g.append(svg('line', { class: 'st-buddy-link', x1, y1: Y.tor + TOR.h / 2 + dy, x2, y2: Y.tor + TOR.h / 2 + dy }));
    }
  }
  torNames.forEach((text, i) => g.append(box('st-box st-tor', torX[i], Y.tor, torW(text), TOR.h, text)));
  g.append(
    svg('text', { class: 'st-ellipsis', x: ELLIPSIS_X, y: Y.spine + 26, 'text-anchor': 'middle' }, '…'),
    svg('text', { class: 'st-ellipsis', x: ELLIPSIS_X, y: Y.agg + 26, 'text-anchor': 'middle' }, '…'),
    svg('text', { class: 'st-ellipsis', x: tor.pairs ? PAIR_ELLIPSIS_X : TOR_ELLIPSIS_X, y: Y.tor + 21, 'text-anchor': 'middle' }, '…'),
  );

  g.append(
    layerName(spine, Y.spine, BLOCK.h),
    layerName(agg, Y.agg, BLOCK.h),
    layerName(tor, Y.tor, TOR.h),
    svg('text', { class: 'st-layer-name', x: 0, y: Y.servers + 18 }, 'Servers'),
  );
  const [up, down] = topo.links;
  g.append(
    linkLabel((Y.spine + BLOCK.h + Y.agg) / 2, up.text),
    linkLabel(withLegacy ? Y.agg + BLOCK.h + 34 : (Y.agg + BLOCK.h + Y.tor) / 2, down.text),
    withLegacy ? linkLabel(Y.legacy + 24, topo.legacy) : null,
    tor.pairs ? linkLabel(Y.tor + TOR.h / 2, tor.side) : null,
    linkLabel((Y.tor + TOR.h + Y.servers) / 2 + (withLegacy ? 6 : 0), topo.serverLink ?? tor.down),
  );
  return { g, height: Y.servers + 36 };
}

// 2004: vendor routers over ToRs. No Clos.
function legacy(topo) {
  const [routers, tor] = topo.tiers;
  const Y = { routers: 30, tor: 150, servers: 230 };
  const g = svg('g', {});
  BLOCK_X.forEach((tx) => {
    g.append(svg('line', { class: 'st-link', x1: tx, y1: Y.tor, x2: tx, y2: Y.routers + BLOCK.h }));
    g.append(svg('line', { class: 'st-link st-server-link', x1: tx, y1: Y.tor + TOR.h, x2: tx, y2: Y.servers }));
  });
  g.append(
    box('st-box st-routers', 400, Y.routers, BLOCK_X[3] - BLOCK_X[0] + 80, BLOCK.h, 'Vendor routers'),
    svg('rect', { class: 'st-servers', x: BLOCK_X[0] - 40, y: Y.servers, width: BLOCK_X[3] - BLOCK_X[0] + 80, height: 26, rx: 4 }),
    svg('text', { class: 'st-servers-text', x: 400, y: Y.servers + 18, 'text-anchor': 'middle' }, 'servers'),
    svg('text', { class: 'st-ellipsis', x: ELLIPSIS_X, y: Y.tor + 21, 'text-anchor': 'middle' }, '…'),
  );
  ['T1', 'T2', 'T3', lastLabel(tor)].forEach((text, i) => g.append(box('st-box st-tor', BLOCK_X[i], Y.tor, 52, TOR.h, text)));
  g.append(
    layerName(routers, Y.routers, BLOCK.h),
    layerName(tor, Y.tor, TOR.h),
    svg('text', { class: 'st-layer-name', x: 0, y: Y.servers + 18 }, 'Servers'),
    linkLabel((Y.routers + BLOCK.h + Y.tor) / 2, topo.links[0].text),
    linkLabel((Y.tor + TOR.h + Y.servers) / 2, topo.serverLink ?? tor.down),
  );
  return { g, height: Y.servers + 36 };
}

export function topologyDiagram(c) {
  const { g, height } = c.id === 'legacy' ? legacy(c.topology) : clos(c.topology, Boolean(c.inside?.length));
  return h(
    'div',
    { class: 'st-diagram-wrap' },
    svg(
      'svg',
      { class: 'st-diagram', viewBox: `0 0 ${W} ${height}`, role: 'img', 'aria-label': `${c.name} topology, drawn from Table 2 and the paper’s figures` },
      g,
    ),
  );
}

// The same facts as the drawing, as a table that stays readable on any screen.
export function layerTable(c) {
  const rows = [...c.topology.tiers].map((t) =>
    h(
      'tr',
      {},
      h('th', { scope: 'row' }, t.name),
      h('td', {}, t.count == null ? h('span', { class: 'st-unknown' }, 'Not in paper') : `${t.count.toLocaleString('en-US')}${t.derived ? '*' : ''}`),
      h('td', {}, t.each ?? '–'),
      h('td', {}, [t.up, t.down].filter(Boolean).join(' · ') || '–'),
    ),
  );
  rows.push(h('tr', {}, h('th', { scope: 'row' }, 'Servers'), h('td', { colspan: 3 }, c.topology.servers)));
  return h(
    'div',
    { class: 'st-table-wrap' },
    h(
      'table',
      { class: 'st-layers' },
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Layer'), h('th', { scope: 'col' }, 'How many'), h('th', { scope: 'col' }, 'Each one'), h('th', { scope: 'col' }, 'Connects'))),
      h('tbody', {}, rows),
    ),
  );
}
