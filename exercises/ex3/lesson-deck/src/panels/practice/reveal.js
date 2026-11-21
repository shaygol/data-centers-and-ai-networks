// A deck of cards whose answers stay hidden until the presenter opens them, one at a time or all at once.
// Shared by Theory vs practice and Why OpenFlow. Card: { id, head (node), body (node) }.
import { h } from '../../shell/ui.js';

export function revealDeck({ key, cards, openLabel, allLabel = 'Open all', resetLabel = 'Close all' }) {
  const items = cards.map((card, i) => {
    const content = h('div', { class: 'deck-body', id: `${key}-${card.id}-body`, hidden: true }, card.body);
    const button = h('button', { type: 'button', class: 'deck-open', id: `${key}-${card.id}-open`, 'aria-expanded': 'false', 'aria-controls': content.id }, openLabel);
    const el = h('li', { class: 'deck-card', 'data-card': card.id }, h('div', { class: 'deck-head' }, h('span', { class: 'deck-n' }, String(i + 1)), h('div', { class: 'deck-head-text' }, card.head), button), content);
    el.set = (open) => {
      content.hidden = !open;
      button.hidden = open;
      button.setAttribute('aria-expanded', String(open));
      el.classList.toggle('is-open', open);
    };
    button.addEventListener('click', () => el.set(true));
    return el;
  });
  const setAll = (open) => items.forEach((item) => item.set(open));
  const tools = h(
    'div',
    { class: 'deck-tools' },
    h('button', { type: 'button', id: `${key}-all`, onclick: () => setAll(true) }, allLabel),
    h('button', { type: 'button', id: `${key}-reset`, onclick: () => setAll(false) }, resetLabel),
  );
  const el = h('div', { class: 'deck' }, h('ol', { class: 'deck-list' }, items), tools);
  el.reset = () => setAll(false);
  return el;
}
