# Unit 3, Part B — Lesson Plan: Ten Years of Clos and Centralized Control (Jupiter Rising)

**Course:** Communication Networks for Data Centers and AI (0-361.2.2460) · Prof. Chen Avin  
**Format:** 2 × 50 min, face-to-face · flipped classroom  
**Core Paper:** *Jupiter Rising: A Decade of Clos Topologies and Centralized Control in Google's Datacenter Network* (Singh et al., SIGCOMM '15 / CACM '16)  
**Context Paper:** *RNG: Flat Datacenter Networks at Scale* (Bernardi et al., arXiv '26)  
**Prerequisites (Student Prep):** EX3 Miswire Hunt game, readings (§2, §3, §5.1–§5.3, §6.1–§6.2), and Part C SDN questions (1–3).  
**Instructor Materials:** Slides (`Google_s_Jupiter_Network_Evolution.pptx`), Live Dashboard (`site/public/instructor.html`), Interactive Map (`site/public/index.html`), Lesson Map (`site/public/lesson-map.html`).

---

## 🎯 5 Core Lesson Goals (מטרות השיעור)

1. **SDN Architecture & Firepath Split:** Understanding centralized link-state collection combined with distributed, local ECMP route computation on each switch (and why this differs from OpenFlow).
2. **Failures, Maintenance & Fast Recovery:** Analyzing convergence times (Table 4), Neighbor Discovery (ND) as both topology verification and software keepalive (§5.2.1), hitless scheduled maintenance via color sets (Fig. 20), and cascading outages (§6.2.1).
3. **Generational Hardware Evolution:** Tracing the 10-year trajectory from Firehose 1.0 (server-based switches) to Jupiter (Centauri blocks, optical bundles), understanding *intransitive disconnect*, *bag-on-the-side*, and depopulation strategies (Table 2, Fig. 11).
4. **Theory to Production Realities:** What Jupiter adds to textbook fat-trees and VL2; contrasting real traffic patterns (Fig. 3: 92% leaves the block due to storage disaggregation) with enterprise/wild assumptions (75–80% localized).
5. **Real-world Congestion & Packet Drops:** Why a non-blocking 1.3 Pbps fabric drops packets at only 25% average utilization (§6.1); analyzing packet drop breakdown (Fig. 21: 62.8% host fanin, 35.9% ToR fanin, 1.3% uplinks), the 7 mitigation strategies, and the switch silicon perspective (chip corner).

---

## ⏱️ Timeline at a Glance

| # | When | Block | Format | Paper Anchor | Goal |
|---|---|---|---|---|---|
| **0** | **Home (~60 min)** | **Miswire Hunt:** read paper clippings, diagnose the 5 faults, answer SDN-plane Q1–Q3 | Website game + questions | §5.2, §5.2.1, §5.2.2, §5.3.1 | 1, 2 |
| **1** | **L1 0:00–0:05** | **Game debrief:** reveal 5 faults on `instructor.html`, "Why check both ends?" | Live dashboard + circle | §5.2.1 | 2 |
| **2** | **L1 0:05–0:12** | **SDN planes:** review disputed placements, Q3 (Firepath vs. OpenFlow) | Circle discussion | §5.2.2 | 1 |
| **3** | **L1 0:12–0:25** | **📖 Reading 1 (§5.1):** 4 reasons Google built their own control plane | Read-aloud + circle discussion | §5.1 | 1 |
| **4** | **L1 0:25–0:37** | **Convergence:** local vs. non-local (125–325 ms vs. 4,000 ms) | Lecture + Table 4 | Table 4 | 2 |
| **5** | **L1 0:37–0:50** | **Hitless Upgrades:** 4 sets = 56.25% min capacity, 8 sets = 75% | Graph analysis (Fig. 20) | §5.3.3, Fig. 20 | 2 |
| — | *10 min* | *Break between sessions* | | | |
| **6** | **L2 0:00–0:15** | **Five Generations:** what changed & what didn't; FH1.0, bag-on-the-side, depop A vs B | Lecture + Table 2 / Fig. 11 | §3, Table 2, Fig. 11 | 3 |
| **7** | **L2 0:15–0:25** | **📖 Reading 2 (§2 & Fig. 3):** storage spreading: 92% leaves block vs. Wild in-rack | Read-aloud + graph | §2, Fig. 3 | 4 |
| **8** | **L2 0:25–0:33** | **📖 Reading 3 (§6.2.1):** the snowball outage (ND keepalive starved by Dijkstra) | Read-aloud + circle | §6.2.1 | 2 |
| **9** | **L2 0:33–0:45** | **Who drops packets?** 62.8% host, 35.9% ToR, 1.3% uplinks; 7 fixes + chip corner | Graph analysis + chip corner | §6.1, Fig. 21 | 5 |
| **10** | **L2 0:45–0:50** | **Wrap-up & Bridge:** "What did Jupiter add to fat-tree in 1 sentence?" $\rightarrow$ Unit 4 | Circle | — | 1–5 |

---

## 📋 Session 1: Controlling the Fabric (לשלוט ב-Fabric) · 50 min

### 0:00–0:05 · Game Debrief & Triage (תחקיר המשחק)
* **Screen Display:** Open [`site/public/instructor.html`](file:///c:/Users/shayg/Code/MSc/MSc-GitHub/courses/data-centers-and-ai-networks/exercises/ex3/site/public/instructor.html), reveal the aggregated student heatmaps and the 5 hidden faults.
* **Circle Prompt:** *"Who found the miswired link (T4 ↔ AG4)? How did you know it was plugged into the wrong port?"*
* **Key Concept — Why check both ends?**
  * In standard distributed routing (e.g., OSPF), a miscabled link forms an adjacency and causes immediate forwarding loops.
  * In Firepath, each switch compares discovered peer IDs against the static `Cluster Config`. If mismatched, the port is shut down before carrying traffic.
  * Show why draining a healthy link penalizes fabric bandwidth, while leaving a broken or flapping link degrades user traffic.

### 0:05–0:12 · The SDN Planes & Firepath Architecture (שכבות ה-SDN)
* **Debate Disputed Placements (Part C, Q1–Q2):**
  * `Cluster Config` $\rightarrow$ **Management Plane** (offline declarative intent).
  * `Link State Database (LSD)` $\rightarrow$ **Control Plane** (dynamic global topology state).
  * `Forwarding Table (FIB)` $\rightarrow$ **Data Plane** (installed in hardware ASICs).
* **⭐ Question 3 Resolution:**
  * *"What does Firepath do that a standard OpenFlow controller would not?"*
  * **Answer:** Centralized link state, **decentralized path computation**. The Firepath master only gathers and pushes the ~64 KB Link State Database. Each switch runs its own local Dijkstra/ECMP calculation to program its ASIC. OpenFlow centralizes path computation and pushes individual `FlowMod` rules, creating a fatal scalability bottleneck at 50,000+ ports.

### 0:12–0:25 · 📖 Guided Reading 1 — §5.1: Why Build Our Own Control Plane?
* **Text Passage:** SIGCOMM '15 §5.1 (*"We treated the datacenter network as a single fabric..."*).
* **Stop Points (Stop after each of the 4 reasons):**
  1. *Reason 1: Dynamic broadcast & scale limits of OSPF/IS-IS.* (Flooding LSA packets across tens of thousands of links triggers broadcast storms and exhausts CPU).
  2. *Reason 2: Lack of multi-path (ECMP) support in 2005 standard routing.* (Internet IGPs were designed for shortest-path WAN trees, not Clos fabrics with 16–64 equal-cost paths).
  3. *Reason 3: Configuration management overhead.* (Configuring thousands of autonomous BGP/OSPF routers individually invites human error).
  4. *Reason 4: Routing loops from physical miscabling.* (Autonomous protocols accept cables as connected without verifying structural topology intent).
* **Circle Question:** *"Are these four reasons still valid today, or has the networking industry caught up (e.g., with modern BFD, BGP-EVPN, or RIFT)?"*

### 0:25–0:37 · Table 4 Analysis: Convergence Time (התכנסות מקומית מול לא-מקומית)
* **Table 4 Deep Dive:**
  * **Local convergence (125–325 ms):** When an adjacent link fails, the local switch detects PHY loss or missing ND heartbeats and immediately hashes traffic onto remaining ECMP paths locally without waiting for the master.
  * **Non-local convergence (~4,000 ms):** The failure report traverses the out-of-band CPN to the Firepath master, which updates the LSD version and pushes it fabric-wide.
* **Key Insight:** Fast local reroute guarantees near-instant packet survival, while centralized LSD propagation updates global optimal paths without transient loops.

### 0:37–0:50 · Hitless Upgrades: Fig. 20 (שדרוג ללא השבתה)
* **Project Fig. 20 (Maintenance Sets & Capacity):**
* **Guided Question:** *"When we take a set down for software or firmware maintenance, how much bisection capacity remains?"*
  * **Left Panel (4 sets / colors):** 
    $$\text{Worst-case capacity} = \left(\frac{4 - 1}{4}\right)^2 = \left(\frac{3}{4}\right)^2 = 56.25\%$$
    *(Because traffic crosses both aggregation and spine stages, taking 1 of 4 sets at each stage reduces capacity quadratically).*
  * **Right Panel (8 sets / colors):**
    $$\text{Worst-case capacity} = \left(\frac{8 - 1}{8}\right)^2 = \left(\frac{7}{8}\right)^2 = 76.56\% \approx 75\%$$
* **Takeaway:** By partitioning the Clos fabric into independent maintenance "colors", Google can upgrade live infrastructure during production without dropping active flows.

---

*(10-minute break)*

---

## 🏗️ Session 2: Building & Operating at Scale (לבנות ולהפעיל בקנה מידה) · 50 min

### 0:00–0:15 · Five Generations of Clos: From PCI to Centauri (חמישה דורות)
* **Table 2 Walkthrough (The generational journey):**
  1. **Firehose 1.0 (2005):** Switch chips installed as PCI cards inside commodity servers.
     * *Fatal flaws:* Server reboots caused network flap storms; cabling tens of thousands of copper wires between servers was an operational nightmare.
  2. **Firehose 1.1 (2006):** Dedicated 1U chassis; deployed as "bag-on-the-side" with the Big Red Button.
     * *Intransitive disconnect:* Two switches could talk to each other through the legacy network but not through the new fabric, or vice versa, causing blackholes.
  3. **Watchtower & Saturn (2008–2009):** Transitioned from copper to fiber optics; custom multi-chip chassis with backplanes.
  4. **Jupiter (2012):** 1.3 Pbps, 40G merchant silicon, Centauri 4RU building blocks, and 24-fiber MPO optical cable bundles (Table 3: 40% reduction in cable handling).
  5. **Depopulation strategies (Fig. 11):** Depop A (deploying only half the spine blocks for lower bisection cost) vs. Depop B.
* **Circle Question:** *"Across all 5 generations and 10 years, what core architectural principles NEVER changed?"*  
  *(Answer: Merchant silicon, multi-stage Clos, centralized out-of-band control).*

### 0:15–0:25 · 📖 Guided Reading 2 — §2 & Fig. 3: Storage Spreading (דפוסי תנועה)
* **Read Passage §2 & inspect Fig. 3:**
  * **Observation:** Over 92% of traffic leaves the local rack/aggregation block!
* **Circle Debate:** *"In Unit 1 ('Network Traffic Characteristics of Data Centers in the Wild'), we saw that 75% to 80% of traffic stayed inside the rack. Who is right, and how do we reconcile this contradiction?"*
* **Resolution:** In the Wild studied traditional multi-tenant cloud racks with localized compute. Google uses **disaggregated, shared storage** (Colossus/Bigtable/Spanner). Data is striped evenly across the entire data center cluster, forcing nearly all storage I/O through the spine layer.

### 0:25–0:33 · 📖 Guided Reading 3 — §6.2.1: The Snowball Outage (הנפילה הכוללת)
* **Text Passage:** §6.2.1 ("Control Software at Scale - The whole-fabric reboot").
* **Question for the Circle:** *"Which component from our homework assignment brought down the entire data center network during the power recovery?"*
* **Root Cause Breakdown:**
  * **Neighbor Discovery (ND)** acts as both a cable verifier AND a software keepalive (§5.2.1).
  * During a site-wide reboot, thousands of switches booted simultaneously. Weak embedded switch CPUs were maxed out running Dijkstra SPF route calculations.
  * The starved CPU could not send ND keepalive heartbeats in time.
  * Neighboring switches assumed the link had failed $\rightarrow$ reported link down to Master $\rightarrow$ Master pushed new LSD $\rightarrow$ triggered *more* SPF calculations $\rightarrow$ **cascading flap storm (Snowball effect)**.
* **The Fix:** Strict OS process scheduling (prioritizing ND heartbeats above route computation) and conservative keepalive timeout tuning.

### 0:33–0:45 · Fig. 21 Analysis & Chip Corner: Packet Drops at 25% Load
* **Project Fig. 21 (Packet Drop Breakdown):**
* **The Mystery:** Why does a 1.3 Pbps non-blocking Clos fabric experience significant packet drops at only 25% average utilization?
* **Drop Breakdown:**
  * **Host fan-in:** **62.8%** of all drops.
  * **ToR fan-in:** **35.9%** of all drops.
  * **Fabric uplinks / Spines:** Only **1.3%** of drops!
* **The 7 Solutions (§6.1):**
  1. Dynamic shared buffer pools in switch chips.
  2. ECN (Explicit Congestion Notification) marking.
  3. Bounded TCP receiver windows to prevent buffer bloat.
  4. Priority queuing / QoS (separating latency-sensitive RPCs from bulk batch).
  5. Packet spraying / flowlet load balancing.
  6. Rate limiting bursty applications.
  7. End-host pacing.
* **Chip Corner (פינת שבב - Hardware Perspective):**
  * Merchant switch ASICs (e.g., Broadcom, Marvell) prioritize high port density and raw throughput over buffer size (shallow buffers: ~12–16 MB shared across 32–64 ports).
  * Incast bursts from hundreds of storage nodes hitting a single ToR or host port instantly deplete on-chip SRAM buffers, causing drops long before link averages look congested.

### 0:45–0:50 · Wrap-up Circle & Bridge to Unit 4 (סיכום ומעבר ליחידה 4)
* **Quick Round (Every student in 1 sentence):**
  *"In one sentence, what did Google Jupiter add to the theoretical Clos/fat-tree concept?"*
* **Instructor Synthesis & Unit 4 Bridge:**
  * Jupiter proved that merchant silicon and centralized link-state control can run massive data centers reliably.
  * But static ECMP hashing struggles with bursty elephant flows, leading to congestion at low average utilization.
  * **Next week (Unit 4):** Dynamic traffic routing—**WCMP** (Weighted Cost Multipathing), **FlowBender**, and advanced Congestion Control.

---

## ✂️ Emergency Time-Management Protocol

If running behind schedule, cut in this strict priority order:
1. **First cut:** Truncate Guided Reading 3 (§6.2.1) to an instructor summary (saves ~5 min).
2. **Second cut:** Skip the detailed discussion of Depopulation A vs. B in Session 2 (saves ~4 min).
3. **DO NOT CUT:** The Miswire Hunt debrief, the SDN plane resolution (Q3), Fig. 20 hitless upgrade capacity, and the Fig. 21 drop breakdown.

---

## 🛠️ Answer Key Reference (Miswire Hunt Faults)

| Fault | What is wrong | Affected Ports | Diagnosis | Mechanism |
|---|---|---|---|---|
| **1. Dark Switch** | T7 software crashed | T7: u1, u2<br>AG3: d7<br>AG4: d7 | AG3 d7: Dead peer<br>AG4 d7: Dead peer | Optical transceiver powered (`PHY UP`), but OS hung; ND keepalive stopped. |
| **2. Asymmetric Link** | Broken RX fiber | SP3: p3<br>AG3: u3 | SP3 p3: Dead peer<br>AG3 u3: Peer deaf | Duplex fiber: AG3 hears SP3, but SP3 cannot hear AG3. ND prevents one-way routing. |
| **3. Miscabled Link** | Cable in wrong port | T4: u2<br>AG4: d3 | T4 u2: Miswired<br>AG4 d3: Miswired | Technician plugged cable into d3 instead of d4. ND detects peer ID mismatch. |
| **4. Dead Link** | Unplugged cable | SP2: p4<br>AG4: u2 | SP2 p4: Cable down<br>AG4 u2: Cable down | Fiber disconnected; `PHY DOWN` on both ends. |
| **5. High Error Rate** | Degraded optics | SP1: p1<br>AG1: u1 | SP1 p1: Bad link<br>AG1 u1: Bad link | Passes ND frames but CRC errors spike. Causes silent TCP retransmissions. |
