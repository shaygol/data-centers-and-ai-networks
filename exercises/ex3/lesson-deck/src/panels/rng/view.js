// Reserve: RNG — flat datacenter networks at scale (Bernardi et al., AWS, arXiv 2026).
// Pairs a live 12-ToR Fig. 1 explorer against Jupiter's Clos architecture, reveals the three
// decade-old blockers, lets the class vary Spraypoint parameters (d, h), and finishes on AI tradeoffs.
import { h, svg, stat, segmented, debateBox, illustrationLabel } from '../../shell/ui.js';
import { revealDeck } from '../practice/reveal.js';
import {
  FAT_TREE_12,
  EXPANDER_12,
  SPRAYPOINT_DEMO_PATHS,
  cutSize,
  failureImpact,
  edgeDisjointPaths,
  ecmpPredefinedEntries,
  kShortestEntriesPerRouter,
  BLOCKERS,
  JUPITER_VS_RNG,
} from './model.js';

const edgeKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

function drawFatTreeSvg() {
  const at = { S1: { x: 185, y: 46 }, S2: { x: 415, y: 46 } };
  const podCenters = [92, 232, 372, 512];
  for (let p = 0; p < 4; p += 1) {
    const cx = podCenters[p];
    at[`A${p * 2 + 1}`] = { x: cx - 28, y: 146 };
    at[`A${p * 2 + 2}`] = { x: cx + 28, y: 146 };
    at[`T${p * 3 + 1}`] = { x: cx - 44, y: 254 };
    at[`T${p * 3 + 2}`] = { x: cx, y: 254 };
    at[`T${p * 3 + 3}`] = { x: cx + 44, y: 254 };
  }

  const pods = podCenters.map((cx, p) =>
    svg(
      'g',
      { class: 'rng-pod', 'data-pod': p + 1 },
      svg('rect', { x: cx - 64, y: 120, width: 128, height: 160, rx: 8 }),
      svg('text', { x: cx, y: 299, 'text-anchor': 'middle' }, `Pod ${p + 1}`),
    ),
  );

  const links = FAT_TREE_12.links.map((l) => {
    const p1 = at[l.a];
    const p2 = at[l.b];
    return svg('line', {
      class: `rng-lk tier-${l.tier}`,
      'data-edge': edgeKey(l.a, l.b),
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
    });
  });

  const nodes = FAT_TREE_12.nodes.map((n) => {
    const { x, y } = at[n.id];
    const r = n.tier === 'spine' ? 19 : 16;
    return svg(
      'g',
      { class: `rng-nd tier-${n.tier}`, 'data-node': n.id },
      svg('circle', { cx: x, cy: y, r }),
      svg('text', { x, y: y + 4.5, 'text-anchor': 'middle' }, n.id),
    );
  });

  const callout = svg('text', { class: 'rng-svg-note', x: 300, y: 20, 'text-anchor': 'middle' });
  const el = svg(
    'svg',
    { class: 'rng-svg', viewBox: '0 0 600 314', role: 'img', 'aria-label': '12-ToR 3-tier fat tree with 22 switches and 3:1 oversubscription' },
    pods,
    links,
    nodes,
    callout,
  );
  return { el, callout };
}

function drawExpanderSvg() {
  const cx = 280;
  const cy = 160;
  const rx = 185;
  const ry = 114;
  const at = {};
  EXPANDER_12.nodes.forEach((n, i) => {
    const theta = -Math.PI / 2 + (i / EXPANDER_12.nodes.length) * Math.PI * 2;
    at[n.id] = { x: Math.round(cx + rx * Math.cos(theta)), y: Math.round(cy + ry * Math.sin(theta)) };
  });

  const links = EXPANDER_12.links.map((l) => {
    const p1 = at[l.a];
    const p2 = at[l.b];
    return svg('line', {
      class: 'rng-lk',
      'data-edge': edgeKey(l.a, l.b),
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
    });
  });

  const nodes = EXPANDER_12.nodes.map((n) => {
    const { x, y } = at[n.id];
    return svg(
      'g',
      { class: 'rng-nd tier-tor', 'data-node': n.id },
      svg('circle', { cx: x, cy: y, r: 19 }),
      svg('text', { x, y: y + 5, 'text-anchor': 'middle' }, n.id),
    );
  });

  const callout = svg('text', { class: 'rng-svg-note', x: 280, y: 20, 'text-anchor': 'middle' });
  const el = svg(
    'svg',
    { class: 'rng-svg', viewBox: '0 0 560 314', role: 'img', 'aria-label': '12-ToR flat quasi-random expander with 12 switches and 18 links' },
    links,
    nodes,
    callout,
  );
  return { el, callout };
}

