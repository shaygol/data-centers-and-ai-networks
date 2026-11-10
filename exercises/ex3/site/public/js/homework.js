// Visuals for the homework page: a mini fabric that shows who does what when a link fails,
// and a diagram of the Firepath parts that reacts to the placement rows of question 1.
(function () {
  const S = { SP1: [210, 100], SP2: [330, 100] }, L = { AG1: [90, 250], AG2: [210, 250], AG3: [330, 250], AG4: [450, 250] };  // a slice of JR-16: two spines over four aggregation switches
  const POS = Object.assign({}, S, L), ALL = Object.keys(POS), M = [530, 100];
  const LINKS = []; Object.keys(S).forEach(s => Object.keys(L).forEach(l => LINKS.push([s, l])));
  const FAIL = ["SP1", "AG2"];
  const nodeW = 56, nodeH = 28;

  const edge = (a, b, up) => { // point on the edge of node a towards b
    const [x1, y1] = POS[a], [x2, y2] = POS[b], dx = x2 - x1, dy = y2 - y1, t = Math.min(nodeW / 2 / Math.abs(dx || 1e-9), nodeH / 2 / Math.abs(dy || 1e-9));
    return [x1 + dx * t, y1 + dy * t];
  };
  function fabric(extra) {
    let h = '<rect class="hv-bg" x="0" y="0" width="600" height="330" rx="10"/>';
    h += '<g class="hv-cpn">' + ALL.map(n => '<line x1="' + (M[0] - 50) + '" y1="' + M[1] + '" x2="' + POS[n][0] + '" y2="' + POS[n][1] + '"/>').join("") + "</g>";
    h += LINKS.map(([s, l]) => { const a = edge(s, l), b = edge(l, s); return '<line class="hv-link" data-l="' + s + l + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>'; }).join("");
    h += '<g class="hv-nodes">' + ALL.map(n => '<g class="hv-node" data-n="' + n + '"><rect x="' + (POS[n][0] - nodeW / 2) + '" y="' + (POS[n][1] - nodeH / 2) + '" width="' + nodeW + '" height="' + nodeH + '" rx="5"/><text x="' + POS[n][0] + '" y="' + (POS[n][1] + 4.5) + '" text-anchor="middle">' + n + "</text></g>").join("") + "</g>";
    return h + (extra || "");
  }

  // ---------- who does what when a link fails ----------
  const MODES = {
    A: { tab: "A. Fully distributed", short: "Distributed", hub: null, topo: "Every switch builds its own view from its neighbors", comp: "Every switch", travels: "Routing messages between neighbors (OSPF, IS-IS, BGP)",
      steps: [["detect", "The two switches at the ends of the link notice it is down."],
        ["flood", "They tell their neighbors with routing messages, and each neighbor passes the news on, hop by hop."],
        ["compute", "Every switch updates its own copy of the topology and computes its own forwarding table."]] },
    B: { tab: "B. Google's split (Firepath)", short: "Firepath", hub: "Master", topo: "A central master, which sends it to every switch", comp: "Every switch", travels: "The link-state database, over the control network",
      steps: [["detect", "The two switches at the ends of the link notice it is down."],
        ["report", "They report the change to the master over the control network (CPN)."],
        ["push", "The master updates its link-state database and sends the update to every switch."],
        ["compute", "Every switch computes its own forwarding table from the database."]] },
    C: { tab: "C. Fully centralized (OpenFlow-style)", short: "OpenFlow", hub: "Controller", topo: "A central controller", comp: "The controller, which installs entries in every switch", travels: "Ready-made flow table entries",
      steps: [["detect", "The two switches at the ends of the link notice it is down."],
        ["report", "They report the change to the controller."],
        ["hubcompute", "The controller computes the new forwarding entries for every switch."],
        ["install", "It installs the ready-made entries in each switch's flow table. The switches only match and forward."]] }
  };

  function mountExplorer(root, keys, labels) {
    const uid = root.id;
    root.innerHTML = '<div class="hv-tabs" role="tablist"></div><div class="hv-body"><svg class="hv-svg" viewBox="0 0 600 330" role="img" aria-label="A small fabric: what happens when a link fails"></svg>' +
      '<div class="hv-side"><button type="button" class="btn primary hv-go">&#9654; A link fails</button><ol class="hv-steps"></ol><p class="fine hv-note"></p></div></div>' +
      '<dl class="hv-facts"><div><dt>Who holds the topology</dt><dd class="f-topo"></dd></div><div><dt>Who computes the forwarding tables</dt><dd class="f-comp"></dd></div><div><dt>What travels to a switch</dt><dd class="f-trav"></dd></div></dl>';
    const tabs = root.querySelector(".hv-tabs"), svg = root.querySelector(".hv-svg"), steps = root.querySelector(".hv-steps"), go = root.querySelector(".hv-go");
    let mode = keys[0], timers = [], running = false;

    function draw() {
      const m = MODES[mode];
      let extra = "";
      if (m.hub) extra += '<g class="hv-hub" data-n="HUB"><rect x="' + (M[0] - 50) + '" y="' + (M[1] - 20) + '" width="100" height="40" rx="6"/><text x="' + M[0] + '" y="' + (M[1] - 2) + '" text-anchor="middle">' + m.hub + '</text><text class="sub" x="' + M[0] + '" y="' + (M[1] + 13) + '" text-anchor="middle">' + (mode === "B" ? "link-state DB" : "global view") + "</text></g>";
      else extra += '<text class="hv-none" x="' + M[0] + '" y="' + M[1] + '" text-anchor="middle">no central node</text>';
      extra += '<text class="hv-cap" x="530" y="150" text-anchor="middle">control network</text>';
      svg.innerHTML = fabric(extra) + '<g class="hv-fx"></g>';
      if (!m.hub) svg.querySelector(".hv-cpn").style.display = "none";
      steps.innerHTML = m.steps.map((s, i) => '<li data-i="' + i + '"><span class="hv-n">' + (i + 1) + "</span><span>" + s[1] + "</span></li>").join("");
      root.querySelector(".f-topo").textContent = m.topo; root.querySelector(".f-comp").textContent = m.comp; root.querySelector(".f-trav").textContent = m.travels;
      root.querySelector(".hv-note").textContent = "Press the button to play it. The numbers on the right follow the animation.";
      tabs.querySelectorAll("button").forEach(b => { b.classList.toggle("on", b.dataset.m === mode); b.setAttribute("aria-selected", b.dataset.m === mode); });
    }
    keys.forEach(k => { const b = document.createElement("button"); b.type = "button"; b.dataset.m = k; b.setAttribute("role", "tab"); b.textContent = labels ? labels[k] : MODES[k].tab; tabs.appendChild(b); });
    tabs.addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (!b) return; stop(); mode = b.dataset.m; draw(); });

    const fx = () => svg.querySelector(".hv-fx");
    const node = n => svg.querySelector('[data-n="' + n + '"]');
    function pulse(from, to, delay, cls) {
      const a = from === "HUB" ? [M[0] - 50, M[1]] : POS[from], b = to === "HUB" ? [M[0] - 50, M[1]] : POS[to];
      const id = "p" + Math.random().toString(36).slice(2);
      fx().insertAdjacentHTML("beforeend", '<circle id="' + id + '" class="hv-pk ' + (cls || "") + '" r="5" cx="-20" cy="-20"><animateMotion begin="indefinite" dur="0.9s" fill="freeze" path="M' + a[0] + "," + a[1] + " L" + b[0] + "," + b[1] + '"/></circle>');
      timers.push(setTimeout(() => { const c = svg.querySelector("#" + id); if (c) { c.querySelector("animateMotion").beginElement(); } }, delay));
    }
    function mark(sel, cls, on) { svg.querySelectorAll(sel).forEach(e => e.classList.toggle(cls, on)); }
    function gear(n, hub) { const p = hub ? [M[0] + 38, M[1] - 26] : [POS[n][0] + nodeW / 2 - 4, POS[n][1] - nodeH / 2 - 4]; fx().insertAdjacentHTML("beforeend", '<text class="hv-gear" x="' + p[0] + '" y="' + p[1] + '" text-anchor="middle">&#9881;</text>'); }
    function entry(n) { const p = [POS[n][0] + nodeW / 2 - 4, POS[n][1] + nodeH / 2 + 12]; fx().insertAdjacentHTML("beforeend", '<text class="hv-entry" x="' + p[0] + '" y="' + p[1] + '" text-anchor="middle">&#9636;</text>'); }

    function play() {
      stop(); draw(); running = true; go.disabled = true;
      const m = MODES[mode], T = 1900; let t = 300;
      m.steps.forEach((s, i) => {
        timers.push(setTimeout(() => {
          steps.querySelectorAll("li").forEach((li, j) => { li.classList.toggle("on", j === i); li.classList.toggle("done", j < i); });
          const k = s[0];
          svg.querySelectorAll(".hv-pk").forEach(c => c.remove());
          if (k === "detect") { svg.querySelector('[data-l="SP1AG2"]').classList.add("dead"); fx().insertAdjacentHTML("beforeend", '<text class="hv-x" x="210" y="180" text-anchor="middle">&#10005;</text>'); FAIL.forEach(n => node(n).classList.add("alert")); }
          if (k === "flood") {
            LINKS.forEach(([a, b], j) => { if (a + b === "SP1AG2") return; pulse(a, b, j * 90, "gray"); pulse(b, a, j * 90 + 40, "gray"); });
          }
          if (k === "report") FAIL.forEach((n, j) => pulse(n, "HUB", j * 150));
          if (k === "push") { fx().insertAdjacentHTML("beforeend", '<text class="hv-lsd" x="' + (M[0]) + '" y="' + (M[1] + 36) + '" text-anchor="middle">LSD v+1</text>'); ALL.forEach((n, j) => pulse("HUB", n, j * 110, "acc")); }
          if (k === "compute") ALL.forEach(n => { gear(n); node(n).classList.add("work"); });
          if (k === "hubcompute") { gear("HUB", true); node("HUB").classList.add("work"); }
          if (k === "install") ALL.forEach((n, j) => { pulse("HUB", n, j * 110, "acc"); timers.push(setTimeout(() => entry(n), j * 110 + 900)); });
        }, t));
        t += T;
      });
      timers.push(setTimeout(() => {
        steps.querySelectorAll("li").forEach(li => { li.classList.remove("on"); li.classList.add("done"); });
        running = false; go.disabled = false; go.innerHTML = "&#8635; Play again";
        root.querySelector(".hv-note").textContent = mode === "A" ? "Nobody has the whole picture, so the news travels across the network and every switch does the full computation." :
          mode === "B" ? "The master only collects and redistributes. The path computation stays on every switch (Section 5.2.2 in SIGCOMM, Section 5.2 in CACM)." : "The controller does all the thinking. The switches only get ready-made entries, so a controller outage matters much more.";
      }, t + 200));
    }
    function stop() { timers.forEach(clearTimeout); timers = []; running = false; go.disabled = false; }
    go.addEventListener("click", play);
    draw();
  }

  // ---------- the parts of Firepath ----------
  const PARTS = {
    1: ["Firepath master", "The elected node that collects link state and redistributes it. Redundant masters run on a few spine switches."],
    2: ["Firepath client", "The process that runs on every fabric switch. It reports local link state and computes the switch's own forwarding table."],
    3: ["Link State Database (LSD)", "The versioned topology state the master builds and sends to the clients, as diffs after the first full update."],
    4: ["Control Plane Network (CPN)", "The separate, out-of-band network that the master and the clients talk over."],
    5: ["Neighbor Discovery (ND)", "The liveness and peer-correctness check that runs on each link, between the two switches at its ends."],
    6: ["BGP at the cluster border routers (CBRs)", "Route exchange at the edge of the fabric: the CBRs speak BGP with outside networks and hand routes to Firepath."],
    7: ["Cluster config", "The static topology of the whole fabric. Every switch is loaded with the same file at startup."],
    8: ["Forwarding table", "The table in each switch that every packet is looked up in. The Firepath client computes its entries (Section 5.2)."]
  };
  function mountParts(root, table) {
    const badge = (n, x, y) => '<g class="hp-b" data-part="' + n + '" tabindex="0" role="button" aria-label="Part ' + n + ': ' + PARTS[n][0] + '"><circle cx="' + x + '" cy="' + y + '" r="11"/><text x="' + x + '" y="' + (y + 4) + '" text-anchor="middle">' + n + "</text></g>";
    let h = fabric('<g class="hv-hub hp-master" data-part="1"><rect x="' + (M[0] - 50) + '" y="' + (M[1] - 20) + '" width="100" height="40" rx="6"/><text x="' + M[0] + '" y="' + (M[1] + 4) + '" text-anchor="middle">master</text></g>');
    h = h.replace('<g class="hv-cpn">', '<g class="hv-cpn hp-part" data-part="4">');
    // CBR and the outside
    h += '<g class="hp-part" data-part="6"><line class="hv-link" x1="226" y1="86" x2="262" y2="58"/><line class="hv-link" x1="314" y1="86" x2="278" y2="58"/><rect class="hv-cbr" x="236" y="30" width="68" height="26" rx="5"/><text class="t" x="270" y="47" text-anchor="middle">CBR</text><text class="sub" x="370" y="46" text-anchor="start">BGP to outside networks</text><line class="hv-link" x1="304" y1="43" x2="360" y2="43" stroke-dasharray="4 4"/></g>';
    // clients
    h += ALL.map(n => '<g class="hp-part" data-part="2"><rect class="hp-client" x="' + (POS[n][0] - nodeW / 2 + 3) + '" y="' + (POS[n][1] + nodeH / 2 - 1) + '" width="' + (nodeW - 6) + '" height="13" rx="3"/><text class="sub" x="' + POS[n][0] + '" y="' + (POS[n][1] + nodeH / 2 + 9) + '" text-anchor="middle">client</text></g>').join("");
    // config doc on each switch
    h += ALL.map(n => '<g class="hp-part" data-part="7"><text class="hp-doc" x="' + (POS[n][0] - nodeW / 2 - 8) + '" y="' + (POS[n][1] - nodeH / 2 + 8) + '" text-anchor="middle">&#9636;</text></g>').join("");
    // forwarding table on each switch
    h += ALL.map(n => '<g class="hp-part" data-part="8"><text class="hp-fib" x="' + (POS[n][0] + nodeW / 2 + 8) + '" y="' + (POS[n][1] - nodeH / 2 + 8) + '" text-anchor="middle">&#9638;</text></g>').join("");
    // LSD arrows from master to the two spines and a label
    h += '<g class="hp-part" data-part="3"><rect class="hp-lsd" x="' + (M[0] - 40) + '" y="' + (M[1] + 30) + '" width="80" height="22" rx="4"/><text class="t" x="' + M[0] + '" y="' + (M[1] + 45) + '" text-anchor="middle">LSD</text></g>';
    // ND on links
    h += '<g class="hp-part" data-part="5"><text class="hp-nd" x="' + ((S.SP2[0] + L.AG3[0]) / 2 + 0) + '" y="' + ((S.SP2[1] + L.AG3[1]) / 2) + '" text-anchor="middle">ND &#8596; ND</text><text class="hp-nd" x="' + ((S.SP1[0] + L.AG1[0]) / 2) + '" y="' + ((S.SP1[1] + L.AG1[1]) / 2) + '" text-anchor="middle">ND &#8596; ND</text></g>';
    h += badge(1, M[0] - 56, M[1] - 24) + badge(2, 130, 266) + badge(3, M[0] + 46, M[1] + 52) + badge(4, 405, 175) + badge(5, 362, 168) + badge(6, 236, 30) + badge(7, 398, 236) + badge(8, 502, 236);
    const IDLE = "<b>Hover a number here, or a part below.</b> This is a slice of JR-16: two spines and four aggregation switches. The diagram shows where each part lives. It does not say which plane it belongs to: that is your job in question 1.";
    root.innerHTML = '<svg class="hv-svg" viewBox="0 0 600 330" role="img" aria-label="The parts of Firepath on a slice of the JR-16 fabric">' + h + '</svg><div class="hp-info" aria-live="polite">' + IDLE + "</div>";
    const info = root.querySelector(".hp-info"), svg = root.querySelector("svg");
    function show(n) {
      svg.querySelectorAll("[data-part]").forEach(e => e.classList.toggle("lit", n && e.getAttribute("data-part") === String(n)));
      svg.classList.toggle("dim", !!n);
      if (table) table.querySelectorAll(".hwp-row[data-part]").forEach(r => r.classList.toggle("lit", n && r.getAttribute("data-part") === String(n)));
      info.innerHTML = n ? "<b>" + n + ". " + PARTS[n][0] + ".</b> " + PARTS[n][1] : IDLE;
    }
    root.addEventListener("mouseover", e => { const p = e.target.closest("[data-part]"); if (p) show(p.getAttribute("data-part")); });
    root.addEventListener("mouseleave", () => show(null));
    root.addEventListener("focusin", e => { const p = e.target.closest("[data-part]"); if (p) show(p.getAttribute("data-part")); });
    if (table) {
      // the placement rows of question 1: hovering a row, or focusing one of its choices, lights that part in the diagram
      table.querySelectorAll(".hwp-row[data-part]").forEach(r => { r.addEventListener("mouseenter", () => show(r.getAttribute("data-part"))); r.addEventListener("mouseleave", () => show(null)); r.addEventListener("focusin", () => show(r.getAttribute("data-part"))); });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const e1 = document.getElementById("explorerPrimer"); if (e1) mountExplorer(e1, ["A", "C"], { A: "Traditional", C: "SDN (OpenFlow)" });
    const e2 = document.getElementById("explorerChoice"); if (e2) mountExplorer(e2, ["A", "B", "C"]);
    const p = document.getElementById("partsDiagram"); if (p) mountParts(p, document.getElementById("hwPlace"));
  });
})();
