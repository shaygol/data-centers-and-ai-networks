// "A link fails" under options A, B and C: a small fabric animates who does what.
// Ported as is from the partner's homework page (Part 2: Position), with its wording kept.
// Nothing here touches the DOM at import time.

const S = { S1: [210, 100], S2: [330, 100] };
const L = { L1: [90, 250], L2: [210, 250], L3: [330, 250], L4: [450, 250] };
const POS = { ...S, ...L };
const ALL = Object.keys(POS);
const M = [530, 100];
const LINKS = [];
Object.keys(S).forEach((s) => Object.keys(L).forEach((l) => LINKS.push([s, l])));
const FAIL = ['S1', 'L2'];
const NODE_W = 56;
const NODE_H = 28;

// A point on the edge of node a, towards b.
function edge(a, b) {
  const [x1, y1] = POS[a];
  const [x2, y2] = POS[b];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = Math.min(NODE_W / 2 / Math.abs(dx || 1e-9), NODE_H / 2 / Math.abs(dy || 1e-9));
  return [x1 + dx * t, y1 + dy * t];
}

function fabric(extra) {
  let out = '<rect class="hv-bg" x="0" y="0" width="600" height="330" rx="10"/>';
  out += `<g class="hv-cpn">${ALL.map((n) => `<line x1="${M[0] - 50}" y1="${M[1]}" x2="${POS[n][0]}" y2="${POS[n][1]}"/>`).join('')}</g>`;
  out += LINKS.map(([s, l]) => {
    const a = edge(s, l);
    const b = edge(l, s);
    return `<line class="hv-link" data-l="${s}${l}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
  }).join('');
  out += `<g class="hv-nodes">${ALL.map(
    (n) =>
      `<g class="hv-node" data-n="${n}"><rect x="${POS[n][0] - NODE_W / 2}" y="${POS[n][1] - NODE_H / 2}" width="${NODE_W}" height="${NODE_H}" rx="5"/><text x="${POS[n][0]}" y="${POS[n][1] + 4.5}" text-anchor="middle">${n}</text></g>`,
  ).join('')}</g>`;
  return out + (extra || '');
}

export const MODES = {
  A: {
    tab: 'A. Fully distributed',
    hub: null,
    topo: 'Every switch builds its own view from its neighbors',
    comp: 'Every switch',
    travels: 'Routing messages between neighbors (OSPF, IS-IS, BGP)',
    steps: [
      ['detect', 'The two switches at the ends of the link notice it is down.'],
      ['flood', 'They tell their neighbors with routing messages, and each neighbor passes the news on, hop by hop.'],
      ['compute', 'Every switch updates its own copy of the topology and computes its own forwarding table.'],
    ],
    end: 'Nobody has the whole picture, so the news travels across the network and every switch does the full computation.',
  },
  B: {
    tab: 'B. Google’s split (Firepath)',
    hub: 'Master',
    topo: 'A central master, which sends it to every switch',
    comp: 'Every switch',
    travels: 'The link-state database, over the control network',
    steps: [
      ['detect', 'The two switches at the ends of the link notice it is down.'],
      ['report', 'They report the change to the master over the control network (CPN).'],
      ['push', 'The master updates its link-state database and sends the update to every switch.'],
      ['compute', 'Every switch computes its own forwarding table from the database.'],
    ],
    end: 'The master only collects and redistributes. The path computation stays on every switch (Section 5.2.2 in SIGCOMM, Section 5.2 in CACM).',
  },
  C: {
    tab: 'C. Fully centralized (OpenFlow-style)',
    hub: 'Controller',
    topo: 'A central controller',
    comp: 'The controller, which installs entries in every switch',
    travels: 'Ready-made flow table entries',
    steps: [
      ['detect', 'The two switches at the ends of the link notice it is down.'],
      ['report', 'They report the change to the controller.'],
      ['hubcompute', 'The controller computes the new forwarding entries for every switch.'],
      ['install', 'It installs the ready-made entries in each switch’s flow table. The switches only match and forward.'],
    ],
    end: 'The controller does all the thinking. The switches only get ready-made entries, so a controller outage matters much more.',
  },
};

// labels optionally renames the mode buttons, e.g. when only B and C are shown.
export function mountExplorer(root, keys = ['A', 'B', 'C'], labels = {}) {
  root.innerHTML =
    '<div class="hv-tabs" role="tablist"></div><div class="hv-body"><svg class="hv-svg" viewBox="0 0 600 330" role="img" aria-label="A small fabric: what happens when a link fails"></svg>' +
    '<div class="hv-side"><button type="button" class="hv-go">&#9654; A link fails</button><ol class="hv-steps"></ol><p class="hv-note"></p></div></div>' +
    '<dl class="hv-facts"><div><dt>Who holds the topology</dt><dd class="f-topo"></dd></div><div><dt>Who computes the forwarding tables</dt><dd class="f-comp"></dd></div><div><dt>What travels to a switch</dt><dd class="f-trav"></dd></div></dl>';
  const tabs = root.querySelector('.hv-tabs');
  const svgEl = root.querySelector('.hv-svg');
  const steps = root.querySelector('.hv-steps');
  const go = root.querySelector('.hv-go');
  const note = root.querySelector('.hv-note');
  let mode = keys[0];
  let timers = [];

  function draw() {
    const m = MODES[mode];
    let extra = '';
    if (m.hub) {
      extra += `<g class="hv-hub" data-n="HUB"><rect x="${M[0] - 50}" y="${M[1] - 20}" width="100" height="40" rx="6"/><text x="${M[0]}" y="${M[1] - 2}" text-anchor="middle">${m.hub}</text><text class="sub" x="${M[0]}" y="${M[1] + 13}" text-anchor="middle">${mode === 'B' ? 'link-state DB' : 'global view'}</text></g>`;
    } else {
      extra += `<text class="hv-none" x="${M[0]}" y="${M[1]}" text-anchor="middle">no central node</text>`;
    }
    extra += '<text class="hv-cap" x="530" y="150" text-anchor="middle">control network</text>';
    svgEl.innerHTML = `${fabric(extra)}<g class="hv-fx"></g>`;
    if (!m.hub) svgEl.querySelector('.hv-cpn').style.display = 'none';
    steps.innerHTML = m.steps.map((s, i) => `<li data-i="${i}"><span class="hv-n">${i + 1}</span><span>${s[1]}</span></li>`).join('');
    root.querySelector('.f-topo').textContent = m.topo;
    root.querySelector('.f-comp').textContent = m.comp;
    root.querySelector('.f-trav').textContent = m.travels;
    note.textContent = 'Press the button to play it. The numbers on the right follow the animation.';
    go.innerHTML = '&#9654; A link fails';
    tabs.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('on', b.dataset.m === mode);
      b.setAttribute('aria-selected', String(b.dataset.m === mode));
    });
  }

  keys.forEach((k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.m = k;
    b.setAttribute('role', 'tab');
    b.textContent = labels[k] ?? MODES[k].tab;
    tabs.appendChild(b);
  });
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    stop();
    mode = b.dataset.m;
    draw();
  });

  const fx = () => svgEl.querySelector('.hv-fx');
  const node = (n) => svgEl.querySelector(`[data-n="${n}"]`);
  const hubPoint = [M[0] - 50, M[1]];
  function pulse(from, to, delay, cls = '') {
    const a = from === 'HUB' ? hubPoint : POS[from];
    const b = to === 'HUB' ? hubPoint : POS[to];
    const id = `p${Math.random().toString(36).slice(2)}`;
    fx().insertAdjacentHTML(
      'beforeend',
      `<circle id="${id}" class="hv-pk ${cls}" r="5" cx="-20" cy="-20"><animateMotion begin="indefinite" dur="0.9s" fill="freeze" path="M${a[0]},${a[1]} L${b[0]},${b[1]}"/></circle>`,
    );
    timers.push(
      setTimeout(() => {
        const c = svgEl.querySelector(`#${id}`);
        if (c) c.querySelector('animateMotion').beginElement();
      }, delay),
    );
  }
  function gear(n, hub) {
    const p = hub ? [M[0] + 38, M[1] - 26] : [POS[n][0] + NODE_W / 2 - 4, POS[n][1] - NODE_H / 2 - 4];
    fx().insertAdjacentHTML('beforeend', `<text class="hv-gear" x="${p[0]}" y="${p[1]}" text-anchor="middle">&#9881;</text>`);
  }
  function entry(n) {
    const p = [POS[n][0] + NODE_W / 2 - 4, POS[n][1] + NODE_H / 2 + 12];
    fx().insertAdjacentHTML('beforeend', `<text class="hv-entry" x="${p[0]}" y="${p[1]}" text-anchor="middle">&#9636;</text>`);
  }

  function play() {
    stop();
    draw();
    go.disabled = true;
    const m = MODES[mode];
    const T = 1900;
    let t = 300;
    m.steps.forEach((s, i) => {
      timers.push(
        setTimeout(() => {
          steps.querySelectorAll('li').forEach((li, j) => {
            li.classList.toggle('on', j === i);
            li.classList.toggle('done', j < i);
          });
          const k = s[0];
          svgEl.querySelectorAll('.hv-pk').forEach((c) => c.remove());
          if (k === 'detect') {
            svgEl.querySelector('[data-l="S1L2"]').classList.add('dead');
            fx().insertAdjacentHTML('beforeend', '<text class="hv-x" x="210" y="180" text-anchor="middle">&#10005;</text>');
            FAIL.forEach((n) => node(n).classList.add('alert'));
          }
          if (k === 'flood') {
            LINKS.forEach(([a, b], j) => {
              if (a + b === 'S1L2') return;
              pulse(a, b, j * 90, 'gray');
              pulse(b, a, j * 90 + 40, 'gray');
            });
          }
          if (k === 'report') FAIL.forEach((n, j) => pulse(n, 'HUB', j * 150));
          if (k === 'push') {
            fx().insertAdjacentHTML('beforeend', `<text class="hv-lsd" x="${M[0]}" y="${M[1] + 36}" text-anchor="middle">LSD v+1</text>`);
            ALL.forEach((n, j) => pulse('HUB', n, j * 110, 'acc'));
          }
          if (k === 'compute') {
            ALL.forEach((n) => {
              gear(n);
              node(n).classList.add('work');
            });
          }
          if (k === 'hubcompute') {
            gear('HUB', true);
            node('HUB').classList.add('work');
          }
          if (k === 'install') {
            ALL.forEach((n, j) => {
              pulse('HUB', n, j * 110, 'acc');
              timers.push(setTimeout(() => entry(n), j * 110 + 900));
            });
          }
        }, t),
      );
      t += T;
    });
    timers.push(
      setTimeout(() => {
        steps.querySelectorAll('li').forEach((li) => {
          li.classList.remove('on');
          li.classList.add('done');
        });
        go.disabled = false;
        go.innerHTML = '&#8635; Play again';
        note.textContent = m.end;
      }, t + 200),
    );
  }
  function stop() {
    timers.forEach(clearTimeout);
    timers = [];
    go.disabled = false;
  }
  go.addEventListener('click', play);
  draw();
  return { stop };
}
