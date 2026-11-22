// Generations story (v2): one chapter per generation, told in order. Each chapter has a debate
// question, a clean topology, what improved on the generation before, and the challenges it ran into.
// Table 2 rows come from the v1 generations model; everything else is "Jupiter Rising" (CACM 2016).
// Paper quotes are exact; trims fall at sentence boundaries and are marked "…".
import { GENERATIONS, changedFields } from '../generations/model.js';

const table = (id) => GENERATIONS.find((g) => g.id === id).table;
const cite = (section, label) => ({ section, label });

// A tier, top down. count is what the paper gives (null: not in the paper); drawn is how many boxes
// to draw before "…"; each/up/down describe one switch or block; derived marks counts we multiplied out.
const tier = (fields) => ({ derived: false, note: null, ...fields });

// Fig. 4: lower cards 1–2 take the left ToR of pairs 1–4, cards 3–4 the right ToR, and the same again for pairs 5–8 on cards 5–8.
const FH11_TORS = [0, 1].flatMap((half) =>
  [0, 1, 2, 3].flatMap((p) =>
    [0, 1].flatMap((side) => {
      const tor = half * 8 + p * 2 + side;
      const card = half * 4 + side * 2;
      return [[tor, card], [tor, card + 1]];
    }),
  ),
);

export const CHAPTERS = [
  {
    id: 'legacy',
    year: '2004',
    serversPerTor: '40',
    oversub: { ratio: 10, text: '40 servers at 1G share 4×1G of uplinks', source: '§2, Fig. 2', why: 'High-bandwidth applications had to fit under a single ToR.' },
    name: 'Legacy network',
    hook: 'Google buys its cluster network from vendors: a layer of big routers over racks of servers.',
    debate: 'In 2004, a server could send to servers in other racks at only about 100 Mb/s. Your app needs much more. Where do you place its servers?',
    debateReply: 'Under a single ToR. Its uplinks were about 10:1 oversubscribed, so anything that left the rack crawled (§2).',
    topology: {
      tiers: [
        tier({ kind: 'routers', name: 'Vendor routers', count: null, drawn: 1, each: 'Bought from a vendor', up: null, label: 'Cluster routers' }),
        tier({ kind: 'tor', name: 'ToR', count: 500, derived: true, drawn: 4, each: '48×1G ports', up: '4×1G to the routers', down: '40 servers at 1G' }),
      ],
      links: [{ between: ['tor', 'routers'], text: '4×1G up per ToR', note: 'About 10:1 oversubscribed' }],
      servers: '40 servers per ToR, 20k in the cluster',
      notes: ['500 ToRs = 20k servers ÷ 40 per ToR (our arithmetic).', 'The 4×1G uplink is from Fig. 5, where Firehose 1.1 runs beside this network.'],
    },
    improved: null,
    challenges: [],
    quote: {
      text: 'With bandwidth per host limited to 100 Mbps, packet drops associated with incast and outcast were severe pain points. Increasing bandwidth per server would have substantially increased cost per server and reduced cluster scale. We realized that existing commercial solutions could not meet our scale, management, and cost requirements.',
      cite: cite('Section 2', 'Background'),
      marks: ['limited to 100 Mbps', 'existing commercial solutions could not meet our scale, management, and cost requirements'],
    },
    next: null,
  },
  {
    id: 'firehose-1.0',
    figureOnly: true,
    noPassage: true,
    year: '2005',
    serversPerTor: '20',
    oversub: { ratio: 1, text: '20 servers at 1G (20G) over 2×10G of uplinks', source: '§3.1', why: 'The goal: 1 Gb/s of nonblocking bisection bandwidth to each of 10K servers.' },
    name: 'Firehose 1.0',
    hook: 'The first Clos. Google knows how to build servers, not switches.',
    debate: 'It is 2005. Google has never built a switch, but it builds servers all the time, and it now has cheap switch chips. Where does it put them, and what could go wrong?',
    debateReply: 'In the thing it already knew how to build: a server. “Since we did not have any experience building switches but we did have experience building servers,” the chips went on a PCI board inside a server (§3.1, Figure 3, top right). What went wrong: servers crashed and were upgraded often, with long reboots, and the network went down with them. A server that housed a ToR cut off every server behind it.',
    topology: {
      tiers: [
        tier({ kind: 'spine', name: 'Spine blocks', count: 32, drawn: 4, each: '8×10G chips', down: '32×10G, one to every aggregation block' }),
        tier({ kind: 'agg', name: 'Aggregation blocks', count: 32, drawn: 4, each: '8×10G chips, 16 ToRs below', up: '32×10G, one to every spine block' }),
        tier({ kind: 'tor', name: 'ToRs', count: 512, derived: true, drawn: 3, perAgg: 16, each: '4×10G chip', up: '2×10G to its aggregation block', down: '20×1G to servers' }),
      ],
      links: [
        { between: ['agg', 'spine'], text: '1×10G per pair', note: 'Every aggregation block links to every spine block' },
        { between: ['tor', 'agg'], text: '2×10G up per ToR', note: 'Each ToR links only to its own aggregation block' },
      ],
      servers: '20 servers per ToR, about 10K in the fabric',
      notes: ['512 ToRs = 32 aggregation blocks × 16 ToRs (our arithmetic).'],
    },
    inside: [
      {
        of: 'spine', title: 'Inside one spine block', source: 'Fig. 3',
        rows: [{ n: 4, unit: 'chip', label: 'Stage 5' }, { n: 8, unit: 'chip', label: 'Stage 4' }],
        mesh: 'full', top: null, bottom: '32×10G down, one to each aggregation block',
        key: 'Each square is one board with one 8×10G switch chip.',
        caption: '12 boards. The 8 lower boards each send 4×10G down to aggregation blocks and 4×10G up; the 4 upper boards only connect the lower ones.',
      },
      {
        of: 'agg', title: 'Inside one aggregation block', source: 'Fig. 3',
        rows: [{ n: 8, unit: 'chip', label: 'Stage 3' }, { n: 8, unit: 'chip', label: 'Stage 2' }],
        mesh: 'halves', top: null, bottom: null,
        groups: [
          { from: 0, to: 3, label: 'Half 1: a small block of its own', top: '16×10G up', bottom: '16×10G down' },
          { from: 4, to: 7, label: 'Half 2: a small block of its own', top: '16×10G up', bottom: '16×10G down' },
        ],
        key: 'Each square is one board with one 8×10G switch chip. Together the two halves give the block its 32×10G up (one to each spine block) and 32×10G down (2 to each of its 16 ToRs).',
        caption: 'One aggregation block is two smaller blocks side by side, with no link between them. Each half is a small Clos of its own: 4 boards over 4 boards, every one linked to every one. Only the ToRs below touch both halves.',
      },
    ],
    improved: [
      { text: 'A Clos fabric built from merchant silicon replaces the vendor routers.', source: '§2, §3.1' },
      { text: 'The goal: 1 Gb/s of nonblocking bisection bandwidth to each of 10K servers.', source: '§3.1' },
      { text: 'Bisection bandwidth 2T → 10T.', source: 'Table 2' },
    ],
    challenges: [
      { text: 'Switching sat on PCI boards inside servers, and server uptime was poor: crashes, upgrades, long reboots.', source: '§3.1' },
      { text: 'A crashed server that housed a ToR cut off the other servers behind it.', source: '§3.1' },
      { text: 'Wiring complexity and electrical reliability problems.', source: '§3.1' },
      { text: 'It never carried production traffic.', source: '§3.1' },
    ],
    quote: {
      text: 'However, the uptime of servers was less than ideal. Servers crashed and were upgraded more frequently than desired with long reboot times. … At the same time, we consider FH1.0 to be a landmark effort internally. Without it and the associated learning, the efforts that followed would not have been possible.',
      cite: cite('Section 3.1', 'Firehose'),
      marks: ['the uptime of servers was less than ideal', 'a landmark effort internally'],
    },
    followup: 'It never carried production traffic, yet the paper calls it a landmark. Why?',
    next: 'Lesson learned: get the switch chips out of the servers.',
  },
  {
    id: 'firehose-1.1',
    figureOnly: true,
    noPassage: true,
    year: '2006',
    serversPerTor: 'up to 40',
    oversub: { ratio: 2, upto: true, text: 'Up to 40 servers at 1G over 4×10G of uplinks (two of them to the buddy ToR)', source: '§3.2', why: 'To scale to 20k machines the paper accepts “at most 2:1 oversubscription”.' },
    name: 'Firehose 1.1',
    hook: 'The first fabric in production, in its own chassis, and running next to the old network just in case.',
    debate: 'You are about to put an unproven network under search and ads. How do you protect yourself if it fails?',
    debateReply: 'Run it beside the legacy network ("bag-on-the-side") and keep a Big Red Button that sends the ToRs back to the old uplinks.',
    topology: {
      tiers: [
        tier({ kind: 'spine', name: 'Spine blocks', count: 32, drawn: 4, each: '8×10G chips', down: '32×10G, one to every aggregation block' }),
        tier({ kind: 'agg', name: 'Aggregation blocks', count: 32, drawn: 4, each: '16 linecards, 16 ToRs below', up: '32×10G, one to every spine block' }),
        tier({ kind: 'tor', name: 'Buddied ToRs', count: 512, drawn: 3, perAgg: 16, pairs: true, side: '2×10G to its buddy', each: 'Paired with a buddy ToR: 16 per block = 8 pairs', up: '2×10G to the fabric, 4×1G to legacy', down: '48×1G to servers' }),
      ],
      links: [
        { between: ['agg', 'spine'], text: '1×10G per pair', note: 'Every aggregation block links to every spine block' },
        { between: ['tor', 'agg'], text: '2×10G up per ToR', note: 'Table 2 counts 4×10G per ToR: these 2×10G up plus 2×10G sideways to its buddy' },
      ],
      legacy: '4×1G from every ToR',
      servers: '48 servers per ToR, 512 racks',
      notes: ['512 racks is from Fig. 5.'],
    },
    inside: [
      { ...{
        of: 'spine', title: 'Inside one spine block', source: 'Fig. 3',
        rows: [{ n: 4, unit: 'chip', label: 'Stage 5' }, { n: 8, unit: 'chip', label: 'Stage 4' }],
        mesh: 'full', top: null, bottom: '32×10G down, one to each aggregation block',
        key: 'Each square is one board with one 8×10G switch chip.',
        caption: '12 boards. The 8 lower boards each send 4×10G down to aggregation blocks and 4×10G up; the 4 upper boards only connect the lower ones.',
      }, caption: 'Same spine block as Firehose 1.0: Fig. 4 redraws only the aggregation block. The boards are now linecards in a chassis, not cards inside servers.' },
      {
        of: 'agg', title: 'Inside one aggregation block', source: 'Fig. 4',
        rows: [{ n: 8, unit: 'chip', label: 'Spine side', word: 'linecards' }, { n: 8, unit: 'chip', label: 'ToR side', word: 'linecards' }],
        // Traced from Fig. 4: each linecard has 4 links to the other row, not 8.
        mesh: [[0,0],[0,3],[0,4],[0,6],[1,1],[1,2],[1,5],[1,7],[2,0],[2,2],[2,5],[2,6],[3,1],[3,3],[3,4],[3,7],[4,0],[4,3],[4,4],[4,6],[5,1],[5,2],[5,5],[5,7],[6,0],[6,2],[6,5],[6,6],[7,1],[7,3],[7,4],[7,7]],
        top: '32×10G up, one to each spine block', bottom: null,
        tors: { pairs: 8, label: 'Buddied ToRs', side: 'Two side links (2×10G) join each ToR to its buddy',
          // Traced from Fig. 4 as [ToR, lower card]: buddies (ToRs 2k, 2k+1) never share a card.
          wiring: FH11_TORS, down: '48×1G to servers per ToR, plus 4×1G to the legacy network (Fig. 5)' },
        key: 'Each square is one linecard: a board with one 8×10G chip (4 ports up, 4 down) that plugs into a chassis. One chassis holds six (Fig. 4, photo), so the 16 cards of a block do not fit in one. Each yellow pair is two buddied ToRs.',
        caption: 'Spine side: 8 linecards × 4 ports up = 32×10G, one to each spine block. ToR side: 8 linecards × 4 ports down = 32×10G, two to each of the 16 ToRs. Each card links to 4 of the 8 cards in the other row.',
        note: 'A ToR’s two uplinks go to two different linecards, and its buddy uses two other linecards.',
      },
    ],
    insideDebates: [{
      question: 'Table 2 still marks this aggregation block (B), blocking, just like Firehose 1.0. It has 32 ports up and 32 down. Why is it still blocking?',
      reply: 'Count one linecard’s ports. Each is an 8×10G chip: 4 up and 4 down. With 8 cards in the other row, a card can link to only 4 of them, and Fig. 4 shows exactly 4 lines per card. A block like this is nonblocking only when every upper card links to every lower card. Here each card reaches half, so some traffic patterns must squeeze through the same few links while others sit idle. Firehose 1.0 had the same limit in another shape: two separate halves. The way out was a bigger chip: Watchtower built its chassis from 16×10G chips with a backplane, and Table 2 marks its aggregation block NB.',
      label: 'Reveal (our reading: the paper marks it (B) but doesn’t say why)',
    }, {
      question: 'Look at the wiring: a ToR’s two uplinks go to two linecards, and its buddy’s go to two other linecards. Why not plug both buddies into the same linecards?',
      reply: 'So one broken linecard can’t cut off a pair. Say lower card 1 fails. Its ToR loses one of its two uplinks, but its buddy sits on cards 3 and 4, untouched, so the ToR can still send through its other uplink and through its buddy’s two uplinks over the side links. If both buddies shared cards 1 and 2, one failure would hit both ToRs at once, and losing both cards would strand the pair: the side links would only join two cut-off ToRs. Spreading the pair over four cards is the kind of “redundancy in fabric” Table 1 lists for getting high availability from cheap parts.',
      label: 'Reveal (our reading: the paper shows the wiring but doesn’t explain it)',
    }],
    improved: [
      { text: 'Switch chips moved out of servers into custom chassis: six linecards plus a small control computer.', source: '§3.1' },
      { text: 'ToRs doubled: 4×10G up and 48×1G down.', source: 'Table 2' },
      { text: 'The first production deployment of a Google cluster fabric.', source: '§3.1' },
    ],
    challenges: [
      { text: 'Deploying an unproven network under mission-critical apps. Answer: bag-on-the-side plus a Big Red Button.', source: '§3.1' },
      { text: 'No backplane: every port was an external copper cable, which made deployment hard.', source: '§3.1, §3.2' },
    ],
    quote: {
      text: 'A major concern with FH1.1 in production was deploying an unproven new network technology for our mission critical applications. To mitigate risk, we deployed Firehose 1.1 in conjunction with our legacy networks as shown in Figure 5. … We built a Big Red Button fail-safe to configure the ToRs to avoid Firehose uplinks in case of catastrophic failure.',
      cite: cite('Section 3.1', 'Firehose'),
      marks: ['unproven new network technology', 'in conjunction with our legacy networks', 'Big Red Button'],
    },
    followup: 'Watchtower, §3.2: “The main drawback to Firehose 1.1 was the deployment challenges with the external copper cabling.” The design worked. Is cabling a good enough reason to replace it?',
    next: 'It worked, and services got more bandwidth for less. The cables were the problem.',
  },
  {
    id: 'watchtower',
    figureOnly: true,
    noPassage: true,
    showInside: ['spine'],
    year: '2008',
    serversPerTor: 'Not in paper',
    oversub: { ratio: 1.2, text: '48×1G server ports over 4×10G of uplinks (Table 2); the server count is not in the paper', source: 'Table 2', why: '' },
    name: 'Watchtower',
    hook: 'Denser chips make a real switch chassis with a backplane possible, cabled with fiber.',
    debate: 'Firehose 1.1 worked. What would make you replace a network that works?',
    debateReply: 'Its copper cabling was hard to deploy, and servers with more cores needed more bandwidth (§3.2).',
    topology: {
      tiers: [
        tier({ kind: 'spine', name: 'Spine blocks', count: null, drawn: 4, each: 'One 128×10G chassis', down: '128×10G' }),
        tier({ kind: 'agg', name: 'Aggregation blocks', count: null, drawn: 4, each: 'Four 128×10G chassis', up: 'Toward the spine blocks' }),
        tier({ kind: 'tor', name: 'ToRs', count: null, drawn: 3, each: 'One per rack', up: '4×10G to its aggregation block', down: '48×1G to servers' }),
      ],
      links: [
        { between: ['agg', 'spine'], text: '10G links', note: 'Links per pair: not in the paper' },
        { between: ['tor', 'agg'], text: '4×10G up per ToR' },
      ],
      servers: '48 servers per ToR, n×1G each',
      notes: ['The paper gives no block or ToR counts for Watchtower.'],
    },
    inside: [
      {
        of: 'spine', title: 'Inside one spine block: one Watchtower chassis', source: 'Fig. 6, §3.2',
        rows: [{ n: 8, unit: 'chip', label: 'Edge chips' }, { n: 8, unit: 'chip', label: 'Middle chips' }, { n: 8, unit: 'chip', label: 'Edge chips' }],
        mesh: 'full', top: null, bottom: null,
        groups: Array.from({ length: 8 }, (_, i) => ({ from: i, to: i, label: `Card ${i + 1}`, top: '8×10G', bottom: '8×10G' })),
        key: 'Each dashed column is one linecard. Each card has three 16×10G chips: two face the front panel with 8 ports each, and one sits in the middle. 8 cards × 16 front ports = 128×10G.',
        caption: 'Every line is a backplane trace, not a cable. Each edge chip links to all 8 middle chips, so any front port can reach any other through any of them. That is why the chassis is nonblocking (NB in Table 2).',
      },
      {
        of: 'agg', title: 'Inside one aggregation block', source: 'Table 2',
        rows: [{ n: 4, unit: 'chassis', label: '128×10G' }],
        mesh: 'none', top: 'Up to the spine blocks', bottom: 'Down to the ToRs',
        key: 'Each box is one 128×10G chassis, built like the spine block.',
        caption: 'Four chassis. Table 2 marks the block as nonblocking (NB). How the four chassis are wired together is not in the paper.',
      },
    ],
    improved: [
      { text: 'Next-generation 16×10G chips made a traditional chassis with a backplane possible.', source: '§3.2', marks: ['16×10G chips', 'chassis with a backplane'] },
      { text: 'Fiber cabling: “substantially easier” to deploy than Firehose.', source: '§3.2', marks: ['Fiber cabling', 'substantially easier'] },
      { text: 'Bigger fabrics: bisection 10T → 82T, and more bandwidth to individual servers.', source: '§3.2, Table 2', marks: ['10T → 82T', 'more bandwidth to individual servers'] },
    ],
    challenges: [
      { text: 'Servers had ever more cores, and each one wanted more bandwidth.', source: '§3.2' },
      { text: 'The first Watchtowers still ran beside the legacy network: two parallel networks to run and pay for.', source: '§4.1' },
    ],
    quote: {
      text: 'The key idea was to leverage the next-generation merchant silicon switch chips, 16x10G, to build a traditional switch chassis with a backplane. … Watchtower deployment, with fiber cabling as seen in Figure 6 was substantially easier than the earlier Firehose deployments.',
      cite: cite('Section 3.2', 'Watchtower and Saturn'),
      marks: ['traditional switch chassis with a backplane', 'fiber cabling', 'substantially easier'],
    },
    next: 'Demand keeps climbing, and the chips keep getting denser.',
  },
  {
    id: 'saturn',
    noPassage: true,
    year: '2009',
    serversPerTor: '20 (default)',
    oversub: { ratio: 5, text: '20 servers at 10G over 4×10G of uplinks (default Pluto ToR)', source: '§3.2', why: 'The paper: about 2 Gbps per server on average, with bursts up to 10 Gbps.' },
    name: 'Saturn',
    hook: 'Bigger chips, bigger chassis, and for the first time a server can burst at 10 Gb/s.',
    debate: 'Watchtower already works. What pushes Google to a new generation only a year later?',
    debateReply: 'Continued growth in server bandwidth demand and in the cluster size Google wanted (§3.2).',
    topology: {
      tiers: [
        tier({ kind: 'spine', name: 'Spine blocks', count: null, drawn: 4, each: 'One 288×10G chassis, 12 linecards', down: '288×10G' }),
        tier({ kind: 'agg', name: 'Aggregation blocks', count: null, drawn: 4, each: 'Four 288×10G chassis', up: 'Toward the spine blocks' }),
        tier({ kind: 'tor', name: 'Pluto ToRs', count: null, drawn: 3, each: 'One 24×10G chip', up: '4×10G by default (or 8×10G)', down: '20 servers at 10G (or 16)' }),
      ],
      links: [
        { between: ['agg', 'spine'], text: '10G links', note: 'Links per pair: not in the paper' },
        { between: ['tor', 'agg'], text: '4×10G up per ToR', note: 'Or 8×10G for bandwidth-hungry servers' },
      ],
      servers: '20 servers per ToR at 10G',
      serverLink: '20 servers at 10G',
      notes: ['The paper gives no block or ToR counts for Saturn.'],
    },
    inside: [
      {
        of: 'spine', title: 'Inside one spine block: one Saturn chassis', source: 'Fig. 7',
        rows: [{ n: 12, unit: 'chip', label: 'Edge chips' }, { n: 12, unit: 'chip', label: 'Middle chips' }, { n: 12, unit: 'chip', label: 'Edge chips' }],
        mesh: 'full', top: null, bottom: null,
        groups: Array.from({ length: 12 }, (_, i) => ({ from: i, to: i, label: String(i + 1), top: '12', bottom: '12' })),
        key: 'Each dashed column is one of the 12 linecards (numbered on top); each square is one 24×10G chip, the same chip as the Pluto ToR. Edge chips have 12 ports out (the ↑12 and ↓12, as in Fig. 7) and 12 in; the middle chip has all 24 ports in. 24 edge chips × 12 front ports = 288×10G.',
        caption: 'The same design as Watchtower, scaled up: each edge chip sends one link to each of the 12 middle chips, so any front port reaches any other through any of 12 middle chips, and the chassis is nonblocking (NB in Table 2). Drawn unfolded like Fig. 7. Fig. 7 shows 12 columns and the text says 12 linecards; reading each column as one card, and the links as a backplane like Watchtower’s, is ours: the paper doesn’t say.',
      },
      {
        of: 'agg', title: 'Inside one aggregation block', source: 'Table 2',
        rows: [{ n: 4, unit: 'chassis', label: '288×10G' }],
        mesh: 'none', top: 'Up to the spine blocks', bottom: 'Down to the Pluto ToRs',
        key: 'Each box is one 288×10G chassis, built like the spine block.',
        caption: 'Four chassis. Table 2 marks the block as nonblocking (NB). How the four chassis are wired together is not in the paper.',
      },
    ],
    improved: [
      { text: '24×10G chips: a 288-port non-blocking chassis and a single-chip ToR (Pluto).', source: '§3.2', marks: ['288-port non-blocking chassis', 'single-chip ToR'] },
      { text: 'Servers could burst at 10 Gb/s across the fabric for the first time.', source: '§3.2', marks: ['burst at 10 Gb/s', 'for the first time'] },
      { text: 'Pluto ToR: 20 servers share 4×10G up, about 2 Gb/s each on average (5 Gb/s with 8×10G up and 16 servers).', source: '§3.2', marks: ['about 2 Gb/s each on average', '5 Gb/s'] },
      { text: 'Bisection 82T → 207T.', source: 'Table 2', marks: ['82T → 207T'] },
    ],
    challenges: [
      { text: 'The paper names no Saturn-specific failure. The aim was more server bandwidth and bigger clusters.', source: '§3.2' },
      { text: 'Each cluster was still its own fabric, joined to the others by a separate layer. Jupiter replaces that layer with one fabric for the whole datacenter.', source: '§3.3' },
    ],
    quote: {
      text: 'In the default configuration, Pluto supports 20 servers with 4x10G provisioned to the cluster fabric for an average bandwidth of 2 Gbps for each server. For more bandwidth-hungry servers, we could configure the Pluto ToR with 8x10G uplinks and 16x10G to servers providing 5 Gbps to each server. Importantly, servers could burst at 10 Gbps across the fabric for the first time.',
      cite: cite('Section 3.2', 'Watchtower and Saturn'),
      marks: ['average bandwidth of 2 Gbps', '5 Gbps to each server', 'burst at 10 Gbps across the fabric for the first time'],
    },
    next: 'Next step: one fabric for the whole datacenter, not one per cluster.',
  },
  {
    id: 'jupiter',
    figureOnly: true,
    noPassage: true,
    stackFigures: true,
    scope: true,
    buildingBlocks: [
      { text: 'Previous generation: the largest non-blocking chassis the silicon allowed: 12 linecards on a backplane, one 288-port switch.', source: '§3.2', marks: ['288-port switch'] },
      { text: 'Jupiter: a middle path. The Centauri is a small 4RU chassis with four 16×40G chips, no backplane data connections, and every port on the front panel.', source: '§3.3', marks: ['no backplane data connections', 'every port on the front panel'] },
      { text: 'Four Centauris make a Middle Block; eight Middle Blocks make an aggregation block.', source: '§3.3, Fig. 8' },
      { text: 'The aim: introduce new technology in place (in situ), because forklifting clusters stranded hosts already in production.', source: '§3.3', marks: ['in place (in situ)'] },
    ],
    year: '2012',
    serversPerTor: '48 per ToR chip',
    oversub: { ratio: 3, text: '48×10G to servers over 16×10G to the fabric, per ToR chip', source: '§3.3', why: 'Parts of the network were kept oversubscribed on purpose to save cost, for example the uplinks of a ToR (§6.1).' },
    name: 'Jupiter',
    hook: 'A 40G fabric for the whole datacenter, more than 6× the largest one before it, upgraded in place.',
    debate: 'Replacing old servers is routine. Why is replacing an old network so much harder?',
    debateReply: 'Forklifting a cluster’s network strands every host in it. Jupiter had to be deployed in place, so it had to mix old and new hardware and speeds (§3.3).',
    topology: {
      tiers: [
        tier({ kind: 'spine', name: 'Spine blocks', count: 256, drawn: 4, each: 'Six Centauri chassis', down: '128×40G: 2 to each aggregation block' }),
        tier({ kind: 'agg', name: 'Aggregation blocks', count: 64, drawn: 4, each: 'Eight Middle Blocks, 32 ToRs below', up: '512×40G: 2 to each spine block' }),
        tier({ kind: 'tor', name: 'Centauri ToRs', count: 2048, derived: true, drawn: 3, perAgg: 32, each: 'Four 16×40G chips', up: 'Each chip: 2×10G to each of 8 Middle Blocks', down: 'Each chip: 48×10G to servers' }),
      ],
      links: [
        { between: ['agg', 'spine'], text: '2×40G per pair', note: 'Dual links, so one failure reconverges locally' },
        { between: ['tor', 'agg'], text: '16×10G up per chip', note: '2×10G to each of the 8 Middle Blocks' },
      ],
      servers: '48 servers per ToR chip at 10G, 40G burst possible',
      serverLink: '48×10G per chip',
      notes: ['2,048 ToRs = 64 aggregation blocks × 32 ToRs (our arithmetic, at the largest size).'],
    },
    inside: [
      {
        of: 'spine', title: 'Inside one spine block: six Centauris', source: 'Fig. 8, §3.3',
        rows: [
          { n: 8, unit: 'chip', label: 'Upper chips', at: [4, 5, 6, 7, 8, 9, 10, 11] },
          { n: 16, unit: 'chip', label: 'Lower chips' },
        ],
        mesh: 'full', top: null, bottom: null, cards: 2,
        groups: [[0, 3, '32×40G'], [4, 5, '16×40G'], [6, 7, '16×40G'], [8, 9, '16×40G'], [10, 11, '16×40G'], [12, 15, '32×40G']].map(
          ([from, to, bottom], i) => ({ from, to, label: `Centauri ${i + 1}`, bottom, pad: 7 }),
        ),
        key: 'Each dashed box is one Centauri chassis; each solid box inside it is one linecard with two 16×40G chips. As in Fig. 8, the middle four Centauris put their top linecard in the upper stage and their bottom linecard in the lower stage; the outer two put both linecards in the lower stage.',
        caption: '24 chips = 6 Centauris × 2 linecards × 2 chips: 8 upper, 16 lower. Each lower chip sends 8×40G down to aggregation blocks and one 40G link to each of the 8 upper chips. Each upper chip uses all 16 ports downward, one to each lower chip. In all: 16 × 8 = 128×40G down, 2 to each of the 64 aggregation blocks. The spine block has no ports up: it is the top of the fabric.',
      },
      {
        of: 'agg', title: 'Inside one aggregation block: eight Middle Blocks', source: 'Fig. 8',
        rows: [{ n: 8, unit: 'mb', label: 'MB' }],
        mesh: 'none', top: '512×40G up: 64 from each Middle Block', bottom: 'Every ToR chip links to all 8 MBs, 2×10G to each',
        key: 'Each box is one Middle Block (MB). The MBs do not link to each other; they meet only through the ToRs below and the spine above.',
        caption: 'Eight MBs side by side, with 32 ToRs below. Open one MB below.',
      },
      {
        of: 'mb', title: 'Inside one Middle Block: four Centauris', source: 'Fig. 8, §3.3',
        rows: [{ n: 8, unit: 'chip', label: 'Upper chips' }, { n: 8, unit: 'chip', label: 'Lower chips' }],
        mesh: 'full', top: null, bottom: null, cards: 2,
        groups: Array.from({ length: 4 }, (_, i) => ({ from: 2 * i, to: 2 * i + 1, label: `Centauri ${i + 1}`, top: '16×40G', bottom: '64×10G' })),
        key: 'Each dashed box is one Centauri chassis; each solid box inside it is one linecard with two 16×40G chips. Every Centauri puts its top linecard in the upper stage and its bottom linecard in the lower stage, as in Fig. 8.',
        caption: '16 chips = 4 Centauris × 2 linecards × 2 chips. Each upper chip sends 8×40G up toward the spine and one 40G link to each of the 8 lower chips. Each lower chip uses its other 8×40G ports, run as 32×10G, for the ToRs. In all: 64×40G up and 256×10G down. The paper calls this “a 2-stage blocking network”. The Centauri has no backplane, so every line here is a front-panel cable.',
      },
    ],
    improved: [
      { text: 'Dense 40G chips: one Clos across the whole datacenter, absorbing the inter-cluster layer.', source: '§3.3', marks: ['Dense 40G chips', 'one Clos across the whole datacenter'] },
      { text: 'Bisection 207T → 1.3P, and servers could burst at 40G for the first time.', source: '§3.3, Table 2', marks: ['207T → 1.3P', 'burst at 40G for the first time'] },
      { text: 'Maintenance units small enough that most apps can ignore network maintenance windows.', source: '§3.3', marks: ['most apps can ignore network maintenance windows'] },
    ],
    challenges: [
      { text: 'Scale: more than 6× the largest existing fabric.', source: '§3.3' },
      { text: 'Deploy incrementally, in place: forklifting strands hosts already in production.', source: '§3.3' },
      { text: 'So the fabric must run on heterogeneous hardware and speeds.', source: '§3.3' },
      { text: 'Size capped at 64 aggregation blocks to keep dual links per pair.', source: '§3.3' },
    ],
    quote: {
      text: 'Jupiter, our next generation datacenter fabric, needed to scale more than 6x the size of our largest existing fabric. Unlike previous iterations, we set a requirement for incremental deployment of new network technology because the cost in resource stranding and downtime was too high. Upgrading networks by simply forklifting existing clusters stranded hosts already in production. With Jupiter, new technology would need to be introduced into the network in situ. Hence, the fabric must support heterogeneous hardware and speeds.',
      cite: cite('Section 3.3', 'Jupiter'),
      marks: ['scale more than 6x', 'incremental deployment', 'in situ', 'heterogeneous hardware and speeds'],
    },
    followup: '“Heterogeneous hardware and speeds.” Which assumption from Unit 1’s fat tree just broke? (Card 1 in Theory vs practice.)',
    next: null,
  },
];

