// The opening: the paper, its three principles, and how the session runs. No split yet.
import { h } from '../../shell/ui.js';

const PRINCIPLES = [
  ['Clos topologies', 'Many small switches in stages instead of one big one (§1)'],
  ['Merchant silicon', 'Commodity switch chips instead of vendor switches (§1)'],
  ['Centralized control', 'Google’s own control plane instead of standard routing protocols (§1)'],
];

function mount(body) {
  body.append(
    h('p', { class: 'start-question' }, 'In 2004 each server got about 100 Mb/s. By 2012 Jupiter delivered 1.3 Pb/s of bisection bandwidth. How did Google get there, and how centralized should a datacenter’s control be?'),
    h('dl', { class: 'start-scenario' }, PRINCIPLES.flatMap(([term, text]) => [h('dt', {}, term), h('dd', {}, text)])),
    h('p', { class: 'start-how' }, 'Four passages from the paper. We read each one together, argue about it, then try it in a lab where you call the clicks.'),
  );
  return { show() {} };
}

export default { id: 'start', title: 'Jupiter Rising', short: 'Opening', hidden: false, mount };
