// Every lab and panel is registered here once, with the tab groups in teaching order.
import { LABS } from '../labs/index.js';
import start from '../panels/start/view.js';
import passages from '../panels/passages/view.js';
import position from '../panels/position/view.js';

export { LABS };
export const PANELS = [start, passages, position];
export const HOME = 'start';
export const TAB_GROUPS = [
  { label: 'Start', tabs: ['start'] },
  { label: 'Passages', tabs: ['passages'] },
  { label: 'Labs', tabs: ['generations', 'clos', 'firepath', 'congestion'] },
  { label: 'Class', tabs: ['position'] },
];

// Edition hooks, all off for v1. v2 (Shay's facilitator deck) sets them in its own registry.
export const FLOW = null; // the lesson's steps in order, for a Previous / Next bar
export const FLOW_DEFAULT_ARG = {};
export const FACILITATOR_NOTE = null; // a line above the tabs
export const onStart = null; // runs once the page is built

export const visibleTabs = (tabs) => tabs.filter((t) => !t.hidden);
