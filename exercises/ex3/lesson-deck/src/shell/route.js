// Hash routes. Tokens use only the characters the platform allows in a hash, so `~` joins parts:
//   #cut                              a tab
//   #cut~t1-t3                        a tab and its experiment (or a panel's stop)
//   #cut~t1-t3~from~walkthrough~expanders     the same, with the way back to a stop

const TOKEN = /^[A-Za-z0-9._-]+$/;
const FROM = 'from';

function checked(token) {
  if (!TOKEN.test(token) || token === FROM) throw new Error(`Illegal route token: ${token}`);
  return token;
}

const legal = (token) => (token && TOKEN.test(token) ? token : null);

export function parseRoute(hash, isKnownTab) {
  const parts = hash.replace(/^#/, '').split('~');
  const [tab] = parts;
  if (!tab || !isKnownTab(tab)) return null;
  const fromAt = parts.indexOf(FROM);
  const own = fromAt === -1 ? parts : parts.slice(0, fromAt);
  const backTab = fromAt === -1 ? null : parts[fromAt + 1];
  const back = backTab && isKnownTab(backTab) ? { tab: backTab, arg: legal(parts[fromAt + 2]) } : null;
  return { tab, arg: legal(own[1]), back };
}

export function formatRoute({ tab, arg = null, back = null }) {
  const parts = [checked(tab)];
  if (arg) parts.push(checked(arg));
  if (back) {
    parts.push(FROM, checked(back.tab));
    if (back.arg) parts.push(checked(back.arg));
  }
  return `#${parts.join('~')}`;
}
