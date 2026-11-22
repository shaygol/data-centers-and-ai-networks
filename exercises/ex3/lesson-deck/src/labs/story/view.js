// Generations (v2): the five generations after the 2004 network as one story. Each chapter:
// a debate question, the topology, then (on reveal) what improved and what went wrong,
// and Table 2 for this generation beside the one before only.
import { h, heldBack, debateBox } from '../../shell/ui.js';
import { renderBlock, markText } from '../../panels/walk/blocks.js';
import { CHAPTERS, chapter, previous, comparison, diffCell } from './model.js';
import { topologyDiagram } from './drawing.js';
import { scopeDiagram } from './scope.js';
import { insideBlocks } from './inside.js';
import { legacyImage, figBlock, CHAPTER_FIGS } from '../../editions/v2/figures.js';

const sourced = (items) => h('ul', { class: 'st-list' }, items.map((i) => h('li', {}, i.marks ? markText(i.text, i.marks) : i.text, ' ', h('span', { class: 'st-source' }, `(${i.source})`))));

const nowCell = (r, two) => (!two || !r.changed ? [r.now] : diffCell(r.before, r.now).flatMap((s, k) => [k ? ' ' : null, s.changed ? h('mark', { class: 'st-diff' }, s.text) : s.text]));

function compareTable(c) {
  const { head, rows } = comparison(c);
  const two = head[0] != null;
  return h(
    'div',
    { class: 'st-table-wrap' },
    h(
      'table',
      { class: 'st-compare', id: `st-compare-${c.id}` },
      h('caption', {}, two ? `Table 2: ${head[0]} → ${head[1]}` : `Table 2: ${head[1]}`),
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, ''), two ? h('th', { scope: 'col' }, head[0]) : null, h('th', { scope: 'col' }, head[1]))),
      h(
        'tbody',
        {},
        rows.map((r) =>
          h('tr', { class: r.changed ? 'is-changed' : '' }, h('th', { scope: 'row' }, r.label), two ? h('td', {}, r.before) : null, h('td', {}, ...nowCell(r, two))),
        ),
      ),
    ),
    two ? h('p', { class: 'st-compare-key' }, 'Bold rows changed; yellow marks what changed. Servers per ToR is from the paper’s text, not Table 2.') : null,
    c.buildingBlocks ? h('div', { class: 'st-blocks' }, h('h4', {}, 'How the building blocks changed'), sourced(c.buildingBlocks)) : null,
  );
}

function chapterView(c, go) {
  const before = previous(c);
  const index = CHAPTERS.indexOf(c);

  const reveal = heldBack(
    { id: 'st-reveal', label: before ? 'Reveal: what improved, and what went wrong' : c.challenges.length ? 'Reveal: what went wrong' : 'Reveal: the paper’s words' },
    c.improved
      ? h('section', { class: 'st-improved' }, h('h4', {}, `Improved over ${before.name}`), sourced(c.improved))
      : null,
    c.challenges.length ? h('section', { class: 'st-challenges' }, h('h4', {}, 'Challenges'), sourced(c.challenges)) : null,
    c.noPassage ? null : h('div', { class: 'walk-clips' }, renderBlock({ type: 'quote', lead: null, ...c.quote })),
    c.followup ? renderBlock({ type: 'followup', question: c.followup }) : null,
    c.next ? h('p', { class: 'st-next-teaser' }, h('b', {}, 'Where this leads: '), c.next) : null,
  );

  return h(
    'article',
    { class: 'st-chapter', id: `st-chapter-${c.id}` },
    h('p', { class: 'st-kicker' }, `Chapter ${index + 1} of ${CHAPTERS.length} · ${c.year}`),
    h('h3', { class: 'st-title' }, c.name),
    debateBox(c.debate, c.debateReply),
    h(
      'div',
      { class: 'st-grid' },
      h(
        'div',
        { class: 'st-left' },
        c.id === 'legacy' ? legacyImage() : topologyDiagram(c),
        c.scope ? scopeDiagram() : null,
        insideBlocks(c),
        (c.figureOnly ? [] : c.insideDebates ?? []).map((d) => debateBox(d.question, d.reply, d.label)),
        figBlock(CHAPTER_FIGS[c.id], c.stackFigures),
        c.topology.notes.length && !c.figureOnly ? h('ul', { class: 'st-notes' }, c.topology.notes.map((n) => h('li', {}, n))) : null,
      ),
      h('div', { class: 'st-right' }, compareTable(c), reveal),
    ),
    // The chapter pager moved to the deck's Previous / Next bar (one step per chapter).
  );
}

function mount(body) {
  const box = h('div', { class: 'st-current' });
  body.append(box);
  // Paging clicks the shell's own chapter button, so the route and the strip stay in step.
  const go = (id) => {
    body.closest('[data-tab]')?.querySelector(`[data-experiment="${id}"]`)?.click();
    window.scrollTo?.(0, 0);
  };
  return {
    run(id) {
      box.replaceChildren(chapterView(chapter(id), go));
    },
  };
}

export default {
  id: 'generations',
  number: 2,
  title: 'Five generations',
  short: 'Generations',
  paper: 'Jupiter',
  source: 'Jupiter §2–§3.3, §4.1, Tables 1–2, Figs. 3–9',
  hidden: false,
  idea: 'One story, 2004 to 2012: each generation fixed what the last one taught Google, and ran into something new.',
  illustration: 'Diagrams are schematic: a few numbered boxes stand for each layer, with the paper’s counts beside them. Counts the paper does not give are marked.',
  stripLabel: 'Chapters',
  defaultExperiment: 'legacy',
  experiments: CHAPTERS.map((c) => ({ id: c.id, label: `${c.year} ${c.name}`, note: c.hook })),
  mount,
};
