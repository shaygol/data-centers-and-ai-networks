// Lab 3 drawing and controls. All state comes from model.js.
import { h, svg, stat, loadBar, paperNote, onActivate, linkName } from '../../shell/ui.js';
import { FABRIC, steadyState, linkFailureSteps, masterFailoverSteps, stateForNewFailure, trafficLost, pastThePause, linkBetween } from './model.js';

const EXPERIMENTS = {
  'link-failure': () => linkFailureSteps(steadyState(), 'T2-S3'),
  'master-failover': () => masterFailoverSteps(steadyState(), 'T3-S2'),
};

const CPN_BOX = '0 0 640 370';
const FABRIC_BOX = '0 -14 640 400';

const list = (ids) => (ids.length < 2 ? ids.join('') : `${ids.slice(0, -1).join(', ')} and ${ids.at(-1)}`);
const lastEntry = (state) => state.master.log.at(-1);

const WHO = {
  none: { text: 'No change', tone: 'quiet' },
  fabric: { text: 'Data plane: the control plane hasn’t heard yet', tone: 'fabric' },
  report: { text: 'Each switch: reports its own interfaces', tone: 'local' },
  master: { text: 'Centralized: the master', tone: 'central' },
  masters: { text: 'Centralized: the masters, over the CPN', tone: 'central' },
  follow: { text: 'Each switch: finds the new master', tone: 'local' },
  compute: { text: 'Not centralized: each switch computes alone', tone: 'local' },
};

const EVERY_SWITCH = () => FABRIC.switches;

// Everything the page says and lights up for each step. The model decides what happens, this says it.
// words: the title and detail. now: lines of "what is centralized" to light. up and down: which
// clients' arrows show. bus: the label on the CPN. ask: the pause. versionDetail: beside the version.
const STEP_VIEWS = {
  steady: {
    who: WHO.none,
    words: ({ state }) => ({
      title: 'Steady state',
      detail: `Every switch holds LSD v${state.master.version} and its own forwarding tables. Press Forward, or click a link on the fabric to fail it.`,
    }),
  },
  'link-fails': {
    who: WHO.fabric,
    words: ({ linkId }) => ({
      title: `Link ${linkName(linkId)} fails`,
      detail: 'Every table still uses the link, so traffic hashed onto it is lost.',
    }),
  },
  report: {
    who: WHO.report,
    now: ['client-report', 'master-collect'],
    up: ({ reporters }) => reporters,
    bus: ({ linkId }) => `Interface state: ${linkName(linkId)} down`,
    words: ({ state, reporters }) => ({
      title: `${list(reporters)} report to the master`,
      detail: `Each client reads its local interface state and sends it over the CPN, not through the fabric.${reporters.includes(state.master.active) ? ` The failed link touches ${state.master.active}, and the report still arrives, because the CPN is a separate network.` : ''}`,
    }),
  },
  'master-builds': {
    who: WHO.master,
    now: ['master-build'],
    words: ({ state }) => ({
      title: `The master builds LSD v${state.master.version}`,
      detail: `The master records the change in its Link State Database and raises the version from v${state.master.version - 1} to v${state.master.version}. It holds the topology state.`,
    }),
  },
  multicast: {
    who: WHO.master,
    now: ['master-send'],
    down: EVERY_SWITCH,
    bus: ({ state, linkId }) => `LSD v${state.master.version} diff: ${linkName(linkId)} down`,
    versionDetail: 'Sent as a diff',
    ask: 'Before you step: is the next step centralized?',
    words: ({ state, linkId }) => ({
      title: 'The master multicasts the diff',
      detail: `v${state.master.version} goes to every client by UDP/IP multicast over the CPN. It holds only what changed since v${state.master.version - 1}: ${linkName(linkId)} is down.`,
    }),
  },
  'some-compute': {
    who: WHO.compute,
    now: ['client-compute', 'client-program'],
    words: ({ state, moved }) => {
      const waiting = FABRIC.switches.filter((id) => state.clients[id].version < state.master.version);
      return {
        title: 'Each switch computes its own tables',
        detail: `On receiving the update, a client computes ECMP shortest paths and programs its own hardware. The master computes no forwarding tables. Clients don’t coordinate: ${list(moved)} have moved and ${list(waiting)} haven’t, so some traffic is still lost.`,
      };
    },
  },
  'all-compute': {
    who: WHO.compute,
    now: ['client-compute', 'client-program'],
    words: ({ state }) => ({
      title: `All switches are on v${state.master.version}`,
      detail: `Every client’s version matches the master’s, and no table uses a failed link. ${trafficLost(state) > 1e-9 ? 'A ToR with no link left stays unreachable.' : 'The transient loss is over.'}`,
    }),
  },
  'master-stops': {
    who: WHO.master,
    words: ({ stopped }) => ({
      title: `The master on ${stopped} stops`,
      detail: `Switch ${stopped} keeps forwarding. The tables live on the switches, so traffic keeps flowing, but nothing can distribute new link state.`,
    }),
  },
  election: {
    who: WHO.masters,
    fmrpLive: true,
    words: ({ state }) => ({
      title: `FMRP elects the master on ${state.master.active}`,
      detail: `FMRP handles election and bookkeeping between active and backup masters. Here the new master starts from the same LSD v${state.master.version}. That’s our assumption.`,
    }),
  },
  'clients-follow': {
    who: WHO.follow,
    up: EVERY_SWITCH,
    bus: () => 'Keepalives',
    words: ({ state }) => ({
      title: `Clients turn to the master on ${state.master.active}`,
      detail: `Each switch knows the candidate masters from its static config. Keepalives now go to ${state.master.active}. A link can fail next.`,
    }),
  },
};

