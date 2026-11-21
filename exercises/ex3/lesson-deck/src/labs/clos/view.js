// Lab 2 drawing and controls. All numbers come from model.js.
import { h, svg, stat, segmented, toggle, paperNote, onActivate, experimentLeaver, linkName, pct } from '../../shell/ui.js';
import { clos, equalCostPaths, allToAll, pair, linkLoads, summary, spineShareLost, isSpine } from './model.js';

const EXPERIMENTS = {
  'spine-failure': { src: 'T1', dst: 'T7', traffic: 'all', rate: 50, failed: ['S1'] },
  healthy: { src: 'T1', dst: 'T7', traffic: 'pair', rate: 50, failed: [] },
  'link-failure': { src: 'T1', dst: 'T7', traffic: 'pair', rate: 50, failed: ['A7-S1'] },
};

const BOX = '0 0 1000 530';
const NODE_R = 29;
const MANY_ROWS = 14;

function layout(net) {
  const at = {};
  const { blocks, torsPerBlock, aggsPerBlock } = net.params;
  const blockWidth = 1000 / blocks;
  const centre = (b) => blockWidth * (b + 0.5);
  const spines = net.nodes.filter((n) => n.tier === 'spine');
  spines.forEach((n, i) => {
    at[n.id] = { x: 1000 * ((i + 0.5) / spines.length), y: 45 };
  });
  for (let b = 0; b < blocks; b += 1) {
    for (let i = 0; i < aggsPerBlock; i += 1) {
      at[`A${b * aggsPerBlock + i + 1}`] = { x: centre(b) + (i === 0 ? -70 : 70), y: 270 };
    }
    for (let i = 0; i < torsPerBlock; i += 1) {
      at[`T${b * torsPerBlock + i + 1}`] = { x: centre(b) + (i === 0 ? -70 : 70), y: 455 };
    }
  }
  return { at, blockCentres: Array.from({ length: blocks }, (_, b) => centre(b)) };
}

function drawFabric(net, { onLink, onSpine }) {
  const { at, blockCentres } = layout(net);
  const blocks = blockCentres.map((x, i) =>
    svg(
      'g',
      { class: 'clos-block' },
      svg('rect', { x: x - 112, y: 228, width: 224, height: 84 }),
      svg('text', { x, y: 277, 'text-anchor': 'middle' }, `Block ${i + 1}`),
    ),
  );

  const links = new Map(
    net.links.map((l) => {
      const low = at[l.a];
      const high = at[l.b];
      const d = `M${low.x} ${low.y} L${high.x} ${high.y}`;
      const line = svg('path', { class: 'clos-link-line', d });
      // ToR links fan out towards the top, so their labels sit high enough not to collide.
      const along = l.tier === 'tor' ? 0.72 : 0.3;
      const label = svg('text', {
        class: 'clos-link-label',
        x: low.x + (high.x - low.x) * along,
        y: low.y + (high.y - low.y) * along + 7,
        'text-anchor': 'middle',
      });
      const g = svg(
        'g',
        { class: 'clos-link', 'data-link': l.id, role: 'button', tabindex: '0', 'aria-pressed': 'false' },
        svg('path', { class: 'clos-link-hit', d }),
        line,
        label,
      );
      onActivate(g, () => onLink(l));
      return [l.id, { g, line, label }];
    }),
  );

  const nodes = new Map(
    net.nodes.map((n) => {
      const { x, y } = at[n.id];
      const spine = n.tier === 'spine';
      const tag = svg('text', { class: 'clos-node-tag', x, y: y + NODE_R + 28, 'text-anchor': 'middle' });
      const g = svg(
        'g',
        {
          class: `clos-node tier-${n.tier}`,
          'data-node': n.id,
          role: spine ? 'button' : null,
          tabindex: spine ? '0' : null,
          'aria-pressed': spine ? 'false' : null,
        },
        svg('circle', { cx: x, cy: y, r: NODE_R }),
        svg('text', { class: 'clos-node-name', x, y: y + 9, 'text-anchor': 'middle' }, n.id),
        n.tier === 'tor' ? tag : null,
      );
      if (spine) onActivate(g, () => onSpine(n.id));
      return [n.id, { g, tag }];
    }),
  );

  const el = svg(
    'svg',
    { class: 'clos-net', viewBox: BOX, role: 'group', 'aria-label': 'Small Clos: 8 ToRs, 4 aggregation blocks, 4 spine blocks' },
    blocks,
    [...links.values()].map((v) => v.g),
    [...nodes.values()].map((v) => v.g),
  );
  return { el, links, nodes };
}

