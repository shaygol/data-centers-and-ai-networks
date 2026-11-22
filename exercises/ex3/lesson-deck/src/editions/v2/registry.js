// v2: Shay's facilitator deck. Two 50-minute hours. Hour 1: homework review, passage 1 (traffic)
// and passage 2 (Firepath to OpenFlow). Hour 2: passage 3 (generations) and passage 4 (theory vs
// practice). Clos, congestion and RNG are held in reserve. A Previous / Next bar walks the steps in order.
import { h } from '../../shell/ui.js';
import { useSectionChips } from '../../panels/walk/blocks.js';
import generations from '../../labs/story/view.js';
import { CHAPTERS } from '../../labs/story/model.js';
import closLab from '../../labs/clos/view.js';
import congestionLab from '../../labs/congestion/view.js';
import traffic from '../../labs/traffic/view.js';
import practice from '../../panels/practice/view.js';
import openflow from '../../panels/openflow/view.js';
import { homework, paperTab } from '../../panels/homework/view.js';
import rng from '../../panels/rng/view.js';
import { themeToggle } from './theme.js';

// Quotes cite their section as a chip ("§3.1"), here only.
useSectionChips();

// v2 keeps presenter instructions in the lesson plan, so the shared Clos lab drops its one on-screen cue here only.
const clos = {
  ...closLab,
  debate: {
    question: 'T1 to T7 has 4 equal-cost paths, one through each spine. If one spine fails, how much capacity do we lose?',
    reply: 'Losing 1 of 4 spines removes 4 of 16 spine links. At half rate nothing drops yet, though links on the remaining spine double from 43% to 86%. At 100% rate, only 58% fits. In Jupiter’s largest fabric (256 spine blocks, Fig. 8), one block is only ~0.4% of spine capacity.',
  },
  experiments: closLab.experiments.map((e) => (e.id === 'healthy' ? { ...e, note: e.note.replace(' Guess first, then click Spine failure.', '') } : e)),
};
const congestion = {
  ...congestionLab,
  debate: {
    question: 'Average utilization is low. Will anything drop?',
    reply: 'Microbursts still overflow small commodity buffers: with 25% average utilization over 60 ticks, a 90-packet burst spikes load to 410% on the busiest tick and drops 43 packets out of a 20-packet buffer. Combining ECN, a bounded congestion window, and dynamic buffer sharing cuts peak load to 130% and eliminates drops across 9 ticks (Jupiter §6.1).',
  },
};

export const VERSION_LABEL = 'Facilitator deck · v3 · Nov 2026';

const AGENDA = [
  ['Hour 1', 'Homework, Firepath to OpenFlow, and traffic', [
    ['Homework review: the JR-16 topology and the class questions', 'homework', null],
    ['Passage 1 · Firepath to OpenFlow: what Firepath centralized, and why Google moved', 'openflow', null],
    ['Passage 2 · Traffic growth: a network you could not buy, and Figure 1', 'traffic', null],
  ]],
  ['Hour 2', 'Generations, then theory against practice', [
    ['Passage 3 · Five generations, with the paper’s figures', 'generations', 'legacy'],
    ['Passage 4 · Theory vs practice: the fat tree against what Google ran into', 'practice', null],
    ['Wrap-up and bridge to Unit 4 (no page yet)', null, null],
  ]],
  ['Reserve', 'Only if there is time', [
    ['Clos multipath and failures', 'clos', null],
    ['Congestion and small buffers', 'congestion', null],
    ['RNG: flat datacenter networks at scale', 'rng', null],
  ]],
];

const start = {
  id: 'start',
  title: 'Agenda',
  short: 'Agenda',
  hidden: false,
  mount(body, ctx) {
    body.append(
      h(
        'div',
        { class: 'ag-hero' },
        h('p', { class: 'ag-kicker' }, 'Unit 3 · Part B · 2 × 50 minutes'),
        h('h3', { class: 'ag-title' }, 'Jupiter Rising'),
        h('p', { class: 'ag-tagline' }, 'A decade of Clos topologies and centralized control in Google’s datacenter network'),
      ),
      h('p', { class: 'ag-sub' }, 'Click a step to open it, or use Next.'),
      h(
        'div',
        { class: 'ag' },
        AGENDA.map(([hour, summary, items], k) =>
          h(
            'section',
            { class: `ag-card ag-${k}` },
            h('header', { class: 'ag-head' }, h('span', { class: 'ag-hour' }, hour), h('span', { class: 'ag-sum' }, summary)),
            h(
              'ol',
              { class: 'ag-list' },
              items.map(([text, tab, arg], n) =>
                h(
                  'li',
                  {},
                  h(
                    'button',
                    { type: 'button', class: 'ag-item', disabled: !tab, onclick: () => tab && ctx.go({ tab, arg }) },
                    h('span', { class: 'ag-n' }, String(n + 1)),
                    h('span', { class: 'ag-text' }, text),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    return { show() {} };
  },
};

export const LABS = [traffic, generations, clos, congestion];
export const PANELS = [start, homework, practice, openflow, rng, paperTab];
export const HOME = 'start';
export const TAB_GROUPS = [
  { label: 'Start', tabs: ['start'] },
  { label: 'Hour 1', tabs: ['homework', 'openflow', 'traffic'] },
  { label: 'Hour 2', tabs: ['generations', 'practice'] },
  { label: 'Reserve', tabs: ['clos', 'congestion', 'rng'] },
  { label: 'Reference', tabs: ['paper'] },
];

export const FLOW = [
  { tab: 'start', arg: null, label: 'Agenda' },
  { tab: 'homework', arg: null, label: 'Homework review' },
  { tab: 'openflow', arg: null, label: 'Firepath to OpenFlow · Passage 1' },
  { tab: 'traffic', arg: null, label: 'Traffic growth · Passage 2' },
  ...CHAPTERS.map((c) => ({ tab: 'generations', arg: c.id, label: `Generations · Passage 3 · ${c.year} ${c.name}` })),
  { tab: 'practice', arg: null, label: 'Theory vs practice · Passage 4' },
  { tab: 'clos', arg: null, label: 'Reserve: Clos failures' },
  { tab: 'congestion', arg: null, label: 'Reserve: Congestion' },
  { tab: 'rng', arg: null, label: 'Reserve: RNG' },
];
export const FLOW_DEFAULT_ARG = { generations: 'legacy' };
export const FACILITATOR_NOTE = ['Facilitator screen', 'for running the lesson in the room, not a student handout'];
export const onStart = themeToggle;

export const visibleTabs = (tabs) => tabs.filter((t) => !t.hidden);
