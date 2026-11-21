// A page's key passage, quoted in place, and the shared debate box. From Shay's facilitator deck.
import { h, debateBox } from '../../shell/ui.js';
import { renderBlock } from '../../panels/walk/blocks.js';
import { STOPS } from './stops.js';
import { figBlock } from './figures.js';

export { debateBox };

// The quotes of one stop (all, or only those at the given indexes), open by default.
export function passageBlocks(stopId, only) {
  const stop = STOPS.find((x) => x.id === stopId);
  const quotes = (stop.blocks ?? []).filter((b) => b.type === 'quote').filter((_, k) => !only || only.includes(k));
  return h(
    'details',
    { class: 'walk walk-clips passage-embed', open: true },
    h('summary', {}, stop.kicker),
    quotes.flatMap((q, k) => [stop.blockTitles?.[k] ? h('h4', { class: 'passage-sub' }, stop.blockTitles[k]) : null, renderBlock(q)]),
    stop.figs ? figBlock(stop.figs) : null,
  );
}
