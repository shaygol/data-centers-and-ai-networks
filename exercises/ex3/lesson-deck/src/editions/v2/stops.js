// v2 key passages, in the order of Shay's facilitator deck: hour 1 has passages 1 (traffic) and 2
// (Firepath to OpenFlow), hour 2 has 3 (generations) and 4 (theory vs practice). Jupiter's own words, quoted exactly;
// trims fall at sentence boundaries and are marked "…", and citation numbers are left out.

const quote = (text, { lead = null, cite = null, marks = [] } = {}) => ({ type: 'quote', lead, text, cite, marks });
const cite = (section, label) => ({ section, label });
const followup = (question, reply = null) => ({ type: 'followup', question, reply });

export const STOPS = [
  {
    id: 's1',
    hour: 1,
    nav: '2',
    kicker: 'Passage 2 · Why build your own network',
    title: 'A network you could not buy',
    source: 'Jupiter §1 and §2',
    question: 'You cannot buy the network you need at any price. What do you do?',
    fields: [],
    blocks: [
      quote('We architect all these cloud services and applications as large-scale distributed systems. The inherent distributed nature of our services stems from the need to scale out and keep pace with an ever-growing global user population. Our services have substantial bandwidth and low-latency requirements, making the datacenter network a key piece of our infrastructure. Ten years ago, we found the cost and operational complexity associated with traditional datacenter network architectures to be prohibitive. Maximum network scale was limited by the cost and capacity of the highest-end switches available at any point in time. Bandwidth demands in the datacenter have been doubling every 12–15 months (Figure 1), even faster than the wide area Internet. Essentially, we could not buy a network at any price that could meet our scale and performance needs.', { cite: cite('Section 1', 'Introduction'), marks: ['doubling every 12–15 months (Figure 1)', 'we could not buy a network at any price'] }),
      quote('The tremendous growth rate of our infrastructure served as key motivation for our work in datacenter networking. Figure 1 shows aggregate server communication rates since 2008. Traffic has increased 50x in this time period, roughly doubling every year. A combination of remote storage access, largescale data processing, and interactive web services drive our bandwidth demands. More recently, the growth rate has increased further with the popularity of the Google Cloud Platform running on our shared infrastructure.', { cite: cite('Section 2', 'Background: Figure 1 in words'), marks: ['Traffic has increased 50x', 'roughly doubling every year', 'Google Cloud Platform'] }),
      quote('Our design informed the control architecture for both Jupiter datacenter networks and Google’s B4 WAN, both of which are based on OpenFlow and custom SDN control stacks.', { cite: cite('Section 5.1', 'Discussion: OpenFlow and SDN'), marks: ['based on OpenFlow and custom SDN control stacks'] }),
      followup('Figure 1 stops in 2014. What drives datacenter traffic today that didn’t then? (We come back to this graph in hour 1.)')
    ],
    jumps: [{ tab: 'openflow', arg: null, prompt: 'Jupiter’s control runs on OpenFlow and custom SDN stacks, not on Firepath. What pushed Google there? (The traffic graph is next, in hour 1.)', label: 'Open OpenFlow and SDN' }]
  },
  {
    id: 's2',
    hour: 2,
    nav: '3',
    kicker: 'Passage 3 · Five generations',
    title: 'Five generations, one story',
    source: 'Jupiter §2–§3.3',
    question: 'Google has decided to build its own network. What would you build first, and what could go wrong?',
    fields: [],
    blocks: [
      { type: 'text', text: 'This segment is told in the Generations tab: six chapters from 2004 to 2012. Each one has a debate question, the topology, what improved on the generation before, and the challenges Google ran into.' }
    ],
    jumps: [{ tab: 'generations', arg: 'legacy', prompt: 'Start in 2004, with the network Google bought from vendors.', label: 'Open the Generations story' }]
  },
  {
    id: 's3',
    hour: 2,
    nav: '4',
    kicker: 'Passage 4 · Theory vs practice',
    title: 'The textbook Clos, and its fine print',
    source: 'Jupiter §1',
    question: 'In Unit 1 the fat tree looked perfect. What breaks when you build it for real?',
    fields: [],
    blocks: [
      quote('To support graceful fault tolerance, increase the scale/bisection of our datacenter networks, and accommodate lower radix switches, we adopted Clos topologies for our datacenters. Clos topologies can scale to nearly arbitrary size by adding stages to the topology, principally limited by failure domain considerations and control plane scalability. They also have substantial in-built path diversity and redundancy, so the failure of any individual element can result in relatively small capacity reduction. However, they introduce substantial challenges as well, including managing the fiber fanout and more complex routing across multiple equal-cost paths.', { lead: 'Clos topologies:', cite: cite('Section 1', 'Introduction'), marks: ['nearly arbitrary size', 'relatively small capacity reduction', 'managing the fiber fanout', 'more complex routing across multiple equal-cost paths'] })
    ],
    jumps: [
      { tab: 'clos', arg: 'healthy', prompt: 'If one spine fails, how much capacity do we lose?', label: 'Open Clos failures' },
      { tab: 'congestion', arg: 'burst-low-load', prompt: 'Average load is low. Will anything drop?', label: 'Open Congestion' }
    ]
  },
  {
    id: 's4',
    blockTitles: ['5.1 · Why a central controller', '5.2 · Routing overview', '5.2 · Firepath: what is centralized', '5.2 · The Link State Database'],
    hour: 1,
    nav: '1',
    kicker: 'Passage 1 · Control: Firepath to OpenFlow',
    title: 'What Firepath centralized, and what it didn’t',
    source: 'Jupiter §5.2',
    question: 'Underline what is centralized and what isn’t.',
    reply: 'Centralized: the link state and the master. Local: neighbor discovery and computing the forwarding tables (§5.2).',
    fields: [],
    blocks: [
      quote('Overall, we treated the datacenter network as a single fabric with tens of thousands of ports rather than a collection of hundreds of autonomous switches that had to dynamically discover information about the fabric. We were, at this time, inspired by the success of large-scale distributed storage systems with a centralized manager. Our design informed the control architecture for both Jupiter datacenter networks and Google’s B4 WAN, both of which are based on OpenFlow and custom SDN control stacks.', { cite: cite('Section 5.1', 'Discussion'), marks: ['a single fabric with tens of thousands of ports', 'a centralized manager', 'based on OpenFlow and custom SDN control stacks'] }),
      quote('We now present the key components of Firepath, our routing architecture for Firehose, Watchtower, and Saturn fabrics. A number of these components anticipate some of the principles of modern SDN, especially in using logically centralized state and control. First, all switches are configured with the baseline or intended topology. The switches learn actual configuration and link state through pair-wise neighbor discovery. Next, routing proceeds with each switch exchanging its local view of connectivity with a centralized Firepath master, which redistributes global link state to all switches. Switches locally calculate forwarding tables based on this current view of network topology. To maintain robustness, we implement a Firepath master election protocol. Finally, we leverage standard BGP only for route exchange at the edge of our fabric, redistributing BGP-learned routes through Firepath.', { cite: cite('Section 5.2', 'Routing: the parts of Firepath'), marks: ['Firehose, Watchtower, and Saturn', 'logically centralized state and control', 'pair-wise neighbor discovery', 'centralized Firepath master', 'locally calculate forwarding tables', 'master election protocol'] }),
      quote('We support Layer 3 routing all the way to the ToRs via a custom Interior Gateway Protocol (IGP), Firepath. Firepath implements centralized topology state distribution, but distributed forwarding table computation with two main components. A Firepath client runs on each fabric switch, and a set of redundant Firepath masters run on a selected subset of spine switches. Clients communicate with the elected master over the CPN. Figure 11 shows the interaction between the Firepath client and the rest of the switch stack. Figure 12 illustrates the protocol message exchange between various routing components.', { lead: 'Firepath.', cite: cite('Section 5.2', 'Routing: Firepath'), marks: ['centralized topology state distribution, but distributed forwarding table computation', 'redundant Firepath masters'] }),
      quote('At startup, each client is loaded with the static topology of the entire fabric called the cluster config. Each client collects the state of its local interfaces from the embedded stack’s interface manager and transmits this state to the master. The master constructs a Link State Database (LSD) with a monotonically increasing version number and distributes it to all clients via UDP/IP multicast over the CPN. After the initial full update, a subsequent LSD contains only the diffs from the previous state. The entire network’s LSD fits within a 64 KB payload. On receiving an LSD update, each client computes shortest path forwarding with Equal-Cost Multi-Path (ECMP) and programs the hardware forwarding tables local to its switch.', { cite: cite('Section 5.2', 'Routing: Firepath'), marks: ['Link State Database (LSD)', 'each client computes shortest path forwarding', 'programs the hardware forwarding tables local to its switch'] }),
      followup('In the game you played Firepath’s master. Which step of this passage did you do, and which did the switches do?'),
      followup('This was Firehose, Watchtower and Saturn. Jupiter runs on OpenFlow. Why the change?')
    ]
  }
];
