// Miswire Hunt, single-player console with delayed feedback.
// Layout: the map on the left, an inspector on the right, four mission steps above them (Collect, Inspect, Drain, Explain).
// The student's work is kept in localStorage and sent to Supabase only when they press Submit.
// Before REVEAL_AT (js/config.js, by default the deadline) nothing here tells the student whether an answer is right.
// After it the page shows their own results (the "Your results" part) and what really happens to the links they left in.
(function () {
  const $ = id => document.getElementById(id);
  const { render, LABELS, esc } = window.MH_MAP;
  const P = window.MH_PUZZLE, T = window.MH_TOPO, HW = window.MH_HW;
  const KEY = "mh-solo-v2";
  // every moving thing on the page is skipped for people who asked their system for less motion (the CSS does the same for its own animations)
  const REDUCED = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  // elements are redrawn from scratch on every change, so a one-shot animation is a class added to the fresh element
  const pop = (selector, cls) => { const e = document.querySelector(selector); if (e) e.classList.add(cls); };
  let flashSw = null, fxTimers = [];  // the switch that just got its last diagnosis; timers of the packets on the map

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  let saved = {};
  try { saved = JSON.parse(store.get(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  const diag = saved.diag || {};                 // "SW:port" -> label
  const drained = new Set(saved.drained || []);  // "upper|lower" link keys taken out of routing
  const answers = saved.answers || {};           // { q1, q2 }
  let nick = saved.nick || "", submittedAt = saved.submittedAt || null;
  // submittedAt: set while the work on the page is exactly what was sent. sentAt and sentSnap: the last successful Submit
  // (time and a copy of what went out), kept after later edits so a second Submit can say what it is about to replace.
  let sentAt = saved.sentAt || saved.submittedAt || null, sentSnap = saved.sentSnap || null;
  let step = Math.min(3, saved.step != null ? saved.step : 0), collected = !!saved.collected, collecting = false;
  const uid = saved.uid || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : "u" + Date.now() + Math.random().toString(36).slice(2));
  const persist = () => store.set(KEY, JSON.stringify({ uid, diag, drained: Array.from(drained), answers, nick, submittedAt, sentAt, sentSnap, step, collected }));

  const TOTAL_PORTS = Object.values(P.views).reduce((n, v) => n + v.length, 0);
  // Drain opens once every port is diagnosed. Saved work that already has a drain in it stays open.
  const drainOpen = () => Object.keys(diag).length >= TOTAL_PORTS || drained.size > 0;
  if (step === 2 && !drainOpen()) step = 1;
  let sel = null, selPort = null;
  const probed = new Set();                      // "SW:port"

  const rowsOf = sw => (P.views[sw] || []).map(a => ({ port: a[0], expected: a[1], discovered: a[2], peer_hears: a[3], phy: a[4], err: a[5] }));
  const linkKey = l => l.a.s + "|" + l.b.s;
  const ORDER_KEYS = ["OK", "MISWIRED", "ONE_WAY", "HIGH_ERRORS", "LINK_DOWN", "PEER_SILENT"];
  const LCOL = { OK: "var(--ok)", MISWIRED: "var(--bad)", ONE_WAY: "var(--c-oneway)", HIGH_ERRORS: "var(--warn)", LINK_DOWN: "var(--c-down)", PEER_SILENT: "var(--c-silent)" };
  const HINT = { OK: "Plan and reality agree, both directions", MISWIRED: "A different peer than the plan", ONE_WAY: "Only one direction works", HIGH_ERRORS: "Up and correct, but error rate is high", LINK_DOWN: "PHY down: no working cable", PEER_SILENT: "PHY up but nothing heard from the peer" };

  // ---------- map ----------
  function drawMap() {
    fxTimers.forEach(clearTimeout); fxTimers = [];  // a redraw replaces the SVG, and the packets on it
    const reported = new Set();
    Object.keys(diag).forEach(k => reported.add(k.split(":")[0]));
    if (step === 0 && collected) T.ALL.forEach(s => { if (P.views[s]) reported.add(s); });
    const prog = {};
    T.ALL.forEach(s => { const rs = rowsOf(s), n = rs.filter(r => diag[s + ":" + r.port]).length; if (n) prog[s] = [n, rs.length]; });
    const showSw = step === 1 && sel;
    const rows = showSw ? rowsOf(sel) : [];
    const labels = {};
    rows.forEach(r => { const l = diag[sel + ":" + r.port]; if (l) labels[r.port] = l; });
    const panel = rows.length ? { sw: sel, rows, labels, sel: selPort, probed: new Set(rows.filter(r => probed.has(sel + ":" + r.port)).map(r => r.port)) } : null;
    render($("map"), { latest: diag, reported, prog, confirmed: new Set(), flags: {}, myflags: [], me: showSw ? sel : null, flash: new Set(flashSw ? [flashSw] : []), selPair: null, probePair: null, panel, master: true, masterSel: step === 2 || step === 0, drained });
    $("map").classList.toggle("drainmode", step === 2);
  }

  // ---------- mission bar ----------
  function renderMissions() {
    const nd = Object.keys(diag).length, na = (answers.q1 ? 1 : 0) + (answers.q2 ? 1 : 0);
    const setV = (id, t) => {
      const el = $(id), first = !el.dataset.set; el.dataset.set = "1";
      if (el.textContent === t) return;
      el.textContent = t;
      if (!first) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    };
    setV("m0v", collected ? "done" : "not yet");
    setV("m1v", nd + " / " + TOTAL_PORTS);
    const locked = !drainOpen();
    setV("m2v", locked ? "locked" : drained.size + (drained.size === 1 ? " link" : " links"));
    setV("m3v", na + " / 2");
    const done = { 0: collected, 1: nd > 0, 2: drained.size > 0, 3: na === 2 };
    document.querySelectorAll(".ms").forEach(b => {
      const n = +b.dataset.step;
      b.classList.toggle("on", n === step);
      b.classList.toggle("done", done[n]);
      b.setAttribute("aria-current", n === step ? "step" : "false");
      if (n === 2) { b.classList.toggle("locked", locked); b.title = locked ? "Opens when all " + TOTAL_PORTS + " ports are diagnosed" : ""; }
    });
    const nextLocked = step === 1 && locked;
    $("nextBtn").classList.toggle("locked", nextLocked);
    document.body.classList.toggle("submitted", !!submittedAt);
    $("prevBtn").hidden = step === 0;
    $("nextBtn").textContent = nextLocked ? "Drain opens after all " + TOTAL_PORTS + " ports (" + (TOTAL_PORTS - nd) + " to go)" : ["Next: inspect switches →", "Next: drain links →", "Next: explain →", "Next: questions 1–3 ↓"][step] || "";
  }

  // ---------- intro ----------
  // the little picture of the fabric next to the intro: the map's own drawing, without labels, racks or tags
  (function introPicture() {
    const svg = $("introMap");
    render(svg, { latest: {}, reported: new Set(), confirmed: new Set(), flags: {}, myflags: [], me: null, flash: new Set(), selPair: null, probePair: null, panel: null, master: false, masterSel: false, drained: new Set() });
    svg.setAttribute("viewBox", "70 22 850 340");
    svg.querySelectorAll(".rack, .tier, .blk, .hit, title").forEach(e => e.remove());
    // a few packets drift over the picture. Decoration only: the links are a fixed spread and say nothing about the faults.
    if (!REDUCED) svg.insertAdjacentHTML("beforeend", [1, 6, 11, 12, 17, 21, 26, 31].map((i, n) => {
      const l = T.links[i], a = T.pos[l.a.s], b = T.pos[l.b.s];
      return '<circle class="ip-pk" r="7"><animateMotion dur="' + (2.4 + (n % 4) * 0.5) + 's" begin="' + (n * 0.45) + 's" repeatCount="indefinite" calcMode="linear" keyTimes="0;1" keyPoints="' + (n % 2 ? "1;0" : "0;1") + '" path="M' + a[0] + "," + (a[1] + 16) + " L" + b[0] + "," + (b[1] - 14) + '"/></circle>';
    }).join(""));
  })();

  // ---------- step 0: collect link state over the CPN ----------
  const portUp = r => r.phy === "UP" && r.discovered === r.expected && r.peer_hears === "yes";
  function endState(e) { const r = rowsOf(e.s).filter(x => x.port === e.p)[0]; return !P.views[e.s] ? "no report" : r && portUp(r) ? "UP" : "DOWN"; }
  function renderCollect() {
    $("collectBtn").disabled = collecting;
    $("collectBtn").textContent = collecting ? "Collecting..." : collected ? "Collect again" : "Collect link state from all switches";
    $("lsd").hidden = !collected || collecting;
    $("s0k").textContent = collected ? "Step 1 · Collect · done" : "Step 1 · Collect";
    $("s0h").textContent = collected ? "Link state collected" : "Collect the state of every link";
    if (!collected) return;
    const down = T.links.filter(l => endState(l.a) !== "UP" || endState(l.b) !== "UP");
    $("lsdSum").innerHTML = "<b>15 of 16 switches answered.</b> T7 did not answer. " + (T.links.length - down.length) + " links up, " + down.length + " down.";
    // one line per link: the two ends, then what each end reports (a pill each, same width so the columns line up)
    const pill = x => '<span class="pill ' + (x === "UP" ? "up" : x === "DOWN" ? "down" : "none") + '">' + x + "</span>";
    const end = e => '<span class="lsd-e"><b>' + esc(e.s) + "</b> " + esc(e.p) + "</span>";
    const pillOf = (x, e) => { const p = pill(x); return p.replace("<span ", '<span title="' + esc(e.s + " " + e.p + " says " + x) + '" '); };
    $("lsdDown").innerHTML = '<thead><tr><th scope="col">Link</th><th scope="colgroup" colspan="2">Each end says</th></tr></thead><tbody>' + down.map(l => {
      const sa = endState(l.a), sb = endState(l.b);
      return '<tr data-open="' + esc(l.a.s) + '"><td class="lsd-link"><button type="button" class="lsd-go" title="Open ' + esc(l.a.s) + '">' + end(l.a) + " <i>↔</i> " + end(l.b) + "</button></td>" +
        "<td>" + pillOf(sa, l.a) + "</td><td>" + pillOf(sb, l.b) + "</td></tr>";
    }).join("") + "</tbody>";
  }
  function collect() {
    if (collecting) return;
    collecting = true; refresh();
    const svg = $("map"), M = [863, 70];
    let h = '<g class="cpn-anim">';
    T.ALL.forEach((s, i) => {
      const [x, y] = T.pos[s], back = !!P.views[s];
      h += '<line class="cpn-ln" x1="' + M[0] + '" y1="' + M[1] + '" x2="' + x + '" y2="' + y + '"/>';
      h += '<circle class="cpn-pk' + (back ? "" : " lost") + '" r="4" cx="-20" cy="-20"><animateMotion begin="indefinite" dur="' + (back ? 1.4 : 0.7) + 's" fill="freeze" path="M' + M[0] + "," + M[1] + " L" + x + "," + y + (back ? " L" + M[0] + "," + M[1] : "") + '"/></circle>';
    });
    svg.insertAdjacentHTML("beforeend", h + "</g>");
    svg.querySelectorAll(".cpn-anim animateMotion").forEach((a, i) => setTimeout(() => { try { a.beginElement(); } catch (e) {} }, i * 70));
    setTimeout(() => { collecting = false; collected = true; persist(); refresh(); }, T.ALL.length * 70 + 1600);
  }
  $("collectBtn").addEventListener("click", collect);
  $("lsdDown").addEventListener("click", e => { const b = e.target.closest("[data-open]"); if (b) openSwitch(b.getAttribute("data-open")); });

  // ---------- step 1: inspect ----------
  function renderInspect() {
    const rows = sel ? rowsOf(sel) : [], dark = sel === "T7";
    // the switch picker (narrow screens): one button per switch, grouped by tier, with how far its ports are diagnosed
    $("swPick").innerHTML = [["Spine", T.SP], ["Aggr.", T.AG], ["ToR", T.TOR]].map(g => '<div class="swp-row"><span class="swp-k">' + g[0] + "</span>" + g[1].map(s => {
      const rs = rowsOf(s), n = rs.filter(r => diag[s + ":" + r.port]).length, st = !rs.length ? "dark" : n === rs.length ? "all" : n ? "some" : "none";
      const tip = !rs.length ? "does not answer" : n + " of " + rs.length + " ports diagnosed";
      return '<button type="button" class="swp swp-' + st + (s === sel ? " on" : "") + '" data-sw="' + s + '" aria-pressed="' + (s === sel) + '" aria-label="' + s + ": " + tip + '" title="' + tip + '">' + s + "</button>";
    }).join("") + "</div>").join("");
    $("s1empty").hidden = !!sel;
    $("s1dark").hidden = !dark;
    $("s1sw").hidden = !(sel && rows.length);
    if (!sel || !rows.length) return;
    const nd = rows.filter(r => diag[sel + ":" + r.port]).length;
    $("swTitle").innerHTML = esc(sel) + ' <span class="role">' + esc(T.role(sel)) + "</span>" + '<span class="swprog">' + nd + " / " + rows.length + " diagnosed</span>";
    $("portList").innerHTML = rows.map(r => {
      const d = diag[sel + ":" + r.port], on = r.port === selPort;
      // compact: port name and a dot in the diagnosis colour (the full label is in the tooltip and in the probe below)
      const lab = d ? LABELS[d] : "not diagnosed";
      return '<li><button type="button" class="pl' + (on ? " on" : "") + '" data-port="' + esc(r.port) + '" title="' + esc(r.port + ": " + lab) + '" aria-label="' + esc(r.port + ": " + lab) + '"><span class="pl-p">' + esc(r.port) + "</span>" +
        (d ? '<span class="pl-dot" style="--tc:' + LCOL[d] + '"></span>' : '<span class="pl-dot none"></span>') + "</button></li>";
    }).join("");
    $("portList").style.setProperty("--n", rows.length);  // one row of small tiles, however many ports the switch has
    const r = rows.filter(x => x.port === selPort)[0];
    $("probe").hidden = !r;
    $("probeHint").hidden = !!r;
    if (!r) return;
    const silent = r.discovered === "-", mism = !silent && r.discovered !== r.expected;
    $("wire").innerHTML = wire(sel + " " + r.port, r);
    const fact = (id, v, bad) => { $(id).textContent = v; $(id).className = bad ? "bad" : ""; };
    fact("pvPhy", r.phy, r.phy === "DOWN");
    fact("pvHears", r.peer_hears, r.peer_hears === "no");
    fact("pvErr", r.err, r.err !== "<1e-12");
    $("dqPort").textContent = sel + " " + r.port;
    const cur = diag[sel + ":" + r.port];
    $("dbox").classList.toggle("todo", !cur);
    $("dgrid").innerHTML = ORDER_KEYS.map(k => '<button type="button" class="dg' + (cur === k ? " on" : "") + '" data-label="' + k + '" title="' + HINT[k] + '" style="--tc:' + LCOL[k] + '"><i></i>' + LABELS[k] + "</button>").join("");
  }


  // The plan and the reality drawn as port -> cable -> port, with one arrow per direction.
  function wire(me, r) {
    const silent = r.discovered === "-", mism = !silent && r.discovered !== r.expected, down = r.phy === "DOWN";
    const box = (x, y, t, cls) => '<rect class="wb ' + (cls || "") + '" x="' + x + '" y="' + y + '" width="96" height="26" rx="5"/><text class="wt ' + (cls || "") + '" x="' + (x + 48) + '" y="' + (y + 17) + '" text-anchor="middle">' + esc(t) + "</text>";
    const tri = (x, y, dir, cls) => '<path class="wa ' + cls + '" d="M' + x + " " + y + " l" + (-8 * dir) + " -5 v10 z\"/>";
    const cross = (x, y) => '<text class="wx" x="' + x + '" y="' + (y + 5) + '" text-anchor="middle">\u2715</text>';
    let h = '<text class="wl" x="0" y="70">WHAT THE SWITCH HEARS</text>' + box(0, 76, me, "me") + box(234, 76, silent ? "nothing" : r.discovered, silent || mism ? "bad" : "ok");
    if (down) {
      h += '<line class="wln bad dash" x1="96" y1="89" x2="234" y2="89"/>' + cross(165, 89) + '<text class="wnote bad" x="165" y="113" text-anchor="middle">no signal: PHY down</text>';
    } else {
      const out = r.peer_hears === "yes" ? "ok" : r.peer_hears === "no" ? "bad" : "unk", inn = silent ? "bad" : "ok";
      h += '<line class="wln ' + out + (out === "unk" ? " dash" : "") + '" x1="100" y1="83" x2="224" y2="83"/>' + tri(232, 83, 1, out) + (out === "bad" ? cross(165, 83) : "");
      h += '<line class="wln ' + inn + (inn === "bad" ? " dash" : "") + '" x1="106" y1="95" x2="230" y2="95"/>' + tri(98, 95, -1, inn) + (inn === "bad" ? cross(165, 95) : "");
      h += '<text class="wnote" x="165" y="114" text-anchor="middle">\u2192 peer hears you: ' + esc(r.peer_hears) + " \u00b7 \u2190 you hear: " + (silent ? "nothing" : "yes") + "</text>";
      if (r.err !== "<1e-12") h += '<text class="wnote warn" x="165" y="76" text-anchor="middle">error rate ' + esc(r.err) + "</text>";
    }
    if (mism) h += '<text class="wnote bad" x="282" y="66" text-anchor="middle">\u2260 map: ' + esc(r.expected) + "</text>";
    return '<svg viewBox="-2 58 334 62" role="img" aria-label="What the switch hears on this port">' + h + "</svg>";
  }

  // ---------- step 2: the Firepath master ----------
  // ECMP: number of shortest paths between two ToRs over the links that are not drained (T7 is crashed: not a node)
  function paths(src, dst, out) {
    const adj = {};
    T.links.forEach(l => {
      if (out.has(linkKey(l)) || l.a.s === "T7" || l.b.s === "T7") return;
      (adj[l.a.s] = adj[l.a.s] || []).push(l.b.s); (adj[l.b.s] = adj[l.b.s] || []).push(l.a.s);
    });
    const dist = { [src]: 0 }, cnt = { [src]: 1 }, q = [src];
    while (q.length) {
      const u = q.shift();
      (adj[u] || []).forEach(v => {
        if (dist[v] === undefined) { dist[v] = dist[u] + 1; cnt[v] = 0; q.push(v); }
        if (dist[v] === dist[u] + 1) cnt[v] += cnt[u];
      });
    }
    return cnt[dst] || 0;
  }
  const PAIRS = [["T1", "T8"], ["T4", "T5"], ["T5", "T6"]];
  const linkText = l => l.a.s + " " + l.a.p + " ↔ " + l.b.s + " " + l.b.p;

  function renderDrain() {
    const bad = T.links.filter(l => { const a = diag[l.a.s + ":" + l.a.p], b = diag[l.b.s + ":" + l.b.p]; return (a && a !== "OK") || (b && b !== "OK"); });
    const item = l => {
      const k = linkKey(l), a = diag[l.a.s + ":" + l.a.p], b = diag[l.b.s + ":" + l.b.p];
      return '<li><button type="button" class="dl' + (drained.has(k) ? " on" : "") + '" data-drain="' + k + '"><span class="dl-x">' + (drained.has(k) ? "✕" : "") + '</span><span class="dl-t">' + esc(linkText(l)) + '</span><span class="fine">' + (a ? LABELS[a] : "—") + " / " + (b ? LABELS[b] : "—") + '</span><span class="dl-s">' + (drained.has(k) ? "drained" : "in routing") + "</span></button></li>";
    };
    $("flagged").innerHTML = bad.length ? bad.map(item).join("") : '<li class="fine">None yet. Diagnose ports in step 2 first.</li>';
    const nBad = bad.filter(l => drained.has(linkKey(l))).length;
    $("drainCount").textContent = bad.length ? "(" + nBad + " of " + bad.length + " drained)" : "";
    // a link is listed once: the second list holds only drains with no diagnosis behind them
    const extra = T.links.filter(l => drained.has(linkKey(l)) && bad.indexOf(l) < 0);
    $("extraBox").hidden = !extra.length;
    $("drainList").innerHTML = extra.map(item).join("");
  }
  // ---------- the answer key, used only after REVEAL_AT ----------
  const CFG = window.MH_CONFIG || {};
  const REVEAL = Date.parse(CFG.REVEAL_AT || CFG.DEADLINE || "");
  const revealed = () => !!REVEAL && Date.now() >= REVEAL;
  const accepted = k => (P.truth[k] ? P.truth[k].a : ["OK"]);
  const isRight = k => !!diag[k] && accepted(k).indexOf(diag[k]) >= 0;
  const endKey = e => e.s + ":" + e.p;
  const truthOf = e => (P.truth[endKey(e)] ? P.truth[endKey(e)].a : []);
  const brokenLinks = T.links.filter(l => P.truth[endKey(l.a)] || P.truth[endKey(l.b)]);
  const brokenKeys = new Set(brokenLinks.map(linkKey));
  // what a broken link does to traffic if it stays in routing
  function effect(l) {
    const a = truthOf(l.a), all = a.concat(truthOf(l.b)), name = "<b>" + esc(linkText(l)) + "</b>";
    if (a.indexOf("MISWIRED") >= 0) {
      const r = rowsOf(l.a.s).filter(x => x.port === l.a.p)[0], want = r.expected.split(" ")[0], got = r.discovered.split(" ")[0];
      return name + ": " + esc(l.a.s) + " forwards a packet for " + esc(want) + " on " + esc(l.a.p) + ", but that cable goes to " + esc(got) + ". " + esc(got) + " is not the destination, so it sends the packet back up, and it can go round like this until its TTL runs out: a forwarding loop.";
    }
    if (all.indexOf("LINK_DOWN") >= 0) return name + ": there is no working cable. Every packet sent on it is dropped.";
    if (all.indexOf("ONE_WAY") >= 0) return name + ": it works in one direction only. Packets in the other direction are lost.";
    if (all.indexOf("HIGH_ERRORS") >= 0) return name + ": it is up and correctly cabled, but many packets arrive corrupted and are dropped.";
    return name + ": the switch at the far end does not run, so nothing sent on it is forwarded.";
  }
  const leftIn = () => brokenLinks.filter(l => !drained.has(linkKey(l)));
  const wasted = () => T.links.filter(l => drained.has(linkKey(l)) && !brokenKeys.has(linkKey(l)));

  // What the drains cost, from the plan alone (no answer key): links, ToR uplinks and equal-cost paths that remain.
  function capacity() {
    const tors = T.TOR.filter(t => t !== "T7"), none = new Set();
    let now = 0, full = 0, cut = 0;
    tors.forEach((a, i) => tors.slice(i + 1).forEach(b => { const n = paths(a, b, drained); now += n; full += paths(a, b, none); if (!n) cut++; }));
    const up = t => T.links.filter(l => l.b.s === t && !drained.has(linkKey(l))).length;
    return { now, full, cut, pct: full ? Math.round(100 * now / full) : 0, isolated: tors.filter(t => up(t) === 0), single: tors.filter(t => up(t) === 1) };
  }
  function recompute() {
    const c = capacity(), none = new Set();
    const tr = (k, v, cls) => "<tr><td>" + k + '</td><td class="num' + (cls ? " " + cls : "") + '">' + v + "</td></tr>";
    let h = "<table><tbody>" + tr("Links in routing", (T.links.length - drained.size) + " of " + T.links.length) +
      tr("Equal-cost paths, all ToR pairs", c.pct + "%", c.pct < 50 ? "warn" : "") +
      PAIRS.map(p => { const n = paths(p[0], p[1], drained); return tr(p[0] + " → " + p[1], n + " of " + paths(p[0], p[1], none) + " paths", n ? "" : "warn"); }).join("") + "</tbody></table>";
    h += '<div class="mres-bar" role="img" aria-label="' + c.pct + ' percent of the equal-cost paths remain"><span style="width:' + c.pct + '%"></span></div>';
    const notes = [];
    if (c.isolated.length) notes.push(["warn", "<b>" + c.isolated.join(", ") + "</b> " + (c.isolated.length === 1 ? "has" : "have") + " no uplink left: the servers in " + (c.isolated.length === 1 ? "that rack" : "those racks") + " are cut off."]);
    if (c.single.length) notes.push(["", "<b>" + c.single.join(", ") + "</b> " + (c.single.length === 1 ? "is" : "are") + " down to one uplink: one more failure cuts the rack off."]);
    if (c.cut) notes.push(["warn", c.cut + " ToR pair" + (c.cut === 1 ? " has" : "s have") + " no path at all."]);
    // consistency with the student's own diagnoses (this does not use the answer key)
    const dOf = l => [diag[endKey(l.a)], diag[endKey(l.b)]], isBad = x => x && x !== "OK";
    const still = T.links.filter(l => !drained.has(linkKey(l)) && dOf(l).some(isBad));
    const noReason = T.links.filter(l => drained.has(linkKey(l)) && !dOf(l).some(isBad));
    if (still.length) notes.push(["", still.length + " link" + (still.length === 1 ? "" : "s") + " you diagnosed as faulty " + (still.length === 1 ? "is" : "are") + " still in routing." + (still.some(l => dOf(l).indexOf("MISWIRED") >= 0) ? " A miswired link that carries traffic can cause a forwarding loop (Section 5.2.1)." : "")]);
    if (noReason.length) notes.push(["", noReason.length + " drained link" + (noReason.length === 1 ? " has" : "s have") + " no fault diagnosis from you: that capacity is given up without a recorded reason."]);
    if (!drained.size) notes.push(["", "Nothing is drained, so the fabric keeps its full capacity and every link, broken or not, still carries traffic."]);
    if (notes.length) h += '<ul class="mres-notes">' + notes.map(n => '<li class="' + n[0] + '">' + n[1] + "</li>").join("") + "</ul>";
    if (revealed()) {
      const li = leftIn(), w = wasted();
      h += '<h4 class="sub">What really happens</h4><ul class="mres-notes">' +
        (li.length ? li.map(l => '<li class="warn">' + effect(l) + "</li>").join("") : '<li class="good">No broken link is left in routing.</li>') +
        (w.length ? "<li>" + w.length + " working link" + (w.length === 1 ? "" : "s") + " drained for nothing: " + w.map(l => esc(linkText(l))).join(", ") + ".</li>" : "") + "</ul>";
    }
    if (!REDUCED) h += '<p class="fine mres-fx">On the map: the master sends the new link state, then one packet takes each equal-cost path for the three pairs above.</p>';
    $("masterRes").hidden = false;
    $("masterRes").innerHTML = h;
    $("masterRes").scrollIntoView({ behavior: "smooth", block: "nearest" });
    traffic();
  }

  // ---------- traffic on the map after Recompute ----------
  // One packet per equal-cost path for each of the three ToR pairs, so ECMP is something you see and a drain visibly thins it.
  // Before REVEAL_AT every packet follows the plan. After it, a packet that meets a broken link left in routing is dropped there,
  // or bounces between two switches if the link is miswired.
  function stopTraffic() { fxTimers.forEach(clearTimeout); fxTimers = []; const g = $("map").querySelector(".fx"); if (g) g.remove(); }
  function allPaths(src, dst) {
    const adj = {};
    T.links.forEach(l => {
      if (drained.has(linkKey(l)) || l.a.s === "T7" || l.b.s === "T7") return;
      (adj[l.a.s] = adj[l.a.s] || []).push(l.b.s); (adj[l.b.s] = adj[l.b.s] || []).push(l.a.s);
    });
    const dist = { [dst]: 0 }, q = [dst], out = [];
    while (q.length) { const u = q.shift(); (adj[u] || []).forEach(v => { if (dist[v] === undefined) { dist[v] = dist[u] + 1; q.push(v); } }); }
    if (dist[src] === undefined) return out;
    (function walk(u, p) { if (u === dst) { out.push(p); return; } adj[u].forEach(v => { if (dist[v] === dist[u] - 1) walk(v, p.concat(v)); }); })(src, [src]);
    return out;
  }
  // where a packet on this path really ends up: the points it visits, and "ok", "drop" or "loop"
  function fate(path, idx) {
    const pts = [T.pos[path[0]]], rowAt = e => rowsOf(e.s).filter(x => x.port === e.p)[0];
    for (let i = 1; i < path.length; i++) {
      const u = path[i - 1], v = path[i], l = T.links.filter(x => (x.a.s === u && x.b.s === v) || (x.a.s === v && x.b.s === u))[0];
      if (revealed() && brokenKeys.has(linkKey(l))) {
        const down = l.a.s === u, from = down ? l.a : l.b, kinds = truthOf(l.a).concat(truthOf(l.b)), r = rowAt(from), got = r && r.discovered !== "-" ? r.discovered.split(" ")[0] : null;
        if (down && truthOf(l.a).indexOf("MISWIRED") >= 0) { pts.push(T.pos[got], T.pos[u], T.pos[got], T.pos[u], T.pos[got]); return { pts, end: "loop" }; }
        const passes = kinds.indexOf("LINK_DOWN") >= 0 ? false :
          truthOf(from).indexOf("MISWIRED") >= 0 ? got === v :              // a swapped pair of cables still reaches the same switch upwards
          kinds.indexOf("ONE_WAY") >= 0 ? r.peer_hears !== "no" :           // only the dead direction loses packets
          kinds.indexOf("HIGH_ERRORS") >= 0 ? idx % 2 === 0 : false;        // a noisy link corrupts some of them
        if (!passes) { const a = T.pos[u], b = T.pos[v]; pts.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); return { pts, end: "drop" }; }
      }
      pts.push(T.pos[v]);
    }
    return { pts, end: "ok" };
  }
  function traffic() {
    stopTraffic();
    if (REDUCED) return;
    const svg = $("map"); svg.insertAdjacentHTML("beforeend", '<g class="fx"></g>');
    const g = svg.querySelector(".fx"), later = (ms, fn) => fxTimers.push(setTimeout(fn, ms));
    const mark = (p, cls, text, ms) => { g.insertAdjacentHTML("beforeend", '<text class="' + cls + '" x="' + p[0] + '" y="' + p[1] + '" text-anchor="middle">' + text + "</text>"); const t = g.lastChild; later(ms, () => t.remove()); };
    const fly = (pts, cls, dur, at, done) => later(at, () => {
      g.insertAdjacentHTML("beforeend", '<circle class="fx-pk ' + cls + '" r="4.5"><animateMotion begin="indefinite" dur="' + dur + 's" fill="freeze" path="M' + pts.map(p => p[0] + "," + p[1]).join(" L") + '"/></circle>');
      const c = g.lastChild; try { c.firstChild.beginElement(); } catch (e) {}
      later(dur * 1000, () => { c.remove(); if (done) done(); });
    });
    T.ALL.forEach((s, i) => { if (P.views[s]) fly([[863, 70], T.pos[s]], "lsd", 0.7, i * 40); });
    PAIRS.forEach((p, k) => {
      const ps = allPaths(p[0], p[1]), t0 = 1500 + k * 3000, a = T.pos[p[0]], b = T.pos[p[1]];
      later(t0, () => { mark([a[0], a[1] - 20], "fx-tag", p[0] + " → " + p[1], 2800); mark([b[0], b[1] - 20], "fx-tag", "to " + p[1], 2800); });
      if (!ps.length) { later(t0, () => mark([a[0], a[1] - 34], "fx-x", "no path", 2600)); return; }
      ps.forEach((path, j) => {
        const f = fate(path, j), end = f.pts[f.pts.length - 1];
        fly(f.pts, "", 0.42 * (f.pts.length - 1), t0 + j * 110, f.end === "ok" ? null : () => mark([end[0], end[1] + 5], "fx-x", f.end === "loop" ? "↻" : "✕", 1300));
      });
    });
  }

  // ---------- your results (after REVEAL_AT) ----------
  let resSig = null;
  // the cards rise in the first time the part scrolls into view
  if (window.IntersectionObserver) new IntersectionObserver((es, io) => { if (es.some(e => e.isIntersecting)) { $("partR").classList.add("seen"); io.disconnect(); } }, { threshold: 0.05 }).observe($("partR"));
  else $("partR").classList.add("seen");
  function renderResults() {
    const show = revealed();
    $("partR").hidden = !show;
    if (!show) return;
    const sig = JSON.stringify([diag, Array.from(drained), answers]);
    if (sig === resSig) return;
    resSig = sig;
    const portText = k => k.replace(":", " ");
    const faults = P.faults.map(f => {
      const ports = Object.keys(P.truth).filter(k => P.truth[k].f === f.id), right = ports.filter(isRight);
      const st = new Set(right.map(k => k.split(":")[0])).size >= 2 ? "found" : right.length ? "partly" : "missed";
      return { f, ports, st };
    });
    const nFound = faults.filter(x => x.st === "found").length;
    const dk = Object.keys(diag), nRight = dk.filter(isRight).length;
    const falseAlarm = dk.filter(k => !P.truth[k] && diag[k] !== "OK");
    const li = leftIn(), w = wasted();
    const tile = (v, k, all) => "<div" + (all ? ' class="all"' : "") + "><dt>" + k + "</dt><dd>" + v + "</dd></div>";
    $("resSum").innerHTML = tile(nFound + " / " + P.faults.length, "Faults found", nFound === P.faults.length) + tile(nRight + " / " + dk.length, "Diagnoses right") +
      tile((brokenLinks.length - li.length) + " / " + brokenLinks.length, "Broken links drained") + tile(w.length, "Working links drained");
    const WORD = { found: "Found", partly: "Partly", missed: "Missed" };
    $("resFaults").innerHTML = faults.map(x => '<li class="res-' + x.st + '"><span class="res-st">' + WORD[x.st] + "</span><div><b>" + esc(x.f.title) + ".</b> " + esc(x.f.text) + ' <span class="fine">(' + esc(x.f.ref) + ')</span><ul class="res-ports">' +
      x.ports.map(k => "<li><b>" + esc(portText(k)) + "</b> is " + accepted(k).map(a => LABELS[a]).join(" or ") + ". You: " + (diag[k] ? LABELS[diag[k]] + (isRight(k) ? " ✓" : " ✗") : "not diagnosed") + "</li>").join("") + "</ul></div></li>").join("");
    $("resDrain").innerHTML = (li.length ? li.map(l => '<li class="bad">Left in routing. ' + effect(l) + "</li>").join("") : '<li class="good">Every broken link is drained.</li>') +
      (w.length ? "<li>" + w.length + " working link" + (w.length === 1 ? "" : "s") + " drained, which only costs capacity: " + w.map(l => esc(linkText(l))).join(", ") + ".</li>" : '<li class="good">No working link is drained.</li>') +
      (falseAlarm.length ? "<li>" + falseAlarm.length + " healthy port" + (falseAlarm.length === 1 ? "" : "s") + " diagnosed as faulty: " + falseAlarm.map(k => esc(portText(k))).join(", ") + ".</li>" : "");
    const label = (q, v) => { const el = document.querySelector('input[name="' + q + '"][value="' + v + '"]'); return el ? el.parentNode.textContent.trim() : ""; };
    $("resRc").innerHTML = ["q1", "q2"].map((q, i) => {
      const ok = answers[q] === P.rc[q];
      return '<li class="' + (ok ? "good" : "bad") + '"><b>Question ' + (i + 1) + ".</b> " + (answers[q] ? "You: " + esc(label(q, answers[q])) + (ok ? " ✓" : " ✗. Right answer: " + esc(label(q, P.rc[q])) + ".") : "Not answered. Right answer: " + esc(label(q, P.rc[q])) + ".") + "</li>";
    }).join("");
  }
  function toggleDrain(k) {
    const cut = !drained.has(k);
    if (cut) drained.add(k); else drained.delete(k);
    $("masterRes").hidden = true; touch(); refresh();
    if (cut) pop('#map .cutmark[data-cut="' + k + '"]', "snip");
  }

  // ---------- step 4: submit ----------
  function renderSubmit() {
    const nd = Object.keys(diag).length, answered = !!(answers.q1 && answers.q2);
    const item = (ok, text) => '<li class="' + (ok ? "ok" : "") + '"><span class="tick" aria-hidden="true">' + (ok ? "✓" : "○") + "</span> " + text + "</li>";
    const hwMissing = HW.missing();
    $("doneList").innerHTML = item(nd > 0, nd + " of " + TOTAL_PORTS + " ports diagnosed") + item(drained.size > 0, drained.size + " link" + (drained.size === 1 ? "" : "s") + " drained") + item(answered, answered ? "Explain step (step 4): both answered" : "Explain step (step 4): not answered yet") +
      item(!hwMissing.length, hwMissing.length ? 'Questions <a href="#partC">1&ndash;3</a> not answered yet: ' + hwMissing.join(", ") : "Questions 1&ndash;3 answered");
    $("lastSent").textContent = !sentAt ? "" : "Last submitted " + when(sentAt) + ". " + (submittedAt ? "Nothing has changed since." : closed() ? "Changes made after that were not sent." : "You have changes that are not sent yet.");
  }
  function when(ts) {
    const d = new Date(ts), hm = d.toTimeString().slice(0, 5);
    return d.toDateString() === new Date().toDateString() ? "today at " + hm : "on " + d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " at " + hm;
  }
  function say(t) { $("submitMsg").textContent = t; }

  // ---------- refresh ----------
  function refresh() {
    [0, 1, 2, 3].forEach(n => { $("step" + n).hidden = n !== step; });
    if (step === 0) renderCollect();
    if (step === 1) renderInspect();
    if (step === 2) renderDrain();
    renderSubmit(); renderResults();
    renderMissions(); drawMap();
  }
  function touch() { if (submittedAt) { submittedAt = null; say(""); } $("resend").hidden = true; persist(); }
  // The game has four steps. "Next" after Explain scrolls down to Part C; the one Submit is the card at the bottom of the page.
  function goStep(n) {
    if (n >= 4) { openPart("partC"); $("partC").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (n === 2 && !drainOpen()) { n = 1; const m = $("m1v"); m.classList.remove("bump"); void m.offsetWidth; m.classList.add("bump"); }
    step = Math.max(0, n); persist(); refresh(); $("inspector").scrollTop = 0;
  }

  function openSwitch(sw) {
    if (sw === "MASTER") { goStep(2); return; }
    sel = sw; step = 1; $("inspector").scrollTop = 0;
    const rows = rowsOf(sw), first = rows.filter(r => !diag[sw + ":" + r.port])[0] || rows[0];
    selPort = first ? first.port : null;
    if (selPort) probed.add(sw + ":" + selPort);
    persist(); refresh(); centerOn(sw);
  }
  // Narrow screens: the map shows the whole fabric by default; "Zoom in" makes it wide and scrollable, centred on the open switch.
  function centerOn(sw) {
    const wrap = document.querySelector(".map-wrap");
    if (!wrap.classList.contains("zoomed") || !T.pos[sw]) return;
    wrap.scrollLeft = T.pos[sw][0] / 960 * $("map").getBoundingClientRect().width - wrap.clientWidth / 2;
  }
  $("zoomBtn").addEventListener("click", () => {
    const z = document.querySelector(".map-wrap").classList.toggle("zoomed");
    $("zoomBtn").textContent = z ? "Show the whole map" : "Zoom in";
    $("zoomBtn").setAttribute("aria-pressed", z);
    $("zoomNote").textContent = z ? "Swipe the map sideways to see the rest." : "The whole fabric is shown. Pick a switch on the map or from the list below it.";
    if (z && sel) centerOn(sel);
  });
  $("swPick").addEventListener("click", e => { const b = e.target.closest("[data-sw]"); if (b) openSwitch(b.getAttribute("data-sw")); });
  function selectPort(port) { selPort = port; probed.add(sel + ":" + port); refresh(); }
  function setDiag(label) {
    if (!sel || !selPort) return;
    const was = diag[sel + ":" + selPort], stamped = selPort;
    diag[sel + ":" + selPort] = label; touch();
    // move on to the next port of this switch that has no diagnosis yet
    const rows = rowsOf(sel), i = rows.findIndex(r => r.port === selPort);
    const next = rows.slice(i + 1).concat(rows.slice(0, i)).filter(r => !diag[sel + ":" + r.port])[0];
    if (next) { selPort = next.port; probed.add(sel + ":" + next.port); }
    else if (!was) { const sw = sel; flashSw = sw; setTimeout(() => { if (flashSw === sw) flashSw = null; }, 2900); }  // the last port of this switch
    refresh();
    pop('#map .pt[data-port="' + stamped + '"]', "stamp"); pop('#portList [data-port="' + stamped + '"] .pl-dot', "stamp");
  }

  // ---------- events ----------
  $("map").addEventListener("click", e => {
    const p = e.target.closest("[data-port]");
    if (p && sel && step === 1) { selectPort(p.getAttribute("data-port")); return; }
    const n = e.target.closest("[data-sw]");
    if (n) { openSwitch(n.getAttribute("data-sw")); return; }
    const pr = e.target.closest("[data-pair]");
    if (pr && step === 2) toggleDrain(pr.getAttribute("data-pair"));
  });
  $("map").addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest("[data-port],[data-sw]")) { e.preventDefault(); e.target.closest("[data-port],[data-sw]").dispatchEvent(new MouseEvent("click", { bubbles: true })); }
  });
  $("portList").addEventListener("click", e => { const b = e.target.closest("[data-port]"); if (b) selectPort(b.getAttribute("data-port")); });
  $("dgrid").addEventListener("click", e => { const b = e.target.closest("[data-label]"); if (b) setDiag(b.dataset.label); });
  document.addEventListener("keydown", e => {
    // number keys 1-6 pick a diagnosis while a port is open
    if (step !== 1 || !selPort || /INPUT|TEXTAREA/.test((e.target.tagName || ""))) return;
    const i = "123456".indexOf(e.key); if (i >= 0) setDiag(ORDER_KEYS[i]);
  });
  $("inspector").addEventListener("click", e => { const b = e.target.closest("[data-drain]"); if (b) toggleDrain(b.getAttribute("data-drain")); });
  $("recomputeBtn").addEventListener("click", recompute);
  $("missions").addEventListener("click", e => { const b = e.target.closest("[data-step]"); if (b) goStep(+b.dataset.step); });
  $("prevBtn").addEventListener("click", () => goStep(step - 1));
  $("nextBtn").addEventListener("click", () => goStep(step + 1));
  // Parts A, B and C start collapsed. The page remembers which ones the student opened,
  // and any jump into a part (a #partX link, the Next button after Explain, "Read it in the paper") opens it first.
  const OPEN_KEY = "mh-open-v1", PARTS_IDS = ["videoBox", "paperBox", "partB", "partC"];
  let openIds = []; try { openIds = JSON.parse(store.get(OPEN_KEY) || "[]") || []; } catch (e) { openIds = []; }
  PARTS_IDS.forEach(id => {
    const p = $(id); if (openIds.indexOf(id) >= 0) p.open = true;
    p.addEventListener("toggle", () => store.set(OPEN_KEY, JSON.stringify(PARTS_IDS.filter(x => $(x).open))));
  });
  function openPart(id) { const p = $(id); if (p && p.tagName === "DETAILS") p.open = true; }
  document.addEventListener("click", e => { const a = e.target.closest('a[href^="#"]'); if (a) openPart(a.getAttribute("href").slice(1)); });
  if (location.hash) openPart(location.hash.slice(1));
  function showClip(id) { openPart("paperBox"); const el = $(id) || $("paperBox"); el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
  // click a paper clipping to read it larger in a modal (Esc, the x, or a click outside closes it)
  const clipModal = $("clipModal");
  function openClip(fig) {
    const img = fig.querySelector("img"), cap = fig.querySelector("figcaption");
    $("clipModalImg").src = img.currentSrc || img.src; $("clipModalImg").alt = img.alt;
    $("clipModalCap").innerHTML = cap ? cap.innerHTML : "";
    if (clipModal.showModal) clipModal.showModal(); else clipModal.setAttribute("open", "");
    clipModal.scrollTop = 0;
  }
  document.querySelectorAll(".clip").forEach(fig => {
    const img = fig.querySelector("img"); img.tabIndex = 0; img.setAttribute("role", "button");
    img.addEventListener("click", () => openClip(fig));
    img.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openClip(fig); } });
  });
  const closeClip = () => clipModal.close ? clipModal.close() : clipModal.removeAttribute("open");
  $("clipClose").addEventListener("click", closeClip);
  clipModal.addEventListener("click", e => { if (e.target === clipModal || e.target.id === "clipModalImg") closeClip(); });
  document.addEventListener("click", e => { const b = e.target.closest("[data-clip]"); if (b) showClip(b.getAttribute("data-clip")); });

  ["q1", "q2"].forEach(q => { const el = document.querySelector('input[name="' + q + '"][value="' + answers[q] + '"]'); if (el) el.checked = true; });
  $("rcForm").addEventListener("change", e => { if (e.target.name) { answers[e.target.name] = e.target.value; touch(); renderMissions(); } });

  // ---------- time spent on the page ----------
  // A second counts only while the tab is visible and the student did something in the last minute.
  // The total is kept in localStorage across visits, shown read-only in the Submit card and sent with the game (answers.activeSec).
  const TIME_KEY = "mh-active-v1", IDLE_MS = 60000;
  let activeSec = Math.max(0, parseInt(store.get(TIME_KEY), 10) || 0), lastAct = Date.now();
  ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"].forEach(ev => window.addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true, capture: true }));
  const fmtTime = s => s < 60 ? "less than 1 min" : s < 3600 ? Math.floor(s / 60) + " min" : Math.floor(s / 3600) + " h " + String(Math.floor((s % 3600) / 60)).padStart(2, "0") + " min";
  const showTime = () => { $("spent").value = fmtTime(activeSec); };
  const saveTime = () => store.set(TIME_KEY, String(activeSec));
  setInterval(() => {
    if (document.visibilityState !== "visible" || Date.now() - lastAct >= IDLE_MS) return;
    activeSec++;
    if (activeSec % 5 === 0) { saveTime(); showTime(); }
  }, 1000);
  ["visibilitychange", "pagehide"].forEach(ev => window.addEventListener(ev, saveTime));
  showTime();

  $("nick").value = nick;
  $("nick").addEventListener("input", () => { nick = $("nick").value; persist(); });
  // One Submit for both parts: the game (submit_work) and questions 1-3 (submit_homework).
  // Missing answers only warn (they are listed in the Submit card); a partial failure says which part did not go through.
  const DEADLINE = Date.parse((window.MH_CONFIG || {}).DEADLINE || "");
  const closed = () => DEADLINE && Date.now() > DEADLINE;
  // What a Submit sends, kept after it succeeds so the next Submit can list what it would replace.
  const snapshot = () => ({ diag: Object.assign({}, diag), drained: Array.from(drained).sort(), answers: { q1: answers.q1 || "", q2: answers.q2 || "" }, hw: HW.data(), email: $("nick").value.trim().toLowerCase() });
  function changes(a, b) {
    const out = [], add = (t, warn) => out.push([t, !!warn]), n = o => Object.keys(o).length, cnt = (x, y) => x + " → " + y;
    const na = n(a.diag), nb = n(b.diag), edited = Object.keys(b.diag).filter(k => a.diag[k] && a.diag[k] !== b.diag[k]).length;
    if (na !== nb) add("Ports diagnosed: " + cnt(na, nb), nb < na);
    if (edited) add(edited + " diagnos" + (edited === 1 ? "is" : "es") + " changed");
    if (a.drained.join() !== b.drained.join()) add(a.drained.length !== b.drained.length ? "Links drained: " + cnt(a.drained.length, b.drained.length) : "A different set of links is drained", b.drained.length < a.drained.length);
    const rc = s => (s.answers.q1 ? 1 : 0) + (s.answers.q2 ? 1 : 0);
    if (rc(a) !== rc(b)) add("Step 4 questions answered: " + cnt(rc(a), rc(b)), rc(b) < rc(a));
    else if (a.answers.q1 !== b.answers.q1 || a.answers.q2 !== b.answers.q2) add("A step 4 answer changed");
    const ha = a.hw || { place: {} }, hb = b.hw, placed = h => Object.keys(h.place || {}).filter(k => h.place[k]).length;
    const moved = Object.keys(hb.place).filter(k => (ha.place || {})[k] && hb.place[k] && ha.place[k] !== hb.place[k]).length;
    if (placed(ha) !== placed(hb)) add("Question 1, parts placed: " + cnt(placed(ha), placed(hb)), placed(hb) < placed(ha));
    if (moved) add("Question 1: " + moved + " placement" + (moved === 1 ? "" : "s") + " changed");
    const text = (label, ids) => {
      const was = ids.map(i => (ha[i] || "").trim()).join("\n").trim(), is = ids.map(i => (hb[i] || "").trim()).join("\n").trim();
      if (was && !is) add(label + " is now empty", true); else if (was !== is) add(label + (was ? " edited" : " added"));
    };
    text("Question 2", ["h1p1", "h1t1", "h1p2", "h1t2"]); text("Question 3", ["h1c"]);
    if ((ha.hwName || "").trim() !== (hb.hwName || "").trim()) add("Name changed");
    if (a.email && a.email !== b.email) add("Email changed from " + a.email + " to " + b.email + ". Questions 1–3 are stored per email, so the earlier answers stay under the old address.", true);
    return out;
  }
  function askResend(list) {
    $("resendT").innerHTML = "You already submitted <b>" + when(sentAt) + "</b>. Sending again replaces that submission." + (list ? " Since then:" : "");
    $("resendList").innerHTML = (list || []).map(c => '<li class="' + (c[1] ? "warn" : "") + '">' + esc(c[0]) + "</li>").join("");
    $("resend").hidden = false; say(""); $("resend").focus();
  }
  $("resendYes").addEventListener("click", () => submitAll(true));
  $("resendNo").addEventListener("click", () => { $("resend").hidden = true; $("submitBtn").focus(); });

  async function submitAll(confirmed) {
    if (closed()) { say("Submission closed on Sunday, Nov 15, at 13:00. Your work is still saved in this browser."); $("submitBtn").disabled = true; return; }
    nick = $("nick").value.trim(); persist();
    if (!$("hwName").value.trim()) { say("Enter your name first."); $("hwName").focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nick)) {
      say("Enter your email address first."); $("nick").focus(); return;
    }
    // a second Submit replaces the first: say what changed and ask before sending (nothing changed: just send again)
    if (sentAt && confirmed !== true) {
      const list = sentSnap ? changes(sentSnap, snapshot()) : null;
      if (!list || list.length) { askResend(list); return; }
    }
    $("resend").hidden = true;
    const busy = b => { $("submitBtn").disabled = b; };
    busy(true); say("Sending..."); saveTime(); showTime();
    const [work, hw] = await Promise.allSettled([
      window.MH.rpc("submit_work", { p_id: uid, p_nick: nick, p_diag: diag, p_drained: Array.from(drained), p_answers: Object.assign({}, answers, { activeSec }) }),
      HW.send(nick)
    ]);
    if (work.status === "fulfilled" && hw.status === "fulfilled") {
      submittedAt = sentAt = Date.now(); sentSnap = snapshot(); persist(); refresh();
      say("Sent: the game and questions 1–3. Thanks! You can change things and send again until the deadline.");
      $("submitBtn").classList.add("sent"); setTimeout(() => $("submitBtn").classList.remove("sent"), 1800);
    }
    else {
      const ok = [], bad = [];
      (work.status === "fulfilled" ? ok : bad).push(work.status === "fulfilled" ? "the game" : "the game (" + work.reason.message + ")");
      (hw.status === "fulfilled" ? ok : bad).push(hw.status === "fulfilled" ? "questions 1–3" : "questions 1–3 (" + hw.reason.message + ")");
      say((ok.length ? "Sent: " + ok.join(", ") + ". " : "") + "Could not send: " + bad.join(", ") + ". Your work is still saved in this browser. Press Submit again.");
    }
    busy(false);
  }
  $("submitBtn").addEventListener("click", () => submitAll(false));
  // the results appear by themselves if the page is open when REVEAL_AT passes
  if (REVEAL && !revealed()) { const t = setInterval(() => { if (revealed()) { clearInterval(t); renderResults(); } }, 30000); }
  if (closed()) { $("submitBtn").disabled = true; if (!submittedAt) say("Submission closed on Sunday, Nov 15, at 13:00."); }
  document.addEventListener("mh-hw-change", () => { touch(); renderMissions(); renderSubmit(); });

  refresh();
})();
