// Paper evidence as blocks, shared by the stops and the scenario split's challenges.
// Block: { type: 'text', text } | { type: 'list', title, items } | { type: 'table', title, head, rows }
//   | { type: 'callout', label, text, derived } | { type: 'followup', question, reply }
//   | { type: 'quote', lead, text, cite?, marks? }: the paper's exact words; lead is the paper's own run-in heading,
//     cite { section, label } a caption, marks exact phrases of text to highlight
import { h } from '../../shell/ui.js';

// How a quote's source line reads. v1: "Section 3.1 · Firehose". v2 (Shay's deck) shows the
// section as a chip: "§3.1 Firehose". An edition opts in once, from its registry.
let sectionChips = false;
export const useSectionChips = () => { sectionChips = true; };
const citeLine = (cite) =>
  sectionChips
    ? h('p', { class: 'stop-quote-cite' }, h('b', { class: 'sec-chip' }, cite.section.replace(/^Section\s*/, '§')), ` ${cite.label}`)
    : h('p', { class: 'stop-quote-cite' }, h('b', {}, cite.section), ` · ${cite.label}`);

// Splits text around each mark (exact substring, first occurrence) so they render as <mark>.
export function markText(text, marks = []) {
  const hits = marks
    .map((m) => ({ m, at: text.indexOf(m) }))
    .filter(({ m, at }) => {
      if (at < 0) throw new Error(`Mark not found in quote: ${m}`);
      return true;
    })
    .sort((a, b) => a.at - b.at);
  const parts = [];
  let pos = 0;
  for (const { m, at } of hits) {
    if (at < pos) throw new Error(`Overlapping mark: ${m}`);
    if (at > pos) parts.push(text.slice(pos, at));
    parts.push(h('mark', {}, m));
    pos = at + m.length;
  }
  if (pos < text.length) parts.push(text.slice(pos));
  return parts;
}

function renderQuote(block) {
  return h(
    'blockquote',
    { class: 'stop-quote' },
    h('span', { class: 'tape', 'aria-hidden': 'true' }),
    h('p', {}, block.lead ? h('b', {}, `${block.lead} `) : null, ...markText(block.text, block.marks)),
    block.cite ? citeLine(block.cite) : null,
  );
}

const derivedChip = () => h('span', { class: 'derived-chip' }, 'Derived');

function renderTable({ title, head, rows }) {
  return h(
    'div',
    { class: 'stop-block' },
    title ? h('h4', {}, title) : null,
    h(
      'div',
      { class: 'stop-table-scroll' },
      h(
        'table',
        { class: 'stop-table' },
        h('thead', {}, h('tr', {}, head.map((cell) => h('th', { scope: 'col' }, cell)))),
        h(
          'tbody',
          {},
          rows.map(([first, ...rest]) => h('tr', {}, h('th', { scope: 'row' }, first), rest.map((cell) => h('td', {}, cell)))),
        ),
      ),
    ),
  );
}

export function renderBlock(block) {
  switch (block.type) {
    case 'text':
      return h('p', { class: 'stop-text' }, block.text);
    case 'list':
      return h(
        'div',
        { class: 'stop-block' },
        block.title ? h('h4', {}, block.title) : null,
        h('ul', { class: 'stop-list' }, block.items.map((item) => h('li', {}, item))),
      );
    case 'table':
      return renderTable(block);
    case 'callout':
      return h(
        'div',
        { class: 'stop-callout' },
        h('p', { class: 'callout-label' }, block.label, block.derived ? derivedChip() : null),
        h('p', {}, block.text),
      );
    case 'quote':
      return renderQuote(block);
    case 'followup':
      return h(
        'div',
        { class: 'stop-callout' },
        h('p', { class: 'callout-label' }, 'Follow-up'),
        h('p', { class: 'followup-question' }, block.question),
        block.reply ? h('details', {}, h('summary', {}, "The paper's reply"), h('p', {}, block.reply)) : null,
      );
    default:
      throw new Error(`Unknown block type: ${block.type}`);
  }
}
