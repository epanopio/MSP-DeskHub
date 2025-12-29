document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebarToggle');

  if (!sidebar || !toggleBtn) return;

  // Load saved state
  const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
  if (isCollapsed) {
    sidebar.classList.add('collapsed');
  }

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');

    // Save the current state
    const isNowCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('sidebar-collapsed', isNowCollapsed);
  });
});
