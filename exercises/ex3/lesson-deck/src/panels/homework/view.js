// v2, from Shay's facilitator deck: the homework review (the JR-16 fabric from the Miswire Hunt game,
// with Firepath traffic playing over it), the RNG reserve placeholder, and links to the paper.
import { h, svg } from '../../shell/ui.js';
import { renderBlock } from '../walk/blocks.js';
import { debateBox } from '../../editions/v2/debate.js';

const HW_SP = ["SP1", "SP2", "SP3", "SP4"];
const HW_AG = ["AG1", "AG2", "AG3", "AG4"];
const HW_TOR = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"];
const HW_POS = {
  SP1: [240, 52], SP2: [400, 52], SP3: [560, 52], SP4: [720, 52],
  AG1: [200, 200], AG2: [320, 200], AG3: [640, 200], AG4: [760, 200],
  T1: [110, 340], T2: [210, 340], T3: [310, 340], T4: [410, 340],
  T5: [550, 340], T6: [650, 340], T7: [750, 340], T8: [850, 340]
};
const hwBlockOf = (t) => (Number(t.slice(1)) <= 4 ? "A" : "B");
const HW_AG_BLOCK = { AG1: "A", AG2: "A", AG3: "B", AG4: "B" };
const HW_LINKS = [
  ...HW_SP.flatMap((sp) => HW_AG.map((ag) => [sp, ag])),
  ...HW_AG.flatMap((ag) => HW_TOR.filter((t) => hwBlockOf(t) === HW_AG_BLOCK[ag]).map((t) => [ag, t]))
];
const HW_FAULTS = [
  { id: 1, name: "Dark switch", where: "T7 and its two uplinks", links: [["AG3", "T7"], ["AG4", "T7"]], node: "T7", what: "T7’s software crashed.", why: "The optics are powered (PHY up on every T7 port), but the OS hung, so ND keepalives stopped. Its neighbours’ ports are the only clue." },
  { id: 2, name: "Asymmetric link", where: "SP3 – AG3", links: [["SP3", "AG3"]], what: "A broken RX fiber, so the link works one way only.", why: "AG3 hears SP3, but SP3 cannot hear AG3. ND keeps traffic from using a one-way link." },
  { id: 3, name: "Miscabled link", where: "T4 – AG4 (not in the plan)", links: [["AG4", "T4"]], extra: true, what: "A cable plugged into the wrong port.", why: "ND compares the peer ID it hears with the cluster config and finds a mismatch (T4 u2 meets AG4 d3)." },
  { id: 4, name: "Dead link", where: "SP2 – AG4", links: [["SP2", "AG4"]], what: "An unplugged cable.", why: "PHY is down on both ends." },
  { id: 5, name: "High error rate", where: "SP1 – AG1", links: [["SP1", "AG1"]], what: "Degraded optics.", why: "ND frames pass, but CRC errors spike, which causes silent TCP retransmissions." }
];
function hwDiagram(state) {
  const isTor = (n) => n.startsWith("T");
  const ends = (a, b) => {
    const [x1, y1] = HW_POS[a];
    const [x2, y2] = HW_POS[b];
    return { x1, y1: y1 + 16, x2, y2: y2 - (isTor(b) ? 12 : 16) };
  };
  const linkEls = HW_LINKS.map(([a, b]) => svg("line", { class: "hw-link", "data-link": `${a}-${b}`, ...ends(a, b) }));
  const extra = svg("line", { class: "hw-link hw-extra", "data-link": "AG4-T4", ...ends("AG4", "T4") });
  const racks = HW_TOR.map((t) => {
    const [x2, y2] = HW_POS[t];
    const servers = [0, 1, 2, 3].map((k) => [
      svg("rect", { class: "hw-srv", x: x2 - 18, y: y2 + 35 + k * 19, width: 36, height: 13, rx: 2 }),
      svg("circle", { class: "hw-led", cx: x2 + 12, cy: y2 + 41.5 + k * 19, r: 1.8 }),
      svg("line", { class: "hw-slot", x1: x2 - 13, y1: y2 + 41.5 + k * 19, x2: x2 + 3, y2: y2 + 41.5 + k * 19 })
    ]);
    return svg("g", { class: "hw-rack" }, svg("line", { class: "hw-feed", x1: x2, y1: y2 + 12, x2, y2: y2 + 28 }), svg("rect", { class: "hw-frame", x: x2 - 24, y: y2 + 28, width: 48, height: 86, rx: 4 }), servers);
  });
  const nodeEls = Object.entries(HW_POS).map(([id, [x2, y2]]) => {
    const tor = isTor(id);
    const w = tor ? 54 : 74;
    const hh = tor ? 24 : 32;
    const tier = tor ? "tor" : id.startsWith("AG") ? "ag" : "sp";
    return svg("g", { class: `hw-node hw-${tier}`, "data-node": id }, svg("rect", { x: x2 - w / 2, y: y2 - hh / 2, width: w, height: hh, rx: 5 }), svg("text", { x: x2, y: y2 + 4.5, "text-anchor": "middle" }, id));
  });
  const master = svg(
    "g",
    { class: "hw-master-wrap" },
    svg("line", { class: "hw-cpn", x1: 800, y1: 52, x2: 780, y2: 52 }),
    svg("g", { class: "hw-master" }, svg("rect", { x: 808, y: 34, width: 110, height: 36, rx: 5 }), svg("text", { x: 863, y: 49, "text-anchor": "middle" }, "MASTER"), svg("text", { class: "sub", x: 863, y: 63, "text-anchor": "middle" }, "Firepath")),
    svg("text", { class: "hw-tier", x: 808, y: 86 }, "CPN: connected to"),
    svg("text", { class: "hw-tier", x: 808, y: 98 }, "every switch")
  );
  const labels = [
    svg("text", { class: "hw-tier", x: 260, y: 486, "text-anchor": "middle" }, "BLOCK A"),
    svg("text", { class: "hw-tier", x: 700, y: 486, "text-anchor": "middle" }, "BLOCK B"),
    svg("text", { class: "hw-tier", x: 12, y: 56 }, "SPINE"),
    svg("text", { class: "hw-tier", x: 12, y: 204 }, "AGGR."),
    svg("text", { class: "hw-tier", x: 12, y: 344 }, "ToR"),
    svg("text", { class: "hw-tier", x: 12, y: 408 }, "SERVERS")
  ];
  const marks = svg("g", { class: "hw-marks" });
  const el = svg("svg", { class: "hw-svg", viewBox: "0 0 960 500", role: "img", "aria-label": "JR-16: a 16-switch Clos fabric with 4 spine, 4 aggregation and 8 ToR switches, with the Firepath master" }, linkEls, extra, racks, nodeEls, master, labels, marks);
  el.paint = () => {
    extra.setAttribute("class", `hw-link hw-extra${state.revealed ? " is-on" : ""}`);
    for (const l of el.querySelectorAll("[data-link]")) l.classList.remove("hw-fault", "hw-sel");
    for (const n of el.querySelectorAll("[data-node]")) n.classList.remove("hw-fault", "hw-sel");
    marks.replaceChildren();
    if (!state.revealed) return;
    for (const f of HW_FAULTS) {
      const sel = state.selected === f.id;
      for (const [a, b] of f.links) {
        const l = el.querySelector(`[data-link="${a}-${b}"]`);
        l.classList.add("hw-fault");
        if (sel) l.classList.add("hw-sel");
        const e = ends(a, b);
        const mx = (e.x1 + e.x2) / 2;
        const my = (e.y1 + e.y2) / 2;
        marks.append(svg("g", { class: `hw-badge${sel ? " hw-sel" : ""}` }, svg("circle", { cx: mx, cy: my, r: 11 }), svg("text", { x: mx, y: my + 4, "text-anchor": "middle" }, String(f.id))));
      }
      if (f.node) {
        const n = el.querySelector(`[data-node="${f.node}"]`);
        n.classList.add("hw-fault");
        if (sel) n.classList.add("hw-sel");
      }
    }
  };
  return el;
}
function mountHomework(root, ctx) {
  const state = { revealed: false, selected: null };
  const diagram = hwDiagram(state);
  diagram.paint();
  // Traffic on the map, as in the game: the master sends link state, then one packet takes each equal-cost path.
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const adjacency = {};
  for (const [a, b] of HW_LINKS) {
    (adjacency[a] = adjacency[a] || []).push(b);
    (adjacency[b] = adjacency[b] || []).push(a);
  }
  const equalCost = (src, dst) => {
    const dist = { [dst]: 0 };
    const queue = [dst];
    while (queue.length) {
      const u = queue.shift();
      for (const v of adjacency[u] || []) {
        if (dist[v] === undefined) {
          dist[v] = dist[u] + 1;
          queue.push(v);
        }
      }
    }
    const out = [];
    const walk = (u, path) => {
      if (u === dst) {
        out.push(path);
        return;
      }
      for (const v of adjacency[u]) if (dist[v] === dist[u] - 1) walk(v, path.concat(v));
    };
    walk(src, [src]);
    return out;
  };
  const PAIRS = [["T1", "T6"], ["T3", "T5"], ["T2", "T8"]];
  const fx = svg("g", { class: "hw-fx" });
  diagram.append(fx);
  let timers = [];
  let playing = false;
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const fly = (pts, cls, dur, at) => later(at, () => {
    const c = svg("circle", { class: `hw-pk ${cls}`, r: 4.5 }, svg("animateMotion", { begin: "indefinite", dur: `${dur}s`, fill: "freeze", path: "M" + pts.map((q) => q.join(",")).join(" L") }));
    fx.append(c);
    try { c.firstChild.beginElement(); } catch (e) { }
    later(dur * 1000, () => c.remove());
  });
  const tag = (pos, text, ms) => {
    const t = svg("text", { class: "hw-fxtag", x: pos[0], y: pos[1], "text-anchor": "middle" }, text);
    fx.append(t);
    later(ms, () => t.remove());
  };
  function round() {
    if (!playing) return;
    if (diagram.getBoundingClientRect().width === 0) {
      later(500, round);
      return;
    }
    {
      Object.keys(HW_POS).forEach((id, i) => fly([[863, 70], HW_POS[id]], "lsd", 0.7, i * 40));
      PAIRS.forEach(([a, b], k) => {
        const t0 = 1500 + k * 3000;
        later(t0, () => {
          tag([HW_POS[a][0], HW_POS[a][1] - 20], `${a} → ${b}`, 2800);
          tag([HW_POS[b][0], HW_POS[b][1] - 20], `to ${b}`, 2800);
        });
        equalCost(a, b).forEach((path, j) => fly(path.map((n) => HW_POS[n]), "", 0.42 * (path.length - 1), t0 + j * 110));
      });
    }
    later(10800, round);
  }
  const playBtn = h("button", { type: "button", class: "hw-play", id: "hw-play" }, "Pause traffic");
  const setPlaying = (on) => {
    playing = on;
    timers.forEach(clearTimeout);
    timers = [];
    fx.replaceChildren();
    playBtn.textContent = on ? "Pause traffic" : "Play traffic";
    playBtn.setAttribute("aria-pressed", String(on));
    if (on) round();
  };
  playBtn.addEventListener("click", () => setPlaying(!playing));
  if (!reduced) setPlaying(true);
  else playBtn.hidden = true;
  const clip = (text, cite, marks) => h("div", { class: "walk-clips" }, renderBlock({ type: "quote", lead: null, text, cite: cite, marks }));
  const prompts = h(
    "ol",
    { class: "hw-prompts" },
    ["What was hard?", "What did you like?", "Where did you get stuck?"].map((t) => h("li", {}, t))
  );
  root.append(
    h("div", { class: "hw-grid" }, h("div", { class: "hw-map" }, diagram, h("p", { class: "hw-caption" }, "JR-16: 4 spine, 4 aggregation in two blocks, 8 ToR. One link per connected pair."), playBtn), h("div", { class: "hw-side" }, debateBox("Which faults did people find first, and which took longest?"), prompts))
  );
  return { show() {} };
}
export const rng = {
  id: "rng",
  title: "Reserve · RNG: flat datacenter networks at scale",
  short: "RNG",
  hidden: false,
  mount(body) {
    body.append(h("p", { class: "stub-note" }, "Reserve segment. Not built yet: the source is RNG (Bernardi et al., arXiv 2026), in articles/RNG - Flat Datacenter Networks at Scale.pdf. Build it after the two main hours."));
    return { show() {} };
  }
};
const PAPER_BASE = "https://cdn.jsdelivr.net/gh/shaygol/data-centers-and-ai-networks@main/articles/";
const PAPERS = [
  ["SIGCOMM \u201915 version, 15 pages", "Jupiter%20Rising%20-%20Decade%20of%20Clos%20Topologies%20in%20Google%20Datacenter%20Network_v2.pdf"],
  ["CACM 2016 print, 10 pages", "Jupiter%20Rising%20-%20Decade%20of%20Clos%20Topologies%20in%20Google%20Datacenter%20Network.pdf"]
];
export const paperTab = {
  id: "paper",
  title: "The paper",
  short: "Paper",
  hidden: false,
  mount(body) {
    body.append(
      h("p", { class: "paper-note" }, "Both versions of the paper are stored in the course repository. Each opens in a new tab, so neither adds to the size or memory of this page."),
      h("ul", { class: "paper-list" }, PAPERS.map(([label, file]) => h("li", {}, h("a", { href: PAPER_BASE + file, target: "_blank", rel: "noopener" }, `Open the PDF: ${label} \u2197`)))),
      h("p", { class: "paper-note" }, "Passages elsewhere in this deck are quoted from the CACM 2016 print, so section numbers and wording can differ in the SIGCOMM \u201915 version.")
    );
    return { show() {} };
  }
};
export const homework = { id: "homework", title: "Hour 1 · Homework review: the JR-16 fabric", short: "Homework review", hidden: false, mount: mountHomework };
