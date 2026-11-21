// The page frame: tab bar, routing, lazy mounting, the guided-experiment strip, and the way back.
import { LABS, PANELS, HOME, TAB_GROUPS, visibleTabs, FLOW, FLOW_DEFAULT_ARG, FACILITATOR_NOTE, onStart } from './registry.js';
import { parseRoute, formatRoute } from './route.js';
import { h, illustrationLabel, debateBox } from './ui.js';
import { store } from './store.js';

const labs = visibleTabs(LABS);
const panels = visibleTabs(PANELS);
const tabs = new Map([...panels, ...labs].map((t) => [t.id, t]));
const isKnownTab = (id) => tabs.has(id);
const isLab = (tab) => LABS.includes(tab);

const instances = new Map();
const sections = new Map();
const links = new Map();
const pressed = new Map();
const backBar = h('div', { class: 'back-bar', id: 'back-bar', hidden: true });
const view = h('main', { class: 'view', id: 'view' });
let current = null;

const ctx = {
  store,
  // ctx.jump({ tab, arg }, returnArg): open a tab or guided experiment, offering a way back to this tab.
  jump: (target, returnArg = null) =>
    go({ ...target, back: { tab: current.tab, arg: returnArg } }),
  // ctx.go({ tab, arg }): open a tab with no way back (the v2 agenda).
  go: (target) => go({ ...target, back: null }),
  // A lab calls this when a control moves it away from its guided experiment.
  clearExperiment: () => setPressed(current.tab, null),
};

function setPressed(tabId, arg) {
  pressed.set(tabId, arg);
  const section = sections.get(tabId);
  for (const button of section?.querySelectorAll('[data-experiment]') ?? []) {
    const on = button.dataset.experiment === arg;
    button.setAttribute('aria-pressed', String(on));
  }
  const experiment = tabs.get(tabId).experiments?.find((e) => e.id === arg);
  const note = section?.querySelector('.experiment-note');
  if (note) {
    note.textContent = experiment?.note ?? '';
    note.hidden = !experiment;
  }
  // An experiment that poses a question can state the key idea neutrally until the lab moves on.
  const idea = section?.querySelector('.lab-idea');
  if (idea) idea.textContent = experiment?.idea ?? tabs.get(tabId).idea;
}

function labFrame(lab) {
  const body = h('div', { class: `lab-body lab-${lab.id}` });
  const strip = lab.experiments.length && !lab.noStrip
    ? h(
        'div',
        { class: 'experiments' },
        h('span', { class: 'experiments-label' }, lab.stripLabel ?? 'Guided experiments'),
        h(
          'div',
          { class: 'experiment-buttons' },
          lab.experiments.map((e) =>
            h(
              'button',
              {
                type: 'button',
                id: `exp-${lab.id}-${e.id}`,
                'data-experiment': e.id,
                'aria-pressed': 'false',
                onclick: () => go({ tab: lab.id, arg: e.id, back: current?.back ?? null }),
              },
              e.label,
            ),
          ),
        ),
        h('p', { class: 'experiment-note', hidden: true }),
      )
    : null;
  const section = h(
    'section',
    { class: 'lab', id: `tab-${lab.id}`, 'data-tab': lab.id, 'data-stub': lab.stub ? 'true' : null, hidden: true },
    h(
      'header',
      { class: 'lab-head' },
      h('p', { class: 'lab-source' }, lab.source),
      h('h2', {}, lab.title),
      lab.idea ? h('p', { class: 'lab-idea' }, lab.idea) : null,
    ),
    lab.debate ? debateBox(lab.debate.question, lab.debate.reply) : null,
    strip,
    lab.stub ? null : illustrationLabel(lab.illustration),
    body,
  );
  return { section, body };
}

function panelFrame(panel) {
  const body = h('div', { class: `panel-body panel-${panel.id}` });
  const section = h(
    'section',
    { class: 'panel', id: `tab-${panel.id}`, 'data-tab': panel.id, hidden: true },
    h('header', { class: 'panel-head' }, h('h2', {}, panel.title)),
    body,
  );
  return { section, body };
}

// v2: Previous / Next through the lesson's steps, in the order the edition's FLOW gives.
const flowPrev = h('button', { type: 'button', class: 'flow-btn', id: 'flow-prev' }, '← Previous');
const flowNext = h('button', { type: 'button', class: 'flow-btn', id: 'flow-next' }, 'Next →');
const flowLabel = h('span', { class: 'flow-label', id: 'flow-label' });
const flowBar = FLOW ? h('div', { class: 'flow-bar', id: 'flow-bar' }, flowPrev, flowLabel, flowNext) : null;

