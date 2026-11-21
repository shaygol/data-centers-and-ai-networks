// Theory vs practice (v2): Unit 1's fat tree on one side, Jupiter's reality on the other.
// Students name what would break first; each card opens only when the class gets there.
import { h, jumpButton, debateBox } from '../../shell/ui.js';
import { renderBlock } from '../walk/blocks.js';
import { passageBlocks } from '../../editions/v2/debate.js';
import { GAPS } from './model.js';
import { revealDeck } from './reveal.js';

// The phrases each card's quote highlights (Shay's deck).
const GAP_MARKS = {
  identical: ['in situ', 'heterogeneous hardware and speeds'],
  'built-at-once': ['incremental deployment', 'forklifting existing clusters stranded hosts'],
  'full-bisection': ['intentionally kept oversubscribed to save cost'],
  wiring: ['thousands of cables invariably leads to multiple cabling errors'],
  'cabling-cost': ['deployment challenges with the external copper cabling'],
  'even-load': ['imperfect flow hashing especially during failures'],
  buffers: ['limited buffering'],
  control: ['did not converge without manual intervention', 'contended for limited CPU resources on embedded switch CPUs', 'snowball effect'],
  scale: ['principally limited by failure domain considerations and control plane scalability'],
};

// "Jupiter §6.1 (ii); fixes: …" becomes a §6.1 chip and the rest of the line.
const citeOf = (gap) => ({ section: (gap.source.match(/§[\d.]+/) ?? ['§'])[0], label: gap.source.replace(/^Jupiter\s*§[\d.]+[;,]?\s*/, '') });

function body(gap) {
  return [
    h('p', { class: 'deck-practice' }, h('b', {}, 'In practice: '), gap.practice),
    h('div', { class: 'walk walk-clips' }, renderBlock({ type: 'quote', lead: gap.lead ?? null, text: gap.quote, cite: citeOf(gap), marks: GAP_MARKS[gap.id] ?? [] })),
    gap.later ? h('p', { class: 'deck-later' }, h('span', { class: 'deck-chip' }, 'After the paper'), ' ', gap.later.text, ' ', h('cite', {}, gap.later.source)) : null,
  ];
}

function mount(root, ctx) {
  const deck = revealDeck({
    key: 'practice',
    openLabel: 'What happened at Google?',
    cards: GAPS.map((gap) => ({ id: gap.id, head: [h('span', { class: 'deck-label' }, 'In theory'), h('span', { class: 'deck-theory' }, gap.theory)], body: body(gap) })),
  });
  root.append(
    debateBox('In Unit 1, the fat tree looked perfect on paper. Which of its assumptions break when Google builds it for real?'),
    passageBlocks('s3'),
    h('h3', { class: 'deck-title' }, 'Nine gaps'),
    deck,
    h(
      'div',
      { class: 'practice-labs' },
      h('p', {}, 'Two cards have a demo: the uneven load after a failure, and drops at low average load.'),
      jumpButton(ctx, { tab: 'clos', arg: 'link-failure', returnArg: 'top', label: 'Open Clos failures: link failure' }),
      jumpButton(ctx, { tab: 'congestion', arg: 'burst-low-load', returnArg: 'top', label: 'Open Congestion: burst at low load' }),
    ),
  );
  return { show() {} };
}

export default { id: 'practice', title: 'Theory vs practice: the fat tree and Jupiter', short: 'Theory vs practice', hidden: false, mount };
