# Unit 3, Part B — Lesson Plan: Ten Years of Clos and Centralized Control (Jupiter Rising)

Course: Communication Networks for Data Centers and AI (0-361.2.2460) · Prof. Chen Avin  
Class: 2 × 50 min, face to face · flipped classroom  
Papers: Jupiter Rising (Singh et al., SIGCOMM '15 / CACM '16) · RNG: Flat Datacenter Networks at Scale (Bernardi et al., arXiv '26)  
Before class (students): EX3: Miswire Hunt (JR-16 Clos fabric triage, Part A readings, Part B game, Part C questions 1–3 on SDN planes and Firepath, demo video `wire-hunter.mp4`) plus a ticket (one question or misunderstanding to raise in class).  
Slides: `Google_s_Jupiter_Network_Evolution.pptx` · Live instructor page (`site/public/instructor.html`).

---

## Lesson goals

Students should leave able to do the following. Not every goal has to be fully covered in class.

1. **State the three core principles of Google's network:** multi-stage Clos topologies from merchant switch silicon, refreshed every generation, and centralized route control over an out-of-band network.
2. **Trace the generational evolution:** explain what problem doomed Firehose 1.0 (§3.1), how Firehose 1.1 safely reached production (§3.1), and why Jupiter moved to multi-chip building blocks (Centauri, §3.3) and cable bundling (§3.4).
3. **⭐ Priority: explain how Firepath works and where it sits in SDN:**
   * why a single-operator, pre-planned Clos fabric does not need distributed routing protocols (OSPF, IS-IS, BGP).
   * the Firepath split: centralized link-state collection and distribution (the master), but local shortest-path calculation (the clients).
   * contrast with OpenFlow: switches calculate their own FIBs locally rather than having a controller install every flow rule.
4. **Triage physical and software faults using pairwise Neighbor Discovery (ND):**
   * why ND is both a topology verifier and a software keepalive (§5.2.1).
   * distinguish a control-plane software crash from physical cable or power loss.
   * identify asymmetric (one-way) optical links.
5. **Analyze operational failures at scale:** explain why non-blocking fabrics drop packets at only 25% average utilization (§6.1), and analyze the whole-fabric reboot outage (§6.2).
6. **Contrast hierarchical Clos (Jupiter) with flat expanders (RNG):** why Google chose hierarchy and uniform bisection, while Amazon chose flat quasi-random graphs and variable path lengths.

---

## Prep checklist

* **Slides:**
  * Table 2: 10-year generation comparison (slide 5)
  * Fig. 5: Firehose 1.1 bag-on-the-side and Big Red Button (slide 8)
  * Fig. 8: Centauri chassis, Middle Block, and Spine Block (slide 12)
  * Fig. 9: Firepath architecture and CPN (slide 15)
  * Outages summary table (slide 22)
* **Live tools:**
  * Open `site/public/instructor.html` in a browser tab. Enter the instructor key and verify the class submissions loaded.
  * Have `site/public/index.html` open to demonstrate the JR-16 map and live packet motion.
* **Board:**
  * Space for a 3-tier Clos (Spines, Aggregation, ToRs) with an out-of-band CPN and a Firepath Master.
  * Space for four ticket columns: `Hardware & Generations` | `Firepath & SDN` | `Miswire Hunt Faults` | `Operations & Outages`.
* **Read-aloud passages:** have the SIGCOMM '15 PDF open to §3.1 (page 186), §5.1–§5.2 (pages 191–193), and §6.2 (page 195).

---

## Timeline at a glance

| Time | Block | Mode |
|---|---|---|
| **Session 1** | **Ten Years of Clos: From PCI Cards to Centauri** | *(50 min)* |
| 0:00–0:07 | Tickets + warm-up: the 2004 four-post baseline | whole class |
| 0:07–0:17 | 📖 Read-aloud 1: §3.1, FH1.0 and why switch silicon left the server | student reads, discussion |
| 0:17–0:32 | Five generations: Table 2, Centauri building blocks, and cable bundling | joint figure reading |
| 0:32–0:42 | Centralized control: why OSPF failed Google, and the Firepath split | board + slide 15 |
| 0:42–0:50 | 📖 Read-aloud 2: §5.1, Treating the fabric as a single switch | student reads, discussion |
| *Break* | *(10 min)* | |
| **Session 2** | **Miswire Hunt in Class: Triage, SDN, and Outages** | *(50 min)* |
| 0:00–0:15 | ⭐ Live dashboard sweep: `instructor.html` results and heatmaps | live dashboard |
| 0:15–0:30 | Root-cause triage: the dark switch T7, one-way link SP3, and miscabling | pairs, then whole class |
| 0:30–0:38 | The SDN debate: Question 1 agreement & why Firepath is not OpenFlow | whole class |
| 0:38–0:45 | 📖 Read-aloud 3: §6.2, The whole-fabric reboot storm | student reads, case study |
| 0:45–0:50 | Synthesis, ticket sweep, and bridge to Unit 4 | whole class |

When you're short on time, cut in this order:
1. Centauri building-block port arithmetic in Session 1 (summarize in 2 minutes).
2. Read-aloud 1: summarize the FH1.0 failure rather than reading the full page.
3. Protect the **⭐ Live dashboard sweep and root-cause triage** in Session 2.

---

## Session 1 — Ten Years of Clos: From PCI Cards to Centauri (50 min)

### 0:00–0:07 · Tickets and warm-up
* **Collect tickets:** glance at them and sort into the four board columns.
* **Warm-up question (cold-call 1–2 students):**  
  *"In 2004, Google had clusters of 20,000 servers. ToR switches had 48 1GE ports with 10:1 to 40:1 oversubscription. The biggest commercial core routers had 512 ports and cost millions. Traffic doubled every 12–15 months. What would you do?"*
* **The quote:** *"Essentially, we could not buy a network at any price that could meet our scale and performance needs."* (§1).
* **The bridge from Unit 1:** Al-Fares (fat-tree, 2008) and VL2 (2009) proposed Clos topologies built from commodity switches. Jupiter shows what happens when you actually run that idea in production across 5 generations over 10 years.

### 0:07–0:17 · 📖 Read-aloud 1 — §3.1, FH1.0 and why switch silicon left the server
* **Passage:** SIGCOMM '15 §3.1, from *"Our first topology was a 3-stage Clos..."* through the end of the Firehose 1.0 subsection:
  > *"The resulting wiring complexity … doomed the effort to never seeing production traffic. At the same time, we consider FH1.0 to be a landmark effort internally."*
* **Stop and ask:**
  1. *"Why did putting switch chips on PCI cards inside Linux servers seem like a natural idea to Google in 2005?"*  
     Google was already the world's best at mass-producing cheap, homogeneous Linux servers. Putting switch chips inside existing servers avoided buying chassis hardware.
  2. *"Why was it fatal?"*  
     Two reasons: (i) Reliability: servers crash, upgrade, and reboot constantly. Having a server reboot take down an internal Clos switch created uncontrollable topology churn. (ii) Cabling: tens of thousands of copper cables dangling between server motherboards created an unmanageable mess.
  3. *"Why did Google consider a design that never carried production traffic a 'landmark effort'?"*  
     It proved merchant switch silicon worked, established the software stack, and taught them that network switches must be packaged in dedicated, independent chassis.

### 0:17–0:32 · Five generations: Table 2, Centauri building blocks, and cable bundling
* **Table 2 walk-through (slide 5):**
  * **FH 1.1 (2006, 10T):** Dedicated 1U chassis. Deployed as a "bag-on-the-side" alongside the legacy network (Fig. 5).
    * Ask: *"What was the Big Red Button?"* An automated circuit to revert all ToR uplinks to the legacy network instantly if the new Clos fabric failed.
  * **Watchtower (2008, 82T):** Custom chassis with backplane; replaced copper with fiber optics.
  * **Saturn (2009, 207T):** 24 × 10G chips; 288-port non-blocking chassis.
  * **Jupiter (2012, 1.3 Pbps):** 16 × 40G chips; scaled to 40G links across an entire data center.
* **Centauri building blocks (§3.3, Fig. 8, slide 12):**
  * Centauri is a 4RU chassis holding 4 switch chips (each 16 × 40G).
  * 4 Centauri chassis form a **Middle Block (MB)** (aggregation layer).
  * 6 Centauri chassis form a **Spine Block**.
  * Contrast with HW1: in textbook fat-trees, all switches are identical standalone $k$-port devices. In Jupiter, multi-chip building blocks act as a single logical switch with internal non-blocking crossbars.
* **Cable bundling (§3.4, Table 3):**
  * Running hundreds of thousands of individual optical fibers manually results in huge labor costs and high error rates.
  * Google bundled 24 fibers into single MPO connectors, cutting cable count by 40% and drastically speeding up deployment.

### 0:32–0:42 · Centralized control: why OSPF failed Google, and the Firepath split
* **Draw on the board:**
  * A 3-tier Clos: 4 spines, 4 aggregation switches in 2 blocks, 8 ToRs.
  * A separate out-of-band network: the **Control Plane Network (CPN)** connecting all switches to a **Firepath Master**.
* **The 5-step operational cycle:**
  1. *Provisioning:* every switch receives the static `Cluster Config` at boot (the intended topology).
  2. *Neighbor Discovery (ND):* each switch exchanges pairwise ND frames over every port to verify physical cabling against the plan.
  3. *Collection:* Firepath clients report local link state over the CPN to the Master.
  4. *Distribution:* the Master builds the Link State Database (LSD), increments the version number, and pushes diffs to all switches. (The entire datacenter LSD fits in ~64 KB!).
  5. *Computation:* each switch independently computes ECMP shortest paths and installs entries into hardware forwarding tables (FIB).

### 0:42–0:50 · 📖 Read-aloud 2 — §5.1, Treating the fabric as a single switch
* **Passage:** SIGCOMM '15 §5.1, second paragraph:
  > *"We treated the datacenter network as a single fabric with tens of thousands of ports rather than a collection of hundreds of autonomous switches that had to dynamically discover information about the fabric."*
* **Ask the class:** *"The paper lists four reasons why existing routing protocols (OSPF, IS-IS, BGP) were rejected. What were they?"*
  1. *Dynamic broadcast overhead:* flooding LSAs across tens of thousands of ports consumes CPU and causes broadcast storms.
  2. *Poor multi-path support:* standard routing protocols in 2005 were built for WAN shortest paths, not massive Clos ECMP.
  3. *Configuration burden:* configuring hundreds of autonomous BGP/OSPF instances was brittle and prone to human error.
  4. *Forwarding loops from miscabling:* in an autonomous IGP, a miscabled link is accepted into SPF, creating routing loops and blackholes.

---

*(10-minute break)*

---

## Session 2 — Miswire Hunt in Class: Triage, SDN, and Outages (50 min)

### 0:00–0:15 · ⭐ Live dashboard sweep: `instructor.html`
* **Project `site/public/instructor.html`:** enter the instructor key.
* **Walk through class metrics:**
  1. *Active time spent:* show the median and range (typically 15–25 minutes).
  2. *Faults heatmap:* which faults were found by everyone, and which were missed?
     * Cable down (unplugged): usually ~100% found.
     * High error rate: moderate discovery.
     * Dark switch T7 and asymmetric link SP3 p3: usually lowest agreement.
  3. *Drain accuracy table:* how many students drained exactly the 8 broken links? Show that draining working links costs bandwidth, while leaving broken links causes packet drops or bouncing.

### 0:15–0:30 · Root-cause triage: the five faults
Pairs take 2 minutes per fault, then discuss as a class:

* **Fault 1: The Dark Switch (T7)**
  * *Symptoms:* T7 console times out (`Connection timed out`, 100% ping loss). On AG3 and AG4, ports facing T7 show `PHY UP`, but `Discovered: none`.
  * *Discussion:* *"Why is 'T7 software crashed' right and 'lost power' or 'two cable faults' wrong?"*
  * *Answer:* If T7 lost power, optical transceivers would lose power, causing neighbors to see `PHY DOWN`. Because `PHY UP` is asserted, the physical link is intact. **ND is also the keepalive protocol** running in software (§5.2.1). If the switch OS hangs, ND frames stop, but the transceiver stays lit.
* **Fault 2: The One-Way Link (SP3 p3 ↔ AG3 u3)**
  * *Symptoms:* From SP3, port p3 shows `PHY UP`, `Discovered: none` (looks identical to a dead neighbor). But inspect AG3 port u3: it shows `Discovered: SP3`!
  * *Physical cause:* Duplex optical cables have separate TX and RX fibers. A snapped RX fiber or burned-out photodiode creates a one-way link. ND requires bidirectional agreement; a link is UP only if both ends hear each other.
* **Fault 3: Miscabling (T4 ↔ AG4)**
  * *Symptoms:* Cable plugged into the wrong port.
  * *Discussion:* *"What would OSPF do with this link? What does Firepath do?"*
  * *Answer:* OSPF forms an adjacency and routes over it, creating forwarding loops. Firepath checks the discovered peer against the static `Cluster Config`, detects the mismatch, and disables the port.

### 0:30–0:38 · The SDN debate: Question 1 agreement & why Firepath is not OpenFlow
* **Project the Question 1 Agreement Table from `instructor.html`:**
  * Review student placements across Data, Control, Management, and Outside SDN.
  * Focus on split placements:
    * *Cluster Config:* Management (offline input).
    * *LSD:* Control (versioned routing state).
    * *Forwarding Table (FIB):* Data (installed in hardware ASICs).
* **⭐ Question 3 resolution:**
  * *"What does Firepath do that a textbook OpenFlow controller would not?"*
  * **Answer:** In Firepath, **switches compute their own forwarding tables locally** using ECMP shortest paths over the LSD pushed by the master. In OpenFlow, the controller calculates paths and directly installs flow table entries via `FlowMod`.
  * **Why Google chose this:** Scalability. Centralizing flow entries for tens of thousands of switches creates a massive controller bottleneck. Distributing a 64 KB link-state database allows all switches to recompute paths in parallel within milliseconds.

### 0:38–0:45 · 📖 Read-aloud 3 — §6.2, The whole-fabric reboot storm
* **Passage:** SIGCOMM '15 §6.2, "Control Software at Scale":
  > *"During a whole-fabric reboot… ND heartbeats were delayed by intensive route computation on the switch CPU, causing links to flap in a cascading failure."*
* **Guided analysis:**
  1. *What happened:* A site power outage rebooted thousands of switches simultaneously. Weak embedded switch CPUs were overwhelmed running both ND keepalives and Dijkstra SPF calculations. Keepalives timed out, marking links down, which generated more LSD updates, triggering more route calculations in a cascading flap storm.
  2. *The fix:* Separate process priorities (deprioritize routing computation below keepalive heartbeats) and tune keepalive timers for worst-case CPU load.
* **Drops at 25% utilization (§6.1):**
  * Why did a 1.3 Pbps non-blocking fabric drop packets at 25% load?
  * Causes: incast bursts, shallow switch buffers in merchant silicon, and imperfect ECMP hashing placing elephant flows on the same link.
  * Fixes: dynamic buffer sharing, QoS, bounded TCP windows, and ECN.

### 0:45–0:50 · Synthesis, ticket sweep, and bridge to Unit 4
* **Ticket sweep:** answer remaining tickets from the board.
* **Bridge to Unit 4 (Routing in Data Centers):**
  * Jupiter showed that static ECMP causes collisions and packet drops even at 25% load.
  * How do we route around congested links dynamically? Next week: **WCMP** (weighted multipathing) and **FlowBender** (flowlet-based dynamic routing).

---

## Synthesis and Architectural Comparison

| Dimension | Traditional Enterprise / Internet | Google Jupiter Rising (2015) | AWS RNG (Flat Expander, 2026) |
|---|---|---|---|
| **Topology** | Hierarchical Tree with massive chassis | Multi-stage Clos from merchant silicon | Flat Quasi-Random Graph (ShuffleBox) |
| **Control Model** | Fully distributed (OSPF, IS-IS, BGP) | Centralized state (Firepath Master), local calculation | Distributed Spraypoint routing |
| **Liveness & Verification** | L3 Hello packets, BFD | Hardware PHY + pairwise Neighbor Discovery (ND) | Distributed peer probes |
| **Failure Handling** | LSA flooding, slow re-convergence | Fast local drain + LSD version increment | Degree-disjoint path rerouting |
| **Load Balancing** | Static ECMP, STP | ECMP shortest-paths over massive multipath | Packet spraying / oblivious routing |

---

## Answer key for the home assignment (quick reference)

### Miswire Hunt Game — The 5 Hidden Faults

| Fault | What is wrong | Ports affected | Right diagnosis | Why it happened |
|---|---|---|---|---|
| **1. Dark Switch** | T7 software crashed | T7: u1, u2<br>AG3: d7<br>AG4: d7 | AG3 d7: Dead peer<br>AG4 d7: Dead peer | T7 control-plane software crashed. PHY is UP, but no ND frames are sent. |
| **2. Asymmetric Link** | One-way link | SP3: p3<br>AG3: u3 | SP3 p3: Dead peer<br>AG3 u3: Peer deaf | Snapped RX optical fiber strand. AG3 hears SP3, but SP3 cannot hear AG3. |
| **3. Miscabled Link** | Cable in wrong port | T4: u2<br>AG4: d3 | T4 u2: Miswired<br>AG4 d3: Miswired | Technician plugged cable into wrong port. ND detects mismatched peer ID. |
| **4. Dead Link** | Unplugged cable | SP2: p4<br>AG4: u2 | SP2 p4: Cable down<br>AG4 u2: Cable down | Cable disconnected or transceiver broken. PHY DOWN on both ends. |
| **5. High Error Rate** | Bad optical link | SP1: p1<br>AG1: u1 | SP1 p1: Bad link<br>AG1 u1: Bad link | Degraded optical link causing high CRC error rate. Passes ND but drops packets. |

### Part C — Questions 1–3

* **Q1 (SDN Planes):**
  * *Firepath master:* Control Plane
  * *Firepath client:* Control Plane
  * *Link State Database (LSD):* Control Plane
  * *Control Plane Network (CPN):* Control Plane (or Management)
  * *Neighbor Discovery (ND):* Control Plane (with Data Plane interaction)
  * *Cluster Config:* Management Plane
  * *Forwarding Table (FIB):* Data Plane
  * *BGP at CBRs:* Outside SDN (edge peering)
* **Q2 (Hardest placements):** Cluster Config (often confused with Control) and Forwarding Table (often confused with Control because software computes it).
* **Q3 (Firepath vs. OpenFlow):** In Firepath, switches locally calculate their own forwarding tables using shortest-path ECMP based on the LSD pushed by the master. In OpenFlow, the central controller calculates paths and directly installs flow entries via `FlowMod`.
