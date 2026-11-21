// Lab 4 model: one switch port in discrete ticks. Pure logic, no DOM.
// All numbers are illustrative. Jupiter §6.1 names the mechanisms but gives none of these parameters.
// A dropped packet stays dropped: the model doesn't resend it.

export const CAPACITY = 10; // packets the port sends per tick
export const TICKS = 60;
export const BURST_START = 10;
const SENDERS = 4;
export const LINE_RATE = 10; // packets per tick one sender can put on the wire
export const BOUNDED_WINDOW = 3; // packets per tick per sender, when the congestion window is bounded
const MIN_WINDOW = 1;
export const ECN_THRESHOLD = 10; // queue depth, in packets, at which the switch marks
export const SHARE_FACTOR = 3; // shares of chip buffer the busy port may take under dynamic sharing

// The ranges the lab's sliders can reach.
export const BURST_RANGE = { min: 0, max: 240, step: 10 };
export const BUFFER_RANGE = { min: 10, max: 60, step: 5 };

export const DEFAULTS = { burst: 90, buffer: 20 };
export const NO_FIXES = { ecn: false, boundedWindow: false, dynamicSharing: false };
export const ALL_FIXES = { ecn: true, boundedWindow: true, dynamicSharing: true };

export function simulate({ burst = 0, buffer, baseLoad = 0.1, fixes = NO_FIXES }) {
  const background = baseLoad * CAPACITY;
  const limit = fixes.dynamicSharing ? buffer * SHARE_FACTOR : buffer;
  const maxWindow = fixes.boundedWindow ? BOUNDED_WINDOW : LINE_RATE;
  const series = [];
  let queue = 0;
  let demand = 0; // the queue if no packet had dropped
  let window = maxWindow;
  let remaining = burst;
  let burstTicks = 0;

  for (let tick = 0; tick < TICKS; tick += 1) {
    const sent = tick >= BURST_START ? Math.min(remaining, Math.round(window * SENDERS)) : 0;
    remaining -= sent;
    if (sent > 0) burstTicks = tick - BURST_START + 1;

    const arrivals = background + sent;
    const backlog = Math.max(0, queue + arrivals - CAPACITY);
    queue = Math.min(backlog, limit);
    series.push({ tick, arrivals, load: arrivals / CAPACITY, queue, dropped: backlog - queue });

    // Marks reach the senders one tick later. They read demand, not the capped queue, so senders also
    // keep slowing for dropped packets. The send schedule then doesn't depend on buffer size, and with
    // the same arrivals a larger buffer can't drop more.
    demand = Math.max(0, demand + arrivals - CAPACITY);
    if (fixes.ecn) {
      window = demand >= ECN_THRESHOLD ? Math.max(MIN_WINDOW, window / 2) : Math.min(maxWindow, window + 1);
    }
  }

  const offered = series.reduce((sum, t) => sum + t.arrivals, 0);
  const dropped = series.reduce((sum, t) => sum + t.dropped, 0);
  return {
    series,
    limit,
    offered,
    dropped,
    delivered: offered - dropped - queue,
    unsent: remaining,
    averageUtilization: offered / (CAPACITY * TICKS),
    peakLoad: Math.max(...series.map((t) => t.load)),
    peakQueue: Math.max(...series.map((t) => t.queue)),
    burstTicks,
  };
}
