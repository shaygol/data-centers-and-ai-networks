// Why OpenFlow (v2): replaces the A/B/C position split. One open question, the facts it rests on,
// the v1 link-failure simulation for Firepath and OpenFlow only, and six clues opened one at a time.
// Presenter instructions live in the lesson plan, not on screen. No vote. Paper quotes sit on clippings.
import { h, debateBox } from '../../shell/ui.js';
import { passageBlocks } from '../../editions/v2/debate.js';
import { revealDeck } from '../practice/reveal.js';
import { renderBlock } from '../walk/blocks.js';
import { mountExplorer } from '../position/explorer.js';

const cite = (section, label) => ({ section, label });
// The paper's words on a paper clipping, as in the homework and the Passages tab.
const clipping = (text, c, marks = []) => h('div', { class: 'walk-clips' }, renderBlock({ type: 'quote', lead: null, text, cite: c, marks }));

const CLUES = [
  {
    id: 'cpu',
    head: 'The switches’ own CPUs',
    quote: 'The instability took place because our liveness protocol (ND) and route computation contended for limited CPU resources on embedded switch CPUs.',
    cite: cite('Section 6.2', 'Outages'),
    marks: ['contended for limited CPU resources on embedded switch CPUs'],
    context: 'After a power event restarted the whole fabric, it “did not converge without manual intervention” (§6.2).',
    insight: {
      label: 'What happened: a snowball (§6.2)',
      steps: [
        'Every switch restarts at the same moment, so every link comes up at once. Each one is a link-state update, and every switch recomputes its routes on its small embedded CPU, again and again.',
        'With the CPU busy on routes, ND (the liveness check) answers its neighbours’ heartbeats too late.',
        'A neighbour that misses the heartbeats decides the link is dead and reports it down. That is a new update, so every switch recomputes again.',
        'The late answer finally arrives, the link is reported up, and that is one more update. Links flap up, down and up, each flap adds work, and the extra work causes more flaps.',
        'It never settled on its own. Operators broke the loop by bringing up a few blocks at a time (§6.2).',
      ],
      close: 'The root cause is one small CPU doing two jobs. Move route computation onto servers and ND has the switch CPU to itself.',
    },
  },
  {
    id: 'wan',
    head: 'They had already done it once',
    quote: 'For the WAN, more CPU intensive traffic engineering and BGP routing protocols led us to move control protocols onto external servers with more powerful CPUs.',
    cite: cite('Section 2', 'Background'),
    marks: ['move control protocols onto external servers with more powerful CPUs'],
    ask: 'If it worked for B4, what was left to stop them in the datacenter?',
  },
  {
    id: 'transient',
    head: 'Switches that don’t coordinate',
    quote: 'Since clients do not coordinate during convergence, the network can experience small transient loss while the network transitions from the old to the new state.',
    cite: cite('Section 5.2', 'Routing'),
    marks: ['clients do not coordinate during convergence', 'small transient loss'],
    context: 'A typical cluster sees about 2,000 routing events a month (§5.2).',
    insight: {
      label: 'A small example (our own, not from the paper)',
      intro: 'Path to the servers behind D: A → B → C → D. A backup path runs A → E → D. The link C–D fails.',
      steps: [
        'C sees the failure first and switches to its new table: “to reach D, go back through B.” It sends D’s packets to B.',
        'B has not received the update yet. Its old table still says “to reach D, go to C,” so it sends them straight back.',
        'The packets bounce between B and C until their hop limit (TTL) runs out, and they are dropped. The path is blocked until B updates.',
        'Once B gets the update and sends to A, which sends via E, traffic flows again. The loss lasted only as long as B lagged behind C.',
      ],
      close: 'Our reading: a central controller sees every switch, so it can order the update, telling B (and A) to change before C. No switch then hands packets to one still on the old table. The paper doesn’t say Jupiter does this.',
    },
  },
  {
    id: 'half-way',
    head: 'Half the step was already taken',
    quote: 'A centralized solution where a route controller collected dynamic link state information and redistributed this link state to all switches over a reliable out-of-band Control Plane Network (CPN) appeared to be substantially simpler and more efficient from a computation and communication perspective.',
    cite: cite('Section 5.1', 'Discussion'),
    marks: ['route controller', 'reliable out-of-band Control Plane Network (CPN)'],
    ask: 'Firepath already had a central master and its own control network. What is the one thing left to move?',
  },
  {
    id: 'price',
    head: 'The price of centralizing',
    quote: 'In the rare case of a CPN partition, a multi-master situation may result, which immediately alerts network operators for manual intervention.',
    cite: cite('Section 5.2', 'Routing'),
    marks: ['multi-master situation'],
    context: 'And from §6.2: “with age, the vendor gear suffered from unidirectional failures of some CPN links.”',
    insight: {
      label: 'A small example of multi-master (our own)',
      intro: 'Firepath has an active master M1 and a backup M2, both on the CPN.',
      steps: [
        'A CPN link fails and the control network splits in two. M1 sits in one half, M2 in the other.',
        'M2 stops hearing M1, assumes it is dead and becomes master too. Each half’s switches now follow a different master.',
        'A fabric link fails next to a switch in M2’s half. Only M2 hears about it, so only M2’s switches route around it.',
        'M1’s switches still send traffic toward the dead link, and those packets are lost. Two masters, two views of the network: the paper’s answer is an alarm and a human.',
      ],
      close: 'Outside the paper (OpenFlow 1.3 spec, §6.3.5): every switch accepts table changes from one master controller only. Taking over takes a role request carrying a generation ID, and the switch refuses any request with an older ID. Commands from a stale master are rejected as “is slave”, so two controllers can never both write to one switch. The partition still has to be repaired, and a switch cut off from every controller keeps its last tables.',
    },
  },
  {
    id: 'after',
    head: 'After the paper',
    outside: true,
    quote: 'Our in-house, software-defined Jupiter networks deliver a factor of 50x more reliability than prior versions of our data center networks.',
    source: 'Google Cloud blog, Oct 2024. The controller is Orion, Google’s SDN control plane, first in production in 2016 (NSDI 2021).',
    ask: 'Does this settle it, or are the risks in the last card still there?',
  },
];

