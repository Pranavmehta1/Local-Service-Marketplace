/**
 * LocalFix Dashboard Common Functionality
 * Shared across customer / worker / admin dashboards.
 */
document.addEventListener('DOMContentLoaded', () => {
  initSidebarToggle();
  initLogout();
  renderCommonNotifications();
});

function initSidebarToggle() {
  const sidebar = document.querySelector('.lf-sidebar');
  const backdrop = document.querySelector('.lf-sidebar-backdrop');
  const toggle = document.querySelector('.lf-menu-toggle');
  if (!sidebar || !toggle) return;

  const open = () => {
    sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  };
  const close = () => {
    sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  };

  toggle.addEventListener('click', open);
  backdrop?.addEventListener('click', close);
}

function initLogout() {
  document.querySelectorAll('.lf-logout').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to log out?')) {
        window.Storage.logout();
        window.location.href = 'auth.html';
      }
    });
  });
}

function renderCommonNotifications() {
  const list = document.getElementById('notifDropdown');
  const badge = document.getElementById('notifBadge');
  if (!list) return;

  const user = window.Storage.getCurrentUser();
  const notifs = user ? window.Storage.getNotifications(user.id) : [];
  const unreadCount = notifs.filter((n) => n.unread).length;

  if (badge) {
    badge.textContent = unreadCount;
    if (unreadCount === 0) badge.classList.add('d-none');
    else badge.classList.remove('d-none');
  }

  if (!notifs.length) {
    list.innerHTML = '<li><span class="dropdown-item-text small text-muted text-center py-3 d-block">No notifications right now</span></li>';
    return;
  }

  list.innerHTML = notifs.slice(0, 6).map((n) => `
    <li>
      <div class="dropdown-item-text py-2 px-3 ${n.unread ? 'bg-light' : 'opacity-75'}" style="white-space: normal; max-width: 320px;">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="fw-bold small text-dark">${n.title}</span>
          <span class="badge bg-light text-muted" style="font-size:0.6rem;">${n.time || 'recent'}</span>
        </div>
        <div class="small text-muted" style="font-size:0.8rem; line-height:1.3;">${n.message}</div>
      </div>
    </li>
  `).join('<li><hr class="dropdown-divider my-1"></li>');
}
