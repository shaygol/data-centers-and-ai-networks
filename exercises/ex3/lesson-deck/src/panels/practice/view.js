// Theory vs practice (v2): Unit 1's fat tree on one side, Jupiter's reality on the other.
// Students name what would break first; each card opens only when the class gets there.
import { h, debateBox } from '../../shell/ui.js';
import { renderBlock } from '../walk/blocks.js';
import { zoomFigure } from '../../editions/v2/figures.js';
import fatTree from '../../editions/v2/figs/fat-tree.jpg';
import fig8 from '../../editions/v2/figs/fig-8.jpg';
import { GAPS } from './model.js';
import { revealDeck } from './reveal.js';
import { growTheFabric } from '../../labs/story/grow.js';
import { growthSeries } from '../../labs/story/model.js';

// The phrases each card's quote highlights (Shay's deck).
const GAP_MARKS = {
  identical: ['in situ', 'heterogeneous hardware and speeds'],
  'built-at-once': ['incremental deployment', 'forklifting existing clusters stranded hosts'],
  'full-bisection': ['intentionally kept oversubscribed to save cost'],
  wiring: ['thousands of cables invariably leads to multiple cabling errors'],
  'cabling-cost': ['deployment challenges with the external copper cabling'],
  control: ['did not converge without manual intervention', 'contended for limited CPU resources on embedded switch CPUs', 'snowball effect'],
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

// Unit 1's fat tree beside Jupiter's building blocks: the same idea, then the gaps below.
const theoryPractice = () => {
  const pic = (src, alt, label, cite) => {
    const img = h('img', { src, alt, loading: 'lazy' });
    img.addEventListener('click', () => zoomFigure(src, alt));
    return h('figure', { class: 'pp-fig' }, h('p', { class: 'pp-label' }, label), img, h('figcaption', {}, cite));
  };
  return h(
    'div',
    { class: 'practice-pair' },
    pic(fatTree, 'A fat tree with k = 4: four pods, each with two aggregation and two edge switches, under four core switches', 'In theory: a fat tree (Unit 1)', 'Al-Fares et al., Figure 3. Click to enlarge.'),
    pic(fig8, 'Jupiter building blocks: merchant silicon, Centauri, Middle Block, spine block and aggregation block', 'In practice: Jupiter (Unit 3)', 'Jupiter, Figure 8. Click to enlarge.'),
  );
};

function mount(root, ctx) {
  const deck = revealDeck({
    key: 'practice',
    openLabel: 'What happened at Google?',
    cards: GAPS.map((gap) => ({ id: gap.id, head: [h('span', { class: 'deck-label' }, 'In theory'), h('span', { class: 'deck-theory' }, gap.theory)], body: body(gap) })),
  });
  root.append(
    debateBox('In Unit 1, the fat tree looked perfect on paper. Which of its assumptions break when Google builds it for real?'),
    theoryPractice(),
    h('h3', { class: 'deck-title' }, 'Grow the fabric: what Google built, 2004 to 2012'),
    growTheFabric(growthSeries()),
    h('h3', { class: 'deck-title' }, 'Six gaps'),
    deck,
  );
  return { show() {} };
}

export default { id: 'practice', title: 'Theory vs practice: the fat tree and Jupiter', short: 'Theory vs practice', hidden: false, mount };
