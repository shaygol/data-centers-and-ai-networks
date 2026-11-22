// Pure data and graph/analytical models for the Reserve: RNG slide (Bernardi et al., arXiv 2026).
// Zero DOM access so `node --test` can verify every graph and paper formula directly.

export const FAT_TREE_12 = (() => {
  const nodes = [];
  const links = [];
  for (let p = 0; p < 4; p += 1) {
    const a1 = `A${p * 2 + 1}`;
    const a2 = `A${p * 2 + 2}`;
    nodes.push({ id: a1, tier: 'agg', pod: p + 1 }, { id: a2, tier: 'agg', pod: p + 1 });
    links.push({ a: a1, b: 'S1', tier: 'spine' }, { a: a2, b: 'S2', tier: 'spine' });
    for (let i = 1; i <= 3; i += 1) {
      const t = `T${p * 3 + i}`;
      nodes.push({ id: t, tier: 'tor', pod: p + 1 });
      links.push({ a: t, b: a1, tier: 'tor' }, { a: t, b: a2, tier: 'tor' });
    }
  }
  nodes.push({ id: 'S1', tier: 'spine', pod: null }, { id: 'S2', tier: 'spine', pod: null });
  return {
    nodes,
    links,
    oversubscription: 3,
    // RNG §2: all-to-all across 12 ToRs sends 12*9 flows across 8 agg-spine links;
    // given 2 uplink units per ToR (12 total * 2? Wait: 2*(8/(12*9)) per flow? Exact RNG §2 eq: 11 * (8 / (12 * 9)) of ToR's 2 units -> stranded fraction 1 - 11*(8/108)/2).
    allToAllStranded: 1 - (11 * (8 / (12 * 9))) / 2,
  };
})();

const RAW_EXPANDER_EDGES = [
  ['T1', 'T4'], ['T1', 'T8'], ['T1', 'T11'],
  ['T2', 'T5'], ['T2', 'T9'], ['T2', 'T12'],
  ['T3', 'T6'], ['T3', 'T7'], ['T3', 'T10'],
  ['T4', 'T7'], ['T7', 'T10'], ['T10', 'T5'],
  ['T5', 'T8'], ['T8', 'T12'], ['T12', 'T6'],
  ['T6', 'T9'], ['T9', 'T11'], ['T11', 'T4'],
];

export const EXPANDER_12 = {
  nodes: Array.from({ length: 12 }, (_, i) => ({ id: `T${i + 1}`, tier: 'tor' })),
  links: RAW_EXPANDER_EDGES.map(([a, b]) => ({ a, b, tier: 'mesh' })),
  edges: RAW_EXPANDER_EDGES,
};

export const SPRAYPOINT_DEMO_PATHS = [
  { label: 'Path 1 (2 hops · shortest)', tone: 'p1', nodes: ['T1', 'T4', 'T7'] },
  { label: 'Path 2 (4 hops · via waypoint)', tone: 'p2', nodes: ['T1', 'T8', 'T5', 'T10', 'T7'] },
  { label: 'Path 3 (5 hops · via waypoint)', tone: 'p3', nodes: ['T1', 'T11', 'T9', 'T6', 'T3', 'T7'] },
];

const edgeKey = (u, v) => (u < v ? `${u}|${v}` : `${v}|${u}`);

export function cutSize(edges, subset) {
  const s = subset instanceof Set ? subset : new Set(subset);
  let cut = 0;
  for (const l of edges) {
    const a = Array.isArray(l) ? l[0] : l.a;
    const b = Array.isArray(l) ? l[1] : l.b;
    if (s.has(a) !== s.has(b)) cut += 1;
  }
  return cut;
}

export function shortestPaths(nodes, edges, src, dst, failed = []) {
  const dead = new Set(failed);
  if (dead.has(src) || dead.has(dst)) return [];
  const adj = new Map();
  for (const n of nodes) {
    const id = typeof n === 'string' ? n : n.id;
    if (!dead.has(id)) adj.set(id, []);
  }
  for (const l of edges) {
    const a = Array.isArray(l) ? l[0] : l.a;
    const b = Array.isArray(l) ? l[1] : l.b;
    if (!adj.has(a) || !adj.has(b)) continue;
    adj.get(a).push(b);
    adj.get(b).push(a);
  }
  const dist = new Map([[dst, 0]]);
  const queue = [dst];
  while (queue.length) {
    const u = queue.shift();
    for (const v of adj.get(u) ?? []) {
      if (!dist.has(v)) {
        dist.set(v, dist.get(u) + 1);
        queue.push(v);
      }
    }
  }
  if (!dist.has(src)) return [];
  const out = [];
  const walk = (u, path) => {
    if (u === dst) {
      out.push(path);
      return;
    }
    const want = dist.get(u) - 1;
    for (const v of adj.get(u) ?? []) {
      if (dist.get(v) === want) walk(v, [...path, v]);
    }
  };
  walk(src, [src]);
  return out;
}

export function areEdgeDisjoint(paths, edges) {
  const valid = new Set(edges.map((l) => edgeKey(Array.isArray(l) ? l[0] : l.a, Array.isArray(l) ? l[1] : l.b)));
  const used = new Set();
  for (const entry of paths) {
    const pts = Array.isArray(entry) ? entry : entry.nodes;
    if (pts.length < 2) return false;
    for (let i = 1; i < pts.length; i += 1) {
      const k = edgeKey(pts[i - 1], pts[i]);
      if (!valid.has(k) || used.has(k)) return false;
      used.add(k);
    }
  }
  return true;
}

