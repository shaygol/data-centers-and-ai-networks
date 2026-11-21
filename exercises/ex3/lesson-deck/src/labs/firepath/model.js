// Lab 3 model: Firepath's control loop on a small fabric of our own. Pure logic, no DOM.
// The mechanism follows Jupiter §5.2. The fabric's size and the order switches move in are
// illustrative: the paper gives neither.

const TORS = ['T1', 'T2', 'T3', 'T4'];
const SPINES = ['S1', 'S2', 'S3'];
const SWITCHES = [...TORS, ...SPINES];
const LINKS = TORS.flatMap((tor) => SPINES.map((spine) => ({ id: `${tor}-${spine}`, a: tor, b: spine })));

export const FABRIC = { tors: TORS, spines: SPINES, switches: SWITCHES, links: LINKS };

export const linkBetween = (x, y) => (TORS.includes(x) ? `${x}-${y}` : `${y}-${x}`);

const neighbours = (id, down) =>
  LINKS.filter((l) => (l.a === id || l.b === id) && !down.includes(l.id)).map((l) => (l.a === id ? l.b : l.a));

// What each client computes for itself from its copy of the link state:
// shortest paths with ECMP toward every ToR (§5.2).
function computeTables(self, down) {
  const tables = {};
  for (const dest of TORS) {
    if (dest === self) continue;
    const distance = new Map([[dest, 0]]);
    const queue = [dest];
    while (queue.length > 0) {
      const node = queue.shift();
      for (const next of neighbours(node, down)) {
        if (distance.has(next)) continue;
        distance.set(next, distance.get(node) + 1);
        queue.push(next);
      }
    }
    tables[dest] = distance.has(self)
      ? neighbours(self, down).filter((n) => distance.get(n) === distance.get(self) - 1)
      : [];
  }
  return tables;
}

const client = (id, version, down) => ({ version, tables: computeTables(id, down) });

// Clients don't coordinate (§5.2), so some move before others. This order is ours.
const MOVE_FIRST = ['T1', 'T3', 'S1'];

export function steadyState() {
  return {
    // The links that are actually down, which no switch knows until the control loop runs.
    down: [],
    master: { active: 'S1', backup: 'S2', version: 1, down: [], log: [{ version: 1, kind: 'full', links: LINKS.length }] },
    clients: Object.fromEntries(SWITCHES.map((id) => [id, client(id, 1, [])])),
  };
}

const HOP_LIMIT = 16;

// The share of traffic lost if every ToR sends the same to every other ToR, split evenly
// over each switch's current next hops. Traffic into a dead link or caught in a loop is lost.
export function trafficLost(state) {
  const memo = new Map();
  const delivered = (node, dest, hopsLeft) => {
    if (node === dest) return 1;
    if (hopsLeft === 0) return 0;
    const key = `${node}>${dest}>${hopsLeft}`;
    if (memo.has(key)) return memo.get(key);
    const hops = state.clients[node].tables[dest];
    const share = hops.reduce((sum, hop) => {
      const dead = state.down.includes(linkBetween(node, hop));
      return sum + (dead ? 0 : delivered(hop, dest, hopsLeft - 1) / hops.length);
    }, 0);
    memo.set(key, share);
    return share;
  };
  const pairs = TORS.flatMap((src) => TORS.filter((dest) => dest !== src).map((dest) => [src, dest]));
  const total = pairs.reduce((sum, [src, dest]) => sum + delivered(src, dest, HOP_LIMIT), 0);
  return 1 - total / pairs.length;
}

// Every step holds a full snapshot, so stepping back only means showing an earlier one.
export function linkFailureSteps(start, linkId) {
  const link = LINKS.find((l) => l.id === linkId);
  const version = start.master.version + 1;
  const down = [...start.master.down, linkId];

  const failed = { ...start, down: [...start.down, linkId] };
  const built = {
    ...failed,
    master: {
      ...start.master,
      version,
      down,
      log: [...start.master.log, { version, kind: 'diff', changes: [{ link: linkId, from: 'up', to: 'down' }] }],
    },
  };
  const move = (state, ids) => ({
    ...state,
    clients: {
      ...state.clients,
      ...Object.fromEntries(ids.map((id) => [id, client(id, version, down)])),
    },
  });
  const someMoved = move(built, MOVE_FIRST);
  const allMoved = move(someMoved, SWITCHES.filter((id) => !MOVE_FIRST.includes(id)));

  return [
    { id: 'steady', actor: 'none', plane: 'none', state: start },
    { id: 'link-fails', actor: 'fabric', plane: 'fabric', linkId, state: failed },
    { id: 'report', actor: 'switch', plane: 'cpn', linkId, reporters: [link.a, link.b], state: failed },
    { id: 'master-builds', actor: 'master', plane: 'none', linkId, state: built },
    { id: 'multicast', actor: 'master', plane: 'cpn', linkId, state: built },
    { id: 'some-compute', actor: 'switch', plane: 'local', linkId, moved: MOVE_FIRST, state: someMoved },
    { id: 'all-compute', actor: 'switch', plane: 'local', linkId, moved: SWITCHES, state: allMoved },
  ];
}

// The paper names the parts of a takeover: redundant masters on spines, election by FMRP over
// the CPN, and candidates listed in each switch's static config (§5.2). It doesn't walk through
// one. This order, and the backup holding the same database, are our illustration.
export function masterFailoverSteps(start, linkId) {
  const stopped = { ...start, master: { ...start.master, active: null } };
  const elected = { ...stopped, master: { ...stopped.master, active: start.master.backup, backup: null } };
  const [, ...update] = linkFailureSteps(elected, linkId);
  return [
    { id: 'steady', actor: 'none', plane: 'none', state: start },
    { id: 'master-stops', actor: 'master', plane: 'none', stopped: start.master.active, state: stopped },
    { id: 'election', actor: 'master', plane: 'cpn', state: elected },
    { id: 'clients-follow', actor: 'switch', plane: 'cpn', state: elected },
    ...update,
  ];
}

// Lab 3's pause is on the multicast step, which asks whether the next step is centralized.
// True once the sequence has gone past it. A sequence with no pause has nothing to hold back.
export function pastThePause(steps, at) {
  const pause = steps.findIndex((s) => s.id === 'multicast');
  return at > pause;
}

// Where a new failure starts from when a viewer clicks a link at step `at`. An update under way
// finishes first, but a failure the sequence hasn't reached yet never happens.
export function stateForNewFailure(steps, at) {
  if (at === 0) return steps[0].state;
  const failsAt = steps.findIndex((s) => s.id === 'link-fails');
  return at < failsAt ? steps[failsAt - 1].state : steps[steps.length - 1].state;
}
