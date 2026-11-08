// JR-16: the cluster config (intended topology). This is public: every switch gets it.
// 4 spine switches (SP), 4 aggregation switches (AG) in two blocks, 8 ToRs.
// Dual links everywhere, as in Jupiter (Section 3.5).
(function () {
  const SP = ["SP1", "SP2", "SP3", "SP4"], AG = ["AG1", "AG2", "AG3", "AG4"];
  const TOR = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"];
  const agBlock = { AG1: "A", AG2: "A", AG3: "B", AG4: "B" }, agLocal = { AG1: 1, AG2: 2, AG3: 1, AG4: 2 };
  const torBlock = t => (+t.slice(1) <= 4 ? "A" : "B"), torLocal = t => ((+t.slice(1) - 1) % 4) + 1;

  const links = []; // {a:{s,p}, b:{s,p}, tier:'spine'|'tor', k:1|2}
  SP.forEach((sp, i0) => AG.forEach((ag, j0) => [1, 2].forEach(k => {
    links.push({ a: { s: sp, p: "p" + (2 * j0 + k) }, b: { s: ag, p: "u" + (2 * i0 + k) }, tier: "spine", k });
  })));
  AG.forEach(ag => TOR.forEach(t => {
    if (torBlock(t) !== agBlock[ag]) return;
    const tl = torLocal(t), al = agLocal[ag];
    [1, 2].forEach(k => links.push({ a: { s: ag, p: "d" + (2 * (tl - 1) + k) }, b: { s: t, p: "p" + (2 * (al - 1) + k) }, tier: "tor", k }));
  }));

  const pos = {
    SP1: [240, 52], SP2: [400, 52], SP3: [560, 52], SP4: [720, 52],
    AG1: [200, 200], AG2: [320, 200], AG3: [640, 200], AG4: [760, 200],
    T1: [110, 340], T2: [210, 340], T3: [310, 340], T4: [410, 340],
    T5: [550, 340], T6: [650, 340], T7: [750, 340], T8: [850, 340]
  };
  const role = s => (s.startsWith("SP") ? "Spine switch" : s.startsWith("AG") ? "Aggregation switch (block " + agBlock[s] + ")" : "Top-of-Rack switch (block " + torBlock(s) + ")");

  window.MH_TOPO = { SP, AG, TOR, ALL: SP.concat(AG, TOR), links, pos, role };
})();