const ROLES = [
  {
    id: 'master',
    title: 'Centralized: the master',
    lines: [
      ['master-collect', 'Collects link state from every switch'],
      ['master-build', 'Builds the versioned Link State Database'],
      ['master-send', 'Multicasts it to every switch'],
    ],
  },
  {
    id: 'client',
    title: 'Not centralized: each switch',
    lines: [
      ['client-report', 'Reports its own interfaces'],
      ['client-compute', 'Computes its own ECMP shortest paths'],
      ['client-program', 'Programs its own hardware tables'],
    ],
  },
];

function panel(id, tone, title, subtitle, drawing) {
  return h(
    'article',
    { class: 'fp-plane', id: `fp-plane-${id}` },
    h('div', { class: `fp-plane-head tone-${tone}-head` }, h('h3', {}, title), h('p', {}, subtitle)),
    h('div', { class: 'fp-scroll' }, drawing),
  );
}

function clientX(i) {
  return 24 + (592 / FABRIC.switches.length) * (i + 0.5);
}

const MASTER_AT = { S1: 170, S2: 470 };
const BUS_Y = 150;
const CLIENT_Y = 270;

function drawControlPlane() {
  const masters = {};
  const masterEls = Object.entries(MASTER_AT).map(([host, x]) => {
    const name = svg('text', { class: 'fp-master-name', x, y: 40, 'text-anchor': 'middle' }, `Master on ${host}`);
    const status = svg('text', { class: 'fp-master-status', x, y: 68, 'text-anchor': 'middle' });
    const g = svg(
      'g',
      { class: 'fp-master', 'data-master': host },
      svg('line', { class: 'fp-cpn-line', x1: x, y1: 84, x2: x, y2: BUS_Y }),
      svg('rect', { x: x - 110, y: 12, width: 220, height: 72 }),
      name,
      status,
    );
    masters[host] = { g, status };
    return g;
  });
  const fmrp = svg(
    'g',
    { class: 'fp-fmrp' },
    svg('line', { class: 'fp-cpn-line', x1: 280, y1: 48, x2: 360, y2: 48 }),
    svg('text', { x: 320, y: 36, 'text-anchor': 'middle' }, 'FMRP'),
  );
  const busLabel = svg('text', { class: 'fp-bus-label', x: 320, y: BUS_Y - 14, 'text-anchor': 'middle' });

  const clients = {};
  const clientEls = FABRIC.switches.map((id, i) => {
    const x = clientX(i);
    const version = svg('text', { class: 'fp-client-version', x, y: CLIENT_Y + 62, 'text-anchor': 'middle' });
    const up = svg('path', { class: 'fp-arrow', d: `M${x - 10} 216 L${x + 10} 216 L${x} 198 Z` });
    const down = svg('path', { class: 'fp-arrow', d: `M${x - 10} 198 L${x + 10} 198 L${x} 216 Z` });
    const g = svg(
      'g',
      { class: 'fp-client', 'data-client': id },
      svg('line', { class: 'fp-cpn-line fp-drop', x1: x, y1: BUS_Y, x2: x, y2: CLIENT_Y }),
      up,
      down,
      svg('rect', { x: x - 38, y: CLIENT_Y, width: 76, height: 78 }),
      svg('text', { class: 'fp-client-name', x, y: CLIENT_Y + 30, 'text-anchor': 'middle' }, id),
      version,
    );
    clients[id] = { g, up, down, version };
    return g;
  });

  const el = svg(
    'svg',
    { class: 'fp-net', viewBox: CPN_BOX, role: 'img', 'aria-label': 'Control plane network: masters and every switch client on one out-of-band network' },
    svg('line', { class: 'fp-cpn-line fp-bus', x1: 24, y1: BUS_Y, x2: 616, y2: BUS_Y }),
    svg('text', { class: 'fp-bus-name', x: 24, y: BUS_Y - 14 }, 'CPN'),
    busLabel,
    fmrp,
    masterEls,
    clientEls,
  );
  return { el, masters, fmrp, busLabel, clients };
}

