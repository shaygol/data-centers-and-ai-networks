(function () {
  const $ = id => document.getElementById(id);
  const { rpc, hashEmail, store } = window.MH;
  const { render, fromStatus, LABELS, esc } = window.MH_MAP;
  const KEY = "mh-hash";
  let me = null;        // { hash, switch, rows, mine, answers }
  let lastPairs = {}, selPair = null, lastStatus = null, prevFlags = null, prevPorts = null, prevConfirmed = null, flash = new Set(), feed = [];

  function showErr(el, msg) { el.textContent = msg; el.hidden = !msg; }

  // ---------- join ----------
  $("joinForm").addEventListener("submit", async e => {
    e.preventDefault();
    showErr($("joinErr"), "");
    const email = $("email").value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { showErr($("joinErr"), "Please enter a valid email address."); return; }
    try {
      const hash = await hashEmail(email);
      await rpc("claim_seat", { p_hash: hash });
      store.set(KEY, hash);
      await loadMe(hash);
    } catch (err) { showErr($("joinErr"), err.message); }
  });

  $("switchUser").addEventListener("click", () => {
    store.del(KEY); me = null;
    $("consoleCard").hidden = true; $("rcCard").hidden = true; $("joinCard").hidden = false;
    $("email").value = ""; $("email").focus();
    drawMap();
  });

  async function loadMe(hash) {
    const v = await rpc("get_my_view", { p_hash: hash });
    if (!v) { store.del(KEY); $("joinCard").hidden = false; return; }
    me = { hash, flags: v.flags || [], switch: v.switch, rows: v.rows || [], mine: v.mine || {}, labels: Object.assign({}, v.mine || {}), sent: Object.keys(v.mine || {}).length > 0, answers: v.answers };
    selPort = null; selLabel = null;
    $("joinCard").hidden = true;
    $("consoleCard").hidden = false;
    $("rcCard").hidden = false;
    $("swName").textContent = me.switch;
    $("swRole").textContent = window.MH_TOPO.role(me.switch) + " · " + me.rows.length + " ports";
    const dark = me.rows.length === 0;
    $("darkPanel").hidden = !dark;
    $("tablePanel").hidden = dark;
    renderPanel();
    if (me.rows.length) { selPort = me.rows[0].port; renderPanel(); renderProbe(selPort); }
    renderRc();
    drawMap();
  }

  // ---------- front panel ----------
  const LCOL = { OK: "var(--ok)", MISWIRED: "var(--bad)", ONE_WAY: "#FF8C42", HIGH_ERRORS: "var(--warn)", LINK_DOWN: "#9AA7B2", PEER_SILENT: "#B58CFF" };
  const HINT = { OK: "Plan and reality agree, both directions", MISWIRED: "A different peer than the plan", ONE_WAY: "Only one direction works", HIGH_ERRORS: "Up and correct, but error rate is high", LINK_DOWN: "PHY down: no working cable", PEER_SILENT: "PHY up but no ND from the peer" };
  let selLabel = null, selPort = null;
  const rowOf = p => me.rows.filter(r => r.port === p)[0];

  function renderPanel() {
    $("face").innerHTML = me.rows.map(r => {
      const l = me.labels[r.port];
      return '<button type="button" class="jack' + (selPort === r.port ? " sel" : "") + '" data-port="' + esc(r.port) + '" aria-label="Port ' + esc(r.port) + (l ? ", labeled " + LABELS[l] : ", not labeled") + '">' +
        '<span class="led" style="background:' + (l ? LCOL[l] : "var(--idle)") + ";box-shadow:0 0 8px " + (l ? LCOL[l] : "transparent") + '"></span>' +
        '<span class="sock"></span><span class="pn">' + esc(r.port) + '</span><span class="pl">' + (l ? LABELS[l] : "\u2014") + "</span></button>";
    }).join("");
    $("tray").innerHTML = Object.keys(LABELS).map(k => '<span role="button" tabindex="0" class="tag' + (selLabel === k ? " sel" : "") + '" draggable="true" data-label="' + k + '" aria-pressed="' + (selLabel === k) + '" title="' + HINT[k] + '" style="--tc:' + LCOL[k] + '"><i></i>' + LABELS[k] + "</span>").join("");
    const n = me.rows.length, done = Object.keys(me.labels).length;
    $("sendReport").disabled = !n;
    $("reportMsg").textContent = done === n ? (me.sent ? "Report on file. You can change labels and send again." : "All ports labeled. Send your report.") : done + " of " + n + " ports labeled.";
    renderTable();
  }

  function renderTable() {
    $("portRows").innerHTML = me.rows.map(r => "<tr><th scope=\"row\">" + esc(r.port) + "</th><td>" + esc(r.expected) + "</td><td>" + esc(r.discovered) + "</td><td>" + esc(r.peer_hears) +
      '</td><td class="' + (r.phy === "DOWN" ? "bad" : "") + '">' + esc(r.phy) + "</td><td>" + esc(r.err) + "</td><td>" + (me.labels[r.port] ? LABELS[me.labels[r.port]] : "\u2014") + "</td></tr>").join("");
  }

  function setLabel(port, label) { me.labels[port] = label; renderPanel(); if (selPort === port) renderProbe(port); }

  $("face").addEventListener("click", e => {
    const j = e.target.closest("[data-port]"); if (!j) return;
    const port = j.getAttribute("data-port");
    if (selLabel && selPort === port) { setLabel(port, selLabel); return; }
    selPort = port; renderPanel(); renderProbe(port);
    if (selLabel) setLabel(port, selLabel);
  });
  $("face").addEventListener("dragover", e => { if (e.target.closest("[data-port]")) e.preventDefault(); });
  $("face").addEventListener("drop", e => {
    const j = e.target.closest("[data-port]"); if (!j) return; e.preventDefault();
    const l = e.dataTransfer.getData("text/plain"); if (!LABELS[l]) return;
    selPort = j.getAttribute("data-port"); setLabel(selPort, l); renderProbe(selPort);
  });
  $("tray").addEventListener("click", e => { const t = e.target.closest("[data-label]"); if (!t) return; selLabel = selLabel === t.dataset.label ? null : t.dataset.label; renderPanel(); });
  $("tray").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.closest("[data-label]")) { e.preventDefault(); e.target.closest("[data-label]").click(); } });
  $("tray").addEventListener("dragstart", e => { const t = e.target.closest("[data-label]"); if (t) e.dataTransfer.setData("text/plain", t.dataset.label); });

  // The probe: plan on the right in dashes, reality in solid, an ND pulse running along the cable.
  function renderProbe(port) {
    const r = rowOf(port), svg = $("probe"); if (!r) return;
    const down = r.phy === "DOWN", silent = r.discovered === "-", match = !silent && r.discovered === r.expected, hi = r.err !== "<1e-12";
    const node = (x, y, w, t1, t2, cls) => '<g class="pn-box ' + cls + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="44" rx="6"/><text x="' + (x + w / 2) + '" y="' + (y + 19) + '" text-anchor="middle" class="t1">' + t1 + '</text><text x="' + (x + w / 2) + '" y="' + (y + 35) + '" text-anchor="middle" class="t2">' + t2 + "</text></g>";
    let h = "", cableEnd = 330;
    h += node(14, 78, 108, me.switch + " " + port, "you", "me");
    const realY = match ? 100 : 150, yEnd = down ? 100 : realY;
    // plan (dashed ghost)
    if (!match) h += '<polyline class="plan" points="122,100 300,100 350,44 380,44"/>' + node(380, 22, 126, r.expected, "plan says", "ghost");
    // reality
    const pts = down ? "122,100 250,100" : (match ? "122,100 380,100" : "122,100 300,100 350,150 380,150");
    h += '<polyline class="cable ' + (hi ? "noisy" : "") + (down ? " cut" : "") + '" id="cab" points="' + pts + '"/>';
    if (down) h += '<text x="262" y="106" class="cross">\u2715</text><text x="262" y="132" text-anchor="middle" class="hint">no cable (PHY down)</text>';
    else if (match) h += node(380, 78, 126, r.discovered, "matches plan", "peer ok");
    else if (silent) h += node(380, 128, 126, "?", "silence", "peer none");
    else h += node(380, 128, 126, r.discovered, "ND heard", "peer bad");
    if (!down && !silent) h += '<circle r="5" class="pulse"><animateMotion dur="1.6s" repeatCount="indefinite" path="' + (match ? "M122,100 L380,100" : "M122,100 L300,100 L350,150 L380,150") + '" keyPoints="1;0" keyTimes="0;1" calcMode="linear"/></circle>';
    // return direction
    if (!down) h += '<text x="200" y="' + (match ? 128 : 84) + '" text-anchor="middle" class="ret ' + (r.peer_hears === "yes" ? "yes" : r.peer_hears === "no" ? "no" : "unk") + '">peer hears you: ' + esc(r.peer_hears) + "</text>";
    h += '<text x="200" y="' + (match ? 144 : 176) + '" text-anchor="middle" class="err ' + (hi ? "hi" : "") + '">error rate ' + esc(r.err) + "</text>";
    svg.innerHTML = h;
    $("probeText").textContent = "Port " + port + ": plan " + r.expected + ", heard " + (silent ? "nothing" : r.discovered) + ", PHY " + r.phy + ", peer hears you: " + r.peer_hears + ", errors " + r.err + ".";
  }

  $("sendReport").addEventListener("click", async () => {
    const n = me.rows.length, done = Object.keys(me.labels).length;
    if (done < n) { $("reportMsg").textContent = (n - done) + " port" + (n - done > 1 ? "s" : "") + " still need a label."; return; }
    $("sendReport").disabled = true;
    try {
      const sent = await rpc("submit_report", { p_hash: me.hash, p_labels: me.labels });
      me.sent = true; me.mine = Object.assign({}, me.labels);
      $("reportMsg").textContent = "Sent: " + sent + " ports. Watch the map below.";
      renderPanel(); renderRc();
      await refresh();
      $("mapCard").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) { $("reportMsg").textContent = err.message; }
    $("sendReport").disabled = false;
  });

  // ---------- root cause ----------
  function renderRc() {
    const unlocked = me && (me.rows.length === 0 || Object.keys(me.mine).length > 0);
    $("rcLock").hidden = !!unlocked;
    $("rcForm").hidden = !unlocked;
    if (me && me.answers) {
      ["q1", "q2"].forEach(q => { const el = document.querySelector('input[name="' + q + '"][value="' + me.answers[q] + '"]'); if (el) el.checked = true; });
      $("rcMsg").textContent = "Answers saved. The class result is revealed in class.";
    }
  }
  $("rcForm").addEventListener("submit", async e => {
    e.preventDefault();
    const q1 = (document.querySelector('input[name="q1"]:checked') || {}).value, q2 = (document.querySelector('input[name="q2"]:checked') || {}).value;
    if (!q1 || !q2) { $("rcMsg").textContent = "Answer both questions."; return; }
    try {
      await rpc("submit_answers", { p_hash: me.hash, p_q1: q1, p_q2: q2 });
      me.answers = { q1, q2 };
      $("rcMsg").textContent = "Answers saved. The class result is revealed in class.";
    } catch (err) { $("rcMsg").textContent = err.message; }
  });

  // ---------- shared map ----------
  function drawMap() {
    const base = lastStatus ? fromStatus(lastStatus) : { latest: {}, reported: new Set(), confirmed: new Set() };
    lastPairs = render($("map"), Object.assign(base, { me: me && me.switch, flash, selPair, myflags: me ? me.flags : [] }));
    renderLink();
  }

  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.h);
    toast.h = setTimeout(() => { t.hidden = true; }, 5000);
  }
  function hhmm() { const d = new Date(); return d.toTimeString().slice(0, 8); }

  function diffEvents(st) {
    const cur = {}, bySwitch = {};
    (st.ports || []).forEach(p => { cur[p.s + ":" + p.p] = p.l; });
    const conf = new Set((st.faults || []).filter(f => f.confirmed).map(f => f.id));
    if (prevPorts) {
      Object.keys(cur).forEach(k => { if (prevPorts[k] !== cur[k]) { const sw = k.split(":")[0]; bySwitch[sw] = (bySwitch[sw] || 0) + 1; } });
      Object.keys(bySwitch).forEach(sw => {
        const mine = me && me.switch === sw;
        feed.unshift({ t: hhmm(), text: (mine ? "You (" + sw + ")" : sw) + " reported " + bySwitch[sw] + " port" + (bySwitch[sw] > 1 ? "s" : "") });
      });
      conf.forEach(id => { if (!prevConfirmed.has(id)) {
        const f = (st.faults || []).filter(x => x.id === id)[0];
        feed.unshift({ t: hhmm(), text: "Problem " + id + " confirmed: " + (f.ports || []).map(p => p.s + " " + p.p).join(", "), hot: true });
        toast("Problem " + id + " confirmed!");
      } });
      feed = feed.slice(0, 40);
    }
    const fl = st.flags || {};
    if (prevFlags) Object.keys(fl).forEach(k => { if ((fl[k] || 0) > (prevFlags[k] || 0)) feed.unshift({ t: hhmm(), text: "A flag went on " + k.replace("|", " \u2194 ") + " (" + fl[k] + " now)" }); });
    prevFlags = fl;
    flash = new Set(Object.keys(bySwitch));
    if (flash.size) setTimeout(() => { flash = new Set(); drawMap(); }, 3200);
    prevPorts = cur; prevConfirmed = conf;
    if (feed.length) $("feed").innerHTML = feed.slice(0, 8).map(e => '<li class="' + (e.hot ? "hot" : "") + '"><span class="ts">' + e.t + "</span> " + esc(e.text) + "</li>").join("");
  }

  async function refresh() {
    try {
      lastStatus = await rpc("fabric_status", {});
      showErr($("mapErr"), "");
    } catch (err) { showErr($("mapErr"), err.message); return; }
    const st = lastStatus, done = (st.faults || []).filter(f => f.confirmed);
    const allUp = done.length === st.faults_total && st.faults_total > 0;
    if (allUp && prevConfirmed && prevConfirmed.size < st.faults_total) toast("FABRIC UP. Firepath may route.");
    diffEvents(st);
    $("sFaults").textContent = done.length + " / " + st.faults_total;
    const sw = new Set((st.ports || []).map(p => p.s));
    $("sReported").textContent = sw.size + " / 15";
    $("sFabric").textContent = allUp ? "UP" : "DOWN";
    $("strip").classList.toggle("up", allUp);
    $("faultList").innerHTML = (allUp ? '<div class="up-banner">FABRIC UP. All five problems are confirmed. Firepath may route. What each problem was gets revealed in class.</div>' : "") +
      (st.faults || []).map(f => f.confirmed
        ? '<article class="fault ok"><h3>Problem ' + f.id + ": confirmed</h3><p>Ports: " + esc((f.ports || []).map(p => p.s + " " + p.p).join(", ")) + "</p></article>"
        : '<article class="fault"><h3>Problem ' + f.id + ": not confirmed yet</h3></article>").join("");
    drawMap();
  }

  // ---------- link card and flags ----------
  function renderLink() {
    const el = $("linkCard"), p = selPair && lastPairs[selPair];
    if (!p) { el.hidden = true; return; }
    el.hidden = false;
    const flagged = me && me.flags.indexOf(selPair) >= 0, left = me ? 5 - me.flags.length : 0;
    const count = (lastStatus && lastStatus.flags && lastStatus.flags[selPair]) || 0;
    el.innerHTML = '<div class="lc-head"><b class="mono">' + esc(p.a) + " \u2194 " + esc(p.b) + '</b><span class="fine">' + count + " flag" + (count === 1 ? "" : "s") + " from the class</span></div>" +
      "<ul>" + p.tips.map(t => "<li>" + esc(t) + "</li>").join("") + "</ul>" +
      (me ? '<div class="row"><button class="btn ' + (flagged ? "" : "primary") + '" id="flagBtn" type="button"' + (!flagged && left <= 0 ? " disabled" : "") + ">" + (flagged ? "Remove my flag" : "Flag as suspect") + '</button><span class="fine">' + (left <= 0 && !flagged ? "All 5 flags are placed. Remove one to move it." : "You have " + left + " of 5 flags left.") + "</span></div>" : '<p class="fine">Take a switch to flag links.</p>');
  }
  $("map").addEventListener("click", e => {
    const t = e.target.closest("[data-pair]"); if (!t) return;
    selPair = t.getAttribute("data-pair"); drawMap();
    $("linkCard").scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  $("linkCard").addEventListener("click", async e => {
    if (!e.target.closest("#flagBtn") || !me || !selPair) return;
    const b = e.target.closest("#flagBtn"); b.disabled = true;
    try { me.flags = await rpc("toggle_suspect", { p_hash: me.hash, p_pair: selPair }); await refresh(); }
    catch (err) { toast(err.message); }
    renderLink();
  });

  // ---------- boot ----------
  drawMap();
  if (!window.MH.configured) {
    showErr($("joinErr"), "This site is not connected to its database yet. Instructors: fill in js/config.js.");
    showErr($("mapErr"), "No database connection.");
  } else {
    const h = store.get(KEY);
    if (h) loadMe(h).catch(err => showErr($("joinErr"), err.message));
    refresh();
    setInterval(() => { if (!document.hidden) refresh(); }, window.MH.refreshMs);
  }
})();
