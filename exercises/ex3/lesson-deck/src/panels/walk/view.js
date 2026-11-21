// One stop at a time: its debate question, fields, evidence and the labs it opens.
// Stop: id, nav (strip text), kicker, title, source, question, reply (optional),
//   fields: [{ label, text }], blocks: [block], side: [block], figureBlocks: [block] (under the drawing),
//   jumps: [{ tab, arg, prompt, label (optional button text) }].
import { h, jumpButton } from '../../shell/ui.js';
import { LABS } from '../../labs/index.js';
import { createWalk } from './model.js';
import { renderBlock } from './blocks.js';

const labFor = (tab) => LABS.find((lab) => lab.id === tab);

function renderStop(key, stop, ctx, figure) {
  const art = figure?.(stop) ?? null;
  const columns = ['stop-columns', art ? 'has-figure' : '', stop.side?.length ? 'has-side' : '', !art && !stop.side?.length ? 'is-wide' : ''];
  return h(
    'article',
    { class: 'stop', id: `${key}-stop-${stop.id}`, 'data-stop': stop.id, hidden: true },
    h('p', { class: 'stop-kicker' }, stop.kicker),
    h('h3', { class: 'stop-title' }, stop.title),
    h(
      'div',
      { class: 'stop-question' },
      h('span', { class: 'stop-question-label' }, 'Debate'),
      stop.question,
      stop.reply ? h('details', {}, h('summary', {}, "The paper's reply"), stop.reply) : null,
    ),
    h(
      'div',
      { class: 'stop-body' },
      h(
        'div',
        { class: columns.filter(Boolean).join(' ') },
        h(
          'div',
          { class: 'stop-main' },
          h(
            'div',
            { class: 'stop-fields' },
            stop.fields.map((field) => h('div', { class: 'stop-field' }, h('h4', {}, field.label), h('p', {}, field.text))),
          ),
          (stop.blocks ?? []).map(renderBlock),
          h('p', { class: 'stop-source' }, `Source: ${stop.source}`),
        ),
        stop.side?.length ? h('div', { class: 'stop-side' }, stop.side.map(renderBlock)) : null,
        art ? h('div', { class: 'stop-figure' }, art, (stop.figureBlocks ?? []).map(renderBlock)) : null,
      ),
    ),
    stop.jumps?.length
      ? h(
          'div',
          { class: 'stop-labs' },
          stop.jumps.map((jump) =>
            h(
              'div',
              { class: 'stop-lab' },
              h('p', {}, jump.prompt),
              jumpButton(ctx, { tab: jump.tab, arg: jump.arg, returnArg: stop.id, label: jump.label ?? `Open ${labFor(jump.tab).title}` }),
            ),
          ),
        )
      : null,
  );
}

// key prefixes element ids, since two walks share the page. figure(stop) may draw beside the text.
export function mountWalk(body, ctx, { key, stops, figure, onChange, variant }) {
  const walk = createWalk(stops);
  const navButtons = new Map();
  const nodes = stops.map((stop) => renderStop(key, stop, ctx, figure));
  body.classList.add('walk');
  if (variant) body.classList.add(`walk-${variant}`);

  function refresh() {
    const current = walk.current();
    for (const node of nodes) node.hidden = node.dataset.stop !== current.id;
    for (const [id, button] of navButtons) {
      if (id === current.id) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
    previous.disabled = walk.atStart();
    next.disabled = walk.atEnd();
    onChange?.(current);
  }

  const move = (fn) => () => {
    fn();
    refresh();
    window.scrollTo?.(0, 0);
  };
  const previous = h('button', { type: 'button', id: `${key}-previous`, onclick: move(walk.previous) }, 'Previous');
  const next = h('button', { type: 'button', id: `${key}-next`, onclick: move(walk.next) }, 'Next');

  const nav = h(
    'nav',
    { class: 'stop-nav', 'aria-label': 'Stops' },
    previous,
    h(
      'div',
      { class: 'stop-nav-group' },
      stops.map((stop) => {
        const button = h(
          'button',
          { type: 'button', id: `${key}-nav-${stop.id}`, 'data-stop-nav': stop.id, 'aria-label': stop.title, onclick: move(() => walk.goTo(stop.id)) },
          stop.nav,
        );
        navButtons.set(stop.id, button);
        return button;
      }),
    ),
    next,
  );

  body.append(nav, ...nodes);
  refresh();

  return {
    show(id) {
      if (walk.goTo(id)) refresh();
    },
  };
}
