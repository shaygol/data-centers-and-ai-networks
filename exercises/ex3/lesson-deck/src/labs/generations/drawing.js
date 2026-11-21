// A generation's drawing, Table 2 and the legend. All values and structure come from model.js.
import { h, svg, onActivate } from '../../shell/ui.js';
import { GENERATIONS, tableRow, tiers, derivedBisection } from './model.js';

const DIAGRAM_W = 760;
const TEXT_X = 4;
const BLOCK_X = 256;
const BLOCK_W = 496;
const TILE_H = 36;
const ROW_GAP = 26;
const PAD = 10;
const LINK_GAP = 60;
const SERVER_GAP = 50;
const GROUP_GAP = 14;
const LINE_H = 23;

const LINK_WIDTH = { 1: 2, 10: 4.5, 40: 10 };
const STAGE_TEXT = { blocking: 'Blocking', nonblocking: 'Non-blocking' };

const tierHeight = (t) => {
  const rowCount = Math.max(...t.groups.map((group) => group.length));
  return PAD * 2 + rowCount * TILE_H + (rowCount - 1) * ROW_GAP;
};

// Top-of-tier y for every tier, plus the diagram's full height.
function layOutTiers(list) {
  let y = 10;
  const tops = list.map((t, i) => {
    const top = y;
    const minimum = i === list.length - 1 ? 0 : tierTextHeight(t) + 12 - LINK_GAP;
    y += Math.max(tierHeight(t), minimum) + LINK_GAP;
    return top;
  });
  const last = list.at(-1);
  const lastTop = tops.at(-1);
  const height = Math.max(lastTop + tierHeight(last) + SERVER_GAP + 8, lastTop + tierTextHeight(last));
  return { tops, height };
}

const tierTextHeight = (t) => (3 + (STAGE_TEXT[t.stage] ? 1 : 0) + (t.illustrative ? 1 : 0)) * LINE_H;

function drawTiles(t, top) {
  const parts = [];
  const centres = [];
  const inner = BLOCK_W - PAD * 2 - (t.groups.length - 1) * GROUP_GAP;
  const groupW = inner / t.groups.length;
  const tone = t.kind === 'tor' ? 'tile-tor' : 'tile-upper';
  t.groups.forEach((group, g) => {
    const groupX = BLOCK_X + PAD + g * (groupW + GROUP_GAP);
    const rowCentres = group.map((row, r) => {
      const slots = row.count + (row.more ? 1 : 0);
      const pitch = Math.min(groupW / slots, 118);
      const tileW = pitch - Math.min(8, pitch * 0.18);
      const startX = groupX + (groupW - pitch * slots) / 2 + (pitch - tileW) / 2;
      const y = top + PAD + r * (TILE_H + ROW_GAP);
      const xs = Array.from({ length: row.count }, (_, i) => startX + i * pitch);
      return { xs, y, tileW, row, pitch };
    });
    rowCentres.slice(1).forEach((lower, i) => {
      const upper = rowCentres[i];
      const n = lower.xs.length;
      const allToAll = upper.xs.length * n <= 32;
      upper.xs.forEach((ux, u) => {
        const targets = allToAll ? lower.xs.map((_, l) => l) : [0, 1, 2, 3].map((k) => (u + k) % n);
        for (const l of targets) {
          parts.push(svg('line', {
            class: 'gens-inner',
            x1: ux + upper.tileW / 2, y1: upper.y + TILE_H,
            x2: lower.xs[l] + lower.tileW / 2, y2: lower.y,
          }));
        }
      });
    });
    for (const { xs, y, tileW, row, pitch } of rowCentres) {
      xs.forEach((x) => {
        parts.push(svg('rect', { class: `gens-tile ${tone}`, x, y, width: tileW, height: TILE_H }));
        if (row.tile) {
          parts.push(svg('text', { class: `gens-tile-text ${tone}`, x: x + tileW / 2, y: y + TILE_H / 2 + 6, 'text-anchor': 'middle' }, row.tile));
        }
        centres.push(x + tileW / 2);
      });
      if (row.more) {
        parts.push(svg('text', { class: 'gens-more', x: xs.at(-1) + pitch + tileW / 2, y: y + TILE_H / 2 + 6, 'text-anchor': 'middle' }, '…'));
      }
    }
  });
  return { parts, centres };
}

