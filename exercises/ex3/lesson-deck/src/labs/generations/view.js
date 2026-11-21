// Lab 1: each generation drawn beside the one before it, with Table 2 below. Paper data only.
import { h } from '../../shell/ui.js';
import { GENERATIONS, generation, changedFields } from './model.js';
import { generationCard, table2, legend } from './drawing.js';

const NOTES = {
  legacy: 'The starting point in 2004: vendor routers over ToRs, and no Clos.',
  'firehose-1.0': 'The first Clos. Switching sat on PCI boards inside servers, and it never carried production traffic.',
  'firehose-1.1': 'The first production fabric. Compare it with Firehose 1.0: what moved?',
  watchtower: 'Same idea, denser chips. Compare the cabling with Firehose 1.1.',
  saturn: 'Bigger chips and a bigger fabric, as servers began to burst at 10 Gb/s.',
  jupiter: '40G links, and a fabric that reaches 1.3 Pb/s.',
};

function figure(gen) {
  const index = GENERATIONS.indexOf(gen);
  const before = index > 0 ? GENERATIONS[index - 1] : null;
  return h(
    'div',
    { class: 'gens-figure' },
    h('div', { class: `gens-panels${before ? '' : ' is-single'}` }, before ? generationCard(before) : null, generationCard(gen)),
    legend(),
    before
      ? h(
          'div',
          { class: 'gens-changes', id: `gens-changes-${gen.id}` },
          h('h4', {}, `Changed since ${before.table.name}, Table 2`),
          h('ul', {}, changedFields(before, gen).map((c) => h('li', {}, h('b', {}, `${c.label}: `), `${c.from} → ${c.to}`))),
        )
      : null,
    h(
      'ul',
      { class: 'gens-facts', id: `gens-facts-${gen.id}` },
      gen.facts.map((fact) => h('li', {}, fact.text, ' ', h('span', { class: 'gens-fact-source' }, `(${fact.source})`))),
    ),
  );
}

function mount(body, ctx) {
  const box = h('div', { class: 'gens-current' });
  const table = table2((id) => {
    show(id);
    ctx.clearExperiment();
  });
  body.append(box, table);

  function show(id) {
    const gen = generation(id);
    box.replaceChildren(figure(gen));
    const index = GENERATIONS.indexOf(gen);
    table.highlight(GENERATIONS.slice(Math.max(index - 1, 0), index + 1).map((g) => g.id));
  }

  return { run: show };
}

export default {
  id: 'generations',
  number: 1,
  title: 'Generations',
  short: 'Generations',
  paper: 'Jupiter',
  source: 'Jupiter §2–§3.3, Table 2, Figs. 2–9',
  hidden: false,
  idea: 'Each generation kept the Clos and changed what the last one taught: where the switches live, the chips, the cabling and the link speed.',
  illustration: 'Drawings are schematic, built from Table 2 and the paper’s figures. Switch counts are drawn at reduced scale, and tiers the paper does not fully describe are marked.',
  defaultExperiment: 'firehose-1.0',
  experiments: GENERATIONS.map((gen) => ({ id: gen.id, label: gen.table.name, note: NOTES[gen.id] })),
  mount,
};