export const chapter = (id) => CHAPTERS.find((c) => c.id === id);
export const previous = (c) => CHAPTERS[CHAPTERS.indexOf(c) - 1] ?? null;
export const following = (c) => CHAPTERS[CHAPTERS.indexOf(c) + 1] ?? null;

const FIELDS = [
  ['firstDeployed', 'First deployed'],
  ['merchantSilicon', 'Switch chip'],
  ['torConfig', 'ToR'],
  ['aggConfig', 'Aggregation block'],
  ['spineConfig', 'Spine block'],
  ['fabricSpeed', 'Fabric speed'],
  ['hostSpeed', 'Host speed'],
  ['bisection', 'Bisection BW'],
];

// Table 2, this generation beside the one before only. changed marks cells that differ.
// Which words of a changed cell are new: a word-level diff of the cell before and after.
// If words were only removed, nothing in the new cell is new, so the whole cell is marked.
export function diffCell(before, now) {
  const a = String(before ?? '').split(/\s+/).filter(Boolean);
  const b = String(now ?? '').split(/\s+/).filter(Boolean);
  const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const kept = new Array(b.length).fill(false);
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] === b[j]) { kept[j++] = true; i++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  let changed = kept.map((k) => !k);
  if (!changed.some(Boolean)) changed = changed.map(() => true);
  return b.map((text, k) => ({ text, changed: changed[k] }));
}

