// Generations model: Table 2 and each generation's structure. Pure logic and paper data, no DOM.
// Sources are sections, figures and tables of "Jupiter Rising" (CACM 2016).

// Table 2's cells, spelled as the paper spells them.
const row = (name, firstDeployed, merchantSilicon, torConfig, aggConfig, spineConfig, fabricSpeed, hostSpeed, bisection) => ({
  name, firstDeployed, merchantSilicon, torConfig, aggConfig, spineConfig, fabricSpeed, hostSpeed, bisection,
});

// A tier's drawing: groups side by side, each holding rows of switches, top row first.
const rows = (...counts) => [counts.map((count) => ({ count }))];
const tiles = (count, tile, more = false) => [[{ count, tile, more }]];

export const GENERATIONS = [
  {
    id: 'legacy',
    table: row('Legacy network', '2004', 'Vendor', '48x1G', '–', '–', '10G', '1G', '2T'),
    structure: [
      {
        kind: 'routers',
        name: 'Vendor routers',
        count: 'Count not in paper',
        groups: tiles(4, 'R'),
        parts: 'Table 2 lists no aggregation or spine block. Fig. 5 draws the legacy network as a row of routers.',
        source: 'Table 2, Fig. 5',
        illustrative: 'The paper doesn’t describe this tier’s layout.',
        linkBelow: { speedGbps: 1, label: '4x1G' },
      },
      {
        kind: 'tor',
        name: 'ToR',
        count: '40 servers each',
        groups: tiles(6, 'T', true),
        parts: '40 servers at 1 Gb/s on each ToR, with about 10:1 structural oversubscription.',
        source: '§2',
        linkBelow: { speedGbps: 1, label: '40 servers at 1G' },
      },
    ],
    facts: [
      { text: 'The cluster delivered 100 Mb/s among 20k servers.', source: '§2' },
      { text: 'High bandwidth applications had to fit under a single ToR to avoid the oversubscribed uplinks.', source: '§2' },
    ],
  },
  {
    id: 'firehose-1.0',
    table: row('Firehose 1.0', '2005', '8x10G 4x10G (ToR)', '2x10G up 24x1G down', '2x32x10G (B)', '32x10G (NB)', '10G', '1G', '10T'),
    structure: [
      {
        kind: 'spine',
        name: 'Spine block',
        count: '32 blocks',
        groups: rows(4, 8),
        parts: '4 stage 5 boards over 8 lower-stage boards, with 32x10G toward 32 aggregation blocks.',
        source: '§3.1, Fig. 3',
        linkBelow: { speedGbps: 10, label: '32x10G per block' },
      },
      {
        kind: 'agg',
        name: 'Aggregation block',
        count: '32 blocks',
        groups: [...rows(4, 4), ...rows(4, 4)],
        parts: 'Two groups of 8 boards, with 32x10G toward 32 spine blocks. Each block hosts 16 ToRs.',
        source: '§3.1, Fig. 3',
        linkBelow: { speedGbps: 10, label: '2x10G per ToR' },
      },
      {
        kind: 'tor',
        name: 'ToR',
        count: '16 per aggregation block',
        groups: rows(16),
        parts: 'Stage 1 boards with 2x10G up and 24x1G down.',
        source: '§3.1, Fig. 3',
        linkBelow: { speedGbps: 1, label: '24x1G to servers' },
      },
    ],
    facts: [
      { text: 'The goal was 1 Gbps of nonblocking bisection bandwidth to each of 10K servers.', source: '§3.1' },
      { text: 'Switching was built into servers on a PCI board. It never carried production traffic.', source: '§3.1' },
    ],
  },
  {
    id: 'firehose-1.1',
    table: row('Firehose 1.1', '2006', '8x10G', '4x10G up 48x1G down', '64x10G (B)', '32x10G (NB)', '10G', '1G', '10T'),
    structure: [
      {
        kind: 'spine',
        name: 'Spine block',
        count: '32 blocks',
        groups: rows(4, 8),
        parts: 'Table 2 gives the same 32x10G (NB) as Firehose 1.0.',
        source: 'Table 2, Fig. 4',
        illustrative: 'Fig. 4 shows only the aggregation block, so the boards are drawn as in Firehose 1.0.',
        linkBelow: { speedGbps: 10, label: '32x10G per block' },
      },
      {
        kind: 'agg',
        name: 'Aggregation block',
        count: 'Block count not in paper',
        groups: rows(8, 8),
        parts: 'One group of 16 linecards, wired differently from Firehose 1.0, with 32x10G toward 32 spine blocks.',
        source: 'Fig. 4',
        linkBelow: { speedGbps: 10, label: '4x10G per ToR' },
      },
      {
        kind: 'tor',
        name: 'Buddied ToR',
        count: '16 per aggregation block',
        groups: Array.from({ length: 8 }, () => [{ count: 2 }]),
        parts: 'Fig. 4 gives each buddied ToR 2x10G up, 2x10G side and 48x1G down. Fig. 5 and Table 2 give 4x10G up. Fig. 5 runs to 512 racks.',
        source: 'Table 2, Figs. 4–5',
        linkBelow: { speedGbps: 1, label: '48x1G to servers' },
      },
    ],
    facts: [
      { text: 'The first production deployment of a custom cluster fabric, with switch chips moved out of servers.', source: '§3.1' },
      { text: 'It ran beside the legacy network, with 4x1G to the legacy routers and 4x10G to the fabric, and a Big Red Button to avoid Firehose uplinks.', source: '§3.1, Fig. 5' },
      { text: 'The main drawback was deploying the external copper cabling.', source: '§3.2' },
    ],
  },
  {
    id: 'watchtower',
    table: row('Watchtower', '2008', '16x10G', '4x10G up 48x1G down', '4x128x10G (NB)', '128x10G (NB)', '10G', 'nx1G', '82T'),
    structure: [
      {
        kind: 'spine',
        name: 'Spine block',
        count: 'Block count not in paper',
        groups: tiles(8, 'LC'),
        parts: 'A 128x10G chassis: 8 linecards with 3 chips each, joined by a backplane.',
        source: '§3.2, Fig. 6',
        illustrative: 'Drawn as one chassis to match Table 2’s 128x10G.',
        linkBelow: { speedGbps: 10, label: '10G links' },
      },
      {
        kind: 'agg',
        name: 'Aggregation block',
        count: 'Block count not in paper',
        groups: tiles(4, 'Chassis'),
        parts: 'Four 128x10G chassis, each non-blocking inside.',
        source: 'Table 2, Fig. 6',
        illustrative: 'The paper doesn’t say how the four chassis connect inside a block.',
        linkBelow: { speedGbps: 10, label: '4x10G per ToR' },
      },
      {
        kind: 'tor',
        name: 'ToR',
        count: 'Count not in paper',
        groups: tiles(6, 'T', true),
        parts: '4x10G up and 48x1G down.',
        source: 'Table 2',
        illustrative: 'The number of ToRs per aggregation block isn’t in the paper.',
        linkBelow: { speedGbps: 1, label: '48x1G to servers' },
      },
    ],
    facts: [
      { text: 'Denser 16x10G chips made a traditional chassis with a backplane possible.', source: '§3.2' },
      { text: 'Fiber cabling made deployment substantially easier than the earlier Firehose deployments.', source: '§3.2' },
    ],
  },
  {
    id: 'saturn',
    table: row('Saturn', '2009', '24x10G', '24x10G', '4x288x10G (NB)', '288x10G (NB)', '10G', 'nx10G', '207T'),
    structure: [
      {
        kind: 'spine',
        name: 'Spine block',
        count: 'Block count not in paper',
        groups: tiles(12, 'LC'),
        parts: 'A 288x10G non-blocking chassis with 12 linecards.',
        source: '§3.2, Fig. 7',
        illustrative: 'Drawn as one chassis to match Table 2’s 288x10G.',
        linkBelow: { speedGbps: 10, label: '10G links' },
      },
      {
        kind: 'agg',
        name: 'Aggregation block',
        count: 'Block count not in paper',
        groups: tiles(4, 'Chassis'),
        parts: 'Four 288x10G chassis, each non-blocking inside.',
        source: 'Table 2, Fig. 7',
        illustrative: 'The paper doesn’t say how the four chassis connect inside a block.',
        linkBelow: { speedGbps: 10, label: '4x10G per ToR by default' },
      },
      {
        kind: 'tor',
        name: 'Pluto ToR',
        count: 'Count not in paper',
        groups: tiles(6, 'T', true),
        parts: 'A single 24x10G chip: by default 20 servers and 4x10G up.',
        source: '§3.2, Fig. 7',
        illustrative: 'The number of ToRs per aggregation block isn’t in the paper.',
        linkBelow: { speedGbps: 10, label: '20 servers at 10G' },
      },
    ],
    facts: [
      { text: 'Pluto’s default gives each server 2 Gbps on average. With 8x10G up and 16x10G to servers, it gives 5 Gbps.', source: '§3.2' },
      { text: 'Servers could burst at 10 Gbps across the fabric for the first time.', source: '§3.2' },
    ],
  },
  {
    id: 'jupiter',
    table: row('Jupiter', '2012', '16x40G', '16x40G', '8x128x40G (B)', '128x40G (NB)', '10/40G', 'nx10G/nx40G', '1.3P'),
    structure: [
      {
        kind: 'spine',
        name: 'Spine block',
        count: '256 blocks',
        groups: tiles(6, 'C'),
        parts: 'Six Centauris, with 128x40G toward 64 aggregation blocks.',
        source: '§3.3, Fig. 8',
        linkBelow: { speedGbps: 40, label: '2x40G per block pair' },
      },
      {
        kind: 'agg',
        name: 'Aggregation block',
        count: '64 blocks at most',
        groups: tiles(8, 'MB'),
        parts: 'Eight Middle Blocks, with 512x40G toward 256 spine blocks. Each is four Centauris in a 2-stage blocking network.',
        source: '§3.3, Fig. 8',
        linkBelow: { speedGbps: 10, label: '2x10G per ToR chip per MB' },
      },
      {
        kind: 'tor',
        name: 'Centauri ToR',
        count: '32 per aggregation block',
        groups: tiles(6, 'C', true),
        parts: 'Four chips. In one configuration, each chip has 48x10G to servers and 16x10G to the fabric.',
        source: '§3.3, Fig. 8',
        linkBelow: { speedGbps: 10, label: '48x10G per chip to servers' },
      },
    ],
    facts: [
      { text: 'It needed to scale more than 6x the size of the largest existing fabric, deployed incrementally on heterogeneous hardware.', source: '§3.3' },
      { text: 'Dual redundant links at the largest scale allow local reconvergence on a single link failure.', source: '§3.3' },
      { text: 'Servers could be configured with 40G burst bandwidth for the first time in production.', source: '§3.3' },
    ],
  },
];

