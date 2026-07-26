// Renders the sidebar + mobile topbar into every authenticated page,
// so the nav markup lives in exactly one place.

const NAV_ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/></svg>',
  journal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5"/><path d="M6 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2"/><path d="M9 8h7M9 12h7M9 16h4"/></svg>',
  risk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l8 4v5c0 5-3.4 8.4-8 9-4.6-.6-8-4-8-9V7l8-4z"/><path d="M9 12l2 2 4-4"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

function initials(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

function renderNav(activePage) {
  const user = Auth.getUser() || { name: 'Trader', email: '' };

  const links = [
    { id: 'dashboard', href: 'dashboard.html', label: 'Dashboard' },
    { id: 'journal', href: 'journal.html', label: 'Journal' },
    { id: 'risk', href: 'risk-tools.html', label: 'Risk Calculator' },
  ];

  const navLinks = links
    .map(
      (l) => `<a href="${l.href}" data-nav class="${l.id === activePage ? 'active' : ''}">${NAV_ICONS[l.id]}<span>${l.label}</span></a>`
    )
    .join('');

  const sidebarHtml = `
    <div class="sidebar-brand">
      <div class="auth-brand-mark">TJ</div>
      <div class="auth-brand-name">TradeJournal</div>
    </div>
    <nav class="sidebar-nav">${navLinks}</nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-avatar">${initials(user.name)}</div>
        <div style="min-width:0">
          <div class="sidebar-user-name">${escapeHtml(user.name)}</div>
          <div class="sidebar-user-email">${escapeHtml(user.email || '')}</div>
        </div>
      </div>
      <a href="#" class="logout-link" id="logout-btn">Sign out</a>
    </div>
  `;

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';
  sidebar.innerHTML = sidebarHtml;

  const scrim = document.createElement('div');
  scrim.className = 'sidebar-scrim';
  scrim.id = 'sidebar-scrim';

  const topbar = document.createElement('div');
  topbar.className = 'mobile-topbar';
  topbar.innerHTML = `
    <div class="auth-brand" style="margin-bottom:0">
      <div class="auth-brand-mark">TJ</div>
      <div class="auth-brand-name">TradeJournal</div>
    </div>
    <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Open menu">${NAV_ICONS.menu}</button>
  `;

  const shell = document.getElementById('app-shell');
  shell.insertBefore(scrim, shell.firstChild);
  shell.insertBefore(sidebar, shell.firstChild);
  shell.insertBefore(topbar, shell.firstChild);

  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    sidebar.classList.add('open');
    scrim.classList.add('show');
  });
  scrim.addEventListener('click', () => {
    sidebar.classList.remove('open');
    scrim.classList.remove('show');
  });

  document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    Auth.logout();
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
  const page = document.body.getAttribute('data-page');
  renderNav(page);
});
