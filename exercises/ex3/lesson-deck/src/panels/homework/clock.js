// Pausable timer queue for the homework traffic animation so pausing freezes remaining delays in place.
export function createClock({
  now = () => Date.now(),
  set = (fn, ms) => setTimeout(fn, ms),
  clear = (id) => clearTimeout(id),
} = {}) {
  let active = false;
  const entries = new Set();

  function arm(entry) {
    entry.startedAt = now();
    entry.id = set(() => {
      if (!active || !entries.has(entry)) return;
      entries.delete(entry);
      entry.id = null;
      entry.fn();
    }, entry.remaining);
  }

  function later(ms, fn) {
    const entry = { fn, remaining: Math.max(0, ms), startedAt: null, id: null };
    entries.add(entry);
    if (active) arm(entry);
  }

  function pause() {
    if (!active) return;
    active = false;
    const t = now();
    for (const entry of entries) {
      if (entry.id !== null) {
        clear(entry.id);
        entry.id = null;
      }
      entry.remaining = Math.max(0, entry.remaining - (t - entry.startedAt));
      entry.startedAt = null;
    }
  }

  function resume() {
    if (active) return;
    active = true;
    // Snapshot so callbacks armed at 0ms cannot double-arm new entries added during this loop.
    for (const entry of [...entries]) {
      if (active && entries.has(entry) && entry.id === null) arm(entry);
    }
  }

  function clearAll() {
    for (const entry of entries) {
      if (entry.id !== null) {
        clear(entry.id);
        entry.id = null;
      }
    }
    entries.clear();
  }

  return {
    later,
    pause,
    resume,
    clear: clearAll,
    get running() { return active; },
    get pending() { return entries.size; },
  };
}
