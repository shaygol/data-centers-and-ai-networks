// The position split: counts of A, B and C from the show of hands in class, with no names. No DOM here.
export const OPTIONS = [
  { id: 'a', letter: 'A', name: 'Fully distributed', detail: 'Every switch builds its own view and computes its own tables (OSPF, IS-IS, BGP)' },
  { id: 'b', letter: 'B', name: 'Google’s split', detail: 'A central master distributes the topology, and every switch computes its own tables (Firepath)' },
  { id: 'c', letter: 'C', name: 'Fully centralized', detail: 'A central controller computes the tables and installs them in every switch (OpenFlow-style)' },
];

const isCount = (n) => Number.isInteger(n) && n >= 0;

export function parseCount(raw) {
  const text = String(raw).trim();
  return /^\d+$/.test(text) ? Number(text) : null;
}

export function normalizeSplit(stored) {
  return Object.fromEntries(OPTIONS.map(({ id }) => [id, isCount(stored?.[id]) ? stored[id] : null]));
}

// Percentages are rounded to whole numbers, so they can sum to 99 or 101.
export function summarize(split) {
  const counts = OPTIONS.map(({ id }) => split[id] ?? 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const rows = OPTIONS.map((option, i) => ({
    ...option,
    count: counts[i],
    percent: total === 0 ? 0 : Math.round((counts[i] / total) * 100),
  }));
  return { rows, total, empty: total === 0, nobodyChose: total === 0 ? [] : rows.filter((r) => r.count === 0).map((r) => r.id) };
}