export const generation = (id) => GENERATIONS.find((g) => g.id === id);

export const tableRow = (gen) => gen.table;

// Blocking follows Table 2's marks: B or NB on a block, none on a ToR or the legacy routers.
function stageOf(config) {
  if (config.endsWith('(B)')) return 'blocking';
  if (config.endsWith('(NB)')) return 'nonblocking';
  return 'unmarked';
}

const CONFIG_COLUMN = { spine: 'spineConfig', agg: 'aggConfig', tor: 'torConfig', routers: 'aggConfig' };

// A generation's tiers, top down, each with its Table 2 cell and blocking mark.
export function tiers(gen) {
  return gen.structure.map((t) => {
    const config = gen.table[CONFIG_COLUMN[t.kind]];
    return { ...t, config, stage: stageOf(config) };
  });
}

const UNITS = { T: 1e12, P: 1e15 };

export function parseBandwidth(text) {
  return Number(text.slice(0, -1)) * UNITS[text.slice(-1)];
}

function formatBandwidth(bitsPerSecond) {
  const unit = bitsPerSecond >= UNITS.P ? 'P' : 'T';
  return `${Number((bitsPerSecond / UNITS[unit]).toFixed(2))}${unit}`;
}

// Where the paper gives the factors, Table 2's bisection value can be checked by multiplying them.
const BISECTION_FACTORS = {
  legacy: { expression: '20k × 100 Mb/s', bitsPerSecond: 20000 * 100e6, source: '§2' },
  'firehose-1.0': { expression: '32 × 32 × 10G', bitsPerSecond: 32 * 32 * 10e9, source: '§3.1' },
  jupiter: { expression: '64 × 512 × 40G', bitsPerSecond: 64 * 512 * 40e9, source: '§3.3' },
};