// The generations as a growth series: Table 2's bisection bandwidth and chip, parsed to numbers.
export function growthSeries() {
  const bps = (t) => {
    const m = /([\d.]+)\s*([TP])/.exec(t);
    return m ? Number(m[1]) * (m[2] === 'P' ? 1e15 : 1e12) : null;
  };
  const chipOf = (t) => {
    const m = /^(\d+)x(\d+)G/.exec(t);
    return m ? { ports: Number(m[1]), speed: Number(m[2]) } : null;
  };
  return CHAPTERS.map((c) => {
    const t = table(c.id);
    return { id: c.id, name: c.name, year: c.year, hook: c.hook, bisection: bps(t.bisection), chip: chipOf(t.merchantSilicon), fabricSpeed: t.fabricSpeed, hostSpeed: t.hostSpeed, serversPerTor: c.serversPerTor, oversub: c.oversub };
  });
}

export function comparison(c) {
  const result = tableComparison(c);
  const before = previous(c);
  // Servers per ToR comes from the paper's text, not from Table 2.
  const extra = { label: 'Servers per ToR', before: before ? before.serversPerTor : null, now: c.serversPerTor, changed: before ? before.serversPerTor !== c.serversPerTor : false };
  result.rows.splice(result.rows.findIndex((r) => r.label === 'ToR') + 1, 0, extra);
  return result;
}

function tableComparison(c) {
  const before = previous(c);
  const now = table(c.id);
  const then = before ? table(before.id) : null;
  return {
    head: [before?.name ?? null, c.name],
    rows: FIELDS.map(([key, label]) => ({
      label,
      before: then ? then[key] : null,
      now: now[key],
      changed: then ? then[key] !== now[key] : false,
    })),
  };
}

export { changedFields };