const formatEntries = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(n));

function mount(body) {
  const state = { mode: 'skewed', spray: true, d: 64, h: 2 };

  const fat = drawFatTreeSvg();
  const exp = drawExpanderSvg();

  const fatBadge = h('span', { class: 'rng-kpi' });
  const expBadge = h('span', { class: 'rng-kpi is-own' });
  const sprayToggle = h('button', { type: 'button', class: 'rng-sub-btn', id: 'rng-spray-toggle', 'aria-pressed': 'true' });
  const pathLegend = h(
    'ul',
    { class: 'rng-path-legend', id: 'rng-path-legend' },
    SPRAYPOINT_DEMO_PATHS.map((p) =>
      h('li', {}, h('span', { class: `rng-swatch ${p.tone}` }), h('b', {}, p.label), `: ${p.nodes.join(' → ')}`),
    ),
  );
  const takeaway = h('p', { class: 'rng-takeaway', id: 'rng-takeaway', 'aria-live': 'polite' });

  const modeControl = segmented({
    id: 'rng-mode',
    legend: 'Scenario',
    options: [
      { value: 'skewed', label: 'Skewed burst (T1–T3 → rest)' },
      { value: 'failure', label: 'Switch failure (S1 vs. T6)' },
      { value: 'spraypoint', label: 'Spraypoint routing (T1 → T7)' },
    ],
    onChange: (value) => {
      state.mode = value;
      paintCompare();
    },
  });

  sprayToggle.addEventListener('click', () => {
    state.spray = !state.spray;
    paintCompare();
  });

  const pod1Nodes = new Set(['T1', 'T2', 'T3', 'A1', 'A2']);
  const fatPod1Cut = new Set([edgeKey('A1', 'S1'), edgeKey('A2', 'S2')]);
  const expPod1 = new Set(['T1', 'T2', 'T3']);
  const expPod1Cut = new Set(
    EXPANDER_12.edges.filter(([a, b]) => expPod1.has(a) !== expPod1.has(b)).map(([a, b]) => edgeKey(a, b)),
  );
  const fatPairEdges = new Set([
    edgeKey('T1', 'A1'), edgeKey('T1', 'A2'),
    edgeKey('A1', 'S1'), edgeKey('A2', 'S2'),
    edgeKey('A5', 'S1'), edgeKey('A6', 'S2'),
    edgeKey('T7', 'A5'), edgeKey('T7', 'A6'),
  ]);
  const expImpactT6 = failureImpact(EXPANDER_12, 'T6');
  const fatCutCount = cutSize(FAT_TREE_12.links, pod1Nodes);
  const expCutCount = cutSize(EXPANDER_12.edges, expPod1);

  function clearClasses(svgEl) {
    for (const el of svgEl.querySelectorAll('.rng-lk, .rng-nd, .rng-pod')) {
      el.classList.remove('is-dim', 'is-hot', 'is-own', 'is-failed', 'is-src', 'is-dst', 'is-p1', 'is-p2', 'is-p3');
    }
  }

  function paintCompare() {
    modeControl.set(state.mode);
    clearClasses(fat.el);
    clearClasses(exp.el);

    const isSpray = state.mode === 'spraypoint';
    sprayToggle.hidden = !isSpray;
    pathLegend.hidden = !isSpray || !state.spray;
    sprayToggle.setAttribute('aria-pressed', String(state.spray));
    sprayToggle.textContent = state.spray
      ? 'Showing: Spraypoint (3 disjoint paths) — click for shortest-path only'
      : 'Showing: Shortest-path only (1 path) — click to enable Spraypoint';

    if (state.mode === 'skewed') {
      for (const nd of fat.el.querySelectorAll('.rng-nd')) {
        const id = nd.getAttribute('data-node');
        if (pod1Nodes.has(id)) nd.classList.add('is-src');
      }
      for (const lk of fat.el.querySelectorAll('.rng-lk')) {
        const key = lk.getAttribute('data-edge');
        if (fatPod1Cut.has(key)) lk.classList.add('is-hot');
        else if (![...pod1Nodes].some((id) => key.split('|').includes(id))) lk.classList.add('is-dim');
      }
      fat.el.querySelector('[data-pod="1"]')?.classList.add('is-hot');
      fat.callout.textContent = `Pod 1 → S1/S2 cut = ${fatCutCount} links · capacity stranded`;

      for (const nd of exp.el.querySelectorAll('.rng-nd')) {
        const id = nd.getAttribute('data-node');
        nd.classList.add(expPod1.has(id) ? 'is-src' : 'is-own');
      }
      for (const lk of exp.el.querySelectorAll('.rng-lk')) {
        const key = lk.getAttribute('data-edge');
        lk.classList.add(expPod1Cut.has(key) ? 'is-own' : 'is-dim');
      }
      exp.callout.textContent = `{T1,T2,T3} cut = ${expCutCount} links · full ToR uplink rate`;

      fatBadge.textContent = `22 switches · Cut = ${fatCutCount} links`;
      expBadge.textContent = `12 switches (−45%) · Cut = ${expCutCount} links`;
      takeaway.textContent = `Skewed burst (T1–T3 sending): Pod 1 bottlenecks on only ${fatCutCount} spine links while pods 2–4 sit idle (~60% stranded even in all-to-all traffic, RNG §2). The flat expander exports all ${expCutCount} ToR uplinks directly out of {T1, T2, T3}.`;
    } else if (state.mode === 'failure') {
      fat.el.querySelector('[data-node="S1"]')?.classList.add('is-failed');
      for (const lk of fat.el.querySelectorAll('.rng-lk')) {
        const parts = lk.getAttribute('data-edge').split('|');
        if (parts.includes('S1')) lk.classList.add('is-failed');
        else if (parts.includes('S2')) lk.classList.add('is-hot');
        else lk.classList.add('is-dim');
      }
      fat.callout.textContent = '1 spine fails → 50% cross-pod spine capacity lost';

      exp.el.querySelector('[data-node="T6"]')?.classList.add('is-failed');
      for (const nd of exp.el.querySelectorAll('.rng-nd')) {
        if (nd.getAttribute('data-node') !== 'T6') nd.classList.add('is-own');
      }
      for (const lk of exp.el.querySelectorAll('.rng-lk')) {
        const parts = lk.getAttribute('data-edge').split('|');
        lk.classList.add(parts.includes('T6') ? 'is-failed' : 'is-own');
      }
      exp.callout.textContent = `1 switch fails → ${expImpactT6.lostLinks} of ${expImpactT6.totalLinks} links gone · zero spine tiers`;

      fatBadge.textContent = 'S1 down · 4/8 spine links lost (50%)';
      expBadge.textContent = `T6 down · ${expImpactT6.lostLinks}/${expImpactT6.totalLinks} links lost (17%)`;
      takeaway.textContent = 'Blast radius of one switch failure (RNG §2): in a fat tree, upper-tier spines carry traffic for every pod, so losing S1 halves cross-pod capacity. In a flat expander there are no special upper routers — every surviving switch stays richly connected.';
    } else {
      fat.el.querySelector('[data-node="T1"]')?.classList.add('is-src');
      fat.el.querySelector('[data-node="T7"]')?.classList.add('is-dst');
      for (const lk of fat.el.querySelectorAll('.rng-lk')) {
        lk.classList.add(fatPairEdges.has(lk.getAttribute('data-edge')) ? 'is-own' : 'is-dim');
      }
      fat.callout.textContent = 'ECMP shortest paths (T1 → T7): 2 of 2 spines · fixed 4 hops';

      exp.el.querySelector('[data-node="T1"]')?.classList.add('is-src');
      exp.el.querySelector('[data-node="T7"]')?.classList.add('is-dst');
      const pathMap = new Map();
      const activePaths = state.spray ? SPRAYPOINT_DEMO_PATHS : [SPRAYPOINT_DEMO_PATHS[0]];
      for (const p of activePaths) {
        for (let i = 1; i < p.nodes.length; i += 1) {
          pathMap.set(edgeKey(p.nodes[i - 1], p.nodes[i]), state.spray ? `is-${p.tone}` : 'is-hot');
        }
      }
      for (const lk of exp.el.querySelectorAll('.rng-lk')) {
        const tone = pathMap.get(lk.getAttribute('data-edge'));
        lk.classList.add(tone ?? 'is-dim');
      }
      exp.callout.textContent = state.spray
        ? 'Spraypoint (2 VRFs): sprays T1’s 3 neighbors → 3 disjoint paths (2, 4, 5 hops)'
        : 'Shortest-path only: ONLY 1 path (T1 → T4 → T7) — congests!';

      fatBadge.textContent = 'Structured: 4 symmetric 4-hop paths';
      expBadge.textContent = state.spray ? 'Spraypoint: 3 edge-disjoint paths' : 'Shortest-path: 1 path bottleneck';
      takeaway.textContent = state.spray
        ? 'Spraypoint routing (RNG §5): VRF 1 sprays T1’s packets across ALL neighbors via ECMP; VRF 2 points down deterministic waypoint trees to T7 — unlocking all 3 edge-disjoint paths (lengths 2, 4, and 5 hops) without source-routed tunnels or k-shortest-path tables.'
        : 'Why shortest-path fails on expanders (RNG §1, §3): T1 → T7 has only 1 shortest path (2 hops through T4), leaving two-thirds of T1’s uplinks unused unless traffic can take slightly longer disjoint paths.';
    }
  }

  // Three blockers deck (reuses shared revealDeck contract)
  const deck = revealDeck({
    key: 'rng',
    openLabel: 'How RNG solved it',
    cards: BLOCKERS.map((b) => ({
      id: b.id,
      head: [h('span', { class: 'deck-label' }, b.label), h('span', { class: 'deck-theory' }, b.title)],
      body: [
        h('p', { class: 'deck-practice' }, h('b', {}, 'Blocker: '), b.problem),
        h('p', { class: 'deck-ask' }, h('b', {}, 'RNG fix: '), b.solution),
        h('p', { class: 'deck-source' }, b.cite),
      ],
    })),
  });

  // Spraypoint math interactive calculator + Cost savings breakdown
  const statPaths = stat('Edge-disjoint paths', { id: 'rng-stat-paths' });
  const statShare = stat('Share of router degree', { id: 'rng-stat-share' });
  const statMem = stat('ECMP group entries (h·dʰ)', { id: 'rng-stat-mem' });
  const statFit = stat('ASIC table fit (4–16K ceiling)', { id: 'rng-stat-fit' });

  const dControl = segmented({
    id: 'rng-d',
    legend: 'Uplinks d',
    options: ['32', '64', '128'].map((v) => ({ value: v, label: v })),
    onChange: (value) => {
      state.d = Number(value);
      paintMath();
    },
  });
  const hControl = segmented({
    id: 'rng-h',
    legend: 'Next hops h',
    options: ['1', '2', '3', '4'].map((v) => ({ value: v, label: v })),
    onChange: (value) => {
      state.h = Number(value);
      paintMath();
    },
  });

  function paintMath() {
    dControl.set(String(state.d));
    hControl.set(String(state.h));
    const pathsCount = edgeDisjointPaths(state.d, state.h);
    const share = (1 - Math.exp(-state.h)) * 100;
    const entries = ecmpPredefinedEntries(state.d, state.h);
    const kShort = kShortestEntriesPerRouter(10000, 8);
    statPaths.set(pathsCount.toFixed(1), `out of ${state.d} uplinks (Model 7.1)`);
    statShare.set(`${share.toFixed(1)}%`, state.h === 2 ? 'Sweet spot (h=1 is 63.2%, h≥3 tapers)' : 'exp(−h) drops sharply at h=2');
    statMem.set(formatEntries(entries), `vs. ${formatEntries(kShort)} for k-shortest (n=10K, k=8)`);
    const fits = entries <= 16000;
    statFit.set(fits ? 'Fits ASIC' : 'Use per-dst O(nh)', fits ? 'Under 4–16K predefined ECMP ceiling' : 'Exceeds 16K predefined limit (§5)');
    statFit.querySelector('.stat-value')?.classList.toggle('is-own', fits);
    statFit.querySelector('.stat-value')?.classList.toggle('is-warn', !fits);
  }

  const savingsRows = [
    ['1:1 (non-blocking)', '~9%', 9, 'Non-blocking fat trees waste little; gain is shorter paths'],
    ['3:1 (typical cloud)', 'up to 45%', 45, 'Peak savings (RNG §9.4, Fig. 13 & Fig. 14)'],
    ['7:1 – 15:1 (oversubscribed)', 'tapers down', 20, 'Fat tree upper tiers shrink, reducing headroom to cut'],
  ].map(([labelText, valueText, pctWidth, detailText]) => {
    const fill = h('span', { class: 'rng-bar-fill' });
    fill.style.width = `${pctWidth}%`;
    return h(
      'li',
      { class: 'rng-sav-row' },
      h('div', { class: 'rng-sav-top' }, h('span', {}, labelText), h('b', {}, valueText)),
      h('span', { class: 'rng-sav-track', 'aria-hidden': 'true' }, fill),
      h('p', { class: 'rng-sav-detail' }, detailText),
    );
  });

  const prodFacts = h(
    'ul',
    { class: 'rng-facts' },
    [
      '<1.5% miscabling incidence in production patch-panel builds (§8)',
      '4.4 µs max latency diff across 2-hop spread (300m, 100G) — erased by 6 packets of queuing (§5)',
      'Production parity with fat trees on multipath throughput, 64B PPS, and storage IOPS (Fig. 9–10)',
    ].map((t) => h('li', {}, t)),
  );

  const compTable = h(
    'div',
    { class: 'rng-tbl-wrap' },
    h(
      'table',
      { class: 'rng-table' },
      h('thead', {}, h('tr', {}, ['Dimension', 'Google Jupiter (CACM 2016)', 'Amazon RNG (arXiv 2026)'].map((c) => h('th', { scope: 'col' }, c)))),
      h('tbody', {}, JUPITER_VS_RNG.map(([dim, jup, rngCol]) => h('tr', {}, h('th', { scope: 'row' }, dim), h('td', {}, jup), h('td', {}, rngCol)))),
    ),
  );

  paintCompare();
  paintMath();

  body.append(
    h('p', { class: 'rng-source' }, 'Bernardi et al., Amazon Web Services (arXiv 2026) · Deployed in production as AWS’s default general-purpose fabric (§1, §8)'),
    debateBox(
      'Every fabric in Units 1–3 was a Clos tree with ToR, aggregation, and spine layers. Amazon replaced that hierarchy in production with a flat random graph of ToRs (RNG, 2026) — up to 45% cheaper. Why did it take 14 years after Jellyfish, and how do you wire and route it?',
      'Three blockers stood in the way: (1) routing — Spraypoint fans out at the source and funnels via waypoints in 8.2K commodity ECMP entries instead of 320K k-shortest-path entries; (2) cabling — passive ShuffleBoxes + ShuffleBacks fold inter-room links into fat-tree complexity; (3) predictability — closed-form models give exact path diversity and oversubscription without huge simulations (§1, §5–§7).',
    ),
    illustrationLabel('The 12-ToR comparison below is a small live graph after RNG Figure 1 (§2); production figures cite Bernardi et al. (2026).'),
    h('div', { class: 'rng-toolbar' }, modeControl, sprayToggle),
    h(
      'div',
      { class: 'rng-pair' },
      h(
        'article',
        { class: 'rng-card' },
        h('header', { class: 'rng-card-head' }, h('h3', {}, 'Hierarchical Fat Tree (3:1)'), fatBadge),
        h('div', { class: 'rng-scroll' }, fat.el),
      ),
      h(
        'article',
        { class: 'rng-card' },
        h('header', { class: 'rng-card-head' }, h('h3', {}, 'Flat Expander / RNG'), expBadge),
        h('div', { class: 'rng-scroll' }, exp.el),
      ),
    ),
    pathLegend,
    takeaway,
    h('h3', { class: 'deck-title' }, 'Three blockers that kept expanders in academia for 14 years'),
    deck,
    h('h3', { class: 'deck-title' }, 'Spraypoint math & cost savings'),
    h(
      'div',
      { class: 'rng-analytics' },
      h(
        'article',
        { class: 'rng-panel' },
        h('h4', {}, 'Spraypoint Path Diversity (Model 7.1, §5)'),
        h('div', { class: 'rng-math-controls' }, dControl, hControl),
        h('div', { class: 'stats' }, statPaths, statShare, statMem, statFit),
      ),
      h(
        'article',
        { class: 'rng-panel' },
        h('h4', {}, 'Switch Savings vs. 3-Tier Fat Tree (§9.4, Fig. 14)'),
        h('ul', { class: 'rng-sav-list' }, savingsRows),
        prodFacts,
      ),
    ),
    h('h3', { class: 'deck-title' }, 'Jupiter (2015) vs. RNG (2026)'),
    compTable,
    h(
      'div',
      { class: 'rng-close' },
      h('p', { class: 'rng-close-label' }, 'To close'),
      h(
        'ul',
        {},
        h('li', {}, 'RNG deletes every aggregation and spine switch — yet AWS explicitly warns that large-scale AI training may still want rail-optimized fat trees (§2). What does an AI training cluster need that a random graph lacks?'),
        h('li', {}, 'In RNG, ToRs relay traffic for each other, so you cannot upgrade too many neighbors at once (§8). Would you trade operational simplicity for 45% fewer switches?'),
      ),
    ),
  );

  return { show() {} };
}

export const rng = {
  id: 'rng',
  title: 'Reserve · RNG: flat datacenter networks at scale',
  short: 'RNG',
  hidden: false,
  mount,
};

export default rng;