export function derivedBisection(gen) {
  const factors = BISECTION_FACTORS[gen.id];
  return factors ? { ...factors, label: formatBandwidth(factors.bitsPerSecond) } : null;
}

// Derived from Table 2. Always reads from the earlier generation to the later one.
export function growth(a, b) {
  const [from, to] = GENERATIONS.indexOf(a) <= GENERATIONS.indexOf(b) ? [a, b] : [b, a];
  const factor = parseBandwidth(to.table.bisection) / parseBandwidth(from.table.bisection);
  return {
    from,
    to,
    factor,
    label: `${Number(factor.toFixed(factor < 10 ? 1 : 0))}×`,
    years: Number(to.table.firstDeployed) - Number(from.table.firstDeployed),
  };
}

const SCALE_MIN = 1e12;
const SCALE_MAX = 2e15;
const scalePosition = (value) => Math.log10(value / SCALE_MIN) / Math.log10(SCALE_MAX / SCALE_MIN);

// Table 2's bisection values on a log axis. Generations with equal values share a point.
export function bisectionScale() {
  const points = [];
  for (const gen of GENERATIONS) {
    const { bisection, name } = gen.table;
    const shared = points.find((p) => p.label === bisection);
    if (shared) {
      shared.ids.push(gen.id);
      shared.name += `, ${name.split(' ').at(-1)}`;
    } else {
      points.push({ ids: [gen.id], name, label: bisection, position: scalePosition(parseBandwidth(bisection)) });
    }
  }
  const ticks = [['1T', 1e12], ['10T', 1e13], ['100T', 1e14], ['1P', 1e15]].map(([label, value]) => ({
    label,
    position: scalePosition(value),
  }));
  return { points, ticks };
}

const CHANGE_FIELDS = [
  ['merchantSilicon', 'Merchant silicon'],
  ['torConfig', 'ToR'],
  ['aggConfig', 'Aggregation block'],
  ['spineConfig', 'Spine block'],
  ['fabricSpeed', 'Fabric speed'],
  ['hostSpeed', 'Host speed'],
  ['bisection', 'Bisection BW'],
];

// The Table 2 cells that differ between two generations, earlier first.
export const changedFields = (a, b) =>
  CHANGE_FIELDS.filter(([key]) => a.table[key] !== b.table[key]).map(([key, label]) => ({
    label,
    from: a.table[key],
    to: b.table[key],
  }));