function drawDataPlane(onLink) {
  const at = {};
  FABRIC.spines.forEach((id, i) => { at[id] = { x: 160 + i * 160, y: 50 }; });
  FABRIC.tors.forEach((id, i) => { at[id] = { x: 80 + i * 160, y: 340 }; });
  const links = new Map();
  const linkEls = FABRIC.links.map((l) => {
    const ends = { x1: at[l.a].x, y1: at[l.a].y, x2: at[l.b].x, y2: at[l.b].y };
    const line = svg('line', { class: 'fp-link', ...ends });
    const g = svg(
      'g',
      { class: 'fp-link-group', 'data-link': l.id, role: 'button', tabindex: '0', 'aria-label': `Fail link ${linkName(l.id)}` },
      svg('line', { class: 'fp-link-hit', ...ends }),
      line,
    );
    onActivate(g, () => onLink(l.id));
    links.set(l.id, g);
    return g;
  });
  const masterTags = {};
  const nodes = FABRIC.switches.map((id) => {
    const { x, y } = at[id];
    const tier = FABRIC.spines.includes(id) ? 'spine' : 'tor';
    if (tier === 'spine') masterTags[id] = svg('text', { class: 'fp-master-tag', x: x + 36, y: y - 16 }, 'master');
    return svg(
      'g',
      { class: `fp-node tier-${tier}` },
      svg('circle', { cx: x, cy: y, r: 32 }),
      svg('text', { x, y: y + 9, 'text-anchor': 'middle' }, id),
      masterTags[id] ?? null,
    );
  });
  const el = svg(
    'svg',
    { class: 'fp-net', viewBox: FABRIC_BOX, role: 'group', 'aria-label': 'Data plane fabric: four ToRs and three spines' },
    linkEls,
    nodes,
  );
  return { el, links, masterTags };
}

function drawTables() {
  const dests = FABRIC.tors;
  const rows = new Map();
  const body = h('tbody');
  for (const id of FABRIC.switches) {
    const version = h('td', { class: 'fp-table-version' });
    const cells = new Map(dests.map((dest) => [dest, h('td', {})]));
    const row = h('tr', {}, h('th', { scope: 'row' }, id), version, [...cells.values()]);
    rows.set(id, { row, version, cells });
    body.append(row);
  }
  const table = h(
    'table',
    { class: 'fp-table', id: 'fp-tables' },
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Switch'), h('th', { scope: 'col' }, 'LSD'), dests.map((d) => h('th', { scope: 'col' }, `To ${d}`)))),
    body,
  );
  return { table, rows };
}

