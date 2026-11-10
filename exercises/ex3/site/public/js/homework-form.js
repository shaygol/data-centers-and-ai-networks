// Questions 1-3 under the game: the draft lives in localStorage. There is no separate Submit:
// the one Submit card at the bottom of the page (student.js) sends the game and these answers together, via window.MH_HW.
// Part 2 (the A/B/C position) is done in class, so choice/why/change are no longer sent.
(function () {
  const $ = id => document.getElementById(id);
  const KEY = "mh-homework-v1";
  const PARTS = ["Firepath master", "Firepath client", "Link State Database (LSD)", "Control Plane Network (CPN)", "Neighbor Discovery (ND)", "BGP at the cluster border routers (CBRs)", "Cluster config", "Forwarding table"];
  const DESC = ["The elected node that collects link state and redistributes it", "The process running on every fabric switch", "The versioned topology state the master sends to clients",
    "The out-of-band network the master and clients talk over", "The liveness and peer-correctness check on each link", "Route exchange at the edge of the fabric", "The static topology of the whole fabric, loaded at startup", "The table in each switch that every packet is looked up in"];
  const SHORT = { data: "Data", control: "Control", management: "Management", outside: "Outside SDN" };
  const PLANES = [["", "Choose..."], ["data", "Data plane"], ["control", "Control plane"], ["management", "Management plane"], ["outside", "Outside the SDN picture"]];
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  let d = {}; try { d = JSON.parse(store.get(KEY) || "{}") || {}; } catch (e) { d = {}; }
  d.place = d.place || {};
  const opt = (v, t, sel) => '<option value="' + v + '"' + (sel ? " selected" : "") + ">" + t + "</option>";
  $("hwPlace").innerHTML = '<div class="hwp-head"><span></span>' + PLANES.slice(1).map(x => "<span>" + SHORT[x[0]] + "</span>").join("") + "</div>" +
    PARTS.map((p, i) => '<div class="hwp-row" role="radiogroup" aria-label="' + p + '" data-part="' + (i + 1) + '"><span class="hwp-name"><span class="hw-pn">' + (i + 1) + '</span><span><span class="hwp-t">' + p + '</span><span class="hwp-desc">' + DESC[i] + "</span></span></span>" +
      PLANES.slice(1).map(x => '<label class="hwp-cell" title="' + x[1] + '"><input type="radio" name="hp' + (i + 1) + '" value="' + x[0] + '"' + (d.place[i + 1] === x[0] ? " checked" : "") + '><span class="hwp-dot"></span><span class="hwp-lab">' + SHORT[x[0]] + "</span></label>").join("") + "</div>").join("");
  ["h1p1", "h1p2"].forEach(id => { $(id).innerHTML = opt("", "Choose...", !d[id]) + PARTS.map((p, i) => opt(String(i + 1), (i + 1) + ". " + p, d[id] === String(i + 1))).join(""); });
  const TEXT = ["hwName", "h1t1", "h1t2", "h1c"];  // hwName sits in the Submit card, next to the email
  TEXT.forEach(id => { if (d[id]) $(id).value = d[id]; });
  function collect() {
    const o = { place: {} };
    PARTS.forEach((p, i) => { const r = document.querySelector('input[name="hp' + (i + 1) + '"]:checked'); o.place[i + 1] = r ? r.value : ""; });
    ["h1p1", "h1p2"].concat(TEXT).forEach(id => { o[id] = $(id).value; });
    return o;
  }
  function onInput() { d = collect(); store.set(KEY, JSON.stringify(d)); document.dispatchEvent(new Event("mh-hw-change")); }
  $("hwForm").addEventListener("input", onInput);
  $("hwName").addEventListener("input", onInput);
  $("hwForm").addEventListener("submit", e => e.preventDefault());

  window.MH_HW = {
    // the current draft (placements, the two "hardest" answers, question 3, the name)
    data: collect,
    // which of questions 1-3 still have no answer
    missing() {
      const o = collect(), m = [];
      if (PARTS.some((p, i) => !o.place[i + 1])) m.push("1");
      if (!o.h1t1.trim() && !o.h1t2.trim()) m.push("2");
      if (!o.h1c.trim()) m.push("3");
      return m;
    },
    send(email) {
      const o = collect();
      const answers = { place: o.place, hard: [{ part: o.h1p1, text: o.h1t1 }, { part: o.h1p2, text: o.h1t2 }], diff: o.h1c };
      return window.MH.rpc("submit_homework", { p_email: email, p_name: o.hwName, p_answers: answers });
    }
  };
})();