function sortedBars() {
  const list = h('ol', { class: 'clos-bars', id: 'clos-bars' });
  const el = h(
    'div',
    { class: 'clos-bars-panel' },
    h('h3', {}, 'Link load, busiest first'),
    list,
    h('p', { class: 'clos-key' }, 'Bar: load now. Tick: load on the healthy fabric. Dark line: link capacity. Load is the link’s busier direction.'),
  );
  el.set = (loads, healthy) => {
    const before = new Map(healthy.map((l) => [l.id, l.load]));
    const rows = loads.filter((l) => l.load > 0 || before.get(l.id) > 0 || l.down);
    const top = Math.max(1, ...loads.map((l) => l.load), ...healthy.map((l) => l.load));
    list.classList.toggle('is-many', rows.length > MANY_ROWS);
    list.replaceChildren(
      ...rows.map((l) => {
        const fill = h('span', { class: `clos-bar-fill ${l.load > 1 ? 'is-over' : ''}` });
        fill.style.width = `${(l.load / top) * 100}%`;
        const tick = h('span', { class: 'clos-bar-tick', 'aria-hidden': 'true' });
        tick.style.left = `${(before.get(l.id) / top) * 100}%`;
        const capacity = h('span', { class: 'clos-bar-cap', 'aria-hidden': 'true' });
        capacity.style.left = `${(1 / top) * 100}%`;
        return h(
          'li',
          { class: `clos-bar ${l.down ? 'is-down' : ''}`, 'data-bar': l.id, title: `Healthy fabric: ${pct(before.get(l.id))}` },
          h('span', { class: 'clos-bar-name' }, linkName(l.id)),
          h('span', { class: 'clos-bar-track' }, fill, tick, capacity),
          h('b', { class: `clos-bar-value ${l.load > 1 ? 'is-over' : ''}` }, l.down ? 'down' : pct(l.load)),
        );
      }),
    );
  };
  return el;
}

function pathList() {
  const heading = h('h3', {});
  const list = h('ol', { class: 'clos-paths', id: 'clos-paths' });
  const el = h('div', { class: 'clos-paths-panel' }, heading, list);
  el.set = (src, dst, paths, note) => {
    heading.textContent = `Equal-cost paths, ${src} to ${dst}: share of this pair’s traffic`;
    list.replaceChildren(
      ...paths.map((p) => {
        const fill = h('span', { class: 'clos-bar-fill' });
        fill.style.width = `${p.share * 100}%`;
        return h(
          'li',
          { 'data-path': p.nodes.join('>') },
          h('span', { class: 'clos-path-route' }, p.nodes.join(' → ')),
          h('span', { class: 'clos-bar-track' }, fill),
          h('b', {}, pct(p.share)),
        );
      }),
      ...(paths.length === 0 ? [h('li', { class: 'clos-paths-none' }, note)] : []),
    );
  };
  return el;
}

function closedForm(net, src, dst) {
  const { aggsPerBlock: a, uplinksPerAgg: u } = net.params;
  const block = (id) => net.nodes.find((n) => n.id === id).block;
  if (block(src) === block(dst)) return `Closed form: ${a} aggregation switches in the block`;
  return `Closed form: ${a} aggregation switches × ${u} uplinks`;
}