function mount(body, ctx) {
  // answered: the class is past "Is this step centralized?", so the copy that answers it can show.
  const lab = { steps: EXPERIMENTS['link-failure'](), at: 0, answered: false };

  const onLink = (linkId) => {
    const from = stateForNewFailure(lab.steps, lab.at);
    if (from.down.includes(linkId)) return;
    lab.steps = linkFailureSteps(from, linkId);
    lab.at = 1;
    ctx.clearExperiment();
    paint();
  };

  const control = drawControlPlane();
  const data = drawDataPlane(onLink);
  const tables = drawTables();

  const stepTo = (index) => {
    lab.at = Math.max(0, Math.min(lab.steps.length - 1, index));
    paint();
  };
  const back = h('button', { type: 'button', id: 'fp-back', onclick: () => stepTo(lab.at - 1) }, 'Back');
  const forward = h('button', { type: 'button', id: 'fp-forward', onclick: () => stepTo(lab.at + 1) }, 'Forward');
  const pips = h('ol', { class: 'fp-pips', 'aria-label': 'Steps' });
  const position = h('span', { class: 'fp-position', id: 'fp-position' });
  const who = h('span', { class: 'fp-who', id: 'fp-who' });
  const title = h('h3', { class: 'fp-step-title', id: 'fp-step-title' });
  const detail = h('p', { class: 'fp-step-detail', id: 'fp-step-detail' });
  const ask = h('p', { class: 'fp-ask', id: 'fp-ask' });

  const version = stat('Version on the master', { id: 'fp-version' });
  const matching = stat('Switches on that version', { id: 'fp-matching' });
  const active = stat('Active master', { id: 'fp-active' });
  const loss = loadBar('Traffic between ToRs');

  const roleLines = new Map();
  const roles = h(
    'div',
    { class: 'fp-roles', id: 'fp-roles' },
    ROLES.map((role) =>
      h(
        'section',
        { class: `fp-role fp-role-${role.id}` },
        h('h4', {}, role.title),
        h(
          'ul',
          {},
          role.lines.map(([id, text]) => {
            const li = h('li', {}, text);
            roleLines.set(id, li);
            return li;
          }),
        ),
      ),
    ),
  );

  const lsdLog = h('ol', { class: 'fp-log', id: 'fp-log' });

  body.append(
    paperNote(
      'Firepath is the control plane for Firehose, Watchtower and Saturn. Jupiter moved to OpenFlow and custom SDN control stacks, which Firepath’s design informed.',
      'Jupiter §5.1–5.2',
    ),
    h(
      'div',
      { class: 'fp-stepper' },
      h(
        'div',
        { class: 'fp-step-words' },
        h('div', { class: 'fp-step-controls' }, back, forward, position, pips),
        h('div', { class: 'fp-step-head' }, title, who),
        detail,
        ask,
      ),
      h('div', { class: 'stats fp-stats' }, version, matching, active, loss),
    ),
    h(
      'div',
      { class: 'fp-planes' },
      panel('cpn', 'cpn', 'Control plane network (CPN)', 'Out of band, separate from the fabric. Carries link state.', control.el),
      panel('fabric', 'fabric', 'Data plane fabric', 'Carries traffic. Click a link to fail it.', data.el),
      h(
        'article',
        { class: 'fp-plane fp-tables' },
        h('div', { class: 'fp-plane-head tone-local-head' }, h('h3', {}, 'Forwarding tables'), h('p', {}, 'Next hops at each switch. Struck through: uses a failed link.')),
        h('div', { class: 'fp-scroll' }, tables.table),
      ),
    ),
    h(
      'div',
      { class: 'fp-state' },
      roles,
      h('section', { class: 'fp-lsd' }, h('h4', {}, 'Updates from the master'), lsdLog),
    ),
    h(
      'div',
      { class: 'paper-notes', id: 'fp-notes' },
      h('h3', {}, 'What the paper says'),
      paperNote('Firepath centralizes the distribution of topology state, and distributes the computation of forwarding tables.', 'Jupiter §5.2'),
      paperNote('The master builds a Link State Database with a monotonically increasing version. After the first full update, each one holds only the diffs. The whole network’s database fits in 64 KB.', 'Jupiter §5.2'),
      paperNote('Clients don’t coordinate during convergence, so the network can see small transient loss. Such events happen about 3 times an hour in a typical cluster.', 'Jupiter §5.2'),
      paperNote('Redundant masters run on pre-selected spines, and FMRP elects one. Election is sticky, so a misbehaving candidate doesn’t cause churn. A CPN partition can produce several masters, which alerts operators to step in.', 'Jupiter §5.2'),
    ),
  );

  function paintControl(step) {
    const { state } = step;
    for (const [host, { g, status }] of Object.entries(control.masters)) {
      const isActive = state.master.active === host;
      const isBackup = state.master.backup === host;
      status.textContent = isActive ? `Active, LSD v${state.master.version}` : isBackup ? 'Backup' : 'Stopped';
      g.setAttribute('class', `fp-master ${isActive ? 'is-active' : isBackup ? 'is-backup' : 'is-stopped'}`);
    }
    const view = STEP_VIEWS[step.id];
    control.fmrp.classList.toggle('is-live', Boolean(view.fmrpLive));

    const sendsUp = view.up?.(step) ?? [];
    const sendsDown = view.down?.(step) ?? [];
    for (const id of FABRIC.switches) {
      const c = control.clients[id];
      const client = state.clients[id];
      const behind = client.version < state.master.version;
      const justMoved = step.moved?.includes(id);
      c.version.textContent = `v${client.version}`;
      c.g.setAttribute(
        'class',
        `fp-client ${behind ? 'is-behind' : ''} ${justMoved ? 'is-computing' : ''} ${sendsUp.includes(id) || sendsDown.includes(id) ? 'is-live' : ''}`,
      );
      c.up.classList.toggle('is-off', !sendsUp.includes(id));
      c.down.classList.toggle('is-off', !sendsDown.includes(id));
    }
    control.busLabel.textContent = view.bus?.(step) ?? '';
  }

  function paintData(step) {
    const { state } = step;
    for (const [id, g] of data.links) {
      const down = state.down.includes(id);
      g.setAttribute('class', `fp-link-group ${down ? 'is-down' : ''}`);
      g.setAttribute('aria-label', down ? `Link ${linkName(id)} is down` : `Fail link ${linkName(id)}`);
    }
    for (const [host, tag] of Object.entries(data.masterTags)) {
      tag.classList.toggle('is-off', state.master.active !== host);
    }
  }

  function paintTables(step) {
    const { state } = step;
    const before = lab.steps[0].state;
    for (const id of FABRIC.switches) {
      const row = tables.rows.get(id);
      const client = state.clients[id];
      row.version.textContent = `v${client.version}`;
      row.row.classList.toggle('is-behind', client.version < state.master.version);
      for (const [dest, cell] of row.cells) {
        const hops = client.tables[dest];
        cell.className = '';
        if (dest === id) {
          cell.textContent = '';
          continue;
        }
        cell.classList.toggle('is-changed', hops.join() !== before.clients[id].tables[dest].join());
        cell.replaceChildren(
          ...(hops.length === 0
            ? [h('span', { class: 'fp-hop-none' }, 'none')]
            : hops.map((hop) => (state.down.includes(linkBetween(id, hop)) ? h('s', { class: 'fp-hop-dead' }, hop) : h('span', {}, hop)))),
        );
      }
    }
  }

  function paintLog(step) {
    const { state } = step;
    const fresh = lastEntry(state).version > lastEntry(lab.steps[0].state).version;
    lsdLog.replaceChildren(
      ...state.master.log.slice().reverse().map((entry, i) => {
        const text = entry.kind === 'full'
          ? `Full update: all ${entry.links} links`
          : `Diff from v${entry.version - 1}: ${entry.changes.map((c) => `${linkName(c.link)} ${c.from} to ${c.to}`).join(', ')}`;
        return h(
          'li',
          { class: fresh && i === 0 ? 'is-new' : null },
          h('b', {}, `v${entry.version}`),
          ' ',
          text,
        );
      }),
    );
  }

  function paint() {
    const step = lab.steps[lab.at];
    const { state } = step;
    const view = STEP_VIEWS[step.id];
    const words = view.words(step);

    lab.answered ||= pastThePause(lab.steps, lab.at);
    roles.hidden = !lab.answered;
    body.querySelector('#fp-notes').hidden = !lab.answered;

    back.disabled = lab.at === 0;
    forward.disabled = lab.at === lab.steps.length - 1;
    position.textContent = `Step ${lab.at + 1} of ${lab.steps.length}`;
    pips.replaceChildren(
      ...lab.steps.map((s, i) => {
        const pip = h(
          'button',
          {
            type: 'button',
            id: `fp-step-${i + 1}`,
            'aria-label': i <= lab.at || lab.answered ? `Step ${i + 1}: ${STEP_VIEWS[s.id].words(s).title}` : `Step ${i + 1}`,
            'aria-current': i === lab.at ? 'step' : null,
            onclick: () => stepTo(i),
          },
          String(i + 1),
        );
        return h('li', {}, pip);
      }),
    );
    title.textContent = words.title;
    who.textContent = view.who.text;
    who.className = `fp-who fp-who-${view.who.tone}`;
    detail.textContent = words.detail;
    ask.textContent = view.ask ?? '';
    ask.hidden = !view.ask;

    paintControl(step);
    paintData(step);
    paintTables(step);
    paintLog(step);

    const onVersion = FABRIC.switches.filter((id) => state.clients[id].version === state.master.version);
    const behind = FABRIC.switches.filter((id) => !onVersion.includes(id));
    version.set(`v${state.master.version}`, view.versionDetail ?? '');
    matching.set(
      `${onVersion.length} of ${FABRIC.switches.length}`,
      behind.length === FABRIC.switches.length ? 'None has it yet' : behind.length ? `Still behind: ${behind.join(', ')}` : 'Every switch matches',
    );
    active.set(
      state.master.active ?? 'None',
      state.master.active ? (state.master.backup ? `Backup on ${state.master.backup}` : 'No backup left here') : 'Forwarding continues on existing tables',
    );
    const lost = trafficLost(state);
    loss.set(
      [
        { label: 'Delivered', value: 1 - lost, tone: 'own' },
        { label: 'Lost', value: lost, tone: 'hot' },
      ],
      'Traffic between ToRs',
    );
    for (const [id, li] of roleLines) li.classList.toggle('is-now', (view.now ?? []).includes(id));
  }

  paint();
  return {
    run(experiment) {
      lab.steps = EXPERIMENTS[experiment]();
      lab.at = 0;
      lab.answered = experiment !== 'link-failure';
      paint();
    },
  };
}

export default {
  id: 'firepath',
  number: 3,
  title: 'Firepath control loop',
  short: 'Firepath',
  paper: 'Jupiter',
  source: 'Jupiter §5.2',
  hidden: false,
  idea: 'A link fails, and every switch’s tables have to change. Step through who does each part.',
  illustration: 'A small fabric of our own, not a Google one. Versions and traffic lost are computed live on its 12 links, so one link is a much larger share than in a real fabric. The paper says the loss is small and gives no figure, and it gives no timing for these steps.',
  defaultExperiment: 'link-failure',
  experiments: [
    {
      id: 'link-failure',
      label: 'Single link failure',
      note: 'T2–S3 will fail. Step forward, and stop at step 5 to ask whether the next step is centralized.',
    },
    {
      id: 'master-failover',
      label: 'Master failover',
      note: 'The master on S1 stops, and nothing is lost, because the tables live on the switches. The backup on S2 takes over, then a link fails under it. The paper names these parts but doesn’t give this order.',
    },
  ],
  mount,
};
