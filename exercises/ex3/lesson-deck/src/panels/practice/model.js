// Theory vs practice: what Unit 1's fat tree assumes, and what Jupiter ran into.
// Quotes are Jupiter's exact words (CACM 2016). `outside` marks the one source from after the paper.

export const GAPS = [
  {
    id: 'identical',
    theory: 'Every switch is the same k-port switch.',
    practice: 'Generations of hardware share one fabric, at different speeds.',
    quote: 'With Jupiter, new technology would need to be introduced into the network in situ. Hence, the fabric must support heterogeneous hardware and speeds.',
    source: 'Jupiter §3.3; Table 2 lists Jupiter’s fabric speed as 10/40G',
    later: { text: 'Seven years later: “deployment of multiple generations in a single fabric is inevitable.”', source: 'Jupiter Evolving, SIGCOMM 2022, §1' },
  },
  {
    id: 'built-at-once',
    theory: 'The whole tree is built at once, at full size.',
    practice: 'Fabrics grow and are upgraded while servers run on them.',
    quote: 'Unlike previous iterations, we set a requirement for incremental deployment of new network technology because the cost in resource stranding and downtime was too high. Upgrading networks by simply forklifting existing clusters stranded hosts already in production.',
    source: 'Jupiter §3.3; Firehose 1.1 first ran beside the old network with a Big Red Button, §3.1',
  },
  {
    id: 'full-bisection',
    theory: 'Full bisection bandwidth: no oversubscription anywhere.',
    practice: 'Some links are oversubscribed on purpose, to save money.',
    quote: 'certain parts of the network were intentionally kept oversubscribed to save cost, for example, the uplinks of a ToR',
    source: 'Jupiter §6.1 (iii)',
  },
  {
    id: 'wiring',
    theory: 'Every cable goes where the plan says.',
    practice: 'Thousands of cables mean miswiring, and links that work one way only.',
    quote: 'Building a fabric with thousands of cables invariably leads to multiple cabling errors. Moreover, correctly cabled links may be re-connected incorrectly after maintenance.',
    source: 'Jupiter §5.2, Neighbor Discovery. This is the homework game.',
  },
  {
    id: 'cabling-cost',
    theory: 'Cables are free lines in a diagram.',
    practice: 'Cabling drove whole generations of the design.',
    quote: 'The main drawback to Firehose 1.1 was the deployment challenges with the external copper cabling.',
    source: 'Jupiter §3.2; the Clos principle names “managing the fiber fanout”, §1',
  },
  {
    id: 'even-load',
    theory: 'ECMP spreads flows evenly over all equal paths.',
    practice: 'Hashing is uneven, especially when links fail, and drops start at 25% load.',
    quote: 'imperfect flow hashing especially during failures and in presence of variation in flow volume',
    source: 'Jupiter §6.1 (iv): “high congestion drops as utilization approached 25%”',
  },
  {
    id: 'buffers',
    theory: 'Switches are ideal: enough buffer for any burst.',
    practice: 'Cheap merchant chips have small buffers.',
    lead: 'Fabric congestion.',
    quote: 'Despite the capacity in our fabrics, our networks experienced high congestion drops as utilization approached 25%. We found several factors contributed to congestion: (i) inherent burstiness of flows led to inadmissible traffic in short time intervals typically seen as incast or outcast; (ii) our commodity switches possessed limited buffering, which was sub optimal for our server TCP stack; (iii) certain parts of the network were intentionally kept oversubscribed to save cost, for example, the uplinks of a ToR; and (iv) imperfect flow hashing especially during failures and in presence of variation in flow volume.',
    source: 'Jupiter §6.1 (ii); fixes: bounded TCP window, ECN, dynamic buffer sharing',
  },
  {
    id: 'control',
    theory: 'Routing just works, instantly, with no cost.',
    practice: 'The switches’ own small CPUs could not keep up after a full restart.',
    lead: 'Control software problems at large scale.',
    quote: 'A datacenter power event once caused the entire fabric to restart simultaneously. However, the control software did not converge without manual intervention. The instability took place because our liveness protocol (ND) and route computation contended for limited CPU resources on embedded switch CPUs. On entire fabric reboot, routing experienced huge churn, which, in turn, led ND not to respond to heartbeat messages quickly enough. This in turn led to a snowball effect for routing where link state would spuriously go from up to down and back to up again. We stabilized the network by manually bringing up a few blocks at a time.',
    source: 'Jupiter §6.2. This sets up the next segment.',
  },
  {
    id: 'scale',
    theory: 'To grow, pick a bigger k.',
    practice: 'Size is limited by failure domains and the control plane, not by the formula.',
    quote: 'Clos topologies can scale to nearly arbitrary size by adding stages to the topology, principally limited by failure domain considerations and control plane scalability.',
    source: 'Jupiter §1',
  },
];