const fanAnchors = (count = 4) =>
  Array.from({ length: count }, (_, i) => BLOCK_X + 50 + (i * (BLOCK_W - 100)) / (count - 1));

function drawFan(link, y1, y2) {
  const width = LINK_WIDTH[link.speedGbps];
  return fanAnchors().flatMap((ux) =>
    fanAnchors().map((lx) => svg('line', { class: 'gens-link', x1: ux, y1, x2: lx, y2, 'stroke-width': width })),
  );
}

// Sits on a plate so it stays readable over the link fan. y is the label's vertical centre.
function linkLabel(text, y) {
  const x = BLOCK_X + BLOCK_W / 2;
  const width = text.length * 10 + 18;
  return [
    svg('rect', { class: 'gens-link-plate', x: x - width / 2, y: y - 13, width, height: 26 }),
    svg('text', { class: 'gens-link-label', x, y: y + 6, 'text-anchor': 'middle' }, text),
  ];
}

// Diagonal hatch for a blocking stage, cut to the rectangle so it needs no pattern or clip reference.
function hatch(x, y, width, height, step) {
  const lines = [];
  for (let c = step; c < width + height; c += step) {
    const u1 = Math.min(c, width);
    const v2 = Math.min(c, height);
    lines.push(svg('line', { class: 'gens-hatch-line', x1: x + u1, y1: y + c - u1, x2: x + c - v2, y2: y + v2 }));
  }
  return lines;
}

function tierText(t, top) {
  let y = top + 19;
  const lines = [];
  const next = () => {
    const at = y;
    y += LINE_H;
    return at;
  };
  lines.push(svg('text', { class: 'gens-tier-name', x: TEXT_X, y: next() }, t.name));
  lines.push(svg('text', { class: 'gens-tier-config', x: TEXT_X, y: next() }, t.kind === 'routers' ? 'Table 2: –' : t.config));
  if (STAGE_TEXT[t.stage]) {
    const at = next();
    lines.push(
      svg('rect', { class: `gens-swatch stage-${t.stage}`, x: TEXT_X + 1, y: at - 14, width: 17, height: 16 }),
      ...(t.stage === 'blocking' ? hatch(TEXT_X + 1, at - 14, 17, 16, 6) : []),
      svg('text', { class: `gens-tier-stage stage-text-${t.stage}`, x: TEXT_X + 25, y: at }, STAGE_TEXT[t.stage]),
    );
  }
  lines.push(svg('text', { class: 'gens-tier-count', x: TEXT_X, y: next() }, t.count));
  if (t.illustrative) {
    const at = next();
    lines.push(
      svg('rect', { class: 'gens-illus-chip', x: TEXT_X, y: at - 16, width: 92, height: 21 }),
      svg('text', { class: 'gens-illus-text', x: TEXT_X + 6, y: at }, 'Illustrative'),
    );
  }
  return lines;
}

function drawTier(t, top) {
  const height = tierHeight(t);
  const isBlock = t.kind === 'spine' || t.kind === 'agg';
  const stack = isBlock
    ? [8, 4].map((offset) =>
        svg('rect', { class: 'gens-stack', x: BLOCK_X + offset, y: top - offset, width: BLOCK_W - offset, height }),
      )
    : [];
  const frame = svg('rect', {
    class: `gens-block stage-${t.stage}${t.illustrative ? ' is-illustrative' : ''}`,
    'data-tier': t.kind,
    'data-stage': t.stage,
    x: BLOCK_X, y: top, width: BLOCK_W, height,
  });
  const hatching = t.stage === 'blocking' ? hatch(BLOCK_X, top, BLOCK_W, height, 15) : [];
  const { parts, centres } = drawTiles(t, top);
  return { nodes: [...stack, frame, ...hatching, ...parts], centres, height };
}

