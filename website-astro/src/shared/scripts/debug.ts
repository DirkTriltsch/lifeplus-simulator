export function setupDebug(): void {
  if (typeof document === 'undefined') return;
  const KEY = 'website-astro:debug';
  const params = new URLSearchParams(window.location.search);
  if (params.get('debug') === '1') localStorage.setItem(KEY, '1');
  if (params.get('debug') === '0') localStorage.removeItem(KEY);

  const sync = () => {
    const enabled = document.body.classList.contains('debug-on');
    document.querySelectorAll('.debug-badge, .debug-panel').forEach((el) => el.remove());
    if (!enabled) return;

    const panel = document.createElement('div');
    panel.className = 'debug-panel';
    panel.innerHTML = '<span>Debug aktiv</span><span>·</span><a href="debug.html">Index</a><span>·</span><span>Taste d</span>';
    document.body.append(panel);

    document.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => {
      const section = el.dataset.section ?? 'Component';
      const componentFile = el.dataset.componentFile ?? inferComponentFile(section);
      const sourceFiles = splitFiles(el.dataset.source);

      const componentBadge = document.createElement('div');
      componentBadge.className = 'debug-badge debug-badge--component';
      componentBadge.append(linkItem(section, componentFile, 'debug-badge-item--component'));
      el.append(componentBadge);

      if (sourceFiles.length > 0) {
        const sourcesBadge = document.createElement('div');
        sourcesBadge.className = 'debug-badge debug-badge--sources';
        for (const file of sourceFiles) {
          sourcesBadge.append(linkItem(shortName(file), file));
        }
        el.append(sourcesBadge);
      }
    });
  };

  if (localStorage.getItem(KEY) === '1') document.body.classList.add('debug-on');
  sync();

  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    if (e.key === 'd' || e.key === 'D') {
      const on = document.body.classList.toggle('debug-on');
      localStorage.setItem(KEY, on ? '1' : '0');
      sync();
    }
  });
}

function splitFiles(value: string | undefined): string[] {
  return (value ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
}

function inferComponentFile(section: string): string {
  if (section === 'Header.astro' || section === 'Footer.astro') {
    return `shared/components/layout/${section}`;
  }
  if (section.endsWith('.astro')) {
    return `shared/components/sections/${section}`;
  }
  return section;
}

function shortName(file: string): string {
  return file.split(/[\\/]/).pop() ?? file;
}

function linkItem(label: string, file: string, extraClass = ''): HTMLAnchorElement | HTMLSpanElement {
  const normalized = normalizeFile(file);
  const className = `debug-badge-item ${extraClass}`.trim();
  if (!normalized) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = label;
    return span;
  }

  const link = document.createElement('a');
  link.className = className;
  link.href = toEditorUrl(normalized);
  link.title = normalized;
  link.textContent = label;
  return link;
}

function normalizeFile(file: string): string {
  const trimmed = file.trim();
  if (!trimmed || trimmed.startsWith('http') || trimmed.startsWith('mailto:')) return '';
  if (trimmed.startsWith('src/')) return trimmed.slice(4);
  return trimmed;
}

function toEditorUrl(file: string): string {
  const root = ((window as unknown as { LFL_DEBUG_ROOT?: string }).LFL_DEBUG_ROOT ?? '').replace(/\\/g, '/');
  const absolute = root ? `${root}/src/${file}` : file;
  return `vscode://file/${absolute}`;
}