function insightText({ src, dst, traffic, failed }, paths, s, healthyLoad) {
  const shares = paths.map((p) => pct(p.share)).join(', ');
  if (paths.length === 0) return `${src} can’t reach ${dst} any more. Restore a link to bring the traffic back.`;
  if (failed.length === 0) {
    return `${paths.length} equal-cost paths. ECMP splits evenly at each switch, so this pair’s shares are ${shares}.`;
  }
  if (traffic === 'all') {
    const was = healthyLoad(s.busiest.id);
    return `Busiest link: ${linkName(s.busiest.id)}, ${pct(was)} on the healthy fabric and ${pct(s.busiest.load)} now.`;
  }
  return `${paths.length} paths left for this pair, with shares of ${shares}. An even split at each switch doesn’t mean an even split across paths.`;
}

// One ToR's full rate, in units of link capacity.
const senderUnits = (net, rate) => (rate / 100) * net.params.aggsPerBlock;

function spineFailureNote() {
  const net = clos();
  const { rate, failed } = EXPERIMENTS['spine-failure'];
  const demands = allToAll(net, senderUnits(net, rate));
  const after = summary(net, demands, failed);
  const before = linkLoads(net, demands).find((l) => l.id === after.busiest.id).load;
  const atFullRate = summary(net, allToAll(net, senderUnits(net, 100)), failed);
  const gone = after.spineLinksTotal - after.spineLinksUp;
  return `${failed[0]} is down, so ${gone} of ${after.spineLinksTotal} spine links are gone. Every ToR is sending at half rate. Nothing is lost yet, but ${after.busiest.a} and the other switches wired to ${failed[0]} have one spine left, so that link doubles from ${pct(before)} to ${pct(after.busiest.load)}. At 100% rate, only ${pct(atFullRate.fits)} fits.`;
}

function linkFailureNote() {
  const net = clos();
  const { src, dst, failed } = EXPERIMENTS['link-failure'];
  const paths = equalCostPaths(net, src, dst, failed).paths;
  const shares = paths.map((p) => p.share).sort((x, y) => y - x).map(pct).join(', ');
  return `A failure leaves paths but shifts load unevenly. The ${linkName(failed[0])} link is down, at the far end of the path. Link state reaches every switch, so A1 stops using S1 even though its own link to S1 still works. ${src} to ${dst} keeps ${paths.length} of ${equalCostPaths(net, src, dst).paths.length} paths, but the shares become ${shares}.`;
}

