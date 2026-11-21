// Moves through a list of stops. Pure logic, no DOM.
export function createWalk(stops) {
  let index = 0;
  return {
    current: () => stops[index],
    goTo(id) {
      const found = stops.findIndex((s) => s.id === id);
      if (found === -1) return false;
      index = found;
      return true;
    },
    next: () => { index = Math.min(index + 1, stops.length - 1); },
    previous: () => { index = Math.max(index - 1, 0); },
    atStart: () => index === 0,
    atEnd: () => index === stops.length - 1,
  };
}