// A worked example in place of a follow-up question: numbered steps, then what it means.
function insightBox(ins) {
  return h(
    'div',
    { class: 'of-insight' },
    h('p', { class: 'of-insight-label' }, ins.label),
    ins.intro ? h('p', { class: 'of-insight-intro' }, ins.intro) : null,
    h('ol', { class: 'of-insight-steps' }, ins.steps.map((t) => h('li', {}, t))),
    ins.close ? h('p', { class: 'of-insight-close' }, ins.close) : null,
  );
}

function clueBody(clue) {
  // Paper quotes go on a clipping; the one source from outside the paper stays a plain, labeled quote.
  if (clue.outside) {
    return [
      h('blockquote', { class: 'deck-quote' }, h('p', {}, `“${clue.quote}”`)),
      h('p', { class: 'deck-source' }, h('span', { class: 'deck-chip' }, 'Outside the paper'), ' ', clue.source),
      h('p', { class: 'deck-ask' }, clue.ask),
    ];
  }
  return [
    clipping(clue.quote, clue.cite, clue.marks),
    clue.context ? h('p', { class: 'of-context' }, clue.context) : null,
    clue.insight ? insightBox(clue.insight) : h('p', { class: 'deck-ask' }, clue.ask),
  ];
}

function mount(root) {
  const explorer = h('div', { class: 'hv', id: 'openflow-explorer' });
  const deck = revealDeck({
    key: 'openflow',
    openLabel: 'Open this clue',
    cards: CLUES.map((clue) => ({ id: clue.id, head: h('span', { class: 'deck-theory' }, clue.head), body: clueBody(clue) })),
  });
  root.append(
    debateBox('Previous generations ran Firepath. Jupiter runs on OpenFlow. The paper never says why. What pushed them?'),
    passageBlocks('s4'),
    h('h3', { class: 'of-sim-title' }, 'Reminder: one link fails'),
    explorer,
    h('h3', { class: 'of-clues-title', id: 'of-clues-title' }, 'Six clues'),
    deck,
    h(
      'div',
      { class: 'of-close' },
      h('p', { class: 'of-close-label' }, 'To close'),
      h('ul', {}, h('li', {}, 'Which clue convinced you most, and why?'), h('li', {}, 'Was Firepath a mistake, or the right call for 2005 hardware and 2005 tools?')),
    ),
  );
  mountExplorer(explorer, ['B', 'C'], { B: 'Firepath (Firehose to Saturn)', C: 'OpenFlow-style (Jupiter)' });
  return { show() {} };
}

export default { id: 'openflow', title: 'Firepath to OpenFlow: why did Google move?', short: 'Why OpenFlow', hidden: false, mount };
