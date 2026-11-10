(function () {
  const $ = id => document.getElementById(id);
  const P = window.MH_PUZZLE, T = window.MH_TOPO, { LABELS, esc } = window.MH_MAP;
  const acc = (sw, port) => (P.truth[sw + ":" + port] ? P.truth[sw + ":" + port].a : ["OK"]);
  const isOk = (d, k) => { const [sw, port] = k.split(":"); return !!d[k] && acc(sw, port).indexOf(d[k]) >= 0; };
  const faultPorts = id => Object.keys(P.truth).filter(k => P.truth[k].f === id);
  const found = (d, id) => new Set(faultPorts(id).filter(k => isOk(d, k)).map(k => k.split(":")[0])).size >= 2;
  const linkKey = l => l.a.s + "|" + l.b.s;
  const endF = e => { const t = P.truth[e.s + ":" + e.p]; return t && t.f; };
  const faulty = new Set(T.links.filter(l => endF(l.a) || endF(l.b)).map(linkKey));
  const pct = (n, d) => (d ? Math.round(100 * n / d) : 0) + "%";
  const tbl = (head, rows) => "<thead><tr>" + head.map(h => "<th>" + h + "</th>").join("") + "</tr></thead><tbody>" + rows.map(r => "<tr>" + r.map(c => "<td>" + c + "</td>").join("") + "</tr>").join("") + "</tbody>";

  // ---------- the answer map ----------
  const FCOL = { 1: "#D0343A", 2: "#B5179E", 3: "#FF8C42", 4: "#A86A00", 5: "#7B5CD6" };
  const SHORT = { OK: "OK", MISWIRED: "Miswired", ONE_WAY: "One-way", HIGH_ERRORS: "High err", LINK_DOWN: "Link down", PEER_SILENT: "Silent" };
  function answerMap() {
    const latest = {}, confirmed = new Set();
    Object.keys(P.truth).forEach(k => { latest[k] = P.truth[k].a[0]; confirmed.add(k); });
    const svg = $("map");
    window.MH_MAP.render(svg, { latest, reported: new Set(), confirmed, flags: {}, myflags: [], me: null, flash: new Set(), master: true, drained: new Set() });
    const Pp = T.pos, isT = s => /^T/.test(s);
    const ends = l => { const a = Pp[l.a.s], b = Pp[l.b.s]; return [a[0], a[1] + 16, b[0], b[1] - (isT(l.b.s) ? 12 : 16)]; };
    let h = "";
    // the cable that really exists: T4 p2 lands on AG4 d4
    const ag4 = Pp.AG4, t4 = Pp.T4;
    h += '<line class="ans-real" x1="' + ag4[0] + '" y1="' + (ag4[1] + 16) + '" x2="' + t4[0] + '" y2="' + (t4[1] - 12) + '"><title>The real cable: T4 p2 to AG4 d4</title></line>';
    const upN = {};
    T.links.forEach(l => {
      const fa = endF(l.a), fb = endF(l.b), f = fa || fb; if (!f) return;
      const ui = upN[l.a.s] = (upN[l.a.s] || 0) + 1, tu = l.tier === "tor" ? 0.08 + 0.17 * (ui - 1) : 0.2;
      const [x1, y1, x2, y2] = ends(l), tm = l.tier === "tor" ? 0.62 : 0.5, mx = x1 + (x2 - x1) * tm, my = y1 + (y2 - y1) * tm;
      [[l.a, tu], [l.b, 0.82]].forEach(([e, t]) => {
        const tr = P.truth[e.s + ":" + e.p]; if (!tr) return;
        const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t, txt = e.p + " " + tr.a.map(a => SHORT[a]).join("/");
        h += '<g class="ans-end"><rect x="' + (x - txt.length * 3.1 - 4) + '" y="' + (y - 8) + '" width="' + (txt.length * 6.2 + 8) + '" height="16" rx="4" style="stroke:' + FCOL[f] + '"/><text x="' + x + '" y="' + (y + 4) + '" text-anchor="middle">' + esc(txt) + "</text></g>";
      });
      h += '<g class="ans-badge"><circle cx="' + mx + '" cy="' + my + '" r="10" style="fill:' + FCOL[f] + '"/><text x="' + mx + '" y="' + (my + 4) + '" text-anchor="middle">' + f + "</text></g>";
    });
    const t7 = Pp.T7;
    h += '<g class="ans-dead"><line x1="' + (t7[0] - 30) + '" y1="' + (t7[1] - 15) + '" x2="' + (t7[0] + 30) + '" y2="' + (t7[1] + 15) + '"/><line x1="' + (t7[0] + 30) + '" y1="' + (t7[1] - 15) + '" x2="' + (t7[0] - 30) + '" y2="' + (t7[1] + 15) + '"/></g>';
    svg.insertAdjacentHTML("beforeend", h);
    $("ansList").innerHTML = P.faults.map(f => '<li><span class="ans-n" style="background:' + FCOL[f.id] + '">' + f.id + "</span><div><b>" + esc(f.title) + "</b> " + esc(f.text) + ' <span class="ref">(' + esc(f.ref) + ")</span></div></li>").join("") +
      '<li><span class="ans-n q">?</span><div><b>Root cause answers:</b> Q1 T7&rsquo;s software crashed. Q2 the link works in one direction only.</div></li>';
    $("answerCard").hidden = false;
  }

  // active time the student spent on the page, sent by the page as answers.activeSec (seconds); older submissions have none
  const fmtTime = s => typeof s !== "number" ? "—" : s < 60 ? "< 1 min" : s < 3600 ? Math.floor(s / 60) + " min" : Math.floor(s / 3600) + " h " + String(Math.floor((s % 3600) / 60)).padStart(2, "0") + " min";
  function show(subs) {
    answerMap();
    const n = subs.length;
    $("sum").textContent = n + " submission" + (n === 1 ? "" : "s") + ".";
    ["faultsCard", "portsCard", "wrongCard", "rcCard2", "masterCard", "studentsCard"].forEach(id => { $(id).hidden = false; });
    $("faults").innerHTML = P.faults.map(f => {
      const c = subs.filter(s => found(s.diag || {}, f.id)).length;
      return '<div class="ibar"><div class="ibar-h"><b>' + esc(f.title) + "</b><span>" + c + " of " + n + " (" + pct(c, n) + ')</span></div><div class="ibar-t"><span style="width:' + (n ? 100 * c / n : 0) + '%"></span></div><p class="fine">' + esc(f.text) + ' <span class="ref">(' + esc(f.ref) + ")</span></p></div>";
    }).join("");
    const fp = Object.keys(P.truth).sort();
    $("portTbl").innerHTML = tbl(["Port", "Fault", "Right answer"].concat(Object.keys(LABELS).map(k => LABELS[k]), ["Not diagnosed"]), fp.map(k => {
      const [sw, port] = k.split(":"), cnt = {}; let none = 0;
      subs.forEach(s => { const l = (s.diag || {})[k]; if (l) cnt[l] = (cnt[l] || 0) + 1; else none++; });
      return [esc(sw + " " + port), P.truth[k].f, P.truth[k].a.map(a => LABELS[a]).join(" / ")].concat(Object.keys(LABELS).map(l => (P.truth[k].a.indexOf(l) >= 0 ? "<b>" + (cnt[l] || 0) + "</b>" : (cnt[l] || 0))), [none]);
    }));
    const wrong = {};
    subs.forEach(s => Object.keys(s.diag || {}).forEach(k => { wrong[k] = wrong[k] || { w: 0, t: 0 }; wrong[k].t++; if (!isOk(s.diag, k)) wrong[k].w++; }));
    const top = Object.keys(wrong).filter(k => wrong[k].w).sort((a, b) => wrong[b].w - wrong[a].w).slice(0, 12);
    $("wrongTbl").innerHTML = tbl(["Port", "Wrong", "Of diagnosed"], top.map(k => [esc(k.replace(":", " ")), wrong[k].w, wrong[k].t]));
    const rc = (q, right, opts) => { const c = {}; subs.forEach(s => { const a = (s.answers || {})[q]; if (a) c[a] = (c[a] || 0) + 1; }); const tot = Object.values(c).reduce((a, b) => a + b, 0);
      return "<h3>" + q.toUpperCase() + "</h3><div class=\"bars\">" + Object.keys(opts).map(k => "<div><span>" + opts[k] + (k === right ? " ✓" : "") + '</span><span class="t"><span class="' + (k === right ? "right" : "") + '" style="width:' + (tot ? 100 * (c[k] || 0) / tot : 0) + '%"></span></span><b>' + (c[k] || 0) + "</b></div>").join("") + "</div>"; };
    $("rcBars").innerHTML = rc("q1", P.rc.q1, { cables: "Two separate cable faults", power: "T7 lost power", crash: "T7's software crashed", miswire: "T7's cables were plugged into the wrong ports" }) +
      rc("q2", P.rc.q2, { crash: "AG3's software crashed", oneway: "The link works in one direction only", miswire: "The cable goes to a different switch", down: "The cable is unplugged" });
    $("drainTbl").innerHTML = tbl(["Link", "Broken?", "Drained by"], T.links.map(l => { const k = linkKey(l), c = subs.filter(s => (s.drained || []).indexOf(k) >= 0).length; return [esc(l.a.s + " " + l.a.p + " ↔ " + l.b.s + " " + l.b.p), faulty.has(k) ? "<b>broken</b>" : "", c + " of " + n]; }));
  }

  // ---------- homework ----------
  const DEADLINE = Date.parse((window.MH_CONFIG || {}).DEADLINE || "2026-11-15T13:00:00+02:00");
  const PARTS = ["Firepath master", "Firepath client", "Link State Database (LSD)", "Control Plane Network (CPN)", "Neighbor Discovery (ND)", "BGP at the CBRs", "Cluster config", "Forwarding table"];
  const PLANE = { data: "Data", control: "Control", management: "Management", outside: "Outside SDN" };
  function showHomework(rows) {
    $("hwCard").hidden = false;
    const late = r => Date.parse(r.at) > DEADLINE, on = rows.filter(r => !late(r));
    $("hwSum").textContent = rows.length + " submission" + (rows.length === 1 ? "" : "s") + ", " + on.length + " on time, " + (rows.length - on.length) + " late.";
    $("hwPlaceTbl").innerHTML = tbl(["Part"].concat(Object.keys(PLANE).map(k => PLANE[k]), ["Not placed", "Agreement"]), PARTS.map((p, i) => {
      const cnt = {}; let none = 0; on.forEach(r => { const v = ((r.answers || {}).place || {})[i + 1]; if (v) cnt[v] = (cnt[v] || 0) + 1; else none++; });
      const placed = on.length - none, top = Math.max(0, ...Object.keys(PLANE).map(k => cnt[k] || 0)), agree = placed ? Math.round(100 * top / placed) : null;
      const cell = k => '<span class="heat" style="--h:' + (placed ? (cnt[k] || 0) / placed : 0) + '">' + (cnt[k] || 0) + "</span>";
      return [(i + 1) + ". " + esc(p)].concat(Object.keys(PLANE).map(cell), [none, agree === null ? "—" : agree + "%" + (agree < 60 ? ' <span class="split">split</span>' : "")]);
    }));
    // question 2: how many students named each part as one of their two hardest
    const hc = PARTS.map((p, i) => on.filter(r => ((r.answers || {}).hard || []).some(h => String(h.part) === String(i + 1))).length), hmax = Math.max(1, ...hc);
    $("hwHard").innerHTML = PARTS.map((p, i) => '<div class="ibar slim"><div class="ibar-h"><b>' + (i + 1) + ". " + esc(p) + "</b><span>" + hc[i] + '</span></div><div class="ibar-t"><span style="width:' + (100 * hc[i] / hmax) + '%"></span></div></div>').join("");
    const hard = a => (a.hard || []).filter(h => h.part || h.text).map(h => (h.part ? "<b>" + esc(PARTS[h.part - 1] || h.part) + ":</b> " : "") + esc(h.text || "")).join("<br>");
    $("hwAnsTbl").innerHTML = tbl(["Student", "Hardest placements (question 2)", "Firepath vs OpenFlow (question 3)"], rows.map(r => {
      const a = r.answers || {};
      return [esc(r.name || "") + "<br><span class=\"fine\">" + esc(r.email) + "</span>" + (late(r) ? '<br><span class="err">late</span>' : ""), hard(a), esc(a.diff || "")];
    }));
  }

  // ---------- overview and the students table (the game and the homework, matched by email) ----------
  const median = a => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
  let rows = [], sortKey = "at", sortDir = 1;
  function buildRows(subs, hw) {
    const byEmail = {}, used = new Set();
    hw.forEach(r => { byEmail[(r.email || "").trim().toLowerCase()] = r; });
    const row = (s, h, email) => {
      const d = s ? s.diag || {} : {}, ks = Object.keys(d), a = s ? s.answers || {} : {}, dr = new Set(s ? s.drained || [] : []), ha = h ? h.answers || {} : {};
      const hard = (ha.hard || []).filter(x => (x.text || "").trim()).length;
      return {
        name: h ? h.name || "" : "", email: email, game: !!s, hw: !!h,
        diagnosed: s ? ks.length : null, wrong: s ? ks.filter(k => !isOk(d, k)).length : null, faults: s ? P.faults.filter(f => found(d, f.id)).length : null,
        q1: a.q1 ? (a.q1 === P.rc.q1 ? 1 : 0) : null, q2: a.q2 ? (a.q2 === P.rc.q2 ? 1 : 0) : null,
        clean: s && dr.size ? (dr.size === faulty.size && Array.from(faulty).every(k => dr.has(k)) ? 1 : 0) : null, drained: dr.size,
        placed: h ? PARTS.filter((p, i) => (ha.place || {})[i + 1]).length : null, hard: h ? hard : null, diff: h ? ((ha.diff || "").trim() ? 1 : 0) : null,
        time: typeof a.activeSec === "number" ? a.activeSec : null, at: Math.max(s ? Date.parse(s.at) || 0 : 0, h ? Date.parse(h.at) || 0 : 0)
      };
    };
    const out = subs.map(s => { const e = (s.nick || "").trim().toLowerCase(), h = byEmail[e]; if (h) used.add(e); return row(s, h, e || "(no email)"); });
    hw.forEach(r => { const e = (r.email || "").trim().toLowerCase(); if (!used.has(e)) out.push(row(null, r, e)); });
    return out;
  }
  const mark = v => v === null ? "—" : v ? "✓" : "✗";
  const COLS = [
    ["Name", "name", r => esc(r.name || "—")], ["Email", "email", r => esc(r.email)],
    ["Diagnosed", "diagnosed", r => r.game ? r.diagnosed : "—"], ["Wrong", "wrong", r => r.game ? r.wrong : "—"],
    ["Faults found", "faults", r => r.game ? r.faults + " / " + P.faults.length : "—"],
    ["RC 1", "q1", r => mark(r.q1)], ["RC 2", "q2", r => mark(r.q2)],
    ["Drains", "clean", r => !r.game ? "—" : r.clean === null ? "none" : r.clean ? "✓" : "✗ (" + r.drained + ")"],
    ["Q1 placed", "placed", r => r.hw ? r.placed + " / " + PARTS.length : '<span class="err">no answers</span>'],
    ["Q2", "hard", r => r.hw ? r.hard + " / 2" : "—"], ["Q3", "diff", r => mark(r.diff)],
    ["Time on page", "time", r => fmtTime(r.time)],
    ["Last submit", "at", r => r.at ? new Date(r.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + (r.at > DEADLINE ? ' <span class="err">late</span>' : "") : "—"]
  ];
  function drawStudents() {
    const v = r => { const x = r[sortKey]; return x === null || x === undefined ? -Infinity : x; };
    const sorted = rows.slice().sort((a, b) => { const x = v(a), y = v(b); return (typeof x === "string" || typeof y === "string" ? String(x).localeCompare(String(y)) : x - y) * sortDir; });
    $("stuTbl").innerHTML = "<thead><tr>" + COLS.map(c => '<th aria-sort="' + (c[1] === sortKey ? (sortDir > 0 ? "ascending" : "descending") : "none") + '"><button type="button" class="sortb" data-sort="' + c[1] + '">' + c[0] + (c[1] === sortKey ? (sortDir > 0 ? " ▲" : " ▼") : "") + "</button></th>").join("") + "</tr></thead><tbody>" +
      sorted.map(r => "<tr>" + COLS.map(c => "<td>" + c[2](r) + "</td>").join("") + "</tr>").join("") + "</tbody>";
  }
  $("stuTbl").addEventListener("click", e => {
    const b = e.target.closest("[data-sort]"); if (!b) return;
    const k = b.getAttribute("data-sort"); sortDir = k === sortKey ? -sortDir : 1; sortKey = k; drawStudents();
  });
  $("csvBtn").addEventListener("click", () => {
    const q = x => '"' + String(x === null || x === undefined ? "" : x).replace(/"/g, '""') + '"';
    const head = ["name", "email", "ports_diagnosed", "wrong_diagnoses", "faults_found", "root_cause_1", "root_cause_2", "links_drained", "drains_exact", "q1_parts_placed", "q2_answers", "q3_answered", "active_seconds", "last_submit"];
    const lines = rows.map(r => [r.name, r.email, r.diagnosed, r.wrong, r.faults, r.q1, r.q2, r.game ? r.drained : null, r.clean, r.placed, r.hard, r.diff, r.time, r.at ? new Date(r.at).toISOString() : ""].map(q).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + head.join(",") + "\r\n" + lines.join("\r\n")], { type: "text/csv" }));
    a.download = "miswire-hunt-students.csv"; document.body.appendChild(a); a.click(); a.remove();
  });
  function overview(subs, hw) {
    const g = rows.filter(r => r.game), n = g.length, avg = n ? (g.reduce((t, r) => t + r.faults, 0) / n).toFixed(1) : "—";
    const both = g.filter(r => r.q1 === 1 && r.q2 === 1).length, clean = g.filter(r => r.clean === 1).length, med = median(g.filter(r => r.time !== null).map(r => r.time));
    const tile = (v, k) => "<div><dt>" + k + "</dt><dd>" + v + "</dd></div>";
    $("tiles").innerHTML = tile(n, "Game submissions") + tile(hw.length, "Homework answers") + tile(rows.filter(r => r.game && !r.hw).length, "Game without answers") +
      tile(avg + " / " + P.faults.length, "Faults found, average") + tile(pct(both, n), "Both root causes right") + tile(pct(clean, n), "Exact drains") + tile(med === null ? "—" : fmtTime(Math.round(med)), "Time on page, median");
    $("tiles").hidden = false;
  }

  let timer = null;
  async function load() {
    $("err").hidden = true;
    try {
      const key = $("key").value;
      const subs = await window.MH.rpc("all_submissions", { p_key: key });
      show(subs); $("reload").hidden = false; $("autoWrap").hidden = false;
      try { sessionStorage.setItem("mh-ikey", key); } catch (e) {}   // kept for this tab only, so a reload of the page does not ask again
      let hw = [];
      try { hw = await window.MH.rpc("all_homework", { p_key: key }); showHomework(hw); } catch (e2) { $("sum").textContent += " (Homework answers are not available yet: run supabase/homework.sql.)"; }
      rows = buildRows(subs, hw); drawStudents(); overview(subs, hw);
      $("sum").textContent += " Loaded at " + new Date().toTimeString().slice(0, 8) + ".";
    }
    catch (e) { $("err").textContent = e.message; $("err").hidden = false; $("auto").checked = false; }
  }
  $("keyForm").addEventListener("submit", e => { e.preventDefault(); load(); });
  $("reload").addEventListener("click", load);
  $("auto").addEventListener("change", () => { clearInterval(timer); if ($("auto").checked) timer = setInterval(load, 30000); });
  try { const k = sessionStorage.getItem("mh-ikey"); if (k) { $("key").value = k; load(); } } catch (e) {}
})();