function updateFlow(route) {
  if (!flowBar) return;
  const arg = route.arg ?? FLOW_DEFAULT_ARG[route.tab] ?? null;
  const i = FLOW.findIndex((f) => f.tab === route.tab && (f.arg === null || f.arg === arg));
  flowBar.hidden = i < 0;
  if (i < 0) return;
  flowLabel.textContent = `${i + 1} of ${FLOW.length} · ${FLOW[i].label}`;
  flowPrev.disabled = i === 0;
  flowNext.disabled = i === FLOW.length - 1;
  flowPrev.onclick = () => i > 0 && go({ tab: FLOW[i - 1].tab, arg: FLOW[i - 1].arg, back: null });
  flowNext.onclick = () => i < FLOW.length - 1 && go({ tab: FLOW[i + 1].tab, arg: FLOW[i + 1].arg, back: null });
}

// Mounts on first visit, so a tab keeps its state when the presenter comes back to it.
function ensureMounted(tab) {
  if (instances.has(tab.id)) return instances.get(tab.id);
  const { section, body } = isLab(tab) ? labFrame(tab) : panelFrame(tab);
  sections.set(tab.id, section);
  view.append(section);
  const instance = tab.mount(body, ctx) ?? {};
  instances.set(tab.id, instance);
  if (isLab(tab) && tab.defaultExperiment) {
    instance.run?.(tab.defaultExperiment);
    setPressed(tab.id, tab.defaultExperiment);
  }
  return instance;
}

function render(route) {
  const tab = tabs.get(route.tab);
  const instance = ensureMounted(tab);
  for (const [id, section] of sections) section.hidden = id !== tab.id;
  for (const [id, link] of links) {
    if (id === tab.id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  current = route;

  if (isLab(tab) && tab.experiments.some((e) => e.id === route.arg)) {
    instance.run?.(route.arg);
    setPressed(tab.id, route.arg);
  } else if (!isLab(tab) && route.arg) {
    instance.show?.(route.arg);
  }

  backBar.hidden = !route.back;
  backBar.replaceChildren();
  if (route.back) {
    const target = tabs.get(route.back.tab);
    backBar.append(
      h(
        'button',
        {
          type: 'button',
          id: 'back-link',
          'data-back': true,
          onclick: () => go({ tab: route.back.tab, arg: route.back.arg, back: null }),
        },
        `Back to ${target.title}`,
      ),
    );
  }
  updateFlow(route);
  window.scrollTo?.(0, 0);
}

// The hash is the record, but the page still routes if a host blocks writing to it.
function go(route) {
  const hash = formatRoute(route);
  render(route);
  try {
    if (location.hash !== hash) location.hash = hash;
  } catch {
    // Routing already happened in memory.
  }
}

function tabLink(tab, label) {
  const link = h('a', { href: `#${tab.id}`, 'data-tab-link': tab.id, 'data-stub': tab.stub ? 'true' : null }, label);
  link.addEventListener('click', (event) => {
    event.preventDefault();
    go({ tab: tab.id, arg: null, back: null });
  });
  links.set(tab.id, link);
  return h('li', {}, link);
}

function tabGroup(label, entries) {
  if (entries.length === 0) return null;
  return h('div', { class: 'tab-group' }, h('span', { class: 'tab-group-label' }, label), h('ul', {}, entries));
}

function start() {
  const nav = h(
    'nav',
    { class: 'tabs', 'aria-label': 'Sections and labs' },
    TAB_GROUPS.map(({ label, tabs: ids }) =>
      tabGroup(label, ids.filter(isKnownTab).map((id) => {
        const tab = tabs.get(id);
        return tabLink(tab, tab.short ?? tab.title);
      })),
    ),
  );
  const note = FACILITATOR_NOTE ? h('p', { class: 'facilitator-bar' }, h('b', {}, FACILITATOR_NOTE[0]), ` · ${FACILITATOR_NOTE[1]}`) : null;
  document.getElementById('app').append(h('div', { class: 'page' }, note, nav, flowBar, backBar, view));

  const fromHash = () => parseRoute(location.hash, isKnownTab);
  render(fromHash() ?? { tab: HOME, arg: null, back: null });
  window.addEventListener('hashchange', () => {
    const route = fromHash();
    if (route && formatRoute(route) !== formatRoute(current)) render(route);
  });
  onStart?.();
}

start();