function mount(body, ctx) {
  const net = clos();
  const tors = net.nodes.filter((n) => n.tier === 'tor').map((n) => n.id);
  const spines = net.nodes.filter((n) => n.tier === 'spine').map((n) => n.id);
  const state = { src: 'T1', dst: 'T7', traffic: 'pair', rate: 50, failed: new Set(), guided: true };

  const leaveExperiment = experimentLeaver(ctx, state, paint);
  const flip = (id) => {
    if (state.failed.has(id)) state.failed.delete(id);
    else state.failed.add(id);
    leaveExperiment();
  };

  const fabric = drawFabric(net, { onLink: (l) => flip(l.id), onSpine: flip });
  const torOptions = tors.map((t) => ({ value: t, label: t }));
  const srcControl = segmented({
    id: 'clos-src',
    legend: 'From',
    options: torOptions,
    onChange: (value) => {
      if (value === state.dst) state.dst = state.src;
      state.src = value;
      leaveExperiment();
    },
  });
  const dstControl = segmented({
    id: 'clos-dst',
    legend: 'To',
    options: torOptions,
    onChange: (value) => {
      if (value === state.src) state.src = state.dst;
      state.dst = value;
      leaveExperiment();
    },
  });
  const trafficControl = segmented({
    id: 'clos-traffic',
    legend: 'Traffic',
    options: [
      { value: 'pair', label: 'This pair only' },
      { value: 'all', label: 'All ToRs' },
    ],
    onChange: (value) => {
      state.traffic = value;
      leaveExperiment();
    },
  });
  const rateControl = segmented({
    id: 'clos-rate',
    legend: 'Sender rate, of its uplinks',
    options: [
      { value: '50', label: '50%' },
      { value: '100', label: '100%' },
    ],
    onChange: (value) => {
      state.rate = Number(value);
      leaveExperiment();
    },
  });
  const spineToggles = spines.map((spine) => {
    const control = toggle({
      id: `clos-fail-${spine.toLowerCase()}`,
      label: `Fail ${spine}`,
      onChange: (on) => {
        if (on) state.failed.add(spine);
        else state.failed.delete(spine);
        leaveExperiment();
      },
    });
    control.spine = spine;
    return control;
  });
  const restore = h(
    'button',
    {
      type: 'button',
      id: 'clos-restore',
      onclick: () => {
        state.failed.clear();
        leaveExperiment();
      },
    },
    'Restore all',
  );

  const pathsStat = stat('Equal-cost paths', { id: 'clos-stat-paths' });
  const spineStat = stat('Spine links up', { id: 'clos-stat-spine' });
  const busiestStat = stat('Busiest link', { id: 'clos-stat-busiest' });
  const fitsStat = stat('Traffic that fits', { id: 'clos-stat-fits' });
  const bars = sortedBars();
  const paths = pathList();
  const insightLine = h('p', { class: 'insight', id: 'clos-insight', 'aria-live': 'polite' });

  const notes = h(
    'div',
    { class: 'paper-notes' },
    h('h3', {}, 'What the paper says'),
    paperNote('A Clos has in-built path diversity and redundancy, so losing one element can cost relatively little capacity. It also brings more complex routing across multiple equal-cost paths.', 'Jupiter §1'),
    paperNote('Imperfect flow hashing, especially during failures, is one of the causes of congestion the paper lists.', 'Jupiter §6.1'),
    paperNote(`Derived, not stated in the paper: at Jupiter’s largest size there are 256 spine blocks, so one block is about 1/256, or ${(spineShareLost(256) * 100).toFixed(1)}%, of spine capacity. In this lab’s small fabric, one spine is a much larger share.`, 'Jupiter Fig. 8'),
  );

  body.append(
    h('div', { class: 'controls' }, srcControl, dstControl, trafficControl, rateControl),
    h('div', { class: 'controls' }, spineToggles, restore, h('span', { class: 'clos-hint' }, 'Or click any link or spine in the drawing to fail or restore it.')),
    insightLine,
    h(
      'div',
      { class: 'clos-grid' },
      h(
        'div',
        { class: 'clos-main' },
        h('div', { class: 'clos-scroll' }, fabric.el),
        h(
          'ul',
          { class: 'clos-legend' },
          h('li', {}, h('span', { class: 'clos-swatch is-path' }), 'On this pair’s paths'),
          h('li', {}, h('span', { class: 'clos-swatch is-other' }), 'Other traffic'),
          h('li', {}, h('span', { class: 'clos-swatch is-over' }), 'Over capacity'),
          h('li', {}, h('span', { class: 'clos-swatch is-down' }), 'Failed'),
          h('li', {}, 'Thicker means busier'),
        ),
        paths,
      ),
      h('div', { class: 'clos-side' }, h('div', { class: 'stats' }, pathsStat, spineStat, busiestStat, fitsStat), bars),
    ),
    notes,
  );

  function paint() {
    const failed = [...state.failed];
    const units = senderUnits(net, state.rate);
    const demands = state.traffic === 'pair' ? pair(state.src, state.dst, units) : allToAll(net, units);
    const loads = linkLoads(net, demands, failed);
    const healthy = linkLoads(net, demands);
    const healthyLoad = (id) => healthy.find((l) => l.id === id).load;
    const s = summary(net, demands, failed);
    const found = equalCostPaths(net, state.src, state.dst, failed).paths;
    const baseline = equalCostPaths(net, state.src, state.dst).paths.length;

    srcControl.set(state.src);
    dstControl.set(state.dst);
    trafficControl.set(state.traffic);
    rateControl.set(String(state.rate));
    for (const control of spineToggles) control.set(state.failed.has(control.spine));

    const onPath = new Set(found.flatMap((p) => p.nodes.slice(1).map((n, i) => [p.nodes[i], n].sort().join('|'))));
    for (const l of loads) {
      const { g, line, label } = fabric.links.get(l.id);
      const here = onPath.has([l.a, l.b].sort().join('|'));
      const tone = l.down ? 'is-down' : l.load > 1 ? 'is-over' : here && l.load > 0 ? 'is-path' : l.load > 0 ? 'is-other' : '';
      line.setAttribute('class', `clos-link-line ${tone}`);
      line.style.strokeWidth = l.down ? '' : `${3 + Math.min(l.load, 2) * 12}px`;
      label.textContent = !l.down && l.load > 0 && state.traffic === 'pair' ? pct(l.load) : '';
      g.setAttribute('aria-pressed', String(state.failed.has(l.id)));
      g.setAttribute('aria-label', `${state.failed.has(l.id) ? 'Restore' : 'Fail'} link ${linkName(l.id)}, load ${pct(l.load)}`);
    }
    for (const [id, { g, tag }] of fabric.nodes) {
      const isFailed = state.failed.has(id);
      g.classList.toggle('is-failed', isFailed);
      g.classList.toggle('is-src', id === state.src);
      g.classList.toggle('is-dst', id === state.dst);
      if (isSpine(net, id)) {
        g.setAttribute('aria-pressed', String(isFailed));
        g.setAttribute('aria-label', `${isFailed ? 'Restore' : 'Fail'} spine ${id}`);
      }
      tag.textContent = id === state.src ? 'from' : id === state.dst ? 'to' : '';
    }

    pathsStat.set(`${found.length} of ${baseline}`, `${state.src} to ${state.dst}. ${closedForm(net, state.src, state.dst)}`);
    spineStat.set(
      `${s.spineLinksUp} of ${s.spineLinksTotal}`,
      s.spineLinksUp === s.spineLinksTotal ? 'No spine link is down' : `${pct(1 - s.spineLinksUp / s.spineLinksTotal)} of spine capacity is gone`,
    );
    const was = healthyLoad(s.busiest.id);
    busiestStat.set(
      pct(s.busiest.load),
      s.busiest.load === 0 ? 'Nothing is moving' : `${linkName(s.busiest.id)}. ${pct(was)} on the healthy fabric`,
    );
    let fitsDetail = 'Every link is within capacity';
    if (s.delivered === 0) fitsDetail = 'No path is left';
    else if (s.unreachable > 0) fitsDetail = `${pct(s.unreachable / s.offered)} has no path left`;
    else if (s.fits < 1) fitsDetail = 'The busiest link limits every sender, if all slow down equally';
    fitsStat.set(pct(s.fits), fitsDetail);

    bars.set(loads, healthy);
    paths.set(state.src, state.dst, found, `No path left from ${state.src} to ${state.dst}.`);
    insightLine.textContent = insightText({ ...state, failed }, found, s, healthyLoad);
    insightLine.hidden = state.guided;
  }

  paint();
  return {
    run(experiment) {
      const preset = EXPERIMENTS[experiment];
      Object.assign(state, preset, { failed: new Set(preset.failed), guided: true });
      paint();
    },
  };
}

export default {
  id: 'clos',
  number: 2,
  title: 'Clos multipath and failures',
  short: 'Clos failures',
  paper: 'Jupiter',
  source: 'Jupiter §1, §5.2',
  hidden: false,
  idea: 'Paths between blocks = aggregation switches per block × uplinks per switch, here 2 × 2 = 4. ECMP splits evenly at each switch.',
  illustration: 'Values here are computed live on a small Clos built for this lab, not reported by a paper and not a Jupiter generation. One unit is one link’s capacity, and ECMP is an even split of fluid traffic.',
  defaultExperiment: 'healthy',
  experiments: [
    {
      id: 'spine-failure',
      label: 'Spine failure',
      note: spineFailureNote(),
    },
    {
      id: 'healthy',
      label: 'Healthy fabric',
      note: 'T1 to T7 has 4 equal-cost paths, one through each spine: 2 aggregation switches × 2 uplinks. If one spine fails, how much do we lose? Guess first, then click Spine failure.',
    },
    {
      id: 'link-failure',
      label: 'Link failure',
      note: linkFailureNote(),
    },
  ],
  mount,
};