export function failureImpact(graph, failedNode) {
  const links = graph.links ?? graph.edges;
  const lostLinks = links.filter((l) => {
    const a = Array.isArray(l) ? l[0] : l.a;
    const b = Array.isArray(l) ? l[1] : l.b;
    return a === failedNode || b === failedNode;
  }).length;

  const remainingTors = graph.nodes
    .filter((n) => n.tier === 'tor' && n.id !== failedNode)
    .map((n) => n.id);
  let connectedPairs = 0;
  let totalPairs = 0;
  if (remainingTors.length >= 2) {
    const root = remainingTors[0];
    const adj = new Map(graph.nodes.filter((n) => n.id !== failedNode).map((n) => [n.id, []]));
    for (const l of links) {
      const a = Array.isArray(l) ? l[0] : l.a;
      const b = Array.isArray(l) ? l[1] : l.b;
      if (a === failedNode || b === failedNode) continue;
      adj.get(a)?.push(b);
      adj.get(b)?.push(a);
    }
    const seen = new Set([root]);
    const q = [root];
    while (q.length) {
      const u = q.shift();
      for (const v of adj.get(u) ?? []) {
        if (!seen.has(v)) {
          seen.add(v);
          q.push(v);
        }
      }
    }
    totalPairs = (remainingTors.length * (remainingTors.length - 1)) / 2;
    const reachedTors = remainingTors.filter((t) => seen.has(t)).length;
    connectedPairs = (reachedTors * (reachedTors - 1)) / 2;
  }

  return {
    lostLinks,
    totalLinks: links.length,
    fractionLost: links.length ? lostLinks / links.length : 0,
    remainingTors: remainingTors.length,
    allConnected: connectedPairs === totalPairs,
  };
}

// Analytical models from Bernardi et al. (arXiv 2026) §3, §5, §6, §7.1:
export const edgeDisjointPaths = (d, h) => d * (1 - Math.exp(-h));
export const ecmpPredefinedEntries = (d, h) => h * (d ** h);
export const kShortestEntriesPerRouter = (n, k, avgHops = 4) => avgHops * k * n;
export const cablingEndpointPairs = (n, rooms) => n + (rooms * (rooms - 1)) / 2;

export const BLOCKERS = [
  {
    id: 'routing',
    label: 'Blocker 1 · Routing',
    title: 'Shortest-path fails on expanders; k-shortest needs too much ASIC memory',
    problem: 'A pair may have only 1 shortest path. k-shortest paths needs 4kn²/n = 320K entries for n=10K, k=8 — 20–80× larger than commodity 4–16K switch tables (§3).',
    solution: 'Spraypoint sprays at the source (VRF 1) across all neighbors, then points down deterministic waypoint trees toward the destination (VRF 2). Fits in 8.2K ECMP entries (h=2) on standard chips (§5).',
    cite: 'RNG §3, §5, Model 7.1',
  },
  {
    id: 'cabling',
    label: 'Blocker 2 · Cabling',
    title: 'Random point-to-point cables across rooms are an operational nightmare',
    problem: 'Connecting n switches directly needs O(n²) long inter-room cable pairs, and adding a rack forces breaking d/2 live links spread across the hall (§1, §6).',
    solution: 'A passive optical ShuffleBox + ShuffleBack panel per room reduces physical endpoint pairs from n(n−1)/2 to n + R(R−1)/2, matching fat-tree cabling complexity and adding racks incrementally (§6).',
    cite: 'RNG §1, §6, Fig. 4–6',
  },
  {
    id: 'predictability',
    label: 'Blocker 3 · Predictability',
    title: 'Operators could not size a random fabric without huge simulations',
    problem: 'Prior expander studies fixed concrete parameters; tuning oversubscription and path counts meant solving multi-hour linear programs across the design space (§1, §9.1).',
    solution: 'Quasi-random expansion + Spraypoint decorrelation yield closed-form models for disjoint paths, path lengths (≤5 hops at ℓ=1), and oversubscription r, matching LPs tightly (§7, Fig. 11).',
    cite: 'RNG §1, §7.1–7.4, §9.1',
  },
];

export const JUPITER_VS_RNG = [
  ['Topology', 'Multi-stage Clos / fat tree tiers (ToR → Agg → Spine)', 'Flat quasi-random expander mesh of ToRs (no agg/spine layers)'],
  ['Routing & Control', 'Firepath (central LSD) → Jupiter OpenFlow / Orion SDN stack', 'Fully distributed link-state Spraypoint (2 VRFs + ECMP hashing)'],
  ['Path Lengths', 'Equal-cost symmetry: 4 hops between cross-block ToRs', 'Variable 1–5 hops (mostly 3–4 at ℓ=1); 4.4 µs max diff absorbed by 6-pkt queue'],
  ['Physical Cabling', 'Structured Clos fanout + custom/commodity optical trunks', 'Passive optical ShuffleBox & ShuffleBack patch panels (<1.5% miscabling)'],
  ['Failure Blast Radius', 'Spine/agg failures reduce cross-pod cuts proportionally', 'No upper-tier bottlenecks; single failure removes only local 1/n links'],
  ['Cost & Fungibility', 'High bisection cost or stranded subtrees under skewed traffic', '9–45% fewer switches vs 3-tier fat trees via capacity fungibility (§9.4)'],
  ['Sweet Spot & Limits', 'Suited for regular AI rail-aligned collectives needing locality', 'AWS default for multi-tenant cloud workloads; less natural for rail-aligned AI (§2, §8)'],
];
