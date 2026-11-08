(function () {
  const $ = id => document.getElementById(id);
  const { rpc } = window.MH;
  const { render, fromStatus, esc } = window.MH_MAP;
  let key = null, st = null;
  const Q = {
    q1: { cables: "4 cable faults", power: "T7 lost power", crash: "Software crashed", miswire: "Miswired" },
    q2: { crash: "AG3 crashed", oneway: "One-way link", miswire: "Wrong switch", down: "Unplugged" }
  };
  try { key = sessionStorage.getItem("mh-ikey"); } catch (e) {}

  $("keyForm").addEventListener("submit", async e => {
    e.preventDefault(); key = $("ikey").value; await load(true);
  });
  $("showKey").addEventListener("change", draw);

  async function load(fromForm) {
    try {
      st = await rpc("instructor_status", { p_key: key });
      try { sessionStorage.setItem("mh-ikey", key); } catch (e) {}
      $("keyCard").hidden = true;
      ["mapCard", "rcCard", "seatCard"].forEach(id => $(id).hidden = false);
      draw();
    } catch (err) {
      if (fromForm || !st) { $("keyErr").textContent = err.message; $("keyErr").hidden = false; }
    }
  }

  function bars(el, dist, labels, right) {
    const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
    el.innerHTML = Object.keys(labels).map(k => {
      const n = dist[k] || 0;
      return "<div><span>" + labels[k] + (k === right ? " ✓" : "") + '</span><span class="t"><span class="' + (k === right ? "right" : "") + '" style="width:' + (100 * n / total) + '%"></span></span><b>' + n + "</b></div>";
    }).join("");
  }

  function draw() {
    if (!st) return;
    const base = fromStatus(st);
    const truth = new Set();
    if ($("showKey").checked) (st.all_faults || []).forEach(f => (f.ports || []).forEach(p => truth.add(p.s + ":" + p.p)));
    render($("map"), Object.assign(base, { truth }));
    $("flagStat").textContent = st.flag_total + " flags placed, " + st.flag_hits + " of them on links that really have a fault.";
    const done = (st.all_faults || []).filter(f => f.confirmed).length;
    $("iSeats").textContent = st.seats;
    $("iRep").textContent = st.reporters;
    $("iFaults").textContent = done + " / " + st.faults_total;
    $("iWrong").textContent = st.wrong_flags;
    $("sFabric").textContent = done === st.faults_total ? "UP" : "DOWN";
    $("strip").classList.toggle("up", done === st.faults_total);
    $("faultList").innerHTML = (st.all_faults || []).map(f =>
      '<article class="fault ok"><h3>' + (f.confirmed ? "Confirmed: " : "Open: ") + esc(f.title) + "</h3><p>" + esc(f.explanation) + ' <span class="ref">(' + esc(f.ref) + ")</span></p></article>").join("");
    const ak = st.answer_key || {};
    bars($("q1"), st.q1 || {}, Q.q1, ak.q1);
    bars($("q2"), st.q2 || {}, Q.q2, ak.q2);
    $("seatMap").textContent = Object.entries(st.seat_map || {}).map(([s, n]) => s + ": " + n).join("  ·  ");
  }

  $("resetBtn").addEventListener("click", () => { $("resetYes").hidden = false; $("resetNo").hidden = false; $("resetBtn").hidden = true; });
  $("resetNo").addEventListener("click", () => { $("resetYes").hidden = true; $("resetNo").hidden = true; $("resetBtn").hidden = false; });
  $("resetYes").addEventListener("click", async () => {
    try { await rpc("reset_game", { p_key: key }); $("resetMsg").textContent = "Game reset."; await load(); }
    catch (err) { $("resetMsg").textContent = err.message; }
    $("resetNo").click();
  });

  if (key) load(false);
  setInterval(() => { if (key && !document.hidden && st) load(false); }, window.MH.refreshMs);
})();
