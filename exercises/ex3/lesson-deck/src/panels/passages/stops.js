// The key passages: Jupiter's own words, quoted exactly, one stop each (Spec, Key passages).
// Trims fall at sentence boundaries and are marked "…". Citation numbers are left out.
// Sources are sections of "Jupiter Rising" (CACM 2016).

const quote = (text, lead = null) => ({ type: 'quote', lead, text });
const followup = (question, reply = null) => ({ type: 'followup', question, reply });

export const STOPS = [
  {
    id: 'p1',
    nav: 'P1',
    kicker: 'P1 · Evolution',
    title: 'Three principles',
    source: 'Jupiter §1',
    question: 'All three principles trade something away. What does each one give up?',
    reply: 'Clos: fiber fanout and multipath routing (§1). Merchant silicon: features and per-box reliability (§1). Centralized control: the standard routing protocols (§1, §5.1).',
    fields: [],
    blocks: [
      quote('To support graceful fault tolerance, increase the scale/bisection of our datacenter networks, and accommodate lower radix switches, we adopted Clos topologies for our datacenters. …', 'Clos topologies:'),
      quote('Rather than use commercial switches targeting small-volume, large feature sets and high reliability, we targeted general-purpose merchant switch silicon, commodity priced, off the shelf, switching components. …', 'Merchant silicon:'),
      quote('Control and management become substantially more complex with Clos topologies because we dramatically increase the number of discrete switching elements. Existing routing and management protocols were not well-suited to such an environment. …', 'Centralized control protocols:'),
      followup('Which principle makes the other two necessary?'),
    ],
  },
  {
    id: 'p1-firehose',
    nav: 'P1 · FH',
    kicker: 'P1 · Evolution',
    title: 'Firehose 1.0: a first try that failed',
    source: 'Jupiter §3.1',
    question: 'The paper calls a project that never carried production traffic a landmark. Why?',
    fields: [],
    blocks: [
      quote('Since we did not have any experience building switches but we did have experience building servers, we attempted to integrate the switching fabric into the servers via a PCI board. … However, the uptime of servers was less than ideal. Servers crashed and were upgraded more frequently than desired with long reboot times. … At the same time, we consider FH1.0 to be a landmark effort internally. Without it and the associated learning, the efforts that followed would not have been possible.'),
      followup('Why did putting switches inside servers seem like a good idea?'),
      followup(
        'Backup, Watchtower (§3.2): "The main drawback to Firehose 1.1 was the deployment challenges with the external copper cabling." The design worked. Why change it?',
      ),
    ],
    jumps: [{ tab: 'generations', arg: 'firehose-1.0', prompt: 'What do you expect to move out of the servers? Guess, then step to Firehose 1.1.' }],
  },
  {
    id: 'p2',
    nav: 'P2',
    kicker: 'P2 · The Clos trade-off',
    title: 'Many small failures instead of one big one',
    source: 'Jupiter §1',
    question: '“Relatively small capacity reduction.” Relative to what?',
    fields: [],
    blocks: [
      quote('Clos topologies can scale to nearly arbitrary size by adding stages to the topology, principally limited by failure domain considerations and control plane scalability. They also have substantial in-built path diversity and redundancy, so the failure of any individual element can result in relatively small capacity reduction. However, they introduce substantial challenges as well, including managing the fiber fanout and more complex routing across multiple equal-cost paths.'),
      followup('The limits named here are failure domains and the control plane, not hardware. Why would the control plane limit size?'),
    ],
    jumps: [{ tab: 'clos', arg: 'healthy', prompt: 'If I fail this spine, how much do we lose? Guess first, then click Spine failure.' }],
  },
  {
    id: 'p3',
    nav: 'P3',
    kicker: 'P3 · Firepath and SDN',
    title: 'What Google centralized, and what it didn’t',
    source: 'Jupiter §5.2',
    question: 'Underline what is centralized and what isn’t. Is this SDN?',
    fields: [],
    blocks: [
      quote('A number of these components anticipate some of the principles of modern SDN, especially in using logically centralized state and control. First, all switches are configured with the baseline or intended topology. The switches learn actual configuration and link state through pair-wise neighbor discovery. Next, routing proceeds with each switch exchanging its local view of connectivity with a centralized Firepath master, which redistributes global link state to all switches. Switches locally calculate forwarding tables based on this current view of network topology. To maintain robustness, we implement a Firepath master election protocol. Finally, we leverage standard BGP only for route exchange at the edge of our fabric, redistributing BGP-learned routes through Firepath.'),
      followup(
        'After a power event restarted the whole fabric, the control software did not converge without manual help (§6.2). Which option does that hurt, and which does it help?',
        'Neighbor discovery and route computation competed for the switches’ limited embedded CPUs, and link state flapped (§6.2). Jupiter itself later moved to OpenFlow and custom SDN control stacks (§5.1).',
      ),
    ],
    jumps: [
      { tab: 'firepath', arg: 'link-failure', prompt: 'A link fails. Before each step: is this step centralized?', label: 'Open Firepath: link failure' },
      { tab: 'firepath', arg: 'master-failover', prompt: 'The master just died. Does traffic stop?', label: 'Open Firepath: master failover' },
    ],
  },
  {
    id: 'p4',
    nav: 'P4',
    kicker: 'P4 · Congestion',
    title: 'Drops at 25% utilization',
    source: 'Jupiter §6.1',
    question: 'Drops at 25% utilization. What does an average hide?',
    fields: [],
    blocks: [
      quote('Despite the capacity in our fabrics, our networks experienced high congestion drops as utilization approached 25%. We found several factors contributed to congestion: (i) inherent burstiness of flows led to inadmissible traffic in short time intervals typically seen as incast or outcast; (ii) our commodity switches possessed limited buffering, which was sub optimal for our server TCP stack; (iii) certain parts of the network were intentionally kept oversubscribed to save cost, for example, the uplinks of a ToR; and (iv) imperfect flow hashing especially during failures and in presence of variation in flow volume.'),
      followup(
        'Which of the four causes did Google choose on purpose? Name a fix for each.',
        'QoS-based drops, a bounded TCP window, link-level pause at ToRs, ECN, more ToR uplinks where needed, dynamic buffer sharing and tuned ECMP hashing. The discard rate at 25% average utilization fell from 1% to < 0.01% (§6.1).',
      ),
    ],
    jumps: [{ tab: 'congestion', arg: 'burst-low-load', prompt: 'Average load is low. Will anything drop? Guess, then turn the fixes on.' }],
  },
];