function diagram(gen) {
  const list = tiers(gen);
  const { tops, height } = layOutTiers(list);
  const links = [];
  const blocks = [];
  const texts = [];
  const labels = [];
  list.forEach((t, i) => {
    const top = tops[i];
    const { nodes, centres, height: blockH } = drawTier(t, top);
    blocks.push(...nodes);
    texts.push(...tierText(t, top));
    const bottom = top + blockH;
    if (i < list.length - 1) {
      const nextTop = tops[i + 1];
      links.push(...drawFan(t.linkBelow, bottom, nextTop));
      labels.push(...linkLabel(t.linkBelow.label, (bottom + nextTop) / 2));
    } else {
      const width = LINK_WIDTH[t.linkBelow.speedGbps];
      const barY = bottom + SERVER_GAP - 12;
      for (const x of centres) {
        links.push(svg('line', { class: 'gens-link', x1: x, y1: bottom, x2: x, y2: barY, 'stroke-width': width }));
      }
      links.push(svg('rect', { class: 'gens-servers', x: BLOCK_X, y: barY, width: BLOCK_W, height: 10 }));
      labels.push(...linkLabel(t.linkBelow.label, bottom + 19));
    }
  });
  const describe = list
    .map((t) => `${t.name} ${t.config}${STAGE_TEXT[t.stage] ? `, ${STAGE_TEXT[t.stage].toLowerCase()}` : ''}`)
    .join('; ');
  return svg(
    'svg',
    { class: 'gens-diagram', viewBox: `0 0 ${DIAGRAM_W} ${height}`, role: 'img', 'aria-label': `${gen.table.name} structure: ${describe}` },
    links,
    blocks,
    labels,
    texts,
  );
}

// One generation: its name, year, bisection and drawing.
export function generationCard(gen) {
  const row = tableRow(gen);
  const math = derivedBisection(gen);
  return h(
    'article',
    { class: 'gens-panel', 'data-generation': gen.id },
    h(
      'div',
      { class: 'gens-title' },
      h('h4', {}, row.name),
      h('span', { class: 'gens-year' }, row.firstDeployed),
      h('span', { class: 'gens-bisection' }, `Bisection ${row.bisection}`),
    ),
    h('div', { class: 'gens-scroll' }, diagram(gen)),
    math ? h('p', { class: 'gens-derived' }, `Derived: ${math.expression} = ${math.label} (${math.source})`) : null,
  );
}

const TABLE_COLUMNS = [
  ['name', 'Datacenter generation'],
  ['firstDeployed', 'First deployed'],
  ['merchantSilicon', 'Merchant silicon'],
  ['torConfig', 'ToR config'],
  ['aggConfig', 'Aggregation block config'],
  ['spineConfig', 'Spine block config'],
  ['fabricSpeed', 'Fabric speed'],
  ['hostSpeed', 'Host speed'],
  ['bisection', 'Bisection BW'],
];

export function table2(onPick) {
  const rows = GENERATIONS.map((gen) => {
    const data = tableRow(gen);
    const tr = h(
      'tr',
      { 'data-generation': gen.id, id: `gens-row-${gen.id}`, tabindex: '0', role: 'button', 'aria-label': `Go to ${data.name}` },
      TABLE_COLUMNS.map(([key], i) => {
        const value = data[key];
        const mark = value.endsWith('(B)') ? 'mark-b' : value.endsWith('(NB)') ? 'mark-nb' : null;
        const content = mark ? h('span', { class: mark }, value) : value;
        return i === 0 ? h('th', { scope: 'row' }, content) : h('td', { 'data-column': key }, content);
      }),
    );
    onActivate(tr, () => onPick(gen.id));
    return tr;
  });
  const el = h(
    'div',
    { class: 'gens-table-box' },
    h(
      'table',
      { class: 'gens-table', id: 'gens-table' },
      h('caption', {}, 'Table 2. Click a row to go to that generation. B indicates blocking and NB nonblocking.'),
      h('thead', {}, h('tr', {}, TABLE_COLUMNS.map(([, label]) => h('th', { scope: 'col' }, label)))),
      h('tbody', {}, rows),
    ),
  );
  el.highlight = (ids) => {
    for (const r of rows) r.classList.toggle('is-on', ids.includes(r.dataset.generation));
  };
  return el;
}

export const legend = () =>
  h(
    'ul',
    { class: 'gens-legend', 'aria-label': 'Legend for the drawings' },
    h('li', {}, h('span', { class: 'key key-blocking' }), 'Blocking (B)'),
    h('li', {}, h('span', { class: 'key key-nonblocking' }), 'Non-blocking (NB)'),
    h('li', {}, h('span', { class: 'key key-unmarked' }), 'No mark in Table 2'),
    h('li', {}, h('span', { class: 'key-link key-link-1' }), '1G'),
    h('li', {}, h('span', { class: 'key-link key-link-10' }), '10G'),
    h('li', {}, h('span', { class: 'key-link key-link-40' }), '40G links'),
  );
