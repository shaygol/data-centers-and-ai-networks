(function () {
  const $ = id => document.getElementById(id);
  const { rpc, hashEmail, store } = window.MH;
  const { render, fromStatus, LABELS, esc } = window.MH_MAP;
  const KEY = "mh-hash";
  let me = null;        // { hash, switch, rows, mine, answers }
  let lastStatus = null;

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
    me = { hash, switch: v.switch, rows: v.rows || [], mine: v.mine || {}, answers: v.answers };
    $("joinCard").hidden = true;
    $("consoleCard").hidden = false;
    $("rcCard").hidden = false;
    $("swName").textContent = me.switch;
    $("swRole").textContent = window.MH_TOPO.role(me.switch) + " · " + me.rows.length + " ports";
    const dark = me.rows.length === 0;
    $("darkPanel").hidden = !dark;
    $("tablePanel").hidden = dark;
    renderRows();
    renderRc();
    drawMap();
  }

  // ---------- port table ----------
  function renderRows() {
    const opts = l => '<option value="">Choose…</option>' + Object.keys(LABELS).map(k => '<option value="' + k + '"' + (k === l ? " selected" : "") + ">" + LABELS[k] + "</option>").join("");
    $("portRows").innerHTML = me.rows.map(r => {
      const id = "lbl-" + r.port;
      return "<tr><th scope=\"row\">" + esc(r.port) + "</th><td>" + esc(r.expected) + "</td><td>" + esc(r.discovered) + "</td><td>" + esc(r.peer_hears) +
        '</td><td class="' + (r.phy === "DOWN" ? "bad" : "") + '">' + esc(r.phy) + "</td><td>" + esc(r.err) + '</td><td><select id="' + id + '" data-port="' + esc(r.port) + '" aria-label="Label for ' + esc(r.port) + '">' + opts(me.mine[r.port]) + "</select></td></tr>";
    }).join("");
    $("reportMsg").textContent = Object.keys(me.mine).length ? "Report on file. You can change labels and send again." : "";
  }

  $("sendReport").addEventListener("click", async () => {
    const labels = {}; let missing = 0;
    document.querySelectorAll("#portRows select").forEach(s => { if (s.value) labels[s.dataset.port] = s.value; else missing++; });
    if (missing) { $("reportMsg").textContent = missing + " port" + (missing > 1 ? "s" : "") + " still need a label."; return; }
    $("sendReport").disabled = true;
    try {
      const n = await rpc("submit_report", { p_hash: me.hash, p_labels: labels });
      me.mine = labels;
      $("reportMsg").textContent = "Sent: " + n + " ports. Look at the map below.";
      renderRc();
      await refresh();
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
    render($("map"), Object.assign(base, { me: me && me.switch }));
  }

  async function refresh() {
    try {
      lastStatus = await rpc("fabric_status", {});
      showErr($("mapErr"), "");
    } catch (err) { showErr($("mapErr"), err.message); return; }
    const st = lastStatus, done = (st.faults || []).filter(f => f.confirmed);
    const allUp = done.length === st.faults_total && st.faults_total > 0;
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
