// Part 2: Position, done in class. The question and the link-failure explorer come from the
// partner's homework page, kept as they were; below them, the presenters enter the show of hands.
import { h } from '../../shell/ui.js';
import { OPTIONS, parseCount, normalizeSplit, summarize } from './model.js';
import { mountExplorer } from './explorer.js';

const STORE_KEY = 'position-split';
const OPENING = 'Let’s hear from each camp. Which section did you cite, and what does it actually say?';
const TONES = { a: 'relay', b: 'own', c: 'idle' };

const tr = (...cells) => h('tr', {}, cells.map((c) => h('td', {}, c)));

function part2(explorer) {
  return h(
    'section',
    { class: 'part2' },
    h('p', {}, 'Firepath centralizes the topology state but lets each switch compute its own forwarding table (§5.2). Suppose you are designing the control plane for a datacenter fabric of thousands of switches, like the ones in the paper.'),
    h('p', {}, h('b', {}, '2a.'), ' Which would you build? Choose one. Play the three options below first: each one reacts to a failed link in its own way.'),
    explorer,
    h(
      'div',
      { class: 'part2-table-wrap' },
      h(
        'table',
        { class: 'part2-table' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Option'), h('th', {}, 'Who holds the topology'), h('th', {}, 'Who computes the forwarding tables'))),
        h(
          'tbody',
          {},
          tr([h('b', {}, 'A.'), ' Fully distributed (OSPF, IS-IS or BGP)'], 'Every switch builds its own view from its neighbors', 'Every switch'),
          tr([h('b', {}, 'B.'), ' Google’s split (Firepath)'], 'A central master, which sends it to every switch', 'Every switch'),
          tr([h('b', {}, 'C.'), ' Fully centralized (OpenFlow-style)'], 'A central controller', 'The controller, which installs entries in every switch'),
        ),
      ),
    ),
    h('p', {}, h('b', {}, '2b.'), ' Why? In two or three sentences, argue for your choice and against at least one of the others. Cite at least two section numbers from §5 or §6.2.'),
    h('p', {}, h('b', {}, '2c.'), ' What would change your mind? Name one fact, measurement or failure that would make you switch to another option.'),
  );
}

function row(option) {
  const count = h('span', { class: 'split-count', id: `position-${option.id}-count` });
  const share = h('span', { class: 'split-share', id: `position-${option.id}-share` });
  const fill = h('span', { class: `split-fill tone-${TONES[option.id]}` });
  const el = h(
    'div',
    { class: 'split-row' },
    h(
      'div',
      { class: 'split-row-head' },
      h('span', { class: 'split-name' }, `${option.letter}. ${option.name}`, h('span', { class: 'split-detail' }, option.detail)),
      count,
      share,
    ),
    h('div', { class: 'split-track' }, fill),
  );
  el.set = (n, percent) => {
    count.textContent = String(n);
    share.textContent = `${percent}%`;
    fill.style.width = `${percent}%`;
  };
  return el;
}

function countInput(option, value, onInput) {
  const input = h('input', { type: 'number', id: `position-${option.id}`, min: '0', step: '1', inputmode: 'numeric' });
  if (value !== null) input.value = String(value);
  input.addEventListener('input', () => onInput(option.id, parseCount(input.value)));
  return h('label', { class: 'split-field', for: input.id }, h('span', {}, `${option.letter}. ${option.name}`), input);
}

function mount(body, ctx) {
  const split = normalizeSplit(ctx.store.get(STORE_KEY));
  const rows = new Map(OPTIONS.map((o) => [o.id, row(o)]));
  const total = h('p', { class: 'split-total', id: 'position-total' });
  const prompt = h('p', { class: 'split-prompt', id: 'position-prompt' });

  function draw() {
    const s = summarize(split);
    for (const r of s.rows) rows.get(r.id).set(r.count, r.percent);
    total.textContent = s.empty ? 'No split entered yet. Count the hands for 2a and enter them below.' : `${s.total} answers`;
    prompt.hidden = s.empty;
    const missing = s.rows.filter((r) => s.nobodyChose.includes(r.id)).map((r) => r.letter);
    prompt.textContent = missing.length
      ? `${OPENING} Nobody chose ${missing.join(' or ')}. If you had to argue for it, what would you say?`
      : OPENING;
  }

  const onInput = (id, value) => {
    split[id] = value;
    ctx.store.set(STORE_KEY, split);
    draw();
  };

  const explorer = h('div', { class: 'hv', id: 'position-explorer' });
  body.append(
    part2(explorer),
    h('h3', { class: 'split-heading' }, 'The class split for 2a'),
    h('div', { class: 'split-result' }, [...rows.values()]),
    total,
    prompt,
    h(
      'form',
      { class: 'split-form', onsubmit: (event) => event.preventDefault() },
      h('p', { class: 'split-form-title' }, 'Show of hands for 2a. Enter the count for each option.'),
      OPTIONS.map((o) => countInput(o, split[o.id], onInput)),
    ),
  );
  draw();
  mountExplorer(explorer);
  return { show() {} };
}

export default { id: 'position', title: 'Part 2: Position', short: 'Position', hidden: false, mount };
