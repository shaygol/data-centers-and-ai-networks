// Paper figures (Jupiter Rising, CACM '16), cropped from the PDF for classroom projection.
// From Shay's facilitator deck. Each one opens full screen on click.
import { h } from '../../shell/ui.js';
import fig3 from './figs/fig-3.jpg';
import fig4 from './figs/fig-4.jpg';
import fig5 from './figs/fig-5.jpg';
import fig6 from './figs/fig-6.jpg';
import fig7 from './figs/fig-7.jpg';
import fig8 from './figs/fig-8.jpg';
import fig9 from './figs/fig-9.jpg';
import fig11 from './figs/fig-11.jpg';
import fig12 from './figs/fig-12.jpg';
import legacy2004 from './figs/legacy-2004.jpg';

export const PAPER_FIGS = { 3: fig3, 4: fig4, 5: fig5, 6: fig6, 7: fig7, 8: fig8, 9: fig9, 11: fig11, 12: fig12 };
const FIG_SECTION = { 3: '§3.1', 4: '§3.1', 5: '§3.1', 6: '§3.2', 7: '§3.2', 8: '§3.3', 9: '§3.3', 11: '§5.2', 12: '§5.2' };
export const CHAPTER_FIGS = { 'firehose-1.0': [3], 'firehose-1.1': [4, 5], watchtower: [6], saturn: [7], jupiter: [8, 9] };

export function zoomFigure(src, alt) {
  const overlay = h('div', { class: 'fig-zoom', role: 'dialog', 'aria-label': alt, onclick: () => overlay.remove() }, h('img', { src, alt }));
  document.body.append(overlay);
}

export function legacyImage() {
  const alt = 'Google 2004 legacy datacenter network topology: four cluster routers with 10G sidelinks, ToR switches with 4x1G uplinks, 40 servers per ToR';
  const img = h('img', { src: legacy2004, alt });
  img.addEventListener('click', () => zoomFigure(legacy2004, alt));
  return h('figure', { class: 'paper-fig legacy-fig' }, img, h('figcaption', {}, 'The 2004 legacy network. Click to enlarge.'));
}

export function figBlock(nums) {
  if (!nums || !nums.length) return null;
  return h(
    'div',
    { class: 'paper-figs' },
    nums.map((n) => {
      const alt = `Figure ${n} from the paper`;
      const img = h('img', { src: PAPER_FIGS[n], alt, loading: 'lazy' });
      img.addEventListener('click', () => zoomFigure(PAPER_FIGS[n], alt));
      return h('figure', { class: 'paper-fig' }, img, h('figcaption', {}, h('span', { class: 'sec-chip' }, FIG_SECTION[n]), ` Figure ${n} from the paper. Click to enlarge.`));
    }),
  );
}
