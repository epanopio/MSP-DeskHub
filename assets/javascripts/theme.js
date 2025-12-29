document.addEventListener('DOMContentLoaded', () => {
  // Sidebar collapse toggle (desktop)
  const toggleBtn = document.querySelector('.sidebar-toggle.hidden-xs');

  // Restore saved state for sidebar collapse
  if (localStorage.getItem('sidebar-left-collapsed') === 'true') {
    document.documentElement.classList.add('sidebar-left-collapsed');
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.documentElement.classList.toggle('sidebar-left-collapsed');
      const isNowCollapsed = document.documentElement.classList.contains('sidebar-left-collapsed');
      localStorage.setItem('sidebar-left-collapsed', isNowCollapsed);
    });
  }

  // Nav-parent (Inventory) expand/collapse behavior
  document.querySelectorAll('.nav-parent > a').forEach(a => {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      const parent = this.parentElement;
      parent.classList.toggle('nav-expanded');
      parent.classList.toggle('nav-collapsed');
    });
  });

  // Initialize nav-parent collapse state: expanded if explicitly marked
  document.querySelectorAll('.nav-parent').forEach(li => {
    if (li.classList.contains('nav-active') || li.classList.contains('nav-expanded')) {
      li.classList.add('nav-expanded');
      li.classList.remove('nav-collapsed');
    } else {
      li.classList.add('nav-collapsed');
    }
  });
});
