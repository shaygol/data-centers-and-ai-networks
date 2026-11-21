// Lab 2 model: pure logic, no DOM. A small Clos with shortest-path ECMP. Values here are
// illustrations, not paper results. One unit of load is one link's capacity.

// ToRs connect to every aggregation switch in their block. Each block reaches every spine
// block once, as in Firehose (Jupiter §3.1), so a spine touches one switch per block.
export function clos({ blocks = 4, torsPerBlock = 2, aggsPerBlock = 2, uplinksPerAgg = 2 } = {}) {
  const nodes = [];
  const links = [];
  const addLink = (a, b, tier) => links.push({ id: `${a}-${b}`, a, b, tier });
  const spineCount = aggsPerBlock * uplinksPerAgg;
  for (let i = 1; i <= spineCount; i += 1) nodes.push({ id: `S${i}`, tier: 'spine', block: null });
  for (let block = 0; block < blocks; block += 1) {
    const aggs = [];
    for (let i = 0; i < aggsPerBlock; i += 1) {
      const id = `A${block * aggsPerBlock + i + 1}`;
      aggs.push(id);
      nodes.push({ id, tier: 'agg', block: block + 1 });
      for (let j = 0; j < uplinksPerAgg; j += 1) addLink(id, `S${i * uplinksPerAgg + j + 1}`, 'spine');
    }
    for (let i = 0; i < torsPerBlock; i += 1) {
      const id = `T${block * torsPerBlock + i + 1}`;
      nodes.push({ id, tier: 'tor', block: block + 1 });
      for (const agg of aggs) addLink(id, agg, 'tor');
    }
  }
  return { nodes, links, params: { blocks, torsPerBlock, aggsPerBlock, uplinksPerAgg } };
}

export const isSpine = (net, id) => net.nodes.find((n) => n.id === id)?.tier === 'spine';

// `failed` lists elements by id: a spine ('S1') or a link ('A1-S1').
export const isDown = (link, failed = []) =>
  failed.includes(link.id) || failed.includes(link.a) || failed.includes(link.b);

// What each switch computes from link state: distance to the destination, then every neighbor
// one step closer (Jupiter §5.2). Failed elements are gone from every switch's view.
function nextHops(net, dst, failed) {
  const neighbors = new Map(net.nodes.map((n) => [n.id, []]));
  for (const l of net.links) {
    if (isDown(l, failed)) continue;
    neighbors.get(l.a).push(l.b);
    neighbors.get(l.b).push(l.a);
  }
  const distance = new Map([[dst, 0]]);
  const queue = [dst];
  while (queue.length) {
    const at = queue.shift();
    for (const next of neighbors.get(at)) {
      if (!distance.has(next)) {
        distance.set(next, distance.get(at) + 1);
        queue.push(next);
      }
    }
  }
  const hops = new Map();
  for (const [id, d] of distance) {
    hops.set(id, neighbors.get(id).filter((n) => distance.get(n) === d - 1));
  }
  return { hops, distance };
}

// Each path's share comes from splitting evenly at every switch along it.
export function equalCostPaths(net, src, dst, failed = []) {
  const { hops } = nextHops(net, dst, failed);
  const paths = [];
  const walk = (at, nodes, share) => {
    if (at === dst) {
      paths.push({ nodes, share });
      return;
    }
    const next = hops.get(at) ?? [];
    for (const n of next) walk(n, [...nodes, n], share / next.length);
  };
  walk(src, [src], 1);
  return { paths };
}

export const pair = (src, dst, rate) => [{ src, dst, rate }];

// Every ToR sends `rate` units, split evenly across every other ToR.
export function allToAll(net, rate) {
  const tors = net.nodes.filter((n) => n.tier === 'tor').map((n) => n.id);
  return tors.flatMap((src) =>
    tors.filter((dst) => dst !== src).map((dst) => ({ src, dst, rate: rate / (tors.length - 1) })),
  );
}

// Fluid traffic with an even split at every switch. Loads above 1 are offered, not carried:
// the model keeps them so the overload stays visible.
export function route(net, demands, failed = []) {
  const directed = new Map();
  const balance = new Map(net.nodes.map((n) => [n.id, { received: 0, sent: 0, sourced: 0, sunk: 0 }]));
  let offered = 0;
  let delivered = 0;
  for (const { src, dst, rate } of demands) {
    offered += rate;
    const { hops, distance } = nextHops(net, dst, failed);
    if (!distance.has(src)) continue;
    delivered += rate;
    balance.get(src).sourced += rate;
    balance.get(dst).sunk += rate;
    const arriving = new Map([[src, rate]]);
    const furthestFirst = [...distance.keys()].sort((a, b) => distance.get(b) - distance.get(a));
    for (const at of furthestFirst) {
      const flow = arriving.get(at) ?? 0;
      if (flow === 0 || at === dst) continue;
      const next = hops.get(at);
      for (const n of next) {
        const part = flow / next.length;
        const key = `${at}>${n}`;
        directed.set(key, (directed.get(key) ?? 0) + part);
        arriving.set(n, (arriving.get(n) ?? 0) + part);
        balance.get(at).sent += part;
        balance.get(n).received += part;
      }
    }
  }
  return { offered, delivered, unreachable: offered - delivered, directed, balance };
}

// A link's load is its busier direction. Busiest first, failed links last.
export function linkLoads(net, demands, failed = []) {
  const { directed } = route(net, demands, failed);
  const rows = net.links.map((l) => ({
    ...l,
    down: isDown(l, failed),
    load: Math.max(directed.get(`${l.a}>${l.b}`) ?? 0, directed.get(`${l.b}>${l.a}`) ?? 0),
  }));
  return rows.sort((x, y) => Number(x.down) - Number(y.down) || y.load - x.load);
}

// `fits` is the share of offered traffic that arrives with no link overloaded, if every sender
// slows down equally until the busiest link is exactly full.
export function summary(net, demands, failed = []) {
  const { offered, delivered, unreachable } = route(net, demands, failed);
  const loads = linkLoads(net, demands, failed);
  const busiest = loads[0];
  const spineLinks = loads.filter((l) => l.tier === 'spine');
  const headroom = busiest.load > 1 ? 1 / busiest.load : 1;
  return {
    offered,
    delivered,
    unreachable,
    busiest,
    spineLinksUp: spineLinks.filter((l) => !l.down).length,
    spineLinksTotal: spineLinks.length,
    fits: offered > 0 ? (delivered / offered) * headroom : 0,
  };
}

// What one spine block is worth, at any size.
export const spineShareLost = (spines) => 1 / spines;
