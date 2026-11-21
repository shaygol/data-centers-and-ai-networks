// A light / dark switch in the corner, remembered per browser. The page starts light. From Shay's facilitator deck.
export function themeToggle() {
  const root = document.documentElement;
  const KEY = 'jr-theme';
  let theme = 'light';
  try {
    if (localStorage.getItem(KEY) === 'dark') theme = 'dark';
  } catch {
    // Storage can be blocked; the page still starts light.
  }
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'theme-toggle';
  const apply = () => {
    root.setAttribute('data-theme', theme);
    btn.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('aria-pressed', String(theme === 'dark'));
  };
  btn.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // Not remembered; the switch still works for this visit.
    }
    apply();
  });
  apply();
  document.body.appendChild(btn);
}
