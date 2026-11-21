// Key passages: the paper's words on screen, a debate question, and a jump to the lab that shows it.
import { mountWalk } from '../walk/view.js';
import { STOPS } from './stops.js';

const mount = (body, ctx) => mountWalk(body, ctx, { key: 'passages', stops: STOPS });

export default { id: 'passages', title: 'Key passages', short: 'Passages', hidden: false, mount };
