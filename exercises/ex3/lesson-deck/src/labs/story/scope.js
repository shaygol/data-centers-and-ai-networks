// Scale and scope: a fabric per cluster under a separate inter-cluster layer, and Jupiter's one datacenter-wide Clos.
import { h, svg } from '../../shell/ui.js';

export function scopeDiagram() {
  const rect = (cls, x, y, w, hgt, rx = 4) => svg('rect', { class: cls, x, y, width: w, height: hgt, rx });
  const text = (cls, x, y, str, anchor = 'middle') => svg('text', { class: cls, x, y, 'text-anchor': anchor }, str);
  const line = (cls, x1, y1, x2, y2) => svg('line', { class: cls, x1, y1, x2, y2 });
  const g = svg('g', {});

  // Before Jupiter: a Clos fabric per cluster, joined by a separate inter-cluster layer through border routers (CBRs).
  g.append(text('sc-title', 20, 24, 'Before: a fabric per cluster', 'start'));
  g.append(rect('sc-bar', 20, 44, 346, 44, 6));
  g.append(text('sc-bar-name', 193, 63, 'Inter-cluster layer'));
  g.append(text('sc-note', 193, 80, 'a separate network: vendor gear, later Freedome'));
  for (let i = 0; i < 3; i++) {
    const x0 = 20 + i * 121;
    const top = 138;
    g.append(rect('sc-cluster', x0, top, 104, 210, 8));
    g.append(text('sc-cluster-name', x0 + 62, top + 20, `Cluster ${i + 1}`));
    const spine = [x0 + 52, x0 + 80];
    const agg = [x0 + 52, x0 + 80];
    const tors = [x0 + 16, x0 + 48, x0 + 80];
    const Y = { spine: top + 40, agg: top + 94, tor: top + 156 };
    for (const sx of spine) for (const ax of agg) g.append(line('sc-link', sx + 11, Y.spine + 14, ax + 11, Y.agg));
    for (const ax of agg) for (const tx of tors) g.append(line('sc-link', ax + 11, Y.agg + 14, tx + 11, Y.tor));
    for (const sx of spine) g.append(rect('sc-node', sx, Y.spine, 22, 14, 3));
    for (const ax of agg) g.append(rect('sc-node', ax, Y.agg, 22, 14, 3));
    for (const tx of tors) g.append(rect('sc-tor', tx, Y.tor, 22, 14, 3));
    g.append(text('sc-tag', x0 + 62, top + 196, 'ToRs'));
    // The cluster's border routers: an aggregation block whose ports face outward.
    g.append(rect('sc-cbr', x0 + 8, Y.agg - 1, 34, 16, 3));
    g.append(text('sc-cbr-text', x0 + 25, Y.agg + 11, 'CBR'));
    g.append(line('sc-link', x0 + 42, Y.agg + 7, x0 + 52, Y.agg + 7));
    g.append(line('sc-up', x0 + 25, Y.agg - 1, x0 + 25, 88));
  }
  g.append(text('sc-tag', 56, 126, 'border links', 'start'));
  g.append(text('sc-stat', 193, 376, 'Largest fabric: 207 Tb/s bisection'));

  // Jupiter: the inter-cluster layer is absorbed; one Clos for the whole datacenter.
  g.append(text('sc-title', 420, 24, 'Jupiter (2012): one big fabric', 'start'));
  g.append(rect('sc-ghost', 420, 44, 346, 44, 6));
  g.append(text('sc-gone', 593, 63, 'Inter-cluster layer'));
  g.append(text('sc-note', 593, 80, 'absorbed into the fabric'));
  g.append(rect('sc-fabric', 420, 138, 346, 210, 10));
  g.append(text('sc-bar-name', 593, 160, 'One Clos fabric'));
  const cols = [446, 494, 542, 650, 698];
  const rows = { spine: 182, agg: 238, tor: 306 };
  for (const sx of cols) for (const ax of cols) g.append(line('sc-link', sx + 14, rows.spine + 18, ax + 14, rows.agg));
  const tors = [436, 470, 504, 538, 646, 680, 714];
  cols.forEach((ax, i) => [i, i + 1, i + 2].forEach((k) => g.append(line('sc-link', ax + 14, rows.agg + 18, tors[Math.min(k, tors.length - 1)] + 10, rows.tor))));
  for (const sx of cols) g.append(rect('sc-node', sx, rows.spine, 28, 18, 3));
  for (const ax of cols) g.append(rect('sc-node', ax, rows.agg, 28, 18, 3));
  for (const tx of tors) g.append(rect('sc-tor', tx, rows.tor, 20, 14, 3));
  for (const y of [rows.spine + 9, rows.agg + 9, rows.tor + 7]) g.append(text('sc-dots', 596, y + 5, '…'));
  g.append(text('sc-tag', 593, 336, 'Every cluster is part of this one fabric'));
  g.append(text('sc-stat', 593, 376, '1.3 Pb/s bisection: over 6× more'));

  return h(
    'div',
    { class: 'st-diagram-wrap st-scope' },
    svg('svg', { class: 'st-diagram', viewBox: '0 0 800 392', role: 'img', 'aria-label': 'Before: one Clos fabric per cluster, joined by a separate inter-cluster layer. Jupiter: one Clos fabric for the whole datacenter, with that layer absorbed.' }, g),
    h('p', { class: 'st-scope-caption' }, 'Before, each cluster had its own Clos fabric and reached a separate inter-cluster layer through Cluster Border Routers (CBRs) speaking eBGP; that layer was vendor gear, later replaced by Freedome (§4.1, §4.2). Jupiter absorbs the layer into one Clos for the whole datacenter: 1.3 Pb/s of bisection bandwidth, more than 6× the 207 Tb/s before (§3.3). BGP is still used at the datacenter edge; what disappears is the separate layer and its bandwidth limit.'),
  );
}
