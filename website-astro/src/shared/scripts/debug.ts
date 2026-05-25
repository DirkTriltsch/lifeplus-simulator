export function setupDebug(): void {
  if (typeof document === 'undefined') return;
  const KEY = 'website-astro:debug';
  if (localStorage.getItem(KEY) === '1') document.body.classList.add('debug-on');
  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    if (e.key === 'd' || e.key === 'D') {
      const on = document.body.classList.toggle('debug-on');
      localStorage.setItem(KEY, on ? '1' : '0');
    }
  });
}
